'use strict';
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,HeadingLevel,AlignmentType,ShadingType}=require('docx');
const NAVY='17324D',BLUE='28618A';
const p=(text,after=65)=>new Paragraph({text,spacing:{after},keepWithNext:false});
const heading=text=>new Paragraph({text,heading:HeadingLevel.HEADING_1,spacing:{before:125,after:55}});
function cell(text,header=false){return new TableCell({shading:header?{fill:NAVY,type:ShadingType.CLEAR}:undefined,margins:{top:60,bottom:60,left:75,right:75},children:[new Paragraph({children:[new TextRun({text,bold:header,color:header?'FFFFFF':'243746',size:16})],spacing:{after:0}})]});}
function table(headers,rows){return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:headers.map(x=>cell(x,true))}),...rows.map(row=>new TableRow({children:row.map(x=>cell(x))}))]});}
async function render(product){
 const handoff=product.slug==='shift-handoff';
 const children=[new Paragraph({text:product.title,heading:HeadingLevel.TITLE,spacing:{after:75}}),p('Editable maintenance worksheet  |  '+product.day+'  |  Review draft',80)];
 if(handoff){
 children.push(
 p('Use at every shift change. Record outstanding work, asset condition, safety restrictions, action owners and due times. Follow site-specific CMMS, OEM and LOTO procedures.',100),
 heading('Shift details'),
 table(['Date / Shift','Area / Department','Outgoing Lead','Incoming Lead'],[['','','','']]),
 heading('Equipment status and open work'),
 table(['Asset / WO','Status / Issue','Safety / LOTO','Action / Owner / Due'],Array.from({length:4},()=>['','','',''])),
 heading('Priority, safety and escalation'),
 table(['Priority / risk','Immediate controls / escalation / next steps'],[['',''],['','']]),
 heading('Handoff acknowledgment'),
 table(['Outgoing signature / time','Incoming signature / time'],[['','']]),
 p('Critical issues reviewed:  ☐ Yes   ☐ No    |    Follow-up assigned:  ☐ Yes   ☐ No',75),
 p('Safety note: This worksheet does not replace approved permits, isolation records, LOTO verification or authorization to return equipment to service.',70)
 );
 }else{
 children.push(p('Adapt to site procedures, equipment requirements and CMMS. Review all content before distribution.',95),heading('Implementation notes'));
 const sections=product.markdown.split('\n').filter(x=>x.startsWith('## ')&&!/Quality assurance/i.test(x));
 for(const x of sections.slice(0,4)){children.push(heading(x.replace(/^## /,'')),table(['Record / evidence','Owner / action / due'],[['',''],['','']]));}
 children.push(p('Safety and technical content must be reviewed against applicable site procedures before distribution.'));
 }
 children.push(new Paragraph({text:'© Hiott Holding LLC  |  Draft — not published',alignment:AlignmentType.CENTER,spacing:{before:80}}));
 const doc=new Document({styles:{default:{document:{run:{font:'Aptos',size:18,color:'243746'}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',run:{size:30,bold:true,color:NAVY}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',run:{size:21,bold:true,color:BLUE},paragraph:{spacing:{before:125,after:55}}}]},sections:[{properties:{page:{margin:{top:600,right:650,bottom:600,left:650}}},children}]});
 return Packer.toBuffer(doc);
}
module.exports={render};
