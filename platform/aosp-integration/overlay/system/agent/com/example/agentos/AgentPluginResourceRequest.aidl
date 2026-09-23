package com.example.agentos;

/** A bounded, read-only resource request using the same result sink as tools. */
@VintfStability
parcelable AgentPluginResourceRequest {
    String pluginSessionId;
    String leaseId;
    String requestId;
    String resource;
    int maxBytes;
    long deadlineEpochMs;
}
