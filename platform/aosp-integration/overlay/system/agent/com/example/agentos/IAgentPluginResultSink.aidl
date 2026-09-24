package com.example.agentos;

import com.example.agentos.AgentPluginInvokeResult;

/** Callback for exactly one terminal tool/resource result. */
@VintfStability
interface IAgentPluginResultSink {
    oneway void onResult(in AgentPluginInvokeResult result);
    void onResultSync(in AgentPluginInvokeResult result);
}
