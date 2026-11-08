// Game state machine: downs, distance, scoring, clock, quarters, special
// teams phases and overtime (GDD §3). Pure functions on a plain state object
// so the UI, Key Moments and headless league games share one rulebook.

import { venueFor } from '../data/stadiums.js';
import { positionOf, canPlay } from '../data/personnel.js';
import { boostSlots, qualifyingEvent, slotOf } from './partnership-play.js';
import { createRng, rngFromState } from '../core/rng.js';
import { FIELD, yardLabel, fieldGoalDistance, clamp } from '../core/field.js';
import { simulatePlay } from './engine.js';
import * as T8S from './t8/status-runtime.js';
import * as T8K from './t8/stamina-runtime.js';
import * as T8F from './t8/field-runtime.js';
import { extraCooldownUnit } from './abilities/registry.js';
import { getPlay } from '../data/playbook.js';
import * as ST from './special-teams.js';

export const RUNOFF = { normal: 18, hurry: 8, milk: 30 };
export const DEFAULT_QUARTER = 180;

export function newGame({ home, away, seed = 1, quarterLength = DEFAULT_QUARTER, coinWinner = null, choice = null, comeback = null, otPeriods = null, venue = null }) {
  const rng = createRng(seed);
  const winner = coinWinner || (rng.chance(0.5) ? 'home' : 'away');
  const loser = winner === 'home' ? 'away' : 'home';
  const pick = choice || 'receive';
  // receive: winner receives now. defer: winner receives second half. kick: loser receives now and winner second half.
  const firstReceiver = pick === 'receive' ? winner : loser;
  const secondReceiver = pick === 'receive' ? loser : winner;
  const state = {
    version: 1, seed, rngState: rng.state,
    // The stadium and the day's weather (GDD §33): the home club's field unless the caller names one. Weather comes from a
    // hash, never from the game's dice, so adding venues changed no game's outcome by itself.
    venue: venue || venueFor(home?.name, seed),
    home: teamInfo(home), away: teamInfo(away),
    score: { home: 0, away: 0 },
    quarter: 1, quarterLength, clock: quarterLength,
    possession: firstReceiver, secondHalfReceiver: secondReceiver,
    coin: { winner, choice: pick },
    // otPeriods: how many overtime periods football plays before a tie is handed back to the caller (null = until untied, the
    // classic rule). Franchise Mode plays one, then settles the game outside the football engine (the caller sets `winner`).
    otPeriods,
    ballOn: FIELD.touchbackKickoff, ballLat: 0, down: 1, toGo: 10,
    phase: 'kickoff', kickingTeam: firstReceiver === 'home' ? 'away' : 'home',
    timeouts: { home: 3, away: 3 },
    clockRunning: false, finished: false, winner: null,
    ot: null, drive: { team: firstReceiver, plays: 0, yards: 0, start: null },
    log: [], playCount: 0,
    stats: { home: blankStats(), away: blankStats() },
    lastPlay: null,
    comeback, // { margin, edge } or null: in the fourth quarter the side trailing by `margin`+ gets `edge` on every core rating (GDD §17)
  };
  // Captain Partnerships (GDD §27.4B): each side's active pairs and their chemistry level, fixed here at kickoff for the whole
  // game. A game whose teams carry none gets no field at all, so its state is exactly what it always was.
  const partners = kickoffPartners(home, away); if (partners) { state.partners = partners; state.partnerCredits = { home: {}, away: {} }; }
  log(state, `${state[winner].name} wins the toss and elects to ${pick === 'defer' ? 'defer' : pick}.`, 'info');
  return state;
}

function teamInfo(t) { return { id: t.id, name: t.name, abbr: t.abbr || t.name.slice(0, 3).toUpperCase(), color: t.color || '#4f8', homeField: !!t.homeField }; }
export function blankStats() { return { plays: 0, yards: 0, passYards: 0, rushYards: 0, passAtt: 0, passComp: 0, sacks: 0, turnovers: 0, firstDowns: 0, td: 0, fg: 0, punts: 0, timeOfPossession: 0, players: {} }; }

export function log(state, text, kind = 'play', extra = {}) {
  state.log.push({ q: state.quarter, clock: state.clock, team: state.possession, text, kind, ...extra });
  if (state.log.length > 600) state.log.shift();
}
const rng = (state) => { const r = rngFromState(state.rngState); return { r, save: () => { state.rngState = r.state; } }; };
export const opponent = (side) => (side === 'home' ? 'away' : 'home');
export const clockText = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
export const quarterText = (state) => (state.quarter <= 4 ? `Q${state.quarter}` : `OT${state.quarter - 4}`);
export function situationText(state) {
  if (state.phase === 'kickoff') return 'Kickoff';
  if (state.phase === 'try') return 'Conversion attempt';
  if (state.phase === 'free_kick') return 'Free kick after safety';
  if (state.finished) return 'Final';
  const downs = ['1st', '2nd', '3rd', '4th'];
  const goal = state.ballOn + state.toGo >= 100;
  return `${downs[state.down - 1]} & ${goal ? 'Goal' : state.toGo} · ${yardLabel(state.ballOn)}`;
}
export const inTwoMinute = (state) => (state.quarter === 2 || state.quarter >= 4) && state.clock <= 120;

/** Which actual team object is on offense/defense. */
export const offenseTeam = (state, teams) => teams[state.possession];
export const defenseTeam = (state, teams) => teams[opponent(state.possession)];

// --------------------------------------------------------------------------- clock
function runClock(state, seconds) {
  if (state.clock <= 0) return;
  const used = Math.min(state.clock, Math.max(0, seconds));
  state.clock = +(state.clock - used).toFixed(1);
  state.stats[state.possession].timeOfPossession += used;
}

/** Called before a snap: burns runoff time if the clock is running. Returns false if the quarter must end first. */
export function preSnapRunoff(state, tempo = 'normal') {
  if (state.finished || state.phase !== 'scrimmage' || state.ot) return true;
  if (state.clockRunning && state.clock > 0) runClock(state, RUNOFF[tempo] ?? RUNOFF.normal);
  if (state.clock <= 0) { endOfPeriod(state); return false; }
  return true;
}

export function timeout(state, side) {
  if (state.timeouts[side] <= 0 || state.finished) return false;
  state.timeouts[side] -= 1; state.clockRunning = false;
  log(state, `Timeout, ${state[side].name} (${state.timeouts[side]} left).`, 'info');
  return true;
}

// --------------------------------------------------------------------------- scrimmage
/** Build the engine inputs for the current situation and chosen plays, then apply the result. */
/** Which side comeback mode lifts right now: trailing by the margin in the fourth quarter (not overtime), else null. */
export function comebackSide(state) {
  const cb = state.comeback; if (!cb || state.ot || state.quarter < 4 || state.finished) return null;
  const d = state.score.home - state.score.away;
  if (d >= cb.margin) return 'away'; if (-d >= cb.margin) return 'home'; return null;
}
/** Per-side rating edges for this snap: comeback mode plus each team's scheme lock. */
export function edgesFor(state, teams) {
  const off = state.possession, def = opponent(off); const cb = comebackSide(state);
  const edge = { off: 0, def: 0, why: { off: [], def: [] } };
  if (cb === off) { edge.off += state.comeback.edge; edge.why.off.push('comeback'); }
  if (cb === def) { edge.def += state.comeback.edge; edge.why.def.push('comeback'); }
  const lockO = teams[off]?.schemeLock?.offense || 0, lockD = teams[def]?.schemeLock?.defense || 0;
  if (lockO) { edge.off += lockO; edge.why.off.push('scheme'); }
  if (lockD) { edge.def += lockD; edge.why.def.push('scheme'); }
  return edge;
}
/**
 * Ability memory for the engine (GDD §23.11): which once-per-drive / half / game abilities are
 * spent, keyed by monster. A drive is named by its team and the play it started on.
 */
