import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgentSession, DefaultResourceLoader, SessionManager, SettingsManager, ModelRuntime } from '@earendil-works/pi-coding-agent';
import { AssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import { PiWorker } from './src/pi-worker.js';
import { SessionStore } from '../system/agent/daemon/store.mjs';
import { SessionScheduler } from '../system/agent/daemon/scheduler.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

async function until(fn) { for(let i=0;i<200;i++){if(fn())return;await sleep(10);}throw new Error('timeout'); }

test('real Pi AgentSession + ACP adapter + Scheduler: events, checkpoint and restored context without model network', async()=>{
  const dir=mkdtempSync(join(tmpdir(),'pi-worker-test-'));
  let seen=[];
  const factory=async ({cwd,checkpoint})=>{
    const settingsManager=SettingsManager.inMemory({compaction:{enabled:false},retry:{enabled:false}});
    const loader=new DefaultResourceLoader({cwd,agentDir:dir,settingsManager,noExtensions:true,noSkills:true,noPromptTemplates:true,noThemes:true,noContextFiles:true});
    await loader.reload();
    const model={id:'test-model',name:'Test',api:'anthropic-messages',provider:'anthropic',baseUrl:'http://127.0.0.1:1',reasoning:false,input:['text'],
      cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:10000,maxTokens:100};
    const modelRuntime = await ModelRuntime.create({ authPath: join(dir, 'auth-runtime.json'), modelsPath: null, refreshOnCreate: false });
    await modelRuntime.setRuntimeApiKey('anthropic', 'local-test-only');
    const {session}=await createAgentSession({cwd,agentDir:dir,model,modelRuntime,tools:[],settingsManager,resourceLoader:loader,
      sessionManager:SessionManager.inMemory(cwd,undefined,checkpoint?.entries)});
    session.agent.streamFunction=(_model,context)=>{
      seen.push(context.messages.filter(m=>m.role==='user').length);
      const stream=new AssistantMessageEventStream();
      const message={role:'assistant',content:[{type:'text',text:'local reply'}],api:model.api,provider:'anthropic',model:model.id,
        usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()};
      stream.push({type:'start',partial:{...message,content:[],stopReason:'pending'}});
      stream.push({type:'text_start',contentIndex:0,partial:{...message,content:[],stopReason:'pending'}});
      stream.push({type:'text_delta',contentIndex:0,delta:'local reply',partial:message});
      stream.push({type:'text_end',contentIndex:0,content:'local reply',partial:message});
      stream.push({type:'done',reason:'stop',message});stream.end(message);return stream;
    };
    return session;
  };
  let store=new SessionStore(join(dir,'scheduler.db'));
  let scheduler=new SessionScheduler(store,()=>new PiWorker({sessionFactory:factory}));
  try {
    const id=scheduler.createSession({userId:'u',cwd:dir,worker:'pi'}).sessionId;
    scheduler.submitInput({sessionId:id,clientRequestId:'one',prompt:[{type:'text',text:'one'}]});
    await until(()=>store.get(id).tasks[0].state==='completed');
    assert.ok(store.get(id).checkpoint.entries.some(e=>e.message?.role==='assistant'));
    assert.ok(store.events(id).some(e=>e.eventType==='worker.update'));
    await scheduler.shutdown();store.close();
    store=new SessionStore(join(dir,'scheduler.db'));scheduler=new SessionScheduler(store,()=>new PiWorker({sessionFactory:factory}));
    scheduler.submitInput({sessionId:id,clientRequestId:'two',prompt:[{type:'text',text:'two'}]});
    await until(()=>store.get(id).tasks[1].state==='completed');
    assert.deepEqual(seen,[1,2]);
  } finally { await scheduler.shutdown();store.close();rmSync(dir,{recursive:true,force:true}); }
});
