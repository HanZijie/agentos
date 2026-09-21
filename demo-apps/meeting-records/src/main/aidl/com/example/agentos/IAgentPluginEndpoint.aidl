package com.example.agentos;

import com.example.agentos.AgentPluginDescriptor;

interface IAgentPluginEndpoint {
    AgentPluginDescriptor openPluginSession(String pluginSessionId, int userId, String hostVersion);
    oneway void closePluginSession(String pluginSessionId, String reason);
}
