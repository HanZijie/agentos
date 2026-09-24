package com.example.agentos;

import com.example.agentos.AgentPluginInvokeResult;

/** Callback for exactly one terminal tool/resource result. */
@VintfStability
interface IAgentPluginResultSink {
    void onResult(in AgentPluginInvokeResult result);
}
