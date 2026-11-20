import { dexContent, individualQuirk, portraitReaction, templateDevelopment, templateHabitat } from '../../dex/content.js';
import { formsOf, familyById } from '../../data/beast-dex.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
// Beast Dex: every species in the game, grouped by element. Reachable from the
// main menu (no franchise needed). With a franchise, species you have scouted
// or faced stay locked; only species you have acquired are revealed. Everything else
// shows as a silhouette with "???" so there is always something to hunt for.

import { abilitiesHtml } from '../ability-info.js';
import { esc, delegate, sheet } from '../dom.js';
import { SPECIES_DEX, RARITIES, TRAITS, ELEMENT_REGIONS, COLLECTION_MILESTONES } from '../../data/species.js';
import { TYPES, evolvedSpec } from '../../data/monsters.js';
export { evolvedSpec };
import { sprite16 } from '../sprite16.js';
import { dexStatus, dexCounts, dexFormSeen, DEX_GROUPS } from '../../franchise/franchise.js';
import { careerTimeline } from '../../franchise/career.js';
import { fullProfile } from '../../franchise/career-profile.js';
import { dexKnowledge, LORE_THRESHOLDS, dexCountsGlobal } from '../../franchise/dex-store.js';
import { ATTR_ORDER, ATTR_NAME } from '../../data/stat-guide.js';
import { motionAttrs, playDexReaction } from '../dex-motion.js';
import { t as $t } from '../../text/index.js';

let profileSerial = 0;
const POS_NAME = { QB: $t('league.quarterback'), RB: $t('league.running_back'), WR: $t('league.receiver'), TE: $t('league.tight_end'), OL: $t('league.lineman'), DL: $t('league.pass_rusher'), LB: $t('league.linebacker'), CB: $t('league.cornerback'), S: $t('league.safety'), K: $t('league.kicker') };

export const silhouette = (s, size) => sprite16({ ...s, id: s.id + '_sil', colors: ['#1a2420', '#22302a'], look: 'cool', features: s.features.filter((f) => f !== 'glow' && f !== 'halo') }, size);

