package com.example.agentos;

/** Endpoint-to-host notifications for one active Plugin session. */
@VintfStability
interface IAgentPluginHostCallback {
    oneway void notifyResourcesChanged(String pluginSessionId, in String[] resourceNames);
    oneway void notifyCapabilitiesChanged(String pluginSessionId);
    oneway void requestClose(String pluginSessionId, String reasonCode);
}
