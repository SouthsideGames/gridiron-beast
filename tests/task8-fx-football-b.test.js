// Task 8 football ability presentation (docs/task8/FX_FOOTBALL_MATRIX.md): for every approved ability at every form and mastery tier,
// the presentation descriptors are built from the recorded reviewer sequence exactly as the Ability Reviewer builds them, and every
// presentation phase (anticipation, activation, movement, impact, affected-target feedback, persistence, cleanup) has evidence in
// them or is declared not applicable by the look (its Dex visual has no such phase). The activation play is drawn every 0.1 s at
// full, low and min quality without a NaN, with a bounded element count. Fire to Wind in task8-fx-football-a.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { LOOKS } from '../src/ui/fx/looks/index.js';
import { prepare, phasesOf, drawPlay, PHASES } from './helpers/fx-football.js';

const ELEMENTS = ['Earth', 'Dark', 'Light', 'Metal', 'Psychic', 'Dragon'];
const CAT = reviewCatalog().filter((c) => ELEMENTS.includes(c.element));
export const MAX_FX_ELEMENTS = 60; // per frame, every Task 8 effect together (a frame is ~1,300 elements without effects)

test('this half covers 36 football abilities, each with its own look', () => { assert.equal(CAT.length, 36); for (const c of CAT) assert.ok(LOOKS[c.abilityId], `${c.abilityId} has a look`); });
for (const el of ELEMENTS) {
  test(`${el}: every ability x form x mastery shows every presentation phase (or declares it n/a) and draws cleanly at every quality`, () => {
    let n = 0;
    for (const c of CAT.filter((x) => x.element === el)) for (const form of c.forms) for (const mastery of c.tiers) {
      const tag = `${c.abilityId} ${form} m${mastery}`; const r = reviewSequence({ family: c.family, form, mastery }); assert.ok(r.ok, `${tag}: the reviewer sequence completes`);
      const P = prepare(r, c); const ev = phasesOf(r, c, P);
      for (const ph of PHASES) assert.ok(ev[ph], `${tag}: no evidence for the ${ph} phase`);
      const act = P[r.activation]?.fx ? P[r.activation] : P.find((x) => x.fx && x.fx.t8.items.some((it) => it.id === c.abilityId));
      for (const X of [act, P.find((x, i) => i > r.activation && x.fx)].filter(Boolean)) { const d = drawPlay(X); assert.equal(d.bad, null, `${tag}: ${d.bad}`); assert.ok(d.maxEl <= MAX_FX_ELEMENTS, `${tag}: ${d.maxEl} effect elements in one frame`); }
      n += 1;
    }
    assert.ok(n >= 24, `${el}: ${n} variants`);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// I4 / I5 (docs/task8/FX_FOOTBALL_MATRIX.md): what the match screen carries outside the field, from the play's own events and the
// game's absence list (src/ui/fx/match-fx.js abilityTicks, absentMonsters; drawn by screens/match.js in the ability strip / edge strip).
import { readFileSync } from 'node:fs';
import { abilityTicks, absentMonsters, dexAbilityName } from '../src/ui/fx/match-fx.js';

test('I4: Anchor Plate, Iron Lungs and Night Watch get their tick in the last play\'s ability strip, read from the recorded events', () => {
  const want = { ironcub: ['MET-01-F', /^absorbed \d+\.\d\d yd of push$/], steelpaw: ['MET-02-F', /^saved 1 stamina: \S/], nightowl: ['DAR-02-F', /keeps full Awareness in the dark$/] };
  for (const [fam, [id, re]] of Object.entries(want)) {
    const c = CAT.find((x) => x.family === fam); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); let seen = 0;
    for (const p of r.plays) { if (!p.sim?.events) continue; const before = JSON.stringify(p.sim); const T = abilityTicks(p.sim, (side, slot) => p.sim.names?.[side]?.[slot] || slot);
      for (const [k, v] of Object.entries(T)) if (k.endsWith(':' + id)) { seen += 1; assert.match(v, re, `${id}: ${v}`); const [side, slot] = k.split(':'); assert.ok(p.sim.events.some((e) => e.ability === id && e.side === side && e.by === slot), `${id}: keyed by the event's own side and slot`); }
      assert.equal(JSON.stringify(p.sim), before, `${id}: reading never changes the record`); }
    assert.ok(seen >= 1, `${id}: the reviewer's first run produces the tick`); assert.equal(dexAbilityName(id), LOOKS[id].name);
  }
  assert.deepEqual(abilityTicks(null), {}); assert.deepEqual(abilityTicks({ events: [{ kind: 'ability', ability: 'FIR-01-F', by: 'RB', side: 'off' }] }), {}, 'other abilities carry no tick');
  const src = readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8'); assert.match(src, /class="ability-tick"/); assert.match(src, /abilityTicks\(ev\.sim/);
});

test('I5: Sovereign Arm\'s swallowed defender is listed while he is out (the edge strip\'s portrait indicator), from the game\'s absence list only', () => {
  const lb = { id: 'd_LB1', name: 'Granite', species: 'pebble' }; const teams = { home: { offense: {}, defense: {}, bench: [] }, away: { offense: {}, defense: { LB1: lb }, bench: [] } };
  const state = { t8: { status: {}, absences: [{ mid: 'd_LB1', serveOn: 'home', ability: 'DRA-06-F', by: 'h_QB' }] } }; const before = JSON.stringify(state);
  assert.deepEqual(absentMonsters(state, teams), [{ mid: 'd_LB1', monster: lb, team: 'away', serveOn: 'home', ability: 'DRA-06-F' }]); assert.equal(JSON.stringify(state), before);
  assert.deepEqual(absentMonsters({ t8: { status: {} } }, teams), []); assert.deepEqual(absentMonsters(null, teams), []); assert.equal(absentMonsters({ t8: { absences: [{ mid: 'gone' }] } }, teams)[0].monster, null);
  const c = CAT.find((x) => x.family === 'aurodrax'); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); assert.ok(r.plays.some((p) => p.absencesAfter?.length), 'the reviewer sequence queues the absence the strip reads');
  const src = readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8'); assert.match(src, /absentMonsters\(s, teams\)/); assert.match(src, /edge-chip absent/);
});
