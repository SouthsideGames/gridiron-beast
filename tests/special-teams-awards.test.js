// Follow-up A-2 (owner 2026-11-26): Golden Boot (the best kicker) and Return King (the best return specialist), beside STBOY.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAwards, AWARDS, AWARD_RULES } from '../src/franchise/awards.js';
import { caseFacts, HALL_CASE } from '../src/franchise/monster-hof-voting.js';
import { TROPHY_META, TROPHY_ORDER } from '../src/franchise/career-profile.js';

const W = 14; // weeks in the season
const K = (id, team, o) => ({ id, name: id, type: 'Fire', species: 'emberfox', position: 'K', team, games: W, starts: W, ...o });
const RET = (id, team, o) => ({ id, name: id, type: 'Wind', species: 'emberfox', position: 'WR', team, games: W, starts: W, snapsOff: 400, ...o });
/** Eight clubs, each with an ordinary kicker and returner; `extra` replaces or adds rows. */
function league(extra = []) {
  const table = {}; const records = {};
  for (let i = 0; i < 8; i++) { const t = `C${i}`; records[t] = { w: 7, l: 7 };
    table[t] = { [`k${i}`]: K(`k${i}`, t, { fga: 20, fgm: 16 - (i % 3), fg0a: 6, fg0m: 6, fg30a: 7, fg30m: 6 - (i % 2), fg40a: 5, fg40m: 3, fg50a: 2, fg50m: (i % 3) ? 1 : 0, fgLong: 48 + i, xpa: 30, xpm: 28 + (i % 2) }),
      [`r${i}`]: RET(`r${i}`, t, { krAtt: 20 + i, krYds: (20 + i) * (21 + (i % 4)), krTd: i === 3 ? 1 : 0, krLong: 40 + i * 2 }) }; }
  for (const r of extra) (table[r.team] ||= {})[r.id] = r;
  return { table, records };
}
const run = (extra) => { const { table, records } = league(extra); return computeAwards({ table, records, n: 5 }); };

test('Golden Boot: accuracy by distance beats volume; a kicker with too few attempts is not eligible', () => {
  const sharp = K('Sharp', 'C9', { fga: 18, fgm: 16, fg0a: 3, fg0m: 3, fg30a: 4, fg30m: 4, fg40a: 6, fg40m: 5, fg50a: 5, fg50m: 4, fgLong: 56, xpa: 30, xpm: 30 });
  const volume = K('Volume', 'C10', { fga: 34, fgm: 31, fg0a: 20, fg0m: 20, fg30a: 10, fg30m: 9, fg40a: 3, fg40m: 2, fg50a: 1, fg50m: 0, fgLong: 45, xpa: 44, xpm: 42 });
  const few = K('Few', 'C11', { fga: 6, fgm: 6, fg0a: 0, fg0m: 0, fg30a: 0, fg30m: 0, fg40a: 2, fg40m: 2, fg50a: 4, fg50m: 4, fgLong: 60, xpa: 10, xpm: 10 });
  const a = run([sharp, volume, few]);
  assert.equal(a.gboot[0].name, 'Sharp', JSON.stringify(a.gboot.slice(0, 3).map((x) => [x.name, x.score])));
  assert.ok(!a.gboot.some((x) => x.name === 'Few'), 'below 0.7 field-goal attempts a week: not eligible');
  assert.ok(a.gboot.findIndex((x) => x.name === 'Volume') > 0, 'more attempts alone does not win it');
  assert.ok(a.gboot.every((x) => x.position === 'K'));
});

test('Return King: yards per return and touchdowns over sheer volume; a light workload is not eligible', () => {
  const ace = RET('Ace', 'C9', { krAtt: 18, krYds: 18 * 31, krTd: 2, krLong: 98 });
  const busy = RET('Busy', 'C10', { krAtt: 40, krYds: 40 * 22, krTd: 0, krLong: 45 });
  const cameo = RET('Cameo', 'C11', { krAtt: 6, krYds: 6 * 45, krTd: 1, krLong: 99 });
  const a = run([ace, busy, cameo]);
  assert.equal(a.rking[0].name, 'Ace'); assert.ok(!a.rking.some((x) => x.name === 'Cameo'), 'below 0.75 returns a week: not eligible');
});

test('the awards are registered with labels, rules, trophies and Hall weights below STBOY', () => {
  for (const k of ['gboot', 'rking']) { assert.ok(AWARDS[k]?.label && AWARDS[k]?.short && AWARD_RULES[k]); assert.ok(TROPHY_META[k]?.label); assert.ok(TROPHY_ORDER.includes(k)); assert.ok(HALL_CASE.award[k] > 0 && HALL_CASE.award[k] < HALL_CASE.award.stboy + 0.001); }
});

test('Hall case: one season\'s special-teams honours count once, at the highest weight; different seasons count separately', () => {
  const ev = (k, y) => ({ t: 'award', k: `award:${k}:${y}`, y });
  const f = caseFacts({ position: 'K', career: {}, ev: [ev('stboy', 3), ev('gboot', 3), ev('gboot', 4), ev('rking', 5), ev('mvp', 6)] });
  assert.deepEqual(f.awardsBy, { mvp: 1, stboy: 1, gboot: 1, rking: 1 });
});

test('old seasons without the new awards still read: an empty race is just empty', () => {
  const { table, records } = league(); for (const t of Object.keys(table)) for (const id of Object.keys(table[t])) if (id.startsWith('k')) delete table[t][id];
  const a = computeAwards({ table, records, n: 5 }); assert.deepEqual(a.gboot, []); assert.ok(a.rking.length > 0);
});
