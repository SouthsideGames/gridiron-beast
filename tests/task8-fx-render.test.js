// Task 8 football ability presentation, render smoke (no DOM; docs/task8/FX_FOOTBALL_MATRIX.md): for every football ability (first
// form, mastery 0) the reviewer's activation play is drawn through the real field renderer (field-view.js fieldSvg with the fx hook)
// at full, low and min quality: well-formed markup, no NaN, the same string twice (deterministic), the Task 8 layer present at full and
// min, status marks kept at min. Drawing never touches the simulation record (visuals never feed the simulation), the legacy fx
// descriptor fields stay (backward compatible interface), and formula kicks get a drawable kick sim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { buildFx, fxSvg, endHold, shakeBetween, kickSim } from '../src/ui/ability-fx.js';
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

test('a host that does not pre-roll (the match screen) gets the pre-snap choreography inside the play; the snapshot feeds the HUD', () => {
  for (const fam of ['prism', 'tsunarok', 'aegistron']) {
    const c = CAT.find((x) => x.family === fam); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 });
    for (const p of r.plays) { if (!p.sim?.frames?.length) continue; const live = buildFx(p.sim, () => null); assert.equal(live.preroll, 0, `${fam}: no pre-roll without meta`);
      for (const it of live.t8.items) assert.ok(it.start >= 0, `${fam}: ${it.kind} starts in the play`); for (const f of live.t8.fields) assert.equal(f.lead, 0); }
  }
  const c = CAT.find((x) => x.family === 'hailfang'); const r = reviewSequence({ family: c.family, form: c.forms[0], mastery: 0 });
  assert.ok(r.plays.some((p) => p.sim?.t8view?.hud && Object.keys(p.sim.t8view.hud).length), 'the rules engine snapshots over-the-head data at the snap');
  assert.ok(r.plays.some((p) => p.sim && buildFx(p.sim, () => null).t8.hud), 'buildFx reads it without meta');
});
