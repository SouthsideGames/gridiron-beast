// Monster Career Presentation (GDD §40): the summary header, the trophy case, the details behind timeline events and
// trophies, and the career sheet that opens from anywhere in the game (roster, free agency, the draft, awards, news, the Hall
// of Fame). One implementation: the monster card and every sheet render the same section from the same profile.
// Sheets sit over the screen, so closing one returns to the same screen, scroll position, filter and fold.

import * as F from '../franchise/franchise.js';
import { careerProfile, fullProfile, eventDetail, snapshotProfile, findMonster, TIER_LABEL, TROPHY_META, focusStats } from '../franchise/career-profile.js';
import { timelineSectionHtml, timelineActions, redrawKeepingPlace, timelineView } from './career-timeline.js';
import { openCareerCard } from './career-card.js';
import { monsterSprite, typeGlyph } from './pixel-monster.js';
import { TEAM_META } from '../data/league.js';
import { yearOf } from '../data/calendar.js';
import { POSITION_NAME } from '../data/stat-guide.js';
import { esc, sheet } from './dom.js';

const statScope = {}; // per monster id: 'career' | 'season'
const clubColor = (c) => TEAM_META[c]?.color || '#9fb8ad';
const years = (list) => { const ys = [...new Set(list.map((y) => (y == null ? '?' : yearOf(y))))]; return ys.length > 4 ? `${ys.slice(0, 3).join(' · ')} +${ys.length - 3}` : ys.join(' · '); };
const span = (c) => (c.from == null ? '' : c.to == null ? `${yearOf(c.from)}–now` : c.from === c.to ? `${yearOf(c.from)}` : `${yearOf(c.from)}–${yearOf(c.to)}`);
const posName = (p) => POSITION_NAME?.[p] || p;

