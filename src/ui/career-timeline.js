// The Career Timeline section of the monster card (GDD §38.4). One section, no extra screen: seasons newest first, each
// with a separator, events as cards weighted by importance (major gold, notable accented, career quiet), a Highlights
// filter, and the long tail folded behind one tap. Filtering and unfolding redraw only this section.

import { monsterTimeline, careerSummary, ROUND_NAMES } from '../franchise/franchise.js';
import { yearOf } from '../data/calendar.js';
import { TEAM_META } from '../data/league.js';
import { esc } from './dom.js';

export const TIMELINE_FOLD = 6; // events shown before "show the whole career"
const view = { filter: 'all', open: {} }; // per session: the filter, and which monsters are unfolded

function itemHtml(e, i, animate) {
  const col = TEAM_META[e.c]?.color || null;
  const meta = [e.w != null ? (e.w > 10 ? (ROUND_NAMES[e.w - 10] || 'Playoffs') : `Week ${e.w}`) : null, e.c ? `<span class="tl-club"${col ? ` style="--club:${col}"` : ''}>${esc(e.c)}</span>` : null].filter(Boolean).join(' · ');
  return `<li class="tl-item ${e.tier} t-${e.t}"${animate ? ` style="--i:${Math.min(i, 10)}"` : ''}>
    <span class="tl-icon" aria-hidden="true">${e.icon}</span>
    <div class="tl-body"><div class="tl-title">${esc(e.title)}${e.tier === 'major' ? ' <span class="tl-badge">★</span>' : ''}</div>${meta ? `<div class="tl-meta">${meta}</div>` : ''}<div class="tl-desc">${esc(e.desc)}</div></div></li>`;
}

/** The whole section for monster `m`. `animate` adds the reveal (off with reduced motion). */
export function timelineHtml(f, m, { animate = true } = {}) {
  const all = monsterTimeline(f, m); const sum = careerSummary(all);
  const list = view.filter === 'highlights' ? all.filter((e) => e.tier !== 'career') : all;
  const open = !!view.open[m.id]; const shown = open ? list : list.slice(0, TIMELINE_FOLD);
  const anim = animate && !f.settings?.reducedMotion;
  let html = ''; let lastY; let started = false; let i = 0;
  for (const e of shown) {
    if (!started || e.y !== lastY) {
      if (started) html += '</ol>'; started = true;
      const n = list.filter((x) => x.y === e.y).length; const major = list.some((x) => x.y === e.y && x.tier === 'major');
      html += `<div class="tl-season ${major ? 'has-major' : ''}"><span>${e.y == null ? 'Before the timeline' : `Season ${esc(yearOf(e.y))}`}</span><span class="dim">${n} moment${n === 1 ? '' : 's'}</span></div><ol class="tl-list">`;
      lastY = e.y;
    }
    html += itemHtml(e, i++, anim);
  }
  if (shown.length) html += '</ol>';
  const empty = `<div class="tl-empty"><span aria-hidden="true">🌱</span><div><b>${esc(m.name)}'s story starts here.</b><div class="dim">${view.filter === 'highlights' && all.length ? 'No highlights yet: a first touchdown, an evolution or an award will appear here.' : 'A first game, a first touchdown, an evolution or an award will appear here as they happen.'}</div></div></div>`;
  const more = list.length > shown.length ? `<button class="btn block tl-more" data-action="tl-more" data-id="${esc(m.id)}">Show the whole career (${list.length - shown.length} more)</button>` : open && list.length > TIMELINE_FOLD ? `<button class="btn block ghost tl-more" data-action="tl-more" data-id="${esc(m.id)}">Show less</button>` : '';
  return `<section class="panel timeline" id="timeline" aria-label="Career timeline">
    <div class="row between tl-head"><b>Career Timeline</b><div class="tl-filter" role="group" aria-label="Show"><button class="chip ${view.filter === 'all' ? 'on' : ''}" data-action="tl-filter" data-v="all" aria-pressed="${view.filter === 'all'}">All</button><button class="chip ${view.filter === 'highlights' ? 'on' : ''}" data-action="tl-filter" data-v="highlights" aria-pressed="${view.filter === 'highlights'}">Highlights</button></div></div>
    ${all.length ? `<div class="tl-sum dim">${sum.total} moment${sum.total === 1 ? '' : 's'}${sum.major ? ` · <b class="tl-gold">${sum.major} major</b>` : ''}${sum.seasons ? ` · ${sum.seasons} season${sum.seasons === 1 ? '' : 's'}` : ''}</div>` : ''}
    ${shown.length ? html : empty}${more}
  </section>`;
}
/** Handlers for the monster screen: redraw only the section, keep the scroll position steady. */
export function timelineActions(f, getMonster) {
  // Keep the section where the thumb left it: whichever element scrolls the screen, move it by the shift of the section's top.
  const scroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const st = getComputedStyle(p); if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight) return p; } return document.scrollingElement || document.documentElement; };
  const redraw = (keepTop) => { const el = document.querySelector('#timeline'); const m = getMonster(); if (!el || !m) return; const sc = scroller(el); const top = el.getBoundingClientRect().top; el.outerHTML = timelineHtml(f, m, { animate: false }); if (keepTop) { const n = document.querySelector('#timeline'); const d = n.getBoundingClientRect().top - top; if (d) sc.scrollTop += d; } };
  return {
    'tl-filter': (el) => { view.filter = el.dataset.v; redraw(true); },
    'tl-more': (el) => { view.open[el.dataset.id] = !view.open[el.dataset.id]; const wasOpen = view.open[el.dataset.id]; redraw(true); if (!wasOpen) document.querySelector('#timeline')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  };
}
