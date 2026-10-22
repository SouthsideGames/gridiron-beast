// Coach Assist UI (GDD §27.3; replaces the first-week tutorial of §15.13). What to show is decided in src/franchise/assist.js;
// this file draws it: the first-use tip panel at the top of a screen, sheet tips for the match screen and for moments, the
// "? Help" sheet every complex screen carries in every mode, and the football primer.
import { esc, sheet } from './dom.js';
import { rosterWarnings } from '../franchise/assist-advice.js';
import { TOPICS, AREAS, TOPIC_KEYS, ASSIST_MODES, ASSIST_MODE_TEXT, assistSettings, setAssist, autoTip, momentTip, dismissTip, resetTips, tipProgress, helpTopics } from '../franchise/assist.js';

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
  return `<div class="tip" role="note" data-tip="${t.key}"><div class="row between"><b>${t.guided ? '🧭' : '📘'} ${esc(t.title)}</b><span class="dim" style="font-size:11px">${t.guided ? 'Guided' : `tip ${Math.min(p.done + 1, p.total)}/${p.total}`}</span></div><p>${para(t.text)}</p>${stepsHtml(t.steps)}<div class="row" style="flex-wrap:wrap"><button class="btn small primary" data-action="tut-ok" data-k="${t.key}">Got it</button>${t.primer ? '<button class="btn small" data-action="tut-primer">How football works</button>' : ''}<button class="btn small ghost" data-action="tut-expert">Turn tips off</button></div></div>`;
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
  sheet(`<p>${para(t.text)}</p>${stepsHtml(t.steps)}<div class="row" style="flex-wrap:wrap">${t.primer ? '<button class="btn small" data-action="tut-primer">How football works</button>' : ''}<button class="btn small ghost" data-action="tut-expert">Turn tips off</button></div>`, { title: `${t.guided ? '🧭' : '📘'} ${t.title}` });
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
export function helpButtonHtml(screen) { return hasHelp(screen) ? `<button class="btn ghost help-btn" data-action="assist-help" data-screen="${esc(screen)}" aria-label="Help for this screen">? Help</button>` : ''; }

function topicHtml(k, open = false) {
  const t = TOPICS[k];
  return `<details class="assist-topic" ${open ? 'open' : ''}><summary><b>${esc(t.title)}</b></summary><p>${para(t.brief)}</p>${stepsHtml(t.steps)}${t.primer ? '<button class="btn small" data-action="tut-primer">How football works</button>' : ''}</details>`;
}
/** The help sheet: this screen's topics first, the Coach Assist mode switch, then everything else by area. */
export function helpHtml(f, screen) {
  const here = helpTopics(screen); const a = f ? assistSettings(f) : null;
  const rest = TOPIC_KEYS.filter((k) => !here.includes(k));
  return `${here.length ? `<h3 style="margin-top:0">On this screen</h3>${here.map((k, i) => topicHtml(k, i === 0)).join('')}` : ''}
    ${a ? `<h3>Coach Assist</h3><div class="chips" role="radiogroup" aria-label="Coach Assist mode">${ASSIST_MODES.map((m) => `<button class="chip ${a.mode === m ? 'on accent' : ''}" role="radio" aria-checked="${a.mode === m}" data-action="assist-mode" data-v="${m}">${ASSIST_MODE_TEXT[m].label}</button>`).join('')}</div><p class="dim" style="margin:4px 0 0">${esc(ASSIST_MODE_TEXT[a.mode].text)} Change it any time here or in Settings.</p>` : ''}
    <h3>All topics</h3>${AREAS.map((area) => { const ks = rest.filter((k) => TOPICS[k].area === area); return ks.length ? `<div class="dim" style="margin:8px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.04em">${esc(area)}</div>${ks.map((k) => topicHtml(k)).join('')}` : ''; }).join('')}
    <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn small" data-action="tut-primer">How football works</button><button class="btn small" data-action="assist-stats">What the stats mean</button></div>`;
}
export function openHelp(app, screen, onChange) {
  const { el, close } = sheet(helpHtml(app.f, screen), { title: 'Help' });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="assist-mode"]'); if (!b || !app.f) return;
    setAssist(app.f, { mode: b.dataset.v }); app.save(); close(); onChange?.(); openHelp(app, screen, onChange);
  });
}

