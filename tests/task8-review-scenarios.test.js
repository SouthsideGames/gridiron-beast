// Task 8 M3: the Ability Reviewer's deterministic scenarios (src/sim/abilities/review.js reviewScenario, table in review-scenarios.js).
// Owner requirement: every football ability can be tested directly with a deterministic scenario on the actual engine. Here every one
// of the 72 scenarios executes for its subject (his own recorded execution) at every form, at mastery 0 and 3, deterministically (two
// runs give the same result), and nothing reaches progression.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewCatalog, reviewScenario, scenarioOf } from '../src/sim/abilities/review.js';
import { SCENARIOS } from '../src/sim/abilities/review-scenarios.js';
import { REVIEW_ONLY } from '../src/sim/engine.js';

const CAT = reviewCatalog();

test('the scenario table covers every one of the 72 football abilities, each with a stated staging', () => {
  assert.equal(CAT.length, 72);
  assert.deepEqual(Object.keys(SCENARIOS).sort(), CAT.map((c) => c.family).sort(), 'one scenario per family');
  for (const c of CAT) { const sc = scenarioOf(c.family); assert.ok(sc.how && sc.how.length > 10, `${c.family}: how`); assert.ok(sc.calls || sc.kick, `${c.family}: calls or a kick`); }
});

const digest = (r) => JSON.stringify({ ...r, sim: r.sim ? { result: r.sim.result, yards: r.sim.yards, frames: r.sim.frames.length, last: r.sim.frames.at(-1), events: r.sim.events } : null });
const elements = [...new Set(CAT.map((c) => c.element))];
for (const el of elements) {
  test(`${el}: every scenario executes for its subject at every form, mastery 0 and 3, deterministically`, () => {
    for (const c of CAT.filter((x) => x.element === el)) for (const form of c.forms) for (const mastery of [0, 3]) {
      const tag = `${c.family} ${form} m${mastery}`;
      const r = reviewScenario({ family: c.family, form, mastery });
      assert.ok(r.found, `${tag}: ${r.reason}`); assert.equal(r.executed, true, tag); assert.equal(r.mode, 'scenario', tag);
      assert.equal(r.form, form, tag); assert.equal(r.mastery, mastery, tag); assert.equal(r.abilityId, c.abilityId, tag);
      for (const e of r.events) assert.ok(e.by == null || e.by === r.slot, `${tag}: events are the subject's own`);
      if (r.sim) assert.ok(r.sim.frames.length > 0, `${tag}: frames for the replay`);
      assert.equal(digest(reviewScenario({ family: c.family, form, mastery })), digest(r), `${tag}: the same result on a second run`);
    }
  });
}

test('staged notes: the contracts whose conditions released gameplay does not reach say so; the others do not (Guiding Halo is reachable since owner N8a)', () => {
  const note = (family, mastery = 0) => reviewScenario({ family, mastery }).staged;
  for (const f of ['flicker', 'nyxshade']) for (const m of [0, 3]) assert.match(note(f, m) || '', /^staged: conditions not reached in released gameplay/, `${f} m${m}`);
  for (const m of [0, 1, 2, 3]) assert.equal(note('lumen', m), null, `lumen m${m}: measured from the line (N8a), released short throws reach it`);
  assert.equal(note('emberfox'), null);
});

test('scenarios reach the conditions they state: primed build-ups are spent, staged fields and ledgers are used', () => {
  const ember = reviewScenario({ family: 'emberfox', mastery: 3 }); assert.equal(ember.before.ignited, true); assert.equal(ember.after.ignited, false);
  const prism = reviewScenario({ family: 'prism' }); assert.equal(prism.before.charges, 3); assert.equal(prism.after.charges, 0, 'the full bar is spent on the removal');
  const aur = reviewScenario({ family: 'aurelion' }); assert.ok(aur.events.some((e) => e.ability === 'LIG-06-F'), 'Daybreak flares');
  const sable = reviewScenario({ family: 'sablewing' }); assert.equal(sable.sim.stats.recoveredSlot, sable.slot, 'Hoard Flight: his own recovery');
  const nyx = reviewScenario({ family: 'nyxshade', mastery: 0 }); assert.equal(nyx.after.charges, 0, 'the bar is spent on the swap');
});

test('no progression or save writes; the dev-only engine option is set by the reviewer only', () => {
  for (const file of ['../src/sim/abilities/review.js', '../src/sim/abilities/review-scenarios.js']) {
    const src = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const bad of ['save', 'storage', 'franchise.js', 'progression', 'reward-ledger', 'localStorage', 'collection']) assert.ok(!new RegExp(`from '[^']*${bad}`).test(src), `${file}: ${bad}`);
    assert.ok(!/localStorage|indexedDB/.test(src), `${file}: no browser storage`);
  }
  assert.equal(typeof REVIEW_ONLY, 'symbol', 'a symbol key: no save, setting, JSON or UI choice can carry it');
  const users = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) walk(p); else if (p.endsWith('.js') && fs.readFileSync(p, 'utf8').includes('REVIEW_ONLY')) users.push(p.replace(/^.*\/src\//, 'src/')); } };
  walk(new URL('../src', import.meta.url).pathname);
  assert.deepEqual(users.sort(), ['src/sim/abilities/review-scenarios.js', 'src/sim/engine.js']);
  // A scenario's game is local: the subject's mastery executions are counted in it only, never on a roster monster.
  const r = reviewScenario({ family: 'glimmer' }); assert.ok(r.found); assert.equal(typeof r.after, 'object');
  assert.equal(reviewScenario({ family: 'nonexistent' }).found, false);
});
