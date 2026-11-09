// Beast Clash t8 (M4 S5; plan §3.6, D16): the ability-kind metadata table, one row per Clash ability. It is the table the owner
// reviews (D16, "approved process"; the 72-row review table is docs/task8/M4_OPEN_ITEMS.md §D16). Stone Divide ("extra strike"),
// Eye of the Storm ("ready, repeatable signature"), Circuit Breaker and Fresh Start ("running cooldown"), the no-chain rule and the
// D5 ordinary-only perk rule all read it; nothing guesses from an animation (EAR-05-C). Every row is checked against the Dex by
// tests/clash/t8-kinds.test.js (id, family, name; each strike key appears in the contract text).
//
// Fields:
//   action     normal-action replacement | enhanced normal attack | attack modifier | passive | reaction | entry | reserveWindow |
//              team action | delayed | construct | transfer | revive | split | support
//   repeat     'repeatable' (cooldown or counter) | 'once' (once per Clash) | 'passive' (no use ledger)
//   signature  true when Eye of the Storm may restrict it: a READY, REPEATABLE signature that replaces or enhances the normal action
//              ("Cannot suppress passives, entry effects, reactions, launched effects or once-Clash legendary casts")
//   cooldown   the unit the recharge counts: 'owner-turns' | 'performed-attacks' | 'charges' | 'entry' | 'none'
//   strikes    the strikes the ability itself produces: { key, tag, extra, perks }. tag is the attack-kind tag the engine uses;
//              extra = an "extra strike" for Stone Divide (plan D16 definition; the contested ones also carry `contested`);
//              perks = whether the D5 ordinary-only perks apply (from T8_FLAGS.ordinaryPerks where the contract is silent)
//   review     'ok' | 'needs owner review' (the 22 rows the D16 table flags), with the note
import { T8_FLAGS } from './flags.js';

const P = T8_FLAGS.ordinaryPerks;
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };
const row = (id, family, name, batch, action, repeat, cooldown, strikes, extra = {}) => ({ id, family, name, batch, action, repeat, signature: !!extra.signature, cooldown, strikes, review: extra.review || 'ok', note: extra.note || null, flag: extra.flag || null });
const S = (key, tag, extra, perks, more = {}) => ({ key, tag, extra, perks, ...more });

