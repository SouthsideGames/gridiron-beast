// The full-screen Monster Career Profile (GDD §48): a player page for any monster the game has a record of — the owner's
// roster, former monsters, AI clubs' players, the rival's signature, gym legendaries, retired legends, Hall of Fame cards and
// the final roster of an archived franchise. Five sections: Overview, Timeline, Statistics, Awards & Trophy Case, Team
// History. It reads the one career profile every career view uses and writes nothing. The section, the timeline order and the
// statistics filters are remembered on the screen's own history entry, so Back returns to them.

import { esc, delegate } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { TEAM_META } from '../../data/league.js';
import { POSITION_NAME } from '../../data/stat-guide.js';
import { monsterSprite, typeGlyph } from '../pixel-monster.js';
import { careerPage, PAGE_TABS, statColumns, statCell, bucketLine } from '../../franchise/career-page.js';
import { careerProfile, snapshotProfile, legacyHofProfile, findMonster, TIER_LABEL } from '../../franchise/career-profile.js';
import { hallOfFame } from '../../franchise/hall-of-fame.js';
import { careerActions, withVisibility, trophyCaseHtml } from '../career-ui.js';
import { timelineSectionHtml, timelineActions, timelineView } from '../career-timeline.js';

const clubColor = (c) => TEAM_META[c]?.color || '#9fb8ad';
const abbr = (c) => TEAM_META[c]?.abbr || (c ? c.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase() : '—');
const span = (from, to) => (from == null ? '' : to == null ? `${yearOf(from)}–now` : from === to ? `${yearOf(from)}` : `${yearOf(from)}–${yearOf(to)}`);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmt = (n) => Number(n).toLocaleString('en-US');

/** The profile a route points at: a monster id in the open franchise, a Hall of Fame card's monster, or an archived franchise's best monster. */
export function resolveCareer(app, params) {
  if (params.hof) {
    const card = hallOfFame().find((c) => c.id === params.hof); const i = Number(params.i) || 0;
    const p = card?.careers?.[i] ? snapshotProfile(card.careers[i]) : card ? legacyHofProfile(card, i) : null;
    return p ? { f: app.f || { settings: app.settings || {} }, p, readOnly: true } : null;
  }
  if (params.best != null && app.f?.lifecycle?.legacy) {
    const b = app.f.lifecycle.legacy.bestMonsters?.[Number(params.best)];
    return b?.career ? { f: app.f, p: snapshotProfile(b.career), readOnly: true } : null;
  }
  if (!app.f || params.id == null) return null;
  const p = withVisibility(app.f, careerProfile(app.f, params.id));
  return p ? { f: app.f, p, readOnly: false } : null;
}

function headerHtml(pg, reduced) {
  const p = pg.p; const col = clubColor(p.club);
  const sameName = String(p.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '') === p.speciesName;
  const team = p.club ? `<span class="cs-team"><i></i>${esc(p.club)}</span>` : '<span class="dim">No club</span>';
  const teamLabel = pg.status.key === 'retired' || pg.status.key === 'gone' ? 'Last club' : pg.status.key === 'free' ? 'Last club' : null;
  const desig = pg.designation ? `<span class="chip cp-desig ${esc(pg.designation.kind)}">${pg.designation.kind === 'signature' ? '⚔️' : '★'} ${esc(pg.designation.label)}</span>` : '';
  const rating = p.ovr != null && pg.status.key !== 'retired' ? `<div class="cp-ovr"><b class="mono">${p.ovr}</b><span>OVR</span></div>` : '';
  return `<div class="panel cp-head tier-${esc(p.tier || 'established')}" style="--club:${col}">
    <div class="cp-id">
      <div class="cs-sprite ${reduced ? '' : 'anim'}">${monsterSprite({ id: p.id, name: p.name, species: p.species, stage: p.stage }, 64)}</div>
      <div class="cp-who"><div class="cp-name">${esc(p.name)}${p.cornerstone ? ' <span class="chip cornerstone">★</span>' : ''}</div>
        <div class="cs-sub">${sameName ? '' : `${esc(p.speciesName)} · `}${p.type ? `<span class="cp-type">${typeGlyph(p.type)} ${esc(p.type)}</span> · ` : ''}${esc(POSITION_NAME?.[p.position] || p.position)}</div>
        <div class="cs-sub">${teamLabel ? `<span class="dim">${teamLabel}:</span> ` : ''}${team}</div></div>
      ${rating}
    </div>
    <div class="cp-tags"><span class="chip cp-status s-${esc(pg.status.key)}" title="${esc(pg.status.detail)}">${esc(pg.status.label)}</span>${desig}${p.honours?.hof ? '<span class="chip cp-hof">🏛 Hall of Fame</span>' : ''}${p.tier && TIER_LABEL[p.tier] && p.tier !== 'hof' ? `<span class="chip">${esc(TIER_LABEL[p.tier])}</span>` : ''}${p.level != null && pg.status.key !== 'retired' ? `<span class="chip">Lv ${p.level}</span>` : ''}</div>
    ${pg.status.detail ? `<div class="cp-statusline dim">${esc(pg.status.detail)}</div>` : ''}
  </div>`;
}
const tabsHtml = (cur) => `<div class="cp-tabs" role="tablist">${PAGE_TABS.map(([k, l]) => `<button class="cp-tab ${cur === k ? 'on' : ''}" role="tab" aria-selected="${cur === k}" data-action="cp-tab" data-v="${k}">${l}</button>`).join('')}</div>`;

