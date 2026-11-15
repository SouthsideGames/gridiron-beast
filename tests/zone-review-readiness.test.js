import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import {setZoneChoice} from '../src/sim/t8/zone-planning.js';
import {stageScenario,reviewCatalog} from '../src/sim/abilities/review.js';
import {SCENARIOS} from '../src/sim/abilities/review-scenarios.js';
import {familyById} from '../src/data/beast-dex.js';
import {contractOf} from '../src/sim/abilities/registry.js';
import {ZONE_IDS} from '../src/sim/t8/zone-planning.js';
import {zonePlans} from '../src/ui/zone-planner.js';
import {stageZoneReadiness} from '../src/ui/zone-review-ready.js';
export function check(c,form,mastery){
 const sc=SCENARIOS[c.family],fam=familyById(c.family);
 const seed=typeof sc.seed0==='function'?sc.seed0(form,mastery):sc.seed0||1;
 const G=stageScenario({sc,fam,contract:contractOf(c.family),form,mastery,seed});let n=0,activationAt=null;stageZoneReadiness(G,c.family,form,mastery);
 for(let attempts=0;attempts<=48;attempts++){
  G.api.followUp=activationAt==null?null:Math.max(0,n-activationAt-1);
  const cfg=activationAt!=null&&sc.after?{...sc,...sc.after}:sc;
  const unit=typeof cfg.unit==='function'?cfg.unit(n,G.api):cfg.unit;
  Object.assign(G.state,{phase:'scrimmage',possession:unit==='defense'?'away':'home',ballOn:cfg.ballOn??35,ballLat:0,down:1,toGo:cfg.toGo??10});
  const calls=typeof cfg.calls==='function'?cfg.calls(n,G.api):cfg.calls?.[n%cfg.calls.length]||['inside_zone','cover_3'];
  const plans=cfg.kick?[]:zonePlans(G.state,G.teams,'home',calls[0],calls[1]).filter(p=>p.owner===G.subject.id&&p.placementOptions.length);
  if(plans.length)return {attempts,plans,G,calls};
  if(attempts===48)throw Error(`${c.family}/${form}/${mastery} not ready: ${JSON.stringify(G.state.t8.ability[G.subject.id])}`);
  const index=n++,rec=G.snap(index,cfg);if(rec.executed&&activationAt==null)activationAt=index;
 }
}
test('Prepare Ready Zone exposes the subject placements for all zone forms and mastery tiers',()=>{
 let count=0;
 for(const c of reviewCatalog().filter(c=>ZONE_IDS.includes(c.abilityId)))for(const form of c.forms)for(const mastery of c.tiers){
  const {plans,G,calls}=check(c,form,mastery);
  assert.ok(plans.length,c.family);
  for(const p of plans){
   assert.equal(p.owner,G.subject.id);
   assert.ok(p.placementOptions.length>=2,`${form}/${mastery}`);
   setZoneChoice(G.state,p.key,'right');
  }
  const expected=zonePlans(G.state,G.teams,'home',...calls).filter(p=>p.owner===G.subject.id);
  const pre={possession:G.state.possession,ballOn:G.state.ballOn,ballLat:G.state.ballLat};
  const result=R.runScrimmagePlay(G.state,G.teams,...calls);
  const dir=pre.possession==='home'?1:-1;
  const actual=result.sim.fields.filter(f=>f.owner===G.subject.id).map(f=>({...f,yard:f.yard.map(y=>dir===1?y+pre.ballOn:100-(y+pre.ballOn)).sort((a,b)=>a-b),lat:f.lat.map(y=>dir*(y+pre.ballLat)).sort((a,b)=>a-b)}));
  assert.equal(actual.length,expected.length,`${form}/${mastery}: fields created`);
  for(const p of expected)assert.ok(actual.some(f=>[...f.yard,...f.lat].every((v,i)=>Math.abs(v-[...p.yard,...p.lat][i])<1e-8)),`${form}/${mastery}: exact selected footprint`);
  count++;
 }
 assert.equal(count,124);
});