export function abilityMemory(state, { drive = null } = {}) {
  const half = state.ot ? 'ot' : state.quarter <= 2 ? 'h1' : 'h2';
  return { drive: drive ?? `${state.drive?.team}@${(state.playCount || 0) - (state.drive?.plays || 0)}`, half, quarter: state.quarter, used: state.abilityMemory || {} };
}
export function rememberAbilities(state, sim) { if (sim?.memoryUsed?.length) { state.abilityMemory ||= {}; for (const k of sim.memoryUsed) state.abilityMemory[k] = true; } }
/** Task 8 (B18): the monsters a counted Stunned keeps out of this whole play (they line up but cannot act); null when none. */
function sitsOutOf(state, slots) { if (!state.t8) return null; const ids = [...Object.values(slots.offense), ...Object.values(slots.defense)].map((x) => x?.id).filter((id) => id && T8S.sitsOutPlay(state, id)); return ids.length ? new Set(ids) : null; }
/** A field's absolute placement (home-goal frame; lat in the home frame) from the upcoming formation reference (spec §11). */
const absYard = (state, y) => (state.possession === 'home' ? y : 100 - y);
const absLat = (state, l) => (state.possession === 'home' ? l : -l);
function fieldPlacement(state, p) {
  const ref = state.ballOn + (p.lbDepth ?? 5); // the fixed LB reference, offense frame
  const a = absYard(state, ref - p.length / 2), b = absYard(state, ref + p.length / 2); // the rectangle centred on the reference (placement choice, documented in M3_PLAN)
  return { centerLat: absLat(state, state.ballLat || 0), yardFrom: a, yardTo: b, width: p.width };
}
/** After a play with fields: the Light recharge for non-Light participants finishing inside a Light field (once per monster per play;
 *  never from his own field), then each field's clock (G1/G2). */
function afterPlayFields(state, t8, slots, sim, offIds) {
  const last = sim.frames?.[sim.frames.length - 1]; const inputs = { ...Object.fromEntries(Object.entries(slots.offense).map(([k, v]) => [`off:${k}`, v])), ...Object.fromEntries(Object.entries(slots.defense).map(([k, v]) => [`def:${k}`, v])) };
  if (last) for (const [team, rows] of [['off', last.off], ['def', last.def]]) for (const row of rows || []) {
    const x = inputs[`${team}:${row[0]}`]; if (!x?.id || x.type === 'Light') continue;
    const yard = absYard(state, sim.ballOn + row[1]), lat = absLat(state, (sim.ballLat || 0) + row[2]);
    const lights = T8F.fieldsAt(t8, yard, lat).filter((f) => f.type === 'Light' && f.owner !== x.id); if (lights.length) extraCooldownUnit(t8, x.id);
  }
  T8F.afterPlay(t8, (f) => (f.clock === 'creatorOffense' ? offIds.has(f.owner) : f.clock === 'scrimmageAny'));
}
export function runScrimmagePlay(state, teams, offensePlayId, defensePlayId, options = {}) {
  if (state.phase !== 'scrimmage' || state.finished) throw new Error(`Cannot snap in phase ${state.phase}`);
  const { r, save } = rng(state);
  const offense = teams[state.possession], defense = teams[opponent(state.possession)];
  const edge = edgesFor(state, teams); if (edge.off || edge.def) options = { ...options, edge: { off: edge.off, def: edge.def } };
  state.lastEdge = edge.off || edge.def ? edge : null;
  const offensePlay = getPlay(offensePlayId), defensePlay = getPlay(defensePlayId);
  const call = { side: state.possession, off: offensePlayId, def: defensePlayId };
  (state.calls ||= []).push(call);
  const slots = { offense: pickSlots(offense.offense, offensePlay.onField, offense, offensePlay), defense: pickSlots(defense.defense, defensePlay.onField, defense, defensePlay) };
  const P = state.partners; const pre = P ? { down: state.down, toGo: state.toGo, quarter: state.quarter, score: { ...state.score } } : null;
  const t8 = (state.t8 ||= { status: {} }); const offIds = new Set(Object.values(slots.offense).map((x) => x?.id).filter(Boolean));
  const createdFields = t8.fields?.pending?.length ? T8F.createPending(t8, { onField: offIds, playIndex: state.playCount || 0, place: (p) => fieldPlacement(state, p) }) : []; // G3: at the creator's next eligible offensive snap
  const sim = simulatePlay({
    offensePlay, defensePlay,
    // The partnership bonus (GDD §27.4B): the same slot objects unless both captains of a side's active pair are on the field.
    offense: P ? boostSlots(slots.offense, P[state.possession]?.offense) : slots.offense, defense: P ? boostSlots(slots.defense, P[opponent(state.possession)]?.defense) : slots.defense,
    ballOn: state.ballOn, ballLat: state.ballLat, seed: r.seed(), options: { ...options, memory: abilityMemory(state), envType: state.venue?.type || null, sitsOut: sitsOutOf(state, slots), exhausted: T8K.exhaustedSet(state), t8, createdFields, offenseSide: state.possession, toGo: state.toGo },
  });
  T8K.afterPlay(state, [...Object.values(slots.offense), ...Object.values(slots.defense)]); // Task 8 stamina (spec §12): drained under the statuses active during this play (Afflicted, B10)
  T8S.afterPlay(state, [...Object.values(slots.offense), ...Object.values(slots.defense)].map((x) => x?.id).filter(Boolean)); // Task 8 shared status clocks (spec §10), after the drain
  if (t8.fields?.list?.length) afterPlayFields(state, t8, slots, sim, offIds); // Task 8 fields: Light recharge, then the clocks
  if (P) creditPartnerships(state, slots, sim, pre); // read only: tallies chemistry credits in the game state, committed after the final whistle
  rememberAbilities(state, sim);
  call.yards = sim.yards; call.result = sim.result; call.turnover = !!sim.turnover;
  save();
  const outcome = applyScrimmageResult(state, sim, offensePlayId, defensePlayId);
  return { sim, outcome };
}
/** The kickoff snapshot of each side's active partnerships ({ offense, defense } of { type, a, b, level, cap }), or null. */
function kickoffPartners(home, away) {
  const snap = (t) => { const p = t?.partnership; if (!p || (!p.offense && !p.defense)) return null; return JSON.parse(JSON.stringify({ offense: p.offense || null, defense: p.defense || null })); };
  const h = snap(home), a = snap(away); return h || a ? { home: h, away: a } : null;
}
/**
 * One snap's chemistry credits for both sides' active pairs (GDD §27.4B). One credit per pair per play; none in the fourth
 * quarter for a side leading by more than 21 before the snap (garbage time); none past the pair's per-game cap. The tally lives in
 * `state.partnerCredits`, so a reloaded game in progress keeps it and a replay (an animation) never adds to it.
 */
