// Coach Assist UI (GDD §27.3; replaces the first-week tutorial of §15.13). What to show is decided in src/franchise/assist.js;
// this file draws it: the first-use tip panel at the top of a screen, sheet tips for the match screen and for moments, the
// "? Help" sheet every complex screen carries in every mode, and the football primer.
import { esc, sheet } from './dom.js';
import { rosterWarnings } from '../franchise/assist-advice.js';
import { TOPICS, AREAS, TOPIC_KEYS, ASSIST_MODES, ASSIST_MODE_TEXT, assistSettings, setAssist, autoTip, momentTip, dismissTip, resetTips, tipProgress, helpTopics } from '../franchise/assist.js';
import { t as $t } from '../text/index.js';

// Older imports keep working.
export { resetTips as resetTutorial };
export const TIPS = TOPICS;
export function tutorialOn(f) { return !!f && assistSettings(f).mode !== 'expert'; }
export function markSeen(f, key) { dismissTip(f, key); }

const para = (t) => esc(t).replace(/\n\n/g, '</p><p>');
const stepsHtml = (steps) => steps?.length ? `<ol class="assist-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '';

/** The inline first-use tip for `screen`, or '' (Expert, already dismissed, or a sheet-style tip). */
export function tipHtml(f, screen) {
  const t = autoTip(f, screen); if (!t || t.sheet) return '';
  const p = tipProgress(f);
  return `<div class="tip" role="note" data-tip="${t.key}"><div class="row between"><b>${t.guided ? '🧭' : '📘'} ${esc(t.title)}</b><span class="dim" style="font-size:11px">${t.guided ? $t('shared.guided') : `${$t('shared.tip', { n: Math.min(p.done + 1, p.total), total: p.total })}`}</span></div><p>${para(t.text)}</p>${stepsHtml(t.steps)}<div class="row" style="flex-wrap:wrap"><button class="btn small primary" data-action="tut-ok" data-k="${t.key}">${$t('shared.got_it')}</button>${t.primer ? `<button class="btn small" data-action="tut-primer">${$t('shared.how_football_works')}</button>` : ''}<button class="btn small ghost" data-action="tut-expert">${$t('shared.turn_tips_off')}</button></div></div>`;
}

/** Sheet-style tips (the match screen, moments such as the clock): open once, then remembered. */
export function maybeSheetTip(f, screen, save) {
  const t = autoTip(f, screen); if (!t || !t.sheet) return false;
  openTipSheet(f, t, save); return true;
}
/** A moment tip by topic key (clock, decisions, overtime): once, never in Expert. Returns true when shown. */
export function momentSheet(f, key, save) {
  const t = momentTip(f, key); if (!t) return false; openTipSheet(f, t, save); return true;
}
function openTipSheet(f, t, save) {
  dismissTip(f, t.key); save?.();
  sheet(`<p>${para(t.text)}</p>${stepsHtml(t.steps)}<div class="row" style="flex-wrap:wrap">${t.primer ? `<button class="btn small" data-action="tut-primer">${$t('shared.how_football_works')}</button>` : ''}<button class="btn small ghost" data-action="tut-expert">${$t('shared.turn_tips_off')}</button></div>`, { title: `${t.guided ? '🧭' : '📘'} ${t.title}` });
}

/** Roster and cap warnings as short notes: critical ones always, the rest when contextual hints are on. `max` keeps HQ short. */
export function warningsHtml(f, { max = 3, only = null } = {}) {
  const ws = rosterWarnings(f).filter((w) => !only || only.includes(w.key)).slice(0, max);
  return ws.map((w) => `<div class="assist-note ${w.level === 'critical' ? 'critical' : ''}" role="${w.level === 'critical' ? 'alert' : 'note'}">${w.level === 'critical' ? '⚠️' : '💡'} ${esc(w.text)}</div>`).join('');
}
/** A Guided suggestion or a consequence line, ready to drop into a screen ('' when off). */
export function noteHtml(text, kind = '') { return text ? `<p class="assist-note ${kind}">${kind === 'suggest' ? '🧭 ' : ''}${esc(text)}</p>` : ''; }

/** Does this screen carry the "? Help" button? (Every mode: help is on demand, never automatic.) */
export function hasHelp(screen) { return helpTopics(screen).length > 0; }
export function helpButtonHtml(screen) { return hasHelp(screen) ? `<button class="btn ghost help-btn" data-action="assist-help" data-screen="${esc(screen)}" aria-label="${$t('shared.help_for_this_screen')}">${$t('shared.help')}</button>` : ''; }

function topicHtml(k, open = false) {
  const t = TOPICS[k];
  return `<details class="assist-topic" ${open ? 'open' : ''}><summary><b>${esc(t.title)}</b></summary><p>${para(t.brief)}</p>${stepsHtml(t.steps)}${t.primer ? `<button class="btn small" data-action="tut-primer">${$t('shared.how_football_works')}</button>` : ''}</details>`;
}
/** The help sheet: this screen's topics first, the Coach Assist mode switch, then everything else by area. */
export function helpHtml(f, screen) {
  const here = helpTopics(screen); const a = f ? assistSettings(f) : null;
  const rest = TOPIC_KEYS.filter((k) => !here.includes(k));
  return `${here.length ? `<h3 style="margin-top:0">${$t('shared.on_this_screen')}</h3>${here.map((k, i) => topicHtml(k, i === 0)).join('')}` : ''}
    ${a ? `<h3>${$t('shared.coach_assist')}</h3><div class="chips" role="radiogroup" aria-label="${$t('shared.coach_assist_mode')}">${ASSIST_MODES.map((m) => `<button class="chip ${a.mode === m ? 'on accent' : ''}" role="radio" aria-checked="${a.mode === m}" data-action="assist-mode" data-v="${m}">${ASSIST_MODE_TEXT[m].label}</button>`).join('')}</div><p class="dim" style="margin:4px 0 0">${$t('shared.change_it_any_time_here_or', { text: esc(ASSIST_MODE_TEXT[a.mode].text) })}</p>` : ''}
    <h3>${$t('shared.all_topics')}</h3>${AREAS.map((area) => { const ks = rest.filter((k) => TOPICS[k].area === area); return ks.length ? `<div class="dim" style="margin:8px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.04em">${esc(area)}</div>${ks.map((k) => topicHtml(k)).join('')}` : ''; }).join('')}
    <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn small" data-action="tut-primer">${$t('shared.how_football_works')}</button><button class="btn small" data-action="assist-stats">${$t('shared.what_the_stats_mean')}</button></div>`;
}
export function openHelp(app, screen, onChange) {
  const { el, close } = sheet(helpHtml(app.f, screen), { title: $t('shared.help_2') });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="assist-mode"]'); if (!b || !app.f) return;
    setAssist(app.f, { mode: b.dataset.v }); app.save(); close(); onChange?.(); openHelp(app, screen, onChange);
  });
}

