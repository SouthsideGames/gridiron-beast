// The coach appearance editor (coach creation expansion). One component used twice: during franchise creation (onboarding) and
// from My office afterwards. It only ever produces a portrait spec string; saving it changes f.owner.portrait and nothing else.
import { esc } from './dom.js';
import { COACH_CATEGORIES, coachPortrait, coachSpec, labelOf, randomLook, DEFAULT_LOOK } from './coach-portrait.js';
import { t as $t } from '../text/index.js';

/** Editor HTML: a live preview, category tabs, and for each option a ◀ name ▶ stepper plus tappable choices. */
export function coachEditorHtml(look, { tab = 'face', teamColor = null, teamNote = '' } = {}) {
  const L = { ...DEFAULT_LOOK, ...look }; const cat = COACH_CATEGORIES.find((c) => c.id === tab) || COACH_CATEGORIES[0];
  const name = (o, v) => (o.name ? o.name(v) : '') || (o.swatch ? '' : labelOf(v));
  const option = (o) => {
    const i = Math.max(0, o.values.findIndex((v) => String(v) === String(L[o.key]))); const cur = o.values[i];
    const chips = o.values.map((v) => { const sw = o.swatch ? o.swatch(v) : null; const on = String(v) === String(L[o.key]);
      return `<button class="ce-chip ${on ? 'selected' : ''} ${sw ? 'ce-swatch' : ''}" data-action="ce-set" data-k="${o.key}" data-v="${esc(String(v))}" aria-pressed="${on}" aria-label="${esc(o.label)}: ${esc(name(o, v) || String(v))}">${sw ? `<span style="background:${sw}"></span>` : esc(name(o, v))}</button>`; }).join('');
    return `<div class="ce-option"><div class="ce-row"><span class="ce-label">${esc(o.label)}</span><span class="ce-stepper"><button class="btn small" data-action="ce-step" data-k="${o.key}" data-d="-1" aria-label="Previous ${esc(o.label)}">◀</button><span class="ce-value">${esc(name(o, cur) || `${i + 1} / ${o.values.length}`)}</span><button class="btn small" data-action="ce-step" data-k="${o.key}" data-d="1" aria-label="Next ${esc(o.label)}">▶</button></span></div><div class="ce-chips">${chips}</div></div>`;
  };
  return `<div class="coach-editor">
    <div class="ce-top"><div class="ce-preview">${coachPortrait(L, 128, { teamColor })}</div>
      <div class="ce-side"><button class="btn small" data-action="ce-random">${$t('shared.surprise_me')}</button>${teamNote ? `<div class="dim" style="font-size:11px;margin-top:6px">${esc(teamNote)}</div>` : ''}</div></div>
    <div class="ce-tabs" role="tablist">${COACH_CATEGORIES.map((c) => `<button class="ce-tab ${c.id === cat.id ? 'on' : ''}" role="tab" aria-selected="${c.id === cat.id}" data-action="ce-tab" data-v="${c.id}"><span aria-hidden="true">${c.icon}</span> ${esc(c.label)}</button>`).join('')}</div>
    <div class="ce-body">${cat.options.map(option).join('')}</div>
  </div>`;
}
/** Editor actions for a `delegate` map. `state` is { look, tab }; `redraw` re-renders the host screen. */
export function coachEditorActions(state, redraw) {
  const find = (k) => COACH_CATEGORIES.flatMap((c) => c.options).find((o) => o.key === k);
  const coerce = (o, raw) => o.values.find((v) => String(v) === String(raw));
  return {
    'ce-tab': (el) => { state.tab = el.dataset.v; redraw(); },
    'ce-set': (el) => { const o = find(el.dataset.k); if (!o) return; const v = coerce(o, el.dataset.v); if (v === undefined) return; state.look = { ...state.look, [o.key]: v }; redraw(); },
    'ce-step': (el) => { const o = find(el.dataset.k); if (!o) return; const i = Math.max(0, o.values.findIndex((v) => String(v) === String(state.look[o.key]))); const n = o.values.length; state.look = { ...state.look, [o.key]: o.values[(i + Number(el.dataset.d) + n) % n] }; redraw(); },
    'ce-random': () => { state.look = randomLook((Math.random() * 0xffffffff) >>> 0); redraw(); },
  };
}
export const specOf = (state) => coachSpec(state.look);
