// Task 8 M3: in-play effects of element fields (spec §11), src/sim/t8/field-effects.js on synthetic fields, the engine wiring and
// the rules.js frame conversion for both offense directions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Fd from '../src/sim/t8/fields.js';
import { createFieldPlay, STEAM, FROSTSTORM, MAGNETIC_STORM, LIVING_TERRAIN, PSYCHIC_DEADBAND } from '../src/sim/t8/field-effects.js';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';

const DT = 0.05;
const F = (id, type, strength, { yard = [-10, 10], lat = [-10, 10], createdAt = 1, payload = null } = {}) => ({ id, type, strength, createdAt, owner: `src_${id}`, ability: 'TEST', payload, yard, lat });
const A = (slot, type, x = 0, y = 0, extra = {}) => ({ team: 'off', slot, mid: `m_${slot}`, name: slot, type, x, y, vx: 0, vy: 0, maxSpeed: 8, attrs: { awareness: 60, catching: 60, blocking: 60 }, stun: 0, noEngage: 0, engaged: null, ...extra });
function world(fields, actors, t8 = { status: {} }) { const events = []; const fx = createFieldPlay({ fields, actors, seed: 7, t8, log: (text, d) => events.push({ text, ...d }), dt: DT, bounds: { left: -26, right: 26 } }); return { fx, events, t8 }; }

test('no fields: no field play is built (plays without fields are unchanged)', () => {
  assert.equal(createFieldPlay({ fields: [], actors: [] }), null); assert.equal(createFieldPlay({ fields: null, actors: [] }), null);
  const L = lineup(11, 60), D = lineup(12, 62); const args = { offensePlay: PLAYS[OFFENSE_IDS[0]], defensePlay: PLAYS[DEFENSE_IDS[0]], offense: L.offense, defense: D.defense, ballOn: 30, seed: 5 };
  const a = simulatePlay(args), b = simulatePlay({ ...args, options: { fields: [] } });
  assert.deepEqual(b.frames, a.frames); assert.equal(b.fields, undefined);
});

test('Fire and Wind: maximum-speed modifiers through the shared aggregation; same-type neutrality; strongest same-type; status + field add', () => {
  const p = A('p', 'Water'), fire = A('f', 'Fire'), wind = A('w', 'Wind');
  const { fx } = world([F('f1', 'Fire', 10), F('f2', 'Fire', 25, { createdAt: 2 }), F('w1', 'Wind', 15)], [p, fire, wind]); fx.tick(DT);
  assert.equal(p.maxSpeedMods.field, -25 + 15, 'strongest Fire (25, not 35) plus Wind: the same property adds');
  assert.equal(fire.maxSpeedMods.field, 15, 'a Fire monster feels only the Wind'); assert.equal(wind.maxSpeedMods.field, -25, 'a Wind monster only the Fire');
  const q = A('q', 'Water'); const w2 = world([F('f', 'Fire', 10)], [q]); w2.fx.tick(DT);
  q.maxSpeedMods.status = -15; assert.equal(Fd.maxSpeedFactor(q.maxSpeedMods), 0.75, 'status -15% + field -10% = -25%');
  q.x = 50; w2.fx.tick(2 * DT); assert.equal(q.maxSpeedMods.field, undefined, 'leaving restores'); assert.equal(Fd.maxSpeedFactor(q.maxSpeedMods), 0.85);
  assert.equal(Fd.maxSpeedFactor({ a: -60, b: -40 }), 0.25, 'bounded at -75%'); assert.equal(Fd.maxSpeedFactor({ a: 40, b: 40 }), 1.5, 'bounded at +50%'); assert.equal(Fd.maxSpeedFactor(null), 1);
});

