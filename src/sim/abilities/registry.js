// Task 8 M3: the football ability contract registry (M3_PLAN.md). Each Dex family with a football ability registers one module
// (src/sim/abilities/<family>.js) that declares its handlers for the engine's named hook points, its game-scope state, and its
// mastery execution boundary. The engine calls hooks by name and never names an ability; a family's legacy effect key is removed
// in the same change that registers its contract (no stacking), enforced by tests/task8-ability-gate.test.js.
//
// Contract module shape:
//   {
//     family: 'emberfox', abilityId: 'FIR-01-F',
//     hooks: { [hookName]: (ctx, self, ...args) => result },   // pure over ctx + the actor/state given; draws only from ctx.rng
//     initGame?: (form, mastery) => state,                       // game-scope state (charges, cooldowns), saved with an active game
//     passive?: true,                                            // aura/passive: at most one mastery credit per game
//     preSnap?: (api, self) => void,                             // M3 hook: before a scrimmage snap's fields are created (rules.js):
//                                                                //   pre-choice producers queue fields here (api: rules.js preSnapContracts)
//   }
// Hook names (engine.js calls them; a hook a module does not declare costs nothing):
export const HOOKS = Object.freeze([
  'playStart',        // (ctx, self)                         the snap: may read/modify the actor before movement
  'tick',             // (ctx, self)                         every engine tick while the play is live
  'engage',           // (ctx, self, other)                  a block engagement starts (self is blocker or defender)
  'tackleAttempt',    // (ctx, self, tackler) -> {prevent|skip} pre-resolution, before the tackle is decided (P6); skip: the tackler
                      //                                     cannot initiate this attempt at all (M3 hook: no attempt, no broken tackle)
  'juke',             // (ctx, self, defender)               M3 hook: the carrier's successful ordinary juke of that defender
  'passRelease',      // (ctx, self, { ball, passer, receiver }) -> {breakup}?  M3 hook: a forward pass has left the hand (ball.target,
                      //   ball.landing set). Defenders first in lineup order: the first {breakup} ends it as an ordinary incompletion; then everyone else observes.
  'catchPoint',       // (ctx, self, ball, other)            pre-resolution at the catch point (P6): set ball.t8.noContest / ball.t8.noInterception
  'catchMade',        // (ctx, self, receiver)               M3 hook: after a completed catch (ctx.result is set if the catch ended the play)
  'fumble',           // (ctx, self) -> {prevent}            after a fumble is determined; a Shielded save is applied first (B3)
  'playEnd',          // (ctx, self, result)                 the whistle: charges, clocks, field creation
  'possessionChange', // (ctx, self)
  // M3 hook: (Earth/Ice batch) generic capability points
  'pancakeOpportunity', // (ctx, self, defender) -> {guarantee}  an OL's once-per-play pancake opportunity, before its rolls
  'activationAttempt', // (ctx, self, attempter) -> {suppress}  an opposing contract asks ctx.canStartSignature (activation-denial auras)
  // M3 hook: formula kicks (rules.js; the kicker is not an engine actor): ctx = kickCtx below, self = the kicker
  'fieldGoalMiss',    // (ctx, self, res, retry) -> res'      a field goal check missed; `retry()` makes a fresh ordinary check
  'fieldGoalMade',    // (ctx, self, res)                     a field goal is finally good (extra points are not field goals)
  'puntReturn',       // (ctx, self, res) -> res'             a punt is caught in the field of play and returned (not fair catch / touchback / downed / blocked)
]);

const MODULES = new Map();
/** Register a family's contract. A family registers at most once; unknown hook names are an error. */
export function registerAbility(mod) {
  if (!mod?.family || !mod.abilityId) throw new Error('ability module needs family and abilityId');
  if (MODULES.has(mod.family)) throw new Error(`${mod.family} already registered`);
  for (const h of Object.keys(mod.hooks || {})) if (!HOOKS.includes(h)) throw new Error(`${mod.family}: unknown hook ${h}`);
  MODULES.set(mod.family, Object.freeze({ ...mod }));
  return mod;
}
export const contractOf = (family) => MODULES.get(family) || null;
export const registeredFamilies = () => [...MODULES.keys()];
/** Has this family's Dex contract replaced its legacy effect? (the engine skips the legacy key when true) */
export const hasContract = (family) => MODULES.has(family);

/**
 * Game-scope ability state for one monster (charges, cooldowns, per-game caps), kept in the football game state so a save of an
 * active game preserves it. Created lazily from the contract's initGame.
 */
export function abilityState(t8, monsterId, family, form, mastery = 0) { // t8: the football game state's Task 8 block (state.t8)
  const book = (t8.ability ||= {});
  if (!book[monsterId]) { const c = contractOf(family); book[monsterId] = c?.initGame ? c.initGame(form, mastery) : {}; }
  return book[monsterId];
}

/** Mastery execution events (credits are awarded by M5; M3 records them). One credit per valid execution; passive one per game. */
export function recordExecution(t8, monsterId, family, { passive = false } = {}) {
  const log = (t8.mastery ||= {});
  const rec = (log[monsterId] ||= { family, executions: 0, passiveCredited: false });
  if (passive) { if (rec.passiveCredited) return false; rec.passiveCredited = true; rec.executions += 1; return true; }
  rec.executions += 1; return true;
}

/**
 * M3 hook: a formula kick's contract call (rules.js punts and field goals). `kicker` is the team's kicker input ({ id, species, form,
 * mastery, name }); `side` the kicking team. Returns the hook's result, or undefined when the kicker has no contract or no such hook.
 * The ctx gives game-scope state, mastery executions, field queueing, a log line, and the abilities' own random stream.
 */
export function kickHook(t8, kicker, side, name, { log = () => {}, rng = null, extra = {} } = {}, ...args) {
  const c = kicker?.species ? contractOf(kicker.species) : null; const h = c?.hooks?.[name]; if (!h || !kicker.id) return undefined;
  const self = { mid: kicker.id, family: kicker.species, form: kicker.form || `${kicker.species}:0`, mastery: kicker.mastery || 0, name: kicker.name || 'K', slot: 'K', team: side, contract: c };
  const ctx = { state: (a) => abilityState(t8, a.mid, a.family, a.form, a.mastery), executed: (a, opts) => recordExecution(t8, a.mid, a.family, opts),
    queueField: (spec) => { (t8.fields ||= { list: [], pending: [], seq: 0 }).pending.push({ ...spec }); }, pendingFields: () => t8.fields?.pending || [], log, rng, teamSide: side, ...extra };
  return h(ctx, self, ...args);
}

/** Light field (spec §11): one extra cooldown unit, after the ordinary decrement, on the monster's repeatable-signature cooldown if it is
 *  running (positive), once per monster per play. A creator never receives his own field's recharge. Returns true when applied. */
export function extraCooldownUnit(t8, monsterId) {
  const st = t8.ability?.[monsterId]; if (!st || !(st.cd > 0)) return false; st.cd -= 1; return true;
}
