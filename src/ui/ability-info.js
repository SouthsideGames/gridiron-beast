// Player-facing ability information (Task 8 M6). One source for every screen that names a monster's abilities: the Beast Dex
// ability records (src/data/beast-dex.js), never the retired legacy cards or shared traits. Each family has one football and one
// Beast Clash ability; a Basic family has none. Mastery is read from the individual's development record (spec §6): two
// independent records, the relevant mode's shown as the third progress bar beside level and shared training.
// Presentation only: nothing here is read by a simulation.
import { esc } from './dom.js';
import { abilitiesOf, familyById } from '../data/beast-dex.js';
import { THRESHOLDS, TIERS, tierIndex } from '../franchise/t8/mastery.js';
import { SPECS } from '../sim/abilities/review-texts.js';

export const MODES = Object.freeze(['football', 'clash']);
export const MODE_LABEL = Object.freeze({ football: 'Football', clash: 'Beast Clash' });
const SHOWN_SECTIONS = ['Trigger / eligibility', 'Targets / placement', 'Core resolution', 'Recharge / frequency', 'Lifetime / persistence', 'Exceptions / counterplay', 'Progression / notes'];
const SECTION_LABEL = { 'Trigger / eligibility': 'When it happens', 'Targets / placement': 'Who or where', 'Core resolution': 'What it does', 'Recharge / frequency': 'How often', 'Lifetime / persistence': 'How long it lasts', 'Exceptions / counterplay': 'Limits and counterplay', 'Progression / notes': 'Forms and mastery' };
const familyIdOf = (x) => (typeof x === 'string' ? x : x?.species || x?.familyId || x?.id || null);
/** The Dex mechanic line without the "ID: Name;" prefix some records carry. */
const tidy = (a) => String(a.mechanic || '').replace(new RegExp(`^${a.id}:\\s*${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};\\s*`), '');

/**
 * The ability a family has in `mode` ('football' | 'clash'), for display: { id, name, mode, category, summary, story, sections } or
 * null (a Basic family, or an unknown family). `x` is a family id, a species entry or a monster.
 */
export function abilityInfo(x, mode = 'football') {
  const id = familyIdOf(x); const a = id ? abilitiesOf(id)?.[mode] : null; if (!a) return null;
  const story = a.details?.find((d) => d.section === 'Ability story')?.rule || null;
  const summary = (mode === 'football' && SPECS[id]?.expect) || tidy(a);
  const sections = SHOWN_SECTIONS.map((s) => { const d = a.details?.find((x2) => x2.section === s); return d ? { label: SECTION_LABEL[s], text: d.rule } : null; }).filter(Boolean);
  return { id: a.id, name: a.name, mode, category: a.category, summary, story, sections };
}
/** True when the family has no abilities (a Basic). */
export const hasAbilities = (x) => { const id = familyIdOf(x); return !!(id && (abilitiesOf(id)?.football || abilitiesOf(id)?.clash)); };

/** Mastery of one mode for an individual: { credits, tier, index, next, need, pct, mastered }. Credits are valid uses (spec §6). */
export function masteryInfo(m, mode) {
  const credits = Math.max(0, Math.floor(m?.dev?.mastery?.[mode] || 0)); const index = tierIndex(credits); const mastered = index >= TIERS.length - 1;
  const from = THRESHOLDS[index]; const next = mastered ? null : THRESHOLDS[index + 1];
  return { credits, tier: TIERS[index], index, next, nextTier: mastered ? null : TIERS[index + 1], need: mastered ? 0 : next - credits, pct: mastered ? 100 : Math.floor((credits - from) / (next - from) * 100), mastered };
}
/** The mastery progress bar of one mode (the third bar). Empty string for a monster without an ability in that mode. */
export function masteryBarHtml(m, mode) {
  const a = abilityInfo(m, mode); if (!a || !m?.dev) return '';
  const k = masteryInfo(m, mode);
  return `<div class="row between dim t8-bar-label" data-bar="mastery" data-mode="${mode}"><span>${esc(a.name)} mastery (${MODE_LABEL[mode]})</span><span><b>${k.tier}</b>${k.mastered ? ' · MAX' : ` · ${k.credits}/${k.next} uses`}</span></div><div class="bar mastery" style="margin:2px 0 4px" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${k.pct}" aria-label="${esc(a.name)} mastery"><i style="width:${k.pct}%"></i></div>`;
}

/** One ability as a block: name, mode, summary, optional mastery line (for an individual) and the full Dex rules, collapsed. */
export function abilityBlockHtml(x, mode, { monster = null, seeIt = false } = {}) {
  const a = abilityInfo(x, mode); if (!a) return '';
  const k = monster?.dev ? masteryInfo(monster, mode) : null;
  return `<div class="ab-block" data-ability="${a.id}"><div class="row between" style="gap:6px"><b>${esc(a.name)}</b><span class="chip">${MODE_LABEL[mode]}</span></div>
    <p class="muted" style="margin:2px 0">${esc(a.summary)}</p>${a.story ? `<p class="dim" style="margin:2px 0;font-style:italic">${esc(a.story)}</p>` : ''}
    ${k ? `<div class="dim" style="font-size:12px">Mastery: <b>${k.tier}</b>${k.mastered ? ' (highest tier)' : ` · ${k.need} more valid use${k.need === 1 ? '' : 's'} to ${k.nextTier}`}</div>` : ''}
    <details class="ab-rules"><summary class="muted" style="cursor:pointer">Full rules</summary>${a.sections.map((s) => `<p style="margin:4px 0"><b>${s.label}.</b> <span class="muted">${esc(s.text)}</span></p>`).join('')}</details>
    ${seeIt && mode === 'football' ? `<button class="btn small see-it" data-see-it="${esc(familyIdOf(x))}" data-form="${monster?.stage ?? ''}" data-mastery="${k ? k.index : 0}">▶ See It</button>` : ''}</div>`;
}
/** Both abilities of a family or monster, or the plain statement that a Basic has none. */
export function abilitiesHtml(x, opts = {}) {
  if (!hasAbilities(x)) { const fam = familyById(familyIdOf(x)); return `<p class="dim" data-ability="none">${fam?.rarity === 'basic' ? 'Basic families have no signature ability in football or Beast Clash.' : 'No signature ability.'}</p>`; }
  return MODES.map((mode) => abilityBlockHtml(x, mode, opts)).join('');
}
