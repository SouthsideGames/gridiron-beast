// The Franchise Legacy: the read-only shell of a retired or dismissed franchise (GDD §42.7, Phase 2). It replaces HQ for an
// archive. Five tabs: Legacy (the summary and the season table), Seasons, League, Roster and Careers. Nothing here writes to
// the franchise; the only state kept is the last tab, outside the archive record. Where the save holds no record for a field,
// the screen says so rather than inventing one.

import { esc, delegate, toast, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { portraitSprite, monsterSprite } from '../pixel-monster.js';
import { monsterOverall, SPECIES_BY_ID } from '../../data/monsters.js';
import { careerLink } from '../career-ui.js';
import { leagueNewsSheetHtml } from '../league-news-ui.js';
import { offerExport } from '../storage-ui.js';
import { hallOfFame } from '../../franchise/hall-of-fame.js';
import { AWARDS } from '../../franchise/awards.js';
import { isArchived, SEASON_CAP } from '../../franchise/lifecycle.js';
import { hasLeague, leagueClubs, clubRoster } from '../../franchise/league-registry.js';
import { achievementsFor } from '../../franchise/achievement-store.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { STAFF, STAFF_ROLES } from '../../data/staff.js';
import { t as $t } from '../../text/index.js';

const TAB_KEY = 'gridiron-beast-v7-legacy-tab';
const TABS = [['legacy', $t('career.legacy')], ['seasons', $t('career.seasons_3')], ['league', $t('career.league')], ['roster', $t('career.roster')], ['careers', $t('career.careers')]];
const date = (t) => (t ? new Date(t).toLocaleDateString() : 'unknown date');
const rec = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '—');
const na = `<span class="dim">${$t('career.not_recorded')}</span>`;
let tab = (() => { try { return localStorage.getItem(TAB_KEY) || 'legacy'; } catch { return 'legacy'; } })();
const setTab = (t) => { tab = t; try { localStorage.setItem(TAB_KEY, t); } catch { /* a convenience */ } };

