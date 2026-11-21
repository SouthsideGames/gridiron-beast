// Sim Ahead (2026-11-21): the staff run whole weeks, Sunday included, until something needs the owner.
// It is "Let the Staff Run the Week" plus the Sunday game, repeated. It uses only the game's own public functions
// (autoRunToSunday, takeBye, simulatePlayerGame, finishSunday), the same ones the headless soak uses, so a week played this
// way is a real week: same staff decisions, same game engine, same results, rewards, news and saves. Nothing new is decided.
//
// It always stops for: the commissioner, a season goal, a trade call, the creation draft, a live game, the playoffs, the end
// of the season, and a lineup that would forfeit (the owner fixes it and plays). By default it also stops on the Sunday of
// a rival or badge game, after the week's preparation, so the owner plays the big games. After each game it stops when a
// starter is newly hurt or a beast has newly become ready to evolve.
import * as F from './franchise.js';
import { buildDepthChart } from './roster.js';
import { evolutionReady } from '../data/monsters.js';
import { GYM_BY_CLUB } from '../data/gyms.js';

const starterIds = (f) => new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
const hurtStarters = (f) => { const s = starterIds(f); return f.roster.filter((m) => m.injury && s.has(m.id)).map((m) => m.id); };
const readyToEvolve = (f) => f.roster.filter((m) => { try { return evolutionReady(m); } catch { return false; } }).map((m) => m.id);
const names = (f, ids) => ids.map((id) => f.roster.find((m) => m.id === id)?.name).filter(Boolean);

/** Why the owner is needed before another week can be run, or null. */
export function simBlocker(f) {
  if (f.season?.finished) return { code: 'season-over' };
  if (f.game) return { code: 'live-game' };
  if (F.creationDraftPending(f)) return { code: 'draft' };
  if (F.needsGoal(f)) return { code: 'goal' };
  if (F.inPlayoffs(f)) return { code: 'playoffs' };
  if (f.week?.commissioner) return { code: 'commissioner' };
  if (F.tradeCall(f)) return { code: 'trade-call' };
  return null;
}
/** Whether Sim Ahead is offered at all right now. */
export const canSimAhead = (f) => !simBlocker(f);

/**
 * Run the rest of this week (from whatever day it is) and its Sunday game. Returns { ok, entry?, stop? }:
 * entry describes the week that was played ({ week, bye, opponent, won, score }); stop ({ code, names? }) says why the next
 * week should not be run automatically. A stop with no entry means nothing was played this time.
 */
export function simOneWeek(f, { stopBeforeBigGames = true } = {}) {
  const blocked = simBlocker(f); if (blocked) return { ok: true, stop: blocked };
  const hurtBefore = new Set(hurtStarters(f)), readyBefore = new Set(readyToEvolve(f));
  const week = f.season.week;
  const ar = F.autoRunToSunday(f);
  if (!ar.ok && f.season.day < 6) return { ok: false, stop: { code: 'blocked', reason: ar.reason } };
  if (f.week?.commissioner) return { ok: true, stop: { code: 'commissioner' } };
  if (F.isBye(f)) { F.takeBye(f); return { ok: true, entry: { week, bye: true }, stop: simBlocker(f) }; }
  const m = F.sundayMatchup(f); if (!m) return { ok: false, stop: { code: 'blocked', reason: 'No game this Sunday.' } };
  if (m.forfeit) return { ok: true, stop: { code: 'lineup' } };
  if (stopBeforeBigGames && (m.rival || GYM_BY_CLUB[m.opponent])) return { ok: true, stop: { code: m.rival ? 'rival' : 'badge', opponent: m.opponent } };
  const game = F.simulatePlayerGame(f);
  if (!game?.finished) return { ok: false, stop: { code: 'blocked', reason: 'The game did not finish.' } };
  const side = m.playerSide, other = side === 'home' ? 'away' : 'home';
  const score = [game.score[side], game.score[other]];
  F.finishSunday(f, game);
  const entry = { week, opponent: m.opponent, won: game.winner ? game.winner === side : score[0] > score[1], score };
  const hurt = hurtStarters(f).filter((id) => !hurtBefore.has(id)); if (hurt.length) return { ok: true, entry, stop: { code: 'injury', names: names(f, hurt) } };
  const ready = readyToEvolve(f).filter((id) => !readyBefore.has(id)); if (ready.length) return { ok: true, entry, stop: { code: 'evolution', names: names(f, ready) } };
  return { ok: true, entry, stop: simBlocker(f) };
}

/** Run up to `weeks` weeks (Infinity: until something needs the owner). Returns { ok, played: entry[], stop }. */
export function simAhead(f, { weeks = Infinity, stopBeforeBigGames = true, onWeek = null } = {}) {
  const played = []; let stop = null, guard = 0;
  while (played.length < weeks && guard++ < 40) {
    const r = simOneWeek(f, { stopBeforeBigGames });
    if (r.entry) { played.push(r.entry); onWeek?.(r.entry); }
    if (!r.ok) return { ok: false, played, stop: r.stop };
    if (r.stop) { stop = r.stop; break; }
  }
  return { ok: true, played, stop: stop || (played.length >= weeks ? { code: 'weeks-done' } : null) };
}
