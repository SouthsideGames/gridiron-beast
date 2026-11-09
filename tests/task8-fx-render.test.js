// Task 8 football ability presentation, render smoke (no DOM; docs/task8/FX_FOOTBALL_MATRIX.md): for every football ability (first
// form, mastery 0) the reviewer's activation play is drawn through the real field renderer (field-view.js fieldSvg with the fx hook)
// at full, low and min quality: well-formed markup, no NaN, the same string twice (deterministic), the Task 8 layer present at full and
// min, status marks kept at min. Drawing never touches the simulation record (visuals never feed the simulation), the legacy fx
// descriptor fields stay (backward compatible interface), and formula kicks get a drawable kick sim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { buildFx, buildKickFx, fxSvg, endHold, shakeBetween, kickSim } from '../src/ui/ability-fx.js';
import { statusBadge, chargeBar, battery } from '../src/ui/fx/overhead.js';
import { readiness } from '../src/ui/fx/charge.js';
import { prepare, fieldAt } from './helpers/fx-football.js';

const CAT = reviewCatalog();
const VOID = new Set(['circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'path', 'stop', 'use', 'image']);
function wellFormed(svg) { const st = []; for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) { const [, close, name, , self] = m; if (self || (VOID.has(name) && !close && /\/$/.test(m[0].slice(0, -1)))) continue; if (close) { if (st.pop() !== name) return `unbalanced </${name}>`; } else if (!self) st.push(name); } return st.length ? `unclosed <${st[st.length - 1]}>` : null; }

test('every football ability: the activation play draws through fieldSvg at every quality, deterministic, no NaN, simulation untouched', () => {
  assert.equal(CAT.length, 72);
  for (const c of CAT) {
    const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); const before = JSON.stringify(r.plays.map((p) => p.sim || null));
    const P = prepare(r, c); const act = P[r.activation]?.fx ? P[r.activation] : P.find((x) => x.fx);
    if (!act) { assert.ok(['snowmoth'].includes(c.family), `${c.abilityId}: a drawable play`); continue; }
    const own = act.fx.t8.items.find((it) => it.id === c.abilityId) || null; const t = own ? own.t0 + 0.2 : 0.2;
    for (const q of ['full', 'low', 'min']) {
      const a = fieldAt(act, t, q), b = fieldAt(act, t, q);
      assert.equal(a, b, `${c.abilityId} ${q}: deterministic`); assert.ok(!/NaN|undefined|Infinity/.test(a), `${c.abilityId} ${q}: no NaN`);
      assert.equal(wellFormed(a), null, `${c.abilityId} ${q}: well-formed`);
    }
    assert.equal(JSON.stringify(r.plays.map((p) => p.sim || null)), before, `${c.abilityId}: drawing never changes the simulation record`);
  }
});

test('the fx descriptor stays backward compatible (legacy fields, buildFx(sim, lookup) without meta, endHold, shakes)', () => {
  const c = CAT.find((x) => x.family === 'tempestra'); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); const p = r.plays[r.activation];
  const fx = buildFx(p.sim, () => null);
  for (const k of ['fx', 'labels', 'contacts', 'traits', 'shakes']) assert.ok(Array.isArray(fx[k]), k);
  assert.ok(fx.t8 && Array.isArray(fx.t8.items) && fx.t8.items.length > 0);
  const pos = () => [0, 10, 0, 0]; const o = fxSvg(fx, 2, pos, { quality: 'full', toSvg: (x, y) => [y, 30 - x] }); for (const k of ['under', 'over', 'ball']) assert.equal(typeof o[k], 'string');
  assert.ok(endHold(fx, p.sim.frames[p.sim.frames.length - 1].t) >= 0); assert.equal(typeof shakeBetween(fx, 0, 10), 'boolean');
  assert.deepEqual(fxSvg(null, 0, pos), { under: '', over: '', ball: '' });
});

