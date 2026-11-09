// Test helper for the Beast Clash t8 ability presentation (docs/task8/FX_CLASH_MATRIX.md): runs a reviewer scenario on the real t8
// engine, builds the presentation state exactly as the Clash reviewer does, lays the arena out without a DOM (the phone portrait slot
// map of src/ui/clash/arena.js at 390 x 487), draws frames, and gathers the evidence for each presentation phase.
import '../../src/clash/abilities/index.js';
import { runScenario, listScenarios } from '../../src/clash/t8/review.js';
import { t8CuesFor, t8StateAt } from '../../src/ui/clash/t8/timeline.js';
import { buildClashT8, drawClashT8, PHASES, indicatorAt } from '../../src/ui/clash/t8/fx-t8.js';
import { LOOKS } from '../../src/ui/clash/t8/looks/index.js';
import { abilityById, familyById, formsOf } from '../../src/data/beast-dex.js';
import { registeredClashAbilities } from '../../src/clash/t8/registry.js';
import assert from 'node:assert/strict';

export { PHASES, LOOKS };
export const STAGE = { W: 390, H: 487 };
const PORTRAIT = { 1: [[36, 72]], 2: [[36, 72], [12, 90]], 3: [[36, 72], [12, 90], [72, 91]], 4: [[36, 70], [60, 88], [14, 88], [86, 88]], 5: [[36, 70], [60, 88], [14, 88], [86, 88], [38, 93]] };
const PORTRAIT_B = { 1: [[64, 48]], 2: [[64, 48], [88, 27]], 3: [[64, 48], [88, 27], [28, 25]], 4: [[64, 48], [68, 18], [38, 17], [89, 17]], 5: [[64, 48], [66, 18], [38, 17], [90, 17], [12, 18]] };

/** Run one scenario and build the presentation state. */
export function prepare({ abilityId, stage = 0, tier = 0, scenarioId = null }) {
  const scs = listScenarios(abilityId, stage, tier); const sc = scenarioId ? scs.find((s) => s.id === scenarioId) : scs.find((s) => s.kind === 'valid') || scs[0];
  const r = runScenario({ abilityId, stage, tier, scenarioId: sc.id });
  const cues = t8CuesFor(r.result); const state = buildClashT8(r.result, cues, { only: abilityId });
  return { r, sc, cues, state, result: r.result };
}
/** A DOM-free geometry for a result at time t: the portrait slot map, front sprites 96 px, reserves 48 px. */
export function geomAt(result, cues, t) {
  const cue = [...cues].reverse().find((c) => c.at <= t + 1e-9) || cues[0]; const st = t8StateAt(result, cue?.i ?? 0);
  const sizeOf = (side) => Math.max(1, Math.min(5, result.lines[side].length)); const per = Math.max(result.lines.a.length, result.lines.b.length);
  const sizes = per <= 3 ? { front: 96, bench: 64 } : { front: 80, bench: 48 };
  const place = (side) => { const map = (side === 'b' ? PORTRAIT_B : PORTRAIT)[sizeOf(side)]; const alive = st.order[side].filter((id) => !st.S[id].ko).sort((p, q) => (p === st.front[side] ? -1 : q === st.front[side] ? 1 : 0)); const out = {}; alive.forEach((id, i) => { const [x, y] = map[Math.min(i, map.length - 1)]; out[id] = { x: x / 100 * STAGE.W, y: y / 100 * STAGE.H, size: i === 0 ? sizes.front : sizes.bench, side, slotIndex: i, active: i === 0, ko: false }; }); return out; };
  const P = { ...place('a'), ...place('b') };
  return { W: STAGE.W, H: STAGE.H, landscape: false, pos: (id) => P[id] || null, slot: (side, i) => { const map = (side === 'b' ? PORTRAIT_B : PORTRAIT)[sizeOf(side)]; const [x, y] = map[Math.min(i, map.length - 1)]; return { x: x / 100 * STAGE.W, y: y / 100 * STAGE.H, size: i === 0 ? sizes.front : sizes.bench }; } };
}
export function drawAt(prep, t, quality = 'full', reduced = false) { return drawClashT8(prep.state, t, geomAt(prep.result, prep.cues, t), { quality, reduced }); }
export const countEls = (s) => (s.match(/<(circle|ellipse|rect|line|path|polygon|polyline|text|g|use)\b/g) || []).length;

