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
import { t as $t } from '../text/index.js';

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
  const seasonsTxt = p.legacy ? $t('career.seasons_not_recorded') : p.kind === 'prospect' ? $t('career.draft_prospect') : p.kind === 'league' ? `${$t('career.seasons_on_record', { seasons: p.seasons, n: p.seasons })}` : p.where === 'roster' && p.seasons <= 1 ? $t('career.rookie_season') : !p.seasons ? $t('career.no_pro_seasons_yet') : `${$t('career.seasons', { seasons: p.seasons, n: p.seasons })}`;
  const sameName = String(p.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '') === p.speciesName;
  const honours = [
    p.honours.hof ? `<span class="cs-hon legend">${$t('career.hall_of_fame')}</span>` : '',
    p.honours.titles ? `<span class="cs-hon gold">🏆 ${p.honours.titles > 1 ? `${p.honours.titles}× ` : ''}${$t('career.champion')}</span>` : '',
    p.honours.awards ? `<span class="cs-hon gold">${$t('career.awards', { awards: p.honours.awards, n: p.honours.awards })}</span>` : '',
    p.honours.records ? `<span class="cs-hon">${$t('career.records', { records: p.honours.records, n: p.honours.records })}</span>` : '',
  ].filter(Boolean).join('');
  const statGrid = p.kind === 'prospect' ? '' : stats?.length && (p.stats.games || 0) > 0
    ? `<div class="cs-stats-head"><span class="cs-label">${scope === 'season' ? `${yearOf(p.stats.seasonYear)} season` : $t('career.career')} ${$t('career.regular_season_games', { scope: scope === 'season' ? p.stats.seasonGames ?? p.stats.season.games ?? 0 : p.stats.games, n: (scope === 'season' ? p.stats.seasonGames ?? p.stats.season.games : p.stats.games) })}</span>${p.stats.seasonFocus ? `<span class="cs-scope" role="group" aria-label="${$t('career.totals')}"><button class="chip ${scope === 'career' ? 'on' : ''}" data-action="cs-scope" data-v="career" aria-pressed="${scope === 'career'}">${$t('career.career')}</button><button class="chip ${scope === 'season' ? 'on' : ''}" data-action="cs-scope" data-v="season" aria-pressed="${scope === 'season'}">${$t('career.this_season')}</button></span>` : ''}</div>
       <div class="cs-stats">${stats.map((s) => `<div class="cs-stat"><b class="mono">${esc(s.text)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
       ${(() => { const po = scope === 'season' ? p.stats.seasonPostLine : p.stats.post; return po ? `<div class="cs-post">${$t('career.b_playoffs')}${scope === 'season' ? ` ${yearOf(p.stats.seasonYear)}` : $t('career.career_2')}${$t('career.b_games', { games: po.games, n: po.games })}${po.text ? ` · ${esc(po.text)}` : ''}</div>` : ''; })()}`
    : `<div class="cs-nogames">${p.legacy ? $t('career.his_statistics_were_not_kept_on_2') : p.kind === 'snapshot' ? $t('career.no_games_on_record') : (p.yearsPro || 0) > 0 || p.seasons > 1 ? $t('career.no_games_on_record_in_this') : $t('career.no_professional_games_yet_his_numbers')}</div>`;
  const clubs = p.clubs?.length ? `<div class="cs-clubs" aria-label="${$t('career.clubs')}">${p.clubs.map((c) => `<span class="cs-club" style="--club:${clubColor(c.club)}"><i></i>${esc(c.club)}${span(c) ? ` <span class="dim">${span(c)}</span>` : ''}</span>`).join(`<span class="cs-arrow" aria-hidden="true">›</span>`)}</div>` : '';
  return `<div class="cs-head tier-${esc(p.tier)}" style="--club:${col}">
    <div class="cs-id">
      <div class="cs-sprite ${reduced ? '' : 'anim'}">${monsterSprite({ id: p.id, name: p.name, species: p.species, stage: p.stage }, 64)}</div>
      <div class="cs-who"><div class="cs-name">${esc(p.name)}${p.cornerstone ? ` <span class="chip cornerstone">★</span>` : ''}</div>
        <div class="cs-sub">${sameName ? '' : `${esc(p.speciesName)} · `}${p.type ? `${typeGlyph(p.type)} ${esc(p.type)} · ` : ''}${esc(posName(p.position))}</div>
        <div class="cs-sub">${club ? `<span class="cs-team"><i></i>${esc(club)}</span>` : p.kind === 'prospect' ? `<span class="dim">${$t('career.not_yet_drafted')}</span>` : `<span class="dim">${$t('career.free_agent')}</span>`}</div>
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
  if (!t.length) return `<div class="tc"><div class="tc-head">${$t('career.b_trophy_case_b')}</div><div class="tc-empty"><span aria-hidden="true">🏆</span><span>${p.kind === 'league' ? $t('career.no_league_honors_on_record') : `${$t('career.empty_for_now_beast_bowl_titles', { name: esc(p.name) })}`}</span></div></div>`;
  const total = t.reduce((a, x) => a + x.count, 0);
  return `<div class="tc ${reduced ? '' : 'anim'}"><div class="tc-head">${$t('career.b_trophy_case_b')}<span class="dim">${$t('career.honors', { total, n: total })}</span></div>
    <div class="tc-grid">${t.map((x, i) => { const tag = interactive ? 'button' : 'div'; return `<${tag} class="tc-tile ${esc(x.tier)} k-${esc(x.kind)}"${interactive ? ` data-action="tc-open" data-kind="${esc(x.kind)}" aria-label="${esc(`${x.label}${x.count > 1 ? `${$t('career.times', { count: x.count })}` : ''}${$t('career.open')}`)}"` : ''} style="--i:${i}"><span class="tc-icon" aria-hidden="true">${x.icon}</span>${x.count > 1 ? `<span class="tc-count">×${x.count}</span>` : ''}<span class="tc-label">${esc(x.short || x.label)}</span><span class="tc-years">${esc(years(x.entries.map((e) => e.year)))}</span></${tag}>`; }).join('')}</div></div>`;
}