/** Coach Assist settings block (Settings screen). */
export function assistSettingsHtml(f) {
  const a = assistSettings(f);
  return `<div class="field"><span>Coach Assist</span><div class="seg" role="radiogroup" aria-label="Coach Assist mode" style="display:flex;gap:6px;flex-wrap:wrap">${ASSIST_MODES.map((m) => `<button class="btn small ${a.mode === m ? 'primary' : ''}" role="radio" aria-checked="${a.mode === m}" data-action="assist-mode" data-v="${m}">${ASSIST_MODE_TEXT[m].label}${m === 'standard' ? ' (default)' : ''}</button>`).join('')}</div><div class="dim" style="margin-top:4px">${esc(ASSIST_MODE_TEXT[a.mode].text)}</div></div>
    <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="assist-hints" ${a.hints ? 'checked' : ''}> Contextual hints (counter plays, upgrades, roster warnings)</label>
    <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="assist-consequences" ${a.consequences ? 'checked' : ''}> Explain what routine choices will do (cap room after a signing, and so on)</label>
    <p class="dim">Confirmations for choices you cannot undo, and warnings about the cap or an illegal lineup, always show.</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn small" data-action="tutreset">Show all tips again</button><button class="btn small" data-action="primer">How football works</button></div>`;
}

/** The football primer, as a sheet. */
export function primerHtml() {
  return `<h3>The field</h3><p>100 yards long, an end zone at each end. Your offense attacks up the screen toward the far end zone.</p>
  <h3>Downs</h3><p>The offense gets four plays (downs) to gain 10 yards. Gain them and the count resets. “2nd &amp; 7” means second down, 7 yards still needed.</p>
  <h3>Scoring</h3><p>Touchdown: carry or catch the ball in the end zone, 6 points, then a 1-point kick. Field goal: kick it through the posts, 3 points, usually on fourth down when you’re close. Safety: tackled in your own end zone, 2 points to the other team.</p>
  <h3>Fourth down</h3><p>Too far to go? Punt: kick it away so the other team starts far from your end zone. Close enough? Kick the field goal. Feeling brave? Go for it.</p>
  <h3>Positions (7 a side)</h3><p><b>Offense:</b> QB throws or hands off; RB runs; WR catch; TE blocks and catches; OL block. <b>Defense:</b> DL rush the passer and stop runs; LB do a bit of everything; CB cover receivers; S the last line.</p>
  <h3>Turnovers</h3><p>Interception (defense catches a pass) or fumble (ball knocked loose and recovered): the other team gets the ball right there.</p>
  <h3>Attributes</h3><p>Every monster has twelve attributes (speed, catching, arm and so on), but each position only uses some of them: accuracy matters to a quarterback and does nothing for a receiver. <b>More → What the stats mean</b> lists what each one does at every position, and attribute points can only be spent where they help.</p>
  <h3>What you do</h3><p>You don’t steer anyone. You build the team, pick the six plays for each side on Friday, and on Sunday you call one of those plays each snap. Monsters do the rest, using their ratings, natures and abilities.</p>`;
}

/** Hook the tip and help buttons once, for every screen. */
export function initTutorial({ app, Router, openStats }) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action^="tut-"], [data-action="assist-help"], [data-action="assist-stats"]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'tut-primer') { sheet(primerHtml(), { title: 'How football works' }); return; }
    if (a === 'assist-stats') { openStats?.(); return; }
    if (a === 'assist-help') { openHelp(app, b.dataset.screen, () => Router.render()); return; }
    if (!app.f) return;
    if (a === 'tut-ok') { dismissTip(app.f, b.dataset.k); app.save(); Router.render(); }
    else if (a === 'tut-expert' || a === 'tut-off') { setAssist(app.f, { mode: 'expert' }); app.save(); b.closest('.sheet-backdrop')?.remove(); Router.render(); }
  });
}
