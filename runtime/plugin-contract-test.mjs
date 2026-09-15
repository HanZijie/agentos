import assert from "node:assert/strict";
import { plugin as nodePlugin } from "./plugins/notes-node/index.mjs";

const descriptor = nodePlugin.describe();
assert.equal(descriptor.protocolVersion, 1);
assert.equal(descriptor.id, "notes-node");
assert.deepEqual(descriptor.tools.map((tool) => tool.name), ["notes.search", "notes.update"]);
const updated = await nodePlugin.invoke("notes.update", { title: "One", body: "Body" });
assert.equal(updated.ok, true);
assert.equal((await nodePlugin.invoke("notes.search", { query: "body" })).notes.length, 1);
console.log("Node plugin contract OK");