/** The career at a glance: identity, club, seasons, honours, the position's numbers (career or this season), the clubs. */
export function summaryHtml(p, { reduced = false } = {}) {
  const scope = statScope[p.id] === 'season' && p.stats.seasonFocus ? 'season' : 'career';
  const stats = scope === 'season' ? p.stats.seasonFocus : p.stats.focus;
  const club = p.club; const col = clubColor(club);
  const seasonsTxt = p.kind === 'prospect' ? 'Draft prospect' : p.kind === 'league' ? `${p.seasons} season${p.seasons === 1 ? '' : 's'} on record` : p.where === 'roster' && p.seasons <= 1 ? 'Rookie season' : !p.seasons ? 'No pro seasons yet' : `${p.seasons} season${p.seasons === 1 ? '' : 's'}`;
  const sameName = String(p.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '') === p.speciesName;
  const honours = [
    p.honours.hof ? `<span class="cs-hon legend">🏛 Hall of Fame</span>` : '',
    p.honours.titles ? `<span class="cs-hon gold">🏆 ${p.honours.titles > 1 ? `${p.honours.titles}× ` : ''}Champion</span>` : '',
    p.honours.awards ? `<span class="cs-hon gold">🏅 ${p.honours.awards} award${p.honours.awards === 1 ? '' : 's'}</span>` : '',
    p.honours.records ? `<span class="cs-hon">📜 ${p.honours.records} record${p.honours.records === 1 ? '' : 's'}</span>` : '',
  ].filter(Boolean).join('');
  const statGrid = p.kind === 'prospect' ? '' : stats?.length && (p.stats.games || 0) > 0
    ? `<div class="cs-stats-head"><span class="cs-label">${scope === 'season' ? `${yearOf(p.stats.seasonYear)} season` : 'Career'}${p.stats.games ? ` · ${scope === 'season' ? p.stats.season.games || 0 : p.stats.games} games` : ''}</span>${p.stats.seasonFocus ? `<span class="cs-scope" role="group" aria-label="Totals"><button class="chip ${scope === 'career' ? 'on' : ''}" data-action="cs-scope" data-v="career" aria-pressed="${scope === 'career'}">Career</button><button class="chip ${scope === 'season' ? 'on' : ''}" data-action="cs-scope" data-v="season" aria-pressed="${scope === 'season'}">This season</button></span>` : ''}</div>
       <div class="cs-stats">${stats.map((s) => `<div class="cs-stat"><b class="mono">${esc(s.text)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>`
    : `<div class="cs-nogames">${p.kind === 'snapshot' ? 'No games on record.' : (p.yearsPro || 0) > 0 || p.seasons > 1 ? 'No games on record in this franchise: his earlier seasons were played before it kept his stats.' : 'No professional games yet: his numbers start with his first snap.'}</div>`;
  const clubs = p.clubs?.length ? `<div class="cs-clubs" aria-label="Clubs">${p.clubs.map((c) => `<span class="cs-club" style="--club:${clubColor(c.club)}"><i></i>${esc(c.club)}${span(c) ? ` <span class="dim">${span(c)}</span>` : ''}</span>`).join('<span class="cs-arrow" aria-hidden="true">›</span>')}</div>` : '';
  return `<div class="cs-head tier-${esc(p.tier)}" style="--club:${col}">
    <div class="cs-id">
      <div class="cs-sprite ${reduced ? '' : 'anim'}">${monsterSprite({ id: p.id, name: p.name, species: p.species, stage: p.stage }, 64)}</div>
      <div class="cs-who"><div class="cs-name">${esc(p.name)}${p.cornerstone ? ' <span class="chip cornerstone">★</span>' : ''}</div>
        <div class="cs-sub">${sameName ? '' : `${esc(p.speciesName)} · `}${p.type ? `${typeGlyph(p.type)} ${esc(p.type)} · ` : ''}${esc(posName(p.position))}</div>
        <div class="cs-sub">${club ? `<span class="cs-team"><i></i>${esc(club)}</span>` : p.kind === 'prospect' ? '<span class="dim">Not yet drafted</span>' : '<span class="dim">Free agent</span>'}</div>
        <div class="cs-meta">${esc(seasonsTxt)}${p.level != null ? ` · Lv ${p.level}` : ''}${p.ovr != null ? ` · <b>${p.ovr}</b> OVR` : ''}</div></div>
      <span class="cs-tier tier-${esc(p.tier)}">${esc(TIER_LABEL[p.tier] || '')}</span>
    </div>
    ${honours ? `<div class="cs-honours">${honours}</div>` : ''}
    ${statGrid}
    ${clubs}
    ${(p.notes || []).map((n) => `<p class="cs-note">${esc(n)}</p>`).join('')}
  </div>`;
}

/** The trophy case: one tile per honour, repeats grouped with a count, gold for the major ones. Tap for the seasons. */
export function trophyCaseHtml(p, { reduced = false, interactive = true } = {}) {
  if (p.kind === 'prospect') return '';
  const t = p.trophies || [];
  if (!t.length) return `<div class="tc"><div class="tc-head"><b>Trophy case</b></div><div class="tc-empty"><span aria-hidden="true">🏆</span><span>${p.kind === 'league' ? 'No league honours on record.' : `Empty for now. Beast Bowl titles, league awards and league records ${esc(p.name)} earns are kept here.`}</span></div></div>`;
  const total = t.reduce((a, x) => a + x.count, 0);
  return `<div class="tc ${reduced ? '' : 'anim'}"><div class="tc-head"><b>Trophy case</b><span class="dim">${total} honour${total === 1 ? '' : 's'}</span></div>
    <div class="tc-grid">${t.map((x, i) => { const tag = interactive ? 'button' : 'div'; return `<${tag} class="tc-tile ${esc(x.tier)} k-${esc(x.kind)}"${interactive ? ` data-action="tc-open" data-kind="${esc(x.kind)}" aria-label="${esc(`${x.label}${x.count > 1 ? `, ${x.count} times` : ''}: open`)}"` : ''} style="--i:${i}"><span class="tc-icon" aria-hidden="true">${x.icon}</span>${x.count > 1 ? `<span class="tc-count">×${x.count}</span>` : ''}<span class="tc-label">${esc(x.short || x.label)}</span><span class="tc-years">${esc(years(x.entries.map((e) => e.year)))}</span></${tag}>`; }).join('')}</div></div>`;
}

/** Summary + trophies + the card button + the timeline, as one section (the monster card and every sheet). */
export function careerSectionHtml(f, p, { animate = true, domId = null, interactive = true, cardButton = true } = {}) {
  const reduced = !!f?.settings?.reducedMotion || !animate;
  const head = `${summaryHtml(p, { reduced })}${trophyCaseHtml(p, { reduced, interactive: interactive && p.kind !== 'snapshot' })}${cardButton && (p.kind === 'full' || p.kind === 'snapshot') ? `<button class="btn block cc-btn" data-action="cc-open">📸 Career card</button>` : ''}`;
  if (p.kind === 'prospect') return `<section class="panel timeline career-only" data-mid="${esc(p.id)}"${domId ? ` id="${esc(domId)}"` : ''}>${head}</section>`;
  if (p.kind === 'league') return `<section class="panel timeline career-only" data-mid="${esc(p.id)}"${domId ? ` id="${esc(domId)}"` : ''}>${head}${seasonLinesHtml(p)}</section>`;
  return timelineSectionHtml(p.timeline, { name: p.name, id: p.id, domId, head, animate, reduced: !!f?.settings?.reducedMotion, interactive: interactive && p.kind !== 'snapshot' });
}
function seasonLinesHtml(p) {
  if (!p.books?.length) return '';
  return `<div class="cs-seasons"><div class="tc-head"><b>Seasons on record</b></div>${p.books.slice().reverse().map((b) => `<div class="cs-season"><b>${yearOf(b.year)}</b> <span class="cs-team" style="--club:${clubColor(b.team)}"><i></i>${esc(b.team || '')}</span><div class="dim">${b.games} game${b.games === 1 ? '' : 's'}${b.line ? ` · ${esc(b.line)}` : ''}</div></div>`).join('')}</div>`;
}

// ------------------------------------------------------------ details
const fmtN = (n) => Number(n).toLocaleString('en-US');
/** The verified record behind an event or a trophy entry, laid out for a sheet. */
export function detailHtml(f, m, d, p) {
  if (!d) return '<p class="dim">Nothing more on record for this moment.</p>';
  const missing = d.missing ? `<p class="cs-note">${esc(d.missing)}</p>` : '';
  const club = (c) => (c ? `<span class="cs-team" style="--club:${clubColor(c)}"><i></i>${esc(c)}</span>` : '');
  switch (d.kind) {
    case 'title': return `<div class="dt-hero gold"><span class="dt-icon">🏆</span><div><div class="dt-title">Beast Bowl champion</div><div class="dt-sub">${yearOf(d.year)} · ${club(d.club)}</div></div></div>
      <div class="kv">${d.opp ? `<b>Final</b><span>Beat the ${esc(d.opp)}${d.score ? ` <b class="mono">${esc(d.score)}</b>` : ''}${d.ot ? ' (OT)' : ''}${d.venue ? ` · ${esc(d.venue)}` : ''}</span>` : ''}${d.record ? `<b>Season</b><span class="mono">${d.record.w}-${d.record.l}${d.record.t ? `-${d.record.t}` : ''}${d.playoffs ? ` · playoffs ${d.playoffs.w}-${d.playoffs.l}` : ''}</span>` : ''}<b>His part</b><span>${esc(d.role)}</span>${d.line ? `<b>Playoffs</b><span>${d.line.games} game${d.line.games === 1 ? '' : 's'}${d.line.text ? ` · ${esc(d.line.text)}` : ''}</span>` : ''}</div>${missing}
      ${d.ceremony && f && p?.where === 'roster' ? `<button class="btn block" data-action="dt-ceremony" data-year="${d.year}" style="margin-top:8px">🎉 Watch the ceremony again</button>` : ''}`;
    case 'award': return `<div class="dt-hero gold"><span class="dt-icon">${TROPHY_META[d.key]?.icon || '🏅'}</span><div><div class="dt-title">${esc(d.label)}</div><div class="dt-sub">${yearOf(d.year)} · ${club(d.club)}${d.record ? ` <span class="dim">${esc(d.record)} club</span>` : ''}</div></div></div>
      ${d.why ? `<p class="dt-why">${esc(d.why.split(' · ')[0])}</p>` : ''}${d.line ? `<div class="kv"><b>Season</b><span>${d.line.games ? `${d.line.games} games · ` : ''}${esc(d.line.text || '')}</span></div>` : ''}${missing}`;
    case 'record': return `<div class="dt-hero"><span class="dt-icon">📜</span><div><div class="dt-title">League record: ${d.scope === 'game' ? 'one game' : 'one season'}</div><div class="dt-sub">${yearOf(d.year)}${d.week ? `, week ${d.week}` : ''} · ${club(d.club)}</div></div></div>
      <div class="dt-big mono">${fmtN(d.value)} <span>${esc(d.stat)}</span></div>
      <div class="kv">${d.opp ? `<b>Against</b><span>the ${esc(d.opp)}</span>` : ''}${d.game ? `<b>Result</b><span>${d.game.won ? 'Won' : 'Lost'} <b class="mono">${esc(d.game.score)}</b></span>` : ''}<b>Today</b><span>${d.standing ? '<b class="good">Still the league record</b>' : d.brokenBy ? `Since broken by ${esc(d.brokenBy.name || d.brokenBy.team)} (${esc(d.brokenBy.team || '')}) with ${fmtN(d.brokenBy.value)} in ${yearOf(d.brokenBy.year)}` : 'The records book has moved on'}</span>${d.prev ? `<b>He broke</b><span>${esc(d.prev.name || d.prev.team || '')}'s ${fmtN(d.prev.value)}${d.prev.year != null ? ` (${yearOf(d.prev.year)})` : ''}</span>` : ''}</div>`;
    case 'evolve': { const a = { id: m?.id || p?.id, name: '', species: d.species, stage: d.fromStage }, b = { ...a, stage: d.stage };
      return `<div class="dt-evo"><div>${monsterSprite(a, 72)}<span>${esc(d.from || 'Before')}</span></div><span class="dt-evo-arrow" aria-hidden="true">➜</span><div>${monsterSprite(b, 72)}<span>${esc(d.to || 'After')}</span></div></div>
      <p class="dim center">${d.before ? 'Evolved before the timeline began: the season was not recorded.' : `${d.year != null ? yearOf(d.year) : ''}${d.week ? `, week ${d.week}` : ''}`}</p>`; }
    case 'game': return `<div class="dt-hero"><span class="dt-icon">🏈</span><div><div class="dt-title">${d.week > 10 ? esc(F.ROUND_NAMES[d.week - 10] || 'Playoffs') : `Week ${d.week}`} · ${yearOf(d.year)}</div><div class="dt-sub">${d.home ? 'vs' : 'at'} the ${esc(d.opp)}${d.club ? ` · ${club(d.club)}` : ''}</div></div></div>
      <div class="dt-big mono ${d.won ? 'good' : 'bad'}">${d.won ? 'W' : 'L'} ${esc(d.score)}</div>
      ${d.lineText ? `<div class="kv"><b>His game</b><span>${esc(d.lineText)}</span></div>` : ''}${missing}`;
    case 'hof': return `<div class="dt-hero legend"><span class="dt-icon">🏛</span><div><div class="dt-title">Hall of Fame</div><div class="dt-sub">${d.year != null ? yearOf(d.year) : ''} · ${club(d.club)}</div></div></div><p>Named on ${esc(d.owner || 'the owner')}'s Hall of Fame card when the career was written.</p>`;
    default: return '';
  }
}
const DT_TITLE = { title: 'Beast Bowl', award: 'League award', record: 'League record', evolve: 'Evolution', game: 'The game', hof: 'Hall of Fame' };

