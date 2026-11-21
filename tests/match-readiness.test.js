import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {presnapReadiness} from '../src/ui/fx/match-fx.js';
import {fieldSvg,presnapLook} from '../src/ui/field-view.js';
import {overheadSvg} from '../src/ui/fx/overhead.js';

test('selection bars read current ability state on both teams without mutating or leaking off-field slots',()=>{
 const state={phase:'scrimmage',possession:'away',t8:{ability:{a:{charges:2,ignited:false},b:{cd:2},bench:{charges:1}},touchdowns:{}}};
 const teams={away:{offense:{QB:{id:'a',species:'emberfox',type:'Fire'},BENCH:{id:'bench',species:'emberfox',type:'Fire'}}},home:{defense:{DL1:{id:'b',species:'hailfang',type:'Ice'}}}};
 const before=JSON.stringify({state,teams}),hud=presnapReadiness(state,teams);
 assert.equal(hud['off:QB'].charge.n,2);assert.equal(hud['def:DL1'].charge.cd,2);
 const presnap={offensePlay:presnapLook('quick_slants'),defensePlay:presnapLook('cover_1')};
 const selecting=fieldSvg({ballOn:40,presnap,readinessHud:hud});
 assert.equal((selecting.match(/class="ability-readiness"/g)||[]).length,2,'bench beast has no marker');
 assert.doesNotMatch(selecting,/NaN/);
 const frame={t:0,off:[['QB',0,0]],def:[['DL1',1,0]],ball:[0,0,0]};
 assert.doesNotMatch(fieldSvg({ballOn:40,presnap,frame,readinessHud:hud}),/ability-readiness/,'live/replay frames hide selection bars');
 assert.equal(presnapReadiness({...state,phase:'kickoff'},teams),null);
 assert.equal(presnapReadiness({...state,finished:true},teams),null);
 assert.equal(JSON.stringify({state,teams}),before);
});
test('hiding live charge UI retains status badges and stamina warnings',()=>{
 const state={hud:{'off:QB':{charge:{n:1,max:3},status:{id:'slowed',remaining:2},battery:true}},items:[],badges:[],spends:[]};
 for(const t of [0,1.2,2.4,3.6]) {
  const svg=overheadSvg(state,t,()=>[10,20]);
  assert.doesNotMatch(svg,/ability-readiness/);assert.ok(svg.length);
 }
});
test('match replays no longer render the QB read list or read ring',()=>{
 const source=fs.readFileSync(new URL('../src/ui/screens/match.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/qbReadPanelHtml|qb_reads_on_this_play/);
 assert.match(source,/qbRead: false/);
});
