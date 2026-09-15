/**
 * Cross-runtime plugin contract. Android adapters expose the same two values:
 * a JSON descriptor and an invoke(tool,args) operation.
 */
export function definePlugin({ protocolVersion = 1, id, name, description = "", tools, invoke }) {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("Invalid plugin id");
  if (typeof invoke !== "function") throw new Error("Plugin invoke is required");
  return { describe: () => ({ protocolVersion, id, name, description, tools }), invoke };
}
