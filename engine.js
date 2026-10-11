window.GridironEngine=(function(){
const OFF=[['WR1',176,26],['LT',185,75],['LG',185,102],['C',185,129],['RG',185,156],['RT',185,183],['TE',185,213],['WR2',176,239],['QB',126,129],['RB',91,151],['WR3',128,48]];
const DEF=[['DE1',214,70],['DT1',214,110],['DT2',214,148],['DE2',214,186],['LB1',273,75],['LB2',273,130],['LB3',273,190],['CB1',280,26],['CB2',280,238],['FS',363,100],['SS',363,171]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
function move(a,b,v){const d=distance(a,b);if(d>0){a.x+=(b.x-a.x)/d*Math.min(v,d);a.y+=(b.y-a.y)/d*Math.min(v,d)}}
function simulate(play='Quick Pass',defense='Cover Two',seed=1){
let seedValue=seed>>>0;const rng=()=>{seedValue=(Math.imul(seedValue,1664525)+1013904223)>>>0;return seedValue/4294967296};const off=OFF.map(([id,x,y])=>({id,x,y,speed:.85+rng()*.3})),def=DEF.map(([id,x,y])=>({id,x,y,homeX:x,homeY:y,speed:.85+rng()*.3}));
const find=id=>off.find(p=>p.id===id),qb=find('QB'),run=/run|power|zone/i.test(play),deep=/deep|post|vertical/i.test(play),blitz=/blitz|fire|pressure/i.test(defense),man=/man|lock|press/i.test(defense);
let holder='QB',ball={x:qb.x,y:qb.y},phase='held',target=null,flight=0,throwStart=null,throwEnd=null,frames=[],result='',events=[];
const dt=.075,catchTargets=['WR1','WR2','WR3','TE','RB'];
for(let tick=0;tick<92;tick++){
const time=tick*dt;
for(const p of off){const id=p.id;if(['LT','LG','C','RG','RT'].includes(id)){p.x+=.4;continue}if(id==='QB'){p.x-=run?0:.12;continue}
if(id==='RB'&&run){move(p,time<.4?{x:qb.x+12,y:qb.y+8}:{x:510,y:145},time<.4?5.5:4.5);continue}
const sign=p.y<130?1:-1,route=deep?{x:490,y:p.y+sign*22}:{x:355,y:p.y+sign*52};
move(p,id==='RB'?{x:275,y:170}:route,(id.startsWith('WR')?3.4:2.4)*p.speed)}
const rushers=blitz?['DE1','DT1','DT2','DE2','LB1','CB1']:['DE1','DT1','DT2','DE2'];
const manTargets={LB1:'RB',LB2:'TE',LB3:'WR3',CB1:'WR1',CB2:'WR2',FS:'WR1',SS:'WR2'};
for(const d of def){let aim;if(rushers.includes(d.id))aim=phase==='carried'?find(holder):qb;else if(phase==='carried'&&distance(d,find(holder))<105)aim=find(holder);else if(man)aim=find(manTargets[d.id]||'WR1');else aim={x:d.homeX+40,y:d.homeY};move(d,aim,(2.2+(d.id.startsWith('CB')?.9:0))*d.speed)}
for(const o of off.filter(p=>['LT','LG','C','RG','RT'].includes(p.id))){for(const d of def.filter(p=>rushers.includes(p.id))){if(distance(o,d)<22)d.x+=1.8}}
if(run&&time>.3){phase='carried';holder='RB'}
if(!run&&phase==='held'&&time>1.45){target=catchTargets.map(id=>find(id)).sort((a,b)=>Math.min(...def.map(d=>distance(d,b)))-Math.min(...def.map(d=>distance(d,a))))[0];throwStart={...qb};throwEnd={x:target.x+9,y:target.y};phase='air';holder=null;events.push('Pass toward '+target.id)}
if(phase==='air'){flight+=dt;const t=clamp(flight/.6,0,1);ball.x=throwStart.x+(throwEnd.x-throwStart.x)*t;ball.y=throwStart.y+(throwEnd.y-throwStart.y)*t;if(t>=1){if(distance(ball,target)<30&&Math.min(...def.map(d=>distance(d,ball)))>15){phase='carried';holder=target.id;events.push(target.id+' caught the pass')}else{result='incomplete';events.push('Pass falls incomplete')}}}
if(phase==='held'){ball.x=qb.x;ball.y=qb.y}
if(phase==='carried'){ball.x=find(holder).x;ball.y=find(holder).y;const tackler=def.find(d=>distance(d,find(holder))<17);if(tackler){result='tackle';events.push(tackler.id+' tackled '+holder)}else if(ball.x>=550)result='touchdown'}
if(phase==='held'&&def.some(d=>rushers.includes(d.id)&&distance(d,qb)<17)){result='sack';events.push('Quarterback sacked')}
frames.push({off:off.map(p=>[p.id,+p.x.toFixed(1),+p.y.toFixed(1)]),def:def.map(p=>[p.id,+p.x.toFixed(1),+p.y.toFixed(1)]),ball:[+ball.x.toFixed(1),+ball.y.toFixed(1)],holder,phase});
if(result)break}
if(!result)result=phase==='carried'?'tackle':phase==='held'?'sack':'incomplete';
const last=frames[frames.length-1],yards=['tackle','touchdown','sack'].includes(result)?clamp(Math.round((last.ball[0]-185)/5),-15,70):0;
return {play,defense,seed,frames,result,yards,events,holder};
}
function render(sim,i){const f=sim.frames[clamp(i,0,sim.frames.length-1)];let svg='<rect width="600" height="260" fill="#226647"/>';for(let j=0;j<=12;j++)svg+='<line x1="'+j*50+'" x2="'+j*50+'" y1="0" y2="260" stroke="white" stroke-opacity=".17"/>';svg+='<line x1="185" x2="185" y1="0" y2="260" stroke="#f5d66c" stroke-width="3"/>';
for(const [id,x,y] of f.off)svg+='<circle cx="'+x+'" cy="'+y+'" r="11" fill="#74c5ff" stroke="'+(f.holder===id?'#ffe26c':'white')+'" stroke-width="2"/><text x="'+x+'" y="'+(y+3)+'" text-anchor="middle" font-size="8" font-weight="bold">'+id+'</text>';
for(const [id,x,y] of f.def)svg+='<rect x="'+(x-11)+'" y="'+(y-10)+'" width="22" height="20" rx="3" fill="#f18c82" stroke="white"/><text x="'+x+'" y="'+(y+3)+'" text-anchor="middle" font-size="8">'+id+'</text>';
svg+='<ellipse cx="'+(f.ball[0]+8)+'" cy="'+(f.ball[1]-6)+'" rx="8" ry="5" fill="#e6a455" stroke="white"/>';
if(i===sim.frames.length-1)svg+='<rect x="375" y="8" width="215" height="32" rx="6" fill="#102b27"/><text x="482" y="29" text-anchor="middle" font-size="15" fill="white">'+sim.yards+' YDS · '+sim.result.toUpperCase()+'</text>';
return svg}
return {simulate,render,version:'1.0'};
})();