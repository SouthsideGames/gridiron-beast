// QB Read Progression (GDD §53): the owner's required tests 1–16, on the real engine. Statistical where the brief asks for
// tendencies ("generally", "frequently"): a sweep of every pass play against every base defense at QB Awareness 50 / 75 / 95.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { qbReadLines } from '../src/ui/qb-read-ui.js';
import { awarenessProfile, throwOdds, acceptBar } from '../src/sim/qb-read.js';
import * as Lab from '../src/lab/qb-lab.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

const PASS = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass' && !PLAYS[id].tags.includes('screen'));
const ZONE = DEFENSE_IDS.filter((id) => PLAYS[id].tags.includes('zone')), BLITZ = DEFENSE_IDS.filter((id) => PLAYS[id].tags.includes('blitz'));
const sweeps = {};
function sweep(aw, seeds = 2) {
  const key = `${aw}:${seeds}`; if (sweeps[key]) return sweeps[key]; const L = lineup(11, 62); L.offense.QB.attrs = { ...L.offense.QB.attrs, awareness: aw }; const out = [];
  for (const o of PASS) for (const d of DEFENSE_IDS) for (let s = 1; s <= seeds; s++) { const r = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], ballOn: 35, seed: s * 977 + d.length * 13 + o.length, offense: L.offense, defense: L.defense }); out.push({ o, d, r, dec: r.qb?.decision || null, reads: (r.qb?.reads || []).filter((e) => e.kind === 'read') }); }
  return (sweeps[key] = out);
}
const share = (xs, f) => xs.filter(f).length / Math.max(1, xs.length);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

