'use strict';
const fs=require('node:fs');
const coordinator=require('./agent-coordinator'),workers=require('./worker-access'),models=require('./model-adapter');
const artifacts=require('./product-artifacts'),ledger=require('./execution-ledger'),uploader=require('./payhip-uploader');
const SOURCES=['https://www.osha.gov/control-hazardous-energy','https://www.energy.gov/femp/operations-and-maintenance'];
const TOPICS=['maintenance shift communication','maintenance backlog readiness','maintenance evidence quality','spare-parts ownership','repeat failure investigation records','PM program review','maintenance metric definitions'];
function readiness(env,controls){
 const blockers=[];
 try{ledger.requireControls(controls);}catch{blockers.push('Verified billing enforcement, reconciled restricted funds and 30-day compute reserve required; Global Pause must be off');}
 if(!env.OPENAI_API_KEY)blockers.push('OpenAI runtime credential missing');
 if(!env.TINYFISH_API_KEY)blockers.push('TinyFish runtime credential missing');
 if(!/^prof_[a-f0-9]+$/.test(env.PAYHIP_PROFILE_ID||''))blockers.push('Verified seller profile not configured');
 if(!fs.existsSync(env.SOFFICE_PATH||'/usr/bin/libreoffice')||!fs.existsSync(env.PDFTOTEXT_PATH||'/usr/bin/pdftotext'))blockers.push('Office/PDF renderer not installed in current service runtime');
 blockers.push('Payhip seller form and customer-file download verification not yet validated end to end');
 return {executorImplemented:true,modelAdapterImplemented:true,artifactPackagingImplemented:true,spendReservationsImplemented:true,payhipBrowserAdapterImplemented:true,payhipUploadVerified:false,automaticPublishingEnabled:false,automaticExecutionEnabled:false,publicationRequiresOwnerApproval:true,model:models.MODEL,store:uploader.STORE,blockers};
}
async function init(pool){
 await ledger.init(pool);
 await pool.query(`CREATE TABLE IF NOT EXISTS barbarossa_runtime_jobs (
   run_id uuid PRIMARY KEY, day text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'queued',
   data jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now())`);
}
async function enqueue(pool,day=new Date().toISOString().slice(0,10)){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day)))throw Error('Invalid product date');
 const topic=TOPICS[Math.floor(Date.parse(day)/86400000)%TOPICS.length];
 const run=await coordinator.create(pool,{requestKey:'autonomous-product:'+day,goal:'Create an original saleable maintenance management toolkit about '+topic});
 await pool.query('INSERT INTO barbarossa_runtime_jobs(run_id,day) VALUES($1,$2) ON CONFLICT(day) DO NOTHING',[run.id,day]);
 return {runId:run.id,day};
}
async function save(pool,id,data,status='queued'){
 await pool.query('UPDATE barbarossa_runtime_jobs SET data=$2::jsonb,status=$3,updated_at=now() WHERE run_id=$1',[id,JSON.stringify(data),status]);
}
async function sources(fetchImpl=fetch){
 const pack=[];
 for(const url of SOURCES){
  const r=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Barbarossa/1.0 maintenance resource research'}});
  if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw Error('Authoritative source retrieval unavailable');
  const reader=r.body.getReader();let size=0,chunks=[];
  try{while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>1500000)throw Error('Source exceeds retrieval size limit');chunks.push(Buffer.from(x.value));}}finally{await reader.cancel().catch(()=>{});}
  const html=Buffer.concat(chunks).toString('utf8');
  const text=html.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,7000);
  if(text.length<500)throw Error('Insufficient source content');
  pack.push({url,retrievedAt:new Date().toISOString(),text,sha256:artifacts.sha(Buffer.from(text))});
 }
 return pack;
}
function encode(files){return files.map(({buffer,...f})=>({...f,base64:buffer.toString('base64')}));}
function decode(files){return files.map(({base64,...f})=>({...f,buffer:Buffer.from(base64,'base64')}));}
function manifest(files){return files.map(f=>({name:f.name,sha256:f.sha256,reference:'postgres:sha256:'+f.sha256}));}
async function runStep(pool,job,env,controls,{modelCall=models.call,sourceFetch=sources,renderer=artifacts.renderCheck}={}){
 ledger.requireControls(controls);
 let run=await coordinator.get(pool,job.run_id), data=job.data;
 if(run.status==='needs-owner-intervention')throw Error('Quality revision limit reached');
 if(run.status==='ready-for-automated-release')return save(pool,run.id,data,'awaiting-publisher-verification');
 const step=coordinator.status().roles.find(({step})=>run.tasks[step].status==='ready')?.step;
 if(!step)throw Error('No ready specialist task');
 if(run.tasks[step].lease?.expiresAt>Date.now())return; // Resume after a crashed worker's lease expires.
 const worker={id:'runtime-'+step,steps:[step]};
 // An expired assignment may resume a cached result; ledger keys bind the
 // role, build attempt and full request so a paid invocation cannot repeat.
 const claimed=await workers.transact(pool,run.id,r=>workers.claim(r,step,worker,{paused:false}));
 run=claimed.run;
 if(!data.sources){data.sources=await sourceFetch();await save(pool,run.id,data);}
 const catalog=await pool.query("SELECT data->'product'->>'title' AS title FROM barbarossa_runtime_jobs WHERE data ? 'product' AND run_id<>$1 ORDER BY day DESC LIMIT 30",[run.id]);
 let render=null;
 if(step==='quality'){
  artifacts.validate(data.product);const files=decode(data.files);
  if(files.some(f=>artifacts.sha(f.buffer)!==f.sha256)||!files.find(f=>f.name==='worksheet.csv')?.buffer.equals(Buffer.from(artifacts.csv(data.product))))throw Error('Current artifact integrity failed');
  render=await renderer(files);
 }
 const context={goal:run.goal,sources:data.sources,priorOutputs:Object.fromEntries(Object.entries(run.tasks).filter(([,v])=>v.output).map(([k,v])=>[k,v.output])),recentCatalog:catalog.rows.map(x=>x.title),revisionFeedback:run.revisionFeedback||null,...(step==='quality'?{product:data.product,renderedText:render.text.slice(0,18000)}:{})};
 const result=await modelCall({pool,key:run.id+':'+step+':'+(run.tasks.build.attempts||0),step,context,controls,apiKey:env.OPENAI_API_KEY});
 let output=result.output;
 if(step==='research'&&(!Array.isArray(output.sources)||output.sources.some(s=>!data.sources.some(p=>p.url===s))))throw Error('Research returned an unverified source');
 if(step==='build'){
  artifacts.validate(output);
  if(catalog.rows.some(r=>r.title?.toLowerCase()===output.title.toLowerCase()))throw Error('Duplicate product title');
  data.product=output;const files=await artifacts.packageProduct(output);data.files=encode(files);data.builderId=worker.id;
  // Persist actual artifact bytes before the coordinator's manifest handoff.
  await save(pool,run.id,data);output={summary:'Completed guide, worksheet and workflow diagram',artifacts:manifest(files)};
 }
 if(step==='quality'){
  if(typeof output.pass!=='boolean'||!output.checks)throw Error('Invalid quality response');
  const checks={...output.checks,filesRender:render.rendered===true&&render.sourceSha256===data.files.find(f=>f.name==='guide.docx').sha256,worksheetValid:true};
  const pass=output.pass&&Object.values(checks).every(x=>x===true);
  output={summary:output.summary,verdict:pass?'pass':'revise',reviewedArtifactsDigest:coordinator.digest(run.tasks.build.output.artifacts),checks};
  data.quality={verdict:output.verdict,builderId:data.builderId,reviewerId:worker.id,rendered:checks.filesRender,artifactsDigest:artifacts.sha(Buffer.from(JSON.stringify(data.files.map(f=>({name:f.name,sha256:f.sha256})))))};
  if(!pass){delete data.product;delete data.files;delete data.quality;}
 }
 if(step==='listing'){
  if(!Number.isSafeInteger(output.priceCents)||output.priceCents<200||output.priceCents>4900)throw Error('Listing price outside product policy');
  data.priceCents=output.priceCents;
 }
 data.lastModelReceipt={model:result.model,responseId:result.responseId,usage:result.usage};await save(pool,run.id,data);
 await workers.transact(pool,run.id,r=>workers.complete(r,step,worker,{leaseToken:claimed.leaseToken,output},{paused:false}));
}
async function tick(pool,env,controls,publisherOptions={}){
 ledger.requireControls(controls); // No job creation, fetch or external call before this check.
 const lock=await pool.connect();
 try{
  const got=await lock.query('SELECT pg_try_advisory_lock(724612) AS acquired');if(!got.rows[0].acquired)return;
  await enqueue(pool);
  const rows=await pool.query("SELECT * FROM barbarossa_runtime_jobs WHERE status='queued' ORDER BY day LIMIT 1");
  if(rows.rows[0])try{await runStep(pool,rows.rows[0],env,controls);}catch(e){
   const j=await pool.query('SELECT data FROM barbarossa_runtime_jobs WHERE run_id=$1',[rows.rows[0].run_id]);
   // Errors never schedule an automatic paid retry; an interrupted dispatch
   // can be reconciled from immutable execution receipts and artifact hashes.
   await save(pool,rows.rows[0].run_id,{...j.rows[0].data,blockerCode:classify(e)},'blocked');
  }
  else{
   const ready=await pool.query("SELECT * FROM barbarossa_runtime_jobs WHERE status='awaiting-publisher-verification' ORDER BY day LIMIT 1");
   if(ready.rows[0])try{await publishJob(pool,ready.rows[0],env,controls,publisherOptions);}catch(e){
    const j=await pool.query('SELECT data FROM barbarossa_runtime_jobs WHERE run_id=$1',[ready.rows[0].run_id]);
    await save(pool,ready.rows[0].run_id,{...j.rows[0].data,blockerCode:classify(e)},'blocked');
   }
  }
 }finally{await lock.query('SELECT pg_advisory_unlock(724612)');lock.release();}
}
async function publishJob(pool,job,env,controls,{uiContractVerified=false,ownerApprovalVerified=false,connect=uploader.connectProfile,perform=uploader.perform,verifyDownloads=uploader.verifyDownloads}={}){
 ledger.requireControls(controls);
 const run=await coordinator.get(pool,job.run_id),data=structuredClone(job.data);
 if(run?.status!=='ready-for-automated-release')throw Error('All specialist roles must complete before publication');
 const release={store:uploader.STORE,title:data.product.title,description:data.product.description,priceCents:data.priceCents,files:decode(data.files),quality:data.quality};
 const digest=uploader.validateRelease(release);
 // Publication is forbidden until an explicit, independently verified owner approval is supplied.
 // Draft-only workflows must use a separate operation and must not invoke perform()'s visible-publication path.
 if(ownerApprovalVerified!==true)return save(pool,job.run_id,{...data,publicationApprovalRequired:true},'awaiting-owner-approval');
 if(uiContractVerified!==true)return save(pool,job.run_id,data,'awaiting-publisher-verification');
 const checkPause=async()=>{ledger.requireControls(controls);const r=await pool.query('SELECT data FROM barbarossa_state WHERE id=1');if(r.rows[0]?.data.paused!==false)throw Error('Global Pause blocks publisher');};
 return ledger.execute(pool,job.run_id+':payhip-publish',{title:release.title,store:release.store,priceCents:release.priceCents,artifactsDigest:digest},5,controls,async()=>{
  const browser=await connect(env);let expired=false;
  // The provider timeout is inactivity-based. Enforce a wall-clock stop too.
  const timer=setTimeout(()=>{expired=true;browser.close().catch(()=>{});},120000);timer.unref();
  try{
   const result=await perform(browser.page,release,{uiContractVerified:true,publishVisible:true,verifyDownloads,beforeCommit:async()=>{await checkPause();await save(pool,job.run_id,data,'creating-draft');},beforePublish:checkPause,afterCreate:async url=>{data.draftUrl=url;await save(pool,job.run_id,data,'draft-created');}});
   if(expired||result.published!==true)throw Error('Publisher outcome uncertain; reconcile existing product');
   data.publication=result;await save(pool,job.run_id,data,'published');return result;
  }finally{clearTimeout(timer);await browser.close();}
 });
}
function classify(e){const m=e.message||'';if(/ENOENT|render|Office/i.test(m))return 'document-renderer-unavailable';if(/Payhip|seller|Cloudflare/i.test(m))return 'payhip-session-or-ui';if(/OpenAI|model/i.test(m))return 'model-request-or-output';if(/budget|billing|reserve|fund|Pause/i.test(m))return 'financial-controls';return 'pipeline-validation';}
module.exports={init,enqueue,readiness,runStep,tick,publishJob,sources,encode,decode,manifest,classify};
