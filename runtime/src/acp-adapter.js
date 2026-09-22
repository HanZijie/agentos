import * as acp from '@agentclientprotocol/sdk';
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';

/**
 * Internal seam for future runtime configuration. These values are deliberately
 * opaque until AgentOS freezes a public MCP/Plugin/Hooks contract.
 */
export class UnsupportedRuntimeConfigurationError extends Error {
  constructor(kind) {
    super(`${kind} configuration is not implemented by the Pi ACP adapter`);
    this.name = 'UnsupportedRuntimeConfigurationError';
  }
}

export function assertRuntimeConfigurationSupported(config) {
  if (!config) return;
  if (config.mcp !== undefined) throw new UnsupportedRuntimeConfigurationError('MCP');
  if (config.plugins !== undefined) throw new UnsupportedRuntimeConfigurationError('Plugin');
  if (config.hooks !== undefined) throw new UnsupportedRuntimeConfigurationError('Hooks');
}

export const createDefaultPiSession = async ({ cwd }) => {
  const { session } = await createAgentSession({
    cwd,
    sessionManager: SessionManager.create(cwd),
  });
  return session;
};

const toolKind = (name) => {
  if (name === 'read' || name === 'ls') return 'read';
  if (name === 'edit' || name === 'write') return 'edit';
  if (name === 'grep' || name === 'find') return 'search';
  if (name === 'bash' || name === 'powershell') return 'execute';
  return 'other';
};

const toolTitle = (name, args) => {
  if (name === 'bash' || name === 'powershell') return `Run ${String(args?.command ?? 'command')}`;
  if (typeof args?.path === 'string') return `${name} ${args.path}`;
  return name;
};

function contentToPrompt(blocks) {
  const parts = [];
  const images = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        parts.push(block.text);
        break;
      case 'image':
        images.push({ type: 'image', data: block.data, mimeType: block.mimeType });
        break;
      case 'resource_link':
        parts.push(`[resource: ${block.uri}]${block.name ? ` ${block.name}` : ''}`);
        break;
      case 'resource':
        if ('text' in block.resource) parts.push(block.resource.text);
        else throw new Error('Binary embedded resources are not supported');
        break;
      case 'audio':
        throw new Error('Pi ACP adapter does not support audio prompts yet');
      default:
        throw new Error(`Unsupported ACP content block: ${block.type}`);
    }
  }
  return { message: parts.join('\n'), images };
}

const stopReason = (record) => {
  if (record.cancelRequested) return 'cancelled';
  const last = record.session.messages?.findLast(m => m.role === 'assistant');
  if (last?.stopReason === 'error') throw new Error('pi_runtime_failed');
  if (last?.stopReason === 'aborted') return 'cancelled';
  if (last?.stopReason === 'length') return 'max_tokens';
  return 'end_turn';
};

/** ACP v1 facade over Pi's AgentSession. */
export class PiAcpAgent {
  constructor(connection, { version = '0.1.0', piSessionFactory = createDefaultPiSession, runtimeConfig } = {}) {
    this.connection = connection;
    this.version = version;
    this.piSessionFactory = piSessionFactory;
    this.runtimeConfig = runtimeConfig;
    this.sessions = new Map();
  }