test('1. primary receiver open on the first look: the quarterback generally takes the designed read', () => {
  const s = sweep(75).filter((x) => x.dec?.action === 'throw' && x.reads[0] && x.reads[0].slot === x.r.qb.order[0] && x.reads[0].trueQ >= 0.6);
  assert.ok(s.length > 100, `${s.length} cases`); assert.ok(share(s, (x) => x.dec.slot === x.r.qb.order[0]) >= 0.7, `primary share ${share(s, (x) => x.dec.slot === x.r.qb.order[0]).toFixed(2)}`);
});
test('2. primary receiver double-covered: a high-Awareness quarterback usually goes elsewhere', () => {
  const s = sweep(95).filter((x) => x.dec?.action === 'throw' && x.reads[0] && x.reads[0].slot === x.r.qb.order[0] && x.reads[0].reason === 'double');
  assert.ok(s.length >= 15, `${s.length} cases`); assert.ok(share(s, (x) => x.dec.slot !== x.r.qb.order[0]) >= 0.65, `elsewhere ${share(s, (x) => x.dec.slot !== x.r.qb.order[0]).toFixed(2)}`);
});
test('3. secondary receiver open: the quarterback progresses to him', () => {
  const s = sweep(75).filter((x) => x.dec?.action === 'throw' && x.reads.length >= 2 && x.reads[0].trueQ < 0.35 && x.reads[1].slot === x.r.qb.order[1] && x.reads[1].trueQ >= 0.6);
  assert.ok(s.length >= 15, `${s.length} cases`); assert.ok(share(s, (x) => x.dec.slot !== x.r.qb.order[0]) >= 0.6, `${share(s, (x) => x.dec.slot !== x.r.qb.order[0]).toFixed(2)}`);
  assert.ok(sweep(75).some((x) => x.dec?.action === 'throw' && x.dec.read >= 1), 'throws past the first read happen');
});
test('4. checkdown open: the quarterback recognises the back when the others are covered', () => {
  const s = sweep(75).filter((x) => x.dec?.action === 'throw' && x.dec.board?.RB >= 0.6 && Object.entries(x.dec.board).every(([k, v]) => k === 'RB' || v < 0.4));
  assert.ok(s.length >= 8, `${s.length} cases`); assert.ok(share(s, (x) => x.dec.slot === 'RB') >= 0.55, `${share(s, (x) => x.dec.slot === 'RB').toFixed(2)}`);
});
test('5. everyone covered: he weighs scrambling and the rush rather than just throwing the first read (no throw-aways, v42.6)', () => {
  // All-covered downs are rare (about 0.5% of dropbacks since v42.14, 1.0% in v42.13: coverage no longer knows a pass from the snap,
  // so receivers come open more often), so this test draws six seeds per pairing instead of two to keep its eight cases.
  const s = sweep(75, 6).filter((x) => x.dec && x.dec.bestTrueQ < 0.3);
  assert.ok(s.length >= 8, `${s.length} cases`); assert.ok(share(s, (x) => x.dec.reason !== 'first_read') >= 0.6, 'not a first-read throw'); // fewer all-covered downs since the lead fix (v42.8): windows are judged on balls that now land on the receiver
  const all = [...sweep(50), ...sweep(75), ...sweep(95)]; assert.ok(all.some((x) => x.dec?.action === 'scramble') && all.some((x) => x.r.result === 'sack'), 'scrambles and sacks both occur');
  assert.ok(all.every((x) => x.dec?.action !== 'throwaway' && x.r.result !== 'throwaway'), 'the quarterback never throws the ball away');
});
test('6. blitz: less time to decide', () => {
  const t = (ds) => mean(sweep(75).filter((x) => ds.includes(x.d) && x.dec).map((x) => x.dec.t));
  const calm = DEFENSE_IDS.filter((d) => !BLITZ.includes(d)); assert.ok(t(BLITZ) < t(calm) - 0.05, `blitz ${t(BLITZ).toFixed(2)} vs ${t(calm).toFixed(2)}`);
});
test('7. zone: he finds the windows', () => {
  const s = sweep(75).filter((x) => ZONE.includes(x.d) && x.dec?.action === 'throw');
  assert.ok(mean(s.map((x) => x.dec.trueQ)) >= 0.5, `mean quality ${mean(s.map((x) => x.dec.trueQ)).toFixed(2)}`);
  assert.ok(share(s, (x) => x.r.stats.receiver != null && x.r.result !== 'interception') >= 0.52);
});
test('8. play action: the progression runs after the fake', () => {
  const pa = PASS.filter((id) => PLAYS[id].tags.includes('play_action')); assert.ok(pa.length);
  const s = sweep(75).filter((x) => pa.includes(x.o) && x.reads.length); assert.ok(s.length > 20);
  for (const x of s) { assert.ok(x.r.qb.fakeAt != null, 'the fake was carried out'); assert.ok(x.reads[0].t >= x.r.qb.fakeAt, `first read at ${x.reads[0].t}, fake complete at ${x.r.qb.fakeAt} on ${x.o}`); }
});
test('9. RPO / option: the read-option keeps its own read (no RPO play exists in the playbook)', () => {
  assert.equal(OFFENSE_IDS.filter((id) => PLAYS[id].tags.includes('rpo')).length, 0);
  const L = lineup(11, 62); const opt = OFFENSE_IDS.filter((id) => PLAYS[id].tags.includes('option')); assert.ok(opt.length);
  for (const o of opt) for (const d of DEFENSE_IDS.slice(0, 8)) { const r = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], ballOn: 35, seed: 5, offense: L.offense, defense: L.defense }); assert.equal(r.qb, null, 'no pass progression on an option play'); assert.ok(r.events.some((e) => ['option_read', 'keep'].includes(e.kind) || /reads|nobody/.test(e.text))); }
});
test('10. the same play: the target follows the defense, not a script', () => {
  const s = sweep(75); let varied = 0, plays = 0;
  for (const o of PASS) { const ds = s.filter((x) => x.o === o && x.dec?.action === 'throw'); if (ds.length < 20) continue; plays++; if (new Set(ds.map((x) => x.dec.slot)).size >= 2) varied++; }
  assert.ok(varied / plays >= 0.8, `${varied}/${plays} plays vary their target`);
  const thr = s.filter((x) => x.dec?.action === 'throw' && Object.keys(x.dec.board || {}).length >= 2);
  assert.ok(share(thr, (x) => x.dec.trueQ >= Math.max(...Object.values(x.dec.board)) - 0.15) >= 0.75, 'the chosen target is near the best window');
});
test('11. Awareness: better decisions over a large sample (quality, missed receivers, forced throws, sacks)', () => {
  const m = (aw) => { const s = sweep(aw); const d = s.filter((x) => x.dec?.action === 'throw'); return { q: mean(d.map((x) => x.dec.trueQ)), missed: share(d, (x) => x.dec.missed), forced: share(d, (x) => x.dec.forced), sack: share(s, (x) => x.r.result === 'sack') }; };
  const lo = m(50), mid = m(75), hi = m(95);
  assert.ok(hi.q > lo.q + 0.02, `quality ${lo.q.toFixed(3)} → ${hi.q.toFixed(3)}`); assert.ok(mid.q >= lo.q - 0.005 && hi.q >= mid.q - 0.005);
  assert.ok(hi.missed < lo.missed * 0.6, `missed ${lo.missed.toFixed(3)} → ${hi.missed.toFixed(3)}`); assert.ok(hi.forced <= lo.forced, `forced ${lo.forced} → ${hi.forced}`); assert.ok(hi.sack < lo.sack, `sacks ${lo.sack.toFixed(3)} → ${hi.sack.toFixed(3)}`);
  assert.ok(lo.missed > 0.03 && hi.missed > 0, 'a low-Awareness passer still finds receivers; an elite one still errs now and then');
  const P = [50, 75, 95].map(awarenessProfile); assert.ok(P[0].look > P[2].look && P[0].noise > P[2].noise && P[0].lock > P[2].lock && P[0].sense < P[2].sense);
});
test('12. save and load: the setting persists; existing franchises load and play', () => {
  const f = newFranchise(7); f.settings.qbReads = true; const g = Save.importJson(Save.exportJson(f)); assert.equal(g.settings.qbReads, true);
  delete g.settings.qbReads; const h = Save.importJson(Save.exportJson(g)); assert.equal(!!h.settings.qbReads, false, 'off by default');
});
test('13. replay accuracy: the read list is the recorded decision process', () => {
  for (const x of sweep(75).slice(0, 400)) {
    const thr = x.r.events.find((e) => e.kind === 'throw'); if (x.dec?.action === 'throw' && thr) assert.equal(thr.target, x.dec.slot, 'the throw goes where the decision said');
    for (const e of x.reads) if (e.why !== 'periph' && e.reason === 'open') assert.ok(e.q >= e.bar - 1e-9, 'an "open" verdict cleared the bar');
    const lines = qbReadLines(x.r); assert.equal(lines.filter((l) => l.kind === 'read').length, x.reads.length); if (x.dec) assert.equal(lines.filter((l) => l.kind === 'decision').length, 1);
    if (x.dec?.missed) assert.ok(lines.some((l) => l.kind === 'missed'));
  }
});
test('14. QB Read Indicators: drawn only when the setting is on (and only from the recorded read)', () => {
  const r = sweep(75).find((x) => x.r.frames.some((f) => f.read)).r; const f = r.frames.find((fr) => fr.read);
  assert.match(fieldSvg({ ballOn: 35, frame: f, qbRead: true }), /qb-read-ring/); assert.doesNotMatch(fieldSvg({ ballOn: 35, frame: f, qbRead: false }), /qb-read-ring/);
  assert.equal(fieldSvg({ ballOn: 35, frame: f }), fieldSvg({ ballOn: 35, frame: { ...f, read: undefined } }), 'off: the field is unchanged');
});
test('15. AI Testing Lab: identical starts, the human decision applied through the engine, accurate records and data', () => {
  const sit = Lab.makeSituation({ seed: 4242, offense: 'levels', awareness: 75 }); const p = Lab.pausePoint(sit); const hold = Lab.runHold(sit);
  const target = Lab.receiverButtons(sit).find((b) => b.slot !== p.ai.qb.decision.slot)?.slot || 'WR1'; const human = { at: p.at, action: 'throw', target };
  const hs = Lab.runHuman(sit, human); const pre = (r) => JSON.stringify(r.frames.filter((f) => f.t < p.at - 1e-6).map(({ read, ...rest }) => rest));
  assert.equal(pre(hs), pre(hold)); assert.equal(pre(p.ai), pre(hold), 'AI, held and human plays are identical before the decision');
  assert.deepEqual([hold.qb.aiWould.action, hold.qb.aiWould.slot, hold.qb.aiWould.t], [p.ai.qb.decision.action, p.ai.qb.decision.slot, p.ai.qb.decision.t], 'the held play records the AI\'s real decision');
  assert.equal(hs.qb.decision.by, 'human'); assert.equal(hs.qb.decision.slot, target); assert.equal(hs.events.find((e) => e.kind === 'throw')?.target, target);
  const out = { human: Lab.rollouts(sit, human, 4), ai: Lab.rollouts(sit, null, 4) }; const rec = Lab.decisionRecord({ sit, mode: 'paused', human, humanSim: hs, aiSim: p.ai, holdSim: hold, outcomes: out });
  assert.equal(rec.human.target, target); assert.equal(rec.ai.target, p.ai.qb.decision.slot); assert.equal(rec.agree, false); assert.equal(rec.situation.offensePlay, 'levels'); assert.equal(rec.qb.awareness, 75);
  assert.ok(rec.windows[target] && rec.field.off.length && rec.defenders.length && rec.receivers.length && rec.sim.seed === 4242 && rec.sim.qbModel >= 1);
  assert.deepEqual(Lab.rollouts(sit, human, 4), out.human, 'rollouts are reproducible');
  const back = Lab.validateRecords(JSON.parse(JSON.stringify(Lab.exportPayload([rec])))); assert.equal(back.records.length, 1); assert.deepEqual(back.records[0], rec);
  assert.equal(Lab.validateRecords([{ schema: 'other' }]).records.length, 0);
  const a = Lab.analyse([rec, { ...rec, id: 'x', agree: true }]); assert.equal(a.total, 2); assert.equal(a.agreement, 50);
});
test('16. a caller that names the target (future player control) is obeyed: the AI does not override it', () => {
  const L = lineup(11, 60);
  for (const tgt of ['WR2', 'RB']) { const r = simulatePlay({ offensePlay: PLAYS.quick_slants, defensePlay: PLAYS.cover_4, ballOn: 20, seed: 8, offense: L.offense, defense: L.defense, options: { forcedTarget: tgt } }); const thr = r.events.find((e) => e.kind === 'throw'); if (thr) assert.equal(thr.target, tgt); assert.equal(r.qb, null, 'the read progression stays out of it'); }
});
test('model: odds and bar behave sensibly', () => {
  const o = (m1, m2 = 99) => throwOdds({ m1, m2, air: 10, dist: 12, accuracy: 70, catching: 70, agility: 60, flight: 0.5, rspeed: 8 });
  assert.ok(o(4).pComp > o(1).pComp && o(1).pInt > o(4).pInt && o(1, 1).quality < o(1).quality);
  assert.ok(acceptBar({ index: 0 }) < acceptBar({ index: 1 }) && acceptBar({ index: 1, pressure: true }) < acceptBar({ index: 1 }) && acceptBar({ index: 1, cycles: 2 }) < acceptBar({ index: 1 }));
});

