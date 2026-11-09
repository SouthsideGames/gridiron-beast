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
import { prepare, phasesOf, drawPlay, fieldAt, PHASES } from './helpers/fx-football.js';

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

// ---------------------------------------------------------------------------------------------------------------------------------
// I5, the rest (Dex DRA-06-F Visuals: "Portrait dragon-mouth indicator while unavailable, return animation before formation"): the
// swallowed defender's empty spot in the formation while he is out and his return before the formation of the play he is back for
// (match-fx.js createAbsenceTracker / servedVacancies / sequenceStaged; the looks' dragon_absent / dragon_return sub-looks).
import { fieldSvg, presnapLook } from '../src/ui/field-view.js';
import { PLAYS } from '../src/data/playbook.js';
import { buildFx, fxSvg } from '../src/ui/ability-fx.js';
import { createAbsenceTracker, servedVacancies, sequenceStaged, defenseSlotOf, presnapFx, ABSENCE_LOOK } from '../src/ui/fx/match-fx.js';
const countEl = (s) => (s.match(/<[a-z]/g) || []).length;

test('I5: in the reviewer sequence the served play shows the empty spot and the next play pre-rolls the return, at every mastery', () => {
  const c = CAT.find((x) => x.family === 'aurodrax');
  for (const mastery of c.tiers) {
    const r = reviewSequence({ family: c.family, form: c.forms[0], mastery }); assert.ok(r.ok); const P = prepare(r, c);
    const s = r.plays.findIndex((p) => p.served?.length); assert.ok(s > 0, 'a play serves the absence'); const who = r.plays[s].served[0].who;
    const back = r.plays.findIndex((p, j) => j > s && p.presence.def.includes(who.slot)); assert.ok(back > s, 'he is back on a later play');
    // the served play: nobody in his slot, a still mark on the spot his call would line him up on, for the whole play, without holding it longer
    const vac = P[s].fx.t8.items.filter((it) => it.kind === 'dragon_absent'); assert.equal(vac.length, 1); assert.equal(vac[0].slot, who.slot); assert.ok(vac[0].always && vac[0].staged && !vac[0].main);
    assert.deepEqual(vac[0].origin, PLAYS[r.plays[s].sim.defensePlay].align[who.slot]); assert.ok(!r.plays[s].sim.frames[0].def.some((q) => q[0] === who.slot));
    assert.equal(P[s].fx.preroll, buildFx(P[s].sim, () => null, { preroll: true }).preroll, 'the mark adds no time before the snap');
    for (const t of [0, 1, P[s].sim.frames.at(-1).t]) assert.match(fieldAt(P[s], t), />OUT</, `the mark is on at ${t}`);
    // the play he is back for: the return is pre-rolled, ends at the snap, and is drawn over his own spot
    const ret = P[back].fx.t8.items.filter((it) => it.kind === 'dragon_return'); assert.equal(ret.length, 1); assert.equal(ret[0].slot, who.slot);
    assert.equal(ret[0].end, 0); assert.ok(Math.abs(ret[0].start + ABSENCE_LOOK['DRA-06-F'].returnDur) < 1e-9); assert.ok(P[back].fx.preroll >= ABSENCE_LOOK['DRA-06-F'].returnDur - 1e-9);
    const a = fieldAt(P[back], -1.2), b = fieldAt(P[back], -0.6), z = fieldAt(P[back], 0.1); assert.match(a, />returns</); assert.match(b, />returns</); assert.notEqual(a, b, 'it animates'); assert.ok(!/>returns</.test(z), 'over at the snap');
    for (const X of [P[s], P[back]]) { const d = drawPlay(X); assert.equal(d.bad, null, d.bad); assert.ok(d.maxEl <= MAX_FX_ELEMENTS, `${d.maxEl} effect elements`); }
    // no other play carries either mark, and the other plays of the sequence are built as before
    P.forEach((X, i) => { if (!X.fx) return; const k = X.fx.t8.items.filter((it) => it.staged).map((it) => it.kind); assert.deepEqual(k, i === s ? ['dragon_absent'] : i === back ? ['dragon_return'] : []); });
    assert.deepEqual(sequenceStaged(r.plays, 0), []); assert.deepEqual(sequenceStaged(r.plays, 99), []);
  }
  // a sequence without an absence stages nothing
  const o = CAT.find((x) => x.family === 'ironcub'); const ro = reviewSequence({ family: o.family, form: o.forms[0], mastery: 0 }); ro.plays.forEach((_, i) => assert.deepEqual(sequenceStaged(ro.plays, i), []));
});

