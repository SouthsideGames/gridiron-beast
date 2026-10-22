// The Beast Bowl ceremony (GDD §35). Presentation only: it reads the championship record written when the title was won
// (f.history[].championship) and changes nothing in the save. Five scenes on one stage, all CSS animation on a few dozen
// elements: the final whistle, the team takes the field (the real roster, starters in front), the starters' ability
// showcase (staggered, at most three bursts at a time), the trophy, and the summary. Skippable at any moment; reduced
// motion opens on the summary. Revisit it from Franchise History.

import { esc, delegate } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import { elementFx } from '../ability-fx.js';
import { ENVIRONMENTS, stadiumFor } from '../../data/stadiums.js';
import { yearOf } from '../../data/calendar.js';
import { TEAM_META } from '../../data/league.js';
import { championshipRecord } from '../../franchise/franchise.js';

export const CEREMONY_TIMELINE = Object.freeze({ enter: 2600, show: 5600, perStarter: 520, trophyAfter: 900, summaryAfter: 3600 });

/** The championship record for `year` (the latest when omitted), or null. */
export function championshipFor(f, year = null) {
  const list = (f?.history || []).filter((h) => h.championship);
  const h = year == null ? list[list.length - 1] : list.find((x) => x.year === Number(year));
  return h?.championship || null;
}
/** Scene timings for a record (ms from the start). */
export function ceremonyTimes(c) {
  const T = CEREMONY_TIMELINE; const n = c.starters.length;
  const trophy = T.show + n * T.perStarter + T.trophyAfter;
  return { enter: T.enter, show: T.show, starter: (i) => T.show + i * T.perStarter, trophy, summary: trophy + T.summaryAfter };
}

const TROPHY = `<svg class="cer-trophy-svg" viewBox="0 0 64 80" aria-hidden="true"><defs><linearGradient id="cer-gold" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".45" stop-color="#ffe08a"/><stop offset="1" stop-color="#c9971a"/></linearGradient></defs>
  <path d="M14 6 H50 V22 Q50 42 32 46 Q14 42 14 22 Z" fill="url(#cer-gold)" stroke="#7a5a10" stroke-width="1.4"/>
  <path d="M14 10 Q2 10 4 22 Q6 32 16 32" fill="none" stroke="url(#cer-gold)" stroke-width="4"/><path d="M50 10 Q62 10 60 22 Q58 32 48 32" fill="none" stroke="url(#cer-gold)" stroke-width="4"/>
  <path d="M32 14 l3 6 6.5 .8 -4.8 4.4 1.3 6.4 -6-3.3 -6 3.3 1.3-6.4 -4.8-4.4 6.5-.8 Z" fill="#fff6c8" opacity=".9"/>
  <rect x="28" y="46" width="8" height="12" fill="url(#cer-gold)"/><rect x="18" y="58" width="28" height="8" rx="2" fill="url(#cer-gold)" stroke="#7a5a10" stroke-width="1.2"/><rect x="14" y="66" width="36" height="10" rx="2" fill="#3a2a10" stroke="#7a5a10" stroke-width="1.2"/>
  <text x="32" y="73.5" text-anchor="middle" font-size="5" font-weight="900" fill="#ffe08a" font-family="system-ui">BEAST BOWL</text></svg>`;

function summaryHtml(f, c, fromGame) {
  const fin = c.final;
  return `<div class="cer-summary" role="dialog" aria-label="Championship summary">
    <div class="cer-sum-title">🏆 BEAST BOWL CHAMPIONS${c.preview ? ' · PREVIEW' : ''}</div>
    <div class="cer-sum-club" style="color:${c.color}">${esc(c.club)}</div>
    <div class="dim">Season ${esc(yearOf(c.year))}</div>
    ${fin ? `<div class="cer-sum-score"><b>${fin.us}</b> <span class="dim">–</span> <b>${fin.them}</b> <span class="dim">vs ${esc(fin.opponent)}${fin.ot ? ' · OT' : ''}</span></div><div class="dim" style="font-size:12px">${esc(fin.venue || '')}</div>` : ''}
    <div class="kv cer-kv"><b>Season record</b><span>${c.record.w}-${c.record.l}${c.record.t ? '-' + c.record.t : ''}</span><b>Playoffs</b><span>${c.playoffs.w}-${c.playoffs.l}</span><b>Beast Bowl</b><span>${fin ? `Won ${fin.us}-${fin.them}` : 'Won'}</span>${c.captain ? `<b>Captain</b><span>${esc((c.starters.find((m) => m.id === c.captain) || {}).name || '')}</span>` : ''}</div>
    <h3 style="margin:10px 0 4px">League awards</h3>
    ${c.awards.length ? `<div class="list">${c.awards.map((a) => `<div class="item static"><div class="grow"><div class="name">🏅 ${esc(a.label)}</div><div class="sub">${esc(a.name)}</div></div></div>`).join('')}</div>` : '<p class="dim" style="margin:0">None of your monsters won a league award this season.</p>'}
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn" data-action="cer-replay">↻ Replay ceremony</button><button class="btn primary grow" data-action="cer-done">${fromGame ? 'Continue' : 'Back'}</button></div>
  </div>`;
}