/** A trophy shelf's sheet: every season it was won, each opening its detail. */
function trophySheetHtml(f, m, p, kind) {
  const t = (p.trophies || []).find((x) => x.kind === kind); if (!t) return '';
  return `<div class="dt-hero ${t.tier === 'gold' ? 'gold' : t.tier === 'legend' ? 'legend' : ''}"><span class="dt-icon">${t.icon}</span><div><div class="dt-title">${esc(t.label)}${t.count > 1 ? ` ×${t.count}` : ''}</div><div class="dt-sub">${esc(p.name)}</div></div></div>
    <div class="list">${t.entries.map((e, i) => { const ref = refForTrophy(kind, e); const d = m && ref ? eventDetail(f, m, ref) : null; const sub = d?.kind === 'title' ? (d.opp ? `Beat the ${d.opp}${d.score ? ` ${d.score}` : ''}` : d.role) : d?.kind === 'award' ? d.line?.text || '' : d?.kind === 'record' ? `${fmtN(d.value)} ${d.stat}${d.scope === 'game' ? ' in one game' : ' in one season'}${d.standing ? ' · still standing' : ''}` : '';
      return `<${d ? 'button' : 'div'} class="item ${d ? '' : 'static'} tc-entry" ${d ? `data-action="tc-entry" data-kind="${esc(kind)}" data-i="${i}"` : ''}><div class="grow"><div class="name">${e.year != null ? yearOf(e.year) : 'Season not recorded'}${e.club ? ` · ${esc(e.club)}` : ''}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${d ? '<span class="tl-go">›</span>' : ''}</${d ? 'button' : 'div'}>`; }).join('')}</div>`;
}
function refForTrophy(kind, e) {
  if (kind === 'champion') return { kind: 'title', year: e.year, club: e.club };
  if (kind === 'record') return { kind: 'record', scope: e.scope, cat: e.cat, value: e.value, year: e.year, week: e.week, club: e.club };
  if (kind === 'hof') return { kind: 'hof', year: e.year, club: e.club, owner: e.owner };
  if (TROPHY_META[kind]) return { kind: 'award', key: kind, year: e.year, club: e.club };
  return null;
}