test('I5: on the play-call screen the tracker leaves his spot empty while he is out and plays his return once, never again on a re-render', () => {
  const cb = { id: 'd_CB1', name: 'Sablewing', species: 'sablewing', type: 'Dragon', position: 'CB', attrs: {} };
  const teams = { home: { offense: {}, defense: {}, bench: [] }, away: { offense: {}, defense: { CB1: cb }, bench: [] } };
  const look = presnapLook('cover_2_man'); const lookup = (team, slot) => (team === 'def' && slot === 'CB1' ? { element: 'Dragon', name: cb.name, species: cb.species } : null);
  const out = { phase: 'scrimmage', possession: 'home', playCount: 5, seed: 9, ballOn: 30, ballLat: 0, t8: { status: {}, absences: [{ mid: cb.id, serveOn: 'home', ability: 'DRA-06-F', by: 'h_QB' }] } };
  const before = JSON.stringify(out); const T = createAbsenceTracker();
  assert.deepEqual(defenseSlotOf(teams, 'away', look, cb.id), { slot: 'CB1', at: [...look.align.CB1] }); assert.equal(defenseSlotOf(teams, 'away', look, 'nobody'), null); assert.equal(defenseSlotOf(teams, 'home', look, cb.id), null);
  // out: the snap about to be played is the one he misses
  T.observe(9, out, teams); const A = T.frame(out, teams, look, 1000);
  assert.deepEqual(A.vacant, ['CB1']); assert.deepEqual(A.staged, [{ ability: 'DRA-06-F', kind: 'dragon_absent', team: 'def', slot: 'CB1', always: true, name: 'Sablewing' }]); assert.deepEqual(A.returning, []); assert.equal(A.until, 0, 'a still mark: nothing to animate');
  assert.equal(JSON.stringify(out), before, 'the game is only read');
  // drawn through the real renderer: the formation without him, the mark on his empty spot (at every quality, reduced motion included)
  const draw = (staged, time = 0, without = [], q = 'full') => fieldSvg({ ballOn: 30, ballLat: 0, presnap: { offensePlay: presnapLook('quick_slants'), defensePlay: { ...look, onField: look.onField.filter((sl) => !without.includes(sl)) } }, fx: presnapFx([], lookup, staged), time, fxQuality: q });
  const bare = draw([]); const marked = draw(A.staged, 0, A.vacant); assert.ok(!/>OUT</.test(bare)); assert.match(marked, />OUT</); assert.ok(!/NaN|undefined|Infinity/.test(marked));
  for (const q of ['low', 'min']) assert.match(draw(A.staged, 0, A.vacant, q), />OUT</, `shown at ${q}`);
  const sprites = (svg) => countEl(svg.slice(svg.indexOf('class="fv-pl"'), svg.indexOf('class="fv-post"'))); assert.ok(sprites(marked) < sprites(bare), 'his sprite is not in the formation');
  const fxOnly = (staged, t) => { const o = fxSvg(presnapFx([], lookup, staged), t, (team, slot) => (team === 'def' && look.align[slot] ? [look.align[slot][1], -look.align[slot][0], 0, 0] : null), { quality: 'full', toSvg: (x, y) => [y, -x], halfWidth: 27 }); return o.under + o.over + o.ball; };
  assert.ok(countEl(fxOnly(A.staged, 0)) <= 6, 'the mark is a handful of shapes');
  // while his own team has the ball he is not missing from any formation; another game starts clean
  assert.deepEqual(T.frame({ ...out, possession: 'away' }, teams, look, 1000).vacant, []); assert.deepEqual(T.frame({ ...out, phase: 'kickoff' }, teams, look, 1000).vacant, []);
  // served: the absence leaves the game's list at the snap; on the next play-call screen with his defense on the field he returns
  const served = { ...out, playCount: 6, t8: { status: {}, absences: [] } }; T.observe(9, served, teams);
  const R0 = T.frame(served, teams, look, 2000); assert.deepEqual(R0.vacant, []); assert.equal(R0.returning.length, 1); assert.equal(R0.returning[0].slot, 'CB1'); assert.equal(R0.returning[0].monster, cb);
  assert.deepEqual(R0.staged, [{ ability: 'DRA-06-F', kind: 'dragon_return', team: 'def', slot: 'CB1', age: 0, name: 'Sablewing' }]); assert.equal(R0.until, 2000 + 1400);
  T.observe(9, served, teams); const R1 = T.frame(served, teams, look, 2700); assert.ok(Math.abs(R1.staged[0].age - 0.7) < 1e-9, 'a re-render continues the same return'); assert.equal(R1.until, 3400);
  const at = (age) => [{ ability: 'DRA-06-F', kind: 'dragon_return', team: 'def', slot: 'CB1', t: 0 - age, name: 'Sablewing' }];
  const f0 = draw(at(0.1)), f1 = draw(at(0.7)); assert.match(f0, />returns</); assert.match(f1, />returns</); assert.notEqual(f0, f1); assert.ok(!/NaN|undefined|Infinity/.test(f0 + f1));
  assert.ok(countEl(fxOnly(at(0.7), 0)) <= 14, 'the return is a small effect'); assert.ok(countEl(fxOnly(at(0.7), 0)) >= 5, 'drawn');
  { const lo = fxSvg(presnapFx([], lookup, at(0.9)), 0, (team, slot) => (look.align[slot] ? [0, 0, 0, 0] : null), { quality: 'min', toSvg: (x, y) => [y, -x], halfWidth: 27 }); assert.ok(countEl(lo.over) < countEl(fxOnly(at(0.9), 0)), 'min quality thins the sparks'); assert.match(lo.over, />returns</); }
  T.observe(9, served, teams); const R2 = T.frame(served, teams, look, 9000); assert.deepEqual(R2.staged, [], 'finished: never replayed on a later render'); assert.equal(R2.until, 0); assert.equal(R2.returning.length, 1, 'the chip stays for this play-call screen');
  assert.equal(draw(R2.staged), bare, 'and the formation is the ordinary one again');
  // the next snap ends it
  const next = { ...served, playCount: 7 }; T.observe(9, next, teams); assert.deepEqual(T.frame(next, teams, look, 9500).returning, []);
  // his own team on offense first: the return waits for the first formation he is in
  const T2 = createAbsenceTracker(); T2.observe(9, out, teams); const theirBall = { ...served, possession: 'away' }; T2.observe(9, theirBall, teams); assert.deepEqual(T2.frame(theirBall, teams, presnapLook('cover_3'), 100).returning, []);
  const later = { ...served, playCount: 9 }; T2.observe(9, later, teams); assert.equal(T2.frame(later, teams, look, 200).staged[0]?.kind, 'dragon_return');
  // reduced motion: no animation, he is simply back; a finished game or a new game forgets
  const T3 = createAbsenceTracker(); T3.observe(9, out, teams); T3.observe(9, served, teams); const still = T3.frame(served, teams, look, 2000, false); assert.deepEqual(still.staged, []); assert.equal(still.until, 0); assert.equal(still.returning.length, 1);
  const T4 = createAbsenceTracker(); T4.observe(9, out, teams); T4.observe(9, { ...served, finished: true }, teams); assert.deepEqual(T4.frame(served, teams, look, 1).returning, []);
  const T5 = createAbsenceTracker(); T5.observe(9, out, teams); T5.observe(10, served, teams); assert.deepEqual(T5.frame(served, teams, look, 1).returning, []);
});

