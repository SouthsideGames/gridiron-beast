#!/usr/bin/env node
// Board replay (GDD §29): apply the original and the revised Board rules to the same seasons (facts written by
// `tools/board-study.mjs --mode=facts`), so the comparison is not blurred by different seasons. Each franchise's seasons are
// replayed in order; a fired owner's later seasons are dropped, exactly as in play.
//   node tools/board-replay.mjs facts-0.json [facts-1.json ...] [--goal=safe|medium|stretch]
import fs from 'node:fs';
import * as Board from '../src/franchise/board.js';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const GOAL = args.goal || 'safe';
const rows = files.flatMap((p) => JSON.parse(fs.readFileSync(p, 'utf8')));

// ---- the original rules (board.js before 2026-10-22), kept here verbatim for the comparison
const ORIGINAL = {
  forecast: (r) => r.expectedWinPct,
  offers(expectedWinPct, games = 9, gyms = 4) {
    const exp = expectedWinPct * games; const safeWins = Math.max(3, Math.min(games - 2, Math.round(exp) + (expectedWinPct >= 0.55 ? 1 : 0)));
    const medium = expectedWinPct >= 0.45 ? { id: 'playoffs', weight: 1 } : { id: 'badges', target: gyms >= 4 ? 2 : 1, weight: 1 };
    return [{ id: 'wins', target: safeWins, weight: 1, tier: 'safe', label: `Win ${safeWins}` }, { ...medium, tier: 'medium', label: medium.id }, { id: 'title', weight: 2, tier: 'stretch', label: 'title' }];
  },
  settle(b, goal, facts) {
    const met = Board.goalMet(goal, facts); const delta = met ? goal.weight : -1;
    b.confidence = Math.max(-2, Math.min(2, (met ? Math.max(0, b.confidence) : b.confidence) + delta));
    return { met, fired: b.confidence <= -2, reason: b.confidence <= -2 ? 'two misses' : null };
  },
};
// ---- the revised rules: the functions board.js ships now
const revised = (R = Board.BOARD_RULES) => ({
  forecast: (r) => Board.boardForecast({ talent: r.talent, leagueTalent: r.leagueTalent }, R).winPct,
  offers: (p, games = 9, gyms = 4) => Board.goalOffers(null, { expectedWinPct: p, gamesInSeason: games, gymsThisSeason: gyms }, R),
  settle(b, goal, facts) { const v = Board.settleConfidence(b, goal, facts, R); return { met: v.met, fired: v.fired, reason: v.reason, miss: v.miss }; },
});
const REVISED = revised();

function replay(rules) {
  const byFr = new Map(); for (const r of rows) { const k = `${r.seed}|${r.difficulty}`; (byFr.get(k) || byFr.set(k, []).get(k)).push(r); }
  const out = [];
  for (const [k, rs] of byFr) {
    rs.sort((a, b) => a.season - b.season); const b = { confidence: 0, misses: 0 }; const seasons = [];
    for (const r of rs) {
      const p = rules.forecast(r); const offers = rules.offers(p, 9, 4); const goal = offers.find((o) => o.tier === GOAL) || offers[0];
      const facts = { wins: r.w, losses: r.l, playoffs: r.playoffs, badgesWon: r.badges, champion: r.champion, forecastWins: p * 9 };
      const v = rules.settle(b, goal, facts);
      seasons.push({ season: r.season, w: r.w, l: r.l, forecast: +(p * 9).toFixed(1), goal: goal.label, met: v.met, miss: v.miss || null, confidence: b.confidence, fired: v.fired, reason: v.reason });
      if (v.fired) break;
    }
    out.push({ key: k, difficulty: rs[0].difficulty, seasons });
  }
  return out;
}
function summary(res) {
  const fired = res.filter((x) => x.seasons.some((s) => s.fired)); const all = res.flatMap((x) => x.seasons);
  const diffs = [...new Set(res.map((x) => x.difficulty))];
  return {
    franchises: res.length, seasonsPlayed: all.length, fired: fired.length, firedPct: Math.round(fired.length / res.length * 100),
    byDifficulty: Object.fromEntries(diffs.map((d) => { const rs = res.filter((x) => x.difficulty === d); return [d, `${rs.filter((x) => x.seasons.some((s) => s.fired)).length}/${rs.length}`]; })),
    goalMetPct: Math.round(all.filter((s) => s.met).length / all.length * 100), avgConfidence: +(all.reduce((a, s) => a + s.confidence, 0) / all.length).toFixed(2),
    firedWithWinningLastSeason: fired.filter((x) => { const s = x.seasons.at(-1); return s.w > s.l; }).length,
    reasons: fired.reduce((m, x) => { const r = x.seasons.at(-1).reason || '?'; m[r] = (m[r] || 0) + 1; return m; }, {}),
    dismissed: fired.map((x) => `${x.key}: ${x.seasons.map((s) => `${s.w}-${s.l} (fc ${s.forecast}, ${s.goal}${s.met ? ' ✓' : s.miss ? ` ✗ ${s.miss}` : ' ✗'})`).join(', ')}`),
    sustainedPoorStillFired: (() => { const poor = res.filter((x) => x.seasons.filter((s) => s.w <= 3).length >= 2); return `${poor.filter((x) => x.seasons.some((s) => s.fired)).length}/${poor.length} franchises with two or more seasons of 3 wins or fewer were dismissed`; })(),
    underperformersFired: (() => { const u = res.filter((x) => x.seasons.filter((s) => s.w <= s.forecast - 2).length >= 2); return `${u.filter((x) => x.seasons.some((s) => s.fired)).length}/${u.length} franchises with two or more seasons at least two wins under their forecast were dismissed`; })(),
  };
}
// Forecast calibration: actual win% against the talent gap to the league.
const pts = rows.map((r) => [r.talent - r.leagueTalent, r.w / (r.w + r.l)]); const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
const slope = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
const bias = (fc) => +(rows.reduce((a, r) => a + (r.w - fc(r) * 9), 0) / rows.length).toFixed(2);
console.log(JSON.stringify({ goalPolicy: GOAL, seasons: rows.length,
  calibration: { slopePerOvr: +slope.toFixed(4), interceptAtZeroGap: +(my - slope * mx).toFixed(3), meanGap: +mx.toFixed(2), meanWinPct: +my.toFixed(3), originalForecastBiasWins: bias(ORIGINAL.forecast), revisedForecastBiasWins: bias(REVISED.forecast) },
  original: summary(replay(ORIGINAL)), revised: summary(replay(REVISED)),
  ...(args.sweep ? { sweep: Object.fromEntries([0.025, 0.035].flatMap((slope) => [0, 1].flatMap((safeBelow) => [0, 1].map((narrow) => { const R = { ...Board.BOARD_RULES, slope, safeBelow, narrow }; const s = summary(replay(revised(R))); return [`slope ${slope} safe-${safeBelow} narrow ${narrow}`, { firedPct: s.firedPct, byDifficulty: s.byDifficulty, goalMetPct: s.goalMetPct, avgConfidence: s.avgConfidence, winningFired: s.firedWithWinningLastSeason, underperformers: s.underperformersFired, reasons: s.reasons }]; })))) } : {}) }, null, 1));
