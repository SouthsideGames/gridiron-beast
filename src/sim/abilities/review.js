// Task 8 M3: the runtime-backed football ability reviewer's engine side (M3_PLAN.md item 6). Pure: no DOM, no franchise, no save.
// For one ability at one form and mastery tier, a review places the family's monster in its Dex position on a generated club and
// plays a real game (the game runner, the engine, every hook and the game-scope ability state) until the contract records a valid
// execution. It returns the play that executed with its frames and events for the replay, and the ability state before and after.
//
// Staged inputs: a contract may export `review: { prime(form, mastery) -> state, situation?: {...} }`; a primed review starts the
// game with that game-scope state (e.g. a charged ignition) so the reviewer reaches the execution without waiting for its build-up.
// Without one, or with `primed: false`, the state is the contract's own initGame and the execution has to happen naturally.
// A primed review may also stage the game: `review.setup(api)` (api: { state, teams, subjectSide, addField }) arranges the clubs or
// the field before kickoff (e.g. a reserve playbook, an opposing field), and `review.choices(state)` supplies a call the AI would not
// make (e.g. a player-activated signature). Both only shape this review's own game.
//
// Two modes: `reviewScenario` (the direct, deterministic test: the scenario table in review-scenarios.js stages the contract's
// conditions on the real rules.js game and engine with fixed seeds and calls; see the section at the end) and `reviewAbility` (the
// optional natural-game demonstration below, which plays whole AI games until the subject records an execution).
//
// Nothing here writes progression: the clubs are generated for the review, the game state is local, mastery executions are only
// counted (M5 awards them in franchise games, never here).
import { FAMILIES, formsOf, abilityById } from '../../data/beast-dex.js';
import { contractOf, registeredFamilies } from './registry.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../../data/personnel.js';
import { generatedTeam } from '../../franchise/roster.js';
import * as R from '../rules.js';
import { step, aiController, newTendencies } from '../game-runner.js';
import { placeRect } from '../t8/fields.js';
import { SCENARIOS } from './review-scenarios.js';
import './index.js';

export const MASTERY_TIERS = Object.freeze([0, 1, 2, 3]);
const REVIEW_ID = 'review_subject';

/** Every Dex family with a football ability, with its forms, tiers and whether its contract is registered. */
export function reviewCatalog() {
  const reg = new Set(registeredFamilies());
  return FAMILIES.filter((f) => f.abilities?.football).map((f) => {
    const ab = abilityById(f.abilities.football) || {};
    return { family: f.id, abilityId: f.abilities.football, name: ab.name || f.abilities.football, element: f.type, rarity: f.rarity, position: f.position,
      forms: formsOf(f.id).map((x) => (typeof x === 'string' ? x : x.id)), tiers: MASTERY_TIERS, registered: reg.has(f.id) };
  });
}

/** The slot the family's monster takes on its club: its own position's first slot (K: the kicker). */
export function subjectSlot(position) {
  if (position === 'K') return { side: 'kicker', slot: 'K' };
  const off = OFFENSE_SLOTS.find((s) => positionOf(s) === position); if (off) return { side: 'offense', slot: off };
  const def = DEFENSE_SLOTS.find((s) => positionOf(s) === position); if (def) return { side: 'defense', slot: def };
  return null;
}

function clubs(seed) {
  const home = generatedTeam(seed * 2 + 1, { id: 'RVH', name: 'Review', abbr: 'RVW', quality: 62 });
  const away = generatedTeam(seed * 2 + 2, { id: 'RVA', name: 'Opponent', abbr: 'OPP', quality: 62 });
  return { home, away };
}
/** Put the subject into the home club's lineup at his slot (and the returner slot when he is the returner). */
function placeSubject(team, fam, form, mastery) {
  const at = subjectSlot(fam.position); if (!at) return null;
  const base = at.side === 'kicker' ? team.kicker : team[at.side][at.slot];
  const subject = { ...base, id: REVIEW_ID, species: fam.id, form, mastery, type: fam.type, position: fam.position, name: `${fam.name} (review)`, ability: null };
  if (at.side === 'kicker') team.kicker = subject; else team[at.side][at.slot] = subject;
  if (team.returner?.id && team.returner.id === base.id) team.returner = subject;
  return at;
}

/** slot -> { species, name, type } for the replay's sprites. `offSide` is the side whose offense the sim's offense is. */
function spritesFor(teams, offSide) {
  const other = offSide === 'home' ? 'away' : 'home'; const pick = (lu) => Object.fromEntries(Object.entries(lu || {}).map(([k, v]) => [k, { species: v.species, name: v.name, type: v.type }]));
  return { off: pick(teams[offSide].offense), def: pick(teams[other].defense) };
}
const executionsOf = (t8) => t8?.mastery?.[REVIEW_ID]?.executions || 0;
/** The subject's own cue events in a play (its ability id or family, from his slot on his side): the opposing club may field the same
 *  family, and charge / ready / target cues are not executions (M3_RARE_ACTIVATIONS.md: the review stops on executions only). */