export function registerDexScreens(Router, app) {
  Router.registerScreen('dex', {
    title: $t('league.beast_dex'),
    render({ f, params }) {
      const revealAll = !!params?.all;
      const status = (s) => (revealAll ? 'seen' : dexStatus(f, s.id));
      // Family-based tallies (owner ruling 2026-11-07): the original 72, the 120 Basics and all 192, each counted separately;
      // an evolved form counts once, as its family. The collection milestones belong to the original 72 (their last step is the
      // 72-family completion badge), so the next milestone follows the original tally.
      const counts = revealAll ? Object.fromEntries(Object.entries(DEX_GROUPS).map(([k, ids]) => [k, { seen: ids.length, signed: 0, total: ids.length }])) : dexCounts(f);
      const { seen, signed, total } = counts.all;
      const career = dexCountsGlobal();
      const next = COLLECTION_MILESTONES.find((m) => m.at > counts.original.seen);
      const groupLine = [['original', $t('league.original')], ['basic', $t('league.basic')], ['all', $t('league.all')]].map(([k, l]) => `<span class="chip" data-dex-group="${k}">${l} ${counts[k].seen}/${counts[k].total}</span>`).join(' ');
      const groups = Object.keys(TYPES).map((el) => {
        const list = SPECIES_DEX.filter((s) => s.element === el);
        const found = list.filter((s) => status(s) !== 'unknown').length;
        return `<section class="dex-el"><div class="row between"><h3 style="color:hsl(${TYPES[el].hue} 70% 62%);margin:0">${esc(el)}</h3><span class="dim mono">${found}/${list.length}</span></div>
          <div class="dex-grid">${list.map((s) => { const st = status(s); return `<button class="dex-cell ${st}" data-action="open" data-id="${s.id}" aria-label="${st === 'unknown' ? $t('league.unknown_species') : esc(s.name)}">${st === 'unknown' ? silhouette(s, 40) : sprite16(s, 40)}<span class="dex-name">${st === 'unknown' ? '???' : esc(s.name)}</span><span class="dex-r r-${s.rarity}">${st === 'unknown' ? '' : RARITIES[s.rarity].label}</span>${st === 'signed' ? `<span class="dex-tick" title="${$t('league.signed')}">✓</span>` : ''}</button>`; }).join('')}</div></section>`;
      }).join('');
      return `
        <div class="panel tight"><div class="row between"><div>${$t('league.b_discovered_b', { seen, total })}<div class="muted">${$t('league.signed_2', { signed })} ${revealAll ? $t('league.developer_view_all_revealed') : career.franchises > 1 ? `${$t('league.your_collection_across_franchises', { franchises: career.franchises })}` : f ? $t('league.scout_a_region_or_play_a') : $t('league.your_collection_carries_into_every_franchise')}</div></div>${next ? `<div class="dim" style="text-align:right;font-size:12px;max-width:45%">${$t('league.next_at_original_families', { at: next.at, reward: esc(next.reward) })}</div>` : ''}</div>
          <div class="chips dex-groups" style="margin:6px 0 4px">${groupLine}</div>
          <div class="dex-bar"><i style="width:${(seen / total) * 100}%"></i></div></div>
        ${groups}
        <p class="dim center" style="margin-top:12px">${$t('league.common_and_uncommon_species_are_scouted')}</p>`;
    },
    mount(root, ctx) {
      delegate(root, {
        open: (el) => {
          const s = SPECIES_DEX.find((x) => x.id === el.dataset.id); if (!s) return;
          const st = ctx.params?.all ? 'seen' : dexStatus(ctx.f, s.id);
          if (st === 'unknown') { sheet(`<div class="row">${silhouette(s, 72)}<div>${$t('league.b_unknown_species_b')}<div class="muted">${$t('league.type_2', { element: esc(s.element), label: RARITIES[s.rarity].label })}</div><div class="muted">${$t('league.found_in')} ${esc((s.regions || ELEMENT_REGIONS[s.element]).join(', '))}</div></div></div><p class="muted">${$t('league.scout_that_region_or_face_a')}</p>`, { title: '???' }); return; }
          playMonsterCry(s.id); openDexSheet(speciesSheet(s, ctx.f, { revealAll: !!ctx.params?.all }), { f: ctx.f, opener: el });
        },
      });
    },
  });
}

