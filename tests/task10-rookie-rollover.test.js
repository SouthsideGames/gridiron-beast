// Task 10 (owner 2026-11-13): first-year status lasts one actual season. Founding rookies (the creation draft, stamped
// rookie = joined = 1) used to be reset to first-year again at the first rollover, so they were rookies twice, did not age and
// could win a rookie award twice. A hands-off Pro franchise is played for three seasons and every monster is followed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { isAgeless } from '../src/franchise/league-registry.js';

test('rookie rollover: founding rookies, draftees and later arrivals; ageing, experience and rookie awards over three seasons', { timeout: 900000 }, () => {
  const firstYear = new Map(); const seenAt = new Map(); const before = new Map(); let history1 = null; const checks = { founding: 0, draftees: 0, arrivals: 0, aged: 0, roy: 0 };
  runFranchise(9, { difficulty: 'pro', seasons: 3, check: () => [], onOffseason: (f) => { if (f.board) { f.board.confidence = 2; f.board.misses = 0; } },
    onSeason: (f) => {
      const y = f.season.year; const rows = Object.values(f.season.leagueStats).flatMap((T) => Object.values(T)).filter((r) => (r.games || 0) > 0);
      const all = new Map([...Object.values(f.league.monsters), ...f.roster].map((m) => [m.id, m]));
      for (const r of rows) {
        const m = all.get(r.id); if (!m) continue;
        if (r.yearsPro === 0) { assert.ok(!firstYear.has(r.id), `${r.name} is a first-year monster in ${firstYear.get(r.id)} and again in ${y}`); firstYear.set(r.id, y); }
        if (y >= 2 && m.rookie === 1 && m.joined === 1) { assert.ok(r.yearsPro >= 1, `founding rookie ${r.name} is first-year again in season ${y}`); checks.founding++; }
        if (m.rookie === y - 1 && m.joined === y) { assert.equal(r.yearsPro, 0, `${r.name}, drafted after season ${y - 1}, must be first-year in season ${y}`); checks.draftees++; }
        if (y >= 2 && m.rookie == null && seenAt.has(r.id) === false && r.yearsPro > 0) checks.arrivals++;
        if (!seenAt.has(r.id)) seenAt.set(r.id, y);
      }
      for (const m of all.values()) {
        const b = before.get(m.id);
        if (b && !isAgeless(m) && !m.dev?.apex) { assert.equal(m.age - b.age, y - b.y, `${m.name} ages one year per season`); assert.equal(m.yearsPro - b.yearsPro, y - b.y, `${m.name} gains one season of experience per season`); checks.aged++; }
        if (!b) before.set(m.id, { y, age: m.age, yearsPro: m.yearsPro });
      }
      const w = f.season.awardsFinal?.winners || {};
      for (const k of ['oroy', 'droy']) if (w[k]) {
        const row = rows.find((r) => r.id === w[k].id); assert.equal(row?.yearsPro, 0, `${k} ${w[k].name} is a first-year monster`);
        assert.ok(!(f.history || []).slice(0, -1).some((h) => h.awards?.league?.oroy?.id === w[k].id || h.awards?.league?.droy?.id === w[k].id), `${w[k].name} won a rookie award before`); checks.roy++;
      }
      if (y === 1) history1 = JSON.stringify(f.history[0]?.awards ?? null);
      else assert.equal(JSON.stringify(f.history[0]?.awards ?? null), history1, 'season 1 awards stay as recorded');
    } });
  assert.ok(checks.founding > 0 && checks.draftees > 0 && checks.aged > 100 && checks.roy >= 4, JSON.stringify(checks));
});