// ------------------------------------------------------------ actions (monster card and sheets share them)
/**
 * Handlers for a career section. `ctx` = { f, profile(): the current profile, monster(): the monster (null for league
 * and snapshot profiles), domId, go(screen, params) }.
 */
export function careerActions(ctx) {
  const render = () => careerSectionHtml(ctx.f(), ctx.profile(), { animate: false, domId: ctx.domId || null });
  const openDetail = (ref) => { const m = ctx.monster(); const f = ctx.f(); const d = m ? eventDetail(f, m, ref) : null; const { el } = sheet(detailHtml(f, m, d, ctx.profile()), { title: DT_TITLE[ref.kind] || 'Details' }); bindDetail(el, ctx); };
  return {
    ...timelineActions({ render, open: (k) => { const e = ctx.profile().timeline.find((x) => x.k === k); if (e?.ref) openDetail(e.ref); } }),
    'cs-scope': (el) => { const s = el.closest('section.timeline'); statScope[ctx.profile().id] = el.dataset.v; if (s) redrawKeepingPlace(s, render()); },
    'tc-open': (el) => { const p = ctx.profile(); const kind = el.dataset.kind; const { el: sh } = sheet(trophySheetHtml(ctx.f(), ctx.monster(), p, kind), { title: 'Trophy case' });
      sh.addEventListener('click', (ev) => { const b = ev.target.closest('[data-action="tc-entry"]'); if (!b) return; const t = p.trophies.find((x) => x.kind === b.dataset.kind); const e = t?.entries[Number(b.dataset.i)]; const ref = e && refForTrophy(b.dataset.kind, e); if (ref) openDetail(ref); }); },
    'cc-open': () => openCareerCard(ctx.profile(), { reduced: !!ctx.f()?.settings?.reducedMotion }),
  };
}
function bindDetail(el, ctx) {
  el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-action="dt-ceremony"]'); if (!b) return; document.querySelectorAll('.sheet-backdrop').forEach((x) => x.remove()); ctx.go?.('ceremony', { year: Number(b.dataset.year) }); });
}
/** Route clicks inside a sheet to a handler map (the screen's delegate does this on the monster card). */
export function delegateIn(el, handlers) {
  el.addEventListener('click', (e) => { const a = e.target.closest('[data-action]'); if (!a || !el.contains(a)) return; const fn = handlers[a.dataset.action]; if (fn) { e.preventDefault(); e.stopPropagation(); fn(a, e); } });
}