const RANGE_MAX = 100; // attribute scale (0–100)
const capital = (text) => { const t = String(text || '').trim(); return t ? t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.') : ''; };
const KIND_LABEL = { friendship: 'Friendship', rivalry: 'Rivalry', 'legendary folklore': 'Folklore' };
const elementHue = (el) => TYPES[el]?.hue ?? 150;
const bar = (lo, hi, value = null) => `<span class="dexp-bar" aria-hidden="true"><i style="left:${(lo / RANGE_MAX) * 100}%;width:${Math.max(1.5, ((hi - lo) / RANGE_MAX) * 100)}%"></i>${value == null ? '' : `<b style="left:${(value / RANGE_MAX) * 100}%"></b>`}</span>`;

/** Presentation reads existing records; it never backfills or mutates a monster. */
export function speciesSheet(s, f, { monster = null, previewGames = null, revealAll = false, previewStage = 0, stagePicker = true, viewPicker = true } = {}) {
  const profileId = `dex-profile-${++profileSerial}`;
  const stage = monster?.stage ?? previewStage;
  const content = dexContent(s.id, stage);
  const forms = formsOf(s.id);
  const form = forms.find(x => x.stage === stage);
  const current = evolvedSpec(s, stage);
  const knowledge = dexKnowledge(s.id);
  const games = previewGames ?? knowledge.games;
  const timeline = monster ? careerTimeline(monster, { club: f?.club }) : [];
  const displayName = monster?.name || current.name;
  const known = (id) => revealAll || dexStatus(f, id) !== 'unknown';
  const seen = Math.max(revealAll ? s.evolution.length : dexFormSeen(f, s.id), stage);
  const chain = [s, ...s.evolution.map((_, i) => evolvedSpec(s, i + 1))];
  const position = POS_NAME[s.position] || s.position;
  const rarity = RARITIES[s.rarity]?.label || s.rarity;

  // ---- Profile
  const biography = (content?.biography || [s.personality]).map((text, i) => `<p class="${i ? '' : 'dexp-lead'}">${esc(text)}</p>`).join('');
  const status = revealAll ? 'seen' : dexStatus(f, s.id); const ownedCount = f ? f.roster.filter(x => x.species === s.id).length : 0;
  const collection = esc(status === 'signed' ? `${$t('league.signed')}${f ? ` ${$t('league.on_your_roster', { n: ownedCount })}` : ''}` : status === 'seen' ? $t('league.seen_never_signed') : $t('league.not_yet_discovered'));
  const seenForms = revealAll ? s.evolution.length : dexFormSeen(f, s.id);
  const regions = (s.regions || ELEMENT_REGIONS[s.element] || []).join(', ');
  const facts = content?.funFacts.length ? `<section class="dexp-card"><h3>Fun facts</h3><ul class="dexp-facts">${content.funFacts.map(text => `<li>${esc(text)}</li>`).join('')}</ul></section>` : '';
  const relationships = content?.relationships.length ? `<section class="dexp-sec"><h3>Species relationships</h3><div class="dexp-rels">${content.relationships.map(relation => {
    const other = SPECIES_DEX.find(x => x.id === relation.familyId); const kind = KIND_LABEL[relation.kind] || capital(relation.kind).replace(/\.$/, '');
    if (games < relation.games) return `<article class="dexp-rel locked"><span class="dexp-lock" aria-hidden="true"></span><div><b>${esc(kind)}</b><p class="dim">Unlocks at ${relation.games} games of species knowledge.</p></div></article>`;
    return `<article class="dexp-rel k-${esc(relation.kind.split(' ').pop())}">${other ? (known(other.id) ? sprite16(other, 40) : silhouette(other, 40)) : ''}<div><span class="dexp-kind">${esc(kind)}</span><b>${esc(familyById(relation.familyId)?.name || '')}</b><p>${esc(relation.text)}</p></div></article>`;
  }).join('')}</div></section>` : '';
  const quirk = monster ? `<section class="dexp-card dexp-mine-card"><h3>Individual quirk</h3><p>${esc(individualQuirk(monster))}</p><p class="dim dexp-note">Cosmetic only: quirks never change ratings or results.</p></section>` : '';
  const profilePanel = `${quirk}<section class="dexp-sec dexp-bio">${biography}</section>
    <dl class="dexp-facts-grid"><div><dt>Element</dt><dd>${esc(s.element)}</dd></div><div><dt>Size</dt><dd>${esc(capital(current.size).replace(/\.$/, ''))}</dd></div><div><dt>Build</dt><dd>${esc(capital(current.body).replace(/\.$/, ''))}</dd></div><div><dt>Rarity</dt><dd>${esc(rarity)}${s.cornerstone ? esc($t('league.cornerstone')) : ''}</dd></div><div class="wide"><dt>Collection</dt><dd>${collection}</dd></div></dl>
    <section class="dexp-card"><h3>Personality</h3><p>${esc(content?.personality || s.personality)}</p></section>
    <section class="dexp-card"><h3>${$t('league.where_to_find_it')}</h3><p class="dexp-region">${esc(regions)}${s.fromWeek ? ` ${esc($t('league.from_week', { fromWeek: s.fromWeek }))}` : ''}${s.rarity === 'legendary' && f ? esc(f.campaign?.unlocked?.[s.id] ? $t('league.unlocked_scoutable_there_now') : ` ${$t('league.legend_tracks_3', { tracks: f.campaign?.tracks?.[s.id] || 0 })}`) : ''}</p>${content?.habitat && !templateHabitat(content) ? `<p>${esc(content.habitat)}</p>` : ''}</section>
    ${facts}${relationships}`;

  // ---- Football
  const ranges = Object.entries(form?.starting || {}).sort((a, b) => (b[1][0] + b[1][1]) - (a[1][0] + a[1][1]));
  const strengths = ranges.slice(0, 3).map(([key]) => ATTR_NAME[key] || key);
  const weaknesses = (form?.belowBandWeaknesses || []).map(key => ATTR_NAME[key] || key);
  const order = ATTR_ORDER.filter(key => key in (form?.starting || {}) || key in (monster?.attributes || {}));
  const scout = `<section class="dexp-card dexp-scout"><h3>Scouting report</h3><p>${esc(content?.scouting || s.position)}</p>
    <div class="dexp-tags"><span class="dim">Natural strengths</span>${strengths.map(x => `<span class="chip good">${esc(x)}</span>`).join('') || '<span class="dim">Not recorded</span>'}</div>
    ${weaknesses.length ? `<div class="dexp-tags"><span class="dim">Lower starting bands</span>${weaknesses.map(x => `<span class="chip warn">${esc(x)}</span>`).join('')}</div>` : ''}
    <p class="dim dexp-note">Individual development decides each beast’s present ratings.</p></section>`;
  const rangeRows = order.filter(key => form?.starting?.[key]).map(key => { const [lo, hi] = form.starting[key]; return `<tr><th scope="row">${esc(ATTR_NAME[key] || key)}</th><td>${bar(lo, hi)}</td><td class="mono">${lo}–${hi}</td></tr>`; }).join('');
  const natural = `<details class="dexp-card dexp-ranges" ${monster ? '' : 'open'}><summary>Natural starting ranges · ${esc(current.name)}</summary><p class="dim dexp-note">Starting ranges for this evolution stage; not current ratings or career limits.</p><table class="dexp-attrs"><tbody>${rangeRows}</tbody></table></details>`;
  const currentRows = monster ? order.filter(key => key in (monster.attributes || {})).map(key => { const v = monster.attributes[key]; const band = form?.starting?.[key]; return `<tr><th scope="row">${esc(ATTR_NAME[key] || key)}</th><td>${bar(band ? band[0] : 0, band ? band[1] : 0, v)}</td><td class="mono"><b>${esc(v)}</b></td></tr>`; }).join('') : '';
  const career = monster && f ? fullProfile(f, monster) : null;
  const stats = career ? `<section class="dexp-card"><h3>Career statistics</h3><div class="dexp-tiles"><div><b>${career.stats.games}</b><span>Regular-season games</span></div><div><b>${career.stats.postGames}</b><span>Playoff games</span></div></div>${career.stats.focus.map(x => `<p class="dexp-stat"><span>${esc(x.label)}</span><b>${esc(x.text)}</b></p>`).join('')}</section>` : '';
  const footballPanel = `<p class="dexp-pos"><span class="chip">${esc(position)}</span></p>${monster ? `<section class="dexp-card dexp-mine-card"><h3>Current ratings</h3><p class="dim dexp-note">${esc(displayName)}’s ratings now. The shaded band is this form’s natural starting range.</p><table class="dexp-attrs" aria-label="Current attributes"><tbody>${currentRows}</tbody></table></section>` : ''}${scout}${natural}
    <section class="dexp-sec dexp-abilities"><h3>${$t('league.signature_abilities')}</h3>${abilitiesHtml(s, { monster, dex2: true, seeIt: revealAll || dexStatus(f, s.id) !== 'unknown' })}</section>${stats}`;

  // ---- Evolution
  const chainHtml = chain.map((x, i) => {
    const open = i <= seen; const here = i === stage;
    const tag = open && !monster && stagePicker && i !== stage ? 'button' : 'div';
    return `${i ? `<span class="dexp-evo-arrow" aria-hidden="true">›<small>Lv ${esc(s.evolution[i - 1].level)}</small></span>` : ''}<${tag} class="dexp-evo${here ? ' here' : ''}${open ? '' : ' locked'}" ${tag === 'button' ? `type="button" data-dex-goto="${i}" aria-label="Show ${esc(x.name)}"` : ''}>${open ? sprite16(x, 56) : silhouette(x, 56)}<b>${open ? esc(x.name) : '???'}</b><span class="dim">${i ? `Stage ${i + 1}` : 'Base form'}</span>${here ? `<span class="chip accent">${monster ? 'Current form' : 'Shown'}</span>` : ''}</${tag}>`;
  }).join('');
  const evolutionPanel = `<section class="dexp-sec"><h3>${$t('league.evolution')}</h3>${s.evolution.length ? `<div class="dexp-chain">${chainHtml}</div>${monster ? '' : `<p class="dim dexp-note">${esc(seenForms ? $t('league.you_have_seen_this_species_evolve', { n: seenForms >= s.evolution.length ? ' fully' : '' }) : $t('league.evolves_at_the_levels_shown_evolved'))}</p>`}` : `<div class="dexp-chain">${chainHtml}</div><p class="dim">This species does not evolve.</p>`}</section>
    ${content?.development && !templateDevelopment(content) ? `<section class="dexp-card"><h3>Personality development</h3><p>${esc(content.development)}</p></section>` : ''}
    ${monster ? `<section class="dexp-sec"><h3>${esc(displayName)}’s evolution history</h3>${historyHtml(timeline.filter(e => e.t === 'evolve'), stage > 0 ? `Joined your club in its ${current.name} form; no evolutions recorded with your club yet.` : 'No evolutions yet.')}</section>` : ''}`;

  // ---- Journal
  const next = LORE_THRESHOLDS.find(n => games < n);
  const lore = LORE_THRESHOLDS.map((n, i) => {
    const entry = content?.lore.find(x => x.games === n);
    if (games >= n) return `<article class="dexp-lore open"><span class="dexp-lore-n">${n} games</span>${entry ? `<b>${esc(entry.title)}</b><p>${esc(entry.text)}</p>` : '<p class="dim">Lore is being prepared.</p>'}</article>`;
    const from = i ? LORE_THRESHOLDS[i - 1] : 0; const pct = Math.max(0, Math.min(100, ((games - from) / (n - from)) * 100));
    return `<article class="dexp-lore locked" aria-label="Locked lore, unlocks at ${n} games"><span class="dexp-lock" aria-hidden="true"></span><div><span class="dexp-lore-n">Entry ${i + 1} · ${n} games</span><p class="dim">${n - games} more ${n - games === 1 ? 'game' : 'games'} with this family to unlock.</p><span class="dexp-progress" aria-hidden="true"><i style="width:${pct}%"></i></span></div></article>`;
  }).join('');
  const journalPanel = monster
    ? `<section class="dexp-sec"><h3>Franchise accomplishments and personal history</h3>${historyHtml(timeline, 'No history recorded yet.')}</section>`
    : `<section class="dexp-card dexp-know"><h3>Species knowledge</h3><p><b class="dexp-big">${games}</b> ${games === 1 ? 'game' : 'games'} with this family · shared across individuals and franchises</p><span class="dexp-progress steps" aria-hidden="true"><i style="width:${Math.min(100, (games / 30) * 100)}%"></i>${LORE_THRESHOLDS.map(n => `<em style="left:${(n / 30) * 100}%" class="${games >= n ? 'on' : ''}"></em>`).join('')}</span><p class="dim dexp-note">${next ? `Next entry at ${next} games.` : 'Every entry unlocked.'} A game counts once per family when one of its members plays for your club.</p></section><div class="dexp-lores">${lore}</div>`;

  const panels = { Profile: profilePanel, Football: footballPanel, Evolution: evolutionPanel, Journal: journalPanel };
  const owned = f?.roster?.filter(m => m.species === s.id) || [];
  const viewSelect = viewPicker && owned.length ? `<label class="dexp-field">Viewing<select data-dex-view><option value="species" ${!monster ? 'selected' : ''}>Species View</option>${owned.map(m => `<option value="${esc(m.id)}" ${monster?.id === m.id ? 'selected' : ''}>My Beast: ${esc(m.name)}</option>`).join('')}</select></label>` : '';
  const stageSelect = stagePicker && !monster && s.evolution.length ? `<label class="dexp-field">Evolution form<select data-dex-stage>${[s, ...s.evolution].map((x, i) => i <= seen ? `<option value="${i}" ${i === stage ? 'selected' : ''}>${esc(x.name)}</option>` : '').join('')}</select></label>` : '';
  const sub = monster
    ? `${esc(current.name)}${monster.level != null ? ` · Lv ${esc(monster.level)}` : ''} · ${esc(position)}`
    : `${esc($t('league.type_3', { element: s.element }))} ${esc(rarity)} · ${esc(position)}`;
  return `<div class="dexp ${monster ? 'is-mine' : 'is-species'}" data-dex-profile data-family="${esc(s.id)}" data-stage="${stage}" data-reveal="${revealAll}" data-preview-games="${previewGames ?? ''}" style="--el-h:${elementHue(s.element)}">
    <div class="dexp-kindbar"><span class="dexp-badge">${monster ? 'My Beast View' : 'Species View'}</span>${monster ? '<span class="dim">Your club’s individual</span>' : '<span class="dim">Shared species entry</span>'}</div>
    ${viewSelect || stageSelect ? `<div class="dexp-controls">${viewSelect}${stageSelect}</div>` : ''}
    <div class="dexp-head">
      <div class="dexp-stage" data-dex-portrait>
        <div class="dexp-stage-art"><button type="button" class="dexp-sprite-btn" aria-label="Interact with ${esc(displayName)}" data-dex-react data-name="${esc(displayName)}" data-features="${esc(JSON.stringify(current.features || []))}" data-reactions="${esc(JSON.stringify(content?.reactions || null))}"><span class="dexp-sprite" data-dex-sprite ${motionAttrs(s.id, stage)}>${sprite16(current, 96)}</span></button></div>
        <div class="dexp-id"><h2 class="dexp-name">${esc(displayName)}</h2><p class="dexp-sub">${sub}</p><p class="dexp-bubble" data-dex-reaction role="status" aria-live="polite"></p></div>
      </div>
      <div class="dexp-tabs" role="tablist" aria-label="Beast Dex sections">${Object.keys(panels).map((name, i) => `<button type="button" role="tab" id="${profileId}-tab-${name}" aria-controls="${profileId}-panel-${name}" data-dex-tab="${name}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`).join('')}</div>
    </div>
    ${Object.entries(panels).map(([name, html], i) => `<section class="dexp-panel" role="tabpanel" id="${profileId}-panel-${name}" aria-labelledby="${profileId}-tab-${name}" data-dex-panel="${name}" tabindex="0" ${i ? 'hidden' : ''}>${html}</section>`).join('')}
  </div>`;
}

function historyHtml(entries, empty) {
  if (!entries.length) return `<p class="dim">${esc(empty)}</p>`;
  return `<ol class="dexp-history">${entries.map(e => `<li><span class="dexp-when">${e.y == null ? 'Earlier career' : `Season ${esc(e.y)}`}${e.w == null ? '' : ` · Week ${esc(e.w)}`}</span><b>${esc(e.title)}</b>${e.desc ? `<p>${esc(e.desc)}</p>` : ''}</li>`).join('')}</ol>`;
}

/** Shared by a normal portrait tap and deterministic reviewer previews. */
export function showPortraitReaction(button, rare = false) {
  const reaction = portraitReaction({ name: button.dataset.name, features: JSON.parse(button.dataset.features), reactions: JSON.parse(button.dataset.reactions || 'null'), rare, choice: Math.floor(Math.random() * 100) });
  const portrait = button.closest('[data-dex-portrait]');
  const bubble = portrait.querySelector('[data-dex-reaction]');
  bubble.textContent = reaction; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
  portrait.dataset.reaction = rare ? 'rare' : 'normal';
  const profile = portrait.closest('[data-dex-profile]');
  portrait.dispatchEvent(new CustomEvent('beast-dex-reaction', { bubbles: true, detail: { rare, reaction, familyId: profile?.dataset.family, stage: Number(profile?.dataset.stage || 0) } }));
}

// One controller per scroll host (a sheet body, or the page for the reviewer): rebinding a re-rendered profile, closing a sheet or
// leaving the reviewer aborts the previous listeners, animations and timers instead of stacking them.
const hosts = new Map();
let lastInput = 'pointer';
if (typeof document !== 'undefined') { document.addEventListener('keydown', () => { lastInput = 'keyboard'; }, true); document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true); }
const prune = () => { for (const [k, c] of hosts) if (k !== document && !k.isConnected) { c.abort(); hosts.delete(k); } };
/** Abort the page-level profile binding (the reviewer's route exit), or every binding with { all: true }. */
export function releaseDexProfiles({ all = false } = {}) { for (const [k, c] of hosts) if (all || k === document) { c.abort(); hosts.delete(k); } prune(); }

/** Open a profile in a sheet: focus moves into it, Escape closes the top Dex sheet, focus returns to the opener, sound and motion stop. */
export function openDexSheet(html, { title = 'Beast Dex', f = null, opener = null, onClose = null } = {}) {
  let detail = null;
  const done = () => { hosts.get(detail?.el.querySelector('.sheet-body'))?.abort(); hosts.delete(detail?.el.querySelector('.sheet-body')); document.removeEventListener('keydown', onKey, true); stopCry(); onClose?.(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  const onKey = (e) => { if (!detail?.el.isConnected) { document.removeEventListener('keydown', onKey, true); return; } if (e.key !== 'Escape') return; const sheets = [...document.querySelectorAll('.sheet-backdrop')]; if (sheets[sheets.length - 1] !== detail.el) return; e.preventDefault(); detail.close(); };
  detail = sheet(html, { title, onClose: done });
  detail.el.classList.add('dex-sheet');
  document.addEventListener('keydown', onKey, true);
  bindDexProfile(detail.el, { f });
  // Keyboard users land on the selected tab; a touch or mouse opening focuses the dialog itself, so no focus ring appears on a tab.
  const panel = detail.el.querySelector('.sheet'); panel?.setAttribute('tabindex', '-1');
  (lastInput === 'keyboard' ? detail.el.querySelector('[data-dex-tab][aria-selected="true"]') : panel)?.focus({ preventScroll: true });
  return detail;
}

/** Bind locally to a sheet (or the reviewer page), including keyboard tab navigation, the compact portrait and the portrait motion. */
export function bindDexProfile(root, { f = null } = {}) {
  const profile = root.matches?.('[data-dex-profile]') ? root : root.querySelector('[data-dex-profile]');
  if (!profile) return;
  const scroller = profile.closest('.sheet-body') || null;
  const key = scroller || document;
  prune(); hosts.get(key)?.abort();
  const ctl = new AbortController(); hosts.set(key, ctl); const { signal } = ctl;
  const rerender = (opts) => {
    const container = profile.parentElement; const tab = profile.querySelector('[data-dex-tab][aria-selected="true"]')?.dataset.dexTab;
    profile.outerHTML = speciesSheet(SPECIES_DEX.find(x => x.id === profile.dataset.family), f, { revealAll: profile.dataset.reveal === 'true', ...opts });
    bindDexProfile(container, { f });
    const next = container.querySelector(`[data-dex-tab="${tab}"]`); if (next) { next.click(); }
    return container;
  };
  profile.querySelectorAll('[data-dex-view]').forEach(select => select.addEventListener('change', () => {
    const s = SPECIES_DEX.find(x => x.id === profile.dataset.family);
    const monster = select.value === 'species' ? null : f?.roster?.find(m => m.id === select.value && m.species === s.id);
    stopCry(); rerender({ monster }); playMonsterCry(monster || s.id);
    root.querySelector?.('[data-dex-view]')?.focus({ preventScroll: true });
  }, { signal }));
  const goStage = (stage) => {
    const games = profile.dataset.previewGames; const s = SPECIES_DEX.find(x => x.id === profile.dataset.family);
    stopCry(); const container = rerender({ previewStage: stage, previewGames: games === '' ? null : Number(games) }); playMonsterCry({ species: s.id, stage });
    return container;
  };
  profile.querySelectorAll('[data-dex-stage]').forEach(select => select.addEventListener('change', () => { const c = goStage(Number(select.value)); c.querySelector('[data-dex-stage]')?.focus({ preventScroll: true }); }, { signal }));
  profile.querySelectorAll('[data-dex-goto]').forEach(button => button.addEventListener('click', () => { const c = goStage(Number(button.dataset.dexGoto)); c.querySelector('[data-dex-tab="Evolution"]')?.focus({ preventScroll: true }); }, { signal }));
  profile.querySelectorAll('[data-dex-react]').forEach(button => button.addEventListener('click', () => showPortraitReaction(button, Math.random() < 0.05), { signal }));
  // Motion: the portrait hook drives the tap and rare reactions; the reaction text fades after a while.
  let bubbleTimer = null;
  profile.addEventListener('beast-dex-reaction', (e) => {
    const portrait = e.target.closest?.('[data-dex-portrait]'); if (!portrait) return;
    playDexReaction(portrait, e.detail, { signal });
    clearTimeout(bubbleTimer); const bubble = portrait.querySelector('[data-dex-reaction]');
    bubbleTimer = setTimeout(() => bubble?.classList.remove('show'), 6000);
  }, { signal });
  signal.addEventListener('abort', () => clearTimeout(bubbleTimer), { once: true });
  // Compact portrait while reading: the portrait stays on screen but gives the text more room once the reader scrolls.
  const head = profile.querySelector('.dexp-head');
  const scrollTarget = scroller || window;
  let raf = 0; const top = () => (scroller ? scroller.scrollTop : (parseFloat(getComputedStyle(head).top) || 0) - profile.getBoundingClientRect().top);
  const sync = () => { raf = 0; head?.classList.toggle('compact', top() > 48); };
  scrollTarget.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true, signal });
  signal.addEventListener('abort', () => cancelAnimationFrame(raf), { once: true });
  const tabs = [...profile.querySelectorAll('[data-dex-tab]')];
  const select = (tab) => {
    for (const item of tabs) { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }
    for (const panel of profile.querySelectorAll('[data-dex-panel]')) panel.hidden = panel.dataset.dexPanel !== tab.dataset.dexTab;
    // Keep the reader at the top of the new section without losing the portrait.
    if (scroller && head) { const offset = profile.querySelector(`[data-dex-panel="${tab.dataset.dexTab}"]`).offsetTop - head.offsetHeight - 8; if (scroller.scrollTop > offset) scroller.scrollTop = Math.max(0, offset); }
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab), { signal });
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[index]); tabs[index].focus();
    }, { signal });
  }
}
