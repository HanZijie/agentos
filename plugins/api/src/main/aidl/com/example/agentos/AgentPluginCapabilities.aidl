package com.example.agentos;

/** Immutable capability set granted for one Plugin session. */
parcelable AgentPluginCapabilities {
    String[] grantedTools;
    String[] grantedResources;
}
