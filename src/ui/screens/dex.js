import { dexContent, individualQuirk, portraitReaction } from '../../dex/content.js';
import { formsOf, familyById } from '../../data/beast-dex.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
// Beast Dex: every species in the game, grouped by element. Reachable from the
// main menu (no franchise needed). With a franchise, species you have scouted
// or faced are revealed; species you have signed are marked. Everything else
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
          playMonsterCry(s.id); const detail = sheet(speciesSheet(s, ctx.f, { revealAll: !!ctx.params?.all }), { title: s.name, onClose: stopCry }); bindDexProfile(detail.el, { f: ctx.f });
        },
      });
    },
  });
}

/** Presentation reads existing records; it never backfills or mutates a monster. */
export function speciesSheet(s, f, { monster = null, previewGames = null, revealAll = false, previewStage = 0, stagePicker = true, viewPicker = true } = {}) {
  const profileId = `dex-profile-${++profileSerial}`;
  const stage = monster?.stage ?? previewStage;
  const content = dexContent(s.id, stage);
  const form = formsOf(s.id).find(x => x.stage === stage);
  const current = evolvedSpec(s, stage);
  const knowledge = dexKnowledge(s.id);
  const games = previewGames ?? knowledge.games;
  const timeline = monster ? careerTimeline(monster, { club: f?.club }) : [];
  const history = entries => entries.length ? entries.map(e => `<article><b>${esc(e.title)}</b><p>${esc(e.desc)}</p><span class="dim">${e.y == null ? 'Earlier career' : `Season ${esc(e.y)}`}${e.w == null ? '' : ` · Week ${esc(e.w)}`}</span></article>`).join('') : '<p>No history recorded yet.</p>';
  const career = monster && f ? fullProfile(f, monster) : null;
  const stats = career ? `<h3>Career statistics</h3><p>${career.stats.games} regular-season games · ${career.stats.postGames} playoff games</p>${career.stats.focus.map(x => `<p>${esc(x.label)}: ${esc(x.text)}</p>`).join('')}` : '';
  const attributes = monster ? Object.entries(monster.attributes || {}).map(([key, value]) => `<tr><th scope="row">${esc(key)}</th><td>${esc(value)}</td></tr>`).join('') : '';
  const seen = revealAll ? s.evolution.length : dexFormSeen(f, s.id);
  const evolution = `<div class="row" style="flex-wrap:wrap">${[s, ...s.evolution.map((_, i) => evolvedSpec(s, i + 1))].map((form, i) => `<div>${i <= seen ? sprite16(form, 64) : silhouette(form, 64)}<p>${i <= seen ? esc(form.name) : '???'}</p>${i ? `<p>Level ${esc(s.evolution[i - 1].level)}</p>` : ''}</div>`).join('')}</div>${s.evolution.length ? '' : '<p>This species does not evolve.</p>'}`;
  const lore = LORE_THRESHOLDS.map(n => {
    const entry = content?.lore.find(x => x.games === n);
    return `<article><h4>${games >= n ? 'Unlocked' : 'Locked'} · ${n} games</h4>${games >= n && entry ? `<b>${esc(entry.title)}</b><p>${esc(entry.text)}</p>` : games >= n ? '<p class="dim">Lore is being prepared.</p>' : `<p class="dim">${n - games} more games to unlock.</p>`}</article>`;
  }).join('');
  const biography = (content?.biography || [s.personality]).map(text => `<p>${esc(text)}</p>`).join('');
  const facts = content?.funFacts.length ? `<h3>Fun facts</h3><ul>${content.funFacts.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : '';
  const ranges = Object.entries(form?.starting || {}).sort((a,b) => (b[1][0]+b[1][1])-(a[1][0]+a[1][1]));
  const strengths = ranges.slice(0,3).map(([key]) => key).join(', ');
  const weaknesses = (form?.belowBandWeaknesses || []).join(', ');
  const scout = `<h3>Scouting report</h3><p>${esc(content?.scouting || s.position)}</p><p>Highest natural starting ratings: ${esc(strengths || 'not recorded')}.${weaknesses ? ` Lower starting bands: ${esc(weaknesses)}.` : ''} Individual development and current attributes determine this beast’s present ratings.</p><details><summary>View natural attribute ranges</summary><p>Starting ranges for this evolution stage; these are not current ratings or guaranteed career limits.</p><table><tbody>${ranges.map(([key,range]) => `<tr><th scope="row">${esc(key)}</th><td>${range[0]}–${range[1]}</td></tr>`).join('')}</tbody></table></details>`;
  const owned = f?.roster?.filter(m => m.species === s.id) || [];
  const viewSelect = viewPicker && owned.length ? `<label>Viewing<select data-dex-view><option value="species" ${!monster ? 'selected' : ''}>Species View</option>${owned.map(m => `<option value="${esc(m.id)}" ${monster?.id === m.id ? 'selected' : ''}>My Beast: ${esc(m.name)}</option>`).join('')}</select></label>` : '';
  const relationships = content?.relationships.length ? `<h3>Species relationships</h3>${content.relationships.map(relation => games >= relation.games ? `<article><b>${esc(relation.kind)} · ${esc(familyById(relation.familyId)?.name)}</b><p>${esc(relation.text)}</p></article>` : `<p class="dim">Relationship lore unlocks at ${relation.games} games.</p>`).join('')}` : '';
  const panels = {
    Profile: `<h3>${esc(monster?.name || current.name)}</h3>${biography}<h3>Personality</h3><p>${esc(content?.personality || s.personality)}</p><p>${esc(s.element)} · ${esc(s.size)} · ${esc(s.body)}</p><h3>Habitat</h3><p>${esc((s.regions || ELEMENT_REGIONS[s.element] || []).join(', '))}</p>${content?.habitat ? `<p>${esc(content.habitat)}</p>` : ''}${facts}${relationships}${monster ? `<h3>Individual quirk</h3><p>${esc(individualQuirk(monster))}</p>` : ''}`,
    Football: `<h3>${esc(POS_NAME[s.position] || s.position)}</h3>${scout}${monster ? `<table aria-label="Current attributes"><tbody>${attributes}</tbody></table>` : ''}${abilitiesHtml(s, { monster, dex2: true, seeIt: revealAll || dexStatus(f, s.id) !== 'unknown' })}${stats}`,
    Evolution: evolution + (content?.development ? `<h3>Personality development</h3><p>${esc(content.development)}</p>` : '') + (monster ? `<p>Current stage: ${stage + 1}</p>${history(timeline.filter(e => e.t === 'evolve'))}` : ''),
    Journal: monster ? `<h3>Franchise accomplishments and personal history</h3>${history(timeline)}` : `<h3>Species knowledge</h3><p>${games} games · shared across individuals and franchises</p>${lore}`,
  };
  return `<div data-dex-profile data-family="${esc(s.id)}" data-stage="${stage}" data-reveal="${revealAll}" data-preview-games="${previewGames ?? ''}"><p class="chip">${monster ? 'My Beast View' : 'Species View'}</p>${viewSelect}${stagePicker && !monster && s.evolution.length ? `<label>Evolution form <select data-dex-stage>${[s, ...s.evolution].map((form, i) => i <= seen ? `<option value="${i}" ${i === stage ? 'selected' : ''}>${esc(form.name)}</option>` : '').join('')}</select></label>` : ''}<div data-dex-portrait style="position:sticky;top:0;z-index:1;background:var(--panel,#15231f)"><button type="button" class="btn ghost" aria-label="Interact with ${esc(monster?.name || current.name)}" data-dex-react data-name="${esc(monster?.name || current.name)}" data-features="${esc(JSON.stringify(current.features || []))}" data-reactions="${esc(JSON.stringify(content?.reactions || null))}">${sprite16(current, 96)}</button><p data-dex-reaction role="status" aria-live="polite"></p></div><div role="tablist" aria-label="Beast Dex sections">${Object.keys(panels).map((name, i) => `<button type="button" role="tab" id="${profileId}-tab-${name}" aria-controls="${profileId}-panel-${name}" data-dex-tab="${name}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`).join('')}</div>${Object.entries(panels).map(([name, content], i) => `<section role="tabpanel" id="${profileId}-panel-${name}" aria-labelledby="${profileId}-tab-${name}" aria-label="${name}" data-dex-panel="${name}" ${i ? 'hidden' : ''}>${content}</section>`).join('')}</div>`;
}

/** Shared by a normal portrait tap and deterministic reviewer previews. */
export function showPortraitReaction(button, rare = false) {
  const reaction = portraitReaction({ name: button.dataset.name, features: JSON.parse(button.dataset.features), reactions: JSON.parse(button.dataset.reactions || 'null'), rare, choice: Math.floor(Math.random() * 100) });
  const portrait = button.closest('[data-dex-portrait]');
  portrait.querySelector('[data-dex-reaction]').textContent = reaction;
  portrait.dataset.reaction = rare ? 'rare' : 'normal';
  const profile = portrait.closest('[data-dex-profile]');
  portrait.dispatchEvent(new CustomEvent('beast-dex-reaction', { bubbles: true, detail: { rare, reaction, familyId: profile?.dataset.family, stage: Number(profile?.dataset.stage || 0) } }));
}

/** Bind locally to a sheet, including keyboard tab navigation. */
export function bindDexProfile(root, { f = null } = {}) {
  root.querySelectorAll('[data-dex-view]').forEach(select => select.addEventListener('change', () => {
    const profile = select.closest('[data-dex-profile]');
    const s = SPECIES_DEX.find(x => x.id === profile.dataset.family);
    const monster = select.value === 'species' ? null : f?.roster?.find(m => m.id === select.value && m.species === s.id);
    const container = profile.parentElement;
    profile.outerHTML = speciesSheet(s, f, { monster, revealAll: profile.dataset.reveal === 'true' });
    playMonsterCry(monster || s.id);
    bindDexProfile(container, { f });
  }));
  root.querySelectorAll('[data-dex-stage]').forEach(select => select.addEventListener('change', () => {
    const profile = select.closest('[data-dex-profile]');
    const s = SPECIES_DEX.find(x => x.id === profile.dataset.family);
    const stage = Number(select.value);
    const games = profile.dataset.previewGames;
    const container = profile.parentElement;
    profile.outerHTML = speciesSheet(s, f, { previewStage: stage, previewGames: games === '' ? null : Number(games), revealAll: profile.dataset.reveal === 'true' });
    playMonsterCry({ species: s.id, stage });
    bindDexProfile(container, { f });
  }));
  root.querySelectorAll('[data-dex-react]').forEach(button => {
    button.addEventListener('click', () => showPortraitReaction(button, Math.random() < 0.05));
  });
  const tabs = [...root.querySelectorAll('[data-dex-tab]')];
  const select = (tab) => {
    for (const item of tabs) { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }
    for (const panel of root.querySelectorAll('[data-dex-panel]')) panel.hidden = panel.dataset.dexPanel !== tab.dataset.dexTab;
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[index]); tabs[index].focus();
    });
  }
}
