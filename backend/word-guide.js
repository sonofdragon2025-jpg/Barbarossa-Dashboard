'use strict';
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,HeadingLevel,AlignmentType,ShadingType}=require('docx');
const NAVY='17324D',BLUE='28618A',LIGHT='EAF1F6';
function para(text,opts={}){return new Paragraph({text,spacing:{after:140},...opts});}
function cell(text,header=false){return new TableCell({shading:header?{fill:NAVY,type:ShadingType.CLEAR}:undefined,children:[new Paragraph({children:[new TextRun({text,bold:header,color:header?'FFFFFF':'243746',size:19})],spacing:{before:90,after:90}})]});}
function table(headers,rows){return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:headers.map(x=>cell(x,true))}),...rows.map(row=>new TableRow({children:row.map(x=>cell(x))}))]});}
async function render(p){
 const children=[
 new Paragraph({children:[new TextRun({text:'HIOTT HOLDING LLC',bold:true,color:BLUE,size:24})],spacing:{after:240}}),
 new Paragraph({text:p.title,heading:HeadingLevel.TITLE,spacing:{after:260}}),
 para('MAINTENANCE MANAGEMENT TOOLKIT  |  WORKING DRAFT — NOT FOR DISTRIBUTION'),
 para('Prepared: '+p.day),
 new Paragraph({text:'Purpose and application',heading:HeadingLevel.HEADING_1}),
 para('A structured tool to document asset condition, outstanding maintenance issues, safety restrictions, and responsibility between shifts. Adapt to your site procedures, OEM requirements, and CMMS.'),
 new Paragraph({text:'How to use',heading:HeadingLevel.HEADING_1}),
 ...['Record shift date, area, outgoing and incoming personnel.','List every unresolved equipment issue and affected asset ID.','Identify safety restrictions and lockout/tagout status; never substitute this form for an authorized LOTO procedure.','Assign each open action an owner, priority, and due date.','Review open items face to face when practical; incoming shift acknowledges receipt.'].map((x,i)=>para((i+1)+'. '+x)),
 new Paragraph({text:'Shift information',heading:HeadingLevel.HEADING_1}),
 table(['Field','Entry'],[['Date / shift',''],['Department / area',''],['Outgoing lead',''],['Incoming lead',''],['Handoff time','']]),
 new Paragraph({text:'Open equipment issues and action register',heading:HeadingLevel.HEADING_1}),
 table(['Asset / Area','Status / Issue','Safety / LOTO','Action / Owner / Due'],Array.from({length:5},()=>['','','',''])),
 new Paragraph({text:'Priority and escalation',heading:HeadingLevel.HEADING_1}),
 para('Critical safety risks and unsafe equipment conditions require immediate escalation through site procedures. Do not return equipment to service without required authorization and verification.'),
 new Paragraph({text:'Acknowledgment',heading:HeadingLevel.HEADING_1}),
 table(['Outgoing shift / Date','Incoming shift / Date'],[['','']]),
 new Paragraph({text:'Pre-release review checklist',heading:HeadingLevel.HEADING_1}),
 ...['Validate technical accuracy and site-specific safety language.','Check tables, page breaks, and editability in Word.','Obtain owner approval of final content and storefront listing before publication.'].map(x=>para('☐ '+x)),
 para('© Hiott Holding LLC. All rights reserved.',{alignment:AlignmentType.CENTER})
 ];
 const doc=new Document({styles:{default:{document:{run:{font:'Aptos',size:21,color:'243746'}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',run:{size:38,bold:true,color:NAVY}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',run:{size:26,bold:true,color:BLUE},paragraph:{spacing:{before:260,after:120}}}]},sections:[{properties:{page:{margin:{top:900,right:850,bottom:850,left:850}}},children}]});
 return Packer.toBuffer(doc);
}
module.exports={render};
