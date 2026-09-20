import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Parse dotenv as data. Never source a credentials file into a shell or Gradle.
export function parseAnthropicConfig(source) {
  const env = parseEnv(source);
  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim();
  if (!apiKey) return null;
  if (apiKey.length > 8192 || /[\r\n]/.test(apiKey)) throw new Error('Invalid ANTHROPIC_API_KEY');
  const model = (env.ANTHROPIC_MODEL ?? '').trim();
  if (!model || model.length > 256) throw new Error('ANTHROPIC_MODEL is required when the API key is set');
  const baseUrl = (env.ANTHROPIC_BASE_URL ?? '').trim() || 'https://api.anthropic.com/v1';
  let url;
  try { url = new URL(baseUrl); } catch { throw new Error('Invalid ANTHROPIC_BASE_URL'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash || url.search || baseUrl.length > 4096) throw new Error('Invalid ANTHROPIC_BASE_URL');
  const tokens = (env.ANTHROPIC_MAX_TOKENS ?? '').trim() || '4096';
  if (!/^[1-9][0-9]*$/.test(tokens) || !Number.isSafeInteger(Number(tokens)) || Number(tokens) > 2147483647) throw new Error('ANTHROPIC_MAX_TOKENS must be a positive integer');
  return { provider: 'anthropic', apiKey, model, baseUrl: baseUrl.replace(/\/+$/, ''), maxTokens: Number(tokens) };
}

export function loadAnthropicConfig(file) {
  let source;
  try { source = readFileSync(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Cannot read Anthropic environment file'); }
  try { return parseAnthropicConfig(source); }
  catch { throw new Error('Invalid Anthropic configuration. Check API key, model, base URL and max tokens in the local environment file.'); }
}

export function stageAnthropicConfig(adb, serial, config, execute = spawnSync) {
  if (!config) return '';
  const remote = `/data/local/tmp/agenriod-model-${randomUUID()}.json`;
  const payload = JSON.stringify(config);
  if (Buffer.byteLength(payload) > 16 * 1024) throw new Error('Anthropic configuration is too large');
  const staged = execute(adb, ['-s', serial, 'shell', `umask 077; cat > '${remote}'`], { input: payload, encoding: 'utf8', timeout: 15000 });
  if (staged.status !== 0) {
    execute(adb, ['-s', serial, 'shell', 'rm', '-f', remote], { stdio: 'ignore', timeout: 5000 });
    throw new Error('Could not stage local model configuration on the device');
  }
  return remote;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    if (mode === 'check' && args.length === 1) console.log(loadAnthropicConfig(args[0]) ? 'configured' : 'skipped');
    else if (mode === 'stage' && args.length === 3) console.log(stageAnthropicConfig(args[0], args[1], loadAnthropicConfig(args[2])));
    else throw new Error('Usage: anthropic-env.mjs check FILE | stage ADB SERIAL FILE');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