  async initialize(params) {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentInfo: { name: 'agentos-pi', version: this.version },
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: { image: true, audio: false, embeddedContext: true },
        mcpCapabilities: { http: false, sse: false },
        sessionCapabilities: { close: {} },
      },
      authMethods: [],
    };
  }

  async newSession(params) {
    if (!params.cwd.startsWith('/')) throw new Error('cwd must be an absolute path');
    if (params.mcpServers.length > 0) throw new Error('MCP configuration is not implemented by the Pi ACP adapter');
    assertRuntimeConfigurationSupported(this.runtimeConfig);

    const session = await this.piSessionFactory({ cwd: params.cwd, runtimeConfig: this.runtimeConfig });
    const record = {
      id: session.sessionId,
      session,
      connection: this.connection,
      cancelRequested: false,
      promptActive: false,
      toolUnsubscribe: undefined,
      output: Promise.resolve(),
      outputError: null,
      permissionAbort: new AbortController(),
    };
    this.installPermissionBridge(record);
    record.toolUnsubscribe = session.subscribe((event) => {
      record.output = record.output.then(() => this.translateEvent(record, event)).catch(error => {
        record.outputError = error;
      });
    });
    this.sessions.set(record.id, record);
    return { sessionId: record.id };
  }

  async prompt(params) {
    const record = this.requireSession(params.sessionId);
    if (record.promptActive) throw new Error('session/prompt is already running');
    const prompt = contentToPrompt(params.prompt);
    record.cancelRequested = false;
    record.permissionAbort = new AbortController();
    record.promptActive = true;
    try {
      await record.session.prompt(prompt.message, {
        images: prompt.images.length ? prompt.images : undefined,
        source: 'rpc',
        expandPromptTemplates: true,
      });
      await record.session.waitForIdle?.();
      await record.output;
      if (record.outputError) throw record.outputError;
      return { stopReason: stopReason(record) };
    } catch (error) {
      await record.output;
      if (record.outputError) throw record.outputError;
      if (record.cancelRequested) return { stopReason: 'cancelled' };
      throw error;
    } finally {
      record.promptActive = false;
    }
  }

  async cancel(params) {
    const record = this.sessions.get(params.sessionId);
    if (!record) return;
    record.cancelRequested = true;
    record.permissionAbort.abort();
    await record.session.abort();
  }

  async closeSession(params) {
    const record = this.sessions.get(params.sessionId);
    if (!record) return {};
    record.cancelRequested = true;
    record.permissionAbort.abort();
    if (record.promptActive) await record.session.abort();
    record.toolUnsubscribe?.();
    record.session.dispose();
    this.sessions.delete(params.sessionId);
    return {};
  }

  async authenticate() {
    return {};
  }

  dispose() {
    for (const record of this.sessions.values()) {
      record.toolUnsubscribe?.();
      record.session.dispose();
    }
    this.sessions.clear();
  }

  requireSession(id) {
    const record = this.sessions.get(id);
    if (!record) throw new Error(`Session not found: ${id}`);
    return record;
  }

  installPermissionBridge(record) {
    const original = record.session.agent.beforeToolCall;
    record.session.agent.beforeToolCall = async (context, signal) => {
      const existing = await original?.(context, signal);
      if (existing?.block) return existing;
      const toolCallId = context.toolCall.id;
      await record.output;
      if (record.outputError) throw record.outputError;
      const permissionSignal = record.permissionAbort.signal;
      if (permissionSignal.aborted) return { block: true, reason: 'Cancelled' };
      let onAbort;
      const cancelled = new Promise(resolve => {
        onAbort = () => resolve({ outcome: { outcome: 'cancelled' } });
        permissionSignal.addEventListener('abort', onAbort, { once: true });
      });
      let response;
      try { response = await Promise.race([cancelled, record.connection.requestPermission({
        sessionId: record.id,
        toolCall: {
          toolCallId,
          title: toolTitle(context.toolCall.name, context.args),
          kind: toolKind(context.toolCall.name),
          status: 'pending',
          name: context.toolCall.name,
          rawInput: context.args,
        },
        options: [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
        ],
      })]); } finally { permissionSignal.removeEventListener('abort', onAbort); }
      if (permissionSignal.aborted || response.outcome.outcome !== 'selected' || response.outcome.optionId !== 'allow_once') {
        return { block: true, terminate: true, reason: 'Tool execution was not approved' };
      }
      return undefined;
    };
  }

  async translateEvent(record, event) {
    if (event.type === 'message_update') {
      const update = event.assistantMessageEvent;
      if (update.type === 'text_delta') {
        await record.connection.sessionUpdate({ sessionId: record.id, update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: update.delta } } });
      } else if (update.type === 'thinking_delta') {
        await record.connection.sessionUpdate({ sessionId: record.id, update: { sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: update.delta } } });
      }
      return;
    }
    if (event.type === 'tool_execution_start') {
      await record.connection.sessionUpdate({
        sessionId: record.id,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: event.toolCallId,
          title: toolTitle(event.toolName, event.args),
          name: event.toolName,
          kind: toolKind(event.toolName),
          status: 'in_progress',
          rawInput: event.args,
        },
      });
      return;
    }
    if (event.type === 'tool_execution_update') {
      await record.connection.sessionUpdate({ sessionId: record.id, update: { sessionUpdate: 'tool_call_update', toolCallId: event.toolCallId, rawOutput: event.partialResult } });
      return;
    }
    if (event.type === 'tool_execution_end') {
      await record.connection.sessionUpdate({
        sessionId: record.id,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: event.toolCallId,
          status: event.isError ? 'failed' : 'completed',
          rawOutput: event.result,
          content: (event.result?.content ?? []).filter(c => ['text', 'image'].includes(c.type)).map(content => ({ type: 'content', content })),
        },
      });
    }
  }
}

export function startPiAcpStdio(options = {}) {
  const input = new ReadableStream({
    start(controller) {
      process.stdin.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
      process.stdin.on('end', () => controller.close());
      process.stdin.on('error', (error) => controller.error(error));
    },
    cancel() {
      process.stdin.pause();
    },
  });
  const output = new WritableStream({ write(chunk) { process.stdout.write(Buffer.from(chunk)); } });
  const stream = acp.ndJsonStream(output, input);
  const connection = new acp.AgentSideConnection((agentConnection) => new PiAcpAgent(agentConnection, options), stream);
  process.stdin.resume();
  return connection;
}

// Keep the entry-point check compatible with both the repository's ESM tests
// and the CommonJS bundle produced for an AOSP runtime image.  Import-meta
// URL rewriting in a CommonJS bundle can otherwise evaluate to an undefined
// file URL before the worker is even loaded.
if (process.argv[1] && /(?:^|[\\/])acp-adapter\\.(?:m?js|cjs)$/.test(process.argv[1])) {
  startPiAcpStdio();
}