test('no intentional throw-away anywhere: full games, the forced-read path and the Lab\'s human decisions (v42.6)', async () => {
  const { playGame } = await import('../src/sim/game-runner.js'); const { generatedTeam } = await import('../src/franchise/roster.js');
  let dropbacks = 0, sacks = 0;
  for (let g = 1; g <= 6; g++) playGame({ home: generatedTeam(300 + g, { id: 'h', name: 'H' }), away: generatedTeam(400 + g, { id: 'a', name: 'A' }), seed: 50 + g, onStep: (ev) => { const s = ev?.sim; if (ev?.kind !== 'play' || !s?.qb) return; dropbacks++; if (s.result === 'sack') sacks++; assert.notEqual(s.result, 'throwaway'); assert.ok(!s.events.some((e) => e.kind === 'throwaway')); } });
  assert.ok(dropbacks > 150 && sacks > 0, `${dropbacks} dropbacks, ${sacks} sacks: sacks still happen naturally`);
  const Lab = await import('../src/lab/qb-lab.js'); const sit = Lab.makeSituation({ seed: 4242, offense: 'four_verts' in (await import('../src/data/playbook.js')).PLAYS ? 'four_verts' : null });
  const sim = Lab.runHuman(sit, { at: 1.2, action: 'throwaway' }); // an old record's action is not an option any more: the QB just holds it
  assert.notEqual(sim.result, 'throwaway'); assert.ok(sim.qb.decision?.by !== 'human' || sim.qb.decision.action !== 'throwaway');
});

