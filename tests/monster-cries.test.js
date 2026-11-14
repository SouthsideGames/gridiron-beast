import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CRY_PROFILES, cryCatalog, cryRecipe, renderCry } from '../src/audio/monster-cries.js';
import { FAMILIES, FORMS } from '../src/data/beast-dex.js';
import { cryVerdict, saveCryReview, cryReviews } from '../src/audio/cry-reviews.js';
test('every real form has a deterministic, finite, bounded and distinct cry',()=>{
 assert.deepEqual(cryCatalog.map(x=>x.id),FORMS.map(x=>x.id));const hashes=new Set();
 for(const row of cryCatalog){const recipe=cryRecipe(row.id),pcm=renderCry(recipe);assert.ok(pcm.length>2205&&pcm.length<66150);for(const v of pcm)assert.ok(Number.isFinite(v)&&Math.abs(v)<1);const h=createHash('sha256').update(Buffer.from(pcm.buffer)).digest('hex');assert.ok(!hashes.has(h),row.id);hashes.add(h);assert.deepEqual(pcm,renderCry(cryRecipe(row.id)));}
});
test('Drakling forms independently compose different articulation and use rendered evolution traits',()=>{
 const rows=cryCatalog.filter(x=>x.familyId==='drakeling');assert.deepEqual(rows.map(x=>x.appearance.size),['small','medium','large']);assert.ok(rows[1].appearance.features.includes('claws'));assert.ok(rows[2].appearance.features.includes('spikes'));
 const recipes=rows.map(x=>cryRecipe(x.id));assert.ok(recipes.every(r=>r.voice==='hatch'));assert.notEqual(recipes[0].events.length,recipes[1].events.length);assert.notDeepEqual(recipes[0].events.map(x=>x.at),recipes[1].events.map(x=>x.at));assert.match(recipes[0].description,/thinks he is already enormous/);
});
test('descriptions select distinctive voice treatments',()=>{
 assert.ok(cryRecipe('gearwing:0').events.every(x=>x.kind==='clock'));assert.equal(cryRecipe('sunwhistle:0').events.length,3);assert.ok(cryRecipe('steelpaw:0').events.every(x=>x.kind==='squeal'));assert.equal(cryRecipe('gloamtoad:0').voice,'throat');
});
test('reviews survive reload-like reads and stale recipes return to pending; failed saves remain exportable',()=>{
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 assert.ok(saveCryReview('drakeling:0','approved','good'));assert.equal(cryVerdict('drakeling:0'),'approved');
 const r=JSON.parse(storage.values().next().value);r['gearwing:0']={status:'approved',fingerprint:'old recipe',updatedAt:'2020'};storage.set('gridiron-beast-cry-reviews-v1',JSON.stringify(r));assert.equal(cryVerdict('gearwing:0'),'pending');
 globalThis.localStorage={getItem:()=>{throw Error();},setItem:()=>{throw Error();}};assert.equal(saveCryReview('drakeling:1','revision','different rhythm'),false);assert.equal(cryReviews()['drakeling:1'].notes,'different rhythm');delete globalThis.localStorage;
});
test('playback unlock races, replacement and stop do not leave duplicate voices',async()=>{
 const { playCry,stopCry }=await import('../src/audio/monster-cries.js');let unblock=null;let started=0,stopped=0;
 class AC {constructor(){this.state='suspended';}resume(){if(this.state==='running')return Promise.resolve();return new Promise(r=>{unblock=()=>{this.state='running';r();};});}createBuffer(c,n){return{copyToChannel(data){assert.equal(data.length,n);}};}createGain(){return{gain:{value:0},connect(){return this;},disconnect(){}};}createBufferSource(){return{connect(){return this;},disconnect(){},start(){started++;},stop(){stopped++;this.onended?.();}};}}
 globalThis.AudioContext=AC;const first=playCry('drakeling:0');stopCry();unblock();assert.equal(await first,false);assert.equal(started,0);
 const second=playCry('drakeling:1');await new Promise(r=>setImmediate(r));assert.equal(started,1);
 const third=playCry('drakeling:2');await new Promise(r=>setImmediate(r));assert.equal(await second,false);assert.equal(started,2);stopCry();assert.equal(await third,false);assert.equal(stopped,2);delete globalThis.AudioContext;
});
test('reviewer mounts its real catalog, description, sprites and per-form controls without a franchise',async()=>{
 const { registerMonsterCryReviewer }=await import('../src/ui/screens/monster-cry-reviewer.js');let screen;registerMonsterCryReviewer({registerScreen(name,s){assert.equal(name,'monster-cry-reviewer');screen=s;}});const html=screen.render();assert.match(html,/222 forms/);assert.match(html,/baby dragon who thinks he is already enormous/);for(const name of ['Drakling','Drakyra','Dracolossus'])assert.ok(html.includes(name));assert.equal((html.match(/data-cry-form=/g)||[]).length,3);assert.equal((html.match(/data-status="approved"/g)||[]).length,3);assert.match(html,/<svg/);assert.match(html,/Copy Review Report/);
});

test('eight reference families use different generators and syllable timing',()=>{
 const ids=['gloamtoad','gearwing','sunwhistle','steelpaw','emberfox','pyroclast','tidepaw','pyrelynx'];
 const recipes=ids.map(id=>cryRecipe(id+':0'));
 assert.equal(new Set(recipes.map(r=>r.events[0].kind)).size,8);
 assert.equal(new Set(recipes.map(r=>JSON.stringify(r.events.map(e=>[e.at,e.dur])))).size,8);
 for(const r of recipes){assert.equal(r.design,5);assert.equal(r.revision,5);}
 assert.equal(cryRecipe('drakeling:0').revision,5);
 assert.equal(cryRecipe('drakeling:0').pilot,undefined);
});


test('every family has an explicit description-led assignment; liquid bubbles never reach Fire',()=>{
 assert.deepEqual(Object.keys(CRY_PROFILES).sort(),FAMILIES.map(f=>f.id).sort());
 for(const row of cryCatalog){const r=cryRecipe(row.id);assert.equal(r.description,row.family.description);assert.ok(r.notes.includes(`Description: ${row.family.description}`));assert.equal(r.voice,CRY_PROFILES[row.familyId].kind);assert.equal(r.revision,5);}
 assert.deepEqual(Object.entries(CRY_PROFILES).filter(([,p])=>p.kind==='bubble').map(([id])=>id).sort(),['bubblop','tidepaw']);
 for(const f of FAMILIES.filter(f=>f.type==='Fire'))assert.notEqual(CRY_PROFILES[f.id].kind,'bubble');
 assert.equal(cryRecipe('glowhare:0').voice,'buzz','description says beetle despite the name');
 assert.equal(cryRecipe('gloamtoad:0').voice,'throat','toad anatomy overrides Dark element and blob body');
});
test('evolution changes syllable structure and contours, retaining each family voice',()=>{
 for(const f of FAMILIES){const forms=cryCatalog.filter(r=>r.familyId===f.id);if(forms.length<2)continue;
 const a=cryRecipe(forms[0].id);for(const row of forms.slice(1)){const b=cryRecipe(row.id);assert.equal(b.voice,a.voice);assert.notDeepEqual(b.events.map(e=>[e.at,e.dur]),a.events.map(e=>[e.at,e.dur]),row.id);assert.ok(b.events.length>a.events.length,row.id);}}
});