test('Nature reduces turning only; Ice reduces braking only and extends the stopping slide', () => {
  const n = A('n', 'Fire', 0, 0, { vx: 5, vy: 0 }), nn = A('nn', 'Nature', 0, 0, { vx: 5, vy: 0 });
  const { fx } = world([F('n1', 'Nature', 20)], [n, nn]); fx.tick(DT);
  assert.deepEqual(fx.shapeDv(n, 0.3, 0.4).map((v) => +v.toFixed(6)), [0.3, 0.32], 'turning share -20%, straight acceleration unchanged');
  assert.deepEqual(fx.shapeDv(n, -0.3, 0).map((v) => +v.toFixed(6)), [-0.3, 0], 'Nature leaves braking alone');
  assert.equal(fx.shapeDv(nn, 0.3, 0.4), null, 'a Nature monster is unaffected');
  const i = A('i', 'Fire', 0, 0, { vx: 5, vy: 0 }), ii = A('ii', 'Ice', 0, 0, { vx: 5, vy: 0 });
  const w = world([F('i1', 'Ice', 25)], [i, ii]); w.fx.tick(DT);
  assert.deepEqual(w.fx.shapeDv(i, -0.4, 0.2).map((v) => +v.toFixed(6)), [-0.3, 0.2], 'braking -25%, turning unchanged');
  assert.deepEqual(w.fx.shapeDv(i, 0.4, 0).map((v) => +v.toFixed(6)), [0.4, 0], 'acceleration unchanged');
  assert.ok(w.fx.coast(i) > 0.93 && w.fx.coast(ii) === 0.93, 'a coasting (stunned) slide lasts longer, only for non-Ice');
  assert.equal(w.fx.shapeDv(ii, -0.4, 0.2), null);
});

test('Earth resists contact displacement without immunity; Dark reduces effective Awareness and restores it on leaving', () => {
  const e = A('e', 'Fire'), ee = A('ee', 'Earth'); const { fx } = world([F('e1', 'Earth', 30)], [e, ee]); fx.tick(DT);
  assert.equal(+fx.resist(e).toFixed(6), 0.7); assert.equal(fx.resist(ee), 1);
  const big = A('b', 'Fire'); const w = world([F('e2', 'Earth', 100)], [big]); w.fx.tick(DT); assert.ok(w.fx.resist(big) > 0, 'never a guaranteed immunity');
  const d = A('d', 'Fire'), dd = A('dd', 'Dark'); const v = world([F('d1', 'Dark', 15)], [d, dd]); v.fx.tick(DT);
  assert.equal(+d.attrs.awareness.toFixed(6), 51); assert.equal(dd.attrs.awareness, 60);
  v.fx.tick(2 * DT); assert.equal(+d.attrs.awareness.toFixed(6), 51, 'no compounding tick to tick');
  d.x = 40; v.fx.tick(3 * DT); assert.equal(+d.attrs.awareness.toFixed(6), 60, 'restored');
});

test('Electric: chance to apply Stunned on first entry through the shared gate; no re-entry reroll; Electric monsters unaffected; occupied slot blocks', () => {
  const a = A('a', 'Fire'), e = A('e', 'Electric'), b = A('b', 'Fire'); const t8 = { status: { m_b: { id: 'shielded', strength: 1, originalStrength: 1, remaining: 2, applications: 1 } } };
  const { fx, events } = world([F('z', 'Electric', 100)], [a, e, b], t8); fx.tick(DT);
  assert.equal(t8.status.m_a.id, 'stunned'); assert.equal(t8.status.m_a.restOfPlay, true); assert.ok(a.stun > 100 && a.vx === 0, 'movement stops for the rest of the play');
  assert.equal(t8.status.m_e, undefined); assert.equal(e.stun, 0);
  assert.equal(t8.status.m_b.id, 'shielded', 'a different status occupies the slot: blocked'); assert.equal(b.stun, 0);
  assert.ok(events.some((x) => x.kind === 'field_status_blocked' && x.by === 'b'));
  const c = A('c', 'Fire'); const w = world([F('z0', 'Electric', 0)], [c]); w.fx.tick(DT); c.x = 50; w.fx.tick(2 * DT);
  c.x = 0; w.fx.tick(4 * DT); assert.equal(c.stun, 0, '0% never stuns');
  assert.equal(w.events.filter((x) => x.kind === 'field_enter').length, 1, 'one entry per field per play (no re-entry reroll)');
});

