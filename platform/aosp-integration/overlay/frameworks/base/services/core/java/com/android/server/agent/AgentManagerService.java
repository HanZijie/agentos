package com.android.server.agent;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.content.pm.Signature;
import android.os.Binder;
import android.os.Build;
import android.os.Environment;
import android.os.FileUtils;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Process;
import android.os.ResultReceiver;
import android.os.ServiceManager;
import android.os.ShellCallback;
import android.os.ShellCommand;
import android.os.SystemClock;
import android.os.UserHandle;
import android.os.UserManager;
import android.provider.Settings;
import android.util.ArrayMap;
import android.util.ArraySet;
import android.util.AtomicFile;
import android.util.Slog;

import com.android.server.SystemService;
import com.example.agentos.AgentHealth;
import com.example.agentos.AgentEnqueueResult;
import com.example.agentos.AgentPluginCapabilities;
import com.example.agentos.AgentPluginDescriptor;
import com.example.agentos.AgentPluginHostInfo;
import com.example.agentos.AgentPluginSession;
import com.example.agentos.AgentSessionSnapshot;
import com.example.agentos.IAgentEventCallback;
import com.example.agentos.IAgentManager;
import com.example.agentos.IAgentPluginEndpoint;
import com.example.agentos.IAgentPluginHostCallback;
import com.example.agentos.ISideagentd;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.io.InputStream;
import java.util.concurrent.FutureTask;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** System control plane. All registry and enablement state belongs to mHandler. */
public final class AgentManagerService extends SystemService {
    private static final String TAG = "AgentManagerService";
    public static final String ACTION_PLUGIN_ENDPOINT = "agentos.intent.action.PLUGIN_ENDPOINT";
    public static final String PERMISSION_BIND_AGENT_PLUGIN =
            "com.example.agentos.permission.BIND_AGENT_PLUGIN";
    public static final String PERMISSION_ACCESS_AGENT =
            "com.example.agentos.permission.ACCESS_AGENT";
    private static final String SIDED_SERVICE = "agentos.sideagentd";
    private static final int HANDSHAKE_TIMEOUT_MS = 5000;
    private final Handler mHandler;
    private final PackageManager mPackageManager;
    private final ArrayMap<String, PluginRecord> mPlugins = new ArrayMap<>();
    private final ArraySet<Integer> mStartedUsers = new ArraySet<>();
    // A grant belongs to one Android user, package and signer set.
    private ArrayMap<String, String> mEnabled = new ArrayMap<>();
    private final AtomicFile mStore = new AtomicFile(new File(
            Environment.getDataSystemDirectory(), "agentos/plugins.json"));
    // A malicious synchronous handshake may never return. Bound concurrency,
    // reject excess work, and never run third-party Binder calls on the main thread.
    private final ThreadPoolExecutor mHandshakes = new ThreadPoolExecutor(
            0, 2, 30, TimeUnit.SECONDS, new SynchronousQueue<>(), runnable -> {
                Thread thread = new Thread(runnable, "AgentPluginHandshake");
                thread.setDaemon(true);
                return thread;
            });
    private boolean mLoaded;
    private static final int SIDEAGENT_UID = 1096;
    private static final long IDLE_UNBIND_MS = 30_000L;
    private static final long LEASE_MS = 60_000L;


    public AgentManagerService(Context context) {
        super(context);
        mPackageManager = context.getPackageManager();
        HandlerThread thread = new HandlerThread(TAG, Process.THREAD_PRIORITY_BACKGROUND);
        thread.start();
        mHandler = new Handler(thread.getLooper());
    }

    @Override public void onStart() {
        BinderService service = new BinderService();
        // Versioned API shared with apps, but this instance is a system service,
        // not a vendor HAL declared in a VINTF device manifest.
        service.forceDowngradeToSystemStability();
        publishBinderService("agentos", service);
    }

