// Sim Ahead on HQ (2026-11-21): run whole weeks, Sunday included, until something needs the owner (src/franchise/sim-weeks.js).
// Weeks run one at a time with a pause between them, so the screen shows each result as it lands and Stop takes effect
// after the current week. Every finished week is saved before the next one starts.
import { sheet } from './dom.js';
import { t } from '../text/index.js';
import { simOneWeek, canSimAhead } from '../franchise/sim-weeks.js';

export const simAheadButtonHtml = (f) => (canSimAhead(f) ? `<button class="btn block" data-action="simahead" style="margin-top:8px">${t('sim.button')}</button>` : '');

const weekLine = (e) => (e.bye ? t('sim.week_bye', { week: e.week })
  : e.won ? t('sim.week_won', { week: e.week, opponent: e.opponent, us: e.score[0], them: e.score[1] })
    : t('sim.week_lost', { week: e.week, opponent: e.opponent, us: e.score[0], them: e.score[1] }));
// Written out key by key so the central-text check sees every line in use.
const STOP = {
  'season-over': () => t('sim.stop_season_over'), 'live-game': () => t('sim.stop_live_game'), draft: () => t('sim.stop_draft'),
  goal: () => t('sim.stop_goal'), playoffs: () => t('sim.stop_playoffs'), commissioner: () => t('sim.stop_commissioner'),
  'trade-call': () => t('sim.stop_trade_call'), lineup: () => t('sim.stop_lineup'),
  rival: (s) => t('sim.stop_rival', { opponent: s.opponent }), badge: (s) => t('sim.stop_badge', { opponent: s.opponent }),
  injury: (s) => t('sim.stop_injury', { names: (s.names || []).join(', ') }), evolution: (s) => t('sim.stop_evolution', { names: (s.names || []).join(', ') }),
  blocked: (s) => t('sim.stop_blocked', { reason: s.reason || '' }),
};
const stopLine = (s) => (STOP[s?.code] || (() => t('sim.stopped_by_you')))(s);

export function openSimAhead(app, Router) {
  const f = app.f; if (!f || !canSimAhead(f)) return;
  const big = f.settings.simStopBigGames !== false;
  let running = false, stopAsked = false, finished = false;
  const { el, close } = sheet(`<p>${t('sim.intro')}</p>
    <label class="set-row set-toggle"><span class="set-text"><b>${t('sim.stop_big_games')}</b><small class="set-hint">${t('sim.stop_big_games_hint')}</small></span><input type="checkbox" role="switch" data-sim="big" ${big ? 'checked' : ''}></label>
    <div class="stack" data-sim="choices" style="margin-top:8px"><button class="btn primary block" data-sim="go" data-weeks="all">${t('sim.until_needed')}</button><button class="btn block" data-sim="go" data-weeks="2">${t('sim.two_weeks')}</button></div>
    <div data-sim="progress" hidden><ul data-sim="log" style="padding-left:18px;margin:6px 0"></ul><p class="muted" data-sim="status" role="status"></p><button class="btn block" data-sim="stop">${t('sim.stop_after_week')}</button></div>`,
  { title: t('sim.title'), onClose: () => { stopAsked = true; if (running || finished) Router.go('hq', {}, { reset: true }); } });
  el.classList.add('sim-ahead'); // shares the Settings switch style
  const $ = (k) => el.querySelector(`[data-sim="${k}"]`);
  $('big').addEventListener('change', () => { f.settings.simStopBigGames = $('big').checked; app.save(); });
  $('stop').addEventListener('click', () => { stopAsked = true; $('stop').disabled = true; $('status').textContent = t('sim.stopping'); });
  for (const b of el.querySelectorAll('[data-sim="go"]')) b.addEventListener('click', () => run(b.dataset.weeks === 'all' ? Infinity : Number(b.dataset.weeks)));
  async function run(limit) {
    if (running) return; running = true;
    $('choices').hidden = true; $('big').disabled = true; $('progress').hidden = false;
    let played = 0, stop = null;
    while (played < limit && !stopAsked) {
      $('status').textContent = t('sim.running', { week: f.season.week });
      await new Promise((r) => setTimeout(r, 30)); // let the status paint before the week's work
      const r = simOneWeek(f, { stopBeforeBigGames: $('big').checked });
      if (r.entry) { played++; const li = document.createElement('li'); li.textContent = weekLine(r.entry); $('log').appendChild(li); }
      await app.save({ immediate: true }); // each finished week is kept before the next starts
      if (r.stop || !r.ok) { stop = r.stop; break; }
    }
    if (played) app.backup?.(f);
    running = false; finished = true;
    $('status').textContent = stopAsked && !stop ? t('sim.stopped_by_you') : played >= limit && !stop ? t('sim.weeks_done', { n: played }) : stopLine(stop);
    const done = $('stop'); done.disabled = false; done.textContent = t('sim.done'); done.classList.add('primary');
    done.replaceWith(done.cloneNode(true)); $('stop').addEventListener('click', () => close());
  }
}
