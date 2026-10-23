// The Career Timeline section (GDD §38.4, interactive since §40.3). Seasons newest first, each with a separator; events as
// cards weighted by importance (major gold, notable accented, career quiet); a Highlights filter; the long tail folded behind
// one tap. An event with a verified record behind it is a button that opens it; one without stays a plain card. Filtering,
// unfolding and opening details never re-render the screen: only this section redraws, and it keeps its place.

import { monsterTimeline, ROUND_NAMES } from '../franchise/franchise.js';
import { eventRef } from '../franchise/career-profile.js';
import { yearOf } from '../data/calendar.js';
import { TEAM_META } from '../data/league.js';
import { esc } from './dom.js';

export const TIMELINE_FOLD = 6; // events shown before "show the whole career"
const view = { filter: 'all', open: {} }; // per session: the filter, and which monsters are unfolded
export const timelineView = view;

function itemHtml(e, i, animate, interactive) {
  const col = TEAM_META[e.c]?.color || null;
  const meta = [e.w != null ? (e.w > 10 ? (ROUND_NAMES[e.w - 10] || 'Playoffs') : `Week ${e.w}`) : null, e.c ? `<span class="tl-club"${col ? ` style="--club:${col}"` : ''}>${esc(e.c)}</span>` : null].filter(Boolean).join(' · ');
  const link = interactive && e.ref;
  const inner = `<span class="tl-icon" aria-hidden="true">${e.icon}</span>
    <div class="tl-body"><div class="tl-title">${esc(e.title)}${e.tier === 'major' ? ' <span class="tl-badge">★</span>' : ''}</div>${meta ? `<div class="tl-meta">${meta}</div>` : ''}<div class="tl-desc">${esc(e.desc)}</div></div>${link ? '<span class="tl-go" aria-hidden="true">›</span>' : ''}`;
  return `<li class="tl-item ${e.tier} t-${e.t} ${link ? 'link' : ''}"${animate ? ` style="--i:${Math.min(i, 10)}"` : ''}>${link ? `<button class="tl-open" data-action="tl-open" data-k="${esc(e.k)}" aria-label="${esc(`${e.title}${e.y != null ? `, ${yearOf(e.y)}` : ''}: open the details`)}">${inner}</button>` : inner}</li>`;
}

/**
 * The section for a list of timeline items (careerTimeline output, each with an optional `ref`). opts: { name, id (monster),
 * domId (the section's element id, 'timeline' on the monster card), head (HTML above the filter: the summary and trophies),
 * animate, reduced, interactive }.
 */
