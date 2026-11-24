import { t as $t } from '../text/index.js';
// Shared controls used by the match and the football Ability Reviewer.
import { previewPendingFields } from '../sim/rules.js';
import { snapKey, zoneKey } from '../sim/t8/zone-planning.js';
import { abilityById } from '../data/beast-dex.js';
import { esc } from './dom.js';
export function zonePlans(state, teams, side, offense, defense) {
  const fields = previewPendingFields(state, teams, offense, defense, { inSnap: true }).filter((p) => p.ownerTeam === side);
  const groups = new Map();
  for (const p of fields) {
    const key = p.placementKey || zoneKey(p);
    if (groups.has(key)) { groups.get(key).parts.push(p); continue; }
    const saved = state.t8?.zoneChoices;
    const picked = saved?.key === snapKey(state) ? saved.picks?.[key] || 'auto' : 'auto';
    const siblings = fields.filter((f) => f.owner === p.owner && f.ability === p.ability);
    const label = abilityById(p.ability)?.name || p.type;
    groups.set(key, { ...p, key, parts: [p], picked, name: siblings.length > 1 ? `${label} — Zone ${(p.placementIndex ?? 0) + 1}` : label });
  }
  return [...groups.values()];
}
const mixText = (o) => o.overlaps?.map((m) => `${m.name}: ${m.remaining == null ? 'while both zones remain' : `${m.remaining} shared plays`}`).join(' · ') || '';
// What each zone does, in a line (owner 2026-11-24: the panel explains the zone, not the rules for moving it).
const ZONE_FX = { Fire: () => $t('playview.zone_fx_fire'), Water: () => $t('playview.zone_fx_water'), Nature: () => $t('playview.zone_fx_nature'), Electric: () => $t('playview.zone_fx_electric'), Earth: () => $t('playview.zone_fx_earth'), Ice: () => $t('playview.zone_fx_ice'), Wind: () => $t('playview.zone_fx_wind'), Psychic: () => $t('playview.zone_fx_psychic'), Dark: () => $t('playview.zone_fx_dark'), Light: () => $t('playview.zone_fx_light'), Metal: () => $t('playview.zone_fx_metal'), Dragon: () => $t('playview.zone_fx_dragon') };
// Combination zones by their two parent types (names can be translated, the parents cannot).
const COMBO_FX = { 'Fire+Water': () => $t('playview.combo_fx_steam'), 'Dark+Light': () => $t('playview.combo_fx_eclipse'), 'Earth+Nature': () => $t('playview.combo_fx_living_terrain'), 'Electric+Metal': () => $t('playview.combo_fx_magnetic_storm'), 'Ice+Wind': () => $t('playview.combo_fx_froststorm'), 'Electric+Psychic': () => $t('playview.combo_fx_mindstorm') };
export const zoneEffectText = (type) => ZONE_FX[type]?.() || '';
export const comboEffectText = (parents) => COMBO_FX[[...parents].sort().join('+')]?.() || '';
/** One line per spot that would join an existing zone into a combination zone: which combination, and what it does. */
function comboLines(p) {
  const out = [];
  for (const o of p.placementOptions) for (const m of o.overlaps || []) {
    const [a, b] = m.parents[0] === p.type ? m.parents : [...m.parents].reverse();
    const line = $t('playview.zone_combo', { spot: o.label, name: m.name, a, b, effect: comboEffectText(m.parents) }) + (m.cross ? ` ${$t('playview.zone_combo_both')}` : '');
    if (!out.some((l) => l.line === line)) out.push({ line, picked: p.picked === o.id });
  }
  return out.map((l) => `<div class="zone-combo${l.picked ? ' picked' : ''}">◆ ${esc(l.line)}</div>`).join('');
}
export function zonePlannerHtml(plans, { action = 'zonepick', focus = null, focusAction = 'zonefocus' } = {}) {
  if (!plans.length) return '';
  return `<div class="panel tight zone-planner" role="region" aria-label="Zone placement"><b>◇ Zone abilities ready this play</b><p class="dim" style="font-size:12px;margin:4px 0">${esc($t('playview.zone_how'))}</p>${plans.map((p) => `<div style="margin-top:8px"><button class="btn small ghost" data-action="${focusAction}" data-zone="${esc(p.key)}" aria-pressed="${(focus || plans[0].key) === p.key}">${esc(p.name)} · ${p.remaining} plays</button>${zoneEffectText(p.type) ? `<div class="zone-what">${esc($t('playview.zone_what', { type: p.type, effect: zoneEffectText(p.type) }))}</div>` : ''}${p.placementOptions.length ? `<div class="row" style="gap:5px;flex-wrap:wrap;margin-top:4px">${[{ id: 'auto', label: 'Auto Place' }, ...p.placementOptions].map((o) => `<button class="btn small ${p.picked === o.id ? 'primary' : 'ghost'}" data-action="${action}" data-zone="${esc(p.key)}" data-choice="${esc(o.id)}" aria-pressed="${p.picked === o.id}" style="min-height:44px">${esc(o.label)}${mixText(o) ? `<small style="display:block">${esc(mixText(o))}</small>` : ''}</button>`).join('')}</div>${comboLines(p)}` : '<div class="dim" style="font-size:12px">Creates at its action or alignment location.</div>'}</div>`).join('')}</div>`;
}
/** Absolute rectangles -> the offense-up field SVG; selected option stays outlined. */
export function zonePlannerOverlay(plan, state, camera, { action = 'zonepick', reducedMotion = false } = {}) {
  if (!plan?.placementOptions?.length) return '';
  const dir = state.possession === 'home' ? 1 : -1;
  const rectSvg = (r) => { const ys = r.yard.map((y) => dir === 1 ? y : 100 - y), ls = r.lat.map((y) => dir * y); return { x: Math.min(...ls), y: camera.top - Math.max(...ys), w: Math.max(...ls) - Math.min(...ls), h: Math.max(...ys) - Math.min(...ys) }; };
  return plan.placementOptions.map((o, i) => {
    const selected = plan.picked === o.id, color = selected ? '#ffffff' : o.overlaps?.length ? '#e3a8ff' : '#ffe27a';
    const parts = plan.parts?.length > 1 ? plan.parts.map((p) => p.placementOptions.find((v) => v.id === o.id)?.rect).filter(Boolean) : [o.rect];
    return parts.map((r) => { const b = rectSvg(r); return `<g data-action="${action}" data-zone="${esc(plan.key)}" data-choice="${esc(o.id)}" role="button" tabindex="0" aria-label="${esc(o.label)}" style="cursor:pointer"><title>${esc(`${plan.name}: ${o.label}. ${mixText(o)}`)}</title><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${color}" fill-opacity="${selected ? 0.22 : 0.09}" stroke="${color}" stroke-width="${selected ? 0.4 : 0.23}" stroke-dasharray="0.8 0.5">${reducedMotion || selected ? '' : '<animate attributeName="stroke-opacity" values="1;0.35;1" dur="1.5s" repeatCount="indefinite"/>'}</rect><text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 0.5}" text-anchor="middle" fill="${color}" stroke="#14281f" stroke-width="0.12" paint-order="stroke" font-size="1.5" font-weight="bold" pointer-events="none">${esc(o.label)}</text></g>`; }).join('');
  }).join('');
}
