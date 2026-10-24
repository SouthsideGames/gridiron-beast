// The Franchise Legacy: the read-only shell of a retired or dismissed franchise (GDD §42.7, Phase 2). It replaces HQ for an
// archive. Five tabs: Legacy (the summary and the season table), Seasons, League, Roster and Careers. Nothing here writes to
// the franchise; the only state kept is the last tab, outside the archive record. Where the save holds no record for a field,
// the screen says so rather than inventing one.

import { esc, delegate, toast, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { portraitSprite, monsterSprite } from '../pixel-monster.js';
import { monsterOverall, SPECIES_BY_ID } from '../../data/monsters.js';
import { careerLink, openSnapshotSheet } from '../career-ui.js';
import { leagueNewsSheetHtml } from '../league-news-ui.js';
import { offerExport } from '../storage-ui.js';
import { hallOfFame } from '../../franchise/hall-of-fame.js';
import { AWARDS } from '../../franchise/awards.js';
import { isArchived, SEASON_CAP } from '../../franchise/lifecycle.js';
import { achievementsFor } from '../../franchise/achievement-store.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { STAFF, STAFF_ROLES } from '../../data/staff.js';

const TAB_KEY = 'gridiron-beast-v7-legacy-tab';
const TABS = [['legacy', 'Legacy'], ['seasons', 'Seasons'], ['league', 'League'], ['roster', 'Roster'], ['careers', 'Careers']];
const date = (t) => (t ? new Date(t).toLocaleDateString() : 'unknown date');
const rec = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '—');
const na = '<span class="dim">not recorded</span>';
let tab = (() => { try { return localStorage.getItem(TAB_KEY) || 'legacy'; } catch { return 'legacy'; } })();
const setTab = (t) => { tab = t; try { localStorage.setItem(TAB_KEY, t); } catch { /* a convenience */ } };