const contractEvents = (sim, fam, abilityId, slot, side) => (sim?.events || []).filter((e) => (e.ability === abilityId || e.contract === fam.id) && (e.by == null || e.by === slot) && (e.side == null || e.side === side));

/**
 * Review one ability: `{ family, form, mastery, primed = true, seed = 1, games = 3, quarterLength }`. Plays up to `games` games
 * (different seeds) until an execution is recorded. Returns { found, abilityId, form, mastery, primed, slot, game, step, kind,
 * text, sim, events, before, after, plays } or { found: false, plays, reason }.
 */
export function reviewAbility({ family, form = null, mastery = 0, primed = true, seed = 1, games = 3, quarterLength = R.DEFAULT_QUARTER } = {}) {
  const fam = FAMILIES.find((f) => f.id === family); if (!fam?.abilities?.football) return { found: false, plays: 0, reason: 'no football ability' };
  const contract = contractOf(family); if (!contract) return { found: false, plays: 0, reason: 'no registered contract (legacy behaviour is not reviewed here)' };
  form ||= `${family}:0`;
  games = Math.max(games, contract.review?.games || 0); // a rare trigger (e.g. a fumble recovery) declares a longer search
  let plays = 0;
  for (let g = 0; g < games; g++) {
    const gs = seed + g * 7919; const teams = clubs(gs); const at = placeSubject(teams.home, fam, form, mastery);
    if (!at) return { found: false, plays, reason: `no slot for position ${fam.position}` };
    const state = R.newGame({ home: teams.home, away: teams.away, seed: gs, quarterLength });
    const init = primed && contract.review?.prime ? contract.review.prime(form, mastery) : contract.initGame ? contract.initGame(form, mastery) : {};
    state.t8 = { status: {}, ability: { [REVIEW_ID]: structuredClone(init) } };
    const staged = primed ? contract.review || {} : {};
    if (staged.setup) staged.setup({ state, teams, subjectSide: 'home', addField: (f) => { const b = (state.t8.fields ||= { list: [], pending: [], seq: 0 }); const r = placeRect({ id: `RV${++b.seq}`, createdAt: 0, owner: f.owner ?? null, ...f });
      b.list.push({ ...r, lat: [...r.lat], yard: [...r.yard], ability: f.ability ?? 'review', payload: f.payload ?? null, ownerTeam: f.ownerTeam ?? null, remaining: f.lifetime ?? 999, clock: f.clock ?? 'scrimmageAny', clearsAtHalftime: false, createdThisPlay: false }); } });
    const ctrl = { home: aiController('home'), away: aiController('away') }; const tend = { home: newTendencies(), away: newTendencies() };
    for (let i = 0; i < 2000 && !state.finished; i++) {
      const before = structuredClone(state.t8.ability?.[REVIEW_ID] ?? null); const n0 = executionsOf(state.t8); const ballOn = state.ballOn; const offSide = state.phase === 'kickoff' || state.phase === 'free_kick' ? R.opponent(state.kickingTeam) : state.phase === 'try' ? state.tryTeam : state.possession; // a kickoff's sim offense is the return unit
      const ev = step(state, teams, ctrl, tend, staged.choices ? staged.choices(state) || {} : {}); if (!ev) break;
      if (ev.sim || ev.kind === 'field_goal' || ev.kind === 'try' || ev.kind === 'punt' || ev.kind === 'kickoff') plays += 1;
      const evs = contractEvents(ev.sim, fam, fam.abilities.football, at.slot, offSide === 'home' ? 'off' : 'def');
      if (executionsOf(state.t8) > n0) { // a valid execution recorded for the subject (his own; never a cue alone or an opponent's)
        return { found: true, abilityId: fam.abilities.football, family, form, mastery, primed: primed && !!(contract.review?.prime || contract.review?.setup || contract.review?.choices), slot: at.slot, side: at.side,
          game: g + 1, step: i + 1, kind: ev.kind, text: ev.text || '', sim: ev.sim || null, events: evs, executed: true,
          before, after: structuredClone(state.t8.ability?.[REVIEW_ID] ?? null), fields: structuredClone(state.t8.fields?.list || []), plays,
          ballOn, subjectOnOffense: offSide === 'home', sprites: spritesFor(teams, offSide),
          situation: { quarter: state.quarter, down: state.down, toGo: state.toGo, ballOn: state.ballOn, possession: state.possession } };
      }
    }
  }
  return { found: false, plays, reason: `no execution in ${games} game(s) (${plays} plays)` };
}