test('Water: a sharp cut or stop rolls the slip; success Stumbles (40% current speed, once a play); Water monsters immune; no cut, no roll', () => {
  const a = A('a', 'Fire', 0, 0, { vx: 6, vy: 0, cutUntil: 0 }), w = A('w', 'Water', 0, 0, { vx: 6, vy: 0, cutUntil: 0 }), still = A('s', 'Fire', 0, 0, { vx: 6, vy: 0, cutUntil: 0 });
  const t8 = { status: {} }; const { fx, events } = world([F('p', 'Water', 100)], [a, w, still], t8); fx.tick(DT);
  assert.equal(a.vx, 6, 'no cut yet'); a.cutUntil = DT + 0.3; w.cutUntil = DT + 0.3; fx.tick(2 * DT);
  assert.equal(+a.vx.toFixed(6), 3.6); assert.equal(t8.status.m_a.id, 'stumbled'); assert.equal(w.vx, 6); assert.equal(t8.status.m_w, undefined); assert.equal(still.vx, 6);
  a.vx = 6; a.cutUntil = 0.9; fx.tick(3 * DT); assert.equal(a.vx, 6, 'one successful slip per monster per play');
  assert.equal(events.filter((x) => x.kind === 'field_slip').length, 1);
});

test('Metal: the first changed automatic decision inside waits one AI decision update, then is adopted; later changes pass; Metal monsters exempt', () => {
  const a = A('a', 'Fire'), m = A('m', 'Metal'); const { fx } = world([F('g', 'Metal', null)], [a, m]); fx.tick(DT);
  assert.equal(fx.defer(a, 'read', true, false, 0.3), false, 'held'); fx.tick(0.2); assert.equal(fx.defer(a, 'read', true, false, 0.3), false, 'still held');
  fx.tick(0.3); assert.equal(fx.defer(a, 'read', true, false, 0.3), true, 'adopted at the next update');
  assert.equal(fx.defer(a, 'engagement', 'X', null, 0.6), 'X', 'only the first changed decision is deferred');
  assert.equal(fx.defer(m, 'read', true, false, 0.3), true);
});

test('Psychic: bounded inward pull at the field strength of applicable maximum speed, stopping at the centre deadband', () => {
  const a = A('a', 'Fire', 4, 0), p = A('p', 'Psychic', 4, 0), c = A('c', 'Fire', 0.5, 0);
  const { fx } = world([F('y', 'Psychic', 20)], [a, p, c]); fx.tick(DT); fx.displace(a); fx.displace(p); fx.displace(c);
  assert.equal(+a.x.toFixed(6), +(4 - 0.2 * 8 * DT).toFixed(6)); assert.equal(p.x, 4); assert.equal(c.x, 0.5, 'inside the deadband');
  a.maxSpeed = 8 * 0.5; const x0 = a.x; // the engine's one aggregation (refreshMaxSpeed) has applied a −50% status to a.maxSpeed fx.displace(a); assert.equal(+(x0 - a.x).toFixed(6), +(0.2 * 4 * DT).toFixed(6), 'applicable (modified) maximum speed');
  const e = A('e', 'Fire', 1.2, 0); fx.tick(2 * DT); fx.displace(e); assert.ok(e.x >= PSYCHIC_DEADBAND - 1e-9, 'never pulled inside the deadband');
});

test('Steam (Fire + Water): nonparent Catching and Blocking -15% once, parent effects replaced; parent types exempt from the hybrid', () => {
  const n = A('n', 'Nature', 0, 0, { vx: 6, cutUntil: 0 }), f = A('f', 'Fire'), w = A('w', 'Water');
  const fields = [F('fi', 'Fire', 20, { createdAt: 1 }), F('wa', 'Water', 100, { createdAt: 2 })]; const { fx } = world(fields, [n, f, w]); fx.tick(DT); fx.tick(2 * DT);
  assert.equal(+n.attrs.catching.toFixed(6), 60 * (1 - STEAM.catching)); assert.equal(+n.attrs.blocking.toFixed(6), 60 * (1 - STEAM.blocking));
  assert.equal(n.maxSpeedMods?.field, undefined, 'the Fire parent effect is replaced inside the hybrid');
  n.cutUntil = 1; fx.tick(3 * DT); assert.equal(n.vx, 6, 'no Water slip inside Steam');
  for (const x of [f, w]) { assert.equal(x.attrs.catching, 60); assert.equal(x.fx.hybrid, null); }
  const out = A('o', 'Nature', 0, 0); const fields2 = [F('fi', 'Fire', 20, { yard: [-10, 0] }), F('wa', 'Water', 50, { yard: [0, 10], createdAt: 2 })];
  const v = world(fields2, [out]); out.x = -5; v.fx.tick(DT); assert.equal(out.maxSpeedMods.field, -20, 'outside the overlap the base Fire applies');
});

