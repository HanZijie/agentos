package com.example.agentos;

import com.example.agentos.AgentHealth;
import com.example.agentos.AgentPluginInvokeRequest;
import com.example.agentos.AgentPluginResourceRequest;
import com.example.agentos.AgentPluginSession;
import com.example.agentos.IAgentPluginResultSink;

@VintfStability
interface ISideagentd {
    AgentHealth getHealth();
    void registerPluginSession(in AgentPluginSession session);
    oneway void unregisterPluginSession(String pluginSessionId, String reason);
    oneway void beginInvoke(in AgentPluginInvokeRequest request, IAgentPluginResultSink sink);
    oneway void beginReadResource(in AgentPluginResourceRequest request, IAgentPluginResultSink sink);
    oneway void cancelInvoke(String pluginSessionId, String requestId);
}