export function timelineSectionHtml(all, { name = 'This monster', id = '', domId = null, head = '', animate = true, reduced = false, interactive = true, emptyText = null } = {}) {
  const list = view.filter === 'highlights' ? all.filter((e) => e.tier !== 'career') : all;
  const open = !!view.open[id]; const shown = open ? list : list.slice(0, TIMELINE_FOLD);
  const anim = animate && !reduced;
  const highlights = all.filter((e) => e.tier !== 'career').length; const major = all.filter((e) => e.tier === 'major').length; const seasons = new Set(all.map((i) => i.y).filter((y) => y != null)).size;
  let html = ''; let lastY; let started = false; let i = 0;
  for (const e of shown) {
    if (!started || e.y !== lastY) {
      if (started) html += '</ol>'; started = true;
      const n = list.filter((x) => x.y === e.y).length; const hasMajor = list.some((x) => x.y === e.y && x.tier === 'major');
      html += `<div class="tl-season ${hasMajor ? 'has-major' : ''}"><span>${e.y == null ? 'Before the timeline' : `Season ${esc(yearOf(e.y))}`}</span><span class="dim">${n} moment${n === 1 ? '' : 's'}</span></div><ol class="tl-list">`;
      lastY = e.y;
    }
    html += itemHtml(e, i++, anim, interactive);
  }
  if (shown.length) html += '</ol>';
  const empty = `<div class="tl-empty"><span aria-hidden="true">🌱</span><div><b>${esc(name)}'s story starts here.</b><div class="dim">${emptyText || (view.filter === 'highlights' && all.length ? 'No highlights yet: a first touchdown, an evolution or an award will appear here.' : 'A first game, a first touchdown, an evolution or an award will appear here as they happen.')}</div></div></div>`;
  const more = list.length > shown.length ? `<button class="btn block tl-more" data-action="tl-more" data-id="${esc(id)}">Show the whole career (${list.length - shown.length} more)</button>` : open && list.length > TIMELINE_FOLD ? `<button class="btn block ghost tl-more" data-action="tl-more" data-id="${esc(id)}">Show less</button>` : '';
  return `<section class="panel timeline"${domId ? ` id="${esc(domId)}"` : ''} data-mid="${esc(id)}" aria-label="Career timeline">
    ${head}
    <div class="row between tl-head"><b>Career Timeline</b><div class="tl-filter" role="group" aria-label="Show"><button class="chip ${view.filter === 'all' ? 'on' : ''}" data-action="tl-filter" data-v="all" aria-pressed="${view.filter === 'all'}">All</button><button class="chip ${view.filter === 'highlights' ? 'on' : ''}" data-action="tl-filter" data-v="highlights" aria-pressed="${view.filter === 'highlights'}">Highlights</button></div></div>
    ${all.length ? `<div class="tl-sum dim">${all.length} moment${all.length === 1 ? '' : 's'}${major ? ` · <b class="tl-gold">${major} major</b>` : ''}${seasons ? ` · ${seasons} season${seasons === 1 ? '' : 's'}` : ''}${interactive && all.some((e) => e.ref) ? ' · tap a › entry for the record' : ''}</div>` : ''}
    ${shown.length ? html : empty}${more}
  </section>`;
}

/** The timeline section for one of the owner's monsters (the Phase 1 entry point, kept for callers and tests). */
export function timelineHtml(f, m, { animate = true, head = '', interactive = true } = {}) {
  const items = monsterTimeline(f, m).map((e) => ({ ...e, ref: eventRef(f, m, e) }));
  return timelineSectionHtml(items, { name: m.name, id: m.id, domId: 'timeline', head, animate, reduced: !!f.settings?.reducedMotion, interactive });
}

/** Keep `el` (a section) where the thumb left it while it is replaced: move whichever element scrolls by the shift. */
export function redrawKeepingPlace(el, nextHtml, { keepTop = true } = {}) {
  const scroller = (x) => { for (let p = x.parentElement; p; p = p.parentElement) { const st = getComputedStyle(p); if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight) return p; } return document.scrollingElement || document.documentElement; };
  const sc = scroller(el); const top = el.getBoundingClientRect().top; const parent = el.parentElement; const idx = [...parent.children].indexOf(el);
  el.outerHTML = nextHtml; const n = parent.children[idx];
  if (keepTop && n) { const d = n.getBoundingClientRect().top - top; if (d) sc.scrollTop += d; }
  return n;
}

/**
 * Handlers for a timeline: the filter and the fold redraw only the section (`render(section)` returns its new HTML), and
 * `open(k, section)` opens an event's details. Works on the monster card and inside career sheets alike.
 */
export function timelineActions({ render, open }) {
  const sectionOf = (el) => el.closest('section.timeline');
  return {
    'tl-filter': (el) => { const s = sectionOf(el); if (!s) return; view.filter = el.dataset.v; redrawKeepingPlace(s, render(s)); },
    'tl-more': (el) => { const s = sectionOf(el); if (!s) return; view.open[el.dataset.id] = !view.open[el.dataset.id]; const wasOpen = view.open[el.dataset.id]; const n = redrawKeepingPlace(s, render(s)); if (!wasOpen) n?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    'tl-open': (el) => { const s = sectionOf(el); open?.(el.dataset.k, s); },
  };
}