    @Override public void onBootPhase(int phase) {
        if (phase != PHASE_ACTIVITY_MANAGER_READY) return;
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_PACKAGE_ADDED);
        filter.addAction(Intent.ACTION_PACKAGE_REPLACED);
        filter.addAction(Intent.ACTION_PACKAGE_REMOVED);
        filter.addAction(Intent.ACTION_PACKAGE_CHANGED);
        filter.addDataScheme("package");
        getContext().registerReceiverAsUser(new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                int userId = getSendingUserId();
                String pkg = intent.getData() == null ? null
                        : intent.getData().getSchemeSpecificPart();
                if (pkg == null || userId < 0) return;
                String key = keyFor(userId, pkg);
                PluginRecord record = mPlugins.remove(key);
                if (record != null) unbind(record);
                if (Intent.ACTION_PACKAGE_REMOVED.equals(intent.getAction())
                        && !intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)) {
                    ArrayMap<String, String> next = new ArrayMap<>(mEnabled);
                    next.remove(key);
                    persistQuietly(next);
                }
                if (mStartedUsers.contains(userId)) scanUser(userId);
            }
        }, UserHandle.ALL, filter, null, mHandler);
        getContext().registerReceiverAsUser(new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                int userId = intent.getIntExtra(Intent.EXTRA_USER_HANDLE, -1);
                if (userId < 0) return;
                stopUser(userId);
                ArrayMap<String, String> next = new ArrayMap<>(mEnabled);
                String prefix = userId + "/";
                for (int i = next.size() - 1; i >= 0; i--)
                    if (next.keyAt(i).startsWith(prefix)) next.removeAt(i);
                persistQuietly(next);
            }
        }, UserHandle.ALL, new IntentFilter(Intent.ACTION_USER_REMOVED), null, mHandler);
        mHandler.post(() -> startUser(UserHandle.USER_SYSTEM));
    }

    @Override public void onUserStarting(TargetUser user) {
        mHandler.post(() -> startUser(user.getUserIdentifier()));
    }

    @Override public void onUserUnlocked(TargetUser user) {
        mHandler.post(() -> startUser(user.getUserIdentifier()));
    }

    @Override public void onUserStopping(TargetUser user) {
        mHandler.post(() -> stopUser(user.getUserIdentifier()));
    }

    @Override public void onUserStopped(TargetUser user) {
        mHandler.post(() -> stopUser(user.getUserIdentifier()));
    }

    private void startUser(int userId) {
        loadState();
        mStartedUsers.add(userId);
        ensureDefaultAssistant(userId);
        scanUser(userId);
    }

    private void ensureDefaultAssistant(int userId) {
        String current = Settings.Secure.getStringForUser(getContext().getContentResolver(),
                Settings.Secure.ASSISTANT, userId);
        if (current == null || current.isEmpty()) {
            Settings.Secure.putStringForUser(getContext().getContentResolver(),
                    Settings.Secure.ASSISTANT,
                    "com.example.agenriod/.voice.AgenriodVoiceInteractionService", userId);
        }
    }

    private void stopUser(int userId) {
        mStartedUsers.remove(userId);
        for (int i = mPlugins.size() - 1; i >= 0; i--) {
            PluginRecord record = mPlugins.valueAt(i);
            if (record.userId == userId) {
                unbind(record);
                mPlugins.removeAt(i);
            }
        }
    }

    private void loadState() {
        if (mLoaded) return;
        mLoaded = true;
        if (!mStore.getBaseFile().exists()) return;
        try {
            byte[] bytes = mStore.readFully();
            if (bytes.length > 1024 * 1024) throw new IllegalStateException("state too large");
            JSONObject data = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            if (data.getInt("version") != 1) throw new IllegalStateException("state version");
            JSONObject grants = data.getJSONObject("grants");
            ArrayMap<String, String> loaded = new ArrayMap<>();
            for (String key : grants.keySet()) loaded.put(key, grants.getString(key));
            mEnabled = loaded;
        } catch (Exception e) {
            // Corrupt state cannot enable any plugin.
            mEnabled.clear();
            Slog.e(TAG, "Cannot load Plugin grants; all disabled", e);
        }
    }

    private void persist(ArrayMap<String, String> next) throws Exception {
        File dir = mStore.getBaseFile().getParentFile();
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("state directory");
        if (FileUtils.setPermissions(dir.getPath(), 0700, -1, -1) != 0)
            throw new IllegalStateException("state directory permissions");
        JSONObject grants = new JSONObject();
        for (int i = 0; i < next.size(); i++) grants.put(next.keyAt(i), next.valueAt(i));
        byte[] bytes = new JSONObject().put("version", 1).put("grants", grants)
                .toString().getBytes(StandardCharsets.UTF_8);
        FileOutputStream stream = null;
        try {
            stream = mStore.startWrite();
            stream.write(bytes);
            mStore.finishWrite(stream);
        } catch (Exception e) {
            if (stream != null) mStore.failWrite(stream);
            throw e;
        }
        mEnabled = next;
    }

    private void persistQuietly(ArrayMap<String, String> next) {
        try { persist(next); }
        catch (Exception e) {
            // Revocation still takes effect in memory if disk is unavailable.
            mEnabled = next;
            Slog.e(TAG, "Cannot persist Plugin revocation", e);
        }
    }

    private String signerFor(PackageInfo info) throws Exception {
        if (info.signingInfo == null) throw new IllegalArgumentException("missing signer");
        ArrayList<String> digests = new ArrayList<>();
        for (Signature signature : info.signingInfo.getApkContentsSigners()) {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(signature.toByteArray());
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) hex.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            digests.add(hex.toString());
        }
        if (digests.isEmpty()) throw new IllegalArgumentException("empty signer");
        Collections.sort(digests);
        return String.join(":", digests);
    }

    private void scanUser(int userId) {
        final List<ResolveInfo> services = mPackageManager.queryIntentServicesAsUser(
                new Intent(ACTION_PLUGIN_ENDPOINT), PackageManager.GET_META_DATA
                        | PackageManager.MATCH_DIRECT_BOOT_AWARE
                        | PackageManager.MATCH_DIRECT_BOOT_UNAWARE, userId);
        ArrayMap<String, PluginRecord> found = new ArrayMap<>();
        ArraySet<String> duplicates = new ArraySet<>();
        for (ResolveInfo result : services) {
            ServiceInfo info = result.serviceInfo;
            if (info == null || !info.exported || !info.enabled
                    || !info.applicationInfo.enabled
                    || (info.flags & ServiceInfo.FLAG_ISOLATED_PROCESS) != 0
                    || !PERMISSION_BIND_AGENT_PLUGIN.equals(info.permission)) continue;
            String id = info.metaData == null ? null : info.metaData.getString("agentos.plugin.id");
            if (!info.packageName.equals(id)) continue;
            String key = keyFor(userId, id);
            if (found.containsKey(key)) { duplicates.add(key); continue; }
            try {
                PackageInfo pkg = mPackageManager.getPackageInfoAsUser(info.packageName,
                        PackageManager.GET_SIGNING_CERTIFICATES, userId);
                if (pkg.applicationInfo.uid != info.applicationInfo.uid
                        || UserHandle.getUserId(pkg.applicationInfo.uid) != userId) continue;
                found.put(key, new PluginRecord(userId, id,
                        new ComponentName(info.packageName, info.name), pkg.applicationInfo.uid,
                        signerFor(pkg), pkg.getLongVersionCode(), info.directBootAware,
                        readStaticDescriptor(info)));
            } catch (Exception e) { Slog.w(TAG, "Plugin identity unavailable: " + info.packageName); }
        }
        for (String key : duplicates) found.remove(key);
        // Product demo policy: pregrant only the bundled, platform-signed demos,
        // once per user. An explicit later disable survives scans and reboots.
        String defaultsKey = userId + "/.demo-defaults-v1";
        if (!mEnabled.containsKey(defaultsKey)) {
            ArrayMap<String, String> next = new ArrayMap<>(mEnabled);
            for (PluginRecord candidate : found.values()) {
                if (candidate.pluginId.startsWith("com.example.agentos.demo.")
                        && (candidate.pluginId.endsWith(".records")
                        || candidate.pluginId.endsWith(".calendar") || candidate.pluginId.endsWith(".alarm"))
                        && mPackageManager.checkSignatures("android", candidate.pluginId)
                        == PackageManager.SIGNATURE_MATCH && !candidate.descriptorJson.isEmpty()) {
                    next.put(keyFor(userId, candidate.pluginId), candidate.signer);
                }
            }
            next.put(defaultsKey, "applied");
            persistQuietly(next);
        }
        for (int i = mPlugins.size() - 1; i >= 0; i--) {
            PluginRecord old = mPlugins.valueAt(i);
            if (old.userId != userId) continue;
            PluginRecord fresh = found.get(mPlugins.keyAt(i));
            if (fresh == null || !old.sameIdentity(fresh)) {
                unbind(old);
                mPlugins.removeAt(i);
            }
        }
        for (int i = 0; i < found.size(); i++) {
            String key = found.keyAt(i);
            PluginRecord record = mPlugins.get(key);
            if (record == null) { record = found.valueAt(i); mPlugins.put(key, record); }
            if (mEnabled.containsKey(key) && !record.signer.equals(mEnabled.get(key))) {
                ArrayMap<String, String> next = new ArrayMap<>(mEnabled);
                next.remove(key);
                persistQuietly(next);
            }
            // Enabled means eligible. Binding begins only on capability acquisition.
        }
    }

    private static String keyFor(int userId, String pluginId) { return userId + "/" + pluginId; }

    private boolean isEnabled(PluginRecord record) {
        return record.signer.equals(mEnabled.get(keyFor(record.userId, record.pluginId)));
    }

    private void scheduleRebind(PluginRecord record) {
        if (record.retry != null) mHandler.removeCallbacks(record.retry);
        record.retry = () -> {
            record.retry = null;
            if (mPlugins.get(keyFor(record.userId, record.pluginId)) == record
                    && mStartedUsers.contains(record.userId) && isEnabled(record)
                    && !record.leases.isEmpty()) bindEnabled(record);
        };
        mHandler.postDelayed(record.retry, record.retryMs);
        record.retryMs = Math.min(record.retryMs * 2, 30000L);
    }

    private void bindEnabled(PluginRecord record) {
        if (record.connection != null || !isEnabled(record) || !mStartedUsers.contains(record.userId)) return;
        if (!record.directBootAware && !getContext().getSystemService(UserManager.class)
                .isUserUnlocked(UserHandle.of(record.userId))) return;
        ServiceConnection connection = new ServiceConnection() {
            @Override public void onServiceConnected(ComponentName name, IBinder binder) {
                if (record.connection != this) return;
                if (record.timeout != null) mHandler.removeCallbacks(record.timeout);
                record.endpoint = IAgentPluginEndpoint.Stub.asInterface(binder);
                record.sessionId = UUID.randomUUID().toString();
                record.state = "handshaking";
                String sessionId = record.sessionId;
                IAgentPluginEndpoint endpoint = record.endpoint;
                record.timeout = () -> fail(record, this, "handshake_timeout");
                mHandler.postDelayed(record.timeout, HANDSHAKE_TIMEOUT_MS);
                try {
                    mHandshakes.execute(() -> {
                        AgentPluginDescriptor descriptor = null;
                        boolean v2 = false;
                        try {
                            AgentPluginHostInfo hostInfo = new AgentPluginHostInfo();
                            hostInfo.protocolVersions = new String[] {"plugin-injection/1"};
                            hostInfo.hostVersion = "agentos-aosp-bootstrap/2";
                            hostInfo.userId = record.userId;
                            descriptor = endpoint.openPluginSessionV2(sessionId, hostInfo,
                                    new IAgentPluginHostCallback.Stub() {
                                        @Override public void notifyResourcesChanged(String id,
                                                String[] names) { }
                                        @Override public void notifyCapabilitiesChanged(String id) { }
                                        @Override public void requestClose(String id, String reason) { }
                                        @Override public int getInterfaceVersion() {
                                            return IAgentPluginHostCallback.VERSION;
                                        }
                                        @Override public String getInterfaceHash() {
                                            return IAgentPluginHostCallback.HASH;
                                        }
                                    });
                            v2 = descriptor != null && descriptor.protocolVersion == 3;
                        } catch (Exception ignored) { }
                        if (!v2) {
                            try { descriptor = endpoint.openPluginSession(sessionId,
                                    record.userId, "agentos-aosp-bootstrap/1"); }
                            catch (Exception ignored) { }
                        }
                        final AgentPluginDescriptor response = descriptor;
                        final boolean negotiatedV2 = v2;
                        mHandler.post(() -> {
                            if (record.connection != this || !sessionId.equals(record.sessionId)) return;
                            if (response == null || (!negotiatedV2 && response.protocolVersion != 1)
                                    || (negotiatedV2 && response.protocolVersion != 3)
                                    || !record.pluginId.equals(response.pluginId)
                                    || !record.component.getPackageName().equals(response.packageName)
                                    || response.descriptorJson == null
                                    || response.descriptorJson.getBytes(StandardCharsets.UTF_8).length > 65536) {
                                fail(record, this, "invalid_descriptor"); return;
                            }
                            mHandler.removeCallbacks(record.timeout);
                            record.timeout = null;
                            if (!handoffToSideagentd(record, endpoint, response)) {
                                fail(record, this, "sideagentd_handoff_failed"); return;
                            }
                            if (negotiatedV2) {
                                try { AgentPluginCapabilities granted = new AgentPluginCapabilities();
                                      granted.grantedTools = record.session.grantedTools;
                                      granted.grantedResources = record.session.grantedResources;
                                      endpoint.sessionGrantedSync(sessionId, granted); }
                                catch (Exception e) { fail(record, this, "capability_grant_failed"); return; }
                            }
                            record.state = "active";
                            record.lastError = "";
                            record.retryMs = 1000L;
                            for (CompletableFuture<AgentPluginSession> waiter : record.pending.values()) {
                                waiter.complete(record.session);
                            }
                            record.pending.clear();
                        });
                    });
                } catch (RuntimeException e) { fail(record, this, "handshake_capacity"); }
            }
            @Override public void onServiceDisconnected(ComponentName name) { fail(record, this, "binder_died"); }
            @Override public void onBindingDied(ComponentName name) { fail(record, this, "binding_died"); }
            @Override public void onNullBinding(ComponentName name) { fail(record, this, "null_binding"); }
        };
        record.connection = connection;
        record.state = "binding";
        record.timeout = () -> fail(record, connection, "bind_timeout");
        mHandler.postDelayed(record.timeout, HANDSHAKE_TIMEOUT_MS);
        try {
            // A capability lease is an active request even when the Plugin has no Activity.
            // Mark the binding important so cached-app freezer/OOM policy cannot suspend the
            // endpoint between the lazy handshake and the sideagentd invocation.
            final int bindFlags = Context.BIND_AUTO_CREATE | Context.BIND_IMPORTANT
                    | Context.BIND_FOREGROUND_SERVICE;
            if (!getContext().bindServiceAsUser(new Intent().setComponent(record.component),
                    connection, bindFlags, mHandler, UserHandle.of(record.userId))) {
                fail(record, connection, "bind_failed");
            }
        } catch (RuntimeException e) { fail(record, connection, "bind_rejected"); }
    }

    private void fail(PluginRecord record, ServiceConnection connection, String reason) {
        if (record.connection != connection) return;
        unbind(record);
        record.lastError = reason;
        scheduleRebind(record);
    }

    private void unbind(PluginRecord record) {
        ServiceConnection connection = record.connection;
        for (CompletableFuture<AgentPluginSession> waiter : record.pending.values()) {
            waiter.completeExceptionally(new IllegalStateException("Plugin session unavailable"));
        }
        record.pending.clear();
        record.leases.clear();
        record.session = null;
        record.connection = null;
        if (record.timeout != null) mHandler.removeCallbacks(record.timeout);
        if (record.retry != null) mHandler.removeCallbacks(record.retry);
        record.timeout = null;
        record.retry = null;
        // close is oneway. Do not wait for third-party acknowledgement in system_server.
        if (record.endpoint != null && !record.sessionId.isEmpty()) {
            ISideagentd daemon = ISideagentd.Stub.asInterface(
                    ServiceManager.checkService(SIDED_SERVICE));
            if (daemon != null) {
                try { daemon.unregisterPluginSession(record.sessionId, "revoked"); }
                catch (Exception ignored) { }
            }
            try { record.endpoint.closePluginSession(record.sessionId, "revoked"); }
            catch (Exception ignored) { }
        }
        record.endpoint = null;
        record.sessionId = "";
        record.state = "idle";
        if (connection != null) {
            try { getContext().unbindService(connection); }
            catch (IllegalArgumentException ignored) { }
        }
    }

    private void setEnabled(int userId, String id, boolean enabled) throws Exception {
        if (userId < 0) throw new IllegalArgumentException("A concrete Android user is required");
        PluginRecord record = mPlugins.get(keyFor(userId, id));
        if (record == null) throw new IllegalArgumentException("Plugin not discovered for this user");
        ArrayMap<String, String> next = new ArrayMap<>(mEnabled);
        if (enabled) next.put(keyFor(userId, id), record.signer);
        else next.remove(keyFor(userId, id));
        if (enabled) {
            persist(next);
            // Persist eligibility without starting the Plugin process.
        } else {
            // Revoke before disk I/O: failed persistence must not leave a live grant.
            mEnabled = next;
            unbind(record);
            persist(next);
        }
    }

    private <T> T control(Callable<T> operation) {
        if (mHandler.getLooper().isCurrentThread()) {
            try { return operation.call(); }
            catch (Exception e) { throw new IllegalStateException(e); }
        }
        FutureTask<T> task = new FutureTask<>(operation);
        mHandler.post(task);
        try { return task.get(10, TimeUnit.SECONDS); }
        catch (Exception e) {
            task.cancel(false);
            throw new IllegalStateException("Agent control failed; query current state before retry", e);
        }
    }

    private AgentHealth health() {
        ISideagentd daemon = ISideagentd.Stub.asInterface(ServiceManager.checkService(SIDED_SERVICE));
        try { if (daemon != null) return daemon.getHealth(); }
        catch (Exception e) { Slog.w(TAG, "sideagentd unavailable"); }
        AgentHealth health = new AgentHealth();
        health.protocolVersion = 1;
        health.state = "daemon_unavailable";
        return health;
    }

    /** Move the endpoint Binder and policy-filtered descriptor names out of system_server. */
    private boolean handoffToSideagentd(PluginRecord record, IAgentPluginEndpoint endpoint,
            AgentPluginDescriptor descriptor) {
        ISideagentd daemon = ISideagentd.Stub.asInterface(
                ServiceManager.checkService(SIDED_SERVICE));
        if (daemon == null) return false;
        try {
            JSONObject raw = new JSONObject(descriptor.descriptorJson);
            AgentPluginSession session = new AgentPluginSession();
            session.pluginSessionId = record.sessionId;
            session.userId = record.userId;
            session.pluginId = record.pluginId;
            session.packageName = record.component.getPackageName();
            session.endpoint = endpoint;
            session.pluginUid = record.uid;
            session.grantedTools = names(raw.optJSONArray("tools"));
            if (!record.descriptorJson.isEmpty()) {
                ArraySet<String> declared = new ArraySet<>();
                Collections.addAll(declared, names(new JSONObject(record.descriptorJson).optJSONArray("tools")));
                ArrayList<String> granted = new ArrayList<>();
                for (String tool : session.grantedTools) if (declared.contains(tool)) granted.add(tool);
                session.grantedTools = granted.toArray(new String[0]);
            }
            session.grantedResources = names(raw.optJSONArray("resources"));
            daemon.registerPluginSession(session);
            record.session = session;
            return true;
        } catch (Exception e) {
            Slog.w(TAG, "Plugin session handoff failed: " + record.pluginId, e);
            return false;
        }
    }

    private static AgentPluginCapabilities capabilities(AgentPluginDescriptor descriptor)
            throws Exception {
        JSONObject raw = new JSONObject(descriptor.descriptorJson);
        AgentPluginCapabilities result = new AgentPluginCapabilities();
        result.grantedTools = names(raw.optJSONArray("tools"));
        result.grantedResources = names(raw.optJSONArray("resources"));
        return result;
    }

    private static String[] names(JSONArray values) {
        if (values == null) return new String[0];
        ArrayList<String> result = new ArrayList<>();
        for (int i = 0; i < values.length(); i++) {
            JSONObject item = values.optJSONObject(i);
            String name = item == null ? null : item.optString("name", "");
            if (name != null && !name.isEmpty()) result.add(name);
        }
        return result.toArray(new String[0]);
    }

    private String pluginsJson(int userId) throws Exception {
        JSONArray rows = new JSONArray();
        for (PluginRecord record : mPlugins.values()) {
            if (userId >= 0 && record.userId != userId) continue;
            rows.put(new JSONObject().put("userId", record.userId).put("pluginId", record.pluginId)
                    .put("uid", record.uid).put("versionCode", record.version)
                    .put("enabled", isEnabled(record)).put("state", record.state)
                    .put("sessionId", record.sessionId).put("leases", record.leases.size()).put("lastError", record.lastError));
        }
        return rows.toString();
    }

    private static void enforceSystemCaller() {
        int uid = Binder.getCallingUid();
        if (uid != Process.SYSTEM_UID && uid != Process.ROOT_UID)
            throw new SecurityException("AgentOS control is system-only");
    }

    private void enforceFrontendCaller() {
        int uid = Binder.getCallingUid();
        if (uid == Process.SYSTEM_UID || uid == Process.ROOT_UID) return;
        if (getContext().checkCallingPermission(PERMISSION_ACCESS_AGENT)
                != PackageManager.PERMISSION_GRANTED) {
            throw new SecurityException("AgentOS frontend permission is required");
        }
    }

    private int callingUserId() {
        return UserHandle.getUserId(Binder.getCallingUid());
    }

    private boolean callerOwnsFrontendId(String frontendId) {
        String[] packages = mPackageManager.getPackagesForUid(Binder.getCallingUid());
        if (packages == null) return false;
        for (String packageName : packages) if (frontendId.equals(packageName)) return true;
        return false;
    }

    private ISideagentd requireSideagentd() {
        ISideagentd daemon = ISideagentd.Stub.asInterface(
                ServiceManager.checkService(SIDED_SERVICE));
        if (daemon == null) throw new IllegalStateException("sideagentd is unavailable");
        return daemon;
    }

    private String readStaticDescriptor(ServiceInfo info) {
        int resource = info.metaData == null ? 0 : info.metaData.getInt("agentos.plugin.descriptor", 0);
        if (resource == 0) return "";
        try (InputStream input = mPackageManager.getResourcesForApplication(info.applicationInfo)
                .openRawResource(resource)) {
            byte[] bytes = input.readNBytes(65537);
            if (bytes.length > 65536) return "";
            JSONObject raw = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            if (!info.packageName.equals(raw.optString("pluginId"))) return "";
            return raw.toString();
        } catch (Exception e) { return ""; }
    }

    private static void enforceRuntimeCaller() {
        if (Binder.getCallingUid() != SIDEAGENT_UID)
            throw new SecurityException("Capability broker is sideagent-only");
    }

    private void releaseLease(PluginRecord record, String leaseId) {
        record.leases.remove(leaseId);
        CompletableFuture<AgentPluginSession> pending = record.pending.remove(leaseId);
        if (pending != null) pending.completeExceptionally(new IllegalStateException("Plugin lease expired"));
        long idleGeneration = ++record.idleGeneration;
        mHandler.postDelayed(() -> {
            if (record.idleGeneration == idleGeneration && record.leases.isEmpty()) unbind(record);
        }, IDLE_UNBIND_MS);
    }

    private final class BinderService extends IAgentManager.Stub {
        @Override public String getRuntimePluginCatalog(int userId) {
            enforceRuntimeCaller();
            return control(() -> {
                JSONArray catalog = new JSONArray();
                if (!mStartedUsers.contains(userId)) return catalog.toString();
                for (PluginRecord record : mPlugins.values()) {
                    if (record.userId == userId && isEnabled(record) && !record.descriptorJson.isEmpty())
                        catalog.put(new JSONObject(record.descriptorJson));
                }
                return catalog.toString();
            });
        }

        @Override public AgentPluginSession acquireRuntimePlugin(int userId, String pluginId, String leaseId) {
            enforceRuntimeCaller();
            if (leaseId == null || leaseId.isEmpty() || leaseId.length() > 512)
                throw new IllegalArgumentException("Bounded lease id is required");
            CompletableFuture<AgentPluginSession> future = new CompletableFuture<>();
            control(() -> {
                PluginRecord record = mPlugins.get(keyFor(userId, pluginId));
                if (record == null || !isEnabled(record) || !mStartedUsers.contains(userId)
                        || record.descriptorJson.isEmpty() || record.leases.size() >= 32)
                    throw new SecurityException("Plugin is not enabled for this user");
                record.idleGeneration++;
                record.leases.add(leaseId);
                mHandler.postDelayed(() -> releaseLease(record, leaseId), LEASE_MS);
                if ("active".equals(record.state) && record.session != null) {
                    // Re-register on each acquisition so a daemon restart cannot retain
                    // an unregistered endpoint or silently reuse an old capability grant.
                    requireSideagentd().registerPluginSession(record.session);
                    future.complete(record.session);
                } else {
                    record.pending.put(leaseId, future);
                    bindEnabled(record);
                }
                return null;
            });
            try { return future.get(HANDSHAKE_TIMEOUT_MS + 2000L, TimeUnit.MILLISECONDS); }
            catch (Exception e) {
                control(() -> {
                    PluginRecord record = mPlugins.get(keyFor(userId, pluginId));
                    if (record != null) releaseLease(record, leaseId);
                    return null;
                });
                throw new IllegalStateException("Plugin acquisition failed", e);
            }
        }

        @Override public void releaseRuntimePlugin(String sessionId, String leaseId) {
            enforceRuntimeCaller();
            mHandler.post(() -> {
                for (PluginRecord record : mPlugins.values()) {
                    if (sessionId.equals(record.sessionId)) releaseLease(record, leaseId);
                }
            });
        }

        @Override public AgentHealth getHealth() { enforceSystemCaller(); return health(); }
        @Override public String[] getDiscoveredPluginIds(int userId) {
            enforceSystemCaller();
            return control(() -> {
                ArrayList<String> ids = new ArrayList<>();
                for (PluginRecord record : mPlugins.values())
                    if (record.userId == userId) ids.add(record.pluginId);
                return ids.toArray(new String[0]);
            });
        }
        @Override public void setPluginEnabled(int userId, String pluginId, boolean enabled) {
            enforceSystemCaller();
            control(() -> { setEnabled(userId, pluginId, enabled); return null; });
        }
        @Override public String createSession(String frontendId, String metadataJson) {
            enforceFrontendCaller();
            if (frontendId == null || frontendId.isEmpty() || frontendId.length() > 128)
                throw new IllegalArgumentException("frontendId is required");
            if (!callerOwnsFrontendId(frontendId))
                throw new SecurityException("frontendId must name a package owned by the caller");
            try {
                return requireSideagentd().createSession(callingUserId(), Binder.getCallingUid(), frontendId,
                        metadataJson == null ? "{}" : metadataJson);
            } catch (Exception e) {
                throw new IllegalStateException("Agent session creation failed", e);
            }
        }
        @Override public AgentEnqueueResult submitInput(String sessionId, String requestId,
                String contentJson) {
            enforceFrontendCaller();
            if (sessionId == null || requestId == null || contentJson == null)
                throw new IllegalArgumentException("sessionId, requestId and contentJson are required");
            try {
                return requireSideagentd().submitInput(callingUserId(), Binder.getCallingUid(), sessionId, requestId,
                        contentJson);
            } catch (Exception e) {
                throw new IllegalStateException("Agent input failed", e);
            }
        }
        @Override public AgentEnqueueResult submitAutoInput(String frontendId, String metadataJson,
                String requestId, String contentJson) {
            enforceFrontendCaller();
            if (frontendId == null || frontendId.isEmpty() || requestId == null || contentJson == null)
                throw new IllegalArgumentException("frontendId, requestId and contentJson are required");
            if (!callerOwnsFrontendId(frontendId))
                throw new SecurityException("frontendId must name a package owned by the caller");
            try {
                return requireSideagentd().submitAutoInput(callingUserId(), Binder.getCallingUid(), frontendId,
                        metadataJson == null ? "{}" : metadataJson, requestId, contentJson);
            } catch (Exception e) {
                throw new IllegalStateException("Agent automatic session selection failed", e);
            }
        }
        @Override public void subscribeOutput(String sessionId, long afterSequence,
                IAgentEventCallback callback) {
            enforceFrontendCaller();
            if (sessionId == null || callback == null)
                throw new IllegalArgumentException("sessionId and callback are required");
            try {
                requireSideagentd().subscribeOutput(callingUserId(), Binder.getCallingUid(), sessionId, afterSequence,
                        callback);
            } catch (Exception e) {
                throw new IllegalStateException("Agent output subscription failed", e);
            }
        }
        @Override public void unsubscribeOutput(String sessionId, IAgentEventCallback callback) {
            enforceFrontendCaller();
            if (sessionId == null || callback == null) return;
            try {
                requireSideagentd().unsubscribeOutput(callingUserId(), Binder.getCallingUid(), sessionId, callback);
            } catch (Exception e) {
                Slog.w(TAG, "Agent output unsubscribe failed", e);
            }
        }
        @Override public void cancelTask(String sessionId, String requestId) {
            enforceFrontendCaller();
            if (sessionId == null || requestId == null) return;
            try {
                requireSideagentd().cancelTask(callingUserId(), Binder.getCallingUid(), sessionId, requestId);
            } catch (Exception e) {
                throw new IllegalStateException("Agent task cancellation failed", e);
            }
        }
        @Override public void resolveRecovery(String sessionId, String requestId) {
            enforceFrontendCaller();
            if (sessionId == null || requestId == null) return;
            try {
                requireSideagentd().resolveRecovery(callingUserId(), Binder.getCallingUid(), sessionId, requestId);
            } catch (Exception e) {
                throw new IllegalStateException("Agent recovery resolution failed", e);
            }
        }
        @Override public AgentSessionSnapshot getSnapshot(String sessionId) {
            enforceFrontendCaller();
            if (sessionId == null) throw new IllegalArgumentException("sessionId is required");
            try {
                return requireSideagentd().getSnapshot(callingUserId(), Binder.getCallingUid(), sessionId);
            } catch (Exception e) {
                throw new IllegalStateException("Agent snapshot failed", e);
            }
        }
        @Override public int getInterfaceVersion() { return IAgentManager.VERSION; }
        @Override public String getInterfaceHash() { return IAgentManager.HASH; }
        @Override protected void dump(FileDescriptor fd, PrintWriter pw, String[] args) {
            getContext().enforceCallingOrSelfPermission(Manifest.permission.DUMP, TAG);
            pw.println(control(() -> pluginsJson(-1)));
        }
        @Override public void onShellCommand(FileDescriptor in, FileDescriptor out, FileDescriptor err,
                String[] args, ShellCallback callback, ResultReceiver resultReceiver) {
            int uid = Binder.getCallingUid();
            if (uid != Process.ROOT_UID && !(uid == Process.SHELL_UID && Build.IS_DEBUGGABLE))
                throw new SecurityException("Agent diagnostics require root or userdebug shell");
            new ShellCommand() {
                @Override public int onCommand(String command) {
                    if (command == null) return handleDefaultCommands(null);
                    try {
                        if (command.equals("health")) {
                            AgentHealth h = health();
                            getOutPrintWriter().println(new JSONObject().put("state", h.state)
                                    .put("protocolVersion", h.protocolVersion).put("startedAtMs", h.startedAtMs));
                            return "ready".equals(h.state) ? 0 : 1;
                        }
                        if (command.equals("runtime-test")) {
                            boolean auto = false;
                            boolean wait = true;
                            StringBuilder prompt = new StringBuilder();
                            String argument;
                            while ((argument = getNextArg()) != null) {
                                if ("--auto".equals(argument)) { auto = true; continue; }
                                if ("--no-wait".equals(argument)) { wait = false; continue; }
                                if (prompt.length() > 0) prompt.append(' ');
                                prompt.append(argument);
                            }
                            if (prompt.length() == 0)
                                throw new IllegalArgumentException("runtime-test requires a prompt");
                            String requestId = "shell-" + UUID.randomUUID();
                            String content = new JSONObject().put("content", new JSONArray().put(
                                    new JSONObject().put("type", "text").put("text", prompt.toString()))).toString();
                            ISideagentd daemon = requireSideagentd();
                            AgentEnqueueResult receipt;
                            String sessionId;
                            if (auto) {
                                receipt = daemon.submitAutoInput(UserHandle.USER_SYSTEM, Process.SYSTEM_UID,
                                        "com.android.shell", "{}", requestId, content);
                                sessionId = receipt.sessionId;
                            } else {
                                sessionId = daemon.createSession(UserHandle.USER_SYSTEM, Process.SYSTEM_UID,
                                        "com.android.shell", "{}");
                                receipt = daemon.submitInput(UserHandle.USER_SYSTEM, Process.SYSTEM_UID,
                                        sessionId, requestId, content);
                            }
                            getOutPrintWriter().println(new JSONObject().put("accepted", receipt.accepted)
                                    .put("sessionId", receipt.sessionId).put("taskId", receipt.taskId)
                                    .put("requestId", requestId).put("deduplicated", receipt.deduplicated));
                            if (!wait) return receipt.accepted ? 0 : 1;
                            final long deadline = SystemClock.elapsedRealtime() + 180_000L;
                            while (SystemClock.elapsedRealtime() < deadline) {
                                AgentSessionSnapshot snapshot = daemon.getSnapshot(UserHandle.USER_SYSTEM,
                                        Process.SYSTEM_UID, sessionId);
                                getOutPrintWriter().println(snapshot.json);
                                JSONObject value = new JSONObject(snapshot.json);
                                JSONArray tasks = value.optJSONArray("tasks");
                                String state = "";
                                for (int i = 0; tasks != null && i < tasks.length(); i++) {
                                    JSONObject task = tasks.optJSONObject(i);
                                    if (task != null && requestId.equals(task.optString("requestId"))) {
                                        state = task.optString("state"); break;
                                    }
                                }
                                if ("completed".equals(state)) return 0;
                                if ("failed".equals(state) || "cancelled".equals(state) || "unknown".equals(state)) return 1;
                                SystemClock.sleep(250L);
                            }
                            getErrPrintWriter().println("runtime-test timed out");
                            return 1;
                        }
                        if (command.equals("runtime-snapshot")) {
                            String sessionId = getNextArgRequired();
                            AgentSessionSnapshot snapshot = requireSideagentd().getSnapshot(
                                    UserHandle.USER_SYSTEM, Process.SYSTEM_UID, sessionId);
                            getOutPrintWriter().println(snapshot.json);
                            return 0;
                        }
                        if (command.equals("runtime-recover")) {
                            String sessionId = getNextArgRequired();
                            String requestId = getNextArgRequired();
                            requireSideagentd().resolveRecovery(UserHandle.USER_SYSTEM, Process.SYSTEM_UID,
                                    sessionId, requestId);
                            getOutPrintWriter().println("ok");
                            return 0;
                        }
                        int userId = UserHandle.USER_SYSTEM;
                        String next = getNextArg();
                        if ("--user".equals(next)) {
                            userId = Integer.parseInt(getNextArgRequired());
                            next = getNextArg();
                        }
                        final int selectedUser = userId;
                        if (command.equals("plugins")) {
                            getOutPrintWriter().println(control(() -> pluginsJson(selectedUser)));
                            return 0;
                        }
                        if (command.equals("enable") || command.equals("disable")) {
                            if (next == null) throw new IllegalArgumentException("Plugin package required");
                            final String id = next;
                            control(() -> { setEnabled(selectedUser, id, command.equals("enable")); return null; });
                            getOutPrintWriter().println("ok");
                            return 0;
                        }
                        return handleDefaultCommands(command);
                    } catch (Exception e) {
                        getErrPrintWriter().println(e.getMessage()); return 1;
                    }
                }
                @Override public void onHelp() {
                    getOutPrintWriter().println("AgentOS: health | plugins [--user ID] | enable|disable [--user ID] PACKAGE | runtime-test [--auto] [--no-wait] PROMPT | runtime-snapshot SESSION_ID | runtime-recover SESSION_ID REQUEST_ID");
                }
            }.exec(BinderService.this, in, out, err, args, callback, resultReceiver);
        }
    }

    private static final class PluginRecord {
        final int userId;
        final String pluginId;
        final ComponentName component;
        final int uid;
        final String signer;
        final long version;
        final boolean directBootAware;
        final String descriptorJson;
        final ArrayMap<String, CompletableFuture<AgentPluginSession>> pending = new ArrayMap<>();
        final ArraySet<String> leases = new ArraySet<>();
        AgentPluginSession session;
        long idleGeneration;

        ServiceConnection connection;
        IAgentPluginEndpoint endpoint;
        Runnable timeout;
        Runnable retry;
        String state = "idle";
        String sessionId = "";
        String lastError = "";
        long retryMs = 1000L;
        PluginRecord(int userId, String id, ComponentName component, int uid, String signer,
                long version, boolean directBootAware, String descriptorJson) {
            this.userId = userId; this.pluginId = id; this.component = component;
            this.uid = uid; this.signer = signer; this.version = version;
            this.directBootAware = directBootAware;
            this.descriptorJson = descriptorJson;
        }
        boolean sameIdentity(PluginRecord other) {
            return component.equals(other.component) && uid == other.uid
                    && version == other.version && signer.equals(other.signer)
                    && directBootAware == other.directBootAware;
        }
    }
}
