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
import { dexCountsGlobal } from '../../franchise/dex-store.js';
import { t as $t } from '../../text/index.js';

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
          sheet(speciesSheet(s, ctx.f), { title: s.name });
        },
      });
    },
  });
}

export function speciesSheet(s, f) {
  const known = dexStatus(f, s.id) !== 'unknown';
  const formSeen = dexFormSeen(f, s.id);
  const evo = s.evolution.length ? `<h3>${$t('league.evolution')}</h3><div class="row" style="flex-wrap:wrap;gap:8px;align-items:flex-end">${sprite16(s, 40)}${s.evolution.map((e, i) => `<span class="dim">→</span><span class="center" style="font-size:12px">${formSeen >= i + 1 ? sprite16(evolvedSpec(s, i + 1), 40 + i * 8) : silhouette(evolvedSpec(s, i + 1), 40 + i * 8)}<br>${formSeen >= i + 1 ? esc(e.name) : '???'} <span class="dim">L${e.level}</span></span>`).join('')}</div><p class="dim">${formSeen ? `${$t('league.you_have_seen_this_species_evolve', { n: formSeen >= s.evolution.length ? ' fully' : '' })}` : $t('league.evolves_at_the_levels_shown_evolved')}</p>` : '';
  const owned = f ? f.roster.filter((m) => m.species === s.id) : [];
  const st = dexStatus(f, s.id);
  return `<div class="row" style="align-items:flex-start">${sprite16(s, 96)}<div class="grow"><div class="muted">${$t('league.type_3', { element: esc(s.element) })} <span class="dex-r r-${s.rarity}">${RARITIES[s.rarity].label}</span>${s.cornerstone ? $t('league.cornerstone') : ''}</div>
    <div class="muted">${POS_NAME[s.position]} (${s.position})</div>
    <div class="muted">${esc(s.size)} ${esc(s.body)} · ${esc(s.look)}</div>
    <div class="muted" style="margin-top:4px">${st === 'signed' ? `${$t('league.signed')}${f ? ` ${$t('league.on_your_roster', { n: owned.length })}` : ''}` : st === 'seen' ? $t('league.seen_never_signed') : $t('league.not_yet_discovered')}</div></div></div>
    <p style="font-style:italic">“${esc(s.personality)}”</p>
    <h3>${$t('league.signature_abilities')}</h3>${abilitiesHtml(s, { seeIt: known })}
    <h3>${$t('league.where_to_find_it')}</h3><p class="muted">${esc((s.regions || ELEMENT_REGIONS[s.element]).join(', '))}${s.fromWeek ? ` ${$t('league.from_week', { fromWeek: s.fromWeek })}` : ''}${s.rarity === 'legendary' ? (f?.campaign?.unlocked?.[s.id] ? $t('league.unlocked_scoutable_there_now') : ` ${$t('league.legend_tracks_3', { tracks: f?.campaign?.tracks?.[s.id] || 0 })}`) : ''}</p>
    ${evo}`;
}