function headerHtml(f) {
  const lg = f.lifecycle.legacy; const fired = f.lifecycle.status === 'fired'; const n = lg.seasonsCompleted ?? (f.history || []).length;
  return `<div class="panel legacy-head"><div class="row">${lg.owner ? `<span>${portraitSprite(`${lg.owner.portrait}|${lg.owner.first}`, 48)}</span>` : ''}<div class="grow">
    <div style="font-size:18px;font-weight:800">${esc(f.club)}</div>
    <div class="muted">${lg.owner ? `${esc(lg.owner.first)} ${esc(lg.owner.last)} · ` : ''}${fired ? 'Dismissed' : 'Retired'} after ${n} season${n === 1 ? '' : 's'}${n >= SEASON_CAP ? ' · a complete career' : ''}</div>
    <div class="dim" style="font-size:12px">${fired ? 'Dismissed' : 'Retired'} ${esc(date(lg.archivedAt))} · read-only archive${lg.division ? ` · ${esc(lg.division)} Division` : ''}${lg.tier?.name ? ` · ${esc(lg.tier.name)}` : ''}</div></div></div></div>`;
}
function legacyTab(f) {
  const lg = f.lifecycle.legacy; const card = lg.hallOfFame ? hallOfFame().find((c) => c.id === lg.hallOfFame) : null;
  const goalsMet = lg.board?.history?.length ? `${lg.board.history.filter((g) => g.met).length} of ${lg.board.history.length} met` : null;
  return `<div class="panel"><div class="kv">
      <b>Career record</b><span class="mono">${rec(lg.record)}</span>
      <b>Beast Bowls</b><span>${lg.titles} won${lg.beastBowls?.appearances == null ? ' · appearances not recorded' : ` · ${lg.beastBowls.appearances} appearances`}</span>
      <b>Playoff appearances</b><span>${lg.playoffAppearances ?? 0}</span>
      <b>Gym badges</b><span>${lg.badges?.length ? `${lg.badges.length} / 8` : '0 / 8'}</span>
      <b>League awards</b><span>${lg.leagueAwards ?? na}</span>
      <b>Records held</b><span>${lg.recordsHeld == null ? na : lg.recordsHeld}</span>
      <b>Board goals</b><span>${goalsMet ?? na}</span>
      ${lg.rival ? `<b>Rival</b><span>${esc(lg.rival.team)} · all-time ${lg.rival.headToHead?.w ?? 0}-${lg.rival.headToHead?.l ?? 0}</span>` : ''}
      ${lg.difficulty ? `<b>Difficulty</b><span>${esc(lg.difficulty)}</span>` : ''}
    </div>
    ${card ? `<button class="btn block" data-action="hof" style="margin-top:10px">🏛️ Open the Hall of Fame card</button>` : '<p class="dim" style="margin-top:8px">No Hall of Fame card: the checklist was not met when this franchise ended.</p>'}
    </div>
    ${lg.bestMonsters?.length ? `<div class="panel"><b>Best monsters</b><div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px">${lg.bestMonsters.map((m, i) => `<button class="btn small" data-action="best" data-i="${i}">${esc(m.name)} · ${esc(m.position)} ${m.ovr}</button>`).join('')}</div></div>` : ''}
    ${lg.badges?.length ? `<div class="panel tight"><b>Badges</b><div class="muted">${lg.badges.map((b) => `${esc(b.badge)}${b.year != null ? ` (${yearOf(b.year)})` : ''}`).join(' · ')}</div></div>` : ''}
    ${recordsPanelHtml(f)}
    <div class="panel"><b>Season by season</b><div class="list" style="margin-top:6px">${lg.seasons.slice().reverse().map((h) => `<div class="row between sub"><span>${yearOf(h.year)}${h.champion ? ' 🏆' : h.playoffs ? ' · playoffs' : ''}</span><span class="mono">${h.w}-${h.l}${h.t ? `-${h.t}` : ''}${h.place != null ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'}` : ''}</span></div>`).join('')}</div></div>`;
}
const ROLE_LABEL = { head_coach: 'Head coach', offensive_coordinator: 'Offensive coordinator', defensive_coordinator: 'Defensive coordinator', head_scout: 'Head scout', monster_trainer: 'Monster trainer' };
/** Milestones, legendaries, the final staff and the draft history: from the save and the player's records, nothing invented. */
function recordsPanelHtml(f) {
  const earned = f.uid ? achievementsFor(f.uid) : []; const own = Object.keys(f.achievements || {}); const ids = [...new Set([...earned, ...own])];
  const names = ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.desc || id);
  const legendaries = (f.roster || []).filter((m) => SPECIES_BY_ID[m.species]?.rarity === 'legendary').map((m) => m.name);
  const unlocked = Object.keys(f.campaign?.unlocked || {}).map((id) => SPECIES_BY_ID[id]?.name || id);
  const staff = STAFF_ROLES.map((r) => { const id = f.staff?.[r]; const c = id ? STAFF.find((x) => x.id === id) : null; return `<div class="row between sub"><span>${esc(ROLE_LABEL[r] || r)}</span><span>${c ? esc(c.name) : na}</span></div>`; }).join('');
  const drafts = Object.keys(f.draftResults || {}).map(Number).filter((y) => (f.draftResults[y]?.[f.club] || []).length).sort((a, b) => b - a);
  return `<div class="panel"><b>Milestones</b><div class="muted" style="margin-top:4px">${ids.length ? `${ids.length} achievement${ids.length === 1 ? '' : 's'} earned with this franchise` : 'No achievements were earned with this franchise.'}</div>${names.length ? `<details style="margin-top:4px"><summary class="muted" style="cursor:pointer">Show them</summary><div class="list" style="margin-top:4px">${names.map((n) => `<div class="sub">• ${esc(n)}</div>`).join('')}</div></details>` : ''}
    <div class="kv" style="margin-top:8px"><b>Legendary monsters</b><span>${legendaries.length ? esc(legendaries.join(', ')) : 'none on the final roster'}${unlocked.length ? ` · unlocked: ${esc(unlocked.join(', '))}` : ''}</span></div>
    <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">Final staff</summary><div class="list" style="margin-top:4px">${staff}</div><div class="dim" style="font-size:12px;margin-top:4px">Earlier staff changes are not recorded by the game.</div></details>
    ${drafts.length ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">Draft history (${drafts.length} draft${drafts.length === 1 ? '' : 's'} kept)</summary>${drafts.map((y) => `<div class="sub" style="margin-top:4px"><b>${yearOf(y)}</b>: ${(f.draftResults[y][f.club] || []).map((m) => `${careerLink(m.id, esc(m.name))} (${esc(m.position || '')})`).join(', ')}</div>`).join('')}</details>` : '<div class="dim" style="font-size:12px;margin-top:8px">No draft classes are kept in this save.</div>'}
  </div>`;
}
function seasonsTab(f) {
  const hist = (f.history || []).slice().reverse();
  return `<div class="list">${hist.map((h) => `<div class="item static"><div class="grow"><div class="name">${yearOf(h.year)} · ${esc(h.club)}</div><div class="muted">${rec(h.record)}${h.place != null ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'}` : ''}${h.champion ? ` · ${h.champion === h.club ? '🏆 Beast Bowl champions' : `${esc(h.champion)} won the Beast Bowl`}` : ''}${h.playoffs ? ' · playoffs' : ''}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${h.awards ? `<button class="btn small" data-action="awards" data-year="${h.year}">Awards</button>` : ''}${h.championship ? `<button class="btn small" data-action="ceremony" data-year="${h.year}">Ceremony</button>` : ''}${h.leagueStats ? `<span class="dim" style="font-size:12px">tables kept</span>` : ''}</div></div></div>`).join('')}</div>
    <div class="grid2" style="margin-top:10px"><button class="btn block" data-action="go" data-screen="standings">Final standings</button><button class="btn block" data-action="go" data-screen="schedule">Final schedule</button></div>`;
}
function awardsSheetHtml(h) {
  const L = h.awards?.league || {};
  const rows = Object.entries(AWARDS).map(([k, a]) => { const w = L[k]; return `<div class="row between sub"><span>${esc(a.label)}</span><span>${w ? `${careerLink(w.id, esc(w.name))} <span class="dim">${esc(w.team)}</span>` : '<span class="dim">—</span>'}</span></div>`; });
  return `<div class="list">${rows.join('')}</div>`;
}
function leagueTab(f) {
  return `<div class="grid2"><button class="btn block" data-action="go" data-screen="records">📜 Records book</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button><button class="btn block" data-action="news">📰 League News</button><button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button></div>
    <p class="dim" style="margin-top:8px">Standings, the schedule and League News are those of the final season (${yearOf(f.season.year)}). Earlier seasons' awards are under Seasons.</p>`;
}
function rosterTab(f) {
  const list = (f.roster || []).slice().sort((a, b) => monsterOverall(b) - monsterOverall(a));
  return `<p class="muted">The final roster, ${list.length} monsters. Tap a name for the career.</p><div class="list">${list.map((m) => `<div class="item static"><span>${monsterSprite(m, 36)}</span><div class="grow"><div class="name">${careerLink(m.id, esc(m.name))}</div><div class="muted">${esc(m.position)} · ${esc(m.species)} · OVR ${monsterOverall(m)} · Lv ${m.level ?? '—'}${m.age != null ? ` · age ${m.age}` : ''}</div></div></div>`).join('')}</div>`;
}
function careersTab(f) {
  const lg = f.lifecycle.legacy; const list = (f.roster || []).slice().sort((a, b) => monsterOverall(b) - monsterOverall(a));
  return `<p class="muted">Every monster the franchise kept, with its timeline, trophy case and career card (read-only).</p>
    ${lg.bestMonsters?.length ? `<div class="panel tight"><b>Career snapshots at retirement</b><div class="row" style="flex-wrap:wrap;gap:8px;margin-top:6px">${lg.bestMonsters.map((m, i) => `<button class="btn small" data-action="best" data-i="${i}">${esc(m.name)}</button>`).join('')}</div></div>` : ''}
    <div class="list">${list.map((m) => `<div class="item static"><div class="grow"><div class="name">${careerLink(m.id, esc(m.name))}</div><div class="muted">${esc(m.position)} · OVR ${monsterOverall(m)}</div></div></div>`).join('')}</div>`;
}