// ------------------------------------------------------------ what the scout knows
/**
 * Ratings the owner has not scouted stay hidden in career views too: a free agent's overall follows his scout report, a
 * prospect's overall follows the draft report. Career statistics and honours are public records and always show.
 */
export function withVisibility(f, p) {
  if (!p) return p;
  const found = findMonster(f, p.id); if (!found) return p;
  if (found.where === 'pool' || found.where === 'market') { const v = F.freeAgentView?.(f, found.m); if (v) return { ...p, ovr: v.ovr ?? null, level: v.full || v.formerOwn ? p.level : null }; }
  if (found.where === 'draft' || (found.where === 'drafted' && (f.draft?.class || []).includes(found.m))) { const v = F.prospectView?.(f, found.m); if (v) return { ...p, ovr: v.ovr ?? null, level: null }; }
  return p;
}
/** A compact career block for another sheet (free agents, prospects): the summary, the honours count and a link to it all. */
export function careerBlockHtml(f, id, { link = true } = {}) {
  const p = withVisibility(f, careerProfile(f, id)); if (!p) return '';
  const total = (p.trophies || []).reduce((a, t) => a + t.count, 0);
  return `<div class="career-block">${summaryHtml(p, { reduced: true })}${total ? `<div class="dim" style="font-size:12px;margin:-4px 0 6px">${total} honour${total === 1 ? '' : 's'} in his trophy case</div>` : ''}${link && p.kind !== 'prospect' ? `<button class="btn block small" data-career="${esc(id)}">Full career ›</button>` : ''}</div>`;
}

