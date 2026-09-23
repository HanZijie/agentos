package com.example.agentos;

import com.example.agentos.AgentHealth;
import com.example.agentos.AgentEnqueueResult;
import com.example.agentos.AgentPluginInvokeRequest;
import com.example.agentos.AgentPluginResourceRequest;
import com.example.agentos.AgentPluginSession;
import com.example.agentos.AgentSessionSnapshot;
import com.example.agentos.IAgentEventCallback;
import com.example.agentos.IAgentPluginResultSink;

@VintfStability
interface ISideagentd {
    AgentHealth getHealth();
    void registerPluginSession(in AgentPluginSession session);
    oneway void unregisterPluginSession(String pluginSessionId, String reason);
    oneway void beginInvoke(in AgentPluginInvokeRequest request, IAgentPluginResultSink sink);
    oneway void beginReadResource(in AgentPluginResourceRequest request, IAgentPluginResultSink sink);
    oneway void cancelInvoke(String pluginSessionId, String requestId);
    String createSession(int userId, int frontendUid, String frontendId, String metadataJson);
    AgentEnqueueResult submitInput(int userId, int frontendUid, String sessionId, String requestId, String contentJson);
    AgentEnqueueResult submitAutoInput(int userId, int frontendUid, String frontendId, String metadataJson, String requestId, String contentJson);
    void subscribeOutput(int userId, int frontendUid, String sessionId, long afterSequence, IAgentEventCallback callback);
    void unsubscribeOutput(int userId, int frontendUid, String sessionId, IAgentEventCallback callback);
    void cancelTask(int userId, int frontendUid, String sessionId, String requestId);
    void resolveRecovery(int userId, int frontendUid, String sessionId, String requestId);
    AgentSessionSnapshot getSnapshot(int userId, int frontendUid, String sessionId);
}
