// Task 7 — free-agent personality priorities (decisions 2, 4, 13, 15, 16, 25, 26, 29).
//
// Six priorities on a 0–100 scale: money, security (contract years), role (likely playing time), winning (club success), patience
// (tolerance for low offers and waiting) and timing (how long he waits for the market before signing). Each monster has his own
// base values, fixed by his identity (a hash of his id) and nudged by his nature; they evolve with his career stage, read from his
// age and his public decline onset (the same onset Task 6 shows): a rising player wants a role, a player in his prime wants money,
// a veteran past his onset wants security and a winner. Nothing is stored and no random number is drawn: the same monster at the
// same age always has the same priorities, so negotiations are reproducible and old saves need no migration.
import { hashString } from '../core/rng.js';
import { publicOnset } from '../data/aging.js';
import { t as $t } from '../text/index.js';

export const PRIORITIES = Object.freeze(['money', 'security', 'role', 'winning', 'patience', 'timing']);
export const PRIORITY_LABEL = Object.freeze({ money: 'Money', security: 'Security', role: 'Playing time', winning: 'Winning', patience: 'Patience', timing: $t('franchise.takes_his_time') });
const CALM = new Set(['calm', 'patient', 'disciplined', 'sturdy', 'balanced', 'secure', 'protective', 'resistant', 'focused', 'cerebral']); // contracts.js acceptsCounter groups
const FIERY = new Set(['powerful', 'ferocious', 'aggressive', 'explosive', 'gifted']);
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

/** 'rising' (25 or under, before his onset), 'prime', or 'veteran' (at or past his public onset). Legendaries never age: 'prime'. */
export function careerStage(m) {
  if (!m || m.age == null) return 'prime';
  let onset = Infinity; try { onset = publicOnset(m); } catch { /* unknown position */ }
  if (m.legendary || m.signature) return 'prime';
  if (m.age >= onset) return 'veteran';
  if (m.age <= 25) return 'rising';
  return 'prime';
}
const STAGE = Object.freeze({
  rising: { role: 15, winning: -5, security: -5, money: 0 },
  prime: { money: 10 },
  veteran: { winning: 15, security: 15, money: -5, role: -10 },
});

/** The monster's priorities now ({ money, security, role, winning, patience, timing }, 0–100), plus his stage and strongest priority. */
export function personaOf(m) {
  const h = hashString(`persona|${m?.id || m?.name || 'x'}`);
  const base = {}; PRIORITIES.forEach((k, i) => { base[k] = 25 + ((h >>> (i * 5)) % 51); }); // 25–75, a different slice of the hash each
  // Nature's calm/fiery terms are retired (N7c B14); hash priorities and career stage remain.
  const stage = careerStage(m); for (const [k, v] of Object.entries(STAGE[stage])) base[k] += v;
  const p = Object.fromEntries(PRIORITIES.map((k) => [k, clamp(base[k])]));
  const strongest = ['money', 'security', 'role', 'winning'].sort((a, b) => p[b] - p[a] || (a < b ? -1 : 1))[0]; // a want, not a temperament
  return { ...p, stage, strongest };
}
/** Offer response window in period advances (audit resolution 4): 1–3, longer for the patient. */
export const responseWindow = (m) => { const p = personaOf(m).patience; return p >= 66 ? 3 : p >= 40 ? 2 : 1; };
