package com.example.agentos;

import com.example.agentos.IAgentPluginEndpoint;

/**
 * Capability session handed from AgentManagerService to sideagentd.
 *
 * The endpoint Binder remains owned by the Plugin App process. sideagentd
 * receives only this handle plus identity and the policy-filtered capability
 * names; it never loads Plugin code into its own address space.
 */
parcelable AgentPluginSession {
    String pluginSessionId;
    int userId;
    String pluginId;
    String packageName;
    String[] grantedTools;
    String[] grantedResources;
    IAgentPluginEndpoint endpoint;
}
