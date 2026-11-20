import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import {resetDex,mergeDex,dexStatusGlobal,dexCountsGlobal,dexFormGlobal,dexFormsGlobal,dexData} from '../src/franchise/dex-store.js';
import {migrateSpecies} from '../src/franchise/save.js';
const blank=()=>({dex:{seen:{},signed:{}},season:{year:1201,week:1},club:'Test',roster:[]});

test('sightings, a complete draft class and opponents cannot unlock the collection',()=>{
 resetDex();const f=blank();
 for(const id of F.DEX_GROUPS.all)F.dexRecord(f,{species:id,stage:2},'seen');
 assert.equal(F.dexCounts(f).all.seen,0);assert.equal(dexCountsGlobal().seen,0);
 for(const id of F.DEX_GROUPS.all){assert.equal(F.dexStatus(f,id),'unknown');assert.equal(F.dexFormSeen(f,id),0);}
 const id=F.DEX_GROUPS.original[0];F.dexRecord(f,{species:id,stage:0},'signed');
 assert.equal(F.dexCounts(f).all.seen,1);assert.equal(F.dexStatus(f,id),'signed');
 assert.equal(F.dexFormSeen(f,id),0,'earlier sightings cannot reveal an acquired family’s unowned evolutions');
 F.dexRecord(f,{species:id,stage:1},'signed');assert.equal(F.dexFormSeen(f,id),1);
 F.dexRecord(f,{species:id,stage:2},'seen');assert.equal(F.dexFormSeen(f,id),1);
});
test('legacy save/cloud sightings relock while prior acquisitions survive release and merge',()=>{
 resetDex();const [owned,seen]=F.DEX_GROUPS.original;
 const old={seen:{[owned]:{week:1},[seen]:{week:1}},signed:{[owned]:{week:1}},forms:{[owned]:2,[seen]:2}};
 const f={...blank(),dex:structuredClone(old)};mergeDex(old);mergeDex(old);
 assert.equal(F.dexStatus(f,owned),'signed');assert.equal(F.dexStatus(f,seen),'unknown');
 assert.equal(dexStatusGlobal(seen),'unknown');assert.equal(F.dexCounts(null).seen,1);
 assert.equal(F.dexFormSeen(f,owned),0,'old sighting stages do not prove ownership');
 dexFormGlobal(seen,2);assert.equal(dexFormsGlobal()[seen],undefined);
 mergeDex({signed:{[owned]:{week:1}},ownedForms:{[owned]:1}});assert.equal(F.dexFormSeen(f,owned),1);
 assert.equal(Object.keys(dexData().signed).length,1,'no ownership records lost');
});
test('loading old saves reconstructs only roster acquisitions, without RNG changes or repeated changes',()=>{
 resetDex();const f=F.createFranchise({owner:{first:'Dex',last:'Test'},club:'Ember City Beasts',seed:17});
 const beforeRng=f.rngState,roster=JSON.stringify(f.roster);delete f.dex.ownedForms;
 for(const id of F.DEX_GROUPS.all)f.dex.forms={...f.dex.forms,[id]:2};
 const evolved=f.roster.find(m=>m.stage>0);migrateSpecies(f);
 assert.equal(JSON.stringify(f.roster),roster);assert.equal(f.rngState,beforeRng);
 assert.ok(evolved,'fixture includes a genuinely owned evolved form');assert.equal(F.dexFormSeen(f,evolved.species),evolved.stage);
 const after=JSON.stringify(f);migrateSpecies(f);assert.equal(JSON.stringify(f),after);
 const acquired=new Set(f.roster.map(F.dexFamilyOf));
 assert.equal(F.dexCounts(f).all.seen,acquired.size,'generated prospects and AI clubs never add unlocks');
});
test('player Dex screen keeps sight-only entries as silhouettes and counts only acquisitions',async()=>{
 const {registerDexScreens}=await import('../src/ui/screens/dex.js');
 resetDex();const f=blank(),screens={};
 for(const id of F.DEX_GROUPS.all)F.dexRecord(f,{species:id},'seen');
 registerDexScreens({registerScreen(name,s){screens[name]=s;}},{});
 const html=screens.dex.render({f,params:{}});
 assert.equal((html.match(/class="dex-cell unknown"/g)||[]).length,192);
 assert.match(html,/0 \/ 192 unlocked/);
 const id=F.DEX_GROUPS.original[0];F.dexRecord(f,{species:id},'signed');
 const unlocked=screens.dex.render({f,params:{}});
 assert.equal((unlocked.match(/class="dex-cell unknown"/g)||[]).length,191);
 assert.equal((unlocked.match(/class="dex-cell signed"/g)||[]).length,1);
 assert.match(unlocked,/1 \/ 192 unlocked/);
});
