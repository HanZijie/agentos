package com.example.agentos;

import com.example.agentos.AgentPluginDescriptor;
import com.example.agentos.AgentPluginCapabilities;
import com.example.agentos.AgentPluginHostInfo;
import com.example.agentos.AgentPluginInvokeRequest;
import com.example.agentos.AgentPluginInvokeResult;
import com.example.agentos.AgentPluginResourceRequest;
import com.example.agentos.IAgentPluginHostCallback;
import com.example.agentos.IAgentPluginResultSink;

interface IAgentPluginEndpoint {
    // V1 discovery handshake retained for existing clients. New hosts use
    // openPluginSessionV2 so protocol negotiation and callbacks are explicit.
    AgentPluginDescriptor openPluginSession(String pluginSessionId, int userId, String hostVersion);
    oneway void closePluginSession(String pluginSessionId, String reason);

    // Versioned handshake and asynchronous capability data plane.
    AgentPluginDescriptor openPluginSessionV2(String pluginSessionId,
            in AgentPluginHostInfo hostInfo, IAgentPluginHostCallback hostCallback);
    AgentPluginInvokeResult invokeSync(in AgentPluginInvokeRequest request);
    oneway void sessionGranted(String pluginSessionId, in AgentPluginCapabilities granted);
    oneway void beginInvoke(in AgentPluginInvokeRequest request, IAgentPluginResultSink sink);
    oneway void beginReadResource(in AgentPluginResourceRequest request,
            IAgentPluginResultSink sink);
    oneway void cancelInvoke(String pluginSessionId, String requestId);
}