test('I5: the play that serves the absence carries the empty-spot mark on the match screen, built from the play\'s own record', () => {
  const cb = { id: 'd_CB1', name: 'Sablewing', species: 'sablewing', type: 'Dragon', position: 'CB', attrs: {} }; const teams = { home: { offense: {}, defense: {}, bench: [] }, away: { offense: {}, defense: { CB1: cb }, bench: [] } };
  const served = [{ mid: cb.id, monster: cb, team: 'away', serveOn: 'home', ability: 'DRA-06-F' }];
  const sim = { defensePlay: 'man_press', frames: [{ t: 0, off: [], def: [['DL1', 1, 0], ['FS', 12, 0]], ball: [0, 0, 0] }], events: [] }; const before = JSON.stringify(sim);
  assert.deepEqual(servedVacancies(served, sim, teams, 'away'), [{ ability: 'DRA-06-F', kind: 'dragon_absent', team: 'def', slot: 'CB1', at: [...PLAYS.man_press.align.CB1], always: true, name: 'Sablewing' }]); assert.equal(JSON.stringify(sim), before);
  assert.deepEqual(servedVacancies(served, { ...sim, frames: [{ ...sim.frames[0], def: [['CB1', 5, 9]] }] }, teams, 'away'), [], 'somebody is in the slot: no mark');
  assert.deepEqual(servedVacancies([], sim, teams, 'away'), []); assert.deepEqual(servedVacancies(served, null, teams, 'away'), []); assert.deepEqual(servedVacancies([{ ...served[0], ability: 'XXX-00-F' }], sim, teams, 'away'), []);
  const src = readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8');
  assert.match(src, /absenceTrack\.observe\(s\.seed, s, teams\)/); assert.match(src, /absenceTrack\.frame\(s, teams, dLook, now, animate\)/); assert.match(src, /servedVacancies\(servedNow, ev\.sim, teams/); assert.match(src, /staged: ev\.fxStaged/); assert.match(src, /withoutSlots\(look0\.presnap, pre8\.vacant\)/); assert.match(src, /edge-chip absent returned/);
  assert.match(readFileSync(new URL('../src/ui/screens/ability-reviewer.js', import.meta.url), 'utf8'), /sequenceStaged\(plays, pi\)/);
});
