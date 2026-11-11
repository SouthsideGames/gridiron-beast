// Task 8 M4 S0: the legacy Clash engine is frozen as the legacy rulesets. Routing a battle through src/clash/rulesets.js must
// replay every golden fixture byte for byte, and the legacy engine must never accept the Task 8 ruleset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulateByRuleset, isLegacyRuleset, LEGACY_RULESETS, T8_RULESET } from '../../src/clash/rulesets.js';
import { simulateClash, logHash, parseReplayKey } from '../../src/clash/engine.js';
import { battleConfig } from '../../src/clash/values.js';
import { withoutRandomness } from './helpers.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

test('S0 freeze: both legacy golden fixtures replay exactly through the ruleset router (40 seeds)', () => {
  withoutRandomness(() => {
    for (const name of ['golden.json', 'golden-v1.0.0.json']) {
      const stored = fixture(name); assert.equal(Object.keys(stored).length, 20, name);
      for (const seed of Object.keys(stored)) {
        const k = parseReplayKey(stored[seed].key);
        assert.ok(isLegacyRuleset(k.config.ruleset), `${name} ${seed} names a legacy ruleset`);
        const routed = simulateByRuleset({ a: k.a, b: k.b, seed: k.seed, config: k.config });
        assert.equal(logHash(routed), stored[seed].hash, `${name} seed ${seed}`);
        assert.equal(logHash(routed), logHash(simulateClash({ a: k.a, b: k.b, seed: k.seed, config: k.config })));
      }
    }
  });
});

test('S0 freeze: the legacy rulesets are exactly current and v1.0.0; the legacy engine refuses t8; unknown rulesets are refused', () => {
  assert.deepEqual([...LEGACY_RULESETS].sort(), ['current', 'v1.0.0']);
  assert.equal(isLegacyRuleset(undefined), true); assert.equal(isLegacyRuleset(T8_RULESET), false);
  assert.throws(() => battleConfig({ ruleset: T8_RULESET }), /Unknown ruleset/);
  assert.throws(() => simulateByRuleset({ a: [], b: [], config: { ruleset: 'nope' } }), /Unknown Clash ruleset/);
});