export function creditPartnerships(state, slots, sim, pre) {
  const off = state.possession, def = opponent(off);
  for (const [s, side] of [[off, 'offense'], [def, 'defense']]) {
    const pair = state.partners[s]?.[side]; if (!pair) continue;
    const own = side === 'offense' ? slots.offense : slots.defense;
    if (!slotOf(own, pair.a) || !slotOf(own, pair.b)) continue; // not on the field together this snap
    const t = ((state.partnerCredits ||= { home: {}, away: {} })[s][side] ||= { n: 0, capped: 0, garbage: 0, kinds: {}, together: 0 });
    t.together = (t.together || 0) + 1;
    const kind = qualifyingEvent(side, pair, slots, sim, pre); if (!kind) continue;
    if (pre.quarter === 4 && pre.score[s] - pre.score[opponent(s)] > 21) { t.garbage += 1; continue; }
    if (pair.cap && t.n >= pair.cap) { t.capped += 1; continue; }
    t.n += 1; t.kinds[kind] = (t.kinds[kind] || 0) + 1;
  }
}
/**
 * The seven on the field for this play. A slot with no monster (a package slot
 * the roster cannot staff, an injury with no backup) borrows one: a healthy
 * bench monster first, then a lineup monster who sits out in this package.
 * Nobody is ever on the field twice; nobody plays as an empty shell.
 */
export function pickSlots(lineup, slots, team = null, play = null) {
  const out = {}; const onField = new Set();
  for (const s of slots) { const p = lineup[s]; if (p?.id && !onField.has(p.id)) { out[s] = p; onField.add(p.id); } }
  for (const s of slots) {
    if (out[s]) continue;
    const need = positionOf(s);
    const bench = (team?.bench || []).filter((p) => p?.id && !onField.has(p.id));
    const resting = Object.entries(lineup).filter(([k]) => !slots.includes(k)).map(([, p]) => p).filter((p) => p?.id && !onField.has(p.id));
    const pick = bench.find((p) => p.position === need) || bench.find((p) => canPlay(p.position, s)) || resting.find((p) => canPlay(p.position, s)) || null; // primary or secondary position only (GDD §17.2)
    if (pick) { out[s] = { ...pick, borrowed: true }; onField.add(pick.id); } else out[s] = { attrs: {}, name: s, id: null };
  }
  // Legendary Plays (GDD §36.2): the Legendary the play is built around takes its slot for this snap, swapping with
  // whoever had it (or coming off the bench). Without him the play runs with whoever is there (the plan never allows that).
  const L = play?.legendary;
  if (L && out[L.slot]?.species !== L.species) {
    const on = Object.entries(out).find(([, p]) => p?.species === L.species);
    if (on) { const prev = out[L.slot]; out[L.slot] = on[1]; out[on[0]] = prev; }
    else { const pool = [...Object.values(lineup || {}), ...(team?.bench || [])]; const c = pool.find((p) => p?.species === L.species && p.id); if (c) out[L.slot] = c; }
  }
  return out;
}

/** Apply an engine result to the game state. Pure state update; `sim` comes from the engine. */
export function applyScrimmageResult(state, sim, offensePlayId = null, defensePlayId = null) {
  const off = state.possession, def = opponent(off);
  const S = state.stats[off];
  const lines = [];
  const wasGoalToGo = state.ballOn + state.toGo >= 100;
  const toGoBefore = state.toGo;
  state.playCount += 1; S.plays += 1; state.drive.plays += 1;
  runClock(state, sim.elapsed);
  const name = (team, slot) => state[team === 'off' ? off : def].name;
  let stops = false;
  let scored = null;
  const gain = sim.yards;
  const isPass = !!sim.stats.passer;
  if (isPass && sim.result !== 'sack') S.passAtt += 1;
  const lastEvent = sim.events[sim.events.length - 1]?.text || sim.result;

  switch (sim.result) {
    case 'incomplete': case 'throwaway':
      lines.push(sim.result === 'throwaway' ? 'Throwaway.' : `Incomplete${sim.stats.target ? ' to ' + playerName(sim, 'off', sim.stats.target) : ''}.`);
      stops = true; nextDown(state, 0, lines); break;
    case 'sack':
      S.sacks += 1; state.stats[def].sacks += 0;
      lines.push(`Sacked by ${playerName(sim, 'def', sim.stats.tackler)} for ${gain} yards.`);
      if (sim.endYard <= 0) { scored = safety(state, lines); break; }
      nextDown(state, gain, lines); break;
    case 'tackle': case 'out_of_bounds': {
      const who = sim.stats.receiver ? `${playerName(sim, 'off', sim.stats.receiver)} catches it for ${gain}` : `${playerName(sim, 'off', sim.stats.carrier)} runs for ${gain}`;
      lines.push(`${who}${sim.result === 'out_of_bounds' ? ', out of bounds' : sim.stats.tackler ? ', tackled by ' + playerName(sim, 'def', sim.stats.tackler) : ''}.`);
      if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else S.rushYards += gain;
      S.yards += gain; state.drive.yards += gain;
      if (sim.result === 'out_of_bounds' && inTwoMinute(state)) stops = true;
      nextDown(state, gain, lines); break;
    }
    case 'touchdown': {
      if (sim.stats.defensiveScore) {
        lines.push(`${playerName(sim, 'def', sim.stats.interceptor || sim.stats.carrier)} returns it for a TOUCHDOWN!`);
        S.turnovers += 1; stops = true;
        scored = touchdown(state, def, lines);
      } else {
        lines.push(`${playerName(sim, 'off', sim.stats.carrier)} ${sim.stats.receiver ? 'catches' : 'runs'} it in. TOUCHDOWN!`);
        if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else S.rushYards += gain;
        S.yards += gain; state.drive.yards += gain; stops = true;
        scored = touchdown(state, off, lines);
      }
      break;
    }
    case 'interception': case 'fumble': case 'touchback_return': {
      S.turnovers += 1; stops = true;
      if (sim.result === 'fumble' && (sim.stats.receiver || sim.stats.carrier)) { if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else S.rushYards += gain; S.yards += gain; } // yards to the spot of the fumble still count
      if (sim.result === 'interception' || sim.result === 'touchback_return') lines.push(`INTERCEPTED by ${playerName(sim, 'def', sim.stats.interceptor)}!`);
      else lines.push(`FUMBLE forced by ${playerName(sim, 'def', sim.stats.forcedBy)}, recovered by the defense!`);
      if (sim.result === 'touchback_return' || sim.endYard >= 100) { changePossession(state, FIELD.touchbackOther, lines, 'Touchback.'); }
      else changePossession(state, clamp(100 - sim.endYard, 1, 99), lines);
      break;
    }
    case 'safety': { lines.push(`${playerName(sim, 'off', sim.stats.carrier)} is tackled in the end zone.`); if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else if (sim.stats.carrier) S.rushYards += gain; S.yards += gain; scored = safety(state, lines); stops = true; break; }
    default: lines.push(lastEvent); nextDown(state, gain, lines);
  }
  if (!scored && state.phase === 'scrimmage' && !state.finished) state.clockRunning = !stops;
  if (scored) state.clockRunning = false;
  if (!scored && state.clock <= 0) endOfPeriod(state);
  const text = lines.join(' ');
  state.lastPlay = { text, result: sim.result, yards: gain, offensePlayId, defensePlayId, seed: sim.seed, ballOn: sim.ballOn, stats: sim.stats };
  log(state, text, 'play', { team: off, result: sim.result, yards: gain, important: !!scored || ['interception', 'fumble', 'touchback_return'].includes(sim.result), repro: `${offensePlayId || '?'}|${defensePlayId || '?'}|${sim.ballOn}|${sim.seed}` });
  recordPlayerStats(state, sim, off, def, { toGo: toGoBefore });
  if (state.ot) otCheckAfterPlay(state);
  return { text, scored, result: sim.result, yards: gain };
}

function playerName(sim, team, slot) { return slot ? (sim.names?.[team]?.[slot] || slot) : team === 'off' ? 'the offense' : 'the defense'; }

