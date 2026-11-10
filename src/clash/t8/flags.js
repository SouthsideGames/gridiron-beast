// N9c approvals are marked on resolved points below; unresolved readings remain gated.
// Beast Clash t8 (M4 S5-S11): the PROVISIONAL readings that change ability behaviour, each behind ONE switch so an owner ruling
// is a one-line change. Resolved points carry approved: N9c; remaining entries name the open decision (docs/task8/M4_OPEN_ITEMS.md,
// M4_PLAN.md §5b) and lists the readings the sources allow. The chosen default is the plan's recommendation, or the contract's
// literal text where the plan is silent. Tests read this table so a default cannot be switched silently, and the ability modules
// read it through the helpers below rather than hard-coding a reading.
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

export const T8_FLAGS = deepFreeze({
  // D13 (open, §25 item 13). 'progression': the Progression ladders govern (Daybreak Lance 145/160/175/190, Clear Light 8/10/12/14 by
  // mastery); 'core': the Core flat value (160%, 10%) at every tier.
  d13ValuePrecedence: { value: 'progression', options: ['progression', 'core'], waitsOn: 'D13 (open)', abilities: ['LIG-06-C', 'LIG-03-C'] },
  // Core-versus-Progression conflicts found at S7 inside two more contracts, of the same kind as D13 (Forge Swipe duration, Fortress
  // storage cap). 'progression' | 'core'. Gated by PROVISIONAL_POINTS['forge-swipe-duration'] and ['fortress-storage-cap'].
  coreVsProgression: { value: 'progression', options: ['progression', 'core'], waitsOn: 'owner (same question as D13, two more contracts)', abilities: ['MET-01-C', 'MET-06-C'] },
  // D14 (open, §25 item 14). 'self-only': the approved text literally ("Front ally, self only if actually front"): the caster is the
  // only front ally under one active fighter, so Dawn Song targets the active Solchirp itself. 'self-included' is listed because the
  // owner asked which was meant; under one active fighter both readings resolve to the same target (the caster).
  d14DawnSongTarget: { approved: 'N9c B', value: 'self-only', options: ['self-only', 'self-included'], waitsOn: 'none (approved N9c)', abilities: ['LIG-02-C'] },
  // D16 / Stone Divide scope (EAR-05-C: "Ordinary attacks, normal-action specials, delayed meteors/fissures, DOT and transferred damage
  // unaffected" against the plan's extra-strike list, M4_PLAN.md §5b D16). Each entry: true = Stone Divide intercepts that strike.
  stoneDivide: {
    waitsOn: 'D16 (table review; questions 1-2 in M4_OPEN_ITEMS.md)',
    // Bank Shot ricochet, Refraction secondary, Canopy Assist strike, Astral commanded attacks: launched inside a normal action, but
    // named by the plan's extra-strike definition. Default: intercepted (the plan's list).
    normalActionSpecialStrikes: true,
    // Molten Brand eruption (mark-triggered) and Rubble Reprisal (heal-triggered): reactions that are not "attack-based retaliation"
    // in Stone Divide's words. Default: intercepted (the plan's list names both).
    nonAttackTriggeredReactions: true,
  },
  // D5 perk applicability for the silent / deferred contracts (M4_OPEN_ITEMS.md D16 question 3). true = the strike keeps "normal
  // attack identity" and gets the ordinary-only Striker shield-break x2 / Disruptor pierce; false = it is a special and gets neither.
  ordinaryPerks: {
    waitsOn: 'none (N9c A/E approved)',
    'LIG-05-C': true, // N9c E, Radiant Pursuit: "retain normal-attack identity ... only where global perk policy permits (G06)"; plan: enhanced -> no
    'PSY-05-C': true,  // Mind Game trick attack: "Base attack normal damage"; D5 proposal names it ordinary -> pierce applies
    'PSY-06-C': true,  // Astralux's own follow-on attack: the contract calls it a "100% ordinary normal attack" (literal)
    'DAR-02-C': true, // N9c E: boosted normal attack retains Striker perks
    'DAR-03-C': true, // N9c E: third normal strike retains Striker perks
    'LIG-06-C': false, // Daybreak Lance: silent; plan reading excludes
    'MET-04-C': false, // Iron Bite: plan §5c "Iron Bite is a special, so it gets no Striker x2"
    'ELE-04-C': false, // Circuit Breaker: silent; plan reading excludes
    'MET-03-C': true,  // Gear Shot: D5 names it ordinary
    'FIR-02-C': true,  // Cinder Clamp: the grip rides a "normal direct attack" (D16 table row 2)
    'MET-01-C': true,  // Forge Swipe: the triggering attack is ordinary ("No instant bonus on triggering attack")
    'DRA-02-C': true,  // Coil Renewal: "Trigger attack ordinary damage"
  },
  // Delayed slot marking (FIR-03-C, FIR-06-C: "Mark the normal target lineup position, not combatant identity ... normally the
  // opposing front"). Under lineup-order-stable (S4) a lineup index never changes hands, so the only reading that lets "current
  // occupant" differ from the launch target is the ACTIVE position. 'active-position' (default) | 'lineup-index'.
  delayedSlot: { approved: 'N9c G', value: 'active-position', options: ['active-position', 'lineup-index'], waitsOn: 'none (approved N9c)' },
  // D8 (open): pending delayed impacts at the exchange cap. 'discard' (plan) | 'resolve' (impact before the HP-share tiebreak).
  d8CapDelayed: { value: 'discard', options: ['discard', 'resolve'], waitsOn: 'D8 (open)' },
  // Clear Light's "cooldown 5 turns fixed" names no unit (M4_OPEN_ITEMS.md D13 point 3). 'owner-turns' (every other Clash cooldown
  // counts owner normal turns) | 'recipient-turns'.
  clearLightCooldownUnit: { approved: 'N9c H', value: 'owner-turns', options: ['owner-turns', 'recipient-turns'], waitsOn: 'none (approved N9c)' },
  // D3 / Feather Relay (WIN-01-C), reconciled by the owner 2026-11-09 01:03: a rotation without the P8 penalty, keeping locks, legal
  // availability and the cadence. Whether it is VOLUNTARY for the enemy / owner rotation triggers is unaddressed: 'voluntary' (plan D3)
  // | 'not-voluntary'. Gated by PROVISIONAL_POINTS['feather-relay-voluntary'].
  featherRelayVoluntary: { approved: 'N9c C', value: 'voluntary', options: ['voluntary', 'not-voluntary'], waitsOn: 'none (approved N9c)' },
});