// ------------------------------------------------------------------------------------------------ deterministic scenarios
// The owner's direct test (M3 review scenarios): `reviewScenario` stages the contract's conditions from the scenario table
// (review-scenarios.js) on the real rules.js game and the engine, with fixed seeds, fixed calls and the subject's primed game-scope
// state. The natural-game search above (reviewAbility) stays as the optional "natural-game demonstration".
const noAbility = (p) => (p && p.id !== REVIEW_ID ? { ...p, species: null, form: null, ability: null } : p);
function scenarioClubs(seed, fam, form, mastery) {
  const teams = clubs(seed); const at = placeSubject(teams.home, fam, form, mastery); if (!at) return { at: null };
  const art = (t) => ({ offense: Object.fromEntries(Object.entries(t.offense).map(([k, v]) => [k, v.species])), defense: Object.fromEntries(Object.entries(t.defense).map(([k, v]) => [k, v.species])) });
  const sprites = { home: art(teams.home), away: art(teams.away) };
  for (const t of [teams.home, teams.away]) { // only the subject's contract acts, unless the scenario places another monster
    for (const side of ['offense', 'defense']) for (const k of Object.keys(t[side])) t[side][k] = noAbility(t[side][k]);
    t.kicker = noAbility(t.kicker);
    if (t.returner && t.returner.id !== REVIEW_ID) t.returner = Object.values({ ...t.offense, ...t.defense }).find((p) => p.id === t.returner.id) || noAbility(t.returner);
  }
  return { teams, at, sprites };
}
/** A monster with a contract placed on a club for a scenario (an opposing Nocturne, an allied partner): `{ species, form?, mastery?, ... }`. */
function placeMonster(team, side, slot, spec, id) {
  const base = side === 'kicker' ? team.kicker : team[side][slot];
  const m = { ...base, id, form: `${spec.species}:0`, mastery: 0, ...spec, name: `${spec.name || spec.species} (scenario)` };
  if (side === 'kicker') team.kicker = m; else team[side][slot] = m;
  return m;
}
const addFieldTo = (state) => (f) => { const b = (state.t8.fields ||= { list: [], pending: [], seq: 0 }); const r = placeRect({ id: `RV${++b.seq}`, createdAt: 0, owner: f.owner ?? null, ...f });
  b.list.push({ ...r, lat: [...r.lat], yard: [...r.yard], ability: f.ability ?? 'review', payload: f.payload ?? null, ownerTeam: f.ownerTeam ?? null, remaining: f.lifetime ?? 999, clock: f.clock ?? 'scrimmageAny', clearsAtHalftime: false, createdThisPlay: false }); };

/** The scenario table entry for a family (review-scenarios.js), or null. */
export const scenarioOf = (family) => SCENARIOS[family] || null;

/**
 * The deterministic scenario for one ability: `{ family, form, mastery }` (optional `seeds` / `snaps` override the table). Same result
 * shape as reviewAbility, plus `mode: 'scenario'`, `how` (how the conditions are staged) and `staged` (a note when the scenario stages
 * conditions that released gameplay does not reach today, else null). Fixed seeds and calls: the same input gives the same output.
 */
