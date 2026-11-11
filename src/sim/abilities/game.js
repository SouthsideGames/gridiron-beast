// Task 8 M3 (Light/Metal batch): game-level contract hooks (registry.js GAME_HOOKS). Some contracts trigger on game events rather than
// on a simulated play (an extra point, a punt, the pre-choice point of a snap); rules.js calls runGameHook at those points with the
// monsters concerned. Each hook gets the game's Task 8 block for its state (charges, tokens, the fields), so a save of an active game
// keeps it. Like the play hooks, a game hook never names another ability and draws no game random numbers.
import { contractOf, abilityState, recordExecution } from './registry.js';
import { queueField } from '../t8/field-runtime.js';

/**
 * Run game hook `name` for each monster input (a lineup/kicker object with id and species) whose family's contract declares it.
 * `log(text, extra)` writes to the game log. Returns the hooks' results.
 */
export function runGameHook(state, name, monsters, data = {}, { log = null } = {}) {
  const t8 = (state.t8 ||= { status: {} }); const out = []; const seen = new Set();
  for (const m of monsters) {
    if (!m?.id || !m.species || seen.has(m.id)) continue; seen.add(m.id);
    const h = contractOf(m.species)?.game?.[name]; if (!h) continue;
    const self = { mid: m.id, family: m.species, form: m.form || `${m.species}:0`, mastery: m.mastery || 0, name: m.name || m.id, input: m };
    const gctx = {
      t8, game: state,
      state: (s) => abilityState(t8, s.mid, s.family, s.form, s.mastery),
      executed: (s, opts) => recordExecution(t8, s.mid, s.family, opts),
      queueField: (spec) => queueField(t8, spec),
      log: (text, extra = {}) => log?.(text, { kind: 'ability', ...extra }),
    };
    out.push(h(gctx, self, data));
  }
  return out;
}