/** The chosen reading of a single-valued flag. */
export const flag = (id) => { const f = T8_FLAGS[id]; if (!f || !('value' in f)) throw new Error(`No single-valued t8 flag ${id}`); return f.value; };
/** D5 perk applicability of an ability's own normal-action strike: the tag the strike should carry ('ordinary' keeps the perks). */
export const perkTag = (abilityId) => { const v = T8_FLAGS.ordinaryPerks[abilityId]; if (v === undefined) throw new Error(`No ordinary-perk reading for ${abilityId}`); return v ? 'ordinary' : 'special'; };

/**
 * Owner ruling 2026-11-09 01:03 (rule 1): provisional interpretations are isolated from normal gameplay and from the acceptance tests
 * until ruled. Every point below is a decision an ability's functioning depends on. In normal gameplay (config.provisional 'off', the
 * default) the ability reports `unmet: awaiting ruling (<point>)` at that decision and does not activate (its use is preserved), so
 * nothing guesses silently. With config.provisional 'on' (reviewer and the t8-provisional-*.test.js files only, labelled) the reading
 * in T8_FLAGS applies and a `provisional` event names it. docs/task8/M4_DECISIONS_PENDING.md lists the same points.
 */
export const PROVISIONAL_POINTS = deepFreeze({
  'd13-values': { waitsOn: 'D13 (open): Core flat value against the Progression ladder', reading: 'Progression ladder (T8_FLAGS.d13ValuePrecedence); gated only at the tiers where the two texts differ (both give the Core value at Practiced)', abilities: ['LIG-06-C', 'LIG-03-C'] },
  'forge-swipe-duration': { waitsOn: 'owner (found at S7): MET-01-C Core "for 2 owner normal turns" against Progression "Duration 1 / 2 / 2 / 3 turns by mastery"', reading: 'Progression ladder (T8_FLAGS.coreVsProgression); gated only at Developing and Mastered, where the texts differ', abilities: ['MET-01-C'] },
  'fortress-storage-cap': { waitsOn: 'owner (found at S7): MET-06-C Core "store prevented HP damage up to20% maxHP" against Progression "Storage cap 10 / 15 / 20 / 25% maxHP by mastery"', reading: 'Progression ladder (T8_FLAGS.coreVsProgression); gated only where the texts differ (all tiers but Expert)', abilities: ['MET-06-C'] },
  'd14-dawn-song-target': { approved: 'N9c', waitsOn: 'D14 (open): "self only" or "self included"', reading: 'the active caster itself (T8_FLAGS.d14DawnSongTarget)', abilities: ['LIG-02-C'] },
  'clear-light-cooldown-unit': { approved: 'N9c', waitsOn: 'owner: "cooldown 5 turns fixed" names no unit', reading: 'owner normal turns (T8_FLAGS.clearLightCooldownUnit)', abilities: ['LIG-03-C'] },
  'd5-perk': { approved: 'N9c', waitsOn: 'D5 applicability for silent / deferred contracts (D16 question 3)', reading: 'T8_FLAGS.ordinaryPerks (plan readings); decisive only when the attacker is a Striker and the target is Shielded, or a Disruptor and the target is an active Tank', abilities: ['LIG-05-C', 'PSY-05-C', 'DAR-02-C', 'DAR-03-C', 'LIG-06-C', 'MET-04-C', 'ELE-04-C'] }, // PSY-06-C's own attack is literally "ordinary" (not gated; listed for review)
  'stone-divide-scope': { waitsOn: 'D16 questions 1-2: normal-action special strikes and non-attack-triggered reactions', reading: 'T8_FLAGS.stoneDivide (intercepted, the plan\'s extra-strike list)', abilities: ['EAR-05-C', 'EAR-04-C', 'LIG-04-C', 'NAT-04-C', 'PSY-06-C', 'FIR-04-C', 'EAR-02-C'] },
  'delayed-slot': { approved: 'N9c', waitsOn: 'reading of "lineup position, not combatant identity" against "Empty main slot" under one active fighter (FIR-03-C, FIR-06-C)', reading: 'the active position (T8_FLAGS.delayedSlot); disputed only when the launch target is no longer the active fighter at impact', abilities: ['FIR-03-C', 'FIR-06-C'] },
  'd8-cap-delayed': { waitsOn: 'D8 (open): pending delayed effects at the exchange cap', reading: 'discarded (T8_FLAGS.d8CapDelayed)', abilities: ['FIR-03-C', 'FIR-06-C'] },
  'feather-relay-voluntary': { approved: 'N9c', waitsOn: 'D3 follow-up: WIN-01-C does not say whether its rotation is voluntary for the enemy / owner rotation triggers', reading: 'treated as a voluntary rotation (plan D3 recommendation)', abilities: ['WIN-01-C', 'FIR-02-C', 'WAT-06-C', 'ICE-02-C', 'NAT-05-C'] },
});
export const provisionalPoint = (id) => { const p = PROVISIONAL_POINTS[id]; if (!p) throw new Error(`Unknown provisional point ${id}`); return p; };
