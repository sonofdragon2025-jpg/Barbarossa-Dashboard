'use strict';
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const PORT=Number(process.env.PORT||3000), PASSWORD=process.env.BARBAROSSA_OWNER_PASSWORD||'';
const STORE=process.env.DATA_FILE||path.join(__dirname,'data','state.json'),CAP=100;
// Safety lock: provider-side hard caps/prepaid balances have not been verified.
// Do not enable billable execution or owner approval via environment variables alone.
const BILLING_GUARD_VERIFIED=false;
const DURABLE_LEDGER_VERIFIED=false; // No transactional external database configured; fail closed.
if(PASSWORD.length<16){console.error('Set BARBAROSSA_OWNER_PASSWORD (16+ characters) in Render Environment');process.exit(1);}
const salt=crypto.randomBytes(16), passwordHash=crypto.scryptSync(PASSWORD,salt,64);
const sessions=new Map(), attempts=new Map(), TTL=8*60*60*1000;
let state={paused:true,tasks:[],audit:[],committedMonthlyCost:0};
try{state=JSON.parse(fs.readFileSync(STORE,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
state.paused=true; // Always pause on restart; unpause blocked until safeguards verified
function save(){fs.mkdirSync(path.dirname(STORE),{recursive:true});const tmp=STORE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state),{mode:0o600});fs.renameSync(tmp,STORE);}
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers});res.end(JSON.stringify(data));}
function html(res,s){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(s);}
function cookie(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)barbarossa_session=([a-f0-9]{64})(?:;|$)/);return m&&m[1];}
function session(req){const id=cookie(req),s=id&&sessions.get(id);if(!s)return null;if(s.expires<Date.now()){sessions.delete(id);return null;}return s;}
function originOK(req){const origin=req.headers.origin;return !origin||origin===('https://'+req.headers.host);}
function csrfOK(req,s){const h=req.headers['x-csrf-token'];return typeof h==='string'&&h.length===64&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(s.csrf));}
function audit(type,id){state.audit.push({at:new Date().toISOString(),type,id});state.audit=state.audit.slice(-500);}
function read(req){return new Promise((resolve,reject)=>{let str='',done=false;req.on('data',chunk=>{str+=chunk;if(str.length>16384&&!done){done=true;reject(Error('Body too large'));req.destroy();}});req.on('end',()=>{if(done)return;try{resolve(JSON.parse(str||'{}'));}catch{reject(Error('Invalid JSON'));}});req.on('error',reject);});}
const page=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Barbarossa Secure Tasks</title><style>body{margin:0;background:#0c1423;color:#eaf0fa;font:16px system-ui}main{max-width:780px;margin:auto;padding:22px}h1{margin:0}p{line-height:1.5;color:#b9c9dc}.panel{border:1px solid #41516a;border-radius:12px;background:#19263a;padding:16px;margin:16px 0}input,select,button{font:inherit;padding:11px;border-radius:7px;margin:5px 0}input,select{background:#fff;color:#111;width:100%;box-sizing:border-box}button{background:#426b9d;color:#fff;border:0;cursor:pointer}button:disabled{opacity:.5}label{display:block;margin-top:10px}.warn{color:#ffdb9a}li{margin:12px 0;border-bottom:1px solid #405069;padding-bottom:10px}.muted{color:#b9c9dc;font-size:.9rem}</style></head><body><main><h1>Barbarossa</h1><p>Private task management • Hiott Holding LLC</p><p class="warn">Safety lock active: Global Pause cannot be disabled until provider-side billing controls and durable spending ledger are verified. No external actions or AI calls. Local task storage may be lost on redeployment; export backups before deployments. $100 is a planning ceiling, not provider billing enforcement.</p><section class="panel" id="login"><h2>Owner login</h2><label>Password<input id="password" type="password" autocomplete="current-password"></label><button id="signIn">Sign in</button><p id="loginMessage"></p></section><section id="private" hidden><div class="panel"><button id="logout">Sign out</button><h2>Operating status</h2><p id="status"></p><button id="pause">Change pause state</button></div><div class="panel"><h2>Create task</h2><label>Task name<input id="title" maxlength="160"></label><label>Category<select id="type"><option value="research">Research</option><option value="maintenance-draft">Maintenance draft</option><option value="publishing">Publishing</option><option value="message">External message</option><option value="payment">Payment</option><option value="trade">Trade</option><option value="other">Other</option></select></label><label>Estimated cost in USD<input id="cost" type="number" min="0" max="100" step="0.01" value="0"></label><button id="create">Create for approval</button></div><div class="panel"><h2>Task queue</h2><ul id="tasks"></ul></div><div class="panel"><h2>Recent audit history</h2><ul id="audit"></ul></div></section><p id="notice" role="status"></p></main><script>
let csrf='';
const $=id=>document.getElementById(id);
async function request(url,method='GET',data){const r=await fetch(url,{method,credentials:'same-origin',headers:{...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{})},body:data===undefined?undefined:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;}
function message(t){$('notice').textContent=t;}
async function refresh(){const [s,t,a]=await Promise.all([request('/api/status'),request('/api/tasks'),request('/api/audit')]);$('status').textContent='Global pause: '+(s.paused?'ON':'OFF')+' | Provider billing safeguards: '+(s.billingGuardVerified?'VERIFIED':'NOT VERIFIED')+' | Budget planning ceiling: $'+s.budgetCap+' | Reserved estimates: $'+s.committedMonthlyCost+' | External actions: DISABLED';$('pause').textContent=s.paused?'Unpause approvals':'Pause approvals';$('tasks').replaceChildren();for(const task of t.tasks){const li=document.createElement('li');li.textContent=task.title+' — '+task.type+' — '+task.status+' — $'+task.estimatedCost+' estimated ';if(task.status==='pending-approval'){for(const action of ['approve','reject']){const b=document.createElement('button');b.textContent=action;b.onclick=async()=>{try{await request('/api/tasks/'+task.id+'/'+action,'POST',{});await refresh();message('Task '+action+'d. No external action executed.');}catch(e){message(e.message);}};li.append(b);}}$('tasks').append(li);}$('audit').replaceChildren();for(const entry of a.audit.slice().reverse()){const li=document.createElement('li');li.textContent=entry.at+' — '+entry.type+' '+(entry.id||'');$('audit').append(li);}}
async function check(){try{const s=await request('/auth/session');csrf=s.csrf;$('login').hidden=true;$('private').hidden=false;await refresh();}catch{$('login').hidden=false;$('private').hidden=true;}}
$('signIn').onclick=async()=>{try{const r=await request('/auth/login','POST',{password:$('password').value});csrf=r.csrf;$('password').value='';$('loginMessage').textContent='';await check();}catch(e){$('loginMessage').textContent=e.message;}};
$('logout').onclick=async()=>{try{await request('/auth/logout','POST',{});}finally{csrf='';await check();}};
$('create').onclick=async()=>{try{await request('/api/tasks','POST',{title:$('title').value,type:$('type').value,estimatedCost:Number($('cost').value)});$('title').value='';await refresh();message('Task created, pending owner approval.');}catch(e){message(e.message);}};
$('pause').onclick=async()=>{try{const s=await request('/api/status');await request('/api/pause','POST',{paused:!s.paused});await refresh();}catch(e){message(e.message);}};
check();
</script></body></html>`;
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost').pathname,method=req.method,ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket.remoteAddress||'unknown';
 if(u==='/health'&&method==='GET')return json(res,200,{status:'ok',phase:2,externalActionsEnabled:false,taskManagement:'password-session'},{'Access-Control-Allow-Origin':'https://barbarossa-dashboard.onrender.com','Vary':'Origin'});
 if((u==='/'||u==='/login')&&method==='GET')return html(res,page);
 if(!originOK(req))return json(res,403,{error:'Origin not allowed'});
 try{
  if(u==='/auth/login'&&method==='POST'){
   const now=Date.now(),h=attempts.get(ip)||{count:0,until:now+15*60*1000};if(now>h.until){h.count=0;h.until=now+15*60*1000;}if(h.count>=8)return json(res,429,{error:'Too many attempts; try later'});
   const b=await read(req),candidate=typeof b.password==='string'?b.password:'';
   const hash=crypto.scryptSync(candidate.slice(0,1024),salt,64);
   if(!crypto.timingSafeEqual(hash,passwordHash)){h.count++;attempts.set(ip,h);return json(res,401,{error:'Invalid credentials'});}
   attempts.delete(ip);const id=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex');sessions.set(id,{csrf,expires:now+TTL});
   return json(res,200,{csrf},{'Set-Cookie':'barbarossa_session='+id+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800'});
  }
  const s=session(req);if(!s)return json(res,401,{error:'Sign in required'});
  if(u==='/auth/session'&&method==='GET')return json(res,200,{csrf:s.csrf});
  if(method!=='GET'&&!csrfOK(req,s))return json(res,403,{error:'Invalid CSRF token'});
  if(u==='/auth/logout'&&method==='POST'){sessions.delete(cookie(req));return json(res,200,{ok:true},{'Set-Cookie':'barbarossa_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
  if(u==='/api/status'&&method==='GET')return json(res,200,{durableLedgerVerified:DURABLE_LEDGER_VERIFIED,paidOperationsAllowed:false,paused:state.paused,budgetCap:CAP,billingGuardVerified:BILLING_GUARD_VERIFIED,committedMonthlyCost:state.committedMonthlyCost,externalActionsEnabled:false,persistence:process.env.DATA_FILE?'configured path; verify disk mount':'ephemeral local file'});
  if(u==='/api/tasks'&&method==='GET')return json(res,200,{tasks:state.tasks});
   if(u==='/api/export'&&method==='GET')return json(res,200,{exportedAt:new Date().toISOString(),warning:'Backup only, not durable transactional storage',state},{'Content-Disposition':'attachment; filename="barbarossa-backup.json"'});
  if(u==='/api/audit'&&method==='GET')return json(res,200,{audit:state.audit.slice(-100)});
  if(u==='/api/tasks'&&method==='POST'){const b=await read(req);if(typeof b.title!=='string'||!b.title.trim()||b.title.length>160)return json(res,400,{error:'Invalid title'});const estimatedCost=b.estimatedCost;if(typeof estimatedCost!=='number'||!Number.isFinite(estimatedCost)||estimatedCost<0||estimatedCost>CAP)return json(res,400,{error:'Invalid estimated cost'});const type=['research','maintenance-draft','publishing','message','payment','trade','other'].includes(b.type)?b.type:'other';const task={id:crypto.randomUUID(),title:b.title.trim(),type,estimatedCost,status:'pending-approval',createdAt:new Date().toISOString()};state.tasks.push(task);audit('task-created',task.id);save();return json(res,201,{task});}
  const match=u.match(/^\/api\/tasks\/([a-f0-9-]+)\/(approve|reject)$/);
  if(match&&method==='POST'){const task=state.tasks.find(t=>t.id===match[1]);if(!task)return json(res,404,{error:'Task not found'});if(task.status!=='pending-approval')return json(res,409,{error:'Already reviewed'});if(match[2]==='approve'){if(state.paused)return json(res,409,{error:'Global pause enabled'});if(state.committedMonthlyCost+task.estimatedCost>CAP)return json(res,409,{error:'Budget estimate cap exceeded'});state.committedMonthlyCost+=task.estimatedCost;task.status='approved-not-executed';task.approvedAt=new Date().toISOString();}else task.status='rejected';audit('task-'+match[2],task.id);save();return json(res,200,{task,externalActionExecuted:false});}
  if(u==='/api/pause'&&method==='POST'){const b=await read(req);if(typeof b.paused!=='boolean')return json(res,400,{error:'Invalid pause value'});if(b.paused===false&&(!BILLING_GUARD_VERIFIED||!DURABLE_LEDGER_VERIFIED))return json(res,409,{error:'Global Pause locked ON until provider billing controls AND durable spending ledger are independently verified'});state.paused=b.paused;audit(b.paused?'paused':'unpaused',null);save();return json(res,200,{paused:state.paused});}
  return json(res,404,{error:'Not found'});
 }catch(e){return json(res,400,{error:e.message});}
}).listen(PORT,'0.0.0.0',()=>console.log('Barbarossa secure Phase 2 API listening on '+PORT));
