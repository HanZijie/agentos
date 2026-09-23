package com.example.agentos;

@VintfStability
oneway interface IAgentEventCallback {
    void onEvent(String sessionId, long sequence, String eventJson);
}
