'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const ledger=require('./execution-ledger'),model=require('./model-adapter'),artifact=require('./product-artifacts'),upload=require('./payhip-uploader'),runtime=require('./commerce-runtime');
const good=()=>({paused:false,providerBillingVerified:true,reconciled:true,restrictedFundingVerified:true,verifiedAt:Date.now(),restrictedBalanceCents:20000,liabilitiesCents:1000,compute30DayCents:3000});
function product(){return {title:'Maintenance Communication Practice',description:'A complete practice resource for maintenance planning and documented handoffs.',guideMarkdown:'# Practical guide\n'+Array.from({length:90},(_,i)=>`Record ${i+1}: review the work order evidence and assign a responsible owner before scheduling.`).join('\n'),headers:['Record type','Work order','Owner','Next action'],rows:[['Illustrative example','EX-001','Shift lead','Review missing evidence'],['','','','']],diagramSteps:['Review evidence','Assign owner','Plan work','Verify completion']};}
test('funding unknown, pause, expired proofs and protected runway all stop spending',()=>{
 for(const key of ['providerBillingVerified','reconciled','restrictedFundingVerified'])assert.throws(()=>ledger.allowance({...good(),[key]:false},0,10));
 assert.throws(()=>ledger.allowance({...good(),paused:true},0,10));
 assert.throws(()=>ledger.allowance({...good(),verifiedAt:Date.now()-86400001},0,10));
 assert.throws(()=>ledger.allowance({...good(),restrictedBalanceCents:4005},0,10),/protected cash/);
 assert.throws(()=>ledger.allowance(good(),9995,10),/Monthly cap/);
 ledger.allowance(good(),9990,10);
});
test('model adapter confines role, model, input size and output interpretation',()=>{
 const req=model.requestFor('build',{goal:'Create a maintenance worksheet'});
 assert.equal(req.model,model.MODEL);assert.equal(req.store,false);assert.equal(req.tools,undefined);assert.equal(req.max_output_tokens,6500);
 assert.throws(()=>model.requestFor('wallet',{}));assert.throws(()=>model.requestFor('build',{text:'x'.repeat(50000)}));
 assert.throws(()=>model.decode({status:'incomplete',output:[]}));
 assert.throws(()=>model.decode({status:'completed',output:[{content:[{type:'refusal'}]}]}));
 assert.deepEqual(model.decode({status:'completed',output:[{content:[{type:'output_text',text:'{"summary":"ready"}'}]}]}),{summary:'ready'});
});
test('paused runtime cannot reach a database or a network client',async()=>{
 let calls=0;await assert.rejects(runtime.tick({connect:async()=>{calls++;throw Error('must not connect');}},{},goodWithoutPause()),/unpaused/);assert.equal(calls,0);
 function goodWithoutPause(){return {...good(),paused:true};}
});
test('worksheet injection, placeholder guides, duplicate headers and ragged rows are rejected',()=>{
 const p=product();artifact.validate(p);
 for(const value of ['=HYPERLINK("https://example.com")',' \t+cmd','@SUM(A1)','-1+1'])assert.throws(()=>artifact.validate({...p,rows:[p.rows[0],[value,'1','2','3']]}),/Unsafe/);
 assert.throws(()=>artifact.validate({...p,guideMarkdown:p.guideMarkdown+'\nTODO'}),/incomplete/);
 assert.throws(()=>artifact.validate({...p,headers:['A','A','B','C']}),/headers/);
 assert.throws(()=>artifact.validate({...p,rows:[['Illustrative example'],['','','','']]}),/column/);
});
test('real packaged files retain complete guide text and correctly escaped worksheet data',async()=>{
 const p=product();p.rows[0][3]='Review "spare, critical" evidence';
 const files=await artifact.packageProduct(p);assert.equal(files.length,2);
 const zip=await require('jszip').loadAsync(files[0].buffer),xml=await zip.file('word/document.xml').async('string');
 assert.ok(xml.includes('Record 90'));assert.ok(xml.includes('Hiott Holding LLC'));assert.ok(xml.includes('Assign owner'));
 assert.ok(files[1].buffer.toString().includes('"Review ""spare, critical"" evidence"'));
 for(const f of files)assert.equal(f.sha256,artifact.sha(f.buffer));
});
test('publication is bound to independent review of exact artifact bytes and correct store',async()=>{
 const p=product(),files=await artifact.packageProduct(p);
 const digest=artifact.sha(Buffer.from(JSON.stringify(files.map(f=>({name:f.name,sha256:f.sha256})))));
 const release={store:upload.STORE,title:p.title,description:p.description,priceCents:900,files,quality:{verdict:'pass',builderId:'builder',reviewerId:'reviewer',rendered:true,artifactsDigest:digest}};
 upload.validateRelease(release);
 assert.throws(()=>upload.validateRelease({...release,store:'https://payhip.com/other'}),/storefront/);
 assert.throws(()=>upload.validateRelease({...release,quality:{...release.quality,reviewerId:'builder'}}),/Independent/);
 assert.throws(()=>upload.validateRelease({...release,files:[{...files[0],buffer:Buffer.from('changed')},files[1]]}),/integrity/);
 let navigations=0;await assert.rejects(upload.perform({goto:async()=>navigations++},release),/before upload/);assert.equal(navigations,0);
});
test('browser security challenges and unfamiliar hosts halt without trying a login',async()=>{
 const page={url:()=> 'https://payhip.com/products',locator:()=>({innerText:async()=> 'Performing security verification: Verify you are human'})};
 await assert.rejects(upload.guard(page),/human verification/);
 await assert.rejects(upload.guard({...page,url:()=> 'https://other.example/products'}),/Unexpected/);
});
test('readiness never treats installed code or supplied credentials as a verified uploader',()=>{
 const s=runtime.readiness({OPENAI_API_KEY:'test',TINYFISH_API_KEY:'test',PAYHIP_PROFILE_ID:'prof_123'},good());
 assert.equal(s.executorImplemented,true);assert.equal(s.automaticExecutionEnabled,false);assert.equal(s.automaticPublishingEnabled,false);assert.equal(s.payhipUploadVerified,false);
 assert.ok(s.blockers.some(x=>x.includes('end to end')));assert.equal(JSON.stringify(s).includes('TINYFISH_API_KEY'),false);
});
test('all eight specialists hand off real artifact hashes and stop before unverified publication',async()=>{
 const coordinator=require('./agent-coordinator');let run=coordinator.createRun({requestKey:'integration-fixture',goal:'Create a maintenance communication toolkit'});
 let stored={};const job={run_id:run.id,day:'2026-10-27',data:{}};
 const pool={connect:async()=>({query,release(){}}),query};
 async function query(sql,args=[]){
  if(sql.startsWith('SELECT data FROM barbarossa_agent_runs'))return {rows:[{data:structuredClone(run)}]};
  if(sql.startsWith('UPDATE barbarossa_agent_runs')){run=JSON.parse(args[1]);return {rowCount:1};}
  if(sql.startsWith('UPDATE barbarossa_runtime_jobs')){stored=JSON.parse(args[1]);job.data=structuredClone(stored);job.status=args[2];return {rowCount:1};}
  if(sql.startsWith("SELECT data->'product'"))return {rows:[]};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]};
  throw Error('Unexpected integration query');
 }
 const visited=[],source={url:'https://www.osha.gov/control-hazardous-energy',text:'Source fixture for pipeline integration.'};
 const modelCall=async({step,context})=>{
  visited.push(step);let output={summary:'Completed '+step};
  if(step==='research')output.sources=[source.url];
  if(step==='build')output=product();
  if(step==='quality'){assert.equal(context.product.title,product().title);output={summary:'Independent review passed',pass:true,checks:{originality:true,technicalAccuracy:true,safety:true,noPlaceholders:true}};}
  if(step==='listing')output.priceCents=900;
  return {output,model:model.MODEL,responseId:'fixture-'+step,usage:{input_tokens:10,output_tokens:10}};
 };
 const renderer=async files=>({rendered:true,sourceSha256:files.find(x=>x.name==='guide.docx').sha256,text:product().guideMarkdown});
 for(let i=0;i<9;i++)await runtime.runStep(pool,job,{OPENAI_API_KEY:'test-only'},good(),{modelCall,renderer,sourceFetch:async()=>[source]});
 assert.deepEqual(visited,['research','design','build','quality','listing','promotion','support','performance']);
 assert.equal(run.status,'ready-for-automated-release');assert.equal(job.status,'awaiting-publisher-verification');
 assert.equal(stored.quality.builderId,'runtime-build');assert.equal(stored.quality.reviewerId,'runtime-quality');
 upload.validateRelease({store:upload.STORE,...stored.product,priceCents:stored.priceCents,files:runtime.decode(stored.files),quality:stored.quality});
 let browserCalls=0;await runtime.publishJob(pool,job,{},good(),{connect:async()=>{browserCalls++;throw Error('must not open browser');}});assert.equal(browserCalls,0);assert.equal(job.status,'awaiting-owner-approval');
});