/** Summary + trophies + the card button + the timeline, as one section (the monster card and every sheet). */
export function careerSectionHtml(f, p, { animate = true, domId = null, interactive = true, cardButton = true } = {}) {
  const reduced = !!f?.settings?.reducedMotion || !animate;
  const head = `${summaryHtml(p, { reduced })}${trophyCaseHtml(p, { reduced, interactive: interactive && p.kind !== 'snapshot' })}${cardButton && !p.legacy && (p.kind === 'full' || p.kind === 'snapshot') ? `<button class="btn block cc-btn" data-action="cc-open">${$t('career.career_card')}</button>` : ''}`;
  if (p.kind === 'prospect') return `<section class="panel timeline career-only" data-mid="${esc(p.id)}"${domId ? ` id="${esc(domId)}"` : ''}>${head}</section>`;
  if (p.kind === 'league') return `<section class="panel timeline career-only" data-mid="${esc(p.id)}"${domId ? ` id="${esc(domId)}"` : ''}>${head}${seasonLinesHtml(p)}</section>`;
  return timelineSectionHtml(p.timeline, { name: p.name, id: p.id, domId, head, animate, reduced: !!f?.settings?.reducedMotion, interactive: interactive && p.kind !== 'snapshot', emptyText: p.emptyText || null, seasonLinks: p.kind === 'full' ? new Set((p.books || []).map((b) => b.year)) : null });
}
function seasonLinesHtml(p) {
  if (!p.books?.length) return '';
  return `<div class="cs-seasons"><div class="tc-head">${$t('career.b_seasons_on_record_b')}</div>${p.books.slice().reverse().map((b) => `<div class="cs-season"><b>${yearOf(b.year)}</b> <span class="cs-team" style="--club:${clubColor(b.team)}"><i></i>${esc(b.team || '')}</span><div class="dim">${$t('career.games', { games: b.games, n: b.games })}${b.line ? ` · ${esc(b.line)}` : ''}</div></div>`).join('')}</div>`;
}

