import assert from 'node:assert/strict';
import { parseAnthropicConfig, stageAnthropicConfig } from './anthropic-env.mjs';

assert.equal(parseAnthropicConfig('ANTHROPIC_API_KEY=\nANTHROPIC_MODEL=claude-test'), null);
const config = parseAnthropicConfig(`ANTHROPIC_API_KEY="sk-local-test"
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1/
ANTHROPIC_MODEL=claude-3-7-sonnet
ANTHROPIC_MAX_TOKENS=8192
`);
assert.deepEqual(config, { provider: 'anthropic', apiKey: 'sk-local-test', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-7-sonnet', maxTokens: 8192 });
assert.throws(() => parseAnthropicConfig('ANTHROPIC_API_KEY=sk\nANTHROPIC_MODEL='));
assert.throws(() => parseAnthropicConfig('ANTHROPIC_API_KEY=sk\nANTHROPIC_MODEL=claude\nANTHROPIC_MAX_TOKENS=0'));
let call;
const remote = stageAnthropicConfig('/adb', 'emulator-test', config, (...args) => { call = args; return { status: 0 }; });
assert.match(remote, /^\/data\/local\/tmp\/agenriod-model-[a-f0-9-]{36}\.json$/);
assert.deepEqual(call[1].slice(0, 4), ['-s', 'emulator-test', 'shell', `umask 077; cat > '${remote}'`]);
assert.equal(JSON.parse(call[2].input).apiKey, 'sk-local-test');
assert.equal(stageAnthropicConfig('/adb', 'emulator-test', null, () => { throw new Error('must not execute adb'); }), '');
console.log('Anthropic environment parsing and safe staging OK');
