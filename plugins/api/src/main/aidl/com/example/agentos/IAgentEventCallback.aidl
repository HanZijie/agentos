package com.example.agentos;

oneway interface IAgentEventCallback {
    void onEvent(String sessionId, long sequence, String eventJson);
}