// ------------------------------------------------------------ details
const fmtN = (n) => Number(n).toLocaleString('en-US');
/** The verified record behind an event or a trophy entry, laid out for a sheet. */
export function detailHtml(f, m, d, p) {
  if (!d) return `<p class="dim">${$t('career.nothing_more_on_record_for_this')}</p>`;
  const missing = d.missing ? `<p class="cs-note">${esc(d.missing)}</p>` : '';
  const club = (c) => (c ? `<span class="cs-team" style="--club:${clubColor(c)}"><i></i>${esc(c)}</span>` : '');
  switch (d.kind) {
    case 'title': return `<div class="dt-hero gold"><span class="dt-icon">🏆</span><div><div class="dt-title">${$t('career.beast_bowl_champion')}</div><div class="dt-sub">${yearOf(d.year)} · ${club(d.club)}</div></div></div>
      <div class="kv">${d.opp ? `${$t('career.b_final_b')}<span>${$t('career.beat_the', { opp: esc(d.opp) })}${d.score ? ` <b class="mono">${esc(d.score)}</b>` : ''}${d.ot ? ' (OT)' : ''}${d.venue ? ` · ${esc(d.venue)}` : ''}</span>` : ''}${d.record ? `${$t('career.b_season_b')}<span class="mono">${d.record.w}-${d.record.l}${d.record.t ? `-${d.record.t}` : ''}${d.playoffs ? ` ${$t('career.playoffs_2', { w: d.playoffs.w, l: d.playoffs.l })}` : ''}</span>` : ''}${$t('career.b_his_part_b')}<span>${esc(d.role)}</span>${d.line ? `${$t('career.b_playoffs_b_2')}<span>${$t('career.games', { games: d.line.games, n: d.line.games })}${d.line.text ? ` · ${esc(d.line.text)}` : ''}</span>` : ''}</div>${missing}
      ${d.ceremony && f && p?.where === 'roster' ? `<button class="btn block" data-action="dt-ceremony" data-year="${d.year}" style="margin-top:8px">${$t('career.watch_the_ceremony_again')}</button>` : ''}`;
    case 'award': return `<div class="dt-hero gold"><span class="dt-icon">${TROPHY_META[d.key]?.icon || '🏅'}</span><div><div class="dt-title">${esc(d.label)}</div><div class="dt-sub">${yearOf(d.year)} · ${club(d.club)}${d.record ? ` <span class="dim">${esc(d.record)} club</span>` : ''}</div></div></div>
      ${d.why ? `<p class="dt-why">${esc(d.why.split(' · ')[0])}</p>` : ''}${d.line ? `<div class="kv">${$t('career.b_season_b')}<span>${d.line.games ? `${$t('career.games_2', { games: d.line.games })} ` : ''}${esc(d.line.text || '')}</span></div>` : ''}${missing}`;
    case 'record': return `<div class="dt-hero"><span class="dt-icon">📜</span><div><div class="dt-title">${$t('career.league_record', { scope: d.scope === 'game' ? 'one game' : 'one season' })}</div><div class="dt-sub">${yearOf(d.year)}${d.week ? `${$t('career.week', { week: d.week })}` : ''} · ${club(d.club)}</div></div></div>
      <div class="dt-big mono">${fmtN(d.value)} <span>${esc(d.stat)}</span></div>
      <div class="kv">${d.opp ? `${$t('career.b_against_b')}<span>the ${esc(d.opp)}</span>` : ''}${d.game ? `${$t('career.b_result_b')}<span>${d.game.won ? $t('career.won') : $t('career.lost')} <b class="mono">${esc(d.game.score)}</b></span>` : ''}${$t('career.b_today_b')}<span>${d.standing ? `<b class="good">${$t('career.still_the_league_record')}</b>` : d.brokenBy ? `${$t('career.since_broken_by_with_in', { name: esc(d.brokenBy.name || d.brokenBy.team), team: esc(d.brokenBy.team || ''), n: fmtN(d.brokenBy.value), year: yearOf(d.brokenBy.year) })}` : $t('career.the_records_book_has_moved_on')}</span>${d.prev ? `${$t('career.b_he_broke_b')}<span>${esc(d.prev.name || d.prev.team || '')}'s ${fmtN(d.prev.value)}${d.prev.year != null ? ` (${yearOf(d.prev.year)})` : ''}</span>` : ''}</div>`;
    case 'evolve': { const a = { id: m?.id || p?.id, name: '', species: d.species, stage: d.fromStage }, b = { ...a, stage: d.stage };
      return `<div class="dt-evo"><div>${monsterSprite(a, 72)}<span>${esc(d.from || $t('career.before'))}</span></div><span class="dt-evo-arrow" aria-hidden="true">➜</span><div>${monsterSprite(b, 72)}<span>${esc(d.to || $t('career.after'))}</span></div></div>
      <p class="dim center">${d.before ? $t('career.evolved_before_the_timeline_began_the') : `${d.year != null ? yearOf(d.year) : ''}${d.week ? `${$t('career.week', { week: d.week })}` : ''}`}</p>${d.lvl || d.ovr ? `<div class="kv">${d.lvl ? `${$t('career.b_level_b')}<span>${d.lvl}</span>` : ''}${d.ovr ? `${$t('career.b_overall_b')}<span class="mono">${d.ovr[0]} → <b>${d.ovr[1]}</b>${d.ovr[1] > d.ovr[0] ? ` <span class="good">(+${d.ovr[1] - d.ovr[0]})</span>` : ''}</span>` : ''}</div>` : ''}`; }
    case 'game': return `<div class="dt-hero"><span class="dt-icon">🏈</span><div><div class="dt-title">${d.week > 10 ? esc(F.ROUND_NAMES[d.week - 10] || $t('career.playoffs')) : `${$t('career.week_2', { week: d.week })}`} · ${yearOf(d.year)}</div><div class="dt-sub">${d.home ? 'vs' : 'at'} the ${esc(d.opp)}${d.club ? ` · ${club(d.club)}` : ''}</div></div></div>
      <div class="dt-big mono ${d.won ? 'good' : 'bad'}">${d.won ? 'W' : 'L'} ${esc(d.score)}</div>
      ${d.lineText ? `<div class="kv">${$t('career.b_his_game_b')}<span>${esc(d.lineText)}</span></div>` : ''}${missing}`;
    case 'season': return `<div class="dt-hero"><span class="dt-icon">📅</span><div><div class="dt-title">${$t('career.season_2', { year: yearOf(d.year) })}</div><div class="dt-sub">${club(d.club)}</div></div></div>
      <div class="kv">${$t('career.b_regular_season_b')}<span>${$t('career.games', { games: d.reg.games, n: d.reg.games })}${d.reg.text ? ` · ${esc(d.reg.text)}` : ''}</span>${d.post ? `${$t('career.b_playoffs_b_2')}<span>${$t('career.games', { games: d.post.games, n: d.post.games })}${d.post.text ? ` · ${esc(d.post.text)}` : ''}</span>` : ''}</div>
      ${d.games ? `<div class="tc-head" style="margin-top:10px">${$t('career.b_game_by_game_b')}<span class="dim">${d.games.length}</span></div><div class="dt-games">${d.games.map((g) => `<div class="dt-game ${g.playoff ? 'po' : ''}"><span class="dt-gw">${g.week > 10 ? esc((F.ROUND_NAMES[g.week - 10] || $t('career.playoffs')).replace(' round', '')) : `Wk ${g.week}`}</span><span class="dt-go">${g.home ? 'vs' : 'at'} ${esc(TEAM_META[g.opp]?.abbr || g.opp)}</span><b class="mono ${g.won ? 'good' : 'bad'}">${g.won ? 'W' : 'L'} ${esc(g.score)}</b><span class="dt-gl">${esc(g.text || $t('career.played_no_box_score_numbers'))}</span></div>`).join('')}</div>` : ''}${missing}`;
    case 'hof': return `<div class="dt-hero legend"><span class="dt-icon">🏛</span><div><div class="dt-title">${$t('career.hall_of_fame_2')}</div><div class="dt-sub">${d.year != null ? yearOf(d.year) : ''} · ${club(d.club)}</div></div></div><p>${$t('career.named_on_s_hall_of_fame', { owner: esc(d.owner || $t('career.the_owner')) })}</p>`;
    default: return '';
  }
}
const DT_TITLE = { season: $t('career.the_season'), title: $t('career.beast_bowl'), award: $t('career.league_award'), record: $t('career.league_record_2'), evolve: $t('career.evolution'), game: $t('career.the_game'), hof: $t('career.hall_of_fame_2') };

