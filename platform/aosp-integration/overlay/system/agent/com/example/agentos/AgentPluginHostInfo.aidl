package com.example.agentos;

/**
 * Facts supplied by the system during a Plugin session handshake.
 *
 * A Plugin must treat protocolVersions and hostVersion as negotiation hints;
 * package identity and user ownership still come from Binder and the system
 * package manager.
 */
@VintfStability
parcelable AgentPluginHostInfo {
    String[] protocolVersions;
    String hostVersion;
    int userId;
}
