import assert from 'node:assert/strict';
import test from 'node:test';
import { PiAcpAgent, UnsupportedRuntimeConfigurationError } from './src/acp-adapter.js';

class FakeSession {
  sessionId = 'pi-session-1';
  listeners = new Set();
  promptText = '';
  promptImages;
  aborted = false;
  disposed = false;
  agent = { state: { errorMessage: undefined }, beforeToolCall: undefined };
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event) { for (const listener of this.listeners) listener(event); }
  async prompt(message, options) {
    this.promptText = message;
    this.promptImages = options.images;
    this.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
    const decision = await this.agent.beforeToolCall?.({ toolCall: { id: 'tool-1', name: 'bash' }, args: { command: 'echo hi' } });
    this.emit({ type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'bash', args: { command: 'echo hi' } });
    this.emit({ type: 'tool_execution_end', toolCallId: 'tool-1', toolName: 'bash', isError: Boolean(decision?.block), result: decision?.reason ?? 'ok' });
  }
  async abort() { this.aborted = true; this.agent.state.errorMessage = 'aborted'; }
  dispose() { this.disposed = true; }
}

function harness({ permission = 'allow', runtimeConfig } = {}) {
  const sessions = [];
  const updates = [];
  const permissions = [];
  const connection = {
    sessionUpdate: async (value) => updates.push(value),
    requestPermission: async (value) => {
      permissions.push(value);
      return { outcome: { outcome: 'selected', optionId: permission === 'allow' ? 'allow_once' : 'reject_once' } };
    },
  };
  const agent = new PiAcpAgent(connection, {
    runtimeConfig,
    piSessionFactory: async () => { const session = new FakeSession(); sessions.push(session); return session; },
  });
  return { agent, sessions, updates, permissions };
}

test('negotiates ACP v1 and only advertises implemented capabilities', async () => {
  const { agent } = harness();
  const response = await agent.initialize({ protocolVersion: 1 });
  assert.equal(response.protocolVersion, 1);
  assert.equal(response.agentCapabilities.loadSession, false);
  assert.equal(response.agentCapabilities.promptCapabilities.image, true);
  assert.equal(response.agentCapabilities.promptCapabilities.audio, false);
});

test('rejects MCP and placeholder runtime config explicitly', async () => {
  const { agent } = harness();
  await assert.rejects(agent.newSession({ cwd: '/tmp', mcpServers: [{ name: 'local', command: 'mcp', args: [], env: [] }] }), /MCP configuration is not implemented/);
  const configured = harness({ runtimeConfig: { plugins: [] } }).agent;
  await assert.rejects(configured.newSession({ cwd: '/tmp', mcpServers: [] }), UnsupportedRuntimeConfigurationError);
});

test('translates prompts and tool permission into ACP updates', async () => {
  const { agent, sessions, updates, permissions } = harness();
  const created = await agent.newSession({ cwd: '/tmp', mcpServers: [] });
  const result = await agent.prompt({ sessionId: created.sessionId, prompt: [
    { type: 'text', text: 'inspect this' },
    { type: 'image', data: 'aW1hZ2U=', mimeType: 'image/png' },
    { type: 'resource_link', name: 'notes', uri: 'file:///tmp/notes.txt' },
  ] });
  assert.deepEqual(result, { stopReason: 'end_turn' });
  assert.equal(sessions[0].promptText, 'inspect this\n[resource: file:///tmp/notes.txt] notes');
  assert.deepEqual(sessions[0].promptImages, [{ type: 'image', data: 'aW1hZ2U=', mimeType: 'image/png' }]);
  assert.equal(permissions.length, 1);
  assert.deepEqual(updates.map((item) => item.update.sessionUpdate), ['agent_message_chunk', 'tool_call', 'tool_call_update']);
});

test('cancels and closes a session', async () => {
  const { agent, sessions } = harness();
  const created = await agent.newSession({ cwd: '/tmp', mcpServers: [] });
  await agent.cancel({ sessionId: created.sessionId });
  assert.equal(sessions[0].aborted, true);
  await agent.closeSession({ sessionId: created.sessionId });
  assert.equal(sessions[0].disposed, true);
  await assert.rejects(agent.prompt({ sessionId: created.sessionId, prompt: [{ type: 'text', text: 'again' }] }), /Session not found/);
});

console.log('ACP adapter unit tests OK');
