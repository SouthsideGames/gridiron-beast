#!/usr/bin/env node
// Production AI games, Dex-generated teams; recording only. No tuning.
import fs from 'node:fs';
import path from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=path.resolve(args.root||path.join(path.dirname(new URL(import.meta.url).pathname),'..'));
const {generatedTeam}=await import(path.join(root,'src/franchise/roster.js'));
const {playGame}=await import(path.join(root,'src/sim/game-runner.js'));
const {pancakeConstants}=await import(path.join(root,'src/sim/t8/pancake.js'));
const {createRng}=await import(path.join(root,'src/core/rng.js'));
const games=[];
for(let seed=1;seed<=100;seed++){
 const quality=[52,62,72][(seed-1)%3];const home=generatedTeam(seed*17,{id:'PH',name:'Pancake Home',abbr:'PH',quality}),away=generatedTeam(seed*17+1,{id:'PA',name:'Pancake Away',abbr:'PA',quality});
 const row={seed,quality,steps:0,scrimmagePlays:0,attempts:0,ordinarySuccess:0,guaranteed:0,abilityKnockdowns:0,lost:0,ordinarySheds:0,baseSuccess:0,baseAttempts:0,packageSuccess:0,statsPancakes:0,statsAttempts:0,abilityAttempts:0};
 const state=playGame({home,away,seed:700000+seed,quarterLength:180,onStep:ev=>{
  row.steps++;if(!ev?.sim||!['play','try'].includes(ev.kind))return;const sim=ev.sim;row.scrimmagePlays++;
  for(const slot of ['LG','RG','C']){const b=sim.stats?.blockers?.[slot];row.attempts+=b?.pancakeAttempts||0;row.statsAttempts+=b?.pancakeAttempts||0;row.statsPancakes+=b?.pancakes||0;if(slot!=='C')row.baseAttempts+=b?.pancakeAttempts||0;}
  for(const e of sim.events||[]){
   if(e.ability==='DRA-04-F'&&['pancake','ability'].includes(e.kind)&&typeof e.accepted==='boolean'&&['LG','RG','C'].includes(e.by)){row.abilityAttempts++;row.attempts--;if(e.by!=='C')row.baseAttempts--;}
   if(e.kind==='pancake'&&['LG','RG','C'].includes(e.by)){if(e.ability){row.abilityKnockdowns++;continue;}if(e.guaranteed){row.guaranteed++;row.attempts--;if(e.by!=='C')row.baseAttempts--;}else{row.ordinarySuccess++;if(e.by==='C')row.packageSuccess++;else row.baseSuccess++;}}
   if(e.kind==='stumble'&&['LG','RG','C'].includes(e.by)&&!e.ability)row.lost++;
   if(e.kind==='shed'&&!e.ability)row.ordinarySheds++;
  }
 }});row.finished=state.finished;row.score=state.score;games.push(row);
}
const total=games.reduce((n,r)=>{for(const k of ['scrimmagePlays','attempts','ordinarySuccess','guaranteed','abilityKnockdowns','lost','ordinarySheds','baseSuccess','baseAttempts','packageSuccess'])n[k]=(n[k]||0)+r[k];return n;},{});
const metrics={ordinaryPancakesPerBaseStartingOLGame:total.baseSuccess/(100*2*2),ordinarySuccessRate:total.attempts?total.ordinarySuccess/total.attempts:null,lostBlockPerAttempt:total.attempts?total.lost/total.attempts:null};
const brng=createRng(88041),samples={frequency:[],success:[],lost:[]};
for(let b=0;b<2000;b++){let base=0,success=0,attempts=0,lost=0;for(let j=0;j<games.length;j++){const r=games[brng.int(games.length)];base+=r.baseSuccess;success+=r.ordinarySuccess;attempts+=r.attempts;lost+=r.lost;}samples.frequency.push(base/(games.length*4));samples.success.push(success/attempts);samples.lost.push(lost/attempts);}
const ci=a=>{a.sort((a,b)=>a-b);return [a[Math.floor(a.length*.025)],a[Math.ceil(a.length*.975)-1]];};
const bootstrap95=Object.fromEntries(Object.entries(samples).map(([k,a])=>[k,ci(a)]));
const out={source:'f716b02c41c81211d80e7389dc0cefd4c16ae155',label:args.label||'production defaults',productionChanges:false,diagnosticOverride:!!args.root,constants:pancakeConstants(),manifest:{seeds:[1,100],qualityCycle:[52,62,72],quarterLength:180,teams:'production generatedTeam, full Dex abilities on, real playbooks and AI',scope:'scrimmage and two-point plays only; kickoffs excluded; base OL = LG/RG; package C separate; guaranteed ability pancakes excluded from ordinary attempts/successes; Dragon Stomp attempts (including rejected applications) and knockdowns counted separately and removed from ordinary attempts/successes'},games:games.length,finished:games.filter(g=>g.finished).length,totals:total,metrics,bootstrap95,recordingChecks:{eventTotalsMatchStats:games.every(g=>g.ordinarySuccess+g.guaranteed+g.abilityKnockdowns===g.statsPancakes),attemptTotalsMatchStats:games.every(g=>g.attempts+g.guaranteed+g.abilityAttempts===g.statsAttempts),validAttemptCounts:games.every(g=>g.attempts>=g.ordinarySuccess+g.lost)},targets:{pancakesPerStartingOLGame:[.2,.6],successRate:[.3,.5],lostBlockPerAttemptMax:.15},meets:{frequency:metrics.ordinaryPancakesPerBaseStartingOLGame>=.2&&metrics.ordinaryPancakesPerBaseStartingOLGame<=.6,success:metrics.ordinarySuccessRate>=.3&&metrics.ordinarySuccessRate<=.5,recovery:metrics.lostBlockPerAttempt<=.15},limitations:['One hundred independent generated matchups, not a league season weighted distribution','Guaranteed ability outcomes separated; other abilities still influence normal game opportunities','Shed count reported separately, not charged as pancake failures','No production constant tuning performed'],rows:games};
fs.writeFileSync(args.out||'docs/task8/m6/pancake-games.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,rows:undefined}));
