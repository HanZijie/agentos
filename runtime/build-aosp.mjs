#!/usr/bin/env node
/** Build a credential-free Pi runtime bundle for an AOSP staging directory. */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const root = resolve(new URL(".", import.meta.url).pathname);
const output = resolve(argument("--out", resolve(root, "../.local/aosp-pi/agentos-pi-runtime.cjs")));
const entry = resolve(root, "src/pi-worker.js");
const packageLock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));

await mkdir(dirname(output), { recursive: true });
await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: output,
  sourcemap: false,
  legalComments: "eof",
  external: ["node:*", "child_process", "fs", "path", "os", "url", "util", "events", "stream", "crypto", "http", "https", "net", "tls", "zlib"],
  define: {
    "import.meta.url": '"file:///system/agentos/agentos-pi-runtime.cjs"',
  },
  logLevel: "warning",
});

const dependencies = Object.keys(packageLock.packages ?? {})
  .filter((item) => item.startsWith("node_modules/"))
  .map((item) => item.slice("node_modules/".length));
await writeFile(`${output}.manifest.json`, `${JSON.stringify({
  schema: 1,
  entry: "runtime/src/pi-worker.js",
  engine: "node",
  target: "node20",
  credentialsIncluded: false,
  dependencies,
}, null, 2)}\n`);
console.log(JSON.stringify({ output, manifest: `${output}.manifest.json`, dependencies: dependencies.length }));
