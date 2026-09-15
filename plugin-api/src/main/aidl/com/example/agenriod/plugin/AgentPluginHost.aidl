package com.example.agenriod.plugin;
import com.example.agenriod.plugin.AgentPluginService;

/** Registration belongs to the process holding endpoint, and expires on Binder death. */
interface AgentPluginHost {
    void registerPlugin(String packageName, String descriptorJson, AgentPluginService endpoint);
    void unregisterPlugin(String pluginId, AgentPluginService endpoint);
    // Host-UID-only operations, also used by device acceptance tests.
    String catalog();
    String invoke(String pluginId, String tool, String argsJson);
}