/** A trophy shelf's sheet: every season it was won, each opening its detail. */
function trophySheetHtml(f, m, p, kind) {
  const t = (p.trophies || []).find((x) => x.kind === kind); if (!t) return '';
  return `<div class="dt-hero ${t.tier === 'gold' ? 'gold' : t.tier === 'legend' ? 'legend' : ''}"><span class="dt-icon">${t.icon}</span><div><div class="dt-title">${esc(t.label)}${t.count > 1 ? ` ×${t.count}` : ''}</div><div class="dt-sub">${esc(p.name)}</div></div></div>
    <div class="list">${t.entries.map((e, i) => { const ref = refForTrophy(kind, e); const d = m && ref ? eventDetail(f, m, ref) : null; const sub = d?.kind === 'title' ? (d.opp ? `${$t('career.beat_the', { opp: d.opp })}${d.score ? ` ${d.score}` : ''}` : d.role) : d?.kind === 'award' ? d.line?.text || '' : d?.kind === 'record' ? `${fmtN(d.value)} ${d.stat}${d.scope === 'game' ? $t('career.in_one_game') : $t('career.in_one_season')}${d.standing ? $t('career.still_standing') : ''}` : '';
      return `<${d ? 'button' : 'div'} class="item ${d ? '' : 'static'} tc-entry" ${d ? `data-action="tc-entry" data-kind="${esc(kind)}" data-i="${i}"` : ''}><div class="grow"><div class="name">${e.year != null ? yearOf(e.year) : $t('career.season_not_recorded_2')}${e.club ? ` · ${esc(e.club)}` : ''}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${d ? `<span class="tl-go">›</span>` : ''}</${d ? 'button' : 'div'}>`; }).join('')}</div>`;
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
  const openDetail = (ref) => { const m = ctx.monster(); const f = ctx.f(); const d = m ? eventDetail(f, m, ref) : null; const { el } = sheet(detailHtml(f, m, d, ctx.profile()), { title: DT_TITLE[ref.kind] || $t('career.details') }); bindDetail(el, ctx); };
  return {
    ...timelineActions({ render, open: (k) => { const e = ctx.profile().timeline.find((x) => x.k === k); if (e?.ref) openDetail(e.ref); }, openSeason: (y) => openDetail({ kind: 'season', year: y }) }),
    'cs-scope': (el) => { const s = el.closest('section.timeline'); statScope[ctx.profile().id] = el.dataset.v; if (s) redrawKeepingPlace(s, render()); },
    'tc-open': (el) => { const p = ctx.profile(); const kind = el.dataset.kind; const { el: sh } = sheet(trophySheetHtml(ctx.f(), ctx.monster(), p, kind), { title: $t('career.trophy_case_2') });
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
  return `<div class="career-block">${summaryHtml(p, { reduced: true })}${total ? `<div class="dim" style="font-size:12px;margin:-4px 0 6px">${$t('career.honors_in_his_trophy_case', { total, n: total })}</div>` : ''}${link && p.kind !== 'prospect' ? `<button class="btn block small" data-career="${esc(id)}">${$t('career.full_career')}</button>` : ''}</div>`;
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
  if (!p) { sheet(`<p>${$t('career.no_career_on_record_for_this_2')}</p>`, { title: $t('career.career') }); return null; }
  const ctx = { f: () => f, profile: () => withVisibility(f, careerProfile(f, id)), monster: () => findMonster(f, id)?.m || null, go };
  const extra = p.where === 'roster' && go ? `<button class="btn block" data-action="cs-card" style="margin-top:8px">${$t('career.open_s_monster_card', { name: esc(p.name) })}</button>` : '';
  const { el, close } = sheet(`<div class="career-sheet">${careerSectionHtml(f, p, { animate: true })}${extra}</div>`, { title: p.kind === 'prospect' ? $t('career.prospect') : `${$t('career.career_3', { name: p.name })}` });
  delegateIn(el, { ...careerActions(ctx), 'cs-card': () => { close(); go('monster', { id }); } });
  return { el, close, profile: p };
}
/** A Hall of Fame card's monster: the career as it stood at retirement (read-only). */
export function openSnapshotSheet(snap, { settings = {}, profile = null } = {}) {
  const p = profile || snapshotProfile(snap); if (!p) return null;
  const fake = { settings };
  const ctx = { f: () => fake, profile: () => p, monster: () => null };
  const { el } = sheet(`<div class="career-sheet">${careerSectionHtml(fake, p, { animate: !settings.reducedMotion, interactive: false })}</div>`, { title: `${$t('career.hall_of_fame_3', { name: p.name })}` });
  delegateIn(el, careerActions(ctx));
  return { el, profile: p };
}

/**
 * One document listener: any element with data-career="<monster id>" opens that monster's full-screen career profile (GDD §48)
 * through the router, so Back returns to the screen, tab and scroll position it was opened from. A sheet the link sat in is
 * closed first (through its own close button, so its close handling runs). Without a router it falls back to the sheet.
 */
let installed = false;
export function installCareerLinks(getF, go, { current = null } = {}) {
  if (installed) return; installed = true;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-career]'); if (!b) return;
    const f = getF(); if (!f) return; e.preventDefault(); e.stopPropagation();
    const id = b.dataset.career;
    if (!go) { openCareerSheet(f, id); return; }
    const cur = current?.(); if (cur?.name === 'career' && String(cur.params?.id) === String(id)) return; // already on his page
    for (const x of document.querySelectorAll('.sheet [data-action="sheet-close"]')) x.click();
    for (const x of document.querySelectorAll('.sheet-backdrop')) x.remove();
    document.documentElement.classList.remove('sheet-open'); // the scroll lock goes with the sheets
    go('career', { id });
  }, true);
}
/** A name as a career link (an id is required: names are never matched). */
export function careerLink(id, label, { cls = '' } = {}) {
  return id ? `<button class="career-link ${cls}" data-career="${esc(id)}">${esc(label)}</button>` : esc(label);
}
export { timelineView, focusStats, fullProfile };
