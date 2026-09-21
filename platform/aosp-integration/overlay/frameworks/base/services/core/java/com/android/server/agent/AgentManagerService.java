package com.android.server.agent;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ServiceManager;
import android.os.UserHandle;
import android.util.ArrayMap;
import android.util.Slog;

import com.android.server.SystemService;

import com.example.agentos.AgentHealth;
import com.example.agentos.IAgentManager;
import com.example.agentos.IAgentPluginEndpoint;
import com.example.agentos.ISideagentd;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Bootstrap control-plane slice. It discovers endpoint services from the
 * manifest, binds only after per-user enablement, and creates a fresh session
 * on every bind. It is deliberately not wired into SystemServer until the
 * target AOSP branch and stable AIDL version are selected.
 */
public final class AgentManagerService extends SystemService {
    private static final String TAG = "AgentManagerService";
    public static final String ACTION_PLUGIN_ENDPOINT =
            "agentos.intent.action.PLUGIN_ENDPOINT";
    public static final String PERMISSION_BIND_AGENT_PLUGIN =
            "com.example.agentos.permission.BIND_AGENT_PLUGIN";
    private static final String SIDED_SERVICE = "agentos.sideagentd";

    private final Object mLock = new Object();
    private final Handler mMainHandler = new Handler(Looper.getMainLooper());
    // The same plugin id may be installed for more than one Android user.
    private final ArrayMap<String, PluginRecord> mPlugins = new ArrayMap<>();
    // Bootstrap-only memory state. The next slice persists this by
    // (userId, pluginId) before exposing the setting to a frontend.
    private final ArrayMap<Integer, ArrayMap<String, Boolean>> mEnabled = new ArrayMap<>();
    private final PackageManager mPackageManager;

    public AgentManagerService(Context context) {
        super(context);
        mPackageManager = context.getPackageManager();
    }

    @Override
    public void onStart() {
        publishBinderService("agentos", new BinderService());
        registerPackageReceiver();
        scanUser(UserHandle.USER_SYSTEM);
    }