export const ABILITY_KINDS = deepFreeze([
  row('FIR-01-C', 'emberfox', 'Stoke the Flame', 'D', 'reaction', 'repeatable', 'charges', [S('counterburst', 'reaction', true, false)]),
  row('FIR-02-C', 'ashkit', 'Cinder Clamp', 'E', 'attack modifier', 'repeatable', 'owner-turns', [S('normal direct attack', 'ordinary', false, P['FIR-02-C'])], { flag: 'ordinaryPerks' }),
  row('FIR-03-C', 'firestorm', 'Falling Star', 'S5', 'delayed', 'once', 'none', [S('main hit', 'delayed', false, false), S('splash', 'delayed', false, false)]),
  row('FIR-04-C', 'cinderclaw', 'Molten Brand', 'D', 'reaction', 'once', 'none', [S('eruption', 'reaction', true, false, { contested: 'nonAttackTriggeredReactions' })], { review: 'needs owner review', note: 'Stone Divide names "attack-based retaliation"; whether a mark-triggered eruption counts is not stated', flag: 'stoneDivide.nonAttackTriggeredReactions' }),
  row('FIR-05-C', 'pyrelynx', 'Heat Mirage', 'D', 'entry', 'repeatable', 'owner-turns', []),
  row('FIR-06-C', 'pyroclast', 'Faultline', 'F', 'delayed', 'once', 'none', [S('eruption', 'delayed', false, false)]),
  row('WAT-01-C', 'tidepaw', 'Second Tide', 'C', 'normal-action replacement', 'repeatable', 'performed-attacks', [], { signature: true }),
  row('WAT-02-C', 'mudcub', 'Shared Burden', 'S5', 'split', 'once', 'none', []),
  row('WAT-03-C', 'reefclaw', 'Shell Renewal', 'B', 'passive', 'once', 'none', [], { review: 'needs owner review', note: 'a self-cleanse placed in "protection" (fits loosely)' }),
  row('WAT-04-C', 'tidefin', 'Wash Away', 'F', 'normal-action replacement', 'once', 'none', []),
  row('WAT-05-C', 'wavehorn', 'Riptide Charge', 'E', 'enhanced normal attack', 'repeatable', 'performed-attacks', [S('charged', 'special', false, false)], { signature: true }),
  row('WAT-06-C', 'tsunarok', 'Riptide Pursuit', 'E', 'reaction', 'repeatable', 'entry', [S('pursuit', 'reaction', true, false, { undodgeable: true })]),
  row('NAT-01-C', 'thornkit', 'Second Spring', 'C', 'revive', 'once', 'none', []),
  row('NAT-02-C', 'mossclaw', 'Spore Detonation', 'A', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('connected attack', 'special', false, false)], { signature: true }),
  row('NAT-03-C', 'rootram', 'Last Root', 'D', 'passive', 'once', 'none', []),
  row('NAT-04-C', 'leafhorn', 'Canopy Assist', 'E', 'normal-action replacement', 'once', 'none', [S('assist', 'assist', true, false, { contested: 'normalActionSpecialStrikes' })], { review: 'needs owner review', note: 'placed in rotation/lineup although no rotation occurs; the strike replaces Florant\'s normal action, so it may be a "normal-action special", which Stone Divide excludes', flag: 'stoneDivide.normalActionSpecialStrikes' }),
  row('NAT-05-C', 'thornback', 'Shell Harvest', 'B', 'entry', 'once', 'none', []),
  row('NAT-06-C', 'elderoot', 'Root Communion', 'C', 'transfer', 'once', 'none', []),
  row('ELE-01-C', 'flicker', 'Lightning Rod', 'C', 'transfer', 'once', 'none', []),
  row('ELE-02-C', 'voltfin', 'Arc Rebound', 'D', 'reaction', 'repeatable', 'owner-turns', [S('rebound', 'reaction', true, false)]),
  row('ELE-03-C', 'voltfang', 'Phase Strike', 'A', 'enhanced normal attack', 'once', 'none', [S('special', 'special', false, false)]),
  row('ELE-04-C', 'stormlynx', 'Circuit Breaker', 'F', 'enhanced normal attack', 'once', 'none', [S('attack', P['ELE-04-C'] ? 'ordinary' : 'special', false, P['ELE-04-C'])], { review: 'needs owner review', note: 'the contract is silent on pierce; at tier 1 the hit is 100%, the same as an ordinary attack', flag: 'ordinaryPerks' }),
  row('ELE-05-C', 'joltrex', 'Victory Surge', 'D', 'reaction', 'once', 'none', [S('follow-up', 'followUp', true, false)]),
  row('ELE-06-C', 'stormcrown', 'Twin Thunder', 'D', 'construct', 'once', 'none', [S('bolt', 'followUp', true, false)]),
  row('EAR-01-C', 'pebble', 'Emergency Cover', 'D', 'reaction', 'once', 'none', []),
  row('EAR-02-C', 'rockram', 'Rubble Reprisal', 'D', 'reaction', 'repeatable', 'owner-turns', [S('rock', 'reaction', true, false, { contested: 'nonAttackTriggeredReactions' })], { review: 'needs owner review', note: 'not a "follow-up or attack retaliation" in Stone Divide\'s wording (triggered by healing, not by an attack)', flag: 'stoneDivide.nonAttackTriggeredReactions' }),
  row('EAR-03-C', 'boulderox', 'Unbroken Charge', 'D', 'enhanced normal attack', 'once', 'none', [S('charge', 'special', false, false, { undodgeable: true })], { review: 'needs owner review', note: 'an enhanced attack placed in reactions/survival' }),
  row('EAR-04-C', 'stoneguard', 'Bank Shot', 'A', 'enhanced normal attack', 'once', 'none', [S('primary', 'special', false, false), S('ricochet', 'followUp', true, false, { contested: 'normalActionSpecialStrikes' })], { review: 'needs owner review', note: 'the ricochet happens inside Granigor\'s normal action. Plan D16 calls it an extra strike; Stone Divide excludes "normal-action specials"', flag: 'stoneDivide.normalActionSpecialStrikes' }),
  row('EAR-05-C', 'terrabull', 'Stone Divide', 'D', 'reaction', 'once', 'none', []),
  row('EAR-06-C', 'titanolith', 'Mountain Shelter', 'B', 'normal-action replacement', 'once', 'none', []),
  row('ICE-01-C', 'snowmoth', 'Fresh Start', 'C', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('ICE-02-C', 'hailfang', 'Cold Welcome', 'E', 'reaction', 'repeatable', 'owner-turns', []),
  row('ICE-03-C', 'frostclaw', 'Snowbank Shot', 'B', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('snowball', 'special', false, false)], { signature: true, review: 'needs owner review', note: 'placed in protection, but the core is an enhanced attack, and R6 counts it as an explicit miss source' }),
  row('ICE-04-C', 'icehorn', 'Snowdrift Shelter', 'B', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('ICE-05-C', 'glaciron', 'Glacier Wall', 'B', 'entry', 'once', 'none', []),
  row('ICE-06-C', 'glacivern', 'Deep Winter', 'F', 'normal-action replacement', 'once', 'none', []),
  row('WIN-01-C', 'gustling', 'Feather Relay', 'E', 'team action', 'once', 'none', [], { note: 'D3 reconciled 2026-11-09: a rotation without the P8 penalty; voluntary status for the rotation triggers unaddressed', flag: 'featherRelayVoluntary' }),
  row('WIN-02-C', 'breezefang', 'Gust Hop', 'A', 'enhanced normal attack', 'repeatable', 'performed-attacks', [S('two-hit leap', 'special', false, false)], { signature: true, review: 'needs owner review', note: 'the plan\'s extra-strike list omits the second hit, consistent with "one performed attack"; confirm' }),
  row('WIN-03-C', 'skywarden', 'Downdraft', 'E', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('WIN-04-C', 'windlynx', 'Second Wind', 'E', 'reserveWindow', 'once', 'none', [], { review: 'needs owner review', note: 'placed in rotation/lineup although it changes initiative and no rotation occurs' }),
  row('WIN-05-C', 'zephyr', 'Tailwind Pact', 'B', 'normal-action replacement', 'once', 'none', []),
  row('WIN-06-C', 'tempestra', 'Eye of the Storm', 'F', 'normal-action replacement', 'once', 'none', []),
  row('DAR-01-C', 'shadowkit', 'Shadow Pounce', 'D', 'reaction', 'once', 'none', [S('counter', 'counter', true, false)]),
  row('DAR-02-C', 'nightowl', 'Night Swoop', 'A', 'enhanced normal attack', 'once', 'none', [S('first normal attack', P['DAR-02-C'] ? 'ordinary' : 'special', false, P['DAR-02-C'])], { review: 'needs owner review', note: 'the contract is silent on Striker perks; the plan\'s reading excludes them', flag: 'ordinaryPerks' }),
  row('DAR-03-C', 'duskrunner', 'Predator Rhythm', 'A', 'attack modifier', 'repeatable', 'performed-attacks', [S('third strike', P['DAR-03-C'] ? 'ordinary' : 'special', false, P['DAR-03-C'])], { signature: true, review: 'needs owner review', note: 'the contract is silent on perks (strikes 1-2 ordinary; strike 3 per the flag)', flag: 'ordinaryPerks' }),
  row('DAR-04-C', 'mireclaw', 'Ambush', 'A', 'enhanced normal attack', 'once', 'entry', [S('boost', 'special', false, false)]),
  row('DAR-05-C', 'nocturne', 'Eclipse Call', 'F', 'reserveWindow', 'once', 'none', []),
  row('DAR-06-C', 'nyxshade', 'Eclipse Theft', 'F', 'transfer', 'once', 'none', []),
  row('LIG-01-C', 'glimmer', 'Glow Mend', 'C', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('LIG-02-C', 'sunwhistle', 'Dawn Song', 'C', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true, review: 'needs owner review', note: 'target open (D14): "Front ally, self only if actually front" resolves to the caster under one active fighter', flag: 'd14DawnSongTarget' }),
  row('LIG-03-C', 'lumen', 'Clear Light', 'C', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true, review: 'needs owner review', note: 'values open (D13): Core 10% against Progression 8/10/12/14; cooldown unit unstated', flag: 'd13ValuePrecedence, clearLightCooldownUnit' }),
  row('LIG-04-C', 'prism', 'Refraction', 'A', 'enhanced normal attack', 'repeatable', 'performed-attacks', [S('primary', 'special', false, false), S('secondary', 'followUp', true, false, { contested: 'normalActionSpecialStrikes' })], { signature: true, review: 'needs owner review', note: 'same issue as Bank Shot; the secondary is part of a normal-action special', flag: 'stoneDivide.normalActionSpecialStrikes' }),
  row('LIG-05-C', 'halofang', 'Radiant Pursuit', 'A', 'attack modifier', 'passive', 'none', [S('conditional attack', P['LIG-05-C'] ? 'ordinary' : 'special', false, P['LIG-05-C'])], { review: 'needs owner review', note: 'the contract leaves Striker shield-break open (G06); the D5 proposal\'s exclusion of "every enhanced" attack would deny it', flag: 'ordinaryPerks' }),
  row('LIG-06-C', 'aurelion', 'Daybreak Lance', 'A', 'enhanced normal attack', 'once', 'none', [S('lance', P['LIG-06-C'] ? 'ordinary' : 'special', false, P['LIG-06-C'])], { review: 'needs owner review', note: 'the contract is silent on perks; damage value open (D13)', flag: 'ordinaryPerks, d13ValuePrecedence' }),
  row('MET-01-C', 'ironcub', 'Forge Swipe', 'B', 'passive', 'repeatable', 'performed-attacks', [S('triggering attack', 'ordinary', false, P['MET-01-C'])], { flag: 'ordinaryPerks' }),
  row('MET-02-C', 'steelpaw', 'Tempered Guard', 'B', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('MET-03-C', 'gearwing', 'Gear Shot', 'A', 'passive', 'passive', 'none', [S('performed normal attack', 'ordinary', false, P['MET-03-C'])], { flag: 'ordinaryPerks' }),
  row('MET-04-C', 'ironjaw', 'Iron Bite', 'A', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('bite', P['MET-04-C'] ? 'ordinary' : 'special', false, P['MET-04-C'])], { signature: true, review: 'needs owner review', note: 'the contract is silent on the Striker perk; the plan (§5c) gives the reading', flag: 'ordinaryPerks' }),
  row('MET-05-C', 'metalhorn', 'Shield Wall', 'B', 'normal-action replacement', 'repeatable', 'owner-turns', [], { signature: true }),
  row('MET-06-C', 'aegistron', 'Fortress', 'B', 'normal-action replacement', 'once', 'none', []),
  row('PSY-01-C', 'mindwing', 'Mind Mend', 'C', 'transfer', 'repeatable', 'owner-turns', [], { signature: true }),
  row('PSY-02-C', 'shadewisp', 'Mirage Veil', 'B', 'reaction', 'repeatable', 'owner-turns', []),
  row('PSY-03-C', 'cerebrix', 'Foresight', 'F', 'normal-action replacement', 'once', 'none', []),
  row('PSY-04-C', 'echolot', 'Echo Strike', 'A', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('enhanced normal attack', 'special', false, false)], { signature: true, note: 'moot in practice (Balanced has no offensive perk); the contract defers to reconciliation' }),
  row('PSY-05-C', 'enigmane', 'Mind Game', 'D', 'attack modifier', 'repeatable', 'charges', [S('trick attack', P['PSY-05-C'] ? 'ordinary' : 'special', false, P['PSY-05-C'])], { review: 'needs owner review', note: 'Disruptor pierce depends on it; the contract defers to "final shared reconciliation"', flag: 'ordinaryPerks' }),
  row('PSY-06-C', 'astralux', 'Astral Strike', 'F', 'normal-action replacement', 'once', 'none', [S('commanded', 'commanded', true, false, { contested: 'normalActionSpecialStrikes' }), S('own attack', P['PSY-06-C'] ? 'ordinary' : 'special', false, P['PSY-06-C'])], { review: 'needs owner review', note: 'whether Astralux\'s own attack gets the Striker perk; the commanded attacks sit inside its normal action (Stone Divide question); not a delayed attack', flag: 'ordinaryPerks, stoneDivide.normalActionSpecialStrikes' }),
  row('DRA-01-C', 'drakeling', 'Dragon Pounce', 'A', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('enhanced attack', 'special', false, false)], { signature: true }),
  row('DRA-02-C', 'wyrmkit', 'Coil Renewal', 'C', 'passive', 'repeatable', 'performed-attacks', [S('triggering attack', 'ordinary', false, P['DRA-02-C'])], { flag: 'ordinaryPerks' }),
  row('DRA-03-C', 'sablewing', 'Wing Shelter', 'C', 'reaction', 'repeatable', 'owner-turns', []),
  row('DRA-04-C', 'scaleguard', 'Dragonhide', 'B', 'entry', 'once', 'none', [S('conversion', 'special', false, false)], { review: 'needs owner review', note: 'dual kind; placed in B, but the payoff is an enhanced attack' }),
  row('DRA-05-C', 'vyrnax', 'Dragon Roar', 'A', 'enhanced normal attack', 'once', 'none', [S('roar', 'special', false, false)]),
  row('DRA-06-C', 'aurodrax', 'Sovereign Balance', 'A', 'enhanced normal attack', 'repeatable', 'owner-turns', [S('HighHP attack', 'special', false, false)], { signature: true, review: 'needs owner review', note: 'dual kind; the low-HP branch is protection' }),
]);

