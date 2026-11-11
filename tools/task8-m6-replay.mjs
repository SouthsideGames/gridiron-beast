#!/usr/bin/env node
// Full deterministic gameplay outcomes, not generation-only replay.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const output = process.argv.find(x=>x.startsWith('--out='))?.slice(6) || 'docs/task8/m6/gameplay-replay.json';
const source = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
import { createHash } from 'node:crypto';
import { generatedTeam } from '../src/franchise/roster.js';
import { playGame } from '../src/sim/game-runner.js';
import { runBattle,autoLineup,snapMonster } from '../src/franchise/clash-link.js';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rows=[];
for(let seed=1;seed<=100;seed++){
 const game=()=>{const home=generatedTeam(seed*23,{id:'DH',name:'Replay Home',abbr:'DH',quality:62}),away=generatedTeam(seed*23+1,{id:'DA',name:'Replay Away',abbr:'DA',quality:62});const h=createHash('sha256');const s=playGame({home,away,seed:890000+seed,quarterLength:180,onStep:e=>h.update(JSON.stringify(e))});return {steps:h.digest('hex'),final:sha(s),finished:s.finished,guard:!!s.guard};};
 const a=game(),b=game();
 const battle=()=>{const home=generatedTeam(seed*23,{id:'DH',name:'Replay Home',abbr:'DH',quality:62}),away=generatedTeam(seed*23+1,{id:'DA',name:'Replay Away',abbr:'DA',quality:62});return runBattle({a:autoLineup(home.roster,3,seed).map(m=>snapMonster(m)),b:autoLineup(away.roster,3,seed+1).map(m=>snapMonster(m)),seed:990000+seed,mode:'skip',ruleset:'t8',context:'standalone'});};
 const c=battle(),d=battle();rows.push({seed,football:JSON.stringify(a)===JSON.stringify(b),footballFinished:a.finished&&!a.guard,footballHash:a.final,footballStepHash:a.steps,clash:sha(c)===sha(d),clashFinished:!c.pending,clashHash:sha(c)});
}
const out={source,scope:'100 identical-input comparisons per mode; full football step outputs/frames/events and final state; full t8 standalone Clash result, execution and performance records. Not a save/reload UI test.',seeds:[1,100],footballPass:rows.filter(r=>r.football&&r.footballFinished).length,clashPass:rows.filter(r=>r.clash&&r.clashFinished).length,rows};fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,rows:undefined}));process.exitCode=out.footballPass===100&&out.clashPass===100?0:1;
