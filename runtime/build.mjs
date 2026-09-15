import * as esbuild from "esbuild";

const polyfill = `
if (!globalThis.TextEncoder) globalThis.TextEncoder = class { encode(value) { const binary = unescape(encodeURIComponent(String(value))); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; } };
if (!globalThis.TextDecoder) globalThis.TextDecoder = class { decode(bytes) { let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]); return decodeURIComponent(escape(binary)); } };
if (!globalThis.structuredClone) globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);
if (!globalThis.setTimeout) globalThis.setTimeout = (fn) => { Promise.resolve().then(fn); return 0; };
if (!globalThis.clearTimeout) globalThis.clearTimeout = () => {};
if (!globalThis.AbortSignal) { globalThis.AbortSignal = class { constructor() { this.aborted = false; this._listeners = []; } addEventListener(type, fn) { if (type === "abort") this._listeners.push(fn); } removeEventListener(type, fn) { this._listeners = this._listeners.filter((item) => item !== fn); } throwIfAborted() { if (this.aborted) throw new Error("This operation was aborted"); } static any(signals) { const controller = new AbortController(); for (const signal of signals) if (signal?.aborted) controller.abort(); return controller.signal; } static timeout() { return new AbortController().signal; } }; }
if (!globalThis.AbortController) { globalThis.AbortController = class { constructor() { this.signal = new AbortSignal(); } abort() { if (this.signal.aborted) return; this.signal.aborted = true; for (const fn of this.signal._listeners) fn(); } }; }
if (!globalThis.URL) globalThis.URL = class { constructor(input, base) { const value = String(input); this.href = base && !value.includes("://") ? String(base).replace(/\\/$/, "") + "/" + value.replace(/^\\//, "") : value; const match = this.href.match(/^([a-z]+:)?(?:\\/\\/([^/]+))?(.*)$/i) || []; this.protocol = match[1] || ""; this.hostname = (match[2] || "").split(":")[0]; this.pathname = match[3] || "/"; this.origin = this.protocol && match[2] ? this.protocol + "//" + match[2] : "null"; this.search = ""; this.hash = ""; } toString() { return this.href; } };
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.randomUUID) globalThis.crypto.randomUUID = () => \`${"${Date.now().toString(16)}"}-${"${Math.random().toString(16).slice(2)}"}\`;
`;

await esbuild.build({
  entryPoints: ["runtime/src/agent-runtime.js"],
  bundle: true,
  format: "iife",
  platform: "neutral",
  target: "es2020",
  outfile: "app/src/main/assets/agenriod-agent.js",
  banner: { js: polyfill },
  logLevel: "warning",
});
