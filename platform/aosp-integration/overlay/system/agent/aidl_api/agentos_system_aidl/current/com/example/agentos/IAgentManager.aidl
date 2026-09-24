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

package com.example.agentos;
@VintfStability
interface IAgentManager {
  com.example.agentos.AgentHealth getHealth();
  String[] getDiscoveredPluginIds(int userId);
  void setPluginEnabled(int userId, String pluginId, boolean enabled);
  String createSession(String frontendId, String metadataJson);
  com.example.agentos.AgentEnqueueResult submitInput(String sessionId, String requestId, String contentJson);
  com.example.agentos.AgentEnqueueResult submitAutoInput(String frontendId, String metadataJson, String requestId, String contentJson);
  void subscribeOutput(String sessionId, long afterSequence, com.example.agentos.IAgentEventCallback callback);
  void unsubscribeOutput(String sessionId, com.example.agentos.IAgentEventCallback callback);
  void cancelTask(String sessionId, String requestId);
  void resolveRecovery(String sessionId, String requestId);
  com.example.agentos.AgentSessionSnapshot getSnapshot(String sessionId);
  String getRuntimePluginCatalog(int userId);
  com.example.agentos.AgentPluginSession acquireRuntimePlugin(int userId, String pluginId, String leaseId);
  oneway void releaseRuntimePlugin(String pluginSessionId, String leaseId);
}
