// Beast Clash move handlers: the code that owns each mechanic a move row can name.
// A move is data (kind, trigger, numbers, named effects); this registry says which kinds,
// triggers and effects exist, so validation can refuse an unknown key. The engine calls
// `resolveStrike` for a front monster's action and the small helpers for everything else.
// Imports only values and types.
import { CLASH_VALUES } from './values.js';
import { typeFactor } from './types.js';

export const KINDS = Object.freeze(['strike', 'heavy', 'surge', 'guard', 'mend', 'hex', 'bench']);
export const TRIGGERS = Object.freeze(['always', 'first', 'every', 'once', 'onEntry', 'firstAfterEntry']);
/** Every key a move row may carry besides name/archetype/text/kind/trigger, with a one-line meaning (the Moves screen shows these). */
export const EFFECTS = Object.freeze({
  mult: 'strike multiplier on the triggered action', priority: 'acts first that action', priorityExchanges: 'exchanges the priority lasts',
  neverFirst: 'always acts second', afflict: 'condition on the triggered strike {cond, chance, belowHp?, firstOnly?}',
  cond: 'condition this Disruptor applies (or swap)', chance: 'chance the condition lands', retaliate: 'condition on an attacker that hits it',
  shield: 'entry or granted shield as a share of max HP', erupt: 'damage to the attacker who breaks the shield (x attack)', clamp: 'while the shield holds, the opposing front cannot be swapped',
  swapKind: 'frontTwo | backToFront | strongestBack', hit: 'the bench swap also hits the new front', anywhere: 'the bench action also fires from the front',
  heal: 'heal as a share of the target\'s max HP', target: 'front | mostHurt | twoMostHurt | all', second: 'heal for the next ally', sweepTarget: 'a surviving target is sent to the back',
  regrowOnHit: 'heals this share each time it is hit', wallText: 'card restates the Tank guard (12% less)', brace: 'the healed ally takes this share from the next hit', thorns: 'shield breakers take this x attack',
  charge: 'front ally\'s next strike bonus', hits: 'number of hits on the triggered action', regrow: 'times the shield regrows', skips: 'actions the Shock skips',
  lift: 'the healed ally moves one place back', haste: 'the healed ally acts first next exchange', rally: 'allies strike harder {bonus, exchanges}', perStage: 'per evolution stage (shield or mult)',
  vsShield: 'multiplier against a shielded foe', firstStrike: 'first strike multiplier', shieldBreak: 'shield removed per point of damage', frontTwo: 'also hits the next in line',
  immovable: 'cannot be swapped out', dodgeOnEntry: 'dodges the first strike after entering', dodgeNext: 'dodges the next hit after the triggered strike', wholeLine: 'the condition hits every opposing monster',
  duration: 'condition duration override', veil: 'the first strike aimed at it misses', cleanse: 'removes the target\'s condition (any | daze)', splash: 'share of damage onto the next foe', splashLabel: 'card wording for the splash target',
  finisher: 'bonus against a foe below a share of HP {below, bonus}', unanswered: 'the target cannot act this exchange', forge: 'own attack rises per triggered strike {step, max}', hitCap: 'no single hit exceeds this share of its HP',
  steadyRoll: 'damage never rolls below full', koHeal: 'heals this share on a knockout with the move', illusion: 'the ally\'s next hit is absorbed', echo: 'adds this share of the damage it last took',
  fakeFirst: 'first strike: the target skips its answer', blink: 'hits the second opposing monster instead', selfHeal: 'heals itself on the triggered strike', dragonhide: 'heals when a hit takes a share of HP {threshold, heal}',
  roar: 'the opposing front acts last for this many exchanges', sovereign: 'cannot be dodged or reduced', suddenDeathBonus: 'bonus during sudden death', overcharge: 'attack bonus after a knockout',
  until: 'the every-trigger stops after this many actions',
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Does the move's trigger fire on this action? `n` is the actor's own action count including this one. */
export function triggerFires(move, live) {
  const t = move.trigger; const n = live.strikes;
  switch (t.kind) {
    case 'always': return true;
    case 'first': return n === 1;
    case 'once': return !live.onceUsed;
    case 'firstAfterEntry': return live.firstAfterEntryDue;
    case 'every': return (!t.until || n <= t.until) && n % (t.n || 1) === 0;
    default: return false;
  }
}

/**
 * Resolve one hit from `att` on `def`. `E` is the engine context: rng, ramp, log, helpers.
 * Returns the damage dealt to HP (after shield) so callers can chain splash/heal effects.
 */
export function hit(E, att, def, mult, { label = 'strike', shieldBreak = 1, canDodge = true } = {}) {
  const V = CLASH_VALUES; const mv = att.c.move;
  // Dodges and veils: a miss is a logged event, not silent.
  if (canDodge && !mv.sovereign) {
    if (def.veil) { def.veil = false; E.log('miss', att, def, `${def.c.name}'s veil: the strike misses`); return 0; }
    if (def.dodge) { def.dodge = false; E.log('miss', att, def, `${def.c.name} dodges ${att.c.name}'s ${label}`); return 0; }
    if (def.illusion) { def.illusion = false; E.log('miss', att, def, `${def.c.name}'s illusion absorbs the hit`); return 0; }
  }
  const spread = mv.steadyRoll ? 1 : V.damage.spreadMin + E.rng.next() * (V.damage.spreadMax - V.damage.spreadMin);
  const daze = att.cs.cond?.kind === 'daze' ? V.damage.dazeMult : 1;
  const type = typeFactor(att.c.type, def.c.type);
  let guard = 1;
  if (def.isFront && def.c.guard < 1 && !(V.archetypes[att.c.archetype].pierce) && !mv.sovereign) guard = def.c.guard;
  if (def.brace && !mv.sovereign) { guard *= def.brace; def.brace = 0; }
  let bonus = 1;
  if (att.charge) { bonus *= 1 + att.charge; att.charge = 0; }
  if (att.side.rallyUntil >= E.ex) bonus *= 1 + att.side.rallyBonus;
  if (att.overcharge) bonus *= 1 + att.overcharge;
  if (att.forge) bonus *= 1 + att.forge;
  if (mv.finisher && def.hp / def.c.maxHp < mv.finisher.below) bonus *= 1 + mv.finisher.bonus;
  if (mv.suddenDeathBonus && E.ramp > 1) bonus *= 1 + mv.suddenDeathBonus;
  if (mv.echo && att.lastTaken) bonus *= 1 + mv.echo * Math.min(1, att.lastTaken / att.c.maxHp);
  let d = Math.round(att.c.atk * mult * E.ramp * type * spread * daze * guard * bonus);
  if (def.c.move.hitCap && !mv.sovereign) d = Math.min(d, Math.round(def.c.maxHp * def.c.move.hitCap));
  d = Math.max(0, d);
  // Shield absorbs first; Strikers (and Crushing Rush) remove shield twice as fast.
  const breakRate = Math.max(shieldBreak, V.archetypes[att.c.archetype].shieldBreak || 1);
  let absorbed = 0;
  if (def.shield > 0) {
    const removed = Math.min(def.shield, d * breakRate); absorbed = Math.round(removed / breakRate); def.shield -= removed;
    if (def.shield <= 0) { def.shield = 0; E.onShieldBroken(def, att); }
  }
  const toHp = Math.max(0, d - absorbed);
  const before = def.hp; def.hp = Math.max(0, def.hp - toHp);
  att.stats.dealt += d; def.stats.taken += toHp; def.lastTaken = toHp;
  if (att.c.archetype === 'Tank') def.bruisedUntil = E.ex + V.conditions.bruiseExchanges;
  E.log('damage', att, def, `${att.c.name}'s ${label}${mult !== 1 ? ` (${mult}x)` : ''}: ${d} damage${absorbed ? `, ${absorbed} absorbed by the shield` : ''}${type > 1 ? ' (type advantage)' : type < 1 ? ' (type disadvantage)' : ''}`, { damage: d, absorbed, hpBefore: before, hpAfter: def.hp, type: type > 1 ? 'strong' : type < 1 ? 'weak' : 'even', mult });
  E.afterHit(att, def, toHp, label);
  return toHp;
}

/** A heal with every approved cut: afflicted x0.7, bruised x0.75, the duration model, O1 for later heals. Returns the amount. */
export function heal(E, src, target, share, label = 'heal') {
  const V = CLASH_VALUES; if (share <= 0) return 0;
  let k = E.healMult; const why = [];
  if (E.healMult < 1) why.push(E.config.duration === 'C6' ? 'stalemate' : 'R2');
  if (target.cs.cond) { k *= V.conditions.healAfflicted; why.push(target.cs.cond.kind); }
  if (target.bruisedUntil >= E.ex) { k *= V.conditions.healBruised; why.push('bruised'); }
  if (E.config.O1 && E.perSide >= V.experiments.O1.minPerSide && src.side.healsThisExchange >= 1) { k *= V.experiments.O1.laterHeal; why.push('O1 later heal'); }
  const amt = Math.min(target.c.maxHp - target.hp, Math.round(target.c.maxHp * share * k));
  src.side.healsThisExchange += 1;
  const before = target.hp; target.hp += Math.max(0, amt); src.stats.support += Math.max(0, amt);
  E.log('heal', src, target, amt > 0 ? `${src.c.name}'s ${label} heals ${target.c.name} ${amt}${why.length ? ` (reduced: ${why.join(', ')})` : ''}` : `${src.c.name}'s ${label}: ${target.c.name} is at full HP (0)`, { amount: amt, hpBefore: before, hpAfter: target.hp, mult: Math.round(k * 100) / 100, reduced: why });
  return amt;
}

/** Grant a shield (entry shields and Support shields share the duration model). */
export function grantShield(E, src, target, share, label = 'shield') {
  const amt = Math.round(target.c.maxHp * share * E.healMult);
  target.shield += amt; src.stats.support += amt;
  E.log('shield', src, target, `${src.c.name}'s ${label}: ${target.c.name} gains a ${amt} shield${E.healMult < 1 ? ' (reduced)' : ''}`, { amount: amt, shield: target.shield });
  return amt;
}