export function registerCeremony(Router, app) {
  let timers = [];
  const clear = () => { for (const t of timers) clearTimeout(t); timers = []; };
  Router.registerScreen('ceremony', {
    title: 'Beast Bowl', tabs: false, back: false, help: false,
    render({ f, params }) {
      const c = params?.preview ? championshipRecord(f) : championshipFor(f, params?.year); if (!c) return '<div class="panel"><p>No championship to celebrate yet.</p><button class="btn block" data-action="cer-done">Back</button></div>';
      const env = ENVIRONMENTS[stadiumFor(c.final?.home || c.club, f.stadiums).env] || ENVIRONMENTS.grass; const P = env.palette;
      const starters = c.starters.map((m, i) => { const fx = elementFx(m.type); return `<div class="cer-mon starter" data-i="${i}" style="--d:${(i * 70)}ms;--a:${fx.a};--b:${fx.b}"><div class="cer-burst ${esc(fx.style)}" aria-hidden="true">${Array.from({ length: 6 }, (_, k) => `<i style="--k:${k}">${fx.glyph}</i>`).join('')}</div>${monsterSprite(m, 40)}<span class="cer-tag">${esc(m.slot || m.position)}</span><span class="cer-ab">${esc(m.ability || m.name)}</span></div>`; }).join('');
      const roster = c.roster.slice(0, 30).map((m, i) => `<div class="cer-mon bench" style="--d:${600 + i * 40}ms">${monsterSprite(m, 24)}</div>`).join('');
      const confetti = Array.from({ length: 36 }, (_, k) => `<i style="--x:${(k * 37) % 100}%;--r:${(k * 53) % 360}deg;--t:${(k % 7) * 160}ms;--c:${k % 3 === 0 ? c.color : k % 3 === 1 ? '#ffe08a' : '#ffffff'}"></i>`).join('');
      const fin = c.final; const cap = c.starters.find((m) => m.id === c.captain);
      const reduced = !!f.settings.reducedMotion || params?.summary;
      return `<div class="ceremony ${reduced ? 'sc-summary reduced' : 'sc-final'}" id="ceremony" style="--team:${c.color};--turf-a:${P.b};--turf-b:${P.c};--end:${P.end}">
        <div class="cer-stage">
          <div class="cer-stands" aria-hidden="true"></div><div class="cer-turf" aria-hidden="true"></div><div class="cer-lights" aria-hidden="true"></div>
          <div class="cer-board"><div class="cer-board-label">FINAL${fin?.ot ? ' · OT' : ''}</div><div class="cer-board-score"><span style="color:${c.color}">${esc(TEAM_META[c.club]?.abbr || c.club)}</span> <b>${fin ? fin.us : ''}</b> – <b>${fin ? fin.them : ''}</b> <span>${esc(TEAM_META[fin?.opponent]?.abbr || fin?.opponent || '')}</span></div></div>
          <div class="cer-banner"><span>BEAST BOWL</span><b>CHAMPIONS</b></div>
          <div class="cer-bench">${roster}</div>
          <div class="cer-starters">${starters}</div>
          <div class="cer-trophy">${TROPHY}${cap ? `<div class="cer-captain">${monsterSprite(cap, 48)}<div class="cer-cap-name">${esc(cap.name)} lifts the trophy</div></div>` : ''}<div class="cer-club" style="color:${c.color}">${esc(c.club)}</div></div>
          <div class="cer-confetti" aria-hidden="true">${confetti}</div>
          <div class="cer-caption" aria-live="polite"></div>
          <div class="cer-scene-label"></div>
        </div>
        <div class="cer-controls"><button class="btn small" data-action="cer-skip">Skip ▸▸</button></div>
        ${summaryHtml(f, c, !!params?.fromGame)}
      </div>`;
    },
    mount(root, ctx) {
      const f = app.f; const c = ctx.params?.preview ? championshipRecord(f) : championshipFor(f, ctx.params?.year); clear();
      const done = () => { clear(); if (ctx.params?.fromGame) Router.go('hq', {}, { reset: true }); else Router.back(); };
      delegate(root, {
        'cer-skip': () => { clear(); const el = root.querySelector('#ceremony'); if (el) el.className = 'ceremony sc-summary'; },
        'cer-replay': () => { clear(); Router.render(); },
        'cer-done': done,
      });
      const el = root.querySelector('#ceremony'); if (!c || !el || el.classList.contains('reduced')) return;
      const T = ceremonyTimes(c); const label = el.querySelector('.cer-scene-label');
      const scene = (name, text) => { el.classList.remove('sc-final', 'sc-enter', 'sc-show', 'sc-trophy'); el.classList.add(name); if (label) label.textContent = text; };
      timers.push(setTimeout(() => scene('sc-enter', 'The champions take the field'), T.enter));
      timers.push(setTimeout(() => scene('sc-show', 'Starters, show them what you have'), T.show));
      const cap = el.querySelector('.cer-caption');
      c.starters.forEach((m, i) => timers.push(setTimeout(() => {
        const s = el.querySelector(`.cer-mon.starter[data-i="${i}"]`); s?.classList.add('go'); timers.push(setTimeout(() => s?.classList.remove('go'), 1300));
        // one caption at a time, centred: whose ability, in its element's colours (the burst itself stays on the monster)
        if (cap) { cap.innerHTML = `<b>${esc(m.name)}</b> <span class="dim">${esc(m.slot || m.position)}</span> · <span class="cer-cap-ab" style="color:${s?.style.getPropertyValue('--a') || '#ffe08a'}">${esc(m.ability || 'Champion')}</span>`; cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop'); }
      }, T.starter(i))));
      timers.push(setTimeout(() => { if (cap) cap.innerHTML = ''; }, T.trophy));
      timers.push(setTimeout(() => scene('sc-trophy', 'The Beast Bowl trophy'), T.trophy));
      timers.push(setTimeout(() => { el.classList.remove('sc-trophy'); el.classList.add('sc-summary'); }, T.summary));
    },
    unmount() { clear(); },
  });
}