// ---------------------------------------------------------------- Overview
function overviewHtml(pg, readOnly) {
  const p = pg.p; const fx = pg.facts;
  const seasonsTxt = p.kind === 'prospect' ? 'Prospect' : fx.seasons == null ? '—' : fmt(fx.seasons);
  const facts = [['Seasons', seasonsTxt], ['Games', p.kind === 'prospect' || (p.kind === 'snapshot' && !fx.games) ? '—' : fmt(fx.games)], ['Teams', fx.teams ? fmt(fx.teams) : '—'], ['Titles', fmt(fx.titles)], ['Awards', fmt(fx.awards)], ['Records', fmt(fx.records)]];
  const spanTxt = pg.span ? span(pg.span.from, pg.span.to) : '';
  const focus = p.stats?.focus || [];
  const highlights = focus.length && (fx.games || p.kind === 'snapshot') ? `<div class="cp-sec"><div class="cp-sec-h"><b>Career highlights</b><span class="dim">regular season${p.kind !== 'snapshot' ? ` · ${plural(fx.regGames, 'game')}` : ''}</span></div><div class="cs-stats">${focus.map((s) => `<div class="cs-stat"><b class="mono">${esc(s.text)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>${p.stats?.post ? `<div class="cs-post"><b>Playoffs</b> · ${plural(p.stats.post.games, 'game')}${p.stats.post.text ? ` · ${esc(p.stats.post.text)}` : ''}</div>` : ''}</div>`
    : `<div class="cp-sec"><p class="dim" style="margin:0">${p.kind === 'prospect' ? 'No professional games yet: his numbers start with his first snap.' : p.legacy ? 'His statistics were not kept on Hall of Fame cards written before v39.0.' : 'No games on record for him in this franchise.'}</p></div>`;
  const clubs = pg.teams.length ? `<div class="cp-sec"><div class="cp-sec-h"><b>Teams</b><button class="cp-more" data-action="cp-tab" data-v="teams">Team history ›</button></div><div class="cs-clubs">${pg.teams.map((t) => `<span class="cs-club" style="--club:${clubColor(t.club)}"><i></i>${esc(t.club)}${span(t.from, t.to) ? ` <span class="dim">${span(t.from, t.to)}</span>` : ''}</span>`).join('<span class="cs-arrow" aria-hidden="true">›</span>')}</div></div>` : '';
  const honours = pg.awards.length ? `<div class="cp-sec"><div class="cp-sec-h"><b>Honours</b><button class="cp-more" data-action="cp-tab" data-v="awards">Trophy case ›</button></div><div class="cp-honours">${pg.awards.map((a) => `<div class="cp-honour"><span aria-hidden="true">${a.icon}</span><b>${esc(a.label)}${a.count > 1 ? ` ×${a.count}` : ''}</b><span class="dim">${esc([...new Set(a.entries.map((e) => (e.year == null ? 'season not recorded' : yearOf(e.year))))].join(' · '))}</span></div>`).join('')}</div></div>` : '';
  const moments = pg.moments.length ? `<div class="cp-sec"><div class="cp-sec-h"><b>Notable moments</b><button class="cp-more" data-action="cp-tab" data-v="timeline">Full timeline ›</button></div><ol class="cp-moments">${pg.moments.map((e) => `<li><span aria-hidden="true">${e.icon}</span><div><b>${esc(e.title)}</b><span class="dim">${e.y == null ? 'Before the timeline' : yearOf(e.y)}${e.w != null ? ` · ${e.w > 10 ? 'Playoffs' : `week ${e.w}`}` : ''}${e.c ? ` · ${esc(e.c)}` : ''}</span></div></li>`).join('')}</ol></div>` : '';
  return `<div class="panel cp-body">
    <div class="cp-facts">${facts.map(([l, v]) => `<div><b class="mono">${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
    ${spanTxt ? `<div class="cp-span dim">${p.kind === 'league' ? 'On record' : 'Career'} ${esc(spanTxt)}${!p.complete && fx.onRecord && fx.seasons && fx.onRecord < fx.seasons ? ` · ${plural(fx.onRecord, 'season')} on record` : ''}</div>` : ''}
    ${highlights}${honours}${clubs}${moments}
    ${(p.notes || []).map((n) => `<p class="cs-note">${esc(n)}</p>`).join('')}
    ${!p.legacy && (p.kind === 'full' || p.kind === 'snapshot') ? '<button class="btn block cc-btn" data-action="cc-open" style="margin-top:10px">📸 Career card</button>' : ''}
  </div>`;
}

// ---------------------------------------------------------------- Timeline
function timelineItems(pg, order) { const items = pg.p.timeline || []; return order === 'oldest' ? items.slice().reverse() : items; }
export function pageTimelineHtml(pg, params, reduced) {
  const order = params.order === 'oldest' ? 'oldest' : 'newest'; const key = `${pg.p.id}~page`;
  if (timelineView.open[key] === undefined) timelineView.open[key] = true; // the page shows the whole career; "Show less" folds it
  const interactive = pg.p.kind === 'full';
  const orderBar = `<div class="cp-order" role="group" aria-label="Order"><button class="chip ${order === 'newest' ? 'on' : ''}" data-action="cp-order" data-v="newest" aria-pressed="${order === 'newest'}">Newest first</button><button class="chip ${order === 'oldest' ? 'on' : ''}" data-action="cp-order" data-v="oldest" aria-pressed="${order === 'oldest'}">Oldest first</button></div>`;
  return timelineSectionHtml(timelineItems(pg, order), { name: pg.p.name, id: key, head: orderBar, animate: false, reduced, interactive, emptyText: pg.p.emptyText || (pg.p.kind === 'league' ? 'The league tables keep his season lines, not his moments: see Statistics.' : pg.p.kind === 'prospect' ? 'His story starts with the draft.' : null), seasonLinks: interactive ? new Set(pg.lines.seasons.map((s) => s.year)) : null });
}

// ---------------------------------------------------------------- Statistics
function statsHtml(pg, params) {
  const p = pg.p; const L = pg.lines;
  if (!L.seasons.length) {
    if (p.kind === 'snapshot' && (p.stats?.focus || []).length) return `<div class="panel cp-body"><div class="cp-sec-h"><b>Career totals</b><span class="dim">from the Hall of Fame card</span></div><div class="cs-stats">${p.stats.focus.map((s) => `<div class="cs-stat"><b class="mono">${esc(s.text)}</b><span>${esc(s.label)}</span></div>`).join('')}</div><p class="cs-note">Season-by-season lines are not kept on Hall of Fame cards: the card records the career totals it shows.</p></div>`;
    return `<div class="panel cp-body"><p class="dim" style="margin:0">${p.kind === 'prospect' ? 'No professional statistics yet.' : p.legacy ? 'His statistics were not kept on Hall of Fame cards written before v39.0.' : 'No statistics on record for him in this franchise.'}</p>${(p.notes || []).map((n) => `<p class="cs-note">${esc(n)}</p>`).join('')}</div>`;
  }
  const bucket = ['reg', 'post', 'all'].includes(params.bucket) ? params.bucket : 'reg';
  const group = pg.groups.some((g) => g.key === params.group) ? params.group : pg.groups[0]?.key || null;
  const cols = statColumns(p.position, group);
  const seg = (items, action, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${cur === v ? 'primary' : ''}" role="tab" aria-selected="${cur === v}" data-action="${action}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const rows = L.seasons.filter((s) => (bucketLine(s, bucket).games || 0) > 0);
  const total = bucketLine(L.career, bucket);
  const typeLabel = bucket === 'reg' ? 'regular season' : bucket === 'post' ? 'playoffs' : 'regular season + playoffs';
  const canOpen = p.kind === 'full';
  const table = rows.length ? `<div class="stat-table cp-stat-table"><table><thead><tr><th class="cp-yr">Season</th><th class="cp-tm">Team</th>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((s) => `<tr>${canOpen ? `<td class="cp-yr"><button class="cp-yr-btn" data-action="tl-season" data-y="${s.year}" aria-label="Season ${esc(yearOf(s.year))}: game by game">${esc(yearOf(s.year))} ›</button></td>` : `<td class="cp-yr">${esc(yearOf(s.year))}</td>`}<td class="cp-tm"><span class="cp-dot" style="--club:${clubColor(s.team)}"></span>${esc(abbr(s.team))}</td>${cols.map(([k]) => `<td>${statCell(bucketLine(s, bucket), k)}</td>`).join('')}</tr>`).join('')}
      <tr class="cp-total"><td class="cp-yr">${L.source === 'tables' ? 'On record' : 'Career'}</td><td class="cp-tm">${plural(rows.length, 'yr')}</td>${cols.map(([k]) => `<td>${statCell(total, k)}</td>`).join('')}</tr>
    </tbody></table></div>` : `<p class="dim">${bucket === 'post' ? 'No playoff games in this career yet.' : 'No games of this kind on record.'}</p>`;
  return `<div class="panel cp-body">
    ${seg([['reg', 'Regular season'], ['post', 'Playoffs'], ['all', 'Both']], 'cp-bucket', bucket)}
    ${pg.groups.length > 1 ? `<div style="margin-top:6px">${seg(pg.groups.map((g) => [g.key, g.label]), 'cp-group', group)}</div>` : ''}
    <div class="dim stat-caption">${esc(typeLabel)} · ${plural(total.games || 0, 'game')}${canOpen ? ' · tap a season for its games' : ''}</div>
    ${table}
    <p class="dim cp-foot">Rates come from the totals shown; a dash means the number was not kept or there is too little volume to mean anything.${L.source === 'tables' ? ' Another club\'s player before persistent rosters: these are the league tables\' season lines.' : ''}${!p.complete && p.kind === 'full' && pg.facts.onRecord && pg.facts.seasons && pg.facts.onRecord < pg.facts.seasons ? ` Seasons before this franchise kept his stats are not counted (${plural(pg.facts.onRecord, 'season')} on record).` : ''}</p>
  </div>`;
}

// ---------------------------------------------------------------- Awards & Trophy Case
function awardsHtml(pg, reduced) {
  const p = pg.p;
  const list = pg.awards.length ? `<div class="cp-sec"><div class="cp-sec-h"><b>Honours by season</b></div><div class="list">${pg.awards.flatMap((a) => a.entries.map((e) => ({ ...e, a }))).sort((x, y) => (y.year ?? -1) - (x.year ?? -1)).map((e) => `<div class="item static cp-hrow"><span class="cp-hicon" aria-hidden="true">${e.a.icon}</span><div class="grow"><div class="name">${esc(e.a.label)}</div><div class="sub">${e.year == null ? 'Season not recorded' : esc(yearOf(e.year))}${e.club ? ` · ${esc(e.club)}` : ''}</div></div></div>`).join('')}</div></div>` : '';
  const ms = pg.milestones.filter((e) => ['milestone', 'season', 'first', 'debut', 'playoff', 'star', 'rival', 'bowl', 'evolve'].includes(e.t));
  const miles = ms.length ? `<div class="cp-sec"><div class="cp-sec-h"><b>Milestones</b><span class="dim">${ms.length}</span></div><ol class="cp-moments">${ms.map((e) => `<li><span aria-hidden="true">${e.icon}</span><div><b>${esc(e.title)}</b><span class="dim">${e.y == null ? 'Before the timeline' : esc(yearOf(e.y))}${e.c ? ` · ${esc(e.c)}` : ''}</span></div></li>`).join('')}</ol></div>` : '';
  return `<div class="panel cp-body">${trophyCaseHtml(p, { reduced, interactive: p.kind === 'full' || p.kind === 'league' })}${p.honours?.hof ? '<p class="cp-hofline">🏛 Enshrined in the Hall of Fame.</p>' : ''}${list}${miles || (p.kind === 'full' ? '<p class="dim">Firsts, milestones and big seasons appear here as he reaches them.</p>' : '')}</div>`;
}

// ---------------------------------------------------------------- Team History
function teamsHtml(pg) {
  if (!pg.teams.length) return `<div class="panel cp-body"><p class="dim" style="margin:0">${pg.p.kind === 'prospect' ? 'Not yet drafted: no club history.' : 'No club history on record.'}</p></div>`;
  return `<div class="cp-teams">${pg.teams.map((t) => { const sp = span(t.from, t.to); return `<div class="panel cp-team" style="--club:${clubColor(t.club)}">
      <div class="cp-team-h"><span class="cs-team"><i></i><b>${esc(t.club)}</b></span>${sp ? `<span class="dim">${esc(sp)}</span>` : ''}</div>
      <div class="cp-team-facts dim">${t.seasons.length ? `${plural(t.seasons.length, 'season')} on record (${esc(t.seasons.map((y) => yearOf(y)).join(', '))})` : 'No season lines on record'}${t.games ? ` · ${plural(t.games, 'game')}` : ''}${t.post ? ` · ${t.post} playoff` : ''}</div>
      ${t.moves.length ? `<ol class="cp-moments">${t.moves.map((mv) => `<li><span aria-hidden="true">${mv.icon}</span><div><b>${esc(mv.title)}</b><span class="dim">${mv.y == null ? 'Season not recorded' : esc(yearOf(mv.y))} · ${esc(mv.desc)}</span></div></li>`).join('')}</ol>` : ''}
      ${t.honours.length ? `<div class="cp-team-hon">${t.honours.map((h) => `<span class="chip">${h.icon} ${esc(h.label)}${h.year != null ? ` ${esc(yearOf(h.year))}` : ''}</span>`).join('')}</div>` : ''}
    </div>`; }).join('')}<p class="dim cp-foot">Moves come from what the game recorded: the draft, signings, trades, releases and returns. Older saves keep what they proved; nothing is filled in.</p></div>`;
}

export function careerPageHtml(app, params) {
  const r = resolveCareer(app, params);
  if (!r) return '<div class="panel"><p>No career on record for this monster.</p></div>';
  const pg = careerPage(r.f, r.p.id, { profile: r.p }); const reduced = !!(app.settings?.reducedMotion || r.f?.settings?.reducedMotion);
  const tab = PAGE_TABS.some(([k]) => k === params.tab) ? params.tab : 'overview';
  const body = tab === 'overview' ? overviewHtml(pg, r.readOnly) : tab === 'timeline' ? pageTimelineHtml(pg, params, reduced) : tab === 'stats' ? statsHtml(pg, params) : tab === 'awards' ? awardsHtml(pg, reduced) : teamsHtml(pg);
  return `<div class="career-page" data-mid="${esc(r.p.id)}">${headerHtml(pg, reduced)}${tabsHtml(tab)}<div class="cp-pane">${body}</div></div>`;
}

export function registerCareerScreens(Router, app) {
  Router.registerScreen('career', {
    title: ({ params }) => { const r = resolveCareer(app, params); return r ? r.p.name : 'Career'; },
    render: ({ params }) => careerPageHtml(app, params),
    mount(root, ctx) {
      const params = ctx.params; // this history entry's own params: the section and filters are kept on it for Back
      const r = resolveCareer(app, params); if (!r) return;
      const cctx = { f: () => r.f, profile: () => resolveCareer(app, params)?.p, monster: () => (r.readOnly ? null : findMonster(r.f, r.p.id)?.m || null), go: (s, prm) => Router.go(s, prm) };
      const base = careerActions(cctx);
      const pageTimeline = () => { const pg = careerPage(r.f, r.p.id, { profile: resolveCareer(app, params).p }); return pageTimelineHtml(pg, params, !!app.settings?.reducedMotion); };
      const tl = timelineActions({ render: pageTimeline });
      const set = (k, v) => { params[k] = v; Router.render(); };
      delegate(root, {
        ...base, 'tl-filter': tl['tl-filter'], 'tl-more': tl['tl-more'],
        'cp-tab': (el) => { params.tab = el.dataset.v; Router.render(); root.querySelector('.cp-tabs')?.scrollIntoView({ block: 'nearest' }); },
        'cp-order': (el) => set('order', el.dataset.v),
        'cp-bucket': (el) => set('bucket', el.dataset.v),
        'cp-group': (el) => set('group', el.dataset.v),
      });
    },
  });
}
