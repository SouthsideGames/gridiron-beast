// Task 8 football presentation tests (docs/task8/FX_FOOTBALL_MATRIX.md): build the presentation descriptors (ability-fx.js buildFx,
// kick-fx.js for formula kicks) from a recorded reviewer sequence exactly as the Ability Reviewer does, find which presentation phases
// the subject's look carries, and draw every frame of the activation play at every quality to SVG strings (no DOM).
import { buildFx, fxSvg, kickSim } from '../../src/ui/ability-fx.js';
import { fieldSvg, cameraFor } from '../../src/ui/field-view.js';
import { drawT8 } from '../../src/ui/fx/t8-fx.js';
import { LOOKS } from '../../src/ui/fx/looks/index.js';
import { sequenceStaged } from '../../src/ui/fx/match-fx.js';

export const PHASES = ['anticipation', 'activation', 'movement', 'impact', 'target', 'persistence', 'cleanup'];

/** The reviewer's per-play preparation (screens/ability-reviewer.js openPlayer), without the DOM. */
export function prepare(r, c) {
  return r.plays.map((p, pi) => {
    const kick = !p.sim?.frames?.length && p.kick ? kickSim(p.kick) : null; const sim = kick || p.sim; if (!sim?.frames?.length) return { p, sim: null };
    const sprites = kick ? { off: { K: { species: c.family, name: c.name, type: c.element }, P: { species: c.family, name: c.name, type: c.element } }, def: {} } : p.sprites;
    const lookup = (team, slot) => { const m = sprites?.[team]?.[slot]; return m ? { element: m.type, name: m.name, species: m.species } : null; };
    const staged = sequenceStaged(r.plays, pi);
    return { p, sim, kick: !!kick, sprites, fx: buildFx(sim, lookup, { preroll: true, ...(staged.length ? { staged } : {}) }) };
  });
}

/** Which presentation phases the subject's own look shows in this sequence (evidence per phase). */
export function phasesOf(r, c, prepared = prepare(r, c)) {
  const id = c.abilityId; const ev = {}; const slot = r.explain?.source?.slot;
  const mark = (ph, why) => { if (!ev[ph]) ev[ph] = why; };
  prepared.forEach((P, i) => {
    if (!P.fx) return; const T = P.fx.t8; const own = T.items.filter((it) => it.id === id && it.kind !== 'ambient');
    for (const it of own) {
      if (it.main) mark('activation', `play ${i + 1} ${it.kind}${it.phase ? '/' + it.phase : ''} at ${it.t0}`);
      if (it.start < it.t0 - 1e-6 || it.kind === 'pre') mark('anticipation', `play ${i + 1}: drawn from ${it.start.toFixed(2)} before the event at ${it.t0}`);
      if (it.dur > 0.3 && (it.look.u || it.look.o || it.look.b)) mark('movement', `play ${i + 1}: ${it.kind} animates over ${it.dur.toFixed(2)} s`);
      if (!it.main || it.stopEv) mark('impact', `play ${i + 1}: ${it.stopEv ? it.stopEv.kind : it.kind}`);
      const e = it.ev; if (e.victim || e.victims?.length || e.target || e.partner || e.recipients?.length || e.affected?.length || e.guards?.length || e.clone || e.rect || e.moves?.length || e.targets?.length || e.markers?.length || it.stopEv?.victim) mark('target', `play ${i + 1}: ${e.victim || e.target || e.partner || e.clone || it.stopEv?.victim || 'several'}`);
      for (const [ph, dt] of Object.entries(it.base.at || {})) if (it.main && probe(P, it, it.t0 + dt)) mark(ph, `play ${i + 1}: drawn at ${(it.t0 + dt).toFixed(2)} (declared ${ph} moment)`);
      if (it.stop != null || it.look.dur === 'play' || it.dur >= 1.4) mark('persistence', `play ${i + 1}: held ${it.stop != null ? 'until ' + (it.stopEv?.kind || 'the whistle') : 'for the play'}`);
      if (Number.isFinite(it.end)) mark('cleanup', `play ${i + 1}: ends at ${it.end.toFixed(2)} (fade${it.stop != null ? ' after ' + (it.stopEv?.kind || 'the whistle') : ''})`);
    }
    for (const b of T.badges) if (b.by === slot) mark('target', `play ${i + 1}: status ${b.id} badge on ${b.slot}`);
    if (T.items.some((it) => it.id === id && it.kind === 'ambient')) mark('persistence', `play ${i + 1}: aura on while the source is on the field`);
    if (i > r.activation && T.hud && slot) { const mine = Object.entries(T.hud).find(([k]) => k.endsWith(':' + slot) && k.startsWith(P.p.unit === 'off' ? 'off' : 'def')); if (mine?.[1].charge?.cd) mark('persistence', `play ${i + 1}: recharge bar (${mine[1].charge.cd} left)`); }
    if (i > r.activation && T.hud) { const prev = prepared[r.activation]?.fx?.t8.badges.filter((b) => b.by === slot) || []; for (const b of prev) if (Object.entries(T.hud).some(([k, v]) => k.endsWith(':' + b.slot) && v.status?.id === b.id)) mark('persistence', `play ${i + 1}: ${b.id} badge still on ${b.slot}`); }
    for (const f of T.fields) if (f.ability === id) { mark('persistence', `play ${i + 1}: ${f.type} field ${f.fresh ? 'created (reveal)' : 'persists'}`); if (f.fresh) { mark('anticipation', `play ${i + 1}: field reveal`); mark('activation', `play ${i + 1}: field created`); mark('movement', `play ${i + 1}: field reveal animates`); mark('impact', `play ${i + 1}: the reveal lands and the field takes effect`); if (LOOKS[id]?.fieldTarget) mark('target', `play ${i + 1}: the field is placed on its target`); } }
    const hud = T.hud && slot ? Object.entries(T.hud).find(([k]) => k.endsWith(':' + slot)) : null; if (hud?.[1].charge) { const ch = hud[1].charge; mark("anticipation", `play ${i + 1}: ${ch.cd ? `recharge bar, ${ch.cd} play(s) left` : `charge ${ch.n}/${ch.max}${ch.ready ? " ready" : ""}`}${hud[1].icon ? ` (${hud[1].icon} icon)` : ""}`); }
  });
  prepared.forEach((P, i) => { if (P.fx?.t8.fields.some((f) => f.ability === id && f.expiring)) mark('cleanup', `play ${i + 1}: the field's clock runs out at the whistle; it dissolves`); });
  // A field that a later play no longer carries (or an effect that ended) is cleaned up.
  const withField = prepared.map((P) => !!P.fx?.t8.fields.some((f) => f.ability === id)); const lastF = withField.lastIndexOf(true);
  if (lastF >= 0 && lastF < withField.length - 1) mark('cleanup', `play ${lastF + 2}: the field is gone`);
  for (const ph of LOOKS[id]?.na || []) if (!ev[ph]) ev[ph] = 'n/a (Dex visual has no such phase)';
  return ev;
}
/** Does the item's own look draw anything at time t (the other items of the play removed)? */
function probe(P, it, t) {
  const T = P.fx.t8; const sim = P.sim; const bOn = sim.ballOn ?? 35, bLat = sim.ballLat || 0; const top = cameraFor(bOn).top; const toSvg = (x, y) => [bLat + y, top - (bOn + x)];
  let i = 0; while (i + 1 < sim.frames.length && (sim.frames[i + 1].t ?? 0) <= t + 1e-6) i++; const fr = sim.frames[i];
  const pos = (team, slot) => { const a = (team === 'off' ? fr.off : fr.def).find((q) => q[0] === slot); if (!a) return null; const [x, y] = toSvg(a[1], a[2]); return [x, y, 0, 0]; };
  const solo = { ...T, items: [it], badges: [], fields: [], hud: null, spends: [] };
  const o = drawT8(solo, t, pos, { quality: 'full', toSvg, ball: [...toSvg(fr.ball[0], fr.ball[1]), fr.ball[2]], pball: null, maxCues: 0 });
  return (o.under + o.over + o.ball).length > 0;
}

