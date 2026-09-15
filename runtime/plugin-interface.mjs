/**
 * Cross-runtime plugin contract. Android adapters expose the same two values:
 * a JSON descriptor and an invoke(tool,args) operation.
 */
export function definePlugin({ protocolVersion = 1, id, name, description = "", tools = [], mcpServers = [], invoke }) {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("Invalid plugin id");
  if (typeof invoke !== "function") throw new Error("Plugin invoke is required");
  if (!Array.isArray(mcpServers)) throw new Error("mcpServers must be an array");
  for (const server of mcpServers) {
    if (!server.id || server.transport !== "streamable-http" || !server.url) throw new Error("Invalid Streamable HTTP MCP declaration");
  }
  return { describe: () => ({ protocolVersion: mcpServers.length ? 2 : protocolVersion, id, name, description, tools, mcpServers }), invoke };
}
