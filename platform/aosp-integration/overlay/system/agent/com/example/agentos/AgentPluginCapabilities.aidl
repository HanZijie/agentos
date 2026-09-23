package com.example.agentos;

/** Immutable capability set granted for one Plugin session. */
@VintfStability
parcelable AgentPluginCapabilities {
    String[] grantedTools;
    String[] grantedResources;
}
