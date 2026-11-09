// Task 8 M4: small helpers shared by the Clash contract modules. No rule of its own: each module's header names its rules.
import { formById } from '../../data/beast-dex.js';

/** Evolution stage from a form id ('family:stage'). */
export const stageOf = (form) => formById(form)?.stage ?? Number(String(form).split(':')[1] || 0);
/** A value by mastery tier 0..3 (clamped). */
export const byTier = (arr, tier) => arr[Math.max(0, Math.min(arr.length - 1, tier || 0))];
/** A value by form stage (clamped). */
export const byStage = (arr, stage) => arr[Math.max(0, Math.min(arr.length - 1, stage || 0))];
export const pct = (n) => n / 100;
export const hpPct = (v) => v.hp / v.maxHp;
/** Direct-damage attack tags (an attack a defender "survives"): everything but DOT and transferred shares. */
export const DIRECT_TAGS = Object.freeze(['ordinary', 'special', 'followUp', 'delayed', 'assist', 'commanded']);
export const isDirect = (tag) => DIRECT_TAGS.includes(tag);
/** A normal-action attack (the attacker's own ordinary or special attack). */
export const isNormal = (tag) => tag === 'ordinary' || tag === 'special';
/** Is `other` (a view) an enemy of `self`? */
export const enemyOf = (api, self, otherId) => { const o = api.get(otherId); return !!o && o.side !== self.side; };
/** Lowest HP percentage among views, ties by the given (stable lineup) order. */
export const lowestHpPct = (views) => views.reduce((best, v) => (!best || hpPct(v) < hpPct(best) ? v : best), null);
export const injured = (v) => v.hp < v.maxHp;
/** The reviewer's unmet report for a hook: `{ unmet: [{ condition, detail }] }`. */
export const unmet = (...conds) => ({ unmet: conds.map((c) => (typeof c === 'string' ? { condition: c } : c)) });
/** Able to act: not held by a Stunned skip (an active on its D4-protected turn is able). */
export const able = (v) => !!v && !v.koed && (!v.stunned || v.stunProtected);
/** Is the slot a harmful status that an ordinary cleanse removes? */
export const removableHarmful = (slot) => !!slot && ['stunned', 'slowed', 'afflicted', 'weakened', 'confused', 'healingReduced'].includes(slot.id) && !slot.payload?.uncleansable;
export const BENEFICIAL = Object.freeze(['shielded', 'empowered', 'quickened', 'guarded']);
export const isHarmful = (slot) => !!slot && !BENEFICIAL.includes(slot.id);

/**
 * D5 perk gate for a contract silent on the ordinary-only perks (PROVISIONAL_POINTS['d5-perk']; owner ruling 2026-11-09 rule 1).
 * When the perk cannot change the hit (no Striker-vs-Shielded, no Disruptor-vs-active-Tank), the strike proceeds as a special with no
 * reading involved. When it would change the hit: normal gameplay reports `awaiting ruling` and returns { ok: false } (the caller makes
 * the ordinary attack and preserves its use); provisional mode applies T8_FLAGS.ordinaryPerks and returns its tag.
 */
export function perkGate(api, self, foeId, tagFor) {
  if (!api.perkDecisive(self, foeId)) return { ok: true, tag: 'special', decisive: false };
  if (!api.provisional(self, 'd5-perk', `${api.get(foeId).name} makes the ordinary-only perk decisive for this strike`)) return { ok: false, decisive: true };
  return { ok: true, tag: tagFor, decisive: true };
}
