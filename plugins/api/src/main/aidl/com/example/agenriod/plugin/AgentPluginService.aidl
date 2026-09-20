package com.example.agenriod.plugin;

interface AgentPluginService {
    String describe();
    String invoke(String tool, String argsJson);
}
