import test from 'node:test';import assert from 'node:assert/strict';
import '../../src/clash/abilities/index.js';
import {simulateClashT8,roundHalfUp} from '../../src/clash/t8/index.js';
import {isExtraStrike} from '../../src/clash/t8/ability-kinds.js';
import {PROVISIONAL_POINTS} from '../../src/clash/t8/flags.js';
import {mon} from './helpers.js';
test('N9d: every disputed gate has an explicit approval; normal-action secondary hits are excluded from Stone Divide',()=>{
 assert.ok(Object.values(PROVISIONAL_POINTS).every(p=>p.approved));
 for(const [abilityId,strikeKey,tag] of [['EAR-04-C','ricochet','followUp'],['LIG-04-C','secondary','followUp'],['NAT-04-C','assist','assist'],['PSY-06-C','commanded','commanded']])assert.equal(isExtraStrike({abilityId,strikeKey,tag}),false);
 assert.equal(isExtraStrike({abilityId:'FIR-04-C',tag:'reaction'}),true);assert.equal(isExtraStrike({abilityId:'EAR-02-C',tag:'reaction'}),false);
});
test('N9d Tank bruise: a connected Tank hit cuts heals by 25%, coexists with a status and expires after two recipient turns',()=>{
 const r=simulateClashT8({a:[mon('tidepaw',1)],b:[mon('pebble',2)],seed:1,config:{abilities:'off',policies:{a:'none',b:'none'}},stage:{a0:{hp:20,status:{id:'slowed',strength:10,duration:8}}},stopAt:{exchange:4},probes:[{initiative:(v,id)=>id==='b0'?{priority:1}:null,chooseAction:(v,id)=>id==='b0'&&v.ex>1?{kind:'done'}:id==='a0'?{kind:'heal',pctMaxHp:10,abilityId:'TEST-HEAL'}:null}]});
 const heals=r.log.filter(e=>e.kind==='heal');assert.ok(heals.length>=3);
 for(const e of heals.slice(0,2)){assert.ok(e.factors.some(f=>f.id==='tank-bruise'&&f.factor===0.75));assert.equal(e.amount,roundHalfUp(r.lines.a[0].maxHp*0.1*0.75));}
 assert.ok(!heals[2].factors.some(f=>f.id==='tank-bruise'));assert.equal(r.lines.a[0].status.id,'slowed');
 assert.equal(r.log.filter(e=>e.kind==='bruise').length,1);
});