/**
 * Per-player stat lines for one scrimmage play (GDD §16). Keys are shared by the
 * box score, the league table, the monster card and the awards; the same code
 * runs for played and simulated games. Stats belong to the action, not the slot:
 * a back who throws gets passing stats, a quarterback who scrambles gets a carry.
 */
export function recordPlayerStats(state, sim, off, def, { toGo = 10 } = {}) {
  const bump = (team, slot, key, n = 1) => { if (!slot || !n) return; const p = (state.stats[team].players[slot] ||= {}); p[key] = (p[key] || 0) + n; };
  const maxOf = (team, slot, key, v) => { if (!slot) return; const p = (state.stats[team].players[slot] ||= {}); if ((p[key] || 0) < v) p[key] = v; };
  const st = sim.stats || {}; const res = sim.result; const gain = sim.yards;
  const isTurnover = ['interception', 'fumble', 'touchback_return'].includes(res);
  const offTd = res === 'touchdown' && !st.defensiveScore;
  const firstDown = !isTurnover && res !== 'sack' && res !== 'incomplete' && res !== 'throwaway' && gain >= toGo && !offTd;
  // Snaps: everyone on the field.
  for (const slot of Object.keys(sim.names?.off || {})) bump(off, slot, 'snapsOff');
  for (const slot of Object.keys(sim.names?.def || {})) bump(def, slot, 'snapsDef');
  // Passing. A sack lands on the quarterback whether or not he had started a throw.
  const passer = st.passer || (res === 'sack' ? (sim.names?.off?.QB ? 'QB' : null) : null);
  if (passer) {
    if (res === 'sack') { bump(off, passer, 'sacked'); bump(off, passer, 'sackYds', -gain); if (st.pressure) bump(off, passer, 'pressured'); }
    else {
      bump(off, st.passer, 'att');
      if (st.target) { bump(off, st.target, 'targets'); }
      if (st.receiver) {
        bump(off, st.passer, 'comp'); bump(off, st.passer, 'passYds', gain); maxOf(off, st.passer, 'longPass', gain);
        bump(off, st.receiver, 'rec'); bump(off, st.receiver, 'recYds', gain); bump(off, st.receiver, 'yac', st.yac || 0); maxOf(off, st.receiver, 'longRec', gain);
        if (firstDown || offTd) { bump(off, st.passer, 'passFd'); bump(off, st.receiver, 'recFd'); }
        if (offTd) { bump(off, st.passer, 'passTd'); bump(off, st.receiver, 'recTd'); bump(off, st.receiver, 'td'); }
      }
      if (st.dropped && st.target) bump(off, st.target, 'drops');
      if (st.interceptor) bump(off, st.passer, 'intThrown');
      if (st.pressure) bump(off, st.passer, 'pressured');
    }
  }
  // Rushing: any carry that was not a catch, handoffs, options, keeps and scrambles (a sack is not a carry, a pass attempt is not a run).
  if (st.carrier && !st.receiver && !st.passer && res !== 'sack' && sim.names?.off?.[st.carrier] && !st.defensiveScore) {
    bump(off, st.carrier, 'rush'); bump(off, st.carrier, 'rushYds', gain); maxOf(off, st.carrier, 'longRush', gain);
    if (firstDown) bump(off, st.carrier, 'rushFd');
    if (offTd) { bump(off, st.carrier, 'rushTd'); bump(off, st.carrier, 'td'); }
  }
  // Fumbles: charged to the monster who lost the ball; "lost" only when the defense recovered.
  if (st.fumbledBy && sim.names?.off?.[st.fumbledBy]) { bump(off, st.fumbledBy, 'fum'); if (st.recoveredTeam === 'def') bump(off, st.fumbledBy, 'fumLost'); }
  // Blocking: a snap per blocker, split pass/run; blocks lost; sacks and pressures allowed only when a blocker was beaten for them.
  for (const [slot, b] of Object.entries(st.blockers || {})) { if (b.pass) bump(off, slot, 'pbSnaps'); if (b.run) bump(off, slot, 'rbSnaps'); if (b.lost) bump(off, slot, 'blocksLost', b.lost); if (b.pancakes) bump(off, slot, 'pancakes', b.pancakes); if (b.pancakeAttempts) bump(off, slot, 'pancakeAttempts', b.pancakeAttempts); } // Task 8 M2: pancakes (B1)
  if (st.sackAllowedBy) bump(off, st.sackAllowedBy, 'sacksAllowed');
  if (st.pressureAllowedBy) bump(off, st.pressureAllowedBy, 'pressuresAllowed');
  // Defense.
  if (st.tackler) {
    if (res === 'sack') { bump(def, st.tackler, 'sacks'); bump(def, st.tackler, 'sackYds', -gain); bump(def, st.tackler, 'tfl'); }
    else if (!st.defensiveScore) {
      bump(def, st.tackler, 'tackles');
      if (gain < 0 && ['tackle', 'out_of_bounds', 'fumble', 'safety'].includes(res)) bump(def, st.tackler, 'tfl');
      if (st.assistBy && st.assistBy !== st.tackler) bump(def, st.assistBy, 'assists');
    }
  }
  if (st.pressureBy) bump(def, st.pressureBy, 'pressures');
  if (st.interceptor) { bump(def, st.interceptor, 'int'); bump(def, st.interceptor, 'pd'); if (st.defensiveScore) bump(def, st.interceptor, 'defTd'); }
  if (st.pbuBy) bump(def, st.pbuBy, 'pd');
  if (st.forcedBy) bump(def, st.forcedBy, 'ff');
  if (st.recoveredSlot && st.recoveredTeam === 'def') { bump(def, st.recoveredSlot, 'fr'); if (st.defensiveScore && !st.interceptor) bump(def, st.recoveredBy, 'defTd'); }
  // Coverage: only the responsible defender (man assignment, or the zone defender who had him), never the nearest body.
  if (st.coverBy && st.passer && res !== 'sack' && res !== 'throwaway') {
    bump(def, st.coverBy, 'covTargets');
    if (st.receiver) { bump(def, st.coverBy, 'recAllowed'); bump(def, st.coverBy, 'ydsAllowed', gain); if (offTd) bump(def, st.coverBy, 'tdAllowed'); }
  }
  // Monster-football extras from the engine's event stream.
  const keyOf = { juke: 'jukes', broken: 'broken', shed: 'sheds', ability: 'abilities' };
  for (const e of sim.events || []) { const k = keyOf[e.kind]; if (!k || !e.by) continue; bump(e.side === 'def' ? def : off, e.by, k); }
  // Ability effectiveness (Signature Monster of the Year, GDD §18.5): what happened on the plays where an ability fired, once per monster per play.
  { const fired = new Set(); for (const e of sim.events || []) { if (e.kind !== 'ability' || !e.by) continue; const key = `${e.side}|${e.by}`; if (fired.has(key)) continue; fired.add(key);
      const team = e.side === 'def' ? def : off; const impact = e.side === 'def' ? (4 - gain) + (isTurnover ? 20 : 0) + (st.defensiveScore ? 15 : 0) : (gain - 4) + (offTd ? 15 : 0) - (isTurnover ? 10 : 0);
      if (e.trait) { bump(team, e.by, 'traitPlays'); continue; } // passive traits fire constantly; the award is for abilities
      bump(team, e.by, 'abilityPlays'); bump(team, e.by, 'abilityImpact', Math.round(impact)); } }
}

