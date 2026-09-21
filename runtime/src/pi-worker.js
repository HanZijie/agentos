import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager, getAgentDir } from '@earendil-works/pi-coding-agent';
import { PiAcpAgent, assertRuntimeConfigurationSupported } from './acp-adapter.js';

export async function createWorkerSession({ cwd, checkpoint }) {
  const settingsManager = SettingsManager.inMemory({ defaultProjectTrust: 'never' });
  const resourceLoader = new DefaultResourceLoader({ cwd, agentDir: getAgentDir(), settingsManager,
    noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true });
  await resourceLoader.reload();
  const sessionManager = SessionManager.inMemory(cwd, undefined, checkpoint?.entries);
  const { session } = await createAgentSession({ cwd, settingsManager, resourceLoader, sessionManager });
  return session;
}

/** Executes one assigned AgentOS Session through the existing ACP adapter.
 * Pi's private checkpoint is returned to the host. Pi has no Event Store,
 * input deduplication, subscriptions, or authority to replay unknown Tasks.
 */
export class PiWorker {
  constructor({ sessionFactory = createWorkerSession } = {}) { this.sessionFactory = sessionFactory; }
  async start(assignment) {
    assertRuntimeConfigurationSupported(assignment.runtimeConfig);
    this.adapter = new PiAcpAgent({
      sessionUpdate: ({ update }) => this.sink.event(update),
      requestPermission: request => this.sink.permission(request),
    }, { piSessionFactory: async () => {
      this.session = await this.sessionFactory(assignment); return this.session;
    } });
    this.piSessionId = (await this.adapter.newSession({ cwd: assignment.cwd, mcpServers: [] })).sessionId;
  }
  async prompt({ prompt }, sink) {
    this.sink = sink;
    try {
      const result = await this.adapter.prompt({ sessionId: this.piSessionId, prompt });
      const manager = this.session.sessionManager;
      return { ...result, checkpoint: { entries: [manager.getHeader(), ...manager.getEntries()] } };
    } finally { this.sink = null; }
  }
  cancel() { return this.adapter.cancel({ sessionId: this.piSessionId }); }
  async stop() {
    if (this.piSessionId) await this.adapter.closeSession({ sessionId: this.piSessionId });
  }
}
