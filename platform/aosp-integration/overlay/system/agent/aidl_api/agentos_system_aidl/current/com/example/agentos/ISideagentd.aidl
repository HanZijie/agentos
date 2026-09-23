///////////////////////////////////////////////////////////////////////////////
// THIS FILE IS IMMUTABLE. DO NOT EDIT IN ANY CASE.                          //
///////////////////////////////////////////////////////////////////////////////

// This file is a snapshot of an AIDL file. Do not edit it manually. There are
// two cases:
// 1). this is a frozen version file - do not edit this in any case.
// 2). this is a 'current' file. If you make a backwards compatible change to
//     the interface (from the latest frozen version), the build system will
//     prompt you to update this file with `m <name>-update-api`.
//
// You must not make a backward incompatible change to any AIDL file built
// with the aidl_interface module type with versions property set. The module
// type is used to build AIDL files in a way that they can be used across
// independently updatable components of the system. If a device is shipped
// with such a backward incompatible change, it has a high risk of breaking
// later when a module using the interface is updated, e.g., Mainline modules.
///////////////////////////////////////////////////////////////////////////////

package com.example.agentos;

import com.example.agentos.AgentHealth;
import com.example.agentos.AgentEnqueueResult;
import com.example.agentos.AgentPluginInvokeRequest;
import com.example.agentos.AgentPluginResourceRequest;
import com.example.agentos.AgentPluginSession;
import com.example.agentos.AgentSessionSnapshot;
import com.example.agentos.IAgentEventCallback;
import com.example.agentos.IAgentPluginResultSink;

@VintfStability
interface ISideagentd {
    AgentHealth getHealth();
    void registerPluginSession(in AgentPluginSession session);
    oneway void unregisterPluginSession(String pluginSessionId, String reason);
    oneway void beginInvoke(in AgentPluginInvokeRequest request, IAgentPluginResultSink sink);
    oneway void beginReadResource(in AgentPluginResourceRequest request, IAgentPluginResultSink sink);
    oneway void cancelInvoke(String pluginSessionId, String requestId);
    String createSession(int userId, int frontendUid, String frontendId, String metadataJson);
    AgentEnqueueResult submitInput(int userId, int frontendUid, String sessionId, String requestId, String contentJson);
    void subscribeOutput(int userId, int frontendUid, String sessionId, long afterSequence, IAgentEventCallback callback);
    void unsubscribeOutput(int userId, int frontendUid, String sessionId, IAgentEventCallback callback);
    void cancelTask(int userId, int frontendUid, String sessionId, String requestId);
    AgentSessionSnapshot getSnapshot(int userId, int frontendUid, String sessionId);
}
