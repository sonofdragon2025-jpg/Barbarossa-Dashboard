'use strict';
const crypto=require('node:crypto'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const exec=promisify(execFile);
const {Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,HeadingLevel,WidthType}=require('docx');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validate(p){
 if(!p||!['title','description','guideMarkdown'].every(k=>typeof p[k]==='string'&&p[k].trim()))throw Error('Complete product text required');
 if(p.title.length>150||p.description.length>5000||p.guideMarkdown.length>30000)throw Error('Product text too long');
 const words=p.guideMarkdown.trim().split(/\s+/).length;
 if(words<800||words>2200||/\b(TODO|TBD|lorem ipsum|insert here)\b|\[(?:enter|define|name|record|placeholder)[^\]]*\]/i.test(p.guideMarkdown))throw Error('Guide incomplete or contains placeholders');
 if(!Array.isArray(p.headers)||p.headers.length<3||p.headers.length>20||new Set(p.headers).size!==p.headers.length||!p.headers.every(x=>typeof x==='string'&&x.trim()))throw Error('Invalid worksheet headers');
 if(!Array.isArray(p.rows)||p.rows.length<2||p.rows.length>200||!p.rows.some(r=>r.some(x=>/illustrative|example/i.test(x))))throw Error('Worksheet needs a labeled example and working rows');
 for(const row of [p.headers,...p.rows]){
  if(!Array.isArray(row)||row.length!==p.headers.length)throw Error('Worksheet column mismatch');
  for(const x of row)if(typeof x!=='string'||x.length>1000||/^[\s\u0000-\u001f]*[=+@-]/.test(x)||/\u0000/.test(x))throw Error('Unsafe worksheet cell');
 }
 if(!Array.isArray(p.diagramSteps)||p.diagramSteps.length<3||p.diagramSteps.length>5||!p.diagramSteps.every(x=>typeof x==='string'&&x.trim()&&x.length<=50))throw Error('Workflow diagram labels required');
 return p;
}
function csv(p){validate(p);return '\uFEFF'+[p.headers,...p.rows].map(row=>row.map(x=>'"'+x.replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';}
async function packageProduct(p){
 validate(p);
 const workflow=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:p.diagramSteps.map((label,i)=>new TableCell({children:[new Paragraph({children:[new TextRun({text:`${i+1}. ${label}`,bold:true,color:'17324D'})]})]}))})]});
 const children=[new Paragraph({text:p.title,heading:HeadingLevel.TITLE}),new Paragraph({text:'Hiott Holding LLC | Maintenance Management Resources'}),new Paragraph({text:'Workflow',heading:HeadingLevel.HEADING_1}),workflow];
 for(const line of p.guideMarkdown.split(/\r?\n/)){
  const m=/^(#{1,3})\s+(.+)/.exec(line);
  children.push(new Paragraph({text:(m?m[2]:line).replace(/\*\*/g,''),...(m?{heading:HeadingLevel.HEADING_1}:{}),spacing:{after:100}}));
 }
 children.push(new Paragraph({text:'Worksheet field reference',heading:HeadingLevel.HEADING_1}),...p.headers.map(x=>new Paragraph({text:'• '+x})),new Paragraph({text:'© Hiott Holding LLC. For internal business use. No redistribution or resale. Adapt to approved site and OEM procedures; this toolkit is not engineering approval or certification.'}));
 const doc=new Document({styles:{default:{document:{run:{font:'Arial',size:22,color:'243746'}}}},sections:[{properties:{page:{margin:{top:1080,right:1080,bottom:1080,left:1080}}},children}]});
 const files=[{name:'guide.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await Packer.toBuffer(doc)},{name:'worksheet.csv',mime:'text/csv',buffer:Buffer.from(csv(p),'utf8')}];
 return files.map(f=>({...f,sha256:sha(f.buffer)}));
}
async function renderCheck(files,{soffice=process.env.SOFFICE_PATH||'/usr/bin/libreoffice',pdftotext=process.env.PDFTOTEXT_PATH||'/usr/bin/pdftotext'}={}){
 // Real Office rendering is required. A ZIP signature is not a visual check.
 await fs.access(soffice);await fs.access(pdftotext);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'barbarossa-render-'));
 try{
  const docx=files.find(f=>f.name==='guide.docx');if(!docx||sha(docx.buffer)!==docx.sha256)throw Error('DOCX integrity failed');
  await fs.writeFile(path.join(dir,'guide.docx'),docx.buffer,{mode:0o600});
  await exec(soffice,['-env:UserInstallation=file://'+dir+'/profile','--headless','--convert-to','pdf','--outdir',dir,path.join(dir,'guide.docx')],{timeout:45000,maxBuffer:16384});
  await exec(pdftotext,[path.join(dir,'guide.pdf'),path.join(dir,'guide.txt')],{timeout:15000,maxBuffer:16384});
  const text=await fs.readFile(path.join(dir,'guide.txt'),'utf8');
  if(text.split(/\s+/).length<700||!text.includes('Hiott Holding LLC'))throw Error('Rendered document lost content');
  const pdf=await fs.readFile(path.join(dir,'guide.pdf'));
  return {sourceSha256:docx.sha256,pdfSha256:sha(pdf),rendered:true,text,buffer:pdf};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
module.exports={validate,csv,packageProduct,renderCheck,sha};