/** Coach Assist settings block (Settings screen). */
export function assistSettingsHtml(f) {
  const a = assistSettings(f);
  return `<div class="field"><span>${$t('shared.coach_assist')}</span><div class="seg" role="radiogroup" aria-label="${$t('shared.coach_assist_mode')}" style="display:flex;gap:6px;flex-wrap:wrap">${ASSIST_MODES.map((m) => `<button class="btn small ${a.mode === m ? 'primary' : ''}" role="radio" aria-checked="${a.mode === m}" data-action="assist-mode" data-v="${m}">${ASSIST_MODE_TEXT[m].label}${m === 'standard' ? ' (Default)' : ''}</button>`).join('')}</div><div class="dim" style="margin-top:4px">${esc(ASSIST_MODE_TEXT[a.mode].text)}</div></div>
    <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="assist-hints" ${a.hints ? 'checked' : ''}> ${$t('shared.contextual_hints_counter_plays_upgrades_roster')}</label>
    <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="assist-consequences" ${a.consequences ? 'checked' : ''}> ${$t('shared.explain_what_routine_choices_will_do')}</label>
    <p class="dim">${$t('shared.confirmations_for_choices_you_cannot_undo')}</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn small" data-action="tutreset">${$t('shared.show_all_tips_again')}</button><button class="btn small" data-action="primer">${$t('shared.how_football_works')}</button></div>`;
}

/** The football primer, as a sheet. */
export function primerHtml() {
  return `<h3>${$t('shared.the_field')}</h3><p>${$t('shared.100_yards_long_an_end_zone')}</p>
  <h3>${$t('shared.downs')}</h3><p>${$t('shared.the_offense_gets_four_plays_downs')}</p>
  <h3>${$t('shared.scoring')}</h3><p>${$t('shared.touchdown_carry_or_catch_the_ball')}</p>
  <h3>${$t('shared.fourth_down')}</h3><p>${$t('shared.too_far_to_go_punt_kick')}</p>
  <h3>${$t('shared.positions_7_a_side')}</h3><p>${$t('shared.b_offense_b_qb_throws_or')}</p>
  <h3>${$t('shared.turnovers')}</h3><p>${$t('shared.interception_defense_catches_a_pass_or')}</p>
  <h3>${$t('shared.attributes')}</h3><p>${$t('shared.every_monster_has_twelve_attributes_speed')}</p>
  <h3>${$t('shared.what_you_do')}</h3><p>${$t('shared.you_dont_steer_anyone_you_build')}</p>`;
}

/** Hook the tip and help buttons once, for every screen. */
export function initTutorial({ app, Router, openStats }) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action^="tut-"], [data-action="assist-help"], [data-action="assist-stats"]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'tut-primer') { sheet(primerHtml(), { title: $t('shared.how_football_works') }); return; }
    if (a === 'assist-stats') { openStats?.(); return; }
    if (a === 'assist-help') { openHelp(app, b.dataset.screen, () => Router.render()); return; }
    if (!app.f) return;
    if (a === 'tut-ok') { dismissTip(app.f, b.dataset.k); app.save(); Router.render(); }
    else if (a === 'tut-expert' || a === 'tut-off') { setAssist(app.f, { mode: 'expert' }); app.save(); b.closest('.sheet-backdrop')?.remove(); Router.render(); }
  });
}