test('Froststorm drifts 15% of applicable max speed to one seeded side, capped at 2 yd net; Magnetic Storm pairs and pulls; Mindstorm echo lures once', () => {
  const a = A('a', 'Fire'); const { fx } = world([F('i', 'Ice', 10), F('w', 'Wind', 10, { createdAt: 2 })], [a]);
  for (let k = 1; k <= 200; k++) { fx.tick(k * DT); fx.displace(a); }
  assert.equal(+Math.abs(a.y).toFixed(6), FROSTSTORM.cap); assert.ok(Math.abs(a.x) < 1e-9, 'sideways only');
  const p = A('p', 'Fire', 0, 0), q = A('q', 'Water', 2, 0, { team: 'def' }), r = A('r', 'Fire', 0, 9);
  const m = world([F('e', 'Electric', null), F('mt', 'Metal', null, { createdAt: 2 })], [p, q, r]); m.fx.tick(DT);
  assert.equal(m.fx.bonds.length, 1); assert.ok(m.events.some((x) => x.kind === 'field_bond'));
  q.x = 5; m.fx.tick(2 * DT); m.fx.displace(p); assert.equal(+p.x.toFixed(6), +(MAGNETIC_STORM.pull * 8 * DT).toFixed(6), 'pulled toward the partner beyond 3 yd');
  q.x = 8; m.fx.tick(3 * DT); assert.equal(m.fx.bonds[0].live, false, 'breaks beyond 6 yd'); r.x = 0.5; r.y = 0; q.x = 9; m.fx.tick(4 * DT); assert.equal(m.fx.bonds.length, 1, 'once a play per monster: the freed pair does not re-bond');
  const c = A('c', 'Fire', 0, 0, { vx: 5 }), d = A('d', 'Fire', 6, 0, { team: 'def' });
  const s = world([F('ps', 'Psychic', null), F('el', 'Electric', null, { createdAt: 2 })], [c, d]); s.fx.tick(DT);
  assert.equal(s.fx.echoes.length, 2, 'one echo per affected monster'); assert.equal(c.fx.echo.x, -2, '2 yd behind its heading'); assert.equal(d.fx.echo.x, 8, 'a still defender: behind toward his own goal');
  s.fx.tick(2 * DT); assert.equal(s.fx.echoes.length, 2, 'once a play');
  const e1 = s.fx.lure(d, c, 0.3); assert.ok(e1, 'follows the echo'); s.fx.tick(0.2); assert.ok(s.fx.lure(d, c, 0.5)); s.fx.tick(0.35); assert.equal(s.fx.lure(d, c, 0.6), null, 'for one decision update only');
});

test('Living Terrain: at most four safe 1-yard clumps per connected overlap; nonparents path around; parents pass through. Eclipse blocks signature starts', () => {
  const nat = F('n', 'Nature', 20, { yard: [0, 8], lat: [0, 8] }), ear = F('e', 'Earth', 20, { yard: [2, 10], lat: [2, 10], createdAt: 2 });
  const a = A('a', 'Fire', -5, -5), g = A('g', 'Nature', -5, -5); const { fx } = world([nat, ear], [a, g]); fx.tick(DT);
  const cl = fx.clumps; assert.ok(cl.length >= 1 && cl.length <= LIVING_TERRAIN.clumps, `${cl.length} clumps`);
  for (const c of cl) assert.ok(c.x >= 2 && c.x <= 8 && c.y >= 2 && c.y <= 8, 'inside the overlap');
  Object.assign(a, { x: cl[0].x + 0.1, y: cl[0].y }); fx.displace(a); assert.ok(Math.hypot(a.x - cl[0].x, a.y - cl[0].y) >= 0.5, 'a nonparent is kept out of the clump');
  Object.assign(g, { x: cl[0].x + 0.1, y: cl[0].y }); fx.tick(2 * DT); fx.displace(g); assert.equal(+g.x.toFixed(6), +(cl[0].x + 0.1).toFixed(6), 'a parent passes through');
  const l = A('l', 'Fire'), lt = A('lt', 'Light'); const ec = world([F('li', 'Light', null), F('da', 'Dark', 10, { createdAt: 2 })], [l, lt]); ec.fx.tick(DT);
  assert.equal(ec.fx.canStart(l), false); assert.equal(ec.fx.canStart(lt), true, 'parents exempt');
});

