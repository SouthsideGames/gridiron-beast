// Task 8 presentation reconciled (task8-m4-reconcile): ONE arena for the M4 integration (translated records, the player API) and the fx
// pass (native t8 timeline, looks, overlay layers). Pure checks without a DOM (the DOM arena runs in tools/m4-integrate-check.mjs, which
// also plays a legacy record, and in tools/fx-clash-check.mjs): the dispatch picks the native path for a t8 result, the translated path
// only on request and the legacy cue path for every pre-M4 record (D19); legacy goldens still replay through the router and the legacy
// cues cover them unchanged (no t8 tier leaks in); the native timeline gives bookkeeping the silent tier and a revive its own beat;
// the arena source keeps the M4 player API next to the fx one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../../src/clash/abilities/index.js';
import { simulateByRuleset } from '../../src/clash/rulesets.js';
import { parseReplayKey, logHash } from '../../src/clash/engine.js';
import { reviewClashScenario, clashVariants } from '../../src/clash/t8/review-phases.js';
import { cuesFor, stateAt, DURATION } from '../../src/ui/clash/choreographer.js';
import { t8CuesFor, t8StateAt, BOOKKEEPING } from '../../src/ui/clash/t8/timeline.js';
import { toArenaRecord } from '../../src/ui/clash/t8-record.js';
import { arenaMode } from '../../src/ui/clash/arena.js';
import { withoutRandomness } from './helpers.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const LEGACY_TIERS = new Set(['tick', 'routine', 'power', 'major']);

test('legacy (pre-M4) records: the golden battles replay byte for byte and play through the legacy cue path unchanged (D19)', () => {
  withoutRandomness(() => {
    let n = 0;
    for (const name of ['golden.json', 'golden-v1.0.0.json']) {
      const stored = fixture(name);
      for (const seed of Object.keys(stored).slice(0, 6)) {
        const k = parseReplayKey(stored[seed].key); const r = simulateByRuleset({ a: k.a, b: k.b, seed: k.seed, config: k.config });
        assert.equal(logHash(r), stored[seed].hash, `${name} ${seed}: the record is the frozen one`);
        assert.equal(arenaMode(r), 'legacy', `${name} ${seed}: legacy path`); assert.equal(arenaMode(r, { t8: 'translated' }), 'legacy');
        assert.equal(toArenaRecord(r), r, 'a legacy record is never translated');
        const cues = cuesFor(r); assert.equal(cues.length, r.log.length);
        for (const c of cues) { assert.ok(LEGACY_TIERS.has(c.tier), `${name} ${seed}: legacy tier ${c.tier} for ${c.kind}`); assert.equal(c.duration, DURATION[c.tier]); assert.equal(c.at, undefined, 'no t8 clock on legacy cues'); }
        const fin = stateAt(r, r.log.length - 1); for (const side of ['a', 'b']) for (const s of Object.values(fin.S[side])) assert.ok(s.hp >= 0 && s.hp <= s.maxHp);
        n += 1;
      }
    }
    assert.equal(n, 12);
  });
});

test('a t8 result plays natively by default (translated only on request); bookkeeping is silent; a revive has its own beat; one cue per event', () => {
  const sc = clashVariants('NAT-01-C', 0, 1).find((v) => v.group === 'main' && !v.provisional); const rv = reviewClashScenario({ abilityId: 'NAT-01-C', stage: 0, tier: 1, scenarioId: sc.id }); assert.ok(rv.run, `the revive scenario runs (${rv.error?.message || ''})`); const r = rv.run.result;
  assert.equal(arenaMode(r), 'native'); assert.equal(arenaMode(r, { t8: 'translated' }), 'translated');
  const cues = t8CuesFor(r); assert.equal(cues.length, r.log.length);
  let silent = 0;
  cues.forEach((c, i) => { assert.equal(c.duration, DURATION[c.tier]); if (BOOKKEEPING.has(c.kind)) { assert.equal(c.tier, 'silent', `${c.kind} is bookkeeping`); assert.equal(c.move, null); silent += 1; } else assert.notEqual(c.tier, 'silent', `${c.kind} is not bookkeeping`); if (i) assert.ok(c.at >= cues[i - 1].at); });
  assert.ok(silent > 0, 'turn / round starts are silent');
  const rev = cues.find((c) => c.kind === 'revive'); assert.ok(rev, 'the scenario revives'); assert.equal(rev.move, 'revive'); assert.equal(t8StateAt(r, rev.i).S[rev.event.target].ko, false, 'back on the field');
  // the translated path still works for legacy-shaped consumers: same indices, its own silent tier
  const rec = toArenaRecord(r); const tc = cuesFor(rec); assert.equal(tc.length, r.log.length); assert.ok(tc.some((c) => c.tier === 'silent')); assert.ok(tc.some((c) => c.kind === 'revive' && c.move === 'enter'));
});

test('the arena source keeps both APIs: the M4 player API and the fx t8 mode', () => {
  const src = fs.readFileSync(new URL('../../src/ui/clash/arena.js', import.meta.url), 'utf8');
  for (const k of ['playTo: (i)', 'record: result', 'get length()', "opts.controls === false", "cue.tier === 'silent'", 'opts.looks', 'seek,', 'setQuality(q)', 't8Elements', 'cl-t8-under', 'cl-t8-over', 't8clock', "case 'revive'", 'T8_STATUS_ICON', 'STATUS_GLYPH']) assert.ok(src.includes(k), `arena keeps ${k}`);
  assert.ok(!/from '\.\.\/\.\.\/clash\/(t8\/)?engine/.test(src), 'the arena never imports the engine');
});
