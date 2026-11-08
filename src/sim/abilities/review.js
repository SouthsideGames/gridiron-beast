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
// Nothing here writes progression: the clubs are generated for the review, the game state is local, mastery executions are only
// counted (M5 awards them in franchise games, never here).
import { FAMILIES, formsOf, abilityById } from '../../data/beast-dex.js';
import { contractOf, registeredFamilies } from './registry.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../../data/personnel.js';
import { generatedTeam } from '../../franchise/roster.js';
import * as R from '../rules.js';
import { step, aiController, newTendencies } from '../game-runner.js';
import { placeRect } from '../t8/fields.js';
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
