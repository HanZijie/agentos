package com.example.agentos;

import com.example.agentos.AgentPluginInvokeError;

/**
 * Exactly one terminal result for an invoke or resource request.
 *
 * status is "ok" or "error". For an error, error is populated. Resource
 * responses use content/mimeType/generatedAtMs/truncated; tool responses use
 * resultJson. Large attachment transport is intentionally deferred until the
 * sideagentd storage and PFD handoff are wired.
 */
@VintfStability
parcelable AgentPluginInvokeResult {
    String requestId;
    String status;
    String resultJson;
    AgentPluginInvokeError error;
    String content;
    String mimeType;
    long generatedAtMs;
    boolean truncated;
}
