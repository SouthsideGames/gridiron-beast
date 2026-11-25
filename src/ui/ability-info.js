import { plainAbilityRule } from '../text/ability-rules-plain.js';
import { CLASH_SIMPLE, FOOTBALL_SIMPLE } from '../text/clash-simple.js';
// Player-facing ability information (Task 8 M6). One source for every screen that names a monster's abilities: the Beast Dex
// ability records (src/data/beast-dex.js), never the retired legacy cards or shared traits. Each family has one football and one
// Beast Clash ability; a Basic family has none. Mastery is read from the individual's development record (spec §6): two
// independent records, the relevant mode's shown as the third progress bar beside level and shared training.
// Presentation only: nothing here is read by a simulation.
import { esc } from './dom.js';
import { abilitiesOf, familyById, abilityById } from '../data/beast-dex.js';
import { THRESHOLDS, TIERS, tierIndex } from '../franchise/t8/mastery.js';
import { SPECS } from '../sim/abilities/review-texts.js';
import { t as $t } from '../text/index.js';
import { dexLine, dexKey } from '../text/dex.js';

const ABILITY_TERMS = Object.freeze([
  [$t('shared.ability_term_0_name'), $t('shared.ability_term_0_help')],
  [$t('shared.ability_term_1_name'), $t('shared.ability_term_1_help')],
  [$t('shared.ability_term_2_name'), $t('shared.ability_term_2_help')],
  [$t('shared.ability_term_3_name'), $t('shared.ability_term_3_help')],
  [$t('shared.ability_term_4_name'), $t('shared.ability_term_4_help')],
  [$t('shared.ability_term_5_name'), $t('shared.ability_term_5_help')],
  [$t('shared.ability_term_6_name'), $t('shared.ability_term_6_help')],
  [$t('shared.ability_term_7_name'), $t('shared.ability_term_7_help')],
  [$t('shared.ability_term_8_name'), $t('shared.ability_term_8_help')],
  [$t('shared.ability_term_9_name'), $t('shared.ability_term_9_help')],
  [$t('shared.ability_term_10_name'), $t('shared.ability_term_10_help')],
  [$t('shared.ability_term_11_name'), $t('shared.ability_term_11_help')],
  [$t('shared.ability_term_12_name'), $t('shared.ability_term_12_help')],
  [$t('shared.ability_term_13_name'), $t('shared.ability_term_13_help')],
]);

export const MODES = Object.freeze(['football', 'clash']);
export const MODE_LABEL = Object.freeze({ football: $t('shared.football'), clash: $t('shared.beast_clash') });
const SHOWN_SECTIONS = ['Trigger / eligibility', 'Targets / placement', 'Core resolution', 'Recharge / frequency', 'Lifetime / persistence', 'Exceptions / counterplay', 'Progression / notes']; // the Dex's section ids, never shown: SECTION_LABEL holds the wording
const SECTION_LABEL = { 'Trigger / eligibility': $t('shared.when_it_happens'), 'Targets / placement': $t('shared.who_or_where'), 'Core resolution': $t('shared.what_it_does'), 'Recharge / frequency': $t('shared.how_often'), 'Lifetime / persistence': $t('shared.how_long_it_lasts'), 'Exceptions / counterplay': $t('shared.limits_and_counterplay'), 'Progression / notes': $t('shared.forms_and_mastery') };
const familyIdOf = (x) => (typeof x === 'string' ? x : x?.species || x?.familyId || x?.id || null);
/** The Dex mechanic line without the "ID: Name;" prefix some records carry. */
const tidy = (a) => String(a.mechanic || '').replace(new RegExp(`^${a.id}:\\s*${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};\\s*`), '');

/**
 * The ability a family has in `mode` ('football' | 'clash'), for display: { id, name, mode, category, summary, story, sections } or
 * null (a Basic family, or an unknown family). `x` is a family id, a species entry or a monster.
 */
export function abilityInfo(x, mode = 'football') {
  const id = familyIdOf(x); const a = id ? abilitiesOf(id)?.[mode] : null; if (!a) return null;
  const rule = (section) => { const d = a.details?.find((x2) => x2.section === section); return d ? dexLine(dexKey.abilityRule(a.id, section), d.rule) : null; }; // shown through the central text (src/text/dex.js)
  const story = rule('Ability story');
  const summary = mode === 'clash' && CLASH_SIMPLE[a.id] ? dexLine(dexKey.abilityPlain(a.id), CLASH_SIMPLE[a.id]) : mode === 'football' && SPECS[id]?.expect ? dexLine(dexKey.abilitySummary(id), SPECS[id].expect) : dexLine(dexKey.abilityMechanic(a.id), tidy(a));
  const sections = SHOWN_SECTIONS.map((s) => { const raw = a.details?.find(d => d.section === s)?.rule; const text = raw ? dexLine(dexKey.abilityReadableRule(a.id, s), plainAbilityRule(raw)) : null; return text ? { label: SECTION_LABEL[s], text } : null; }).filter(Boolean);
  return { id: a.id, name: dexLine(dexKey.abilityName(a.id), a.name), mode, category: a.category, summary, story, sections };
}
/**
 * The ability in a sentence or two a young player can read (owner 2026-11-24: the match's Inspect panel shows no codes, counts
 * or timings; the Dex keeps the full rules). The plain "what it does" rule, cut to its first two sentences; else the summary.
 */