function headerHtml(f) {
  const lg = f.lifecycle.legacy; const fired = f.lifecycle.status === 'fired'; const n = lg.seasonsCompleted ?? (f.history || []).length;
  return `<div class="panel legacy-head"><div class="row">${lg.owner ? `<span>${portraitSprite(`${lg.owner.portrait}|${lg.owner.first}`, 48, { teamColor: lg.color || null })}</span>` : ''}<div class="grow">
    <div style="font-size:18px;font-weight:800">${esc(f.club)}</div>
    <div class="muted">${lg.owner ? `${esc(lg.owner.first)} ${esc(lg.owner.last)} · ` : ''}${$t('career.after_seasons', { fired: fired ? $t('career.dismissed') : $t('career.retired'), n, seasonCap: n >= SEASON_CAP ? $t('career.a_complete_career') : '' })}</div>
    <div class="dim" style="font-size:12px">${$t('career.read_only_archive', { fired: fired ? $t('career.dismissed') : $t('career.retired'), date: esc(date(lg.archivedAt)) })}${lg.division ? ` ${$t('career.division', { division: esc(lg.division) })}` : ''}${lg.tier?.name ? ` · ${esc(lg.tier.name)}` : ''}</div></div></div></div>`;
}
function legacyTab(f) {
  const lg = f.lifecycle.legacy; const card = lg.hallOfFame ? hallOfFame().find((c) => c.id === lg.hallOfFame) : null;
  const goalsMet = lg.board?.history?.length ? `${lg.board.history.filter((g) => g.met).length} ${$t('career.of_met', { n: lg.board.history.length })}` : null;
  return `<div class="panel"><div class="kv">
      ${$t('career.b_career_record_b')}<span class="mono">${rec(lg.record)}</span>
      ${$t('career.b_beast_bowls_b')}<span>${lg.titles} won${lg.beastBowls?.appearances == null ? $t('career.appearances_not_recorded') : ` ${$t('career.appearances', { appearances: lg.beastBowls.appearances })}`}</span>
      ${$t('career.b_playoff_appearances_b')}<span>${lg.playoffAppearances ?? 0}</span>
      ${$t('career.b_gym_badges_b')}<span>${lg.badges?.length ? `${lg.badges.length} / 8` : '0 / 8'}</span>
      ${$t('career.b_league_awards_b')}<span>${lg.leagueAwards ?? na}</span>
      ${$t('career.b_records_held_b')}<span>${lg.recordsHeld == null ? na : lg.recordsHeld}</span>
      ${$t('career.b_board_goals_b')}<span>${goalsMet ?? na}</span>
      ${lg.rival ? `${$t('career.b_rival_b')}<span>${$t('career.all_time', { team: esc(lg.rival.team), w: lg.rival.headToHead?.w ?? 0, l: lg.rival.headToHead?.l ?? 0 })}</span>` : ''}
      ${lg.difficulty ? `${$t('career.b_difficulty_b')}<span>${esc(lg.difficulty)}</span>` : ''}
    </div>
    ${card ? `<button class="btn block" data-action="hof" style="margin-top:10px">${$t('career.open_the_hall_of_fame_card')}</button>` : `<p class="dim" style="margin-top:8px">${$t('career.no_hall_of_fame_card_the')}</p>`}
    </div>
    ${lg.bestMonsters?.length ? `<div class="panel">${$t('career.b_best_monsters_b')}<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px">${lg.bestMonsters.map((m, i) => `<button class="btn small" data-action="best" data-i="${i}">${esc(m.name)} · ${esc(m.position)} ${m.ovr}</button>`).join('')}</div></div>` : ''}
    ${lg.badges?.length ? `<div class="panel tight">${$t('career.b_badges_b')}<div class="muted">${lg.badges.map((b) => `${esc(b.badge)}${b.year != null ? ` (${yearOf(b.year)})` : ''}`).join(' · ')}</div></div>` : ''}
    ${recordsPanelHtml(f)}
    <div class="panel">${$t('career.b_season_by_season_b')}<div class="list" style="margin-top:6px">${lg.seasons.slice().reverse().map((h) => `<div class="row between sub"><span>${yearOf(h.year)}${h.champion ? ' 🏆' : h.playoffs ? $t('career.playoffs_3') : ''}</span><span class="mono">${h.w}-${h.l}${h.t ? `-${h.t}` : ''}${h.place != null ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'}` : ''}</span></div>`).join('')}</div></div>`;
}
const ROLE_LABEL = { head_coach: $t('career.head_coach'), offensive_coordinator: $t('career.offensive_coordinator'), defensive_coordinator: $t('career.defensive_coordinator'), head_scout: $t('career.head_scout'), monster_trainer: $t('career.monster_trainer') };
/** Milestones, legendaries, the final staff and the draft history: from the save and the player's records, nothing invented. */
function recordsPanelHtml(f) {
  const earned = f.uid ? achievementsFor(f.uid) : []; const own = Object.keys(f.achievements || {}); const ids = [...new Set([...earned, ...own])];
  const names = ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.desc || id);
  const legendaries = (f.roster || []).filter((m) => SPECIES_BY_ID[m.species]?.rarity === 'legendary').map((m) => m.name);
  const unlocked = Object.keys(f.campaign?.unlocked || {}).map((id) => SPECIES_BY_ID[id]?.name || id);
  const staff = STAFF_ROLES.map((r) => { const id = f.staff?.[r]; const c = id ? STAFF.find((x) => x.id === id) : null; return `<div class="row between sub"><span>${esc(ROLE_LABEL[r] || r)}</span><span>${c ? esc(c.name) : na}</span></div>`; }).join('');
  const drafts = Object.keys(f.draftResults || {}).map(Number).filter((y) => (f.draftResults[y]?.[f.club] || []).length).sort((a, b) => b - a);
  return `<div class="panel">${$t('career.b_milestones_b')}<div class="muted" style="margin-top:4px">${ids.length ? `${$t('career.achievements_earned_with_this_franchise', { n: ids.length })}` : $t('career.no_achievements_were_earned_with_this')}</div>${names.length ? `<details style="margin-top:4px"><summary class="muted" style="cursor:pointer">${$t('career.show_them')}</summary><div class="list" style="margin-top:4px">${names.map((n) => `<div class="sub">• ${esc(n)}</div>`).join('')}</div></details>` : ''}
    <div class="kv" style="margin-top:8px">${$t('career.b_legendary_monsters_b')}<span>${legendaries.length ? esc(legendaries.join(', ')) : $t('career.none_on_the_final_roster')}${unlocked.length ? ` ${$t('career.unlocked')} ${esc(unlocked.join(', '))}` : ''}</span></div>
    <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">${$t('career.final_staff')}</summary><div class="list" style="margin-top:4px">${staff}</div><div class="dim" style="font-size:12px;margin-top:4px">${$t('career.earlier_staff_changes_are_not_recorded')}</div></details>
    ${drafts.length ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">${$t('career.draft_history_drafts_kept', { n: drafts.length })}</summary>${drafts.map((y) => `<div class="sub" style="margin-top:4px"><b>${yearOf(y)}</b>: ${(f.draftResults[y][f.club] || []).map((m) => `${careerLink(m.id, esc(m.name))} (${esc(m.position || '')})`).join(', ')}</div>`).join('')}</details>` : `<div class="dim" style="font-size:12px;margin-top:8px">${$t('career.no_draft_classes_are_kept_in')}</div>`}
  </div>`;
}
function seasonsTab(f) {
  const hist = (f.history || []).slice().reverse();
  return `<div class="list">${hist.map((h) => `<div class="item static"><div class="grow"><div class="name">${yearOf(h.year)} · ${esc(h.club)}</div><div class="muted">${rec(h.record)}${h.place != null ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'}` : ''}${h.champion ? ` · ${h.champion === h.club ? $t('career.beast_bowl_champions_2') : `${$t('career.won_the_beast_bowl', { champion: esc(h.champion) })}`}` : ''}${h.playoffs ? $t('career.playoffs_3') : ''}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${h.awards ? `<button class="btn small" data-action="awards" data-year="${h.year}">${$t('career.awards_2')}</button>` : ''}${h.championship ? `<button class="btn small" data-action="ceremony" data-year="${h.year}">${$t('career.ceremony')}</button>` : ''}${h.leagueStats ? `<span class="dim" style="font-size:12px">tables kept</span>` : ''}</div></div></div>`).join('')}</div>
    <div class="grid2" style="margin-top:10px"><button class="btn block" data-action="go" data-screen="standings">${$t('career.final_standings')}</button><button class="btn block" data-action="go" data-screen="schedule">${$t('career.final_schedule')}</button></div>`;
}
function awardsSheetHtml(h) {
  const L = h.awards?.league || {};
  const rows = Object.entries(AWARDS).map(([k, a]) => { const w = L[k]; return `<div class="row between sub"><span>${esc(a.label)}</span><span>${w ? `${careerLink(w.id, esc(w.name))} <span class="dim">${esc(w.team)}</span>` : '<span class="dim">—</span>'}</span></div>`; });
  return `<div class="list">${rows.join('')}</div>`;
}
function leagueTab(f) {
  return `<div class="grid2"><button class="btn block" data-action="go" data-screen="records">${$t('career.records_book')}</button><button class="btn block" data-action="go" data-screen="standings">${$t('career.standings')}</button><button class="btn block" data-action="news">${$t('career.league_news')}</button><button class="btn block" data-action="go" data-screen="schedule">${$t('career.schedule')}</button><button class="btn block" data-action="go" data-screen="history">${$t('career.franchise_history')}</button><button class="btn block" data-action="go" data-screen="awardhistory">${$t('career.award_history')}</button><button class="btn block" data-action="go" data-screen="monsterhof">${$t('career.monster_hall_of_fame')}</button></div>
    <p class="dim" style="margin-top:8px">${$t('career.standings_the_schedule_and_league_news', { year: yearOf(f.season.year) })}</p>`;
}
function rosterTab(f) {
  const list = (f.roster || []).slice().sort((a, b) => monsterOverall(b) - monsterOverall(a));
  return `<p class="muted">${$t('career.the_final_roster_monsters_tap_a', { n: list.length })}</p><div class="list">${list.map((m) => `<div class="item static"><span>${monsterSprite(m, 36)}</span><div class="grow"><div class="name">${careerLink(m.id, esc(m.name))}</div><div class="muted">${esc(m.position)} · ${esc(m.species)} · OVR ${monsterOverall(m)} · Lv ${m.level ?? '—'}${m.age != null ? ` ${$t('career.age', { age: m.age })}` : ''}</div></div></div>`).join('')}</div>`;
}
function careersTab(f) {
  const lg = f.lifecycle.legacy; const list = (f.roster || []).slice().sort((a, b) => monsterOverall(b) - monsterOverall(a));
  // The whole universe (GDD §46): the 15 persistent clubs' final rosters and the legends who left, each a career.
  const league = hasLeague(f) ? leagueClubs(f).slice().sort().map((club) => ({ club, roster: clubRoster(f, club).slice().sort((a, b) => monsterOverall(b) - monsterOverall(a)) })) : [];
  const legends = Object.values(f.league?.legends || {}).sort((a, b) => (b.left || 0) - (a.left || 0));
  const row = (m, extra = '') => `<div class="item static"><span>${monsterSprite(m, 30)}</span><div class="grow"><div class="name">${careerLink(m.id, esc(m.name))}${m.legendary ? ` <span class="chip accent">${$t('career.legend')}</span>` : m.signature ? ` <span class="chip" style="border-color:#a855f7">${$t('career.signature')}</span>` : ''}</div><div class="muted">${esc(m.position)}${extra}</div></div></div>`;
  const universe = league.length ? `<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">${$t('career.the_leagues_monsters')}${league.reduce((n, c) => n + c.roster.length, 0)} ${$t('career.on_15_clubs_retired_legends', { n: legends.length })}</summary>${legends.length ? `<h3>${$t('career.retired_legends')}</h3><div class="list">${legends.map((m) => row(m, ` ${$t('career.last_with', { lastClub: esc(m.lastClub || '—') })}${m.left ? ` ${$t('career.retired_2', { year: yearOf(m.left) })}` : ''}`)).join('')}</div>` : ''}${league.map((c) => `<h3>${esc(c.club)}</h3><div class="list">${c.roster.map((m) => row(m, ` ${$t('career.ovr_3', { monsterOverall: monsterOverall(m) })}`)).join('')}</div>`).join('')}</details>` : '';
  return `<p class="muted">${$t('career.every_monster_the_franchise_kept_with')}</p>
    ${lg.bestMonsters?.length ? `<div class="panel tight">${$t('career.b_career_snapshots_at_retirement_b')}<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:6px">${lg.bestMonsters.map((m, i) => `<button class="btn small" data-action="best" data-i="${i}">${esc(m.name)}</button>`).join('')}</div></div>` : ''}
    <div class="list">${list.map((m) => `<div class="item static"><div class="grow"><div class="name">${careerLink(m.id, esc(m.name))}</div><div class="muted">${$t('career.ovr_4', { position: esc(m.position), monsterOverall: monsterOverall(m) })}</div></div></div>`).join('')}</div>${universe}`;
}

export function registerLegacyScreens(Router, app) {
  Router.registerScreen('legacy', {
    title: $t('career.franchise_legacy'), back: false, tabs: false,
    render({ f }) {
      if (!f) return `<div class="panel"><p>${$t('career.no_franchise_is_open')}</p><button class="btn block" data-action="go" data-screen="franchises">${$t('career.franchises')}</button></div>`;
      if (!isArchived(f)) return `<div class="panel"><p>${$t('career.is_still_active_its_legacy_is', { club: esc(f.club) })}</p><button class="btn block" data-action="go" data-screen="hq">${$t('career.back_to_hq')}</button></div>`;
      const body = { legacy: legacyTab, seasons: seasonsTab, league: leagueTab, roster: rosterTab, careers: careersTab }[tab] || legacyTab;
      return `${headerHtml(f)}
        <div class="segmented" role="tablist" style="margin:8px 0">${TABS.map(([id, label]) => `<button class="btn small ${tab === id ? 'primary' : ''}" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</div>
        ${body(f)}
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="export">${$t('career.export_franchise')}</button><button class="btn block" data-action="go" data-screen="franchises">${$t('career.franchises')}</button></div>`;
    },
    mount(root) {
      delegate(root, {
        tab: (el) => { setTab(el.dataset.tab); Router.render(); },
        go: (el) => Router.go(el.dataset.screen),
        export: async () => { await offerExport(app.f); },
        hof: () => Router.go('hof'),
        news: () => sheet(leagueNewsSheetHtml(app.f), { title: $t('career.league_news_2') }),
        awards: (el) => { const h = app.f.history.find((x) => x.year === Number(el.dataset.year)); if (h) sheet(awardsSheetHtml(h), { title: `${$t('career.awards_3', { year: yearOf(h.year) })}` }); },
        ceremony: (el) => Router.go('ceremony', { year: Number(el.dataset.year) }),
        best: (el) => { const m = app.f.lifecycle.legacy.bestMonsters[Number(el.dataset.i)]; if (m?.career) Router.go('career', { best: Number(el.dataset.i) }); else toast($t('career.no_career_snapshot_was_kept_for'), 'info'); },
      });
    },
  });
}
