// "What the stats mean": the in-game guide to the twelve attributes by position (GDD §8.2). Data in src/data/stat-guide.js.
import { esc, sheet } from './dom.js';
import { POSITIONS, POSITION_NAME, ATTR_ORDER, ATTR_NAME, STAT_GUIDE, attributeHelps, statMeaning } from '../data/stat-guide.js';

/** The guide for one position: the attributes that help it (with what each does), then the ones that do nothing for it. */
export function statGuideHtml(position) {
  const helps = ATTR_ORDER.filter((a) => attributeHelps(position, a)), not = ATTR_ORDER.filter((a) => !attributeHelps(position, a));
  return `<div class="chips" style="margin-bottom:8px;flex-wrap:wrap">${POSITIONS.map((p) => `<button class="chip ${p === position ? 'on accent' : ''}" data-guide-pos="${p}">${p}</button>`).join('')}</div>
    <p class="muted" style="margin:0 0 6px"><b>${esc(POSITION_NAME[position])}</b>: what each attribute does on the field. Attribute points can only be spent on the ones listed first.</p>
    <div class="list">${helps.map((a) => `<div class="item static" style="min-height:0;padding:6px 8px;display:block"><b>${esc(ATTR_NAME[a])}</b> <span class="dim">· ${esc(STAT_GUIDE[a].summary)}</span><div style="font-size:13px;margin-top:2px">${esc(statMeaning(position, a))}</div></div>`).join('')}</div>
    ${not.length ? `<p class="dim" style="margin:8px 0 2px">No effect for a ${esc(POSITION_NAME[position].toLowerCase())} (points cannot go here): ${not.map((a) => esc(ATTR_NAME[a])).join(', ')}.</p>` : ''}
    <p class="dim" style="margin-top:6px">In Beast Clash every attribute feeds the overall rating it fights at; durability also tilts battle health, strength attack, and speed initiative.</p>`;
}
/** Open the guide as a sheet, starting at `position`; the position chips switch it in place. */
export function openStatGuide(position = 'QB') {
  const { el } = sheet(`<div data-guide>${statGuideHtml(position)}</div>`, { title: 'What the stats mean' });
  el.addEventListener('click', (e) => { const p = e.target.closest('[data-guide-pos]')?.dataset.guidePos; if (!p) return; el.querySelector('[data-guide]').innerHTML = statGuideHtml(p); });
}
/** One attribute for one position, as a small sheet (tapped from the monster card). */
export function openStatMeaning(position, attr, name = null) {
  const helps = attributeHelps(position, attr);
  sheet(`<p><b>${esc(ATTR_NAME[attr])}</b> · ${esc(STAT_GUIDE[attr].summary)}</p><p>${name ? `For ${esc(name)} (${esc(POSITION_NAME[position].toLowerCase())}): ` : ''}${esc(statMeaning(position, attr))}</p>${helps ? '' : '<p class="dim">Attribute points cannot be spent here.</p>'}<button class="btn small" data-guide-all="${position}">All twelve for a ${esc(POSITION_NAME[position].toLowerCase())}</button>`, { title: ATTR_NAME[attr] })
    .el.addEventListener('click', (e) => { const p = e.target.closest('[data-guide-all]')?.dataset.guideAll; if (!p) return; e.target.closest('.sheet-backdrop')?.remove(); openStatGuide(p); });
}
