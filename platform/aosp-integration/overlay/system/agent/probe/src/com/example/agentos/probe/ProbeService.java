package com.example.agentos.probe;

import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.IBinder;
import android.os.Process;
import android.os.UserHandle;
import android.util.Slog;
import com.example.agentos.AgentPluginDescriptor;
import com.example.agentos.IAgentPluginEndpoint;

/** Real APK endpoint used only to validate discovery, binding and process lifecycle. */
public final class ProbeService extends Service {
    private String mSession = "";
    private final IAgentPluginEndpoint.Stub mEndpoint = new IAgentPluginEndpoint.Stub() {
        @Override public synchronized AgentPluginDescriptor openPluginSession(
                String sessionId, int userId, String hostVersion) {
            enforceHost();
            if (userId != UserHandle.getUserId(Process.myUid()))
                throw new SecurityException("wrong Android user");
            mSession = sessionId;
            AgentPluginDescriptor result = new AgentPluginDescriptor();
            result.protocolVersion = 1;
            result.pluginId = getPackageName();
            result.packageName = getPackageName();
            result.displayName = "AgentOS Discovery Probe";
            result.descriptorJson = "{\"probe\":\"discovery-only\",\"pid\":" + Process.myPid() + "}";
            Slog.i("AgentOsProbe", "open uid=" + Process.myUid() + " pid=" + Process.myPid());
            return result;
        }
        @Override public synchronized void closePluginSession(String sessionId, String reason) {
            enforceHost();
            if (mSession.equals(sessionId)) mSession = "";
            Slog.i("AgentOsProbe", "close pid=" + Process.myPid());
        }
        @Override public int getInterfaceVersion() { return IAgentPluginEndpoint.VERSION; }
        @Override public String getInterfaceHash() { return IAgentPluginEndpoint.HASH; }
        private void enforceHost() {
            if (Binder.getCallingUid() != Process.SYSTEM_UID)
                throw new SecurityException("system host required");
        }
    };
    @Override public IBinder onBind(Intent intent) { return mEndpoint; }
}
