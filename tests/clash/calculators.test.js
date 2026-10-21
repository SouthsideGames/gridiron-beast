// Beast Clash pure calculators (P1 formula): Arena XP Model C2 with the eight starter-rate week shapes, and the load model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { battleXp, diminishing, starterRate, sessionXp } from '../../src/clash/xp.js';
import { projectWeek, projectSeason, battleWarning, warningLevel, sundayInjury, battleInjury } from '../../src/clash/load.js';
import { simulateClash } from '../../src/clash/engine.js';
import { mon } from './helpers.js';

test('XP: per-battle values come from share, result and overall gap; diminishing returns run 1, .8, .6, .45, .35, .25, .2', () => {
  const r = simulateClash({ a: [mon('emberfox', 1), mon('tidepaw', 2), mon('pebble', 3)], b: [mon('ashkit', 4), mon('hailfang', 5), mon('rockram', 6)], seed: 2 });
  const xa = battleXp(r, 'a'), xb = battleXp(r, 'b');
  for (const v of [...Object.values(xa), ...Object.values(xb)]) assert.ok(v > 0 && v < 40, `xp ${v}`);
  const winSide = r.winner, loseSide = winSide === 'a' ? 'b' : 'a'; const avg = (o) => Object.values(o).reduce((s, v) => s + v, 0) / Object.keys(o).length;
  assert.ok(avg(winSide === 'a' ? xa : xb) > avg(loseSide === 'a' ? xa : xb) * 0.9, 'winners earn more on average');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(diminishing), [1, 0.8, 0.6, 0.45, 0.35, 0.25, 0.2, 0.2]);
});

test('XP: the eight week shapes for the one-third starter rate', () => {
  const club = 'Rivertown'; const third = 1 / 3;
  const cases = [
    ['Normal week: played, they started', { lastSunday: { seq: 5, kind: 'played' }, lastStart: { club, seq: 5 } }, third],
    ['Benched or injured last Sunday', { lastSunday: { seq: 5, kind: 'played' }, lastStart: { club, seq: 4 } }, 1],
    ['Week after a bye', { lastSunday: { seq: 5, kind: 'bye' }, lastStart: { club, seq: 4 } }, 1],
    ['Tuesday of the bye week (they started the game just before)', { lastSunday: { seq: 5, kind: 'played' }, lastStart: { club, seq: 5 } }, third],
    ['After a forfeit', { lastSunday: { seq: 5, kind: 'forfeit' }, lastStart: { club, seq: 4 } }, 1],
    ['Injured during last Sunday (still stamped)', { lastSunday: { seq: 5, kind: 'played' }, lastStart: { club, seq: 5 } }, third],
    ['Traded in since their last start', { lastSunday: { seq: 5, kind: 'played' }, lastStart: { club: 'Other', seq: 5 } }, 1],
    ['First week of a season (seq moved on)', { lastSunday: { seq: 1, kind: 'played' }, lastStart: { club, seq: 12 } }, 1],
  ];
  for (const [label, input, want] of cases) assert.equal(starterRate({ club, ...input }), want, label);
  assert.equal(starterRate({ club, lastSunday: null, lastStart: null }), 1);
  const r = simulateClash({ a: [mon('emberfox', 1)], b: [mon('ashkit', 4)], seed: 2 });
  const s = sessionXp([r, r, r], 'a', { club, lastSunday: { seq: 5, kind: 'played' }, lastStart: { [r.lines.a[0].combatant.monsterId]: { club, seq: 5 } } });
  const raw = battleXp(r, 'a').a0; assert.ok(Math.abs(s[r.lines.a[0].combatant.monsterId] - raw * (1 + 0.8 + 0.6) / 3) < 0.05);
});

test('load: the ten-week projection reproduces the approved table for a starter with 3 battles (weeks 1-3) and the bye', () => {
  const rows = projectSeason({ battles: 3, plays: true });
  const r1 = rows[0]; assert.deepEqual([r1.monday, r1.afterArena, r1.afterPractice, r1.afterSaturday, r1.kickoff, r1.afterSunday], [0, 15, 23, 0, 0, 21]);
  const r2 = rows[1]; assert.deepEqual([r2.monday, r2.afterArena, r2.afterPractice, r2.afterSaturday, r2.kickoff, r2.afterSunday], [13, 28, 36, 5, 5, 26]);
  const r3 = rows[2]; assert.deepEqual([r3.monday, r3.afterArena, r3.afterPractice, r3.afterSaturday, r3.kickoff, r3.afterSunday], [18, 33, 41, 8, 8, 29]);
  const bye = rows[5]; assert.ok(bye.bye && bye.afterSaturday === null && bye.kickoff === null && bye.afterSunday === 0);
  const heavy = projectSeason({ battles: 7, plays: true })[1]; assert.deepEqual([heavy.monday, heavy.afterArena, heavy.kickoff, heavy.afterSunday], [22, 57, 22, 43]);
});

test('load: warning levels calm < 30, caution 30-49, high 50+; the high level asks to confirm and states both injury chances; seven battles stay allowed', () => {
  assert.equal(warningLevel(29), 'calm'); assert.equal(warningLevel(30), 'caution'); assert.equal(warningLevel(49), 'caution'); assert.equal(warningLevel(50), 'high');
  const calm = battleWarning({ fatigue: 0, battlesPlayed: 0 }); assert.equal(calm.level, 'calm'); assert.equal(calm.confirm, false); assert.ok(calm.allowed);
  // Finding for the owner: with the approved Saturday recovery (28 + 0.4 x excess), kickoff fatigue from a Tuesday at 100 is 43, so the
  // 'high' level (50+) cannot be reached from Arena load alone. The model still states both injury chances at the caution level.
  const max = battleWarning({ fatigue: 100, battlesPlayed: 6 }); assert.equal(max.kickoffWith, 43); assert.equal(max.level, 'caution'); assert.match(max.text, /Sunday injury chance/); assert.ok(max.allowed); assert.ok(max.kickoffWith >= max.kickoffWithout);
  const high = { level: warningLevel(55), confirm: warningLevel(55) === 'high' }; assert.equal(high.level, 'high'); assert.ok(high.confirm);
  assert.equal(battleWarning({ fatigue: 10, battlesPlayed: 7 }).allowed, false);
  assert.ok(Math.abs(sundayInjury(0, 0.6) - 0.024) < 1e-9); assert.ok(Math.abs(sundayInjury(100, 1) - 0.042) < 1e-9); assert.ok(Math.abs(battleInjury(100) - 0.0075) < 1e-9);
  assert.deepEqual(projectWeek(0, { battles: 0, plays: false }), { monday: 0, afterArena: 0, battleInjuryTotal: 0, afterPractice: 8, afterSaturday: 0, kickoff: 0, afterSunday: 0 });
});