/** Evidence for every presentation phase of `abilityId` from the built items (or the look's n/a declaration). */
export function phasesOf(prep, abilityId) {
  const look = LOOKS[abilityId]; const na = new Set(look?.na || []); const items = prep.state.items.filter((it) => it.id === abilityId); const ev = {};
  const own = (it) => it.id === abilityId; const owner = items[0]?.owner || null;
  const main = items.find((it) => it.main) || items[0];
  const stageOf = (it) => prep.result.log[it.seq]?.stage || null;
  const log = prep.result.log;
  // anticipation: a lead-in before the activation, a trigger / progress beat logged before it, or an indicator state before the activation
  if (na.has('anticipation')) ev.anticipation = 'n/a';
  else if (main && main.start < main.t0 - 1e-6) ev.anticipation = `drawn from ${(main.t0 - main.start).toFixed(2)} s before the activation`;
  else if (main && log.slice(0, main.seq).some((e) => e.abilityId === abilityId && (e.kind === 'trigger' || e.kind === 'ability_progress' || e.kind === 'provisional'))) ev.anticipation = `trigger / progress beat before seq ${main.seq}`;
  else if (main && owner && indicatorAt(prep.state, owner, main.t0 - 1e-3)) ev.anticipation = 'indicator state before the activation';
  else if (items.some((it) => it.kind === 'delayed_launch' || it.look.until)) ev.anticipation = 'a launch / persistent mark announces the later resolution';
  if (na.has('activation')) ev.activation = 'n/a'; else if (main) ev.activation = `${main.kind}${stageOf(main) ? '/' + stageOf(main) : ''} at ${main.t0.toFixed(2)} s (ex ${log[main.seq].ex})`;
  if (na.has('movement')) ev.movement = 'n/a'; else if (items.some((it) => it.look.move)) ev.movement = `${items.find((it) => it.look.move).kind} travels`;
  if (na.has('impact')) ev.impact = 'n/a'; else { const im = items.find((it) => it.look.impact) || items.find((it) => ['damage', 'heal', 'status', 'status_end', 'hp_set', 'revive', 'redirect', 'survive', 'intercepted', 'raw_split', 'rotation', 'miss', 'clock_adjust', 'status_freeze', 'signature_restricted', 'delayed_impact'].includes(it.kind)); if (im) ev.impact = `${im.kind} at ${im.t0.toFixed(2)} s`; }
  if (na.has('target')) ev.target = 'n/a'; else { const tg = items.find((it) => it.target && it.target !== it.owner && it.look.target !== false) || items.find((it) => it.look.target); const pop = prep.state.pops.find((p) => p.abilityId === abilityId); if (tg) ev.target = `${tg.kind} on ${tg.target}`; else if (pop) ev.target = `shared ${pop.status} badge on ${pop.id}`; }
  if (na.has('persistence')) ev.persistence = 'n/a'; else if (look?.persistVia && !items.find((it) => it.look.until || it.look.persist)) ev.persistence = `declared: ${look.persistVia}`; else { const pe = items.find((it) => it.look.until || it.look.persist || it.look.dur === 'battle'); const ind = owner && prep.state.indicators[owner]?.length; if (pe) ev.persistence = `${pe.kind} held ${pe.stop != null ? 'until ' + (pe.stopEv?.kind || 'the end') : 'for ' + pe.dur.toFixed(2) + ' s'}`; else if (ind) ev.persistence = 'indicator state carried across turns'; else if (log.some((e) => e.abilityId === abilityId && (e.kind === 'clock_start' || e.kind === 'clock_adjust'))) ev.persistence = 'cooldown carried on the ability icon across turns'; else if (pop_ok(prep, abilityId)) ev.persistence = 'the shared status badge stays on the target'; }
  if (na.has('cleanup')) ev.cleanup = 'n/a'; else { const cl = items.find((it) => it.look.cleanup || it.kind === 'cleanup') || items.find((it) => it.stop != null && it.stopEv) || items.find((it) => it.stop == null && Number.isFinite(it.end)); if (cl) ev.cleanup = cl.kind === 'cleanup' || cl.look.cleanup ? `cleanup event at ${cl.t0.toFixed(2)} s` : cl.stopEv ? `ends on ${cl.stopEv.kind}` : `ends at ${cl.end.toFixed(2)} s (fade)`; }
  return ev;
}
function pop_ok(prep, abilityId) { return prep.state.pops.some((p) => p.abilityId === abilityId && !p.end); }
/** Draw every 0.1 s across the subject's items (plus a margin) at a quality; report NaN / undefined and the peak element count. */
export function drawSpan(prep, abilityId, quality = 'full') {
  const items = prep.state.items.filter((it) => it.id === abilityId); if (!items.length) return { bad: 'no items', maxEl: 0, frames: 0 };
  const t0 = Math.max(0, Math.min(...items.map((it) => it.start)) - 0.2), t1 = Math.min(prep.state.last + 1, Math.max(...items.map((it) => it.end)) + 0.2);
  let bad = null, maxEl = 0, frames = 0;
  for (let t = t0; t <= t1 + 1e-9; t += 0.1) { const d = drawAt(prep, t, quality); const s = d.under + d.over + d.hud; if (/NaN|undefined|Infinity/.test(s)) { bad = `NaN at ${t.toFixed(2)} s`; break; } maxEl = Math.max(maxEl, countEls(d.under + d.over)); frames += 1; }
  return { bad, maxEl, frames };
}

