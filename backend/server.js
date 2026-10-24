// Barbarossa Phase 2 API starter — no external actions or AI calls.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.BARBADOSSA_ADMIN_TOKEN || process.env.BARBAROSSA_ADMIN_TOKEN;
const ORIGIN = process.env.DASHBOARD_ORIGIN || '';
const STORE = process.env.DATA_FILE || path.join(__dirname, 'data', 'state.json');
const CAP = 100;
if (!TOKEN || TOKEN.length < 32) { console.error('Set BARBAROSSA_ADMIN_TOKEN to a random secret of at least 32 characters'); process.exit(1); }
if (!ORIGIN || !/^https:\/\//.test(ORIGIN)) { console.error('Set DASHBOARD_ORIGIN to the exact HTTPS dashboard origin'); process.exit(1); }
let state = { paused:true, tasks:[], audit:[], committedMonthlyCost:0 };
try { state = JSON.parse(fs.readFileSync(STORE,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; }
function save(){ fs.mkdirSync(path.dirname(STORE),{recursive:true}); const tmp=STORE+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600}); fs.renameSync(tmp,STORE); }
function respond(res,status,obj,origin=''){ res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'}:{})}); res.end(JSON.stringify(obj)); }
function authorized(req){ const value=req.headers.authorization||''; const a=Buffer.from(value); const b=Buffer.from('Bearer '+TOKEN); return a.length===b.length && crypto.timingSafeEqual(a,b); }
function log(type,id){state.audit.push({at:new Date().toISOString(),type,id}); if(state.audit.length>2000)state.audit=state.audit.slice(-2000);}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>16384){reject(new Error('Request too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
const hits=new Map();
http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 if(req.method==='OPTIONS'){if(origin!==ORIGIN)return respond(res,403,{error:'Origin not allowed'});res.writeHead(204,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST','Access-Control-Allow-Headers':'Authorization,Content-Type'});return res.end();}
 if(req.url==='/health'&&req.method==='GET')return respond(res,200,{status:'ok',phase:2,externalActionsEnabled:false},origin);
 if(origin&&origin!==ORIGIN)return respond(res,403,{error:'Origin not allowed'},origin);
 if(!authorized(req))return respond(res,401,{error:'Unauthorized'},origin);
 const ip=req.socket.remoteAddress||'unknown',now=Date.now(),h=hits.get(ip)||{start:now,count:0};if(now-h.start>60000){h.start=now;h.count=0;}h.count++;hits.set(ip,h);if(h.count>60)return respond(res,429,{error:'Rate limit exceeded'},origin);
 try{
  if(req.url==='/api/status'&&req.method==='GET')return respond(res,200,{paused:state.paused,budgetCap:CAP,committedMonthlyCost:state.committedMonthlyCost,remainingBudget:CAP-state.committedMonthlyCost,taskCount:state.tasks.length,externalActionsEnabled:false,persistence:'local file; configure persistent disk'},origin);
  if(req.url==='/api/tasks'&&req.method==='GET')return respond(res,200,{tasks:state.tasks},origin);
  if(req.url==='/api/audit'&&req.method==='GET')return respond(res,200,{audit:state.audit.slice(-100)},origin);
  if(req.url==='/api/tasks'&&req.method==='POST'){
   const b=await body(req);if(typeof b.title!=='string'||!b.title.trim()||b.title.length>160)return respond(res,400,{error:'Invalid title'},origin);
   const type=['research','maintenance-draft','publishing','message','payment','trade','other'].includes(b.type)?b.type:'other';
   const estimatedCost=Number(b.estimatedCost||0);if(!Number.isFinite(estimatedCost)||estimatedCost<0||estimatedCost>CAP)return respond(res,400,{error:'Invalid cost'},origin);
   if(state.committedMonthlyCost+estimatedCost>CAP)return respond(res,409,{error:'Budget cap exceeded'},origin);
   const task={id:crypto.randomUUID(),title:b.title.trim(),type,estimatedCost,status:'pending-approval',createdAt:new Date().toISOString(),approvedAt:null};
   state.tasks.push(task);log('task-created',task.id);save();return respond(res,201,{task},origin);
  }
  const match=req.url.match(/^\/api\/tasks\/([a-f0-9-]+)\/(approve|reject)$/);
  if(match&&req.method==='POST'){
   const task=state.tasks.find(t=>t.id===match[1]);if(!task)return respond(res,404,{error:'Task not found'},origin);
   if(task.status!=='pending-approval')return respond(res,409,{error:'Task already reviewed'},origin);
   if(match[2]==='approve'){
    if(state.paused)return respond(res,409,{error:'Global pause enabled'},origin);
    if(state.committedMonthlyCost+task.estimatedCost>CAP)return respond(res,409,{error:'Budget cap exceeded'},origin);
    task.status='approved-not-executed';task.approvedAt=new Date().toISOString();state.committedMonthlyCost+=task.estimatedCost;
   }else task.status='rejected';
   log('task-'+match[2],task.id);save();return respond(res,200,{task,externalActionExecuted:false},origin);
  }
  if(req.url==='/api/pause'&&req.method==='POST'){const b=await body(req);if(typeof b.paused!=='boolean')return respond(res,400,{error:'paused must be boolean'},origin);state.paused=b.paused;log(b.paused?'paused':'unpaused',null);save();return respond(res,200,{paused:state.paused},origin);}
  return respond(res,404,{error:'Not found'},origin);
 }catch(e){return respond(res,400,{error:e.message},origin);}
}).listen(PORT,'0.0.0.0',()=>console.log('Barbarossa Phase 2 API listening on '+PORT));
