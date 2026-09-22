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
import android.os.UserHandle;
import android.os.UserManager;
import android.util.ArrayMap;
import android.util.ArraySet;
import android.util.AtomicFile;
import android.util.Slog;

import com.android.server.SystemService;
import com.example.agentos.AgentHealth;
import com.example.agentos.AgentPluginDescriptor;
import com.example.agentos.IAgentManager;
import com.example.agentos.IAgentPluginEndpoint;
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
        scanUser(userId);
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
                        signerFor(pkg), pkg.getLongVersionCode(), info.directBootAware));
            } catch (Exception e) { Slog.w(TAG, "Plugin identity unavailable: " + info.packageName); }
        }
        for (String key : duplicates) found.remove(key);
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
            if (isEnabled(record)) bindEnabled(record);
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
                    && mStartedUsers.contains(record.userId) && isEnabled(record)) bindEnabled(record);
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
                        try { descriptor = endpoint.openPluginSession(sessionId,
                                record.userId, "agentos-aosp-bootstrap/1"); }
                        catch (Exception ignored) { }
                        final AgentPluginDescriptor response = descriptor;
                        mHandler.post(() -> {
                            if (record.connection != this || !sessionId.equals(record.sessionId)) return;
                            if (response == null || response.protocolVersion != 1
                                    || !record.pluginId.equals(response.pluginId)
                                    || !record.component.getPackageName().equals(response.packageName)
                                    || response.descriptorJson == null
                                    || response.descriptorJson.getBytes(StandardCharsets.UTF_8).length > 65536) {
                                fail(record, this, "invalid_descriptor"); return;
                            }
                            mHandler.removeCallbacks(record.timeout);
                            record.timeout = null;
                            record.state = "active";
                            record.lastError = "";
                            record.retryMs = 1000L;
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
            if (!getContext().bindServiceAsUser(new Intent().setComponent(record.component),
                    connection, Context.BIND_AUTO_CREATE, mHandler, UserHandle.of(record.userId))) {
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
        record.connection = null;
        if (record.timeout != null) mHandler.removeCallbacks(record.timeout);
        if (record.retry != null) mHandler.removeCallbacks(record.retry);
        record.timeout = null;
        record.retry = null;
        // close is oneway. Do not wait for third-party acknowledgement in system_server.
        if (record.endpoint != null && !record.sessionId.isEmpty()) {
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
            bindEnabled(record);
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

    private String pluginsJson(int userId) throws Exception {
        JSONArray rows = new JSONArray();
        for (PluginRecord record : mPlugins.values()) {
            if (userId >= 0 && record.userId != userId) continue;
            rows.put(new JSONObject().put("userId", record.userId).put("pluginId", record.pluginId)
                    .put("uid", record.uid).put("versionCode", record.version)
                    .put("enabled", isEnabled(record)).put("state", record.state)
                    .put("sessionId", record.sessionId).put("lastError", record.lastError));
        }
        return rows.toString();
    }

    private static void enforceSystemCaller() {
        int uid = Binder.getCallingUid();
        if (uid != Process.SYSTEM_UID && uid != Process.ROOT_UID)
            throw new SecurityException("AgentOS control is system-only");
    }

    private final class BinderService extends IAgentManager.Stub {
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
                    getOutPrintWriter().println("AgentOS bootstrap: health | plugins [--user ID] | enable|disable [--user ID] PACKAGE");
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
        ServiceConnection connection;
        IAgentPluginEndpoint endpoint;
        Runnable timeout;
        Runnable retry;
        String state = "idle";
        String sessionId = "";
        String lastError = "";
        long retryMs = 1000L;
        PluginRecord(int userId, String id, ComponentName component, int uid, String signer,
                long version, boolean directBootAware) {
            this.userId = userId; this.pluginId = id; this.component = component;
            this.uid = uid; this.signer = signer; this.version = version;
            this.directBootAware = directBootAware;
        }
        boolean sameIdentity(PluginRecord other) {
            return component.equals(other.component) && uid == other.uid
                    && version == other.version && signer.equals(other.signer)
                    && directBootAware == other.directBootAware;
        }
    }
}