// ---- shared by tests/task8-fx-clash-{a,b}.test.js
export const MAX_FX_ELEMENTS = 60; // per frame, the ability layers together (the information layer is counted separately)
export const catalog = (elements) => registeredClashAbilities().map((id) => { const a = abilityById(id); const f = familyById(a.familyId); return { id, name: a.name, family: a.familyId, element: f.type, stages: formsOf(a.familyId).map((x) => x.stage) }; }).filter((c) => elements.includes(c.element));
/** The scenario the matrix uses: the first valid, non-provisional one; a valid PROVISIONAL one (labelled) when only a gated reading demonstrates the ability. */
export function pickScenario(id, stage, tier) { const scs = listScenarios(id, stage, tier); return scs.find((s) => s.kind === 'valid' && !s.provisional) || scs.find((s) => s.kind === 'valid') || scs.find((s) => !s.provisional) || scs[0]; }
export function stagesOf(id) { return formsOf(abilityById(id).familyId).map((x) => x.stage); }

export function runElement(el, CAT) {
  let n = 0;
  for (const c of CAT.filter((x) => x.element === el)) {
    const stages = stagesOf(c.id).length ? stagesOf(c.id) : [0];
    for (const stage of stages) for (const tier of [0, 1, 2, 3]) {
      const tag = `${c.id} s${stage} m${tier}`; const sc = pickScenario(c.id, stage, tier); assert.ok(sc, `${tag}: a scenario`);
      const P = prepare({ abilityId: c.id, stage, tier, scenarioId: sc.id });
      assert.ok(P.r.ok, `${tag}: the reviewer scenario ${sc.id} passes its checks (${P.r.checks.filter((k) => !k.ok).map((k) => k.check).join('; ')})`);
      const ev = phasesOf(P, c.id);
      for (const ph of PHASES) assert.ok(ev[ph], `${tag}: no evidence for the ${ph} phase (items: ${P.state.items.filter((it) => it.id === c.id).map((it) => it.kind).join(',')})`);
      for (const q of ['full', 'low', 'min']) { const d = drawSpan(P, c.id, q); assert.equal(d.bad, null, `${tag} ${q}: ${d.bad}`); assert.ok(d.maxEl <= MAX_FX_ELEMENTS, `${tag} ${q}: ${d.maxEl} effect elements in one frame`); assert.ok(d.frames > 0, `${tag} ${q}: frames drawn`); }
      n += 1;
    }
  }
  return n;
}


