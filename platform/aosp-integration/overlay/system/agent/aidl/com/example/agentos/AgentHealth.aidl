package com.example.agentos;

@VintfStability
parcelable AgentHealth {
    int protocolVersion;
    String state;
    long startedAtMs;
    int activeSessions;
    int queuedTasks;
}
