import assert from 'node:assert/strict';
import { definePlugin } from './plugin-interface.mjs';
const declared = definePlugin({ id: 'test', name: 'Test', mcpServers: [{ id: 'remote', transport: 'streamable-http', url: 'https://example.test/mcp' }], invoke: async () => ({}) });
assert.equal(declared.describe().protocolVersion, 2);
assert.equal(declared.describe().mcpServers.length, 1);
let active = true;
let round = 0;
let called = false;
const events = [];
const definitions = [{ name: 'mcp.server.tool-with-dash', parameters: { type: 'object', properties: {} } }, { name: 'mcp.server.tool_with_dash', parameters: { type: 'object', properties: {} } }];
globalThis.__agenriod_call = (method, raw) => { if (method === 'event') events.push(JSON.parse(raw)); return '{}'; };
globalThis.__agenriod_call_async = async (method, raw) => {
  const payload = JSON.parse(raw);
  if (method === 'plugins') return JSON.stringify(active ? [{ id: 'notes', name: 'Notes', active: true, tools: definitions }] : []);
  if (method === 'hook') return '{}';
  if (method === 'plugin') {
    assert.equal(payload.tool, definitions[0].name);
    called = true; active = false;
    return JSON.stringify({ isError: true, content: [{ type: 'text', text: 'MCP expected tool error' }] });
  }
  if (method === 'complete') {
    const tools = payload.context.tools.filter((t) => t.name.startsWith('plugin_'));
    if (++round === 1) {
      assert.equal(tools.length, 2);
      assert.notEqual(tools[0].name, tools[1].name);
      assert.ok(tools.every((t) => t.name.length <= 64));
      return JSON.stringify({ toolCalls: [{ id: 'call-one', name: tools[0].name, arguments: {} }] });
    }
    assert.equal(tools.length, 0, 'Withdraw inactive plugins before the next model turn');
    return JSON.stringify({ text: 'Lifecycle handled' });
  }
  throw new Error(`Unexpected method: ${method}`);
};
await import('./src/agent-runtime.js');
await globalThis.__agenriod_start({ model: { id: 'test', api: 'openai-completions', provider: 'test' } });
await globalThis.__agenriod_prompt({ text: 'Test the plugin' });
assert.equal(called, true);
assert.equal(round, 2);
assert.ok(events.some((e) => e.type === 'tool_execution_end' && e.isError));
console.log('Runtime plugin lifecycle, names and MCP errors OK');
