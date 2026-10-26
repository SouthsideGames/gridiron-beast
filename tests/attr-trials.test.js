// Attribute trials (GDD §8.2 audit): the Attribute Testing Lab's comparisons run on the real engine with everything but the
// subject's attribute held equal, and report measured numbers. These assert the audit's confirmed effects and the baseline for
// its confirmed problems, so a later fix shows up here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/lab/attr-trials.js';
import { ATTR_ORDER } from '../src/data/stat-guide.js';

const byId = (id) => T.TRIALS.find((t) => t.id === id);
test('every attribute has at least one trial; every trial measures something and names a known metric', () => {
  for (const a of ATTR_ORDER) assert.ok(T.TRIALS.some((t) => t.attr === a) || ['durability', 'kicking'].includes(a), a);
  for (const t of T.TRIALS) { const m = t.measure(t.run(65, 1000)); assert.ok(Object.keys(m).length >= 1, t.id); for (const k of Object.keys(m)) assert.ok(T.METRIC[k], `${t.id}: ${k} is labelled`); }
});
test('controlled setup: everyone a plain 65 with no ability or type, only the subject changed; the same seed gives the same play', () => {
  const o = T.side('three_verticals', ['WR1'], 'speed', 95);
  for (const [slot, m] of Object.entries(o)) { assert.equal(m.ability, null); assert.equal(m.type, null); for (const k of ATTR_ORDER) assert.equal(m.attrs[k], slot === 'WR1' && k === 'speed' ? 95 : 65, `${slot}.${k}`); }
  const t = byId('speed_rb'); assert.deepEqual(t.measure(t.run(75, 1234)), t.measure(t.run(75, 1234)));
});
test('Speed: a 95 receiver reaches 20 yards sooner and peaks faster than a 50 (movement), and a 95 back gains more', () => {
  const r = T.runTrial(byId('speed_wr_go'), 10, [50, 95]); assert.ok(r.levels[95].t20 < r.levels[50].t20 - 0.3); assert.ok(r.levels[95].peak > r.levels[50].peak + 1.5);
  const rb = T.runTrial(byId('speed_rb'), 60, [50, 95]); assert.ok(rb.levels[95].yards > rb.levels[50].yards + 1.5, JSON.stringify(rb.levels));
});
test('Blocking, Tackling, Catching and Accuracy move their outcomes the right way (60 plays, same seeds)', () => {
  const b = T.runTrial(byId('blocking_pass'), 60, [50, 95]); assert.ok(b.levels[95].pressureAt > b.levels[50].pressureAt + 0.15, 'blocking delays pressure');
  const k = T.runTrial(byId('tackling_cb_open'), 60, [50, 95]); assert.ok(k.levels[95].brokenAllowed < k.levels[50].brokenAllowed, 'tackling breaks fewer');
  const c = T.runTrial(byId('catching_wr_open'), 60, [50, 95]); assert.ok(c.levels[95].complete > c.levels[50].complete + 0.05, 'catching completes more');
  const a = T.runTrial(byId('accuracy_short'), 60, [50, 95]); assert.ok(a.levels[95].complete > a.levels[50].complete, 'accuracy completes more');
});
test('audit baseline (v42.7): the deep-lead problem and the inverted comeback coverage are measurable; this test is expected to flip when they are fixed', () => {
  const d = T.runTrial(byId('speed_wr_lead'), 60, [50, 95]); assert.ok(d.levels[95].overrun > d.levels[50].overrun + 0.8, `fast receivers overrun the deep ball: ${JSON.stringify(d.levels)}`);
  const c = T.runTrial(byId('coverage_cb_cut'), 40, [50, 95]); assert.ok(c.levels[95].sepAfterBreak > c.levels[50].sepAfterBreak, `better coverage, more separation after the break: ${JSON.stringify(c.levels)}`);
});
test('durability and kicking studies report measured numbers that move the right way', () => {
  const d = T.durabilityStudy(200, [50, 95]); assert.ok(d.levels[95].fatigueGain < d.levels[50].fatigueGain);
  const k = T.kickingStudy(50, [50, 95]); assert.ok(k.levels[95].fg45 > k.levels[50].fg45 && k.levels[95].puntAvg > k.levels[50].puntAvg && k.levels[95].range > k.levels[50].range);
});
