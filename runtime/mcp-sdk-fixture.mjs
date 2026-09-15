import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const transports = new Map();
function server() {
  const value = new McpServer({ name: 'agenriod-sdk-fixture', version: '1.0.0' });
  value.registerTool('greet', { description: 'Greet a person', inputSchema: { name: z.string() } }, async ({ name }) => ({ content: [{ type: 'text', text: `Hello ${name}` }] }));
  return value;
}
async function body(req) { const chunks=[]; for await (const chunk of req) chunks.push(chunk); return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined; }
const app = http.createServer(async (req, res) => {
  if (req.url !== '/mcp') { res.writeHead(404); res.end(); return; }
  try {
    const value = req.method === 'POST' ? await body(req) : undefined;
    const sid = req.headers['mcp-session-id'];
    let transport = sid ? transports.get(sid) : undefined;
    if (!transport && req.method === 'POST' && isInitializeRequest(value)) {
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), enableJsonResponse: true, onsessioninitialized: id => transports.set(id, transport) });
      transport.onclose = () => { if (transport.sessionId) transports.delete(transport.sessionId); };
      await server().connect(transport);
    }
    if (!transport) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc:'2.0', id:null, error:{ code:-32000, message:'missing session' } })); return; }
    await transport.handleRequest(req, res, value);
  } catch (error) { if (!res.headersSent) { res.writeHead(500); res.end(String(error)); } }
});
app.listen(0, '127.0.0.1', () => console.log(`PORT=${app.address().port}`));
process.on('SIGTERM', () => app.close(() => process.exit(0)));
