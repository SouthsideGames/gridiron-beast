/* Original Gridiron Beast tactical concepts. Madden School is a reference, not an asset source. */
window.GridironPlays=(function(){
const OFFENSE={"Power Run":["run","power","right"],"Inside Zone":["run","zone","middle"],"Outside Run":["run","outside","top"],"Inside Run":["run","dive","middle"],"Balanced Run":["run","balanced","bottom"],"HB Dive":["run","dive","middle"],"HB Stretch":["run","outside","bottom"],"Counter Run":["run","counter","top"],"Draw":["run","draw","middle"],"Read Option":["run","option","bottom"],"Quick Pass":["pass","quick"],"Deep Post":["pass","post"],"Four Verticals":["pass","vertical"],"Slant Combo":["pass","slant"],"Screen Pass":["pass","screen"],"Deep Corner":["pass","corner"],"Play Action":["pass","playaction"],"Quick Slant":["pass","slantquick"],"Spread Screen":["pass","screenwide"],"Tempo Slant":["pass","temposlant"],"Mesh":["pass","mesh"],"Flood":["pass","flood"],"Curl Flats":["pass","curlflat"],"Double Post":["pass","doublepost"],"Dagger":["pass","dagger"],"Y Cross":["pass","cross"],"Stick":["pass","stick"],"HB Slip Screen":["pass","hbscreen"],"PA Boot":["pass","boot"],"Wheel Route":["pass","wheel"]};
const DEFENSE={"Cover Two":"cover2","Cover Three":"cover3","Cover Four":"cover4","Deep Zone":"deep","Cloud Flats":"cloud","Zone Trap":"trap","QB Spy":"spy","Run Wall":"runwall","Man Lock":"man","Press Coverage":"press","Corner Fire Blitz":"cornerblitz","All-Out Pressure":"allblitz","Run Blitz":"runblitz","DB Blitz":"dbblitz","Zone Blitz":"zoneblitz","Tampa Two":"tampa","Nickel Man":"nickelman","Cover One":"cover1","Cover Six":"cover6","Fire Zone":"firezone","Edge Contain":"contain","Double A Gap":"agap","Quarters Match":"quarters","Robber":"robber"};
Object.assign(OFFENSE,{"Strong Toss":["run","toss","bottom"],"Weak Toss":["run","toss","top"],"Trap Run":["run","trap","middle"],"Wham Run":["run","wham","middle"],"Power Sweep":["run","sweep","top"],"Jet Sweep":["run","jet","top"],"End Around":["run","reverse","bottom"],"HB Iso":["run","iso","middle"],"Lead Draw":["run","leaddraw","middle"],"Split Zone":["run","splitzone","bottom"],"Pin Pull Sweep":["run","pinpull","top"],"Speed Option":["run","speedoption","top"],"PA Crossers":["pass","pacross"],"PA Flood":["pass","paflood"],"PA Shot":["pass","pashot"],"Smash Concept":["pass","smash"],"Levels":["pass","levels"],"Spacing":["pass","spacing"],"Drive":["pass","drive"],"Texas Route":["pass","texas"],"Slot Fade":["pass","slotfade"],"Double Move":["pass","doublemove"],"Seam Read":["pass","seamread"],"Shallow Cross":["pass","shallow"],"Bubble Screen":["pass","bubble"],"Tunnel Screen":["pass","tunnel"],"TE Seam":["pass","teseam"],"RB Angle":["pass","rbangle"]});
Object.assign(DEFENSE,{"Cover Zero":"zero","Cover Two Invert":"invert2","Cover Three Buzz":"buzz3","Cover Three Match":"match3","Cover Four Palms":"palms4","Cover Six Trap":"sixtrap","Tampa Robber":"tamparobber","Nickel Blitz":"nickelblitz","Safety Blitz":"safetyblitz","Cross Dog Blitz":"crossdog","Double Edge Blitz":"doubleedge","Simulated Pressure":"simpressure","Drop Eight":"drop8","Goal Line Stand":"goalline","Bear Front":"bear","Overload Right":"overright","Overload Left":"overleft","Prevent Defense":"prevent"});
const offensePositions={WR1:[176,25],WR2:[176,235],WR3:[137,53],TE:[185,205],RB:[105,147],QB:[135,130],LT:[185,78],LG:[185,104],C:[185,130],RG:[185,156],RT:[185,182]};
const defensePositions={DE1:[215,78],DT1:[215,108],DT2:[215,153],DE2:[215,182],LB1:[285,74],LB2:[285,130],LB3:[285,190],CB1:[224,28],CB2:[224,234],FS:[405,84],SS:[405,176]};
const routes={streak:(x,y,s)=>[[x,y],[x+85,y],[x+210,y]],slant:(x,y,s)=>[[x,y],[x+42,y],[x+105,y+s*55]],post:(x,y,s)=>[[x,y],[x+112,y],[x+205,y+s*65]],corner:(x,y,s)=>[[x,y],[x+112,y+s*4],[x+205,y-s*46]],out:(x,y,s)=>[[x,y],[x+55,y],[x+70,y-s*55]],in:(x,y,s)=>[[x,y],[x+70,y],[x+115,y+s*50]],curl:(x,y,s)=>[[x,y],[x+100,y],[x+80,y+s*8]],drag:(x,y,s)=>[[x,y],[x+35,y+s*17],[x+125,y+s*90]],flat:(x,y,s)=>[[x,y],[x+22,y],[x+48,y-s*47]],wheel:(x,y,s)=>[[x,y],[x+38,y-s*55],[x+150,y-s*60]],screen:(x,y,s)=>[[x,y],[x+12,y-s*24],[x+43,y-s*30]],block:(x,y,s)=>[[x,y],[x+22,y]]};
const plays={};
function offensive(name,kind,concept,side){const pos=offensePositions,assignments={};const add=(id,action,points,extra={})=>assignments[id]={action,points,...extra};const run=kind==='run',outside=concept==='outside'||concept==='counter',direction=side==='bottom'?1:-1;const line=['LT','LG','C','RG','RT'];if(run){const lane=outside?direction<0?70:188:130;add('QB','handoff',[[135,130],[118,145]]);add('RB','carry',[[105,147],[145,147],[196,lane],[280,lane+(outside?direction*14:0)]],{lane});for(const id of line){const [x,y]=pos[id];const shift=outside?(direction<0?-25:25):concept==='counter'?-18:12;add(id,concept==='counter'&&id==='RG'?'pull_block':'run_block',[[x,y],[x+28,y+shift],[x+60,y+shift]]);}for(const id of ['WR1','WR2','WR3','TE']){const [x,y]=pos[id];add(id,'run_block',[[x,y],[x+26,y],[x+46,y+(y<130?-10:10)]]);} }else{add('QB',concept==='playaction'||concept==='boot'?'play_action':'pass_read',[[135,130],[118,130]]);for(const id of line){const [x,y]=pos[id];add(id,'pass_block',[[x,y],[x+18,y]]);}const map={quick:['slant','out','curl','flat','screen'],post:['post','streak','in','drag','flat'],vertical:['streak','streak','streak','streak','flat'],slant:['slant','slant','in','flat','wheel'],screen:['streak','screen','block','block','screen'],corner:['corner','post','out','flat','wheel'],playaction:['post','corner','drag','flat','block'],slantquick:['slant','out','slant','drag','flat'],screenwide:['screen','streak','block','block','screen'],temposlant:['slant','slant','flat','in','out'],mesh:['drag','drag','streak','corner','flat'],flood:['streak','out','corner','flat','wheel'],curlflat:['curl','curl','streak','flat','flat'],doublepost:['post','post','streak','drag','flat'],dagger:['streak','in','post','drag','flat'],cross:['post','in','cross','drag','wheel'],stick:['out','streak','slant','curl','flat'],hbscreen:['streak','post','block','block','screen'],boot:['post','corner','drag','flat','wheel'],wheel:['streak','post','slant','drag','wheel']};const routeSet=map[concept]||map.quick;['WR1','WR2','WR3','TE','RB'].forEach((id,i)=>{const [x,y]=pos[id],route=routeSet[i],s=y<130?1:-1;add(id,route==='block'?'pass_block':'route',routes[route==='cross'?'in':route](x,y,s),{route})})}return {name,side:'offense',kind,concept,formation:run?'I-Form / Singleback':'Shotgun / Spread',assignments}}
function defensive(name,concept){const pos=defensePositions,assignments={};const add=(id,action,points,extra={})=>assignments[id]={action,points,...extra};const rushers=concept==='allblitz'?['DE1','DT1','DT2','DE2','LB1','LB2','LB3']:concept==='cornerblitz'?['DE1','DT1','DT2','DE2','CB1']:concept==='dbblitz'?['DE1','DT1','DT2','DE2','CB1','CB2']:concept==='runblitz'||concept==='agap'?['DE1','DT1','DT2','DE2','LB1','LB2']:concept==='zoneblitz'||concept==='firezone'?['DE1','DT1','DE2','LB3']:['DE1','DT1','DT2','DE2'];rushers.forEach(id=>{const [x,y]=pos[id];add(id,'rush',[[x,y],[x-60,130]])});const coverage=['LB1','LB2','LB3','CB1','CB2','FS','SS'].filter(id=>!rushers.includes(id));if(concept==='cover2'){const targets={CB1:'WR1',CB2:'WR2',LB1:'WR3',LB2:'RB',LB3:'TE'};for(const [id,target] of Object.entries(targets)){const [x,y]=pos[id],dest=offensePositions[target];add(id,'man',[[x,y],[dest[0]+35,dest[1]]],{target})}for(const [id,cy] of [['FS',75],['SS',185]]){const [x,y]=pos[id];add(id,'zone',[[x,y],[455,cy]],{zone:{x:455,y:cy,rx:60,ry:38}})}return {name,side:'defense',concept:'cover2man',formation:'Cover 2 Man / Two Deep Safeties',assignments}}if(concept==='dbblitz'){const targets={LB1:'WR1',LB2:'TE',LB3:'WR2',FS:'WR3',SS:'RB'};for(const id of coverage){const [x,y]=pos[id],target=targets[id],dest=offensePositions[target];add(id,'man',[[x,y],[dest[0]+35,dest[1]]],{target})}return {name,side:'defense',concept,formation:'Double DB Pressure / Man Coverage',assignments}}const deep=['cover2','cover3','cover4','deep','cloud','trap','tampa','cover6','quarters','robber','spy','zoneblitz','firezone'].includes(concept);const man=['man','press','nickelman','cover1'].includes(concept);const targets={CB1:'WR1',CB2:'WR2',LB1:'RB',LB2:'TE',LB3:'WR3',FS:'WR1',SS:'WR2'};for(const id of coverage){const [x,y]=pos[id];if(concept==='spy'&&id==='LB2'){add(id,'spy',[[x,y],[245,130],[215,130]],{target:'QB'});continue}if(man){const t=targets[id],dest=offensePositions[t];add(id,'man',[[x,y],[dest[0]+35,dest[1]]],{target:t});continue}let cx=x+42,cy=y,rx=36,ry=26;if(concept==='cloud'&&id.startsWith('CB')){cx=280;rx=31;ry=24}if(concept==='trap'&&id.startsWith('CB')){cx=265;cy=id==='CB1'?80:180;rx=33;ry=27}if(id==='FS'||id==='SS'){cx=concept==='cover4'||concept==='deep'?475:concept==='cover3'?445:455;cy=id==='FS'?concept==='trap'?60:75:concept==='trap'?200:185;rx=concept==='cover4'?45:60;ry=38}if(concept==='runwall'){cx=260;rx=24;ry=22}if(concept==='cover3'&&id==='LB2'){cx=340;cy=130}add(id,'zone',[[x,y],[cx,cy]],{zone:{x:cx,y:cy,rx,ry}})}return {name,side:'defense',concept,formation:concept.includes('blitz')?'Pressure Front':'4-3 / Nickel',assignments}}
for(const [name,[kind,concept,side]] of Object.entries(OFFENSE))plays[name]=offensive(name,kind,concept,side);
for(const [name,concept] of Object.entries(DEFENSE))plays[name]=defensive(name,concept);
// Concept-specific tactical variations: never duplicate a preview simply to fill a package.
for(const p of Object.values(plays)){
 const a=p.assignments;
 if(p.side==='offense'){
   if(p.kind==='run'){
     const lane={power:155,zone:126,outside:65,dive:129,balanced:180,counter:80,draw:139,option:200}[p.concept]||130;
     const rb=a.RB;a.RB.points=[[105,147],[145,145],[199,lane],[290,lane+(p.concept==='outside'?-8:0)]];
     const blockShift={power:18,zone:8,outside:-26,dive:0,balanced:16,counter:-22,draw:0,option:25}[p.concept]||0;
     for(const id of ['LT','LG','C','RG','RT']){const [x,y]=offensePositions[id];a[id].points=[[x,y],[x+25,y+blockShift],[x+55,y+blockShift]];}
     if(p.concept==='counter'){a.RG.action='pull_block';a.RG.points=[[185,156],[157,165],[205,83]]}
     if(p.concept==='draw'){a.QB.points=[[135,130],[112,130],[130,145]]}
     if(p.concept==='option'){a.QB.action='option_read';a.QB.points=[[135,130],[175,158],[223,189]]}
     if(p.name==='HB Stretch'){a.RB.points=[[105,147],[145,150],[198,207],[290,221]];for(const id of ['RG','RT']){const [x,y]=offensePositions[id];a[id].points=[[x,y],[x+26,y+23],[x+58,y+29]]}}
     if(p.name==='Inside Run')a.RB.points=[[105,147],[145,147],[201,141],[275,142]];
     if(p.concept==='outside')for(const id of ['WR1','WR3']){const [x,y]=offensePositions[id];a[id].points=[[x,y],[x+30,y-10],[x+55,y-20]]}
   }else{
     if(p.concept==='screenwide'){a.WR1.points=routes.screen(...offensePositions.WR1,1);a.WR2.points=routes.screen(...offensePositions.WR2,-1)}
     if(p.concept==='hbscreen'){a.RB.points=[[105,147],[130,184],[185,205],[240,205]];a.TE.action='pass_block'}
     if(p.concept==='boot'){a.QB.points=[[135,130],[112,155],[153,183]]}
     if(p.concept==='temposlant')a.WR3.points=[[137,53],[190,70],[255,114]];
     if(p.concept==='slantquick')a.WR1.points=[[176,25],[212,43],[258,80]];
   }
 }else{
   const z=(id,x,y,rx,ry)=>{if(a[id]?.action==='zone'){a[id].zone={x,y,rx,ry};a[id].points=[[...defensePositions[id]],[x,y]]}};
   if(p.concept==='deep'){z('FS',505,68,48,37);z('SS',505,190,48,37)}
   if(p.concept==='cover4'){z('CB1',420,32,39,28);z('CB2',420,225,39,28);z('FS',485,90,37,30);z('SS',485,168,37,30)}
   if(p.concept==='tampa'){z('LB2',380,130,35,49)}
   if(p.concept==='quarters'){z('CB1',450,28,40,29);z('CB2',450,232,40,29)}
   if(p.concept==='cover6'){z('CB1',310,28,35,25);z('FS',485,70,50,38);z('SS',480,186,55,40)}
   if(p.concept==='robber'){z('SS',330,130,36,27)}
   if(p.concept==='firezone'){z('LB1',310,65,31,24);z('LB2',355,130,34,28)}
   if(p.concept==='zoneblitz'){z('CB1',330,30,33,24);z('FS',490,80,42,34)}
   if(p.concept==='contain')for(const id of ['DE1','DE2']){a[id].points=[[...defensePositions[id]],[180,id==='DE1'?50:210]]}
   if(p.concept==='runwall')for(const id of ['LB1','LB2','LB3'])z(id,240,defensePositions[id][1],24,22);
   if(p.concept==='agap')for(const id of ['LB1','LB2'])a[id].points=[[...defensePositions[id]],[190,130]];
   if(p.concept==='press')for(const id of ['CB1','CB2'])a[id].points=[[...defensePositions[id]],[198,offensePositions[a[id].target][1]]];
   if(p.concept==='nickelman'){a.LB3.action='man';a.LB3.target='WR3';a.LB3.points=[[...defensePositions.LB3],[210,53]]}
   if(p.concept==='cover1'){a.FS={action:'zone',points:[[405,84],[465,130]],zone:{x:465,y:130,rx:48,ry:36}}}
 }
}
// Assign every new play a tactical adjustment so concepts are distinct.
for(const p of Object.values(plays)){
 const a=p.assignments,hash=[...p.name].reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,7);
 if(p.side==='offense'){
  if(p.kind==='run'){
   const lane=/toss|sweep|reverse|pinpull|speedoption/.test(p.concept)?(p.name.includes('Weak')||p.name.includes('Jet')?55:207):/trap|wham/.test(p.concept)?118:/iso|draw/.test(p.concept)?139:169;
   a.RB.points=[[105,147],[143,145],[195,lane],[268+(hash%24),lane+((hash%9)-4)]];
   if(/toss|reverse|jet/.test(p.concept)){a.QB.action='pitch';a.QB.points=[[135,130],[120,147],[109,lane]]}
   if(/pinpull|trap/.test(p.concept)){a.LG.action='pull_block';a.LG.points=[[185,104],[164,128],[221,lane]]}
   if(/wham|splitzone/.test(p.concept)){a.TE.action='wham_block';a.TE.points=[[185,205],[207,158],[227,130]]}
   if(/option/.test(p.concept)){a.QB.action='option_read';a.QB.points=[[135,130],[177,140],[221,lane]]}
  }else{
   const names=['WR1','WR2','WR3','TE','RB'],patterns={
    pacross:['post','corner','drag','in','flat'],paflood:['streak','out','corner','flat','wheel'],pashot:['post','streak','corner','block','flat'],smash:['curl','corner','out','flat','wheel'],levels:['in','in','drag','out','flat'],spacing:['curl','out','slant','flat','screen'],drive:['in','drag','streak','curl','flat'],texas:['post','out','in','drag','slant'],slotfade:['out','post','streak','flat','wheel'],doublemove:['corner','post','streak','drag','flat'],seamread:['streak','post','streak','streak','flat'],shallow:['drag','drag','post','out','flat'],bubble:['screen','streak','screen','block','flat'],tunnel:['screen','post','screen','block','flat'],teseam:['post','corner','out','streak','flat'],rbangle:['streak','out','post','drag','slant']
   }[p.concept];
   if(patterns)names.forEach((id,i)=>{const [x,y]=offensePositions[id],route=patterns[i],sign=y<130?1:-1;a[id]={action:route==='block'?'pass_block':'route',points:routes[route](x,y,sign),route}});
   if(p.concept.startsWith('pa')){a.QB.action='play_action';a.QB.points=[[135,130],[108,148],[125,130]]}
   if(p.concept==='texas')a.RB.points=[[105,147],[158,182],[246,110]];
   if(p.concept==='bubble')a.WR3.points=[[137,53],[160,27],[196,24]];
  }
 }else{
  const pos=defensePositions;
  const rush=(id,x=148,y=130)=>{a[id]={action:'rush',points:[pos[id],[x,y]]}};
  const zone=(id,x,y,rx=36,ry=28)=>{a[id]={action:'zone',points:[pos[id],[x,y]],zone:{x,y,rx,ry}}};
  const man=(id,t)=>{a[id]={action:'man',points:[pos[id],[offensePositions[t][0]+28,offensePositions[t][1]]],target:t}};
  const c=p.concept;
  if(c==='zero'){rush('LB1');rush('LB2');for(const [id,t] of Object.entries({CB1:'WR1',CB2:'WR2',LB3:'RB',FS:'WR3',SS:'TE'}))man(id,t)}
  if(c==='invert2'){zone('CB1',455,55,52,38);zone('CB2',455,205,52,38);zone('FS',285,70);zone('SS',285,190)}
  if(c==='buzz3'){zone('FS',440,128,52,38);zone('SS',322,145,34,27)}
  if(c==='match3'){zone('FS',465,125,52,38);man('CB1','WR1');man('CB2','WR2')}
  if(c==='palms4'){zone('FS',480,70,43,33);zone('SS',480,190,43,33);zone('CB1',405,28);zone('CB2',405,230)}
  if(c==='sixtrap'){zone('CB1',270,73,30,27);zone('CB2',425,215,42,35);zone('FS',465,80,52,37)}
  if(c==='tamparobber'){zone('LB2',385,130,31,49);zone('SS',315,130,30,27)}
  if(c==='nickelblitz'){rush('CB2',160,155);zone('FS',460,75,49,37)}
  if(c==='safetyblitz'){rush('SS',150,130);zone('FS',450,125,55,42)}
  if(c==='crossdog'){rush('LB1',150,160);rush('LB3',150,95)}
  if(c==='doubleedge'){rush('LB1',150,55);rush('LB3',150,205)}
  if(c==='simpressure'){zone('DE1',310,55,28,24);rush('LB2')}
  if(c==='drop8'){for(const id of ['DE2','DT2','LB1','LB2','LB3','CB1','CB2','FS','SS'])zone(id,Math.min(495,pos[id][0]+80),pos[id][1],35,25)}
  if(c==='goalline'){for(const id of ['LB1','LB2','LB3'])rush(id,175,pos[id][1]);zone('FS',255,105,27,25);zone('SS',255,160,27,25)}
  if(c==='bear'){for(const id of ['LB1','LB2','LB3'])zone(id,230,pos[id][1],25,22)}
  if(c==='overright'){rush('LB3',150,185);rush('CB2',165,218)}
  if(c==='overleft'){rush('LB1',150,75);rush('CB1',165,40)}
  if(c==='prevent'){zone('CB1',485,35,48,34);zone('CB2',485,225,48,34);zone('FS',525,85,43,34);zone('SS',525,175,43,34);zone('LB2',400,130,39,30)}
 }
 // Distinct positional depth adjustment (not a visual-only offset): stored in assignments for AI and Unity.
 const anchor=p.side==='offense'?(p.kind==='run'?'RB':'WR1'):'LB2';
 const act=a[anchor];if(act?.points?.length>1){const last=act.points[act.points.length-1];act.points[act.points.length-1]=[last[0]+(hash%17),last[1]+(hash%13)-6];if(act.zone){act.zone.x=act.points.at(-1)[0];act.zone.y=act.points.at(-1)[1]}}
 // All 11 players must have one assignment, including dropped rushers.
 for(const [id,pos] of Object.entries(p.side==='offense'?offensePositions:defensePositions))if(!a[id])a[id]={action:'contain',points:[pos,[pos[0]+15,pos[1]]]};
}
// Reviewed Cover Three: 4-2-5 nickel, three deep thirds and two flats.
{
 const p=plays['Cover Three'];
 const positions={DE1:[215,78],DT1:[215,108],DT2:[215,153],DE2:[215,182],LB1:[285,105],LB2:[285,155],CB1:[224,28],CB2:[224,234],CB3:[224,190],FS:[405,130],SS:[350,75]};
 const a={},zone=(id,x,y,rx,ry)=>a[id]={action:'zone',points:[positions[id],[x,y]],zone:{x,y,rx,ry}};
 for(const id of ['DE1','DT1','DT2','DE2'])a[id]={action:'rush',points:[positions[id],[155,130]]};
 zone('CB1',455,42,44,37);zone('FS',455,130,44,37);zone('CB2',455,218,44,37);
 zone('SS',305,53,34,30);zone('CB3',305,210,34,30);
 zone('LB1',340,104,35,30);zone('LB2',340,156,35,30);
 p.assignments=a;p.positions=positions;p.formation='4-2-5 / Cover 3 (CB3 Flat)';p.concept='cover3reviewed';
}
// Reviewed Cover Four: 3-4 front, four deep quarters and four underneath zones.
{
 const p=plays['Cover Four'];
 const positions={DE1:[215,84],DT1:[215,130],DE2:[215,176],LB1:[278,57],LB2:[280,111],LB3:[280,151],LB4:[278,203],CB1:[224,28],CB2:[224,234],FS:[405,85],SS:[405,175]};
 const a={},zone=(id,x,y,rx,ry)=>a[id]={action:'zone',points:[positions[id],[x,y]],zone:{x,y,rx,ry}};
 for(const id of ['DE1','DT1','DE2'])a[id]={action:'rush',points:[positions[id],[155,130]]};
 zone('CB1',450,35,37,29);zone('FS',460,94,37,29);zone('SS',460,166,37,29);zone('CB2',450,225,37,29);
 zone('LB1',320,42,33,27);zone('LB4',320,218,33,27);
 zone('LB2',345,104,33,28);zone('LB3',345,156,33,28);
 p.assignments=a;p.positions=positions;p.formation='3-4 / Cover 4 Quarters';p.concept='cover4reviewed';
}
// Playbook Audit #5: explicit assignments and personnel alignment override generic variants.
{
 const p=plays['Cover Three'],pos=p.positions;
 pos.SS=[285,75];pos.CB3=[285,190];
 for(const id of ['SS','CB3'])p.assignments[id].points=[pos[id],[p.assignments[id].zone.x,p.assignments[id].zone.y]];
 p.assignments.SS.zoneRole='sideline';p.assignments.CB3.zoneRole='sideline';
}
{
 const p=plays['Deep Zone'],pos={...defensePositions},a=p.assignments;
 // Safeties are already in their deep coverage landmarks and hold those positions.
 for(const id of ['FS','SS']){const [x,y]=pos[id];a[id]={action:'zone',points:[[x,y],[x,y]],zone:{x,y,rx:43,ry:30},zoneRole:'deep'}}
 p.positions=pos;
}
{
 const p=plays['Goal Line Stand'],pos={...defensePositions,FS:[264,98],SS:[264,162]};
 p.positions=pos;
 for(const id of ['FS','SS']){const a=p.assignments[id];a.points=[pos[id],[a.zone.x,a.zone.y]];a.zoneRole='middle'}
}
{
 const p=plays['Drop Eight'],pos={...defensePositions},a=p.assignments;
 // DT2 replaces DE1 in the rush; three total rushers, eight in coverage.
 a.DT2={action:'rush',points:[pos.DT2,[155,130]]};
 a.DE1={action:'zone',points:[pos.DE1,[310,98]],zone:{x:310,y:98,rx:34,ry:28},zoneRole:'middle'};
 p.positions=pos;
}
{
 const p=plays['All-Out Pressure'],pos={...defensePositions,FS:[295,102],SS:[295,160]},a={};
 for(const [id,start] of Object.entries(pos))a[id]={action:'rush',points:[start,[155,130]]};
 p.positions=pos;p.assignments=a;p.formation='All-Out Pressure / 11 Rushers';
}
// Audit #6: Draw is explicitly a designed QB keeper, not an RB handoff.
{
 const p=plays['Draw'];
 p.ballCarrier='QB';p.formation='QB Draw / Designed Quarterback Run';
 p.assignments.QB={action:'carry',points:[[135,130],[121,130],[185,130],[280,130]],lane:130};
 p.assignments.RB={action:'run_block',points:[[105,147],[155,147],[215,151]]};
}
// Every pass concept has exactly one designated first read; other routes remain secondary.
for(const p of Object.values(plays)){
 if(p.side!=='offense'||p.kind!=='pass')continue;
 const eligible=['TE','WR1','WR2','WR3','RB'].filter(id=>p.assignments[id]?.action==='route');
 p.primaryReceiver=(p.name==='TE Seam'&&eligible.includes('TE'))?'TE':eligible.includes('WR1')?'WR1':eligible[0]||null;
 for(const [id,a] of Object.entries(p.assignments)){
  if(a.action==='route')a.read=id===p.primaryReceiver?'primary':'secondary';
 }
}
// Shared semantic play-art palette: applied to every offensive and defensive play.
const PLAY_COLORS={primary:'#FACC15',receiver:'#EF4444',alternate:'#22C55E',block:'#FFFFFF',deep:'#3B82F6',middle:'#FACC15',sideline:'#A855F7',blitz:'#EF4444',man:'#FACC15'};
function zoneRole(a){if(a.zoneRole)return a.zoneRole;const z=a.zone||{},start=a.points?.[0]||[0,130];if(z.x>=395)return 'deep';if(z.y<=75||z.y>=185)return 'sideline';return 'middle'}
function routeRole(p,id,a){if(a.action.includes('block'))return 'block';if(a.action==='route'){if(id===p.primaryReceiver)return 'primary';return a.route==='flat'||a.route==='screen'||a.route==='wheel'?'alternate':'receiver'}if(a.action==='carry'||a.action==='handoff')return 'primary';return 'alternate'}
function diagram(name){const p=plays[name];if(!p)return '';let out='';for(const [id,a] of Object.entries(p.assignments)){const clampField=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));const pts=a.action==='man'&&a.target&&offensePositions[a.target]?[a.points[0],offensePositions[a.target]].map(([x,y])=>[clampField(x,13,587),clampField(y,13,247)]):a.points.map(([x,y])=>[clampField(x,13,587),clampField(y,13,247)]);if(a.action==='zone'){const z=a.zone,role=zoneRole(a),tone=PLAY_COLORS[role],fill=role==='deep'?'#3B82F6':role==='middle'?'#FACC15':'#A855F7',rx=Math.min(z.rx,285),ry=Math.min(z.ry,117),zx=clampField(z.x,13+rx,587-rx),zy=clampField(z.y,13+ry,247-ry);if(pts.length>1){out+='<polyline points="'+pts.map(v=>v.join(',')).join(' ')+'" fill="none" stroke="'+tone+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';}out+='<ellipse cx="'+zx+'" cy="'+zy+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" fill-opacity=".16" stroke="'+tone+'" stroke-dasharray="5 4" stroke-width="2"/>';continue}const color=p.side==='defense'?(a.action==='rush'?PLAY_COLORS.blitz:a.action==='man'?PLAY_COLORS.man:PLAY_COLORS.middle):PLAY_COLORS[routeRole(p,id,a)];out+='<polyline points="'+pts.map(v=>v.join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" '+(a.action==='man'?'stroke-dasharray="1 7" stroke-width="3.5"':'')+'/>';const tail=pts.at(-1),prev=pts.at(-2);if(tail&&prev&&a.action!=='man'){const angle=Math.atan2(tail[1]-prev[1],tail[0]-prev[0]);const wing=0.48,len=11;const left=[tail[0]-len*Math.cos(angle-wing),tail[1]-len*Math.sin(angle-wing)],right=[tail[0]-len*Math.cos(angle+wing),tail[1]-len*Math.sin(angle+wing)];out+='<path d="M'+left.join(' ')+' L'+tail.join(' ')+' L'+right.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'}}return out}
return {plays,offensePositions,defensePositions,diagram,count:Object.keys(plays).length};
})();