function kickerStat(state, side, key, n = 1) { const p = (state.stats[side].players.K ||= {}); p[key] = (p[key] || 0) + n; }
function nextDown(state, gain, lines) {
  state.ballOn = clamp(state.ballOn + gain, 1, 99);
  state.ballLat = 0;
  if (gain >= state.toGo) { firstDown(state); lines.push('First down.'); state.stats[state.possession].firstDowns += 1; return; }
  state.toGo = Math.max(1, Math.round(state.toGo - gain));
  state.down += 1;
  if (state.down > 4) { lines.push('Turnover on downs!'); changePossession(state, 100 - state.ballOn, lines); }
}
function firstDown(state) { state.down = 1; state.toGo = Math.min(10, 100 - state.ballOn); }
function changePossession(state, newBallOn, lines, note = null) {
  const prev = state.possession;
  state.possession = opponent(prev);
  state.ballOn = clamp(Math.round(newBallOn), 1, 99); state.ballLat = 0;
  firstDown(state);
  state.clockRunning = false;
  state.drive = { team: state.possession, plays: 0, yards: 0, start: state.ballOn };
  if (note) lines.push(note);
  lines.push(`${state[state.possession].name} ball at the ${yardLabel(state.ballOn).toLowerCase()}.`);
}
function touchdown(state, side, lines) {
  state.score[side] += 6; state.stats[side].td += 1;
  state.phase = 'try'; state.tryTeam = side; state.ballOn = 100 - FIELD.twoPointSpot; state.down = 1; state.toGo = FIELD.twoPointSpot;
  state.possession = side;
  lines.push(`${state[side].name} ${state.score.home}-${state.score.away}.`);
  return { team: side, points: 6, kind: 'touchdown' };
}
function safety(state, lines) {
  const scoringSide = opponent(state.possession);
  state.score[scoringSide] += 2;
  lines.push(`SAFETY! ${state[scoringSide].name} ${state.score.home}-${state.score.away}.`);
  // The team that conceded free-kicks from its own 20; the scoring team receives.
  state.phase = 'free_kick'; state.kickingTeam = state.possession; state.clockRunning = false;
  return { team: scoringSide, points: 2, kind: 'safety' };
}

// --------------------------------------------------------------------------- tries
export function attemptTryKick(state, teams) {
  if (state.phase !== 'try') throw new Error('not a try');
  const { r, save } = rng(state);
  const res = ST.attemptExtraPoint(r, teams[state.tryTeam].kicker);
  save();
  if (res.good) state.score[state.tryTeam] += 1;
  kickerStat(state, state.tryTeam, 'xpa'); if (res.good) kickerStat(state, state.tryTeam, 'xpm');
  creditFormulaUnits(state, teams, state.tryTeam, 'xp'); // B5
  finishTry(state, res.text);
  return res;
}
export function attemptTwoPoint(state, teams, offensePlayId, defensePlayId) {
  if (state.phase !== 'try') throw new Error('not a try');
  const { r, save } = rng(state);
  const offense = teams[state.tryTeam], defense = teams[opponent(state.tryTeam)];
  const offensePlay = getPlay(offensePlayId), defensePlay = getPlay(defensePlayId);
  const sim = simulatePlay({ offensePlay, defensePlay, offense: pickSlots(offense.offense, offensePlay.onField, offense, offensePlay), defense: pickSlots(defense.defense, defensePlay.onField, defense, defensePlay), ballOn: 100 - FIELD.twoPointSpot, seed: r.seed(), options: { memory: abilityMemory(state, { drive: `try@${state.playCount || 0}` }), envType: state.venue?.type || null, twoPoint: true, t8: (state.t8 ||= { status: {} }) } });
  rememberAbilities(state, sim);
  save();
  const good = sim.touchdown && !sim.stats.defensiveScore;
  if (good) state.score[state.tryTeam] += 2;
  { const bumpTwo = (slot) => { if (!slot) return; const p = (state.stats[state.tryTeam].players[slot] ||= {}); p.twoPtAtt = (p.twoPtAtt || 0) + 1; if (good) p.twoPt = (p.twoPt || 0) + 1; }; bumpTwo(sim.stats.passer); if (sim.stats.carrier && sim.stats.carrier !== sim.stats.passer) bumpTwo(sim.stats.carrier); }
  const text = good ? 'Two-point conversion is GOOD!' : sim.stats.defensiveScore ? 'Conversion returned the other way, two points for the defense!' : 'Two-point conversion fails.';
  if (sim.stats.defensiveScore) state.score[opponent(state.tryTeam)] += 2;
  finishTry(state, text);
  return { sim, good, text };
}
function finishTry(state, text) {
  log(state, `${text} ${state.home.abbr} ${state.score.home}-${state.score.away} ${state.away.abbr}`, 'score', { important: true });
  state.lastPlay = { text, result: 'try' };
  if (state.ot) { otAfterPossession(state); return; }
  state.phase = 'kickoff'; state.kickingTeam = state.tryTeam; state.possession = opponent(state.tryTeam);
  if (state.clock <= 0) endOfPeriod(state);
}

// --------------------------------------------------------------------------- kicks
// Task 8 M2 live kickoffs (N7b P7; N7c B5, B20). Units: the kicking unit is the K plus up to six coverage players, the return unit
// the returner plus up to six blockers, both filled from the club's depth chart (its lineups): package-slot players (not base
// starters) first, then base starters, in the order below. Only charted monsters are used, so every participant has a stat slot.
export const KICKOFF_UNIT = 7;
export const COVERAGE_ORDER = Object.freeze(['SS', 'DL3', 'LB1', 'LB2', 'FS', 'CB2', 'CB1', 'DL1', 'DL2']);
export const RETURN_BLOCK_ORDER = Object.freeze(['WR3', 'C', 'TE', 'RB', 'WR1', 'WR2', 'LG', 'RG', 'QB']);
/**
 * Seconds the kickoff is in the air. The approved kicking formula has no hang time; this is the kickoff flight the game already
 * draws (kick-anim.js), reused unchanged rather than a new tuned value (unspecified: flagged for the owner's balance check).
 */
export const KICKOFF_HANG = 2.6;
const KICK_SPOT = FIELD.length - FIELD.kickoffSpot; // the kick spot in the receiving team's yards (its 65)
const filled = (p) => !!p && (!!p.id || Object.keys(p.attrs || {}).length > 0);
/**
 * The two kickoff units, as engine slot maps keyed by each monster's lineup slot (stats are credited to that slot).
 * coverage: { K, ...6 from the kicking club's defense lineup }; ret: { [returnerSlot], ...6 from the receiving club's offense lineup }.
 */
