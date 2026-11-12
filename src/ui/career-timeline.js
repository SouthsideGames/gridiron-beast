// The Career Timeline section (GDD §38.4, interactive since §40.3). Seasons newest first, each with a separator; events as
// cards weighted by importance (major gold, notable accented, career quiet); a Highlights filter; the long tail folded behind
// one tap. An event with a verified record behind it is a button that opens it; one without stays a plain card. Filtering,
// unfolding and opening details never re-render the screen: only this section redraws, and it keeps its place.

import { monsterTimeline, ROUND_NAMES } from '../franchise/franchise.js';
import { eventRef } from '../franchise/career-profile.js';
import { yearOf } from '../data/calendar.js';
import { TEAM_META } from '../data/league.js';
import { esc } from './dom.js';
import { t as $t } from '../text/index.js';

export const TIMELINE_FOLD = 6; // events shown before "show the whole career"
const view = { filter: 'all', open: {} }; // per session: the filter, and which monsters are unfolded
export const timelineView = view;

function itemHtml(e, i, animate, interactive) {
  const col = TEAM_META[e.c]?.color || null;
  const meta = [e.w != null ? (e.w > 10 ? (ROUND_NAMES[e.w - 10] || $t('career.playoffs')) : `${$t('career.week_3', { w: e.w })}`) : null, e.c ? `<span class="tl-club"${col ? ` style="--club:${col}"` : ''}>${esc(e.c)}</span>` : null].filter(Boolean).join(' · ');
  const link = interactive && e.ref;
  const inner = `<span class="tl-icon" aria-hidden="true">${e.icon}</span>
    <div class="tl-body"><div class="tl-title">${esc(e.title)}${e.tier === 'major' ? ' <span class="tl-badge">★</span>' : ''}</div>${meta ? `<div class="tl-meta">${meta}</div>` : ''}<div class="tl-desc">${esc(e.desc)}</div></div>${link ? '<span class="tl-go" aria-hidden="true">›</span>' : ''}`;
  return `<li class="tl-item ${e.tier} t-${e.t} ${link ? 'link' : ''}"${animate ? ` style="--i:${Math.min(i, 10)}"` : ''}>${link ? `<button class="tl-open" data-action="tl-open" data-k="${esc(e.k)}" aria-label="${esc($t('career.open_the_details', { title: `${e.title}${e.y != null ? `, ${yearOf(e.y)}` : ''}` }))}">${inner}</button>` : inner}</li>`;
}

/**
 * The section for a list of timeline items (careerTimeline output, each with an optional `ref`). opts: { name, id (monster),
 * domId (the section's element id, 'timeline' on the monster card), head (HTML above the filter: the summary and trophies),
 * animate, reduced, interactive }.
 */
export function timelineSectionHtml(all, { name = $t('career.this_monster'), id = '', domId = null, head = '', animate = true, reduced = false, interactive = true, emptyText = null, seasonLinks = null } = {}) {
  const list = view.filter === 'highlights' ? all.filter((e) => e.tier !== 'career') : all;
  const open = !!view.open[id]; const shown = open ? list : list.slice(0, TIMELINE_FOLD);
  const anim = animate && !reduced;
  const highlights = all.filter((e) => e.tier !== 'career').length; const major = all.filter((e) => e.tier === 'major').length; const seasons = new Set(all.map((i) => i.y).filter((y) => y != null)).size;
  let html = ''; let lastY; let started = false; let i = 0;
  for (const e of shown) {
    if (!started || e.y !== lastY) {
      if (started) html += '</ol>'; started = true;
      const n = list.filter((x) => x.y === e.y).length; const hasMajor = list.some((x) => x.y === e.y && x.tier === 'major');
      const sl = interactive && e.y != null && seasonLinks?.has(e.y);
      html += sl ? `<button class="tl-season link ${hasMajor ? 'has-major' : ''}" data-action="tl-season" data-y="${e.y}" aria-label="${esc($t('career.season_open_the_season', { year: yearOf(e.y) }))}"><span>${$t('career.season_2', { year: esc(yearOf(e.y)) })}</span><span class="dim">${$t('career.moments', { n })}</span></button><ol class="tl-list">` : `<div class="tl-season ${hasMajor ? 'has-major' : ''}"><span>${e.y == null ? $t('career.before_the_timeline') : `${$t('career.season_2', { year: esc(yearOf(e.y)) })}`}</span><span class="dim">${$t('career.moments_2', { n })}</span></div><ol class="tl-list">`;
      lastY = e.y;
    }
    html += itemHtml(e, i++, anim, interactive);
  }
  if (shown.length) html += '</ol>';
  const empty = `<div class="tl-empty"><span aria-hidden="true">🌱</span><div>${$t('career.b_s_story_starts_here_b', { name: esc(name) })}<div class="dim">${emptyText || (view.filter === 'highlights' && all.length ? $t('career.no_highlights_yet_a_first_touchdown') : $t('career.a_first_game_a_first_touchdown'))}</div></div></div>`;
  const more = list.length > shown.length ? `<button class="btn block tl-more" data-action="tl-more" data-id="${esc(id)}">${$t('career.show_the_whole_career_more', { n: list.length - shown.length })}</button>` : open && list.length > TIMELINE_FOLD ? `<button class="btn block ghost tl-more" data-action="tl-more" data-id="${esc(id)}">${$t('career.show_less')}</button>` : '';
  return `<section class="panel timeline"${domId ? ` id="${esc(domId)}"` : ''} data-mid="${esc(id)}" aria-label="${$t('career.career_timeline')}">
    ${head}
    <div class="row between tl-head">${$t('career.b_career_timeline_b')}<div class="tl-filter" role="group" aria-label="${$t('career.show')}"><button class="chip ${view.filter === 'all' ? 'on' : ''}" data-action="tl-filter" data-v="all" aria-pressed="${view.filter === 'all'}">${$t('career.all')}</button><button class="chip ${view.filter === 'highlights' ? 'on' : ''}" data-action="tl-filter" data-v="highlights" aria-pressed="${view.filter === 'highlights'}">${$t('career.highlights')}</button></div></div>
    ${all.length ? `<div class="tl-sum dim">${$t('career.moments_2', { n: all.length })}${major ? ` · <b class="tl-gold">${major} major</b>` : ''}${seasons ? ` ${$t('career.seasons_2', { seasons, n: seasons })}` : ''}${interactive && all.some((e) => e.ref) ? $t('career.tap_a_entry_for_the_record') : ''}</div>` : ''}
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
export function timelineActions({ render, open, openSeason = null }) {
  const sectionOf = (el) => el.closest('section.timeline');
  return {
    'tl-filter': (el) => { const s = sectionOf(el); if (!s) return; view.filter = el.dataset.v; redrawKeepingPlace(s, render(s)); },
    'tl-more': (el) => { const s = sectionOf(el); if (!s) return; view.open[el.dataset.id] = !view.open[el.dataset.id]; const wasOpen = view.open[el.dataset.id]; const n = redrawKeepingPlace(s, render(s)); if (!wasOpen) n?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    'tl-open': (el) => { const s = sectionOf(el); open?.(el.dataset.k, s); },
    'tl-season': (el) => openSeason?.(Number(el.dataset.y)),
  };
}
