package com.example.agentos;

/**
 * A bounded tool invocation. Empty idempotencyKey means that the call has no
 * external side effect; side-effecting tools must receive a non-empty key.
 */
@VintfStability
parcelable AgentPluginInvokeRequest {
    String pluginSessionId;
    String leaseId;
    String requestId;
    String tool;
    String argsJson;
    String idempotencyKey;
    long deadlineEpochMs;
}
