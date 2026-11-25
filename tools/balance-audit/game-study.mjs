#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): full games on the production engine (src/sim/game-runner.js playGame) between
// generated clubs, with Franchise Mode's game settings (180 s quarters, one overtime period). Each club gets a seeded quality and a
// seeded coach identity (offence pass/balanced/run, defence pressure/coverage/man, one of the five coach styles), so the study
// covers the released book the way AI clubs call it. Nothing in the game is changed; the onStep hook only reads.
//   node tools/balance-audit/game-study.mjs [--games=400] [--seed=1] [--qmin=46] [--qmax=66] [--equal] [--json=FILE] [--plays=FILE.csv]
//   --equal: both clubs get the same quality (strategy viability with strength held level)
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam, teamOverall } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const { PLAYS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const { createRng } = await import(path.join(ROOT, 'src/core/rng.js'));
const { identityCoach } = await import(path.join(ROOT, 'src/data/identities.js'));
const G = Number(args.games || 400), SEED = Number(args.seed || 1), QMIN = Number(args.qmin || 46), QMAX = Number(args.qmax || 66);
const STYLES = ['air_raid', 'ground_pound', 'trickster', 'balanced', 'tempo'];
const OFF = ['pass', 'balanced', 'run'], DEF = ['pressure', 'coverage', 'man'];
const STYLE_OFF = { air_raid: 'pass', ground_pound: 'run', trickster: 'balanced', balanced: 'balanced', tempo: 'pass' };

const T = { games: 0, plays: 0, pts: [], margins: [], ot: 0, ties: 0, blowout21: 0, oneScore: 0, upsets: 0, favGames: 0, favByGap: {}, forfeits: 0, guard: 0, errors: [] };
const team = () => ({ pts: 0, passAtt: 0, comp: 0, passYds: 0, passTd: 0, int: 0, sacks: 0, dropbacks: 0, rush: 0, rushYds: 0, rushTd: 0, fum: 0, plays: 0, yds: 0, exPass: 0, exRun: 0, third: 0, thirdConv: 0, fourth: 0, fourthConv: 0, rzTrips: 0, rzTd: 0, rzFg: 0, rzScore: 0, drives: 0, threeOut: 0, fgAtt: 0, fgMade: 0, fgBy: {}, punts: 0, xpAtt: 0, xpMade: 0, twoAtt: 0, twoMade: 0, safeties: 0 });
const ALL = team();
const offPlay = {}, defPlay = {}, matchup = {}, byStyle = {}, byOffId = {}, byDefId = {};
const playRows = [];
const add = (o, k, f) => { const r = (o[k] ||= { n: 0, yds: 0, succ: 0, td: 0, to: 0, sack: 0, ex: 0, neg: 0 }); f(r); };
const success = (down, toGo, y) => (down === 1 ? y >= 0.4 * toGo : down === 2 ? y >= 0.6 * toGo : y >= toGo);
const rec = (o, k, win, pf, pa) => { const r = (o[k] ||= { g: 0, w: 0, pf: 0, pa: 0 }); r.g++; r.w += win; r.pf += pf; r.pa += pa; };

for (let i = 0; i < G; i++) {
  const rng = createRng(SEED * 100003 + i * 7919);
  const mk = (tag, q) => {
    const style = STYLES[rng.int(STYLES.length)]; const identity = { offense: STYLE_OFF[style], defense: DEF[rng.int(3)], style, passStyle: rng.chance(0.5) ? 'vertical' : 'quick', runStyle: rng.chance(0.5) ? 'inside' : 'option', runFront: rng.chance(0.3) };
    const t = generatedTeam(SEED * 1000 + i * 2 + (tag === 'h' ? 0 : 1) + 50000, { id: tag, name: tag === 'h' ? 'Home' : 'Away', quality: q, coach: { ...identityCoach(identity, (rng.next() * 2 ** 31) >>> 0), iq: 1, substitution: 'balanced', identity } }); // the franchise's aiCoach shape for an ordinary identity club (iq: Pro)
    return { t, identity, ovr: (() => { try { return teamOverall(t); } catch { return null; } })(), q };
  };
  const qh = QMIN + rng.int(QMAX - QMIN + 1); const qa = args.equal ? qh : QMIN + rng.int(QMAX - QMIN + 1);
  const H = mk('h', qh), A = mk('a', qa);
  const per = { home: team(), away: team() };
  let pre = null, drive = null; const drives = [];
  const endDrive = (state) => { if (!drive) return; const d = drive; d.ptsAfter = state.score[d.side]; drives.push(d); drive = null; };
  const startDrive = (state) => { drive = { side: state.possession, ptsBefore: state.score[state.possession], plays: 0, rz: false, firstDowns: 0, td: 0 }; };
  let s;
  try {
    s = playGame({ home: H.t, away: A.t, seed: SEED * 31337 + i, quarterLength: 180, otPeriods: 1, onStep: (ev, state) => {
      if (!ev) return;
      if (ev.kind === 'forfeit') T.forfeits++;
      const p0 = pre; pre = { down: state.down, toGo: state.toGo, ballOn: state.ballOn, possession: state.possession, phase: state.phase, score: { ...state.score }, quarter: state.quarter };
      if (!p0) return;
      const side = p0.possession, S = per[side];
      if (ev.kind === 'play' && ev.sim) {
        if (!drive || drive.side !== side) { endDrive(state); drive = { side, ptsBefore: p0.score[side], plays: 0, rz: false, firstDowns: 0 }; }
        const sim = ev.sim, y = sim.yards || 0, P = PLAYS[ev.offensePlayId] || {}; const isPass = !!(sim.stats?.target || sim.result === 'sack' || (P.type === 'pass' && !sim.stats?.carrier));
        drive.plays++; if (p0.ballOn >= 80) drive.rz = true;
        S.plays++; S.yds += y; T.plays++;
        const scoredTd = state.score[side] - p0.score[side] >= 6;
        const turnover = !!sim.turnover || (state.possession !== side && !scoredTd && state.phase === 'scrimmage' && p0.down < 4);
        if (isPass) {
          S.dropbacks++;
          if (sim.result === 'sack') S.sacks++;
          else if (sim.stats?.target) { S.passAtt++; if (sim.stats.receiver) { S.comp++; S.passYds += y; if (scoredTd) S.passTd++; if ((y) >= 20) S.exPass++; } if (sim.stats.interceptor) S.int++; }
        } else if (sim.stats?.carrier) { S.rush++; S.rushYds += y; if (scoredTd) S.rushTd++; if (y >= 15) S.exRun++; }
        if (sim.turnover && !sim.stats?.interceptor) S.fum++;
        if (p0.down === 3) { S.third++; if (scoredTd || (state.possession === side && state.down === 1)) S.thirdConv++; }
        if (p0.down === 4) { S.fourth++; if (scoredTd || (state.possession === side && state.down === 1)) S.fourthConv++; }
        const succ = scoredTd || success(p0.down, p0.toGo, y);
        const ex = isPass ? y >= 20 : y >= 15;
        const f = (r) => { r.n++; r.yds += y; r.succ += succ ? 1 : 0; r.td += scoredTd ? 1 : 0; r.to += sim.turnover ? 1 : 0; r.sack += sim.result === 'sack' ? 1 : 0; r.ex += ex ? 1 : 0; r.neg += y < 0 ? 1 : 0; };
        add(offPlay, ev.offensePlayId, f); add(defPlay, ev.defensePlayId, f);
        const dp = PLAYS[ev.defensePlayId] || {}; const dfam = (dp.tags || []).includes('blitz') ? 'blitz' : (dp.tags || []).includes('run') ? 'run_d' : (dp.tags || []).includes('man') ? 'man' : (dp.tags || []).includes('zone') ? 'zone' : 'other';
        add(matchup, `${P.type || '?'}|${dfam}`, f);
        if (args.plays) playRows.push([i, side, p0.quarter, p0.down, p0.toGo, p0.ballOn, ev.offensePlayId, P.type, ev.defensePlayId, dfam, y, sim.result, scoredTd ? 1 : 0, sim.turnover ? 1 : 0].join(','));
      } else if (ev.kind === 'field_goal') {
        const dist = 100 - ev.from + 17; const band = dist < 30 ? '<30' : dist < 40 ? '30-39' : dist < 50 ? '40-49' : '50+';
        S.fgAtt++; const made = state.score[side] - p0.score[side] === 3; if (made) S.fgMade++; const b = (S.fgBy[band] ||= [0, 0]); b[0]++; b[1] += made ? 1 : 0;
        if (drive && drive.side === side) { if (p0.ballOn >= 80) drive.rz = true; endDrive(state); }
      } else if (ev.kind === 'punt') { S.punts++; if (drive && drive.side === side) endDrive(state); }
      else if (ev.kind === 'try') { const t = per[ev.tryTeam]; if (ev.sim) { t.twoAtt++; t.twoMade += ev.good ? 1 : 0; } else { t.xpAtt++; t.xpMade += ev.good ? 1 : 0; } }
      if (drive && state.possession !== drive.side) endDrive(state);
    } });
  } catch (e) { T.errors.push({ game: i, error: String(e?.stack || e).slice(0, 400) }); continue; }
  endDrive(s);
  for (const d of drives) { const S = per[d.side]; S.drives++; if (d.plays <= 3 && d.ptsAfter === d.ptsBefore) S.threeOut++; if (d.rz) { S.rzTrips++; const g = d.ptsAfter - d.ptsBefore; if (g >= 6) S.rzTd++; else if (g === 3) S.rzFg++; if (g > 0) S.rzScore++; } }
  if (s.guard) T.guard++;
  T.games++; const hp = s.score.home, ap = s.score.away; per.home.pts = hp; per.away.pts = ap; T.pts.push(hp, ap); const m = Math.abs(hp - ap); T.margins.push(m);
  if (s.ot || s.quarter > 4) T.ot++; if (hp === ap) T.ties++; if (m >= 21) T.blowout21++; if (m <= 8) T.oneScore++;
  for (const side of ['home', 'away']) for (const [k, v] of Object.entries(per[side])) { if (k === 'fgBy') { for (const [b, [a, mm]] of Object.entries(v)) { const x = (ALL.fgBy[b] ||= [0, 0]); x[0] += a; x[1] += mm; } } else ALL[k] += v; }
  if (H.ovr != null && A.ovr != null && H.ovr !== A.ovr) { const fav = H.ovr > A.ovr ? 'home' : 'away'; const gap = Math.abs(H.ovr - A.ovr); const gb = gap <= 2 ? '1-2' : gap <= 5 ? '3-5' : gap <= 9 ? '6-9' : '10+'; const r = (T.favByGap[gb] ||= { g: 0, favW: 0, ties: 0 }); r.g++; const fw = s.score[fav] > s.score[fav === 'home' ? 'away' : 'home']; r.favW += fw ? 1 : 0; T.favGames++; if (!fw && hp !== ap) T.upsets++; }
  const res = (me, them) => (s.score[me] > s.score[them] ? 1 : s.score[me] === s.score[them] ? 0.5 : 0);
  if (args.equal) for (const [X, me, them] of [[H, 'home', 'away'], [A, 'away', 'home']]) { rec(byStyle, `style:${X.identity.style}`, res(me, them), s.score[me], s.score[them]); rec(byStyle, `off:${X.identity.offense}`, res(me, them), s.score[me], s.score[them]); rec(byStyle, `def:${X.identity.defense}`, res(me, them), s.score[me], s.score[them]); rec(byStyle, `pass:${X.identity.passStyle}`, res(me, them), s.score[me], s.score[them]); rec(byStyle, `run:${X.identity.runStyle}`, res(me, them), s.score[me], s.score[them]); }
}
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null), avg = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return +Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length).toFixed(2); };
const tg = 2 * T.games;
const per1 = (k) => +(ALL[k] / tg).toFixed(2);
const summary = {
  games: T.games, plays: T.plays, forfeits: T.forfeits, runnerGuards: T.guard, errors: T.errors.length,
  pointsPerTeamGame: avg(T.pts), pointsSD: sd(T.pts), shutouts: T.pts.filter((p) => p === 0).length, meanMargin: avg(T.margins),
  overtimePct: pct(T.ot, T.games), tiesPct: pct(T.ties, T.games), blowout21Pct: pct(T.blowout21, T.games), oneScorePct: pct(T.oneScore, T.games),
  upsetPctOfDecided: pct(T.upsets, T.favGames), favouriteWinByOvrGap: Object.fromEntries(Object.entries(T.favByGap).map(([k, v]) => [k, { games: v.g, favouriteWinPct: pct(v.favW, v.g) }])),
  perTeamGame: { plays: per1('plays'), yards: per1('yds'), passAtt: per1('passAtt'), passYds: per1('passYds'), rush: per1('rush'), rushYds: per1('rushYds'), passTd: per1('passTd'), rushTd: per1('rushTd'), int: per1('int'), fumblesLost: per1('fum'), sacks: per1('sacks'), drives: per1('drives'), punts: per1('punts'), fgAtt: per1('fgAtt') },
  completionPct: pct(ALL.comp, ALL.passAtt), yardsPerAttempt: +(ALL.passYds / ALL.passAtt).toFixed(2), yardsPerCarry: +(ALL.rushYds / ALL.rush).toFixed(2), yardsPerPlay: +(ALL.yds / ALL.plays).toFixed(2),
  passSharePct: pct(ALL.dropbacks, ALL.dropbacks + ALL.rush), sackPctDropbacks: pct(ALL.sacks, ALL.dropbacks), intPctAtt: pct(ALL.int, ALL.passAtt), passTdPctAtt: pct(ALL.passTd, ALL.passAtt),
  explosivePass20PctAtt: pct(ALL.exPass, ALL.passAtt), explosiveRun15PctCarries: pct(ALL.exRun, ALL.rush),
  thirdDownPct: pct(ALL.thirdConv, ALL.third), fourthDownPct: pct(ALL.fourthConv, ALL.fourth), threeAndOutPctDrives: pct(ALL.threeOut, ALL.drives),
  redZone: { tripsPerTeamGame: +(ALL.rzTrips / tg).toFixed(2), tdPct: pct(ALL.rzTd, ALL.rzTrips), scorePct: pct(ALL.rzScore, ALL.rzTrips), fgPct: pct(ALL.rzFg, ALL.rzTrips) },
  fieldGoals: { att: ALL.fgAtt, pct: pct(ALL.fgMade, ALL.fgAtt), byDistance: Object.fromEntries(Object.entries(ALL.fgBy).map(([k, [a, m]]) => [k, { att: a, pct: pct(m, a) }])) }, extraPointPct: pct(ALL.xpMade, ALL.xpAtt), twoPoint: { att: ALL.twoAtt, pct: pct(ALL.twoMade, ALL.twoAtt) },
};
const rows = (o) => Object.entries(o).map(([id, r]) => ({ id, type: PLAYS[id]?.type || null, n: r.n, ypp: +(r.yds / r.n).toFixed(2), successPct: pct(r.succ, r.n), tdPct: pct(r.td, r.n), toPct: pct(r.to, r.n), sackPct: pct(r.sack, r.n), explosivePct: pct(r.ex, r.n), negPct: pct(r.neg, r.n) })).sort((a, b) => b.n - a.n);
const out = { tool: 'balance-audit/game-study', root: ROOT, args, summary, matchups: rows(matchup), offensePlays: rows(offPlay), defensePlays: rows(defPlay), strategies: Object.fromEntries(Object.entries(byStyle).map(([k, r]) => [k, { games: r.g, winPct: pct(r.w, r.g), pf: +(r.pf / r.g).toFixed(1), pa: +(r.pa / r.g).toFixed(1) }])), errors: T.errors };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
if (args.plays) fs.writeFileSync(String(args.plays), 'game,side,quarter,down,toGo,ballOn,offPlay,offType,defPlay,defFamily,yards,result,td,turnover\n' + playRows.join('\n'));
console.log(JSON.stringify(summary, null, 1));
