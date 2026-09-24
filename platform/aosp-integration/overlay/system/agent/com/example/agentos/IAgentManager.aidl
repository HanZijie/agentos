package com.example.agentos;

import com.example.agentos.AgentHealth;
import com.example.agentos.AgentPluginSession;
import com.example.agentos.AgentEnqueueResult;
import com.example.agentos.AgentSessionSnapshot;
import com.example.agentos.IAgentEventCallback;

@VintfStability
interface IAgentManager {
    AgentHealth getHealth();
    String[] getDiscoveredPluginIds(int userId);
    void setPluginEnabled(int userId, String pluginId, boolean enabled);
    String createSession(String frontendId, String metadataJson);
    AgentEnqueueResult submitInput(String sessionId, String requestId, String contentJson);
    AgentEnqueueResult submitAutoInput(String frontendId, String metadataJson, String requestId, String contentJson);
    void subscribeOutput(String sessionId, long afterSequence, IAgentEventCallback callback);
    void unsubscribeOutput(String sessionId, IAgentEventCallback callback);
    void cancelTask(String sessionId, String requestId);
    void resolveRecovery(String sessionId, String requestId);
    AgentSessionSnapshot getSnapshot(String sessionId);
    // Internal capability broker. Only the dedicated sideagent UID may call.
    String getRuntimePluginCatalog(int userId);
    AgentPluginSession acquireRuntimePlugin(int userId, String pluginId, String leaseId);
    oneway void releaseRuntimePlugin(String pluginSessionId, String leaseId);
}