    private void registerPackageReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_PACKAGE_ADDED);
        filter.addAction(Intent.ACTION_PACKAGE_REPLACED);
        filter.addAction(Intent.ACTION_PACKAGE_REMOVED);
        filter.addDataScheme("package");
        getContext().registerReceiverAsUser(new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                scanUser(getSendingUserId());
            }
        }, UserHandle.ALL, filter, null, null);
    }

    private void scanUser(int userId) {
        final Intent query = new Intent(ACTION_PLUGIN_ENDPOINT);
        final List<ResolveInfo> services = mPackageManager.queryIntentServicesAsUser(
                query, PackageManager.MATCH_DIRECT_BOOT_AWARE
                        | PackageManager.MATCH_DIRECT_BOOT_UNAWARE
                        | PackageManager.MATCH_ENABLED_COMPONENTS, userId);
        synchronized (mLock) {
            ArrayMap<String, Boolean> discovered = new ArrayMap<>();
            for (ResolveInfo resolveInfo : services) {
                ServiceInfo info = resolveInfo.serviceInfo;
                if (info == null || !PERMISSION_BIND_AGENT_PLUGIN.equals(info.permission)) {
                    Slog.w(TAG, "Ignoring unprotected Plugin endpoint: " + info);
                    continue;
                }
                String pluginId = info.metaData == null ? null
                        : info.metaData.getString("agentos.plugin.id");
                if (pluginId == null || pluginId.isEmpty() || !info.packageName.equals(pluginId)) {
                    Slog.w(TAG, "Ignoring Plugin whose id is not its package name: " + info);
                    continue;
                }
                String key = keyFor(userId, pluginId);
                if (discovered.containsKey(key)) {
                    Slog.e(TAG, "Ignoring duplicate Plugin endpoint for " + key);
                    continue;
                }
                discovered.put(key, true);
                ComponentName component = new ComponentName(info.packageName, info.name);
                PluginRecord record = mPlugins.get(key);
                if (record == null || !record.component.equals(component)) {
                    if (record != null) unbind(record);
                    record = new PluginRecord(userId, pluginId, component);
                    mPlugins.put(key, record);
                }
                if (isEnabled(record)) bindEnabled(record);
            }
            for (int i = mPlugins.size() - 1; i >= 0; i--) {
                String key = mPlugins.keyAt(i);
                if (mPlugins.valueAt(i).userId == userId && !discovered.containsKey(key)) {
                    unbind(mPlugins.valueAt(i));
                    mPlugins.removeAt(i);
                }
            }
        }
    }

    private static String keyFor(int userId, String pluginId) {
        return userId + "/" + pluginId;
    }

    private boolean isEnabled(PluginRecord record) {
        ArrayMap<String, Boolean> user = mEnabled.get(record.userId);
        return user != null && Boolean.TRUE.equals(user.get(record.pluginId));
    }

    private void scheduleRebind(PluginRecord record) {
        long delayMs = record.retryMs;
        record.retryMs = Math.min(record.retryMs * 2L, 30000L);
        mMainHandler.postDelayed(() -> {
            synchronized (mLock) {
                if (mPlugins.get(keyFor(record.userId, record.pluginId)) == record
                        && isEnabled(record)) bindEnabled(record);
            }
        }, delayMs);
    }

    private void bindEnabled(PluginRecord record) {
        if (record.connection != null) return;
        Intent intent = new Intent().setComponent(record.component);
        record.connection = new ServiceConnection() {
            @Override public void onServiceConnected(ComponentName name, IBinder binder) {
                record.endpoint = IAgentPluginEndpoint.Stub.asInterface(binder);
                try {
                    record.endpoint.openPluginSession(UUID.randomUUID().toString(),
                            record.userId, "agentos-aosp-bootstrap/1");
                    record.active = true;
                    record.retryMs = 1000L;
                } catch (Exception e) {
                    Slog.e(TAG, "Plugin handshake failed: " + record.pluginId, e);
                    unbind(record);
                }
            }
            @Override public void onServiceDisconnected(ComponentName name) {
                record.active = false;
                record.endpoint = null;
                record.connection = null;
                scheduleRebind(record);
            }
            @Override public void onBindingDied(ComponentName name) {
                record.active = false;
                record.endpoint = null;
                record.connection = null;
                scheduleRebind(record);
            }
            @Override public void onNullBinding(ComponentName name) {
                record.active = false;
                record.endpoint = null;
                record.connection = null;
                scheduleRebind(record);
            }
        };
        boolean bound = getContext().bindServiceAsUser(intent, record.connection,
                Context.BIND_AUTO_CREATE, UserHandle.of(record.userId));
        if (!bound) record.connection = null;
    }

    private void unbind(PluginRecord record) {
        if (record.connection != null) {
            getContext().unbindService(record.connection);
            record.connection = null;
        }
        record.endpoint = null;
        record.active = false;
    }

    private final class BinderService extends IAgentManager.Stub {
        @Override public AgentHealth getHealth() {
            enforceSystemCaller();
            ISideagentd daemon = ISideagentd.Stub.asInterface(
                    ServiceManager.checkService(SIDED_SERVICE));
            try { return daemon == null ? null : daemon.getHealth(); }
            catch (Exception e) { Slog.w(TAG, "sideagentd health unavailable", e); return null; }
        }

        @Override public String[] getDiscoveredPluginIds(int userId) {
            enforceSystemCaller();
            synchronized (mLock) {
                ArrayList<String> ids = new ArrayList<>();
                for (PluginRecord record : mPlugins.values())
                    if (record.userId == userId) ids.add(record.pluginId);
                return ids.toArray(new String[0]);
            }
        }

        @Override public void setPluginEnabled(int userId, String pluginId, boolean enabled) {
            enforceSystemCaller();
            synchronized (mLock) {
                PluginRecord record = mPlugins.get(keyFor(userId, pluginId));
                if (record == null || record.userId != userId) return;
                ArrayMap<String, Boolean> user = mEnabled.get(userId);
                if (user == null) { user = new ArrayMap<>(); mEnabled.put(userId, user); }
                user.put(pluginId, enabled);
                if (enabled) bindEnabled(record); else unbind(record);
            }
        }

        private void enforceSystemCaller() {
            int uid = Binder.getCallingUid();
            if (uid != android.os.Process.SYSTEM_UID && uid != android.os.Process.ROOT_UID)
                throw new SecurityException("AgentManagerService is system-only in bootstrap");
        }
    }

    private static final class PluginRecord {
        final int userId;
        final String pluginId;
        final ComponentName component;
        ServiceConnection connection;
        IAgentPluginEndpoint endpoint;
        boolean active;
        long retryMs = 1000L;
        PluginRecord(int userId, String pluginId, ComponentName component) {
            this.userId = userId; this.pluginId = pluginId; this.component = component;
        }
    }
}