export function reviewScenario({ family, form = null, mastery = 0, seeds = null, snaps = null } = {}) {
  const fam = FAMILIES.find((f) => f.id === family); if (!fam?.abilities?.football) return { found: false, executed: false, mode: 'scenario', plays: 0, reason: 'no football ability' };
  const contract = contractOf(family); if (!contract) return { found: false, executed: false, mode: 'scenario', plays: 0, reason: 'no registered contract (legacy behaviour is not reviewed here)' };
  const sc = SCENARIOS[family]; if (!sc) return { found: false, executed: false, mode: 'scenario', plays: 0, reason: 'no scenario for this family' };
  form ||= `${family}:0`; const nSeeds = seeds ?? sc.seeds ?? 12; const nSnaps = snaps ?? sc.snaps ?? 12; const QL = 900;
  const note = typeof sc.staged === 'function' ? sc.staged(form, mastery) : sc.staged || null;
  let plays = 0;
  for (let g = 0; g < nSeeds; g++) {
    const gs = (sc.seed0 ?? 1) + g; const { teams, at, sprites } = scenarioClubs(gs, fam, form, mastery); if (!at) return { found: false, executed: false, mode: 'scenario', plays, reason: `no slot for position ${fam.position}` };
    const subject = at.side === 'kicker' ? teams.home.kicker : teams.home[at.side][at.slot];
    const state = R.newGame({ home: teams.home, away: teams.away, seed: gs, quarterLength: QL, coinWinner: 'home', choice: 'receive' });
    const init = sc.prime ? sc.prime(form, mastery) : contract.initGame ? contract.initGame(form, mastery) : {};
    state.t8 = { status: {}, ability: { [REVIEW_ID]: structuredClone(init ?? {}) } };
    const api = { state, teams, subject, slot: at.slot, form, mastery, seed: gs, addField: addFieldTo(state), place: (team, side, slot, spec, id = `scenario_${team}_${slot}`) => placeMonster(teams[team], side, slot, spec, id) };
    sc.setup?.(api);
    const want = sc.unit === 'defense' ? 'away' : 'home';
    const stageScrimmage = (down = 1) => {
      if (state.phase !== 'scrimmage' || state.possession !== want) state.drive = { team: want, plays: 0, yards: 0, start: sc.ballOn ?? 35 };
      if (state.phase !== 'scrimmage' || state.possession !== want || sc.reset !== false) Object.assign(state, { phase: 'scrimmage', possession: want, ballOn: sc.ballOn ?? 35, ballLat: 0, down, toGo: sc.toGo ?? 10 });
    };
    for (let k = 0; k < nSnaps && !state.finished; k++) {
      state.clock = QL; sc.everySnap?.(api);
      let call; let offSide;
      if (sc.kick === 'kickoff' || (sc.kick === 'xp' && state.phase === 'kickoff' && state.kickingTeam === 'home')) {
        Object.assign(state, { phase: 'kickoff', kickingTeam: sc.receive ? 'away' : 'home' }); offSide = R.opponent(state.kickingTeam);
        call = () => { const x = R.doKickoff(state, teams); return { kind: 'kickoff', text: x.text, sim: x.sim }; };
      } else if (sc.kick === 'xp') { Object.assign(state, { phase: 'try', tryTeam: 'home', possession: 'home' }); offSide = 'home'; call = () => ({ kind: 'try', text: R.attemptTryKick(state, teams).text }); }
      else if (sc.kick === 'fg') { stageScrimmage(4); offSide = 'home'; call = () => ({ kind: 'field_goal', text: R.doFieldGoal(state, teams, { signature: !!sc.signature }).text }); }
      else if (sc.kick === 'punt') { stageScrimmage(4); offSide = 'home'; call = () => ({ kind: 'punt', text: R.doPunt(state, teams).text }); }
      else {
        stageScrimmage(); offSide = state.possession; const [off, def, callTarget] = typeof sc.calls === 'function' ? sc.calls(k, api) : sc.calls[k % sc.calls.length];
        const target = callTarget || (sc.target === true ? at.slot : sc.target || null);
        const options = { ...(target ? { forcedTarget: target } : {}), ...(sc.options ? sc.options(api, k) || {} : {}) };
        call = () => { const x = R.runScrimmagePlay(state, teams, off, def, options); return { kind: 'play', text: x.outcome.text, sim: x.sim, offensePlayId: off, defensePlayId: def }; };
      }
      const before = structuredClone(state.t8.ability?.[REVIEW_ID] ?? null); const n0 = executionsOf(state.t8); const ballOn = state.ballOn;
      const pre = { quarter: state.quarter, down: state.down, toGo: state.toGo, ballOn: state.ballOn, possession: state.possession };
      const ev = call(); plays += 1;
      if (executionsOf(state.t8) > n0) {
        const side = offSide === 'home' ? 'off' : 'def'; const other = R.opponent(offSide);
        const pick = (lu, art) => Object.fromEntries(Object.entries(lu || {}).map(([k2, v]) => [k2, { species: v.species || art?.[k2] || null, name: v.name, type: v.type }]));
        return { found: true, executed: true, mode: 'scenario', how: sc.how || '', staged: note, abilityId: fam.abilities.football, family, form, mastery, primed: !!sc.prime, slot: at.slot, side: at.side,
          game: g + 1, seed: gs, step: k + 1, kind: ev.kind, text: ev.text || '', sim: ev.sim || null, events: contractEvents(ev.sim, fam, fam.abilities.football, at.slot, side),
          before, after: structuredClone(state.t8.ability?.[REVIEW_ID] ?? null), fields: structuredClone(state.t8.fields?.list || []), plays, ballOn, subjectOnOffense: offSide === 'home',
          sprites: { off: pick(teams[offSide].offense, sprites[offSide].offense), def: pick(teams[other].defense, sprites[other].defense) }, situation: pre,
          calls: ev.offensePlayId ? { offense: ev.offensePlayId, defense: ev.defensePlayId } : null };
      }
    }
  }
  return { found: false, executed: false, mode: 'scenario', how: sc.how || '', staged: note, plays, reason: `the scenario did not execute in ${nSeeds} seed(s) x ${nSnaps} snap(s) (${plays} plays)` };
}
