// Beast Clash t8 (M4 S5): the Clash contract registry (plan §3.5). Each Dex family with a Clash ability registers one module
// (src/clash/abilities/<family>.js) declaring its handlers for the engine's named hook points, its battle-scope state and its
// mastery execution boundary. The engine calls hooks by name and never names an ability. The t8 engine never reads the legacy
// move table (tests/clash/t8-gate.test.js).
//
// Module shape:
//   {
//     family, abilityId,
//     initBattle(form, tier) -> state          battle-scope ability state (charges, once-ledgers, marks, memory); authoritative and
//                                              serialisable (plain data only), kept on the combatant and returned in the result
//     values(form, tier) -> {...}              the form x mastery numbers the module uses (tests check each against the Dex text)
//     passive?: true                           aura/passive: one mastery credit per cap scope (spec §6)
//     hooks: { [hookName]: (api, self, info) => result }
//     review: { scenarios: [...] }             S15 staged scenarios (src/clash/t8/review.js)
//   }
// `self` = { id, side, family, abilityId, form, stage, tier, name, state } (state is the mutable battle-scope object).
// `api` = the engine's contract context (engine.js `contractApi`): read views, the counted random stream, statuses, heals, shields,
// strikes, transfers, revive, rotation, delayed impacts, clocks, ledgers, the log and the mastery execution record.
export const CLASH_HOOKS = Object.freeze([
  // exchange boundaries and reserve windows
  'roundStart',       // (api, self)                     every living monster, stable lineup order (reserve windows: Eclipse Call)
  'preInitiative',    // (api, self, { order })          every living reserve, after the provisional order: { advance: activeId } (Second Wind)
  'initiative',       // (api, self)                     the active: { interrupt?, priority? } (Night Swoop)
  'rotationPhase',    // (api, self)
  'endOfExchange',    // (api, self)
  'delayedImpact',    // (api, self, item)               the owner of a delayed item whose impact exchange has come (Falling Star, Faultline)
  // the normal turn
  'turnStart',        // (api, self)
  'teamAction',       // (api, self, { activeId })       every living reserve before the active chooses (Feather Relay: left unmet)
  'chooseAction',     // (api, self, { foeId, restricted }) -> null | action descriptor | { run(api, self) }
  'stunnedSkip',      // (api, self)                     the active lost its normal action to Stunned (Unbroken Charge arms)
  'endOfTurn',        // (api, self)                     the active's own end of turn (schedules, counters)
  'anyEndOfTurn',     // (api, self, { id })             every living monster, after any monster's end of turn (link / restriction clocks)
  // the strike pipeline (B3 step 8 / P6 3.4-3.12)
  'launch',          // attacker: (api, self, info) -> { cancel, reason } | null       launch accuracy, costs
  'variance',        // attacker: (api, self, info) -> { floor }                      Gear Shot
  'intercept',       // target's side, lineup order: (api, self, info) -> { intercepted }  Stone Divide
  'missCheck',       // target: (api, self, info) -> { miss, source }               Heat Mirage, Shadow Pounce, Mind Game
  'rawModifiers',    // attacker: (api, self, info) -> { factor }
  'lethalRedirect',  // target's side reserves, lineup order: (api, self, info) -> { to }   Emergency Cover
  'rawSplit',        // target's side reserves: (api, self, info) -> { to, pct, since }      Shared Burden (strongest link wins)
  'mitigate',        // recipient: (api, self, info) -> { factor, capHp }            Tempered Guard cap
  'shieldRule',      // attacker: (api, self, info) -> { bypass } | { mult }         Phase Strike, Iron Bite
  'preKO',           // recipient: (api, self, info) -> { survive }                  Last Root
  'attached',        // attacker: (api, self, info)                                 marks and statuses attached to a connected hit
  'reaction',        // every living monster, per hit (recipients first): retaliation to that hit (Stoke, Molten Brand)
  'afterWholeHit',   // every living monster, per hit
  'afterWholeAttack',// every living monster, once per attack (all hits): counters, memories, heals (Shadow Pounce, Echo, Wing Shelter)
  'followUp',        // every living monster, once per attack, after the replacement entered (Twin Thunder, Victory Surge, Bank Shot)
  'healed',          // every living monster after a heal resolves: (api, self, { targetId, amount, sourceId }) (Rubble Reprisal)
  // statuses
  'statusIncoming',  // target: (api, self, attempt) -> { block, reason }           Foresight (before the slot check)
  'statusApplied',   // target: (api, self, slot)                                   Shell Renewal
  'statusEnded',     // target: (api, self, { id, reason })                         Fortress (natural expiry)
  // lineup
  'onEntry',         // the entrant: (api, self, { reason })
  'onDeparture',     // the departing monster: (api, self, { reason })
  'anyEntry',        // every living monster: (api, self, { id, reason, side })
  'anyDeparture',    // every living monster: (api, self, { id, reason, side })
  'onKO',            // the knocked-out monster: (api, self, { by })               cleanup of its own effects
  'anyKO',           // every living monster: (api, self, { id, by })
  'rotationLock',    // every living monster: (api, self, { activeId, forced }) -> { locked, reason }
  'rotationDelay',   // every living monster: (api, self, { side, out, in }) -> { delay }   Cinder Clamp
  'pursuit',         // every living monster: (api, self, { side, out, in })         Riptide Pursuit
  'cashOut',         // every living monster: (api, self, { side, out, in })         Shell Harvest
  'arrival',         // every living monster: (api, self, { side, in, reason })      Cold Welcome
]);

const MODULES = new Map();
const BY_ABILITY = new Map();
export function registerClashAbility(mod) {
  if (!mod?.family || !mod.abilityId) throw new Error('Clash ability module needs family and abilityId');
  if (MODULES.has(mod.family)) throw new Error(`${mod.family} already registered a Clash contract`);
  if (typeof mod.initBattle !== 'function' || typeof mod.values !== 'function') throw new Error(`${mod.abilityId}: initBattle(form, tier) and values(form, tier) are required`);
  for (const h of Object.keys(mod.hooks || {})) if (!CLASH_HOOKS.includes(h)) throw new Error(`${mod.abilityId}: unknown Clash hook ${h}`);
  const frozen = Object.freeze({ ...mod, hooks: Object.freeze({ ...(mod.hooks || {}) }) });
  MODULES.set(mod.family, frozen); BY_ABILITY.set(mod.abilityId, frozen);
  return frozen;
}
export const clashContractOf = (family) => MODULES.get(family) || null;
export const clashContractById = (abilityId) => BY_ABILITY.get(abilityId) || null;
export const registeredClashFamilies = () => [...MODULES.keys()];
export const registeredClashAbilities = () => [...BY_ABILITY.keys()];