export function simpleAbilityText(abilityId) {
  const a = abilityById(abilityId); if (!a) return '';
  if (FOOTBALL_SIMPLE[a.id]) return dexLine(dexKey.abilityPlain(a.id), FOOTBALL_SIMPLE[a.id]);
  const info = abilityInfo(a.familyId, a.mode || 'football'); if (!info) return '';
  const what = info.sections.find((x) => x.label === SECTION_LABEL['Core resolution'])?.text || info.summary || '';
  const clean = String(what).replace(/\b[A-Z]{3}-\d{2}-[A-Z]\b:?\s*/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, 2).join(' ').trim();
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
  return `<div class="row between dim t8-bar-label" data-bar="mastery" data-mode="${mode}"><span>${$t('shared.mastery', { name: esc(a.name), modeLabel: MODE_LABEL[mode] })}</span><span><b>${k.tier}</b>${k.mastered ? $t('shared.max') : ` · ${k.credits}/${k.next} uses`}</span></div><div class="bar mastery" style="margin:2px 0 4px" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${k.pct}" aria-label="${esc(a.name)} mastery"><i style="width:${k.pct}%"></i></div>`;
}

/** A Dex 2.0 scouting line reads as a sentence (the registry's short Clash summaries are fragments). Wording is unchanged. */
const sentence = (t) => { const x = String(t || '').trim(); return x ? x[0].toUpperCase() + x.slice(1) + (/[.!?]$/.test(x) ? '' : '.') : x; };
/** One ability as a block: name, mode, summary, optional mastery line (for an individual) and the full Dex rules, collapsed. */
export function abilityBlockHtml(x, mode, { monster = null, seeIt = false, dex2 = false } = {}) {
  const a = abilityInfo(x, mode); if (!a) return '';
  const k = monster?.dev ? masteryInfo(monster, mode) : null;
  return `<div class="ab-block" data-ability="${a.id}"><div class="row between" style="gap:6px"><b>${esc(a.name)}</b><span class="chip">${MODE_LABEL[mode]}</span></div>
    <p class="muted" style="margin:2px 0">${esc(dex2 ? sentence(a.summary) : a.summary)}</p>${a.story && mode !== 'clash' ? `<p class="dim" style="margin:2px 0;font-style:italic">${esc(a.story)}</p>` : ''}
    ${k ? `<div class="dim" style="font-size:12px">${$t('shared.mastery_b_b', { tier: k.tier })}${k.mastered ? $t('shared.highest_tier') : ` ${$t('shared.more_valid_uses_to', { need: k.need, nextTier: k.nextTier, n: k.need })}`}</div>` : ''}
    <details class="ab-rules"><summary class="muted" style="cursor:pointer">${dex2 ? 'Exact mechanics — View details' : $t('shared.full_rules')}</summary>${mode === 'clash' && a.story ? `<p class="dim">${esc(a.story)}</p>` : ''}${a.sections.map(s => `<section class="ab-detail-section"><h4>${s.label}</h4><ul>${s.text.split('\n').filter(Boolean).map(line => `<li>${esc(line)}</li>`).join('')}</ul></section>`).join('')}<details><summary>${$t('shared.ability_words_mean')}</summary>${ABILITY_TERMS.map(([term, meaning]) => `<p><b>${esc(term)}:</b> ${esc(meaning)}</p>`).join('')}</details></details>
    ${seeIt && mode === 'football' ? `<button class="btn small see-it" data-see-it="${esc(familyIdOf(x))}" data-form="${monster?.stage ?? ''}" data-mastery="${k ? k.index : 0}">${$t('shared.see_it')}</button>` : ''}</div>`;
}
/** Both abilities of a family or monster, or the plain statement that a Basic has none. */
export function abilitiesHtml(x, opts = {}) {
  if (!hasAbilities(x)) { const fam = familyById(familyIdOf(x)); return `<p class="dim" data-ability="none">${fam?.rarity === 'basic' ? $t('shared.basic_families_have_no_signature_ability') : $t('shared.no_signature_ability')}</p>`; }
  return MODES.map((mode) => abilityBlockHtml(x, mode, opts)).join('');
}