test('formula kicks: Second Chance, Dragon Roar and Stone Cradle get a drawable kick with their cue; ordinary kicks get none', () => {
  const sc = kickSim({ kind: 'field_goal', from: 40, res: { good: true, distance: 57, secondChance: true, ability: 'ICE-06-F' } });
  assert.ok(sc.frames.length > 5); assert.equal(sc.events[0].ability, 'ICE-06-F'); assert.equal(sc.frames[sc.frames.length - 1].ball[1], 0, 'a good Second Chance ends between the uprights');
  const miss = kickSim({ kind: 'field_goal', from: 40, res: { good: false, distance: 57, secondChance: true, ability: 'ICE-06-F' } }); assert.notEqual(miss.frames[miss.frames.length - 1].ball[1], 0, 'still wide');
  assert.equal(kickSim({ kind: 'field_goal', from: 40, res: { good: true, distance: 50, signature: 'DRA-05-F' } }).events[0].ability, 'DRA-05-F');
  assert.equal(kickSim({ kind: 'punt', from: 30, res: { distance: 40, catchAt: 30, ballOn: 30, returnYards: 0, cradled: true, ability: 'EAR-04-F' } }).events[0].ability, 'EAR-04-F');
  assert.equal(kickSim({ kind: 'field_goal', from: 40, res: { good: true, distance: 50 } }).events.length, 0);
});

test('over-the-head information: the shared status badge, charge and recharge bars and battery draw; readiness reads contract state', () => {
  assert.match(statusBadge(0, 0, 'slowed', 2), /#e9e9ee/); assert.match(statusBadge(0, 0, 'slowed', 2), />2</);
  assert.match(chargeBar(0, 0, { n: 2, max: 3 }, '#fff', 0), /rect/); assert.match(chargeBar(0, 0, { cd: 2, cdMax: 4 }, '#fff', 0), />2</); assert.match(battery(0, 0, 0.2), /#ff4d4d/);
  assert.deepEqual(readiness('emberfox', { charges: 2, ignited: false }), { n: 2, max: 3, ready: false, cd: 0, cdMax: 0, spent: false });
  assert.equal(readiness('emberfox', { charges: 0, ignited: true }).ready, true);
  assert.equal(readiness('hailfang', { cd: 0 }), null, 'a ready repeatable ability shows no bar'); assert.equal(readiness('hailfang', { cd: 2 }, 'hailfang:0', 0).cd, 2);
  assert.equal(readiness('nonexistent', { cd: 1 }), null);
});

test('a host that does not pre-roll (an instant replay, practice) gets the pre-snap choreography inside the play; the snapshot feeds the HUD', () => {
  for (const fam of ['prism', 'tsunarok', 'aegistron']) {
    const c = CAT.find((x) => x.family === fam); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 });
    for (const p of r.plays) { if (!p.sim?.frames?.length) continue; const live = buildFx(p.sim, () => null); assert.equal(live.preroll, 0, `${fam}: no pre-roll without meta`);
      for (const it of live.t8.items) assert.ok(it.start >= 0, `${fam}: ${it.kind} starts in the play`); for (const f of live.t8.fields) assert.equal(f.lead, 0); }
  }
  const c = CAT.find((x) => x.family === 'hailfang'); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 });
  assert.ok(r.plays.some((p) => p.sim?.t8view?.hud && Object.keys(p.sim.t8view.hud).length), 'the rules engine snapshots over-the-head data at the snap');
  assert.ok(r.plays.some((p) => p.sim && buildFx(p.sim, () => null).t8.hud), 'buildFx reads it without meta');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// The match screen's integration (docs/task8/FX_FOOTBALL_MATRIX.md I1, I2, I6; src/ui/fx/match-fx.js, src/ui/screens/match.js).
