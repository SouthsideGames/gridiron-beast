// Beast Clash t8 (M4 S5-S11): the PROVISIONAL readings that change ability behaviour, each behind ONE switch so an owner ruling
// is a one-line change. Nothing here is an approved value: every entry names the open decision (docs/task8/M4_OPEN_ITEMS.md,
// M4_PLAN.md §5b) and lists the readings the sources allow. The chosen default is the plan's recommendation, or the contract's
// literal text where the plan is silent. Tests read this table so a default cannot be switched silently, and the ability modules
// read it through the helpers below rather than hard-coding a reading.
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

export const T8_FLAGS = deepFreeze({
  // D13 (open, §25 item 13). 'progression': the Progression ladders govern (Daybreak Lance 145/160/175/190, Clear Light 8/10/12/14 by
  // mastery); 'core': the Core flat value (160%, 10%) at every tier.
  d13ValuePrecedence: { value: 'progression', options: ['progression', 'core'], waitsOn: 'D13 (open)', abilities: ['LIG-06-C', 'LIG-03-C'] },
  // D14 (open, §25 item 14). 'self-only': the approved text literally ("Front ally, self only if actually front"): the caster is the
  // only front ally under one active fighter, so Dawn Song targets the active Solchirp itself. 'self-included' is listed because the
  // owner asked which was meant; under one active fighter both readings resolve to the same target (the caster).
  d14DawnSongTarget: { value: 'self-only', options: ['self-only', 'self-included'], waitsOn: 'D14 (open)', abilities: ['LIG-02-C'] },
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
    waitsOn: 'D5 reading for silent contracts (D16 question 3)',
    'LIG-05-C': false, // Radiant Pursuit: "retain normal-attack identity ... only where global perk policy permits (G06)"; plan: enhanced -> no
    'PSY-05-C': true,  // Mind Game trick attack: "Base attack normal damage"; D5 proposal names it ordinary -> pierce applies
    'PSY-06-C': true,  // Astralux's own follow-on attack: the contract calls it a "100% ordinary normal attack" (literal)
    'DAR-02-C': false, // Night Swoop: silent; plan reading excludes
    'DAR-03-C': false, // Predator Rhythm third strike: silent; plan reading excludes (strikes 1-2 are ordinary)
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
  delayedSlot: { value: 'active-position', options: ['active-position', 'lineup-index'], waitsOn: 'reading of FIR-03-C / FIR-06-C "lineup position", flagged' },
  // D8 (open): pending delayed impacts at the exchange cap. 'discard' (plan) | 'resolve' (impact before the HP-share tiebreak).
  d8CapDelayed: { value: 'discard', options: ['discard', 'resolve'], waitsOn: 'D8 (open)' },
  // Clear Light's "cooldown 5 turns fixed" names no unit (M4_OPEN_ITEMS.md D13 point 3). 'owner-turns' (every other Clash cooldown
  // counts owner normal turns) | 'recipient-turns'.
  clearLightCooldownUnit: { value: 'owner-turns', options: ['owner-turns', 'recipient-turns'], waitsOn: 'owner (unit silent)' },
  // D3 / Feather Relay (WIN-01-C): not built (M4_STATUS.md S4). 'unmet' leaves the hook with an explicit `unmet: owner decision` report;
  // 'built-no-penalty' and 'built-with-penalty' are the two readings the owner can choose between (not implemented until ruled).
  featherRelay: { value: 'unmet', options: ['unmet', 'built-no-penalty', 'built-with-penalty'], waitsOn: 'owner (D3 conditional; three questions in M4_STATUS.md S4)' },
});

/** The chosen reading of a single-valued flag. */
export const flag = (id) => { const f = T8_FLAGS[id]; if (!f || !('value' in f)) throw new Error(`No single-valued t8 flag ${id}`); return f.value; };
/** D5 perk applicability of an ability's own normal-action strike: the tag the strike should carry ('ordinary' keeps the perks). */
export const perkTag = (abilityId) => { const v = T8_FLAGS.ordinaryPerks[abilityId]; if (v === undefined) throw new Error(`No ordinary-perk reading for ${abilityId}`); return v ? 'ordinary' : 'special'; };
