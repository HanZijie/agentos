package com.example.agentos;

/** Typed seam error. code values are defined by Plugin Injection Contract v1. */
parcelable AgentPluginInvokeError {
    String code;
    String message;
    boolean retryable;
    String dataJson;
}
