// Task 8 M3: the runtime-backed football ability reviewer's engine side (M3_PLAN.md item 6). Pure: no DOM, no franchise, no save.
// For one ability at one form and mastery tier, a review places the family's monster in its Dex position on a generated club and
// plays a real game (the game runner, the engine, every hook and the game-scope ability state) until the contract records a valid
// execution. It returns the play that executed with its frames and events for the replay, and the ability state before and after.
//
// Staged inputs: a contract may export `review: { prime(form, mastery) -> state, situation?: {...} }`; a primed review starts the
// game with that game-scope state (e.g. a charged ignition) so the reviewer reaches the execution without waiting for its build-up.
// Without one, or with `primed: false`, the state is the contract's own initGame and the execution has to happen naturally.
//
// Nothing here writes progression: the clubs are generated for the review, the game state is local, mastery executions are only
// counted (M5 awards them in franchise games, never here).
import { FAMILIES, formsOf, abilityById } from '../../data/beast-dex.js';
import { contractOf, registeredFamilies } from './registry.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../../data/personnel.js';
import { generatedTeam } from '../../franchise/roster.js';
import * as R from '../rules.js';
import { step, aiController, newTendencies } from '../game-runner.js';
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

const executionsOf = (t8) => t8?.mastery?.[REVIEW_ID]?.executions || 0;
const contractEvents = (sim, fam, abilityId) => (sim?.events || []).filter((e) => e.ability === abilityId || e.contract === fam.id);

/**
 * Review one ability: `{ family, form, mastery, primed = true, seed = 1, games = 3, quarterLength }`. Plays up to `games` games
 * (different seeds) until an execution is recorded. Returns { found, abilityId, form, mastery, primed, slot, game, step, kind,
 * text, sim, events, before, after, plays } or { found: false, plays, reason }.
 */
export function reviewAbility({ family, form = null, mastery = 0, primed = true, seed = 1, games = 3, quarterLength = R.DEFAULT_QUARTER } = {}) {
  const fam = FAMILIES.find((f) => f.id === family); if (!fam?.abilities?.football) return { found: false, plays: 0, reason: 'no football ability' };
  const contract = contractOf(family); if (!contract) return { found: false, plays: 0, reason: 'no registered contract (legacy behaviour is not reviewed here)' };
  form ||= `${family}:0`;
  let plays = 0;
  for (let g = 0; g < games; g++) {
    const gs = seed + g * 7919; const teams = clubs(gs); const at = placeSubject(teams.home, fam, form, mastery);
    if (!at) return { found: false, plays, reason: `no slot for position ${fam.position}` };
    const state = R.newGame({ home: teams.home, away: teams.away, seed: gs, quarterLength });
    const init = primed && contract.review?.prime ? contract.review.prime(form, mastery) : contract.initGame ? contract.initGame(form, mastery) : {};
    state.t8 = { status: {}, ability: { [REVIEW_ID]: structuredClone(init) } };
    const ctrl = { home: aiController('home'), away: aiController('away') }; const tend = { home: newTendencies(), away: newTendencies() };
    for (let i = 0; i < 2000 && !state.finished; i++) {
      const before = structuredClone(state.t8.ability?.[REVIEW_ID] ?? null); const n0 = executionsOf(state.t8);
      const ev = step(state, teams, ctrl, tend); if (!ev) break;
      if (ev.sim || ev.kind === 'field_goal' || ev.kind === 'try' || ev.kind === 'punt' || ev.kind === 'kickoff') plays += 1;
      const evs = contractEvents(ev.sim, fam, fam.abilities.football);
      if (executionsOf(state.t8) > n0 || evs.length) {
        return { found: true, abilityId: fam.abilities.football, family, form, mastery, primed: primed && !!contract.review?.prime, slot: at.slot, side: at.side,
          game: g + 1, step: i + 1, kind: ev.kind, text: ev.text || '', sim: ev.sim || null, events: evs, executed: executionsOf(state.t8) > n0,
          before, after: structuredClone(state.t8.ability?.[REVIEW_ID] ?? null), fields: structuredClone(state.t8.fields?.list || []), plays,
          situation: { quarter: state.quarter, down: state.down, toGo: state.toGo, ballOn: state.ballOn, possession: state.possession } };
      }
    }
  }
  return { found: false, plays, reason: `no execution in ${games} game(s) (${plays} plays)` };
}
