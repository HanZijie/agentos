package com.example.agentos;

import com.example.agentos.AgentHealth;

@VintfStability
interface IAgentManager {
    AgentHealth getHealth();
    String[] getDiscoveredPluginIds(int userId);
    void setPluginEnabled(int userId, String pluginId, boolean enabled);
}
