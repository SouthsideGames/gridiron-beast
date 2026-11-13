#!/usr/bin/env node
// Task 10 football ability strength (measurement only). For every Dex family with a football ability, at its first form with no
// mastery and at its last form with full mastery, the same full games are played twice with the same seeds and the same two
// clubs: once with the family's monster carrying his ability, once with the very same monster (same ratings, same type) without
// it. No other monster on either club has an ability, so the difference between the two games is this ability alone. The games
// are whole real games (the game runner, rules.js, the engine, every hook, natural unprimed game-scope state), so charges,
// cooldowns, fields and once-per-game limits run at their real rate.
// Per ability and variant: executions per game (how often it actually does something), the share of games with none, and the
// paired difference in point margin, points for and against, yards per play gained and allowed, and turnovers, each with its
// standard error over the paired games.
//   node tools/task10-ability-strength.mjs [--games=40] [--only=fam1,fam2] [--variants=base,top] [--json=out.json] [--pairs=famA+famB,...]
import { writeFileSync } from 'node:fs';
import { reviewCatalog, subjectSlot } from '../src/sim/abilities/review.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import { generatedTeam } from '../src/franchise/roster.js';
import * as R from '../src/sim/rules.js';
import { step, aiController, newTendencies } from '../src/sim/game-runner.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const G = Number(args.games || 40); const ONLY = args.only ? new Set(String(args.only).split(',')) : null; const VAR = new Set(String(args.variants || 'base,top').split(','));
const strip = (p) => (p ? { ...p, species: null, form: null, ability: null } : p);
function clubs(seed) {
  const home = generatedTeam(seed * 2 + 1, { id: 'H', name: 'Home', abbr: 'HOM', quality: 62 }), away = generatedTeam(seed * 2 + 2, { id: 'A', name: 'Away', abbr: 'AWY', quality: 62 });
  for (const t of [home, away]) { const retId = t.returner?.id; for (const side of ['offense', 'defense']) for (const k of Object.keys(t[side])) t[side][k] = strip(t[side][k]); t.kicker = strip(t.kicker); if (t.returner) t.returner = Object.values({ ...t.offense, ...t.defense }).find((p) => p.id === retId) || strip(t.returner); }
  return { home, away };
}
/** Place subjects (each { fam, form, mastery, on }) on the home club; `on` false keeps the same monster and type without the ability. */
function place(team, subjects) {
  const used = new Set();
  for (const [i, s] of subjects.entries()) {
    const at = subjectSlot(s.fam.position); if (!at) continue; let slot = at.slot;
    if (at.side !== 'kicker' && used.has(`${at.side}:${slot}`)) { slot = Object.keys(team[at.side]).find((k) => k !== slot && team[at.side][k]?.position === s.fam.position && !used.has(`${at.side}:${k}`)) || slot; }
    used.add(`${at.side}:${slot}`);
    const base = at.side === 'kicker' ? team.kicker : team[at.side][slot];
    const subject = { ...base, id: `subject${i}`, type: s.fam.type, position: s.fam.position, name: s.fam.name, ability: null, ...(s.on ? { species: s.fam.id, form: s.form, mastery: s.mastery } : { species: null, form: null }) };
    if (at.side === 'kicker') team.kicker = subject; else team[at.side][slot] = subject;
    if (team.returner?.id && team.returner.id === base.id) team.returner = subject;
  }
}
function game(seed, subjects) {
  const teams = clubs(seed); place(teams.home, subjects);
  const state = R.newGame({ home: teams.home, away: teams.away, seed });
  const ctrl = { home: aiController('home'), away: aiController('away') }; const tend = { home: newTendencies(), away: newTendencies() };
  const m = { offPlays: 0, offYds: 0, defPlays: 0, defYds: 0, gave: 0, took: 0 };
  for (let i = 0; i < 2500 && !state.finished; i++) {
    const scrim = state.phase === 'scrimmage'; const poss = state.possession; const ev = step(state, teams, ctrl, tend, {}); if (!ev) break;
    if (scrim && ev.kind === 'play' && ev.sim) { if (poss === 'home') { m.offPlays++; m.offYds += ev.sim.yards || 0; if (ev.sim.turnover) m.gave++; } else { m.defPlays++; m.defYds += ev.sim.yards || 0; if (ev.sim.turnover) m.took++; } }
  }
  const ex = subjects.map((_, i) => state.t8?.mastery?.[`subject${i}`]?.executions || 0);
  return { margin: state.score.home - state.score.away, pf: state.score.home, pa: state.score.away, win: state.score.home > state.score.away ? 1 : state.score.home === state.score.away ? 0.5 : 0, ypp: m.offYds / Math.max(1, m.offPlays), yppAllowed: m.defYds / Math.max(1, m.defPlays), to: m.took - m.gave, ex };
}
const KEYS = ['margin', 'pf', 'pa', 'win', 'ypp', 'yppAllowed', 'to'];
function paired(on, off) {
  const out = {}; const n = on.length;
  for (const k of KEYS) { const d = on.map((g, i) => g[k] - off[i][k]); const mean = d.reduce((a, b) => a + b, 0) / n; const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)); out[k] = +mean.toFixed(3); out[`${k}SE`] = +(sd / Math.sqrt(n)).toFixed(3); }
  out.changedGames = on.filter((g, i) => g.margin !== off[i].margin || g.pf !== off[i].pf).length;
  return out;
}
const rows = []; const t0 = Date.now();
if (args.pairs) {
  for (const pr of String(args.pairs).split(',')) {
    const fams = pr.split('+').map((id) => FAMILIES.find((f) => f.id === id)); if (fams.some((f) => !f)) continue;
    const cat = reviewCatalog(); const subj = (on) => fams.map((fam) => { const c = cat.find((x) => x.family === fam.id); return { fam, form: c.forms[c.forms.length - 1], mastery: 3, on }; });
    const on = [], off = []; for (let g = 0; g < G; g++) { on.push(game(1000 + g, subj(true))); off.push(game(1000 + g, subj(false))); }
    const row = { pair: pr, games: G, ...paired(on, off), exPerGame: fams.map((_, i) => +(on.reduce((a, x) => a + x.ex[i], 0) / G).toFixed(2)) }; rows.push(row); console.log(JSON.stringify(row));
  }
} else {
  for (const c of reviewCatalog()) {
    if (ONLY && !ONLY.has(c.family)) continue; const fam = FAMILIES.find((f) => f.id === c.family);
    for (const v of [{ id: 'base', form: c.forms[0], mastery: 0 }, { id: 'top', form: c.forms[c.forms.length - 1], mastery: 3 }]) {
      if (!VAR.has(v.id)) continue;
      const on = [], off = []; for (let g = 0; g < G; g++) { on.push(game(1000 + g, [{ fam, form: v.form, mastery: v.mastery, on: true }])); off.push(game(1000 + g, [{ fam, form: v.form, mastery: v.mastery, on: false }])); }
      const exs = on.map((x) => x.ex[0]);
      const row = { family: c.family, ability: c.name, abilityId: c.abilityId, element: c.element, rarity: c.rarity, position: c.position, registered: c.registered, variant: v.id, form: v.form, mastery: v.mastery, games: G,
        exPerGame: +(exs.reduce((a, b) => a + b, 0) / G).toFixed(2), gamesWithNone: exs.filter((x) => !x).length, exMax: Math.max(...exs), ...paired(on, off), sec: Math.round((Date.now() - t0) / 1000) };
      rows.push(row); console.log(JSON.stringify(row));
    }
  }
}
if (args.json) writeFileSync(String(args.json), JSON.stringify({ games: G, rows }));