export function kickoffUnits(kickTeam, recvTeam) {
  const fill = (out, order, lineup, used) => { for (const s of order) { if (Object.keys(out).length >= KICKOFF_UNIT) break; const p = lineup?.[s]; if (!filled(p) || out[s] || (p.id && used.has(p.id))) continue; out[s] = p; if (p.id) used.add(p.id); } };
  const kicker = kickTeam.kicker || { attrs: {}, name: 'K', id: null };
  const coverage = { K: kicker }; fill(coverage, COVERAGE_ORDER, kickTeam.defense, new Set(kicker.id ? [kicker.id] : []));
  // The returner: the club's own (lineupFromChart's pick), credited at his lineup slot; one with no id (test teams) gets slot KR.
  const lineups = { ...(recvTeam.offense || {}), ...(recvTeam.defense || {}) };
  let returner = recvTeam.returner || null;
  let returnerSlot = returner?.id ? Object.keys(lineups).find((s) => lineups[s]?.id === returner.id) || null : null;
  if (!returner) { returnerSlot = ['WR2', 'RB', 'WR1', 'CB2'].find((s) => filled(lineups[s])) || null; returner = returnerSlot ? lineups[returnerSlot] : { attrs: {}, name: 'KR', id: null }; }
  returnerSlot ||= 'KR';
  const ret = { [returnerSlot]: returner }; fill(ret, RETURN_BLOCK_ORDER, recvTeam.offense, new Set(returner.id ? [returner.id] : []));
  return { coverage, ret, returnerSlot };
}
/** The live kickoff's two "plays": alignments and jobs for the engine (x from the kick spot, the return unit attacking +x). */
const COVER_LANES = [-20, 20, -12, 12, -4.5, 4.5];
const BLOCK_SPOTS = [[-15, -16, 14, -10], [-15, 16, 14, 10], [-15, -6, 12, -4], [-15, 6, 12, 4], [-40, -8, 7, -3], [-40, 8, 7, 3]]; // [x, y, setup dx, setup dy] (setup: from the landing spot)
function kickoffPlays(units) {
  const cov = { id: 'kickoff_coverage', side: 'defense', type: 'kickoff', tags: [], onField: [], align: {}, assignments: {} };
  let i = 0;
  for (const s of Object.keys(units.coverage)) {
    cov.onField.push(s);
    if (s === 'K') { cov.align[s] = [1, 0]; cov.assignments[s] = { a: 'cover', lane: 0, safety: true }; continue; }
    const lane = COVER_LANES[i++ % COVER_LANES.length]; cov.align[s] = [1, lane]; cov.assignments[s] = { a: 'cover', lane: lane * 0.55 };
  }
  const ret = { id: 'kickoff_return', side: 'offense', type: 'run', tags: [], onField: [], align: {}, assignments: {} };
  let j = 0;
  for (const s of Object.keys(units.ret)) {
    ret.onField.push(s);
    if (s === units.returnerSlot) { ret.align[s] = [-(KICK_SPOT - 5), 0]; ret.assignments[s] = { a: 'kick_return' }; continue; }
    const [x, y, dx, dy] = BLOCK_SPOTS[j++ % BLOCK_SPOTS.length]; ret.align[s] = [x, y]; ret.assignments[s] = { a: 'ko_block', setup: [dx, dy] };
  }
  return { cov, ret };
}

export function doKickoff(state, teams, { onside = false } = {}) {
  if (state.phase !== 'kickoff' && state.phase !== 'free_kick') throw new Error('not a kickoff');
  const { r, save } = rng(state);
  const kicking = state.kickingTeam, receiving = opponent(kicking);
  let res; let sim = null; let units = null;
  if (state.phase === 'free_kick') {
    res = ST.punt(r, { ballOn: 20, kicker: teams[kicking].kicker, returner: teams[receiving].returner, rushPressure: 0 });
    res.text = 'Free kick: ' + res.text;
  } else if (onside) res = ST.kickoff(r, { kicker: teams[kicking].kicker, returner: teams[receiving].returner, onside });
  else {
    // Live kickoff (N7b P7): the flight and the touchback come from the approved kicking formula; the return is played in the engine.
    units = kickoffUnits(teams[kicking], teams[receiving]);
    const flight = ST.kickoffFlight(r, { kicker: teams[kicking].kicker });
    if (flight.touchback) res = { touchback: true, ballOn: FIELD.touchbackKickoff, returnYards: 0, live: true, text: 'Kickoff sails into the end zone. Touchback.' };
    else {
      const seed = r.seed(); const catchAt = Math.max(-9, flight.landingFromGoal);
      const plays = kickoffPlays(units); const slots = { offense: units.ret, defense: units.coverage };
      sim = simulatePlay({ offensePlay: plays.ret, defensePlay: plays.cov, offense: units.ret, defense: units.coverage, ballOn: KICK_SPOT, ballLat: 0, seed,
        options: { kickoff: { returner: units.returnerSlot, landing: [catchAt - KICK_SPOT, 0], hang: KICKOFF_HANG }, memory: abilityMemory(state, { drive: `ko@${state.playCount || 0}` }), envType: state.venue?.type || null, sitsOut: sitsOutOf(state, slots), exhausted: T8K.exhaustedSet(state), t8: (state.t8 ||= { status: {} }) } });
      rememberAbilities(state, sim);
      res = kickoffOutcome(sim, catchAt, state[receiving].name, sim.names.off[units.returnerSlot] || 'The returner');
    }
  }
  save();
  const lines = [res.text];
  state.phase = 'scrimmage'; state.clockRunning = false; state.ballLat = 0;
  if (res.onside && res.recovered) { state.possession = kicking; state.ballOn = res.ballOn; firstDown(state); }
  else if (res.kickingTouchdown) { state.possession = kicking; touchdown(state, kicking, lines); }
  else if (res.recoveredByKicking) { state.possession = kicking; state.ballOn = clamp(Math.round(res.kickingBallOn), 1, 99); firstDown(state); }
  else if (res.touchdown) { state.possession = receiving; touchdown(state, receiving, lines); }
  else { state.possession = receiving; state.ballOn = res.ballOn; firstDown(state); }
  state.drive = { team: state.possession, plays: 0, yards: 0, start: state.ballOn };
  runClock(state, 5);
  if (state.phase === 'scrimmage') lines.push(`${state[state.possession].name} ball at the ${yardLabel(state.ballOn).toLowerCase()}.`);
  const text = lines.join(' ');
  state.lastPlay = { text, result: 'kickoff', ...(sim ? { seed: sim.seed, stats: sim.stats, kickResult: sim.result } : {}) };
  log(state, text, 'kick', { team: kicking, important: !!res.touchdown || !!res.kickingTouchdown || !!res.recoveredByKicking, ...(sim ? { result: sim.result, repro: `kickoff|${sim.ballOn}|${sim.seed}` } : {}) });
  // Participation and kick credit (B5, B20): special-teams snaps for both units, a kickoff for the kicker, the return's events.
  if (units) {
    recordKickoffStats(state, kicking, receiving, units, sim, res);
    T8K.afterPlay(state, [...Object.values(units.coverage), ...Object.values(units.ret)]); // Task 8 stamina (before the status clocks)
    T8S.afterPlay(state, [...Object.values(units.coverage), ...Object.values(units.ret)].map((x) => x?.id).filter(Boolean)); // Task 8 shared status clocks (spec §10)
  } else kickerStat(state, kicking, 'kickoffs'); // onside and free kicks stay formula plays: the kick itself is credited
  if (state.clock <= 0 && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text, sim };
}
/** What a live kickoff's engine result means for the game (receiving team's yards unless noted). */
function kickoffOutcome(sim, catchAt, team, who) {
  const end = sim.endYard; const ret = Math.round(end - catchAt);
  if (sim.result === 'touchdown') return { touchdown: true, live: true, ballOn: 100, returnYards: Math.round(100 - catchAt), text: `${who} takes the kickoff back for a TOUCHDOWN!` };
  if (sim.result === 'fumble') { // the kicking team recovered: its ball at the spot, or its touchdown in the receiving end zone
    if (end <= 0) return { kickingTouchdown: true, live: true, returnYards: ret, ballOn: 100, text: `${who} fumbles the kickoff in the end zone and the kicking team recovers. TOUCHDOWN!` };
    return { recoveredByKicking: true, live: true, returnYards: ret, kickingBallOn: 100 - end, ballOn: end, text: `${who} fumbles the return and the kicking team recovers!` };
  }
  if (sim.result === 'touchback' || end <= 0) return { touchback: true, live: true, returned: true, ballOn: FIELD.touchbackKickoff, returnYards: 0, text: `${who} fields the kickoff in the end zone and is downed there. Touchback.` };
  const ballOn = clamp(Math.round(end), 1, 99);
  return { touchback: false, live: true, ballOn, returnYards: ret, text: `${who} returns the kickoff ${ret} yards${sim.result === 'out_of_bounds' ? ', out of bounds' : sim.stats.tackler ? `, tackled by ${sim.names.def[sim.stats.tackler] || sim.stats.tackler}` : ''}.` };
}
/**
 * One live kickoff's stat lines. Everyone on either unit gets a special-teams snap (`stSnaps`: never snapsOff or snapsDef; a
 * kickoff is not a defensive snap, B20); the kicker a kickoff. The return's actual events: the returner's return (krAtt, krYds,
 * krLong, krTd; a kick catch is never a reception, B20), the coverage's tackles (stTackles, stAssists: kept apart from scrimmage
 * tackles), fumbles, and the engine's juke, broken-tackle, shed and pancake events.
 */