test('engine: options.fields change the play only for non-matching types, log entries and come back in the output', () => {
  const L = lineup(11, 60), D = lineup(12, 64); for (const p of Object.values(L.offense)) p.type = 'Water'; for (const p of Object.values(D.defense)) p.type = 'Electric';
  const args = { offensePlay: PLAYS[OFFENSE_IDS[0]], defensePlay: PLAYS[DEFENSE_IDS[0]], offense: L.offense, defense: D.defense, ballOn: 30, seed: 9 };
  const whole = { yard: [-40, 80], lat: [-27, 27] }; const t8 = { status: {} };
  const r = simulatePlay({ ...args, options: { t8, fields: [F('z', 'Electric', 100, whole)] } });
  for (const s of args.offensePlay.onField) assert.equal(t8.status[`off:${s}`]?.id, 'stunned', `every non-Electric offensive player is Stunned (${s})`);
  assert.ok(Object.keys(t8.status).every((k) => k.startsWith('off:')), 'Electric defenders are unaffected');
  assert.ok(r.events.some((e) => e.kind === 'field_enter' && e.element === 'Electric')); assert.deepEqual(r.fields.map((f) => f.id), ['z']);
  // Fire slows the offense (Water) but not a Fire offense
  const base = simulatePlay(args); const slow = simulatePlay({ ...args, options: { fields: [F('f', 'Fire', 50, whole)] } });
  const far = (s) => Math.max(...s.frames.flatMap((fr) => fr.off.map((p) => p[1])));
  assert.ok(far(slow) < far(base), `Fire field: ${far(slow)} < ${far(base)}`);
  for (const p of Object.values(L.offense)) p.type = 'Fire'; for (const p of Object.values(D.defense)) p.type = 'Fire';
  assert.deepEqual(simulatePlay({ ...args, options: { fields: [F('f', 'Fire', 50, whole)] } }).frames, simulatePlay(args).frames, 'same-type neutrality: all-Fire play unchanged');
});

test('frame conversion: stored absolute fields reach the engine in its play frame for both offense directions (rules.js)', async () => {
  const R = await import('../src/sim/rules.js');
  const mk = (name, seed) => { const x = lineup(seed, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
  const absYard = (side, y) => (side === 'home' ? y : 100 - y), absLat = (side, l) => (side === 'home' ? l : -l);
  const seen = new Set();
  for (let seed = 1; seed <= 12 && seen.size < 2; seed++) {
    const teams = { home: mk('H', 11), away: mk('A', 12) };
    const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 600, coinWinner: seed % 2 ? 'home' : 'away', choice: 'receive' }); R.doKickoff(g, teams);
    const side = g.possession; g.ballLat = 3; const ballOn = g.ballOn;
    const stored = { ...Fd.placeRect({ id: 'S1', type: 'Water', createdAt: 0, centerLat: absLat(side, 3 + 6), yardFrom: absYard(side, ballOn - 2), yardTo: absYard(side, ballOn + 6), width: 8, strength: 30 }), remaining: 5, clock: 'scrimmageAny', clearsAtHalftime: true };
    stored.lat = [...stored.lat]; stored.yard = [...stored.yard]; g.t8 = { status: {}, fields: { list: [stored], pending: [], seq: 1 } };
    const { sim } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], DEFENSE_IDS[0]);
    const pf = sim.fields[0]; seen.add(side);
    assert.deepEqual(pf.yard.map((v) => +v.toFixed(6)), [-2, 6], `${side}: depth from the line toward the offense's goal`);
    assert.deepEqual(pf.lat.map((v) => +v.toFixed(6)), [2, 10], `${side}: lateral in the offense's frame (centre 6 right of the ball)`);
    for (let x = -4; x <= 8; x += 1) for (let y = -2; y <= 14; y += 1) assert.equal(Fd.contains(pf, x, y), Fd.contains(stored, absYard(side, ballOn + x), absLat(side, 3 + y)), `${side} ${x},${y}`);
  }
  assert.deepEqual([...seen].sort(), ['away', 'home'], 'both offense directions');
});
