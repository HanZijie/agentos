import { Agent } from "../node_modules/@earendil-works/pi-agent-core/dist/agent.js";
import { AssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream";
import { Type } from "typebox";

// QuickJS intentionally starts with a small standard library. These bridges
// cover the Web APIs used by pi's portable core without pulling a browser into
// the APK; I/O itself remains implemented by Kotlin.
if (!globalThis.TextEncoder) globalThis.TextEncoder = class {
  encode(value) {
    const binary = unescape(encodeURIComponent(String(value)));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
};
if (!globalThis.TextDecoder) globalThis.TextDecoder = class {
  decode(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(binary));
  }
};
if (!globalThis.structuredClone) globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);
if (!globalThis.setTimeout) globalThis.setTimeout = (fn) => { Promise.resolve().then(fn); return 0; };
if (!globalThis.clearTimeout) globalThis.clearTimeout = () => {};
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.randomUUID) globalThis.crypto.randomUUID = () => `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

/*
 * The Android host owns I/O and networking. The actual stateful loop below is
 * the upstream pi-agent-core Agent, so tools and lifecycle events have the
 * same shape as Pi's other frontends.
 */
const call = (method, payload = {}) =>
  Promise.resolve(__agenriod_call_async(method, JSON.stringify(payload))).then((value) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  });

const textResult = (text, details = undefined) => ({
  content: [{ type: "text", text: String(text) }],
  details,
});

const schemas = {
  read: Type.Object({ path: Type.String(), offset: Type.Optional(Type.Number()), limit: Type.Optional(Type.Number()) }),
  write: Type.Object({ path: Type.String(), content: Type.String() }),
  edit: Type.Object({ path: Type.String(), oldText: Type.String(), newText: Type.String() }),
  grep: Type.Object({ pattern: Type.String(), path: Type.Optional(Type.String()), glob: Type.Optional(Type.String()), ignoreCase: Type.Optional(Type.Boolean()), literal: Type.Optional(Type.Boolean()), context: Type.Optional(Type.Number()), limit: Type.Optional(Type.Number()) }),
  find: Type.Object({ path: Type.Optional(Type.String()), pattern: Type.Optional(Type.String()), limit: Type.Optional(Type.Number()) }),
  ls: Type.Object({ path: Type.Optional(Type.String()) }),
  bash: Type.Object({ command: Type.String(), timeout: Type.Optional(Type.Number()) }),
};

const tool = (name, description, parameters, method = name) => ({
  name,
  label: name,
  description,
  parameters,
  executionMode: name === "bash" ? "sequential" : "parallel",
  async execute(_id, args, signal, onUpdate) {
    if (signal?.aborted) throw new Error("Operation aborted");
    const result = await call(method, args);
    if (result?.error) throw new Error(result.error);
    if (result?.progress && onUpdate) onUpdate(textResult(result.progress));
    if (result?.image) {
      return { content: [{ type: "text", text: result.text ?? "Image attached" }, result.image], details: result.details };
    }
    return textResult(result?.text ?? result ?? "(no output)", result?.details);
  },
});

function pluginTools(plugins) {
  return (plugins ?? []).filter((plugin) => plugin.active !== false).flatMap((plugin) => (plugin.tools ?? []).filter((item) => item.enabled !== false).map((item) => {
    const name = `plugin_${plugin.id}_${item.name}`.replace(/[^a-zA-Z0-9_]/g, "_");
    return {
      name,
      label: item.name,
      description: `${item.description ?? "Plugin tool"} (plugin: ${plugin.name})`,
      parametersForModel: item.parameters,
      // Plugin manifests may carry a JSON schema for documentation. Runtime
      // validation stays permissive so a manifest can evolve independently of
      // the bundled SDK; the host still validates the plugin id and command.
      parameters: Type.Any(),
      executionMode: "sequential",
      async execute(_id, args, signal) {
        if (signal?.aborted) throw new Error("Operation aborted");
        const result = await call("plugin", { pluginId: plugin.id, tool: item.name, args });
        if (result?.error) throw new Error(result.error);
        return textResult(result?.text ?? result ?? "(no output)");
      },
    };
  }));
}

const builtinTools = [
  tool("read", "Read a text or image file. Use offset and limit for large files.", schemas.read),
  tool("write", "Create or overwrite a file, creating parent directories.", schemas.write),
  tool("edit", "Replace an exact text occurrence in a file.", schemas.edit),
  tool("grep", "Search file contents for a regex or literal pattern.", schemas.grep),
  tool("find", "List files under a directory, optionally filtered by a glob pattern.", schemas.find),
  tool("ls", "List entries in a directory.", schemas.ls),
  tool("bash", "Run a bash-compatible shell command in the workspace.", schemas.bash),
];

function responseMessage(model, response) {
  const base = {
    role: "assistant",
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: response.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: response.stopReason ?? (response.toolCalls?.length ? "toolUse" : "stop"),
    timestamp: Date.now(),
  };
  const content = [];
  if (response.thinking) content.push({ type: "thinking", thinking: response.thinking });
  if (response.text) content.push({ type: "text", text: response.text });
  for (const toolCall of response.toolCalls ?? []) {
    content.push({ type: "toolCall", id: toolCall.id ?? `call_${Date.now()}_${content.length}`, name: toolCall.name, arguments: toolCall.arguments ?? {} });
  }
  return { ...base, content };
}

function createStreamFunction() {
  return (model, context, options = {}) => {
    const stream = new AssistantMessageEventStream();
    (async () => {
      try {
        const response = await call("complete", { model, context });
        if (options.signal?.aborted) {
          const aborted = responseMessage(model, { text: "", stopReason: "aborted" });
          aborted.errorMessage = "Request was aborted";
          stream.push({ type: "error", reason: "aborted", error: aborted });
          stream.end(aborted);
          return;
        }
        const message = responseMessage(model, response ?? {});
        const partial = { ...message, content: [], stopReason: "pending" };
        stream.push({ type: "start", partial });
        for (let index = 0; index < message.content.length; index++) {
          const block = message.content[index];
          if (block.type === "thinking") {
            partial.content.push({ type: "thinking", thinking: block.thinking });
            stream.push({ type: "thinking_start", contentIndex: index, partial: { ...partial } });
            stream.push({ type: "thinking_delta", contentIndex: index, delta: block.thinking, partial: { ...partial } });
            stream.push({ type: "thinking_end", contentIndex: index, content: block.thinking, partial: { ...partial } });
          } else if (block.type === "text") {
            partial.content.push({ type: "text", text: block.text });
            stream.push({ type: "text_start", contentIndex: index, partial: { ...partial } });
            stream.push({ type: "text_delta", contentIndex: index, delta: block.text, partial: { ...partial } });
            stream.push({ type: "text_end", contentIndex: index, content: block.text, partial: { ...partial } });
          } else {
            partial.content.push({ type: "toolCall", id: block.id, name: block.name, arguments: block.arguments });
            stream.push({ type: "toolcall_start", contentIndex: index, partial: { ...partial } });
            stream.push({ type: "toolcall_delta", contentIndex: index, delta: JSON.stringify(block.arguments), partial: { ...partial } });
            stream.push({ type: "toolcall_end", contentIndex: index, toolCall: block, partial: { ...partial } });
          }
        }
        stream.push({ type: "done", reason: message.stopReason, message });
        stream.end(message);
      } catch (error) {
        const message = responseMessage(model, { text: "", stopReason: "error" });
        message.errorMessage = error?.message ?? String(error);
        stream.push({ type: "error", reason: "error", error: message });
        stream.end(message);
      }
    })();
    return stream;
  };
}

let agent;
let currentConfig;

async function configure(config) {
  currentConfig = config;
  const plugins = await call("plugins");
  const model = config.model;
  agent = new Agent({
    streamFn: createStreamFunction(),
    initialState: { model, systemPrompt: config.systemPrompt ?? "", messages: config.initialMessages ?? [], tools: [...builtinTools, ...pluginTools(plugins)] },
    toolExecution: "sequential",
    prepareNextTurnWithContext: async ({ context }) => ({
      context: { ...context, tools: [...builtinTools, ...pluginTools(await call("plugins"))] },
    }),
    beforeToolCall: async ({ toolCall, args }) => {
      const result = await call("hook", { event: "before_tool", tool: toolCall.name, args });
      return result?.block ? { block: true, reason: result.reason ?? "Blocked by hook" } : undefined;
    },
    afterToolCall: async ({ toolCall, result }) => {
      await call("hook", { event: "after_tool", tool: toolCall.name, result });
      return undefined;
    },
  });
  agent.subscribe((event) => {
    __agenriod_call("event", JSON.stringify({ ...event, sessionId: config.sessionId, runId: config.runId }));
  });
  return { model, tools: agent.state.tools.map((item) => item.name) };
}

globalThis.__agenriod_start = async (configJson) => configure(typeof configJson === "string" ? JSON.parse(configJson) : configJson);
globalThis.__agenriod_prompt = async (promptJson) => {
  if (!agent) throw new Error("Agent is not configured");
  const input = typeof promptJson === "string" ? JSON.parse(promptJson) : promptJson;
  agent.state.tools = [...builtinTools, ...pluginTools(await call("plugins"))];
  await agent.prompt(input.text, input.images ?? []);
  return { messages: agent.state.messages };
};
globalThis.__agenriod_abort = () => agent?.abort();
globalThis.__agenriod_reset = () => agent?.reset();
globalThis.__agenriod_history = () => agent?.state.messages ?? [];