/** Draw every 0.1 s of a play (from its pre-roll to the end hold) at every quality; returns { maxEl, maxChars, bad } (bad: NaN/undefined). */
export function drawPlay(P, { qualities = ['full', 'low', 'min'], step = 0.1 } = {}) {
  const sim = P.sim; const fx = P.fx; const out = { maxEl: 0, maxChars: 0, bad: null, frames: 0 };
  const bOn = sim.ballOn ?? 35, bLat = sim.ballLat || 0; const top = cameraFor(bOn).top; const toSvg = (x, y) => [bLat + y, top - (bOn + x)];
  const end = sim.frames[sim.frames.length - 1].t ?? 0;
  for (let t = -(fx.preroll || 0); t <= end + 0.9; t += step) {
    let i = 0; while (i + 1 < sim.frames.length && (sim.frames[i + 1].t ?? 0) <= t + 1e-6) i++; const fr = sim.frames[i]; const pv = sim.frames[i - 1] || fr;
    const pos = (team, slot) => { const a = (team === 'off' ? fr.off : fr.def).find((q) => q[0] === slot); if (!a) return null; const b = (team === 'off' ? pv.off : pv.def).find((q) => q[0] === slot) || a; const [x, y] = toSvg(a[1], a[2]); const [px, py] = toSvg(b[1], b[2]); return [x, y, x - px, y - py]; };
    const ball = [...toSvg(fr.ball[0], fr.ball[1]), fr.ball[2]]; const pball = toSvg(pv.ball[0], pv.ball[1]);
    for (const q of qualities) { const o = fxSvg(fx, t, pos, { quality: q, toSvg, ball, pball, halfWidth: 27 }); const all = o.under + o.over + o.ball; if (/NaN|undefined|Infinity/.test(all) && !out.bad) out.bad = `${q} t=${t.toFixed(2)}: ${all.match(/.{0,60}(NaN|undefined|Infinity).{0,30}/)[0]}`; if (q === 'full') { out.maxEl = Math.max(out.maxEl, (all.match(/<[a-z]/g) || []).length); out.maxChars = Math.max(out.maxChars, all.length); } }
    out.frames += 1;
  }
  return out;
}

/** One full field draw (field-view.js fieldSvg, no DOM) at a time of a prepared play, at a quality. */
export function fieldAt(P, t, quality = 'full') {
  const sim = P.sim; let i = 0; while (i + 1 < sim.frames.length && (sim.frames[i + 1].t ?? 0) <= t + 1e-6) i++;
  return fieldSvg({ time: t, ballOn: sim.ballOn ?? 35, ballLat: sim.ballLat || 0, toGo: 10, frame: sim.frames[i], prevFrame: sim.frames[i - 1] || null, fx: P.fx, fxQuality: quality, sprites: null, fields: sim.fields || null, camera: P.kick ? cameraFor(Math.max(0, sim.frames[i].ball[0] - 8)) : null });
}