import { readFileSync } from 'node:fs';
import * as R from '../src/sim/rules.js';
import { PLAYS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { fieldSvg, presnapLook } from '../src/ui/field-view.js';
import { kickPlay, presnapFields, presnapFx, createRevealClock, fieldKey } from '../src/ui/fx/match-fx.js';
import { FIELD_REVEAL } from '../src/ui/fx/fields-fx.js';
import '../src/sim/abilities/index.js';

const MATCH_SRC = readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8');
/** A rules.js game between two synthetic clubs (ids `${club}_${slot}`), kicked off. */
function matchGame(seed) {
  const mk = (name, s) => { const x = lineup(s, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
  const teams = { home: mk('H', 11), away: mk('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams);
  return { g, teams };
}
const kickerLookup = (team, slot) => (team === 'off' && (slot === 'K' || slot === 'P') ? { element: 'Ice', name: 'Kicker', species: null } : null);

test('I1: the match screen plays a formula kick through the reviewer\'s builder; the three kick abilities draw on it, an ordinary kick is unchanged', () => {
  const kicks = { 'ICE-06-F': { kind: 'field_goal', from: 40, res: { good: true, distance: 57, secondChance: true, ability: 'ICE-06-F' } }, 'DRA-05-F': { kind: 'field_goal', from: 40, res: { good: true, distance: 50, signature: 'DRA-05-F' } }, 'EAR-04-F': { kind: 'punt', from: 30, res: { distance: 40, catchAt: 30, ballOn: 30, returnYards: 0, cradled: true, ability: 'EAR-04-F' } } };
  for (const [id, ev] of Object.entries(kicks)) {
    const K = kickPlay(ev, kickerLookup, { preroll: true }); assert.ok(K?.sim.kick && K.sim.frames.length > 5, `${id}: drawable`); assert.equal(K.sim.kickAbility, id);
    assert.ok(K.fx, `${id}: the match gets an effect state (it was null before)`); const own = K.fx.t8.items.find((it) => it.id === id); assert.ok(own?.main, `${id}: the ability's look is on the kick`);
    const same = buildKickFx(ev, kickerLookup, { preroll: true }); assert.deepEqual(K.sim.events, same.sim.events, `${id}: the same events the reviewer's kick carries`);
    const t = own.t0 + 0.15; const at = (fx) => fieldAt({ sim: K.sim, fx, kick: true }, t, 'full');
    assert.notEqual(at(K.fx), at(null), `${id}: the look changes the drawn kick`); assert.ok(!/NaN|undefined|Infinity/.test(at(K.fx)), `${id}: no NaN`);
    assert.ok(endHold(K.fx, K.sim.frames[K.sim.frames.length - 1].t) >= 0);
  }
  assert.ok(kickPlay(kicks['DRA-05-F'], kickerLookup, { preroll: true }).fx.preroll > 0, 'Dragon Roar: the roar before the kick is pre-rolled');
  for (const ev of [{ kind: 'field_goal', from: 40, res: { good: true, distance: 50 } }, { kind: 'punt', from: 30, res: { distance: 40, catchAt: 30, ballOn: 35, returnYards: 5 } }, { kind: 'kickoff', res: { touchback: true } }]) {
    const K = kickPlay(ev, kickerLookup); assert.ok(K.sim.frames.length > 1, `${ev.kind}: still animated`); assert.equal(K.fx, null, `${ev.kind}: an ordinary kick has no effect layer (drawn as before)`); assert.equal(K.sim.events.length, 0);
  }
  assert.equal(kickPlay({ kind: 'field_goal' }, kickerLookup), null, 'no result: nothing to draw');
  assert.match(MATCH_SRC, /kickPlay\(ev, kickLookup\(f, ev\.kicking\)/, 'afterStep builds the kick with kickPlay'); assert.ok(!/anim\.fx = sim\.kick \? null/.test(MATCH_SRC), 'kick animations no longer drop their effects');
});

test('I2: a banked field is previewed on the play-call screen exactly where the snap creates it; the preview never writes the game', () => {
  const { g, teams } = matchGame(5); const dside = R.opponent(g.possession); const cb = teams[dside].defense.CB1;
  g.t8 = { status: {}, fields: { list: [], pending: [{ owner: cb.id, ownerTeam: dside, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 20, lifetime: 2, clock: 'teamDefense', width: 6, length: 6, lbDepth: 5, latHome: 4 }], seq: 0 } };
  const before = JSON.stringify(g); const calls = { offense: 'quick_slants', defense: 'cover_3' };
  const list = presnapFields(g, teams, calls); assert.equal(JSON.stringify(g), before, 'the preview reads only');
  assert.equal(list.length, 1); assert.ok(list[0].pending && list[0].isNew); assert.equal(list[0].field.ability, 'DAR-01-F'); assert.equal(list[0].field.fresh, undefined);
  assert.deepEqual(R.previewPendingFields(g, teams, calls.offense, calls.defense).map((f) => f.usesDefenseAlign), [false]);
  assert.deepEqual(presnapFields(g, teams, null), [], 'without both calls a banked field is not guessed');
  assert.deepEqual(presnapFields({ ...g, phase: 'kickoff' }, teams, calls), [], 'only before a scrimmage snap');
  // the play-call screen draws it (rectangle + element decoration) through the real renderer, under the monsters
  const clock = createRevealClock(); const C0 = clock.frame(g.seed, list, 1000); assert.equal(C0.fields[0].fresh, true); assert.equal(C0.time, -FIELD_REVEAL['DAR-01-F'].lead); assert.deepEqual(C0.shown, [fieldKey(list[0].field)]);
  const pre = (C, extra = {}) => fieldSvg({ ballOn: g.ballOn, ballLat: g.ballLat, presnap: { play: PLAYS.quick_slants, offensePlay: PLAYS.quick_slants, defensePlay: presnapLook('cover_3') }, fields: C.fields, fx: presnapFx(C.fields), time: C.time, ...extra });
  const bare = fieldSvg({ ballOn: g.ballOn, ballLat: g.ballLat, presnap: { play: PLAYS.quick_slants, offensePlay: PLAYS.quick_slants, defensePlay: presnapLook('cover_3') } });
  assert.ok(!/t8-field/.test(bare)); const settled = clock.frame(g.seed, list, 9000); assert.equal(settled.until, 0); assert.equal(settled.fields[0].fresh, undefined);
  const shown = pre(settled); assert.match(shown, /class="t8-field" data-element="Dark"/); assert.ok(shown.length > bare.length + 200, 'decoration drawn'); assert.ok(!/NaN|undefined|Infinity/.test(shown)); assert.equal(wellFormed(shown), null);
  assert.ok(shown.indexOf('t8-field') < shown.indexOf('fv-pl'), 'ground marks under the monsters');
  // the reveal: once, from the first time it is shown; a re-render continues it, never restarts it; reduced motion shows it settled
  const mid = clock.frame(g.seed, list, 1500); assert.ok(mid.time > C0.time && mid.fields[0].fresh, 'a later render continues the same reveal');
  assert.notEqual(pre(C0), pre(settled), 'the reveal differs from the settled field'); assert.notEqual(pre(C0), pre(mid), 'and it moves');
  assert.equal(createRevealClock().frame(g.seed, list, 1000, false).until, 0, 'reduced motion: no reveal animation'); assert.equal(createRevealClock().frame(g.seed, list, 1000, false).fields[0].fresh, undefined);
  assert.equal(clock.frame('another game', list, 9000).fields[0].fresh, true, 'a new game starts fresh');
  // the snap creates the same rectangle; the play then skips the reveal it already showed
  const ev = R.runScrimmagePlay(g, teams, calls.offense, calls.defense); const made = ev.sim.fields.find((f) => f.ability === 'DAR-01-F');
  assert.ok(made?.fresh); assert.deepEqual(made.yard, list[0].field.yard); assert.deepEqual(made.lat, list[0].field.lat);
  const again = buildFx(ev.sim, () => null, { preroll: true }), skip = buildFx(ev.sim, () => null, { preroll: true, revealed: C0.shown });
  assert.ok(again.t8.fields[0].fresh && again.preroll >= FIELD_REVEAL['DAR-01-F'].lead, 'not shown before: the reveal is pre-rolled (I6)');
  assert.equal(skip.t8.fields[0].fresh, false); assert.equal(skip.fieldAlpha(made.id, 0), 1, 'shown before: it is simply there'); assert.equal(ev.sim.fields[0].fresh, true, 'the record is not edited');
  // now active: it stays on the next play-call screens without a second reveal
  const next = presnapFields(g, teams, calls); const act = next.find((x) => x.field.ability === 'DAR-01-F'); if (act) { assert.equal(act.pending, false); assert.equal(act.isNew, false); }
});

test('I2: nothing hidden is shown: a field placed from a defender\'s alignment is not previewed against the opponent\'s call; offensive alignments are public', () => {
  const { g, teams } = matchGame(7); const dside = R.opponent(g.possession); const lb = teams[dside].defense.LB1;
  g.t8 = { status: {}, fields: { list: [], pending: [{ owner: lb.id, ownerTeam: dside, side: 'def', type: 'Fire', ability: 'FIR-02-F', strength: 20, lifetime: 2, clock: 'teamDefense', width: 6, length: 6, depth: 'creator', lateral: 'creator' }], seq: 0 } };
  const calls = { offense: 'quick_slants', defense: 'cover_3' };
  assert.equal(R.previewPendingFields(g, teams, calls.offense, calls.defense)[0].usesDefenseAlign, true);
  assert.equal(presnapFields(g, teams, calls, { hideDefenseAlign: false }).length, 1, 'your own defense: you know your call');
  assert.equal(presnapFields(g, teams, calls, { hideDefenseAlign: true }).length, 0, 'the opponent\'s defense: not shown before the snap');
  for (const p of Object.values(PLAYS)) if (p.side === 'offense') { const look = presnapLook(p.id); for (const s of p.onField) assert.deepEqual(look.align[s], p.align[s], `${p.id} ${s}: the offense lines up as its formation shows`); }
  assert.match(MATCH_SRC, /presnapFields\(s, teams, calls, \{ hideDefenseAlign: mine, formation: drawn \}\)/);
});

test('I6: the match screen opts into the pre-roll and starts the play before the snap', () => {
  assert.match(MATCH_SRC, /preroll: true/); assert.match(MATCH_SRC, /anim\.pre = anim\.fx\?\.preroll \|\| 0/); assert.match(MATCH_SRC, /if \(anim\.pre && now < anim\.start/);
  for (const fam of ['aegistron', 'cerebrix', 'prism']) { const c = CAT.find((x) => x.family === fam); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 }); const p = r.plays[r.activation];
    const live = buildFx(p.sim, () => null, { preroll: true }); assert.ok(live.preroll > 0, `${fam}: time before the snap`);
    const P = { sim: p.sim, fx: live }; const a = fieldAt(P, -live.preroll + 0.05), b = fieldAt(P, 0); assert.notEqual(a, b, `${fam}: the pre-roll draws its own frames`); assert.ok(!/NaN|undefined|Infinity/.test(a)); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// The six fields a contract creates inside the snap (Runway, Crosswind Rescue, Bloom Break, Static Field, Charge Strip, Bramble Trap):
// rules.js previewPendingFields { inSnap: true } runs the snap's own pre-snap producers on a copy. The preview is exactly what the snap
// creates, never writes the game, and says whether the place follows the calls (then it is not fixed before them and not shown).
import { toPlayFrame } from '../src/sim/t8/fields.js';
const IN_SNAP = [
  { id: 'WIN-01-F', family: 'gustling', unit: 'offense', slot: 'WR1', type: 'Wind', prime: null, dependent: false },
  { id: 'WIN-04-F', family: 'windlynx', unit: 'defense', slot: 'FS', type: 'Wind', prime: { charges: 2 }, dependent: false, count: 2 },
  { id: 'NAT-01-F', family: 'thornkit', unit: 'offense', slot: 'WR1', type: 'Nature', prime: { cd: 0, token: true, fresh: false }, dependent: false, count: 2 },
  { id: 'ELE-04-F', family: 'stormlynx', unit: 'defense', slot: 'FS', type: 'Electric', prime: null, dependent: true },
  { id: 'ELE-02-F', family: 'voltfin', unit: 'offense', slot: 'RB', type: 'Electric', prime: { cd: 0, token: true, fresh: false }, dependent: true },
  { id: 'NAT-05-F', family: 'thornback', unit: 'offense', slot: 'TE', type: 'Nature', prime: { cd: 0, token: true, fresh: false }, dependent: true },
];
function inSnapGame(x, seed) {
  const { g, teams } = matchGame(seed); const side = x.unit === 'offense' ? g.possession : R.opponent(g.possession); const m = teams[side][x.unit][x.slot]; assert.ok(m?.id, `${x.id}: a ${x.slot}`);
  Object.assign(m, { species: x.family, form: `${x.family}:0`, mastery: 0, type: x.type }); g.t8 = { status: {}, ...(x.prime ? { ability: { [m.id]: { ...x.prime } } } : {}) };
  return { g, teams, m, side };
}

test('in-snap fields: the dry-run preview is exactly the field the snap creates, for each of the six, and the game is only read', () => {
  const calls = { offense: 'quick_slants', defense: 'cover_3' };
  for (const x of IN_SNAP) for (const seed of [5, 6, 7]) {
    const { g, teams, m } = inSnapGame(x, seed); const before = JSON.stringify(g); const frame = { home: g.possession === 'home', ballOn: g.ballOn, ballLat: g.ballLat || 0 };
    assert.deepEqual(R.previewPendingFields(g, teams, calls.offense, calls.defense), [], `${x.id}: nothing banked, so the plain preview lists nothing`);
    const pv = R.previewPendingFields(g, teams, calls.offense, calls.defense, { inSnap: true }); assert.equal(JSON.stringify(g), before, `${x.id}: the dry run never writes the game (its Task 8 block, its dice)`);
    assert.equal(pv.length, x.count || 1, `${x.id}: ${pv.length} field(s) previewed`); for (const f of pv) { assert.equal(f.ability, x.id); assert.equal(f.owner, m.id); assert.equal(f.inSnap, true); assert.equal(f.callDependent, x.dependent, `${x.id}: place ${x.dependent ? 'follows' : 'does not follow'} the calls`); }
    assert.deepEqual(R.previewPendingFields(g, teams, calls.offense, calls.defense, { inSnap: true }), pv, 'the same again: nothing is consumed');
    const shown = presnapFields(g, teams, calls); assert.equal(JSON.stringify(g), before);
    if (x.dependent) assert.deepEqual(shown, [], `${x.id}: not fixed before the calls, so the play-call screen does not show it (its reveal is pre-rolled)`);
    else { assert.equal(shown.length, pv.length); for (const s of shown) { assert.ok(s.isNew && s.pending); assert.equal(s.field.inSnap, undefined); assert.equal(s.field.fresh, undefined); } }
    const ev = R.runScrimmagePlay(g, teams, calls.offense, calls.defense); const made = ev.sim.fields.filter((f) => f.ability === x.id); assert.equal(made.length, pv.length, `${x.id}: the snap creates them`);
    const want = toPlayFrame(pv, frame); made.forEach((f, i) => { assert.ok(f.fresh); assert.deepEqual(f.yard, want[i].yard, `${x.id}: same yards`); assert.deepEqual(f.lat, want[i].lat, `${x.id}: same width`); assert.equal(f.type, want[i].type); });
    if (!x.dependent) { // revealed on the play-call screen: the play then skips the reveal
      const key = [...new Set(shown.map((s) => fieldKey(s.field)))]; const live = buildFx(ev.sim, () => null, { preroll: true, revealed: key }); for (const f of live.t8.fields.filter((q) => q.ability === x.id)) assert.equal(f.fresh, false);
    } else assert.ok(buildFx(ev.sim, () => null, { preroll: true }).t8.fields.filter((q) => q.ability === x.id).every((f) => f.fresh), `${x.id}: its reveal plays in the pre-roll`);
  }
});

test('in-snap fields: Runway, Crosswind Rescue and Bloom Break sit in the same place whatever is called; the other three move with the calls', () => {
  const offs = Object.values(PLAYS).filter((p) => p.side === 'offense' && !p.legendary).map((p) => p.id), defs = Object.values(PLAYS).filter((p) => p.side === 'defense' && !p.legendary).map((p) => p.id);
  for (const x of IN_SNAP) {
    const { g, teams } = inSnapGame(x, 9); const before = JSON.stringify(g); const places = new Set(); let listed = 0, flagged = 0;
    const pairs = x.unit === 'offense' && x.id !== 'NAT-05-F' ? offs.map((o) => [o, 'cover_3']) : x.unit === 'defense' ? defs.map((d) => ['quick_slants', d]) : [...offs.slice(0, 6).map((o) => [o, 'cover_3']), ...defs.map((d) => ['quick_slants', d])];
    for (const [o, d] of pairs) { const pv = R.previewPendingFields(g, teams, o, d, { inSnap: true }).filter((f) => f.ability === x.id); if (!pv.length) continue; listed += 1; if (pv.some((f) => f.callDependent)) flagged += 1; places.add(JSON.stringify(pv.map((f) => [f.yard, f.lat]))); }
    assert.equal(JSON.stringify(g), before); assert.ok(listed >= 3, `${x.id}: previewed for ${listed} call pairs`);
    if (x.dependent) { assert.equal(flagged, listed, `${x.id}: always flagged as following the calls`); assert.ok(places.size > 1, `${x.id}: ${places.size} different places over the playbook: it is not fixed before the choice`); }
    else { assert.equal(flagged, 0); assert.equal(places.size, 1, `${x.id}: one place for every call that has him on the field`); }
  }
  assert.match(MATCH_SRC, /presnapFields\(s, teams, calls, \{ hideDefenseAlign: mine, formation: drawn \}\)/);
});

test('in-snap fields: before a play is chosen, the formation on screen already shows the ones whose place does not follow the calls; nothing else is guessed', () => {
  const drawn = { offense: 'quick_slants', defense: 'cover_3' };
  for (const x of IN_SNAP) {
    const { g, teams } = inSnapGame(x, 5); const before = JSON.stringify(g); const shown = presnapFields(g, teams, null, { formation: drawn }); assert.equal(JSON.stringify(g), before);
    if (x.dependent) assert.deepEqual(shown, [], `${x.id}: its place follows the calls, so nothing is shown before them`);
    else { assert.equal(shown.length, x.count || 1, `${x.id}: shown for the formation on screen`); assert.deepEqual(shown.map((s) => [s.field.yard, s.field.lat]), presnapFields(g, teams, drawn).map((s) => [s.field.yard, s.field.lat]), `${x.id}: where the chosen call will have it`); }
  }
  // a banked field is still never guessed without both calls (its place may follow them)
  const { g, teams } = matchGame(5); const dside = R.opponent(g.possession); g.t8 = { status: {}, fields: { list: [], pending: [{ owner: teams[dside].defense.CB1.id, ownerTeam: dside, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 20, lifetime: 2, clock: 'teamDefense', width: 6, length: 6, lbDepth: 5, latHome: 4 }], seq: 0 } };
  assert.deepEqual(presnapFields(g, teams, null, { formation: drawn }), []); assert.equal(presnapFields(g, teams, drawn).length, 1);
});
