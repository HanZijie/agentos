package com.example.agentos;

import com.example.agentos.AgentHealth;
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
    void subscribeOutput(String sessionId, long afterSequence, IAgentEventCallback callback);
    void unsubscribeOutput(String sessionId, IAgentEventCallback callback);
    void cancelTask(String sessionId, String requestId);
    AgentSessionSnapshot getSnapshot(String sessionId);
}
