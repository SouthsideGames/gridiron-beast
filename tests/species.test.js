import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES_DEX, RARITIES, TRAITS, ELEMENT_REGIONS } from '../src/data/species.js';
import { TYPES } from '../src/data/monsters.js';
import { REGIONS } from '../src/data/staff.js';
import { sprite16, spriteGrid } from '../src/ui/sprite16.js';

const POS = new Set(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);

test('species dex: 72 species, 6 per element with the rarity split', () => {
  assert.equal(SPECIES_DEX.length, 72);
  for (const el of Object.keys(TYPES)) {
    const s = SPECIES_DEX.filter((x) => x.element === el);
    assert.equal(s.length, 6, el);
    const r = (k) => s.filter((x) => x.rarity === k).length;
    assert.deepEqual([r('common'), r('uncommon'), r('rare'), r('legendary')], [2, 2, 1, 1], el);
  }
});

test('species dex: names unique (including evolutions), fields valid', () => {
  const names = SPECIES_DEX.flatMap((s) => [s.name, ...s.evolution.map((e) => e.name)]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length, 102);
  const regionNames = new Set(Object.keys(REGIONS));
  for (const s of SPECIES_DEX) {
    assert.ok(RARITIES[s.rarity], s.id);
    assert.ok(POS.has(s.position) && (s.secondary == null || POS.has(s.secondary)), s.id);
    assert.ok(s.rarity === 'common' ? TRAITS[s.trait] : s.ability?.name, s.id);
    assert.ok(s.rarity === 'common' || s.evolution.length === 0, `${s.id} only commons evolve`);
    for (const r of s.regions || []) assert.ok(regionNames.has(r) && ELEMENT_REGIONS[s.element].includes(r), `${s.id} ${r}`);
    assert.match(s.colors[0], /^#[0-9a-f]{6}$/); assert.match(s.colors[1], /^#[0-9a-f]{6}$/);
  }
});

test('element regions match the region element lists', () => {
  for (const [el, regs] of Object.entries(ELEMENT_REGIONS)) for (const r of regs) assert.ok(REGIONS[r].types.includes(el), `${el} ${r}`);
});

test('sprite16: every species draws a distinct, outlined 16×16 sprite', () => {
  const seen = new Set();
  for (const s of SPECIES_DEX) {
    const g = spriteGrid(s);
    assert.equal(g.length, 16); assert.equal(g[0].length, 16);
    const filled = g.flat().filter(Boolean).length;
    assert.ok(filled > 50, `${s.id} too sparse (${filled})`);
    assert.ok(g.flat().includes('O'));
    const key = g.map((r) => r.join(',')).join('/');
    assert.ok(!seen.has(key), `${s.id} duplicates another sprite`); seen.add(key);
    assert.match(sprite16(s, 32), /^<svg/);
  }
});

test('recruiting follows the dex: region elements only, rares in their home region from week 4, never legendaries', async () => {
  const F = await import('../src/franchise/franchise.js');
  const { REGIONS } = await import('../src/data/staff.js');
  const { SPECIES_BY_ID } = await import('../src/data/monsters.js');
  const seen = { Fire: new Set(), rarities: new Set() };
  for (let seed = 1; seed <= 40; seed++) {
    const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Zappard', cornerstoneDefense: 'Cryolynx', seed });
    f.staff.head_scout = 'sc_ash';
    const r = F.scoutRegion(f, 'Volcanic Fields'); assert.ok(r.ok);
    for (const p of r.prospects) {
      const sp = SPECIES_BY_ID[p.monster.species]; assert.ok(sp, 'prospect has a dex species');
      assert.ok(REGIONS['Volcanic Fields'].types.includes(sp.element));
      assert.equal(p.monster.type, sp.element, 'type is fixed by species');
      assert.ok([sp.position, sp.secondary].includes(p.monster.position));
      assert.notEqual(sp.rarity, 'rare', 'no rares in week 1');
      assert.notEqual(sp.rarity, 'legendary');
      assert.equal(F.dexStatus(f, sp.id) === 'unknown', false, 'scouted prospects enter the dex');
      seen.rarities.add(sp.rarity);
    }
  }
  assert.ok(seen.rarities.has('common') && seen.rarities.has('uncommon'));
});

test('old saves migrate: previous species names map onto the dex and keep their numerals', async () => {
  const { migrateSpecies } = await import('../src/franchise/save.js');
  const f = { roster: [{ id: 'a', name: 'Emberfox', species: 'Emberfox', type: 'Water', position: 'RB' }, { id: 'b', name: 'Flarehorn II', species: 'Flarehorn', type: 'Fire', position: 'OL' }, { id: 'c', name: 'Firestorm', species: 'Firestorm', type: 'Fire', position: 'QB', cornerstone: true }], week: { prospects: [] }, season: { year: 2, week: 3 } };
  migrateSpecies(f);
  assert.deepEqual(f.roster.map((m) => [m.name, m.species, m.type]), [['Flaroo', 'emberfox', 'Fire'], ['Spriglet II', 'thornkit', 'Nature'], ['Pyronix', 'firestorm', 'Fire']]);
  assert.equal(Object.keys(f.dex.signed).length, 3);
  migrateSpecies(f); // idempotent
  assert.equal(f.roster[0].name, 'Flaroo');
});

test('sprite export writes valid PNGs and an atlas for every form', async () => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-sprites-'));
  execFileSync(process.execPath, ['tools/export-sprites.mjs', dir, '1']);
  const atlas = JSON.parse(fs.readFileSync(path.join(dir, 'atlas.json'), 'utf8'));
  assert.equal(atlas.sprites.length, 102);
  for (const s of atlas.sprites) { const head = fs.readFileSync(path.join(dir, s.file)).subarray(0, 8); assert.equal(head.toString('hex'), '89504e470d0a1a0a', s.file); }
  assert.ok(fs.existsSync(path.join(dir, 'sheet.png')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('every species ability and trait maps to known engine primitives, and they fire in play', async () => {
  const { simulatePlay } = await import('../src/sim/engine.js');
  const { PLAYS, OFFENSE_IDS, DEFENSE_IDS } = await import('../src/data/playbook.js');
  const { lineup } = await import('./tools/lineup.js');
  const KNOWN = new Set(['attrs', 'deepThrow', 'burst', 'carryStrength', 'shedStrength', 'pickCatching', 'reaction', 'afterCatch', 'anchor', 'blockStrength', 'blockerStun', 'rebound', 'runStuff', 'elusive', 'elusiveFirst', 'forceFumble', 'fumbleResist', 'noFumble', 'contest', 'catchContest', 'manCoverage', 'rushSpeed', 'pursuitSpeed', 'closeSpeed', 'routeAgility', 'openAccuracy', 'throwVelocity', 'pressureSense', 'noPlayActionBite', 'breakRadius', 'zoneRange', 'aura', 'fatigue']);
  for (const s of SPECIES_DEX) { const e = s.ability?.effect || TRAITS[s.trait]?.effect; assert.ok(e, s.id); for (const k of Object.keys(e)) assert.ok(KNOWN.has(k), `${s.id}: unknown primitive ${k}`); }
  // Put each species in a slot for its natural position and count how often its ability logs across a batch.
  const PASSIVE = new Set(['attrs', 'fatigue', 'forceFumble', 'pickCatching']); // passive, or only on rare events (fumbles, picks)
  const SLOT = { QB: ['QB', 'off'], RB: ['RB', 'off'], WR: ['WR1', 'off'], TE: ['TE', 'off'], OL: ['LG', 'off'], DL: ['DL1', 'def'], LB: ['LB1', 'def'], CB: ['CB1', 'def'], S: ['FS', 'def'] };
  const L = lineup(11, 60);
  const quiet = [];
  for (const sp of SPECIES_DEX) {
    const e = sp.ability?.effect || TRAITS[sp.trait].effect;
    if (Object.keys(e).every((k) => PASSIVE.has(k) || k === 'zoneRange') || !SLOT[sp.position]) continue;
    const [slot, side] = SLOT[sp.position];
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const off = { ...L.offense }, def = { ...L.defense };
      (side === 'off' ? off : def)[slot] = { ...L[side === 'off' ? 'offense' : 'defense'][slot], species: sp.id, name: sp.name, ability: null };
      const o = PLAYS[OFFENSE_IDS[(seed * 5) % OFFENSE_IDS.length]], d = PLAYS[DEFENSE_IDS[(seed * 7) % DEFENSE_IDS.length]];
      const r = simulatePlay({ offensePlay: o, defensePlay: d, ballOn: 30 + (seed % 40), seed, offense: off, defense: def });
      if (r.events.some((ev) => ev.kind === 'ability' && ev.side === side && ev.by === slot)) n++;
    }
    if (n === 0) quiet.push(sp.id);
  }
  assert.ok(quiet.length <= 3, `species whose ability never fired in 40 plays: ${quiet.join(', ')}`);
});

test('the Beast Dex outlives a franchise: discoveries merge into the player store and survive a new franchise', async () => {
  const F = await import('../src/franchise/franchise.js');
  const D = await import('../src/franchise/dex-store.js');
  D.resetDex();
  const a = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Zappard', cornerstoneDefense: 'Cryolynx', seed: 9 });
  const signedA = Object.keys(a.dex.signed);
  assert.ok(signedA.length >= 20);
  assert.equal(D.dexStatusGlobal(signedA[0]), 'signed');
  const b = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Stonehaven Titans', cornerstoneOffense: 'Pyronix', cornerstoneDefense: 'Granigor', seed: 10 });
  assert.equal(F.dexStatus(b, signedA[0]), 'signed', 'a species signed in the previous franchise still counts');
  assert.equal(F.dexStatus(b, signedA[0], { franchiseOnly: true }) === 'signed', b.dex.signed[signedA[0]] != null);
  assert.equal(D.dexCountsGlobal().franchises, 2);
  D.mergeDex({ seen: { aurodrax: { year: 3, week: 2, club: 'x' } } });
  assert.equal(F.dexStatus(b, 'aurodrax'), 'seen');
  D.resetDex();
  assert.equal(D.dexCountsGlobal().seen, 0);
});

test('evolution: commons evolve at their level, keep numerals, grow, and the dex remembers the form', async () => {
  const { tryEvolve, formOf, generateMonster, createRoster, monsterOverall } = await import('../src/data/monsters.js');
  const { createRng } = await import('../src/core/rng.js');
  const F = await import('../src/franchise/franchise.js');
  const rng = createRng(3);
  const m = generateMonster(rng, { species: 'emberfox', position: 'RB', quality: 58 }); m.name = 'Flaroo II';
  assert.equal(tryEvolve(m), null, 'not before level 10');
  const before = monsterOverall(m);
  m.level = 10; const e1 = tryEvolve(m);
  assert.equal(e1.to, 'Blazynx'); assert.equal(m.name, 'Blazynx II'); assert.equal(m.stage, 1); assert.ok(monsterOverall(m) > before);
  assert.equal(formOf(m).name, 'Blazynx'); assert.equal(formOf(m).size, 'medium');
  m.level = 20; const e2 = tryEvolve(m); assert.equal(e2.to, 'Infernox'); assert.equal(m.name, 'Infernox II'); assert.equal(tryEvolve(m), null, 'no third evolution');
  const u = generateMonster(rng, { species: 'voltfang', position: 'WR', quality: 58 }); u.level = 30; assert.equal(tryEvolve(u), null, 'uncommons do not evolve');
  // AI rosters in later seasons field evolved commons; the dex remembers forms the player has faced.
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Zappard', cornerstoneDefense: 'Cryolynx', seed: 77 });
  f.season.year = 4;
  const t = F.aiTeam(f, 'Harbor Sentinels');
  assert.ok(t.roster.some((x) => x.stage >= 1), 'season 4 gym club fields evolved monsters');
  const evolved = t.roster.find((x) => x.stage >= 1); F.dexRecord(f, evolved, 'seen');
  assert.ok(F.dexFormSeen(f, evolved.species) >= 1);
});
