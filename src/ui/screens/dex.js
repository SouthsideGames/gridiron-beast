// Beast Dex: every species in the game, grouped by element. Reachable from the
// main menu (no franchise needed). With a franchise, species you have scouted
// or faced are revealed; species you have signed are marked. Everything else
// shows as a silhouette with "???" so there is always something to hunt for.

import { esc, delegate, sheet } from '../dom.js';
import { SPECIES_DEX, RARITIES, TRAITS, ELEMENT_REGIONS, COLLECTION_MILESTONES } from '../../data/species.js';
import { TYPES, evolvedSpec } from '../../data/monsters.js';
export { evolvedSpec };
import { sprite16 } from '../sprite16.js';
import { dexStatus, dexCounts, dexFormSeen } from '../../franchise/franchise.js';
import { dexCountsGlobal } from '../../franchise/dex-store.js';

const POS_NAME = { QB: 'Quarterback', RB: 'Running back', WR: 'Receiver', TE: 'Tight end', OL: 'Lineman', DL: 'Pass rusher', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };

export const silhouette = (s, size) => sprite16({ ...s, id: s.id + '_sil', colors: ['#1a2420', '#22302a'], look: 'cool', features: s.features.filter((f) => f !== 'glow' && f !== 'halo') }, size);

export function registerDexScreens(Router, app) {
  Router.registerScreen('dex', {
    title: 'Beast Dex',
    render({ f, params }) {
      const revealAll = !!params?.all;
      const status = (s) => (revealAll ? 'seen' : dexStatus(f, s.id));
      const { seen, signed } = dexCounts(f);
      const career = dexCountsGlobal();
      const total = SPECIES_DEX.length;
      const next = COLLECTION_MILESTONES.find((m) => m.at > seen);
      const groups = Object.keys(TYPES).map((el) => {
        const list = SPECIES_DEX.filter((s) => s.element === el);
        const found = list.filter((s) => status(s) !== 'unknown').length;
        return `<section class="dex-el"><div class="row between"><h3 style="color:hsl(${TYPES[el].hue} 70% 62%);margin:0">${esc(el)}</h3><span class="dim mono">${found}/${list.length}</span></div>
          <div class="dex-grid">${list.map((s) => { const st = status(s); return `<button class="dex-cell ${st}" data-action="open" data-id="${s.id}" aria-label="${st === 'unknown' ? 'Unknown species' : esc(s.name)}">${st === 'unknown' ? silhouette(s, 40) : sprite16(s, 40)}<span class="dex-name">${st === 'unknown' ? '???' : esc(s.name)}</span><span class="dex-r r-${s.rarity}">${st === 'unknown' ? '' : RARITIES[s.rarity].label}</span>${st === 'signed' ? '<span class="dex-tick" title="Signed">✓</span>' : ''}</button>`; }).join('')}</div></section>`;
      }).join('');
      return `
        <div class="panel tight"><div class="row between"><div><b>${seen} / ${total} discovered</b><div class="muted">${signed} signed · ${revealAll ? 'developer view: all revealed' : career.franchises > 1 ? `your collection across ${career.franchises} franchises` : f ? 'scout a region or play a club to discover more' : 'your collection carries into every franchise'}</div></div>${next ? `<div class="dim" style="text-align:right;font-size:12px;max-width:45%">Next at ${next.at}: ${esc(next.reward)}</div>` : ''}</div>
          <div class="dex-bar"><i style="width:${(seen / total) * 100}%"></i></div></div>
        ${groups}
        <p class="dim center" style="margin-top:12px">Common and uncommon species are scouted in their regions. Rares appear only in one home region from week 4. Legendaries are won through Legend Tracks (coming in Prototype 2).</p>`;
    },
    mount(root, ctx) {
      delegate(root, {
        open: (el) => {
          const s = SPECIES_DEX.find((x) => x.id === el.dataset.id); if (!s) return;
          const st = ctx.params?.all ? 'seen' : dexStatus(ctx.f, s.id);
          if (st === 'unknown') { sheet(`<div class="row">${silhouette(s, 72)}<div><b>Unknown species</b><div class="muted">${esc(s.element)} type · ${RARITIES[s.rarity].label}</div><div class="muted">Found in: ${esc((s.regions || ELEMENT_REGIONS[s.element]).join(', '))}</div></div></div><p class="muted">Scout that region, or face a club that plays one, to reveal it.</p>`, { title: '???' }); return; }
          sheet(speciesSheet(s, ctx.f), { title: s.name });
        },
      });
    },
  });
}

export function speciesSheet(s, f) {
  const ab = s.ability ? `<p><b>${esc(s.ability.name)}</b> — ${esc(s.ability.text)}</p>` : `<p><b>${esc(TRAITS[s.trait]?.name)}</b> (shared trait) — ${esc(TRAITS[s.trait]?.text)}</p>`;
  const formSeen = dexFormSeen(f, s.id);
  const evo = s.evolution.length ? `<h3>Evolution</h3><div class="row" style="flex-wrap:wrap;gap:8px;align-items:flex-end">${sprite16(s, 40)}${s.evolution.map((e, i) => `<span class="dim">→</span><span class="center" style="font-size:12px">${formSeen >= i + 1 ? sprite16(evolvedSpec(s, i + 1), 40 + i * 8) : silhouette(evolvedSpec(s, i + 1), 40 + i * 8)}<br>${formSeen >= i + 1 ? esc(e.name) : '???'} <span class="dim">L${e.level}</span></span>`).join('')}</div><p class="dim">${formSeen ? `You have seen this species evolve${formSeen >= s.evolution.length ? ' fully' : ''}.` : 'Evolves at the levels shown; evolved forms are revealed when you see one.'}</p>` : '';
  const owned = f ? f.roster.filter((m) => m.species === s.id) : [];
  const st = dexStatus(f, s.id);
  return `<div class="row" style="align-items:flex-start">${sprite16(s, 96)}<div class="grow"><div class="muted">${esc(s.element)} type · <span class="dex-r r-${s.rarity}">${RARITIES[s.rarity].label}</span>${s.cornerstone ? ' · cornerstone' : ''}</div>
    <div class="muted">${POS_NAME[s.position]} (${s.position})${s.secondary ? ` · also ${POS_NAME[s.secondary]} (${s.secondary})` : ''}</div>
    <div class="muted">${esc(s.size)} ${esc(s.body)} · ${esc(s.look)}</div>
    <div class="muted" style="margin-top:4px">${st === 'signed' ? `Signed${f ? ` · ${owned.length} on your roster` : ''}` : st === 'seen' ? 'Seen, never signed' : 'Not yet discovered'}</div></div></div>
    <p style="font-style:italic">“${esc(s.personality)}”</p>
    <h3>${s.ability ? 'Signature ability' : 'Trait'}</h3>${ab}
    <h3>Where to find it</h3><p class="muted">${esc((s.regions || ELEMENT_REGIONS[s.element]).join(', '))}${s.fromWeek ? ` · from week ${s.fromWeek}` : ''}${s.rarity === 'legendary' ? (f?.campaign?.unlocked?.[s.id] ? ' · unlocked: scoutable there now' : ` · Legend Tracks ${f?.campaign?.tracks?.[s.id] || 0}/3`) : ''}</p>
    ${evo}`;
}