const BY_ID = new Map(ABILITY_KINDS.map((r) => [r.id, r]));
const BY_FAMILY = new Map(ABILITY_KINDS.map((r) => [r.family, r]));
export const kindOf = (abilityId) => BY_ID.get(abilityId) || null;
export const kindOfFamily = (family) => BY_FAMILY.get(family) || null;

/** Tags that are extra strikes by definition (plan D16): every damaging strike that is not the attacker's own normal-action attack. */
const EXTRA_TAGS = new Set(['reaction', 'counter', 'followUp', 'commanded', 'assist']);
/**
 * Is this strike an "extra strike" for Stone Divide (EAR-05-C)? `spec` is the engine's strike spec: { tag, abilityId, strikeKey? }.
 * Ordinary attacks, normal-action specials, delayed impacts, DOT and transferred damage are never extra strikes. The contested
 * strikes read their T8_FLAGS.stoneDivide switch.
 */
export function isExtraStrike(spec) {
  if (!EXTRA_TAGS.has(spec.tag)) return false;
  const k = spec.abilityId ? kindOf(spec.abilityId) : null;
  const s = k?.strikes.find((x) => (spec.strikeKey ? x.key === spec.strikeKey : x.tag === spec.tag));
  if (s?.contested) return !!T8_FLAGS.stoneDivide[s.contested];
  return true;
}
/**
 * The Stone Divide classification of a strike without applying any provisional switch: { extra, contested } where `contested` names the
 * T8_FLAGS.stoneDivide key when the strike is one of the six the owner has not ruled on (PROVISIONAL_POINTS['stone-divide-scope']).
 */
export function strikeClass(spec) {
  if (!EXTRA_TAGS.has(spec.tag)) return { extra: false, contested: null };
  const k = spec.abilityId ? kindOf(spec.abilityId) : null;
  const s = k?.strikes.find((x) => (spec.strikeKey ? x.key === spec.strikeKey : x.tag === spec.tag));
  return { extra: true, contested: s?.contested || null };
}
/** Does Eye of the Storm (WIN-06-C) restrict this ability: a ready, repeatable signature that replaces or enhances the normal action? */
export const restrictable = (abilityId) => !!kindOf(abilityId)?.signature;
