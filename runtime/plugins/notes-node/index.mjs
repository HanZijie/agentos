import { definePlugin } from "../../plugin-interface.mjs";

const notes = new Map();
export const plugin = definePlugin({
  protocolVersion: 1,
  id: "notes-node",
  name: "Notes (Node)",
  description: "Reference Node implementation of the Agent Plugin Interface",
  tools: [
    { name: "notes.search", description: "Search notes", parameters: { type: "object", properties: { query: { type: "string" } } } },
    { name: "notes.update", description: "Create or update a note", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } },
  ],
  async invoke(tool, args) {
    if (tool === "notes.search") return { notes: [...notes.values()].filter((n) => !args.query || JSON.stringify(n).toLowerCase().includes(String(args.query).toLowerCase())) };
    if (tool === "notes.update") { const id = args.id || `node-${notes.size + 1}`; const note = { id, title: args.title || "", body: args.body || "" }; notes.set(id, note); return { ok: true, notes: [note] }; }
    throw new Error(`Unknown notes tool: ${tool}`);
  },
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const request = JSON.parse(process.env.PLUGIN_REQUEST_JSON || "{}");
  if (request.op === "describe") console.log(JSON.stringify(plugin.describe()));
  else console.log(JSON.stringify(await plugin.invoke(request.tool, request.args || {})));
}
