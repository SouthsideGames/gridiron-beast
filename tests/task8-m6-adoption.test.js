import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateMonster, syncFromDev } from '../src/data/monsters.js';
import { generateIndividual } from '../src/franchise/t8/progression.js';
import { applyAward, offseason } from '../src/franchise/progression.js';
import { applyMastery } from '../src/franchise/t8/mastery.js';
import { renewalAsk } from '../src/franchise/contracts.js';
import { askOf, clubKnowsApex } from '../src/franchise/fa-engine.js';
import { predominantDefenseLook } from '../src/sim/rules.js';
import * as F from '../src/core/fraction.js';
const monster = (apex) => { const m = generateMonster(createRng(71), { position:'QB', age:21, yearsPro:0 }); m.dev = generateIndividual(createRng(72), m.dev.form, { apex }); syncFromDev(m); return m; };
test('adopted Apex awards double activity training, keep XP, and grant 42 total offseason points', () => {
  for (const apex of [false,true]) {
    const m = monster(apex), age=m.age;
    const r=applyAward(m,{xp:F.frac(25),training:F.frac(1,4)},createRng(1));
    assert.equal(r.xp,25); assert.equal(F.toNumber(r.training),apex?.5:.25);
    offseason([m],createRng(2),{autoAllocate:false});
    assert.equal(F.toNumber(m.dev.bank),apex?42:2);
    assert.equal(F.toNumber(m.dev.bar),apex?.5:.25); assert.equal(m.age,apex?age:age+1);
  }
});
test('football active mastery cap survives reload and resets per game; Clash executions stay uncapped',()=>{
  const m=monster(false); assert.equal(applyMastery(m,'football',{executions:8},{scope:'g1'}),2);
  const restored=JSON.parse(JSON.stringify(m));assert.equal(applyMastery(restored,'football',{executions:3},{scope:'g1'}),0);
  assert.equal(applyMastery(restored,'football',{executions:1},{scope:'g2'}),1);
  assert.equal(applyMastery(restored,'football',{executions:4},{scope:'g2'}),1);
  assert.equal(applyMastery(restored,'clash',{executions:8},{scope:'c1'}),8);
  assert.equal(restored.dev.mastery.football,4);
});
test('Apex contract premium follows each club knowledge without exposing a hidden prospect',()=>{
  const m=monster(true), f={club:'Owner',roster:[],season:{year:1},draft:{revealed:{},aiScouting:{AI:{revealed:{}}}},pool:{},league:{rosters:{}}};
  const plain={...m,dev:{...m.dev,apex:false}};
  assert.equal(askOf(f,m).salary,askOf(f,plain).salary);
  f.discovery={potential:{[m.id]:{}}};
  assert.ok(askOf(f,m).salary>askOf(f,plain).salary);
  assert.equal(clubKnowsApex(f,m,'AI'),false);
  assert.equal(askOf(f,m,'AI').salary,askOf(f,plain,'AI').salary);
  f.draft.aiScouting.AI.revealed[m.id]=6; assert.equal(clubKnowsApex(f,m,'AI'),true);
  assert.ok(askOf(f,m,'AI').salary>askOf(f,plain,'AI').salary);
  delete f.discovery; f.pool={region:[m]}; assert.equal(clubKnowsApex(f,m),true,'public free agent information');
  assert.equal(renewalAsk(m,{apexKnown:false}).base,renewalAsk(plain).base);
});
test('Foresight public look uses most represented plan formation and deterministic plan-order ties',()=>{
  assert.equal(predominantDefenseLook(['cover_3','mug_zero','mug_zero']), 'mug_zero');
  assert.equal(predominantDefenseLook(['mug_zero','cover_3']), 'mug_zero');
});
