package com.example.agentos;

parcelable AgentHealth {
    int protocolVersion;
    String state;
    long startedAtMs;
    int activeSessions;
    int queuedTasks;
}