export function registerLegacyScreens(Router, app) {
  Router.registerScreen('legacy', {
    title: 'Franchise Legacy', back: false, tabs: false,
    render({ f }) {
      if (!f) return '<div class="panel"><p>No franchise is open.</p><button class="btn block" data-action="go" data-screen="franchises">Franchises</button></div>';
      if (!isArchived(f)) return `<div class="panel"><p>${esc(f.club)} is still active: its Legacy is written when it retires.</p><button class="btn block" data-action="go" data-screen="hq">Back to HQ</button></div>`;
      const body = { legacy: legacyTab, seasons: seasonsTab, league: leagueTab, roster: rosterTab, careers: careersTab }[tab] || legacyTab;
      return `${headerHtml(f)}
        <div class="segmented" role="tablist" style="margin:8px 0">${TABS.map(([id, label]) => `<button class="btn small ${tab === id ? 'primary' : ''}" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div>
        ${body(f)}
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="export">Export franchise</button><button class="btn block" data-action="go" data-screen="franchises">Franchises</button></div>`;
    },
    mount(root) {
      delegate(root, {
        tab: (el) => { setTab(el.dataset.tab); Router.render(); },
        go: (el) => Router.go(el.dataset.screen),
        export: async () => { await offerExport(app.f); },
        hof: () => Router.go('hof'),
        news: () => sheet(leagueNewsSheetHtml(app.f), { title: 'League News' }),
        awards: (el) => { const h = app.f.history.find((x) => x.year === Number(el.dataset.year)); if (h) sheet(awardsSheetHtml(h), { title: `${yearOf(h.year)} awards` }); },
        ceremony: (el) => Router.go('ceremony', { year: Number(el.dataset.year) }),
        best: (el) => { const m = app.f.lifecycle.legacy.bestMonsters[Number(el.dataset.i)]; if (m?.career) openSnapshotSheet(m.career, { settings: app.settings }); else toast('No career snapshot was kept for this monster.', 'info'); },
      });
    },
  });
}