export function recordKickoffStats(state, kicking, receiving, units, sim, res) {
  const bump = (team, slot, key, n = 1) => { if (!slot || !n) return; const p = (state.stats[team].players[slot] ||= {}); p[key] = (p[key] || 0) + n; };
  for (const slot of Object.keys(units.coverage)) bump(kicking, slot, 'stSnaps');
  for (const slot of Object.keys(units.ret)) bump(receiving, slot, 'stSnaps');
  kickerStat(state, kicking, 'kickoffs');
  if (res.touchback && !res.returned) { kickerStat(state, kicking, 'koTouchbacks'); return; }
  if (!sim) return;
  const st = sim.stats || {}; const rs = units.returnerSlot;
  bump(receiving, rs, 'krAtt'); bump(receiving, rs, 'krYds', res.returnYards || 0);
  { const p = (state.stats[receiving].players[rs] ||= {}); if ((p.krLong ?? -Infinity) < (res.returnYards || 0)) p.krLong = res.returnYards || 0; }
  if (res.touchdown) { bump(receiving, rs, 'krTd'); bump(receiving, rs, 'td'); }
  if (st.tackler && !res.touchdown) { bump(kicking, st.tackler, 'stTackles'); if (st.assistBy && st.assistBy !== st.tackler) bump(kicking, st.assistBy, 'stAssists'); }
  if (st.fumbledBy) { bump(receiving, st.fumbledBy, 'fum'); if (st.recoveredTeam === 'def') bump(receiving, st.fumbledBy, 'fumLost'); }
  if (st.forcedBy) bump(kicking, st.forcedBy, 'ff');
  if (st.recoveredSlot && st.recoveredTeam === 'def') bump(kicking, st.recoveredSlot, 'fr');
  if (res.kickingTouchdown && st.recoveredSlot) bump(kicking, st.recoveredSlot, 'stTd');
  for (const [slot, b] of Object.entries(st.blockers || {})) { if (b.pancakes) bump(receiving, slot, 'pancakes', b.pancakes); if (b.pancakeAttempts) bump(receiving, slot, 'pancakeAttempts', b.pancakeAttempts); }
  const keyOf = { juke: 'jukes', broken: 'broken', shed: 'sheds', ability: 'abilities' };
  for (const e of sim.events || []) { const k = keyOf[e.kind]; if (!k || !e.by) continue; bump(e.side === 'def' ? kicking : receiving, e.by, k); }
}

/** B5: the formula plays' units (punt, field goal, extra point), from the depth lists. Kicking unit: the K plus 6; the other unit: 7. */
export const FG_PROTECT_ORDER = Object.freeze(['LG', 'C', 'RG', 'TE', 'RB', 'WR1', 'WR2', 'QB']);
export const FG_BLOCK_ORDER = Object.freeze(['DL1', 'DL2', 'DL3', 'LB1', 'LB2', 'CB1', 'CB2', 'SS', 'FS']);
export function formulaUnits(kickTeam, otherTeam, kind) {
  if (kind === 'punt') { const u = kickoffUnits(kickTeam, otherTeam); return { kicking: u.coverage, other: u.ret }; }
  const fill = (out, order, lineup, used) => { for (const s of order) { if (Object.keys(out).length >= KICKOFF_UNIT) break; const p = lineup?.[s]; if (!filled(p) || out[s] || (p.id && used.has(p.id))) continue; out[s] = p; if (p.id) used.add(p.id); } return out; };
  const kicker = kickTeam.kicker || { attrs: {}, name: 'K', id: null };
  return { kicking: fill({ K: kicker }, FG_PROTECT_ORDER, kickTeam.offense, new Set(kicker.id ? [kicker.id] : [])), other: fill({}, FG_BLOCK_ORDER, otherTeam.defense, new Set()) };
}
/**
 * B5: a formula-resolved play (punt, field goal, extra point) grants its units participation (a special-teams snap, the status
 * countdown, rewards through participation) without fabricated performance events.
 */
function creditFormulaUnits(state, teams, kicking, kind) {
  const other = opponent(kicking); const u = formulaUnits(teams[kicking], teams[other], kind);
  const bump = (team, slot) => { const p = (state.stats[team].players[slot] ||= {}); p.stSnaps = (p.stSnaps || 0) + 1; };
  for (const slot of Object.keys(u.kicking)) bump(kicking, slot); for (const slot of Object.keys(u.other)) bump(other, slot);
  T8K.afterPlay(state, [...Object.values(u.kicking), ...Object.values(u.other)]); // B5: participation drains stamina (before the status clocks)
  T8S.afterPlay(state, [...Object.values(u.kicking), ...Object.values(u.other)].map((x) => x?.id).filter(Boolean));
}
export function doPunt(state, teams) {
  if (state.phase !== 'scrimmage') throw new Error('not scrimmage');
  const { r, save } = rng(state);
  const kicking = state.possession, receiving = opponent(kicking);
  const res = ST.punt(r, { ballOn: state.ballOn, kicker: teams[kicking].kicker, returner: teams[receiving].returner });
  save();
  state.stats[kicking].punts += 1; kickerStat(state, kicking, 'punts'); creditFormulaUnits(state, teams, kicking, 'punt'); // B5: the K's punt and the units' participation
  const lines = [res.text];
  runClock(state, 6);
  if (res.blocked) { changePossession(state, res.ballOn, lines); }
  else if (res.touchdown) { state.possession = receiving; touchdown(state, receiving, lines); }
  else changePossession(state, res.ballOn, lines);
  const text = lines.join(' ');
  state.lastPlay = { text, result: 'punt' };
  log(state, text, 'kick', { team: kicking });
  if (state.ot) { otAfterPossession(state); return { res, text }; }
  if (state.clock <= 0 && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text };
}