// ------------------------------------------------------------ the career sheet (from anywhere)
/**
 * Open a monster's career over the current screen, by stable id. Roster monsters get a button to their full card. A
 * monster the save does not know opens nothing (no wrong-monster link) and says so.
 */
export function openCareerSheet(f, id, { go = null } = {}) {
  const found = findMonster(f, id);
  if (found?.where === 'roster') F.monsterTimeline(f, found.m); // the Phase 1 backfill, as the card does
  const p = withVisibility(f, careerProfile(f, id));
  if (!p) { sheet('<p>No career on record for this monster in this franchise.</p>', { title: 'Career' }); return null; }
  const ctx = { f: () => f, profile: () => withVisibility(f, careerProfile(f, id)), monster: () => findMonster(f, id)?.m || null, go };
  const extra = p.where === 'roster' && go ? `<button class="btn block" data-action="cs-card" style="margin-top:8px">Open ${esc(p.name)}'s monster card ›</button>` : '';
  const { el, close } = sheet(`<div class="career-sheet">${careerSectionHtml(f, p, { animate: true })}${extra}</div>`, { title: p.kind === 'prospect' ? 'Prospect' : `${p.name} · career` });
  delegateIn(el, { ...careerActions(ctx), 'cs-card': () => { close(); go('monster', { id }); } });
  return { el, close, profile: p };
}
/** A Hall of Fame card's monster: the career as it stood at retirement (read-only). */
export function openSnapshotSheet(snap, { settings = {} } = {}) {
  const p = snapshotProfile(snap); if (!p) return null;
  const fake = { settings };
  const ctx = { f: () => fake, profile: () => p, monster: () => null };
  const { el } = sheet(`<div class="career-sheet">${careerSectionHtml(fake, p, { animate: !settings.reducedMotion, interactive: false })}</div>`, { title: `${p.name} · Hall of Fame` });
  delegateIn(el, careerActions(ctx));
  return { el, profile: p };
}

/** One document listener: any element with data-career="<monster id>" opens that career (and stops the click there). */
let installed = false;
export function installCareerLinks(getF, go) {
  if (installed) return; installed = true;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-career]'); if (!b) return;
    const f = getF(); if (!f) return; e.preventDefault(); e.stopPropagation();
    openCareerSheet(f, b.dataset.career, { go });
  }, true);
}
/** A name as a career link (an id is required: names are never matched). */
export function careerLink(id, label, { cls = '' } = {}) {
  return id ? `<button class="career-link ${cls}" data-career="${esc(id)}">${esc(label)}</button>` : esc(label);
}
export { timelineView, focusStats, fullProfile };
