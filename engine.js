window.GridironEngine=(function(){
const OFF=[['WR1',176,26],['LT',185,75],['LG',185,102],['C',185,129],['RG',185,156],['RT',185,183],['TE',185,213],['WR2',176,239],['QB',126,129],['RB',91,151],['WR3',128,48]];
const DEF=[['DE1',214,70],['DT1',214,110],['DT2',214,148],['DE2',214,186],['LB1',273,75],['LB2',273,130],['LB3',273,190],['CB1',280,26],['CB2',280,238],['FS',363,100],['SS',363,171]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
function move(a,b,v){const d=distance(a,b);if(d>0){a.x+=(b.x-a.x)/d*Math.min(v,d);a.y+=(b.y-a.y)/d*Math.min(v,d)}}
function simulate(play='Quick Pass',defense='Cover Two',seed=1,ratings={},options={}){
let seedValue=seed>>>0;const rng=()=>{seedValue=(Math.imul(seedValue,1664525)+1013904223)>>>0;return seedValue/4294967296};const off=OFF.map(([id,x,y])=>({id,x,y,speed:(.85+rng()*.3)*(.8+(ratings[id]||65)/325)})),packagePositions=window.GridironPlays?.plays?.[defense]?.positions,def=(packagePositions?Object.entries(packagePositions).map(([id,[x,y]])=>[id,x,y]):DEF).map(([id,x,y])=>({id,x,y,homeX:x,homeY:y,speed:.85+rng()*.3}));
const playDef=window.GridironPlays?.plays?.[play],defDef=window.GridironPlays?.plays?.[defense];const find=id=>off.find(p=>p.id===id),qb=find('QB'),run=playDef?playDef.kind==='run':/run|power|zone/i.test(play),deep=/deep|post|vertical/i.test(play),blitz=defDef?Object.values(defDef.assignments).filter(a=>a.action==='rush').length>4:/blitz|fire|pressure/i.test(defense),man=defDef?Object.values(defDef.assignments).some(a=>a.action==='man'):/man|lock|press/i.test(defense);
let holder='QB',ball={x:qb.x,y:qb.y},phase='held',target=null,flight=0,throwStart=null,throwEnd=null,frames=[],result='',events=[],brokenTackles=new Set(),carryTicks=0,laneY=null;
const dt=.075,catchTargets=deep?['WR1','WR2','WR3']:['WR1','WR2','WR3','TE'];
for(let tick=0;tick<320;tick++){
const time=tick*dt;
for(const p of off){const id=p.id;if(phase==='carried'&&id!==holder&&id!=='QB'){const runner=find(holder),candidates=def.filter(d=>d.x>=p.x-22&&distance(d,runner)<180).sort((a,b)=>distance(a,runner)-distance(b,runner));const defender=candidates[0];if(defender){const lead={x:Math.min(575,defender.x-12),y:defender.y};move(p,lead,(id.startsWith('WR')||id==='TE'?3.5:2.7)*p.speed)}else move(p,{x:Math.min(575,runner.x+24),y:runner.y+(p.y<runner.y?-22:22)},2.8*p.speed);continue}if(['LT','LG','C','RG','RT'].includes(id)){p.x+=.4;continue}if(id==='QB'){if(run&&playDef?.ballCarrier==='QB'){const pts=playDef.assignments.QB.points;const next=pts[Math.min(pts.length-1,time<.4?1:time<1.6?2:3)];move(p,{x:next[0],y:next[1]},time<.4?3:4.5)}else p.x-=run?0:.12;continue}
if(id==='RB'&&run&&playDef?.ballCarrier!=='QB'){const pts=playDef?.assignments?.RB?.points;const next=pts?.[Math.min(pts.length-1,time<.4?1:time<1.6?2:3)];move(p,time<.4?{x:qb.x+12,y:qb.y+8}:next?{x:next[0],y:next[1]}:{x:510,y:145},time<.4?5.5:4.5);continue}
const points=playDef?.assignments?.[id]?.points,stepIndex=Math.min((points?.length||1)-1,time<.9?1:time<2.0?2:3),waypoint=points?.[stepIndex];const sign=p.y<130?1:-1,route=waypoint?{x:waypoint[0],y:waypoint[1]}:deep?{x:490,y:p.y+sign*22}:{x:355,y:p.y+sign*52};
move(p,id==='RB'&&!waypoint?{x:275,y:170}:route,(id.startsWith('WR')?3.4:2.4)*p.speed)}
for(const p of off){p.x=clamp(p.x,12,588);p.y=clamp(p.y,15,245)}
const rushers=defDef?Object.entries(defDef.assignments).filter(([,a])=>a.action==='rush').map(([id])=>id):blitz?['DE1','DT1','DT2','DE2','LB1','CB1']:['DE1','DT1','DT2','DE2'];
const manTargets={LB1:'RB',LB2:'TE',LB3:'WR3',CB1:'WR1',CB2:'WR2',FS:'WR1',SS:'WR2'};
for(const d of def){let aim;if(rushers.includes(d.id))aim=phase==='carried'?find(holder):qb;else if(phase==='carried'&&distance(d,find(holder))<105)aim=find(holder);else if(defDef?.assignments?.[d.id]?.action==='spy')aim=qb;else if(defDef?.assignments?.[d.id]?.action==='man')aim=find(defDef.assignments[d.id].target||'WR1');else if(defDef?.assignments?.[d.id]?.action==='zone'){const z=defDef.assignments[d.id].zone;aim={x:z.x,y:z.y}}else if(man)aim=find(manTargets[d.id]||'WR1');else aim={x:d.homeX+40,y:d.homeY};move(d,aim,(2.2+(d.id.startsWith('CB')?.9:0))*d.speed)}
for(const d of def){d.x=clamp(d.x,12,588);d.y=clamp(d.y,15,245)}
if(phase==='carried'){const runner=find(holder);for(const p of off){if(p.id===holder||p.id==='QB'&&holder!=='QB')continue;const nearest=def.filter(d=>distance(d,p)<19&&distance(d,runner)<125).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(nearest){nearest.x=clamp(nearest.x-1.3,12,588);nearest.speed=Math.max(.6,nearest.speed*.986)}}}
for(const o of off.filter(p=>['LT','LG','C','RG','RT'].includes(p.id))){for(const d of def.filter(p=>rushers.includes(p.id))){if(distance(o,d)<22){d.x+=1.8;d.speed=Math.max(.55,d.speed*.995)}}}
if(run&&time>.3){phase='carried';holder=playDef?.ballCarrier==='QB'?'QB':'RB'}
if(!run&&phase==='held'&&time>1.15){const available=(options.target==='RB'?[...catchTargets,'RB']:catchTargets).map(id=>find(id)),awareness=clamp(options.awareness??ratings.QB??65,0,99),openScore=p=>{const nearest=Math.min(...def.map(d=>distance(d,p)));const separation=nearest+Math.max(0,p.x-185)*.08;return separation};const forced=options.target&&available.find(p=>p.id===options.target);if(forced){target=forced}else{const ranked=available.slice().sort((a,b)=>openScore(b)-openScore(a)),primary=available.find(p=>p.id===playDef?.primaryReceiver),primarySafe=primary&&openScore(primary)>=23;const usePrimary=primarySafe&&rng()<(.45+awareness*.004);const findBest=rng()<(.18+awareness*.008);target=usePrimary?primary:findBest?ranked[0]:ranked[Math.floor(rng()*Math.min(3,ranked.length))]};throwStart={...qb};throwEnd={x:target.x+9+(rng()-.5)*34,y:target.y+(rng()-.5)*26};phase='air';holder=null;events.push('Pass toward '+target.id)}
if(phase==='air'){flight+=dt;const t=clamp(flight/.6,0,1);ball.x=throwStart.x+(throwEnd.x-throwStart.x)*t;ball.y=throwStart.y+(throwEnd.y-throwStart.y)*t;if(t>=1){if(distance(ball,target)<30&&Math.min(...def.map(d=>distance(d,ball)))>15){phase='carried';holder=target.id;events.push(target.id+' caught the pass')}else{const nearest=def.map(d=>({d,dist:distance(d,ball)})).sort((a,b)=>a.dist-b.dist)[0];if(nearest?.dist<22&&rng()<.32){result='interception';events.push(nearest.d.id+' intercepts the pass')}else{result='incomplete';events.push('Pass falls incomplete')}}}}
if(phase==='held'){ball.x=qb.x;ball.y=qb.y}
if(phase==='carried'){carryTicks++;const runner=find(holder);if(holder==='RB'){const awareness=clamp(options.rbAwareness??ratings.RB??65,0,99);if(laneY===null||carryTicks%8===1){const lanes=[-40,-20,0,20,40].map(d=>{const y=clamp(runner.y+d,20,240),ahead={x:runner.x+35,y};return {y,score:off.filter(p=>p.id!=='RB'&&p.id!=='QB'&&distance(p,ahead)<40).length*1.2-def.filter(p=>distance(p,ahead)<45).length*2-Math.abs(d)*.005}}).sort((a,b)=>b.score-a.score);laneY=(rng()<(.15+awareness*.008)?lanes[0]:lanes[Math.floor(rng()*3)]).y}runner.y=clamp(runner.y+clamp(laneY-runner.y,-2,2),15,245)}const rating=clamp(ratings[holder]||65,35,99);const skill=(rating-35)/64;const closest=def.filter(d=>distance(d,runner)<17&&!brokenTackles.has(d.id)).sort((a,b)=>distance(a,runner)-distance(b,runner))[0];if(closest){const chance=.06+skill*.31+(holder==='RB'?.08:0);if(rng()<chance){brokenTackles.add(closest.id);closest.x+=22;closest.y+=closest.y<runner.y?-16:16;events.push(holder+(rng()<.5?' breaks a tackle':' stiff-arms '+closest.id))}else if(carryTicks>2){result='tackle';events.push(closest.id+' tackles '+holder)}}if(!result&&closest&&carryTicks>2&&rng()<(.004+(100-rating)*.00018)){result='fumble';events.push(closest.id+' forces a fumble on '+holder+'; defense recovers')}if(!result){const runSpeed=(3.4+skill*2.8)*runner.speed;runner.x=Math.min(550,runner.x+runSpeed);ball.x=runner.x;ball.y=runner.y;if(ball.x>=550){result='touchdown';events.push(holder+' reaches the end zone')}else if(runner.y<=15||runner.y>=245){result='out_of_bounds';events.push(holder+' steps out of bounds')}else if(carryTicks>48&&def.some(d=>distance(d,runner)<21)){result='tackle';events.push('Defense brings down '+holder+' after extended run')}}}
if(phase==='held'&&def.some(d=>rushers.includes(d.id)&&distance(d,qb)<17)){result='sack';events.push('Quarterback sacked')}
frames.push({off:off.map(p=>[p.id,+p.x.toFixed(1),+p.y.toFixed(1)]),def:def.map(p=>[p.id,+p.x.toFixed(1),+p.y.toFixed(1)]),ball:[+ball.x.toFixed(1),+ball.y.toFixed(1)],holder,phase});
if(result)break}
if(!result){if(phase==='carried'){const runner=find(holder),nearest=def.map(d=>({d,dist:distance(d,runner)})).sort((a,b)=>a.dist-b.dist)[0];if(nearest){nearest.d.x=runner.x;nearest.d.y=runner.y;events.push(nearest.d.id+' tackles '+holder+' after extended pursuit');result='tackle'}else{result='out_of_bounds';runner.y=runner.y<130?15:245;events.push(holder+' runs out of bounds')}}else{result=phase==='held'?'sack':'incomplete';events.push(result==='sack'?'Quarterback sacked':'Pass incomplete')}}
const last=frames[frames.length-1],yards=['tackle','touchdown','sack','fumble','out_of_bounds'].includes(result)?clamp(Math.round((last.ball[0]-185)/5),-15,70):0;
return {play,defense,seed,frames,result,yards,events,holder,target:target?.id||null,flip:!!options.flip};
}
function render(sim,i,options={}){
 const f=sim.frames[clamp(i,0,sim.frames.length-1)];
 const flip=y=>options.flip?260-y:y,dir=x=>options.fieldSpot!=null?options.fieldSpot+(options.fieldSign||1)*(x-185):options.direction==='left'?600-x:x;
 const safe=(v,min,max)=>clamp(v,min,max);
 let svg='<defs><clipPath id="gbPitchClip"><rect x="1" y="1" width="598" height="258"/></clipPath></defs>';
 svg+='<rect width="600" height="260" fill="#226647"/>';
 for(let j=0;j<=12;j++)svg+='<line x1="'+j*50+'" x2="'+j*50+'" y1="0" y2="260" stroke="white" stroke-opacity=".17"/>';
 svg+='<line x1="'+dir(185)+'" x2="'+dir(185)+'" y1="0" y2="260" stroke="#f5d66c" stroke-width="3"/>';
 if(options.stadiumArt)svg+='<g transform="scale(1 .928571)">'+options.stadiumArt+'</g>';
 svg+='<g clip-path="url(#gbPitchClip)">';
 // Ball carrier and all players are drawn above field markings and route overlays.
 for(const [id,originalX,originalY] of f.off){
  const x=safe(dir(originalX),13,587),y=safe(flip(originalY),13,247);
  svg+='<circle cx="'+x+'" cy="'+y+'" r="11" fill="'+(options.defensiveView?'#f18c82':'#74c5ff')+'" stroke="'+(f.holder===id?'#ffe26c':'white')+'" stroke-width="2"/><text x="'+x+'" y="'+(y+3)+'" text-anchor="middle" font-size="8" font-weight="bold" fill="#10212c">'+id+'</text>';
 }
 for(const [id,originalX,originalY] of f.def){
  const x=safe(dir(originalX),12,588),y=safe(flip(originalY),12,248);
  svg+='<rect x="'+(x-11)+'" y="'+(y-10)+'" width="22" height="20" rx="3" fill="'+(options.defensiveView?'#74c5ff':'#f18c82')+'" stroke="white"/><text x="'+x+'" y="'+(y+3)+'" text-anchor="middle" font-size="8" fill="#10212c">'+id+'</text>';
 }
 svg+='<ellipse cx="'+safe(dir(f.ball[0])+8,8,592)+'" cy="'+safe(flip(f.ball[1])-6,8,252)+'" rx="8" ry="5" fill="#e6a455" stroke="white"/>';
 svg+='</g>';
 if(i===sim.frames.length-1)svg+='<rect x="375" y="8" width="215" height="32" rx="6" fill="#102b27"/><text x="482" y="29" text-anchor="middle" font-size="15" fill="white">'+sim.yards+' YDS · '+sim.result.toUpperCase()+'</text>';
 return svg
}
return {simulate,render,version:'1.0'};
})();