export function doFieldGoal(state, teams) {
  if (state.phase !== 'scrimmage') throw new Error('not scrimmage');
  const { r, save } = rng(state);
  const kicking = state.possession;
  const res = ST.attemptFieldGoal(r, state.ballOn, teams[kicking].kicker);
  save();
  creditFormulaUnits(state, teams, kicking, 'fg'); // B5
  { const bin = res.distance < 30 ? 'fg0' : res.distance < 40 ? 'fg30' : res.distance < 50 ? 'fg40' : 'fg50';
    kickerStat(state, kicking, 'fga'); kickerStat(state, kicking, bin + 'a'); if (res.good) { kickerStat(state, kicking, 'fgm'); kickerStat(state, kicking, bin + 'm'); const p = state.stats[kicking].players.K; if ((p.fgLong || 0) < res.distance) p.fgLong = res.distance; } }
  runClock(state, 5);
  const lines = [res.text];
  let scored = null;
  if (res.good) {
    state.score[kicking] += 3; state.stats[kicking].fg += 1; scored = { team: kicking, points: 3, kind: 'field_goal' };
    lines.push(`${state.home.abbr} ${state.score.home}-${state.score.away} ${state.away.abbr}.`);
    if (state.ot) { state.lastPlay = { text: lines.join(' '), result: 'field_goal' }; log(state, lines.join(' '), 'score', { important: true }); otAfterPossession(state); return { res, text: lines.join(' '), scored }; }
    state.phase = 'kickoff'; state.kickingTeam = kicking; state.possession = opponent(kicking); state.clockRunning = false;
  } else {
    // Miss: opponent takes over at the spot of the kick (7 yards behind the line) or its 20.
    const spot = Math.max(FIELD.touchbackOther, 100 - (state.ballOn - 7));
    changePossession(state, spot, lines);
    if (state.ot) { state.lastPlay = { text: lines.join(' '), result: 'field_goal_miss' }; log(state, lines.join(' '), 'kick'); otAfterPossession(state); return { res, text: lines.join(' '), scored }; }
  }
  const text = lines.join(' ');
  state.lastPlay = { text, result: res.good ? 'field_goal' : 'field_goal_miss' };
  log(state, text, 'kick', { team: kicking, important: res.good });
  if (state.clock <= 0 && !state.finished && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text, scored };
}

export function kneel(state) {
  if (state.phase !== 'scrimmage') return;
  runClock(state, 3);
  state.ballOn = Math.max(1, state.ballOn - 1); state.down += 1; state.toGo += 1;
  state.clockRunning = true;
  const lines = ['Quarterback kneels.'];
  if (state.down > 4) changePossession(state, 100 - state.ballOn, lines);
  // Victory formation: the clock is running, the defense has no timeouts, and less than one slow snap is left, nothing can stop it, so it runs out now.
  else if (!state.ot && state.clock > 0 && state.clock <= RUNOFF.milk && state.timeouts[opponent(state.possession)] <= 0) { runClock(state, state.clock); lines.push(`The clock runs out: ${state.quarter >= 4 ? 'that is the game.' : 'end of the half.'}`); }
  log(state, lines.join(' '), 'play');
  state.lastPlay = { text: lines.join(' '), result: 'kneel' };
  if (state.clock <= 0) endOfPeriod(state);
}
export function spike(state) {
  if (state.phase !== 'scrimmage') return;
  runClock(state, 2);
  state.down += 1; state.clockRunning = false;
  const lines = ['Spike to stop the clock.'];
  if (state.down > 4) changePossession(state, 100 - state.ballOn, lines);
  log(state, lines.join(' '), 'play');
  state.lastPlay = { text: lines.join(' '), result: 'spike' };
}

// --------------------------------------------------------------------------- periods
export function endOfPeriod(state) {
  if (state.finished) return;
  if (state.ot) return; // OT is possession-based, not timed
  if (state.quarter === 4) {
    if (state.score.home !== state.score.away) { finish(state); return; }
    startOvertime(state); return;
  }
  state.quarter += 1; state.clock = state.quarterLength; state.clockRunning = false;
  if (state.quarter === 3) {
    T8K.halftime(state); // Task 8 §12: halftime restores 50% of each stamina capacity (exhaustion stays)
    if (state.t8) T8F.halftime(state.t8); // Task 8 §11: non-legendary fields clear at halftime (pending creations carry)
    state.timeouts = { home: 3, away: 3 };
    state.phase = 'kickoff'; state.possession = state.secondHalfReceiver; state.kickingTeam = opponent(state.secondHalfReceiver);
    log(state, `HALFTIME. ${state.home.abbr} ${state.score.home}-${state.score.away} ${state.away.abbr}. ${state[state.secondHalfReceiver].name} receive the second-half kickoff.`, 'period', { important: true });
  } else log(state, `End of the ${state.quarter === 2 ? 'first' : 'third'} quarter.`, 'period');
}
function finish(state) {
  state.finished = true; state.phase = 'final'; state.clockRunning = false; T8S.atGameEnd(state); // Task 8: every status clears at the end of the game
  state.winner = state.score.home > state.score.away ? 'home' : state.score.away > state.score.home ? 'away' : null;
  log(state, `FINAL: ${state.home.name} ${state.score.home}, ${state.away.name} ${state.score.away}.`, 'period', { important: true });
}
function startOvertime(state) {
  const { r, save } = rng(state);
  const first = r.chance(0.5) ? 'home' : 'away';
  save();
  state.ot = { period: 1, first, possessionsLeft: 2, scoreAtStart: { ...state.score } };
  state.quarter = 5; state.clock = 0; state.timeouts = { home: 1, away: 1 };
  log(state, `OVERTIME. Each team gets a possession from the opponent 25. ${state[first].name} go first.`, 'period', { important: true });
  otPossession(state, first);
}
function otPossession(state, side) {
  state.possession = side; state.phase = 'scrimmage'; state.ballOn = 75; state.ballLat = 0; firstDown(state); state.clockRunning = false;
  state.drive = { team: side, plays: 0, yards: 0, start: 75 };
  if (state.ot.period >= 3) { state.phase = 'try'; state.tryTeam = side; state.ballOn = 100 - FIELD.twoPointSpot; state.toGo = FIELD.twoPointSpot; }
}
export function otAfterPossession(state) {
  const ot = state.ot; ot.possessionsLeft -= 1;
  if (ot.possessionsLeft === 1) {
    const second = opponent(ot.first);
    // If the first team failed to score and the second scores anything, or the second team already leads, the game ends when decided.
    otPossession(state, second);
    return;
  }
  if (state.score.home !== state.score.away) { finish(state); return; }
  if (state.otPeriods && ot.period >= state.otPeriods) { finish(state); state.needsTiebreak = true; log(state, 'Still tied after overtime. The game goes to a tiebreaker.', 'period', { important: true }); return; }
  ot.period += 1; ot.possessionsLeft = 2; ot.first = opponent(ot.first);
  log(state, `Still tied, overtime period ${ot.period}.${ot.period >= 3 ? ' Two-point attempts only.' : ''}`, 'period');
  state.quarter = 4 + ot.period;
  otPossession(state, ot.first);
}
/** In OT a possession also ends on turnovers/downs; called by applyScrimmageResult via changePossession when ot is active. */
export function otCheckAfterPlay(state) {
  if (!state.ot || state.finished) return;
  if (state.phase === 'try') return; // handled in finishTry
  if (state.phase === 'free_kick') { if (state.score.home !== state.score.away) finish(state); else otAfterPossession(state); return; }
  // Possession ended if the ball changed hands (drive.team !== the expected team) or a score moved to 'kickoff'.
  const expected = state.ot.possessionsLeft === 2 ? state.ot.first : opponent(state.ot.first);
  if (state.possession !== expected || state.phase === 'kickoff') {
    // Defensive score in OT ends the game immediately.
    if (state.score.home !== state.score.away && state.ot.possessionsLeft === 1) { finish(state); return; }
    if (state.phase === 'kickoff') { state.phase = 'scrimmage'; }
    otAfterPossession(state);
  }
}

// --------------------------------------------------------------------------- helpers for UI/AI
export function fieldGoalInfo(state, teams) {
  const distance = fieldGoalDistance(state.ballOn);
  return { distance, chance: ST.fieldGoalChance(distance, teams[state.possession].kicker?.attrs?.kicking) };
}
export function summary(state) {
  return { score: { ...state.score }, quarter: quarterText(state), clock: clockText(state.clock), situation: situationText(state), possession: state.possession, finished: state.finished, winner: state.winner };
}
