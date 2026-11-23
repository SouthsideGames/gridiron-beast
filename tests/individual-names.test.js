import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { individualName, validIndividualName, catalogueName, individualNamePoolSize, namedIndividuals, ensureIndividualNames, reserveIndividualName } from '../src/data/individual-names.js';
import { generateMonster, raiseToLevel, tryEvolve, formOf, resolveSpecies, cornerstoneOffers } from '../src/data/monsters.js';
import { SPECIES_DEX } from '../src/data/species.js';
import * as F from '../src/franchise/franchise.js';
import { exportJson, importJson, migrate } from '../src/franchise/save.js';
import { claimMonster } from '../src/franchise/league-registry.js';
import { draftShowHtml, startDraftShow } from '../src/ui/draft-show.js';
import { beastSpeciesLabel } from '../src/ui/beast-identity.js';
import { legacyHofProfile } from '../src/franchise/career-profile.js';
const base=F.createFranchise({owner:{first:'Names',last:'Test'},club:'Ember City Beasts',seed:312});
const fresh=()=>structuredClone(base);
const identities=f=>[...new Map(namedIndividuals(f).map(m=>[m.id,m])).values()];

test('names are deterministic, short, pronounceable words and have ample capacity without type-based pools',()=>{
  assert.ok(individualNamePoolSize>50000);
  const taken=new Set();
  for(let n=0;n<1800;n++){
    const name=individualName(`athlete-${n}`,taken);
    assert.equal(validIndividualName(name),true,name);assert.equal(catalogueName(name),false);
    assert.ok(!taken.has(name));taken.add(name);
  }
  assert.equal(individualName('constant'),individualName('constant'));
  const a=individualName('constant');assert.notEqual(individualName('constant',new Set([a.toUpperCase()])),a);
});
test('every club, legendary, signature and draft prospect has a unique stable individual name',()=>{
  const f=fresh(),all=identities(f);
  assert.ok(all.length>600);
  assert.equal(new Set(all.map(m=>m.name.toLowerCase())).size,all.length);
  for(const m of all){assert.equal(validIndividualName(m.name),true,m.name);assert.equal(m.personalName,true);assert.ok(resolveSpecies(m));}
  const before=all.map(m=>[m.id,m.name]),rng=f.rngState;
  ensureIndividualNames(f);assert.deepEqual(identities(f).map(m=>[m.id,m.name]),before);assert.equal(f.rngState,rng);
  const loaded=importJson(exportJson(f));
  assert.deepEqual(identities(loaded).map(m=>[m.id,m.name]),before);assert.equal(loaded.rngState,rng);
});
test('old generated labels migrate once across rosters, pools, draft and ID-bearing records; custom names survive',()=>{
  const f=fresh();delete f.individualNames;
  for(const m of identities(f)){m.name=formOf(m).name+' III';delete m.personalName;delete m.customName;}
  const m=f.roster[0],custom=f.roster[1];custom.name='Kareem';
  f.records={game:{sample:{id:m.id,name:m.name,species:m.species,position:m.position,value:7}}};
  f.history.push({sample:{mid:m.id,mname:m.name},pair:{partner:m.id,pname:m.name}});
  f.news.push({text:`A past story about ${m.name}.`});const prose=f.news.at(-1).text;
  const projection=identities(f).map(x=>({id:x.id,attributes:x.attributes,dev:x.dev,position:x.position,salary:x.salary,contract:x.contract}));const rng=f.rngState;
  const loaded=migrate(f),all=identities(loaded),renamed=loaded.roster[0];
  assert.equal(loaded.roster[1].name,'Kareem');assert.equal(new Set(all.map(x=>x.name.toLowerCase())).size,all.length);
  assert.equal(loaded.records.game.sample.name,renamed.name);assert.equal(loaded.history.at(-1).sample.mname,renamed.name);assert.equal(loaded.history.at(-1).pair.pname,renamed.name);
  assert.equal(Object.hasOwn(loaded.records.game.sample,'personalName'),false,'historical snapshots receive names without live-monster flags');
  assert.equal(loaded.news.at(-1).text,prose,'historical prose is not guessed at or rewritten');
  assert.deepEqual(all.map(x=>({id:x.id,attributes:x.attributes,dev:x.dev,position:x.position,salary:x.salary,contract:x.contract})),projection);
  assert.equal(loaded.rngState,rng);const names=all.map(x=>x.name);migrate(loaded);assert.deepEqual(identities(loaded).map(x=>x.name),names);
});
test('evolution changes the species form while keeping name, ID, and registry identity',()=>{
  const f=fresh();const m=generateMonster(createRng(4),{species:'emberfox',age:20,yearsPro:0});
  reserveIndividualName(f,m);const name=m.name,id=m.id;raiseToLevel(m,10);
  const event=tryEvolve(m);assert.ok(event);assert.equal(m.name,name);assert.equal(m.id,id);
  assert.equal(event.name,name);assert.equal(event.from,'Flaroo');assert.equal(event.to,'Blazynx');
  assert.equal(formOf(m).name,'Blazynx');assert.equal(f.individualNames.byId[id],name);
});
test('new arrivals avoid existing names and transfers keep the registered name',()=>{
  const f=fresh(),old=f.roster[0];
  const newcomer=generateMonster(createRng(8),{species:old.species,yearsPro:0});
  newcomer.name=old.name;claimMonster(f,newcomer,'names-test');assert.notEqual(newcomer.name,old.name);
  const name=newcomer.name;F.uniqueName(f,newcomer);assert.equal(newcomer.name,name);
  const roster=f.roster;f.roster=[newcomer];F.uniqueName(f,newcomer);f.roster=roster;assert.equal(newcomer.name,name);
  const rekeyed={...newcomer};claimMonster(f,rekeyed,'duplicate-id');assert.notEqual(rekeyed.id,newcomer.id);assert.notEqual(rekeyed.name,newcomer.name);
});
test('cornerstone selection carries its shown personal name into the franchise',()=>{
  const offer=cornerstoneOffers(99)[0];assert.ok(validIndividualName(offer.givenName));
  const f=F.createFranchise({owner:{first:'Pick',last:'Test'},club:'Ember City Beasts',seed:17,cornerstone:offer});
  const m=f.roster.find(x=>x.cornerstone);assert.equal(m.name,offer.givenName);assert.equal(m.species,offer.species);
});
test('draft ceremonies use the athlete name and a separate species label; Dex species names stay untouched',()=>{
  const f=fresh(),m=f.draft.class[0];
  f.draft.picks=[{round:1,overall:1,team:'Harbor Anchors',id:m.id,name:m.name,position:m.position}];
  startDraftShow(f.draft);const html=draftShowHtml(f.draft);
  assert.ok(html.includes(m.name));assert.ok(html.includes(beastSpeciesLabel(m)));assert.ok(SPECIES_DEX.some(s=>s.id===m.species));
});
test('Hall of Fame snapshots show saved species forms independently of personal names',()=>{
  const card={id:'hof_names',seasonsList:[],bestMonsters:[{name:'Rocco',species:'emberfox',stage:1,position:'RB'}]};
  const p=legacyHofProfile(card,0);assert.equal(p.name,'Rocco');assert.equal(p.stage,1);assert.equal(p.speciesName,'Blazynx');
});
