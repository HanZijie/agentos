package com.example.agentos;

parcelable AgentEnqueueResult {
    boolean accepted;
    String sessionId;
    String taskId;
    String messageId;
    boolean deduplicated;
    String errorCode;
    String errorMessage;
}
