// The League Hub (GDD §46, Phase 4): the persistent league made visible. Clubs (a directory, each opening its roster),
// career leaders across the universe, the league's recent moves, the award races and the rivalries (the rival GM and his
// signature monster, the gym legendaries) with their 20-season continuity. Every monster name opens its career. Reads only.

import { esc, delegate } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { monsterSprite } from '../pixel-monster.js';
import { careerLink } from '../career-ui.js';
import { TEAM_META, tierById } from '../../data/league.js';
import { AWARDS } from '../../franchise/awards.js';
import { RECORD_CATEGORIES } from '../../franchise/stats.js';
import { teamOverall } from '../../franchise/roster.js';
import { hasLeague, clubPayroll } from '../../franchise/league-registry.js';
import { clubDirectory, clubRosterView, universeCareerLeaders, protectedMonsters, headToHead } from '../../franchise/league-careers.js';
import { TRANSACTION_KINDS } from '../../franchise/league-news.js';
import * as F from '../../franchise/franchise.js';
import { t as $t } from '../../text/index.js';

const TAB_KEY = 'gridiron-beast-v7-league-tab';
const TABS = [['clubs', $t('league.clubs')], ['leaders', $t('league.leaders')], ['moves', $t('league.moves')], ['races', $t('league.races')], ['rivals', $t('league.rivals')]];
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* a convenience */ } };
const badge = (kind) => (kind === 'legendary' ? `<span class="chip accent" title="${$t('league.gym_legendary_bound_to_this_club')}">${$t('league.legend')}</span>` : kind === 'signature' ? `<span class="chip" style="border-color:#a855f7" title="${$t('league.the_rival_gms_signature_monster_bound')}">${$t('league.signature')}</span>` : '');
const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;

const overallOf = (f) => (club) => (club === f.club ? teamOverall(F.playerTeam(f)) : teamOverall(F.aiTeam(f, club)));

function clubsTab(f) {
  const dir = clubDirectory(f, { overallOf: overallOf(f) }); const st = F.leagueStandings(f); const place = (c) => st.overall.indexOf(c) + 1;
  if (!hasLeague(f)) return `<p class="muted">${$t('league.this_franchise_still_plays_against_generated')}</p>`;
  const byDiv = {}; for (const c of dir) (byDiv[c.division] ||= []).push(c);
  return `<p class="muted">${$t('league.sixteen_clubs_one_universe_tap_a')}</p>${Object.entries(byDiv).map(([div, clubs]) => `<h3>${esc(div)}</h3><div class="list">${clubs.sort((a, b) => place(a.club) - place(b.club)).map((c) => `<button class="item ${c.mine ? 'mine' : ''}" data-action="club" data-club="${esc(c.club)}"><span class="rank">${place(c.club)}</span><div class="grow"><div class="name"><span style="color:${TEAM_META[c.club]?.color}">●</span> ${esc(c.club)}${c.mine ? ` <span class="chip accent">you</span>` : ''}${c.rival ? ` <span class="chip" style="border-color:#a855f7">rival</span>` : ''}${c.gym ? ` <span class="chip">${$t('league.gym', { badge: esc(c.gym.badge) })}</span>` : ''}</div><div class="sub">${$t('league.ovr_monsters', { w: c.record.w, l: c.record.l, t: c.record.t ? '-' + c.record.t : '', overall: c.overall, size: c.size })}${c.protected.length ? ` · ${c.protected.map((p) => `${p.kind === 'legendary' ? '★' : '⚔️'} ${esc(p.name)}`).join(', ')}` : ''}</div></div><span class="dim">›</span></button>`).join('')}</div>`).join('')}`;
}

function leadersTab(f, mine) {
  const L = universeCareerLeaders(f, { n: 5, mine });
  return `<p class="muted">${$t('league.career_totals_regular_season_across', { mine: mine ? $t('league.your_roster') : $t('league.every_monster_the_universe_holds_the') })}</p>
    ${seg([['all', $t('league.whole_league')], ['mine', $t('league.your_monsters')]], 'scope', mine ? 'mine' : 'all')}
    ${RECORD_CATEGORIES.map((c) => { const rows = L[c.id]; if (!rows?.length) return ''; return `<div class="panel tight"><b>${esc(c.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.club === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span>${monsterSprite(r, 30)}<div class="grow"><div class="name">${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)}${r.club ? ` · ${esc(r.club)}` : ''}${r.where === 'legend' ? $t('league.retired') : r.where === 'pool' || r.where === 'waivers' ? $t('league.free_agent') : ''}</span></div><div class="sub">${r.games} games</div></div><span class="chip ${i === 0 ? 'accent' : ''} mono">${Number(r.value).toLocaleString('en-US')}</span></div>`).join('')}</div></div>`; }).join('') || `<p class="dim">${$t('league.no_career_totals_yet_careers_begin')}</p>`}`;
}

function movesTab(f) {
  const items = (f.leagueNews || []).filter((it) => TRANSACTION_KINDS.has(it.kind)).slice(0, 60);
  if (!items.length) return `<p class="dim">${$t('league.no_league_moves_on_record_yet')}</p>`;
  const byWeek = []; for (const it of items) { const k = `${it.year}|${it.week}`; let g = byWeek.find((x) => x.k === k); if (!g) { g = { k, year: it.year, week: it.week, items: [] }; byWeek.push(g); } g.items.push(it); }
  const label = (w) => (w === 0 ? $t('league.offseason') : w > 10 ? $t('league.playoffs') : `${$t('league.week', { w })}`);
  return `<p class="muted">${$t('league.the_leagues_moves_worth_a_line')}</p>${byWeek.map((g) => `<h3>${yearOf(g.year)} · ${label(g.week)}</h3><div class="list">${g.items.map((it) => `<div class="item static"><span>${it.icon || '📰'}</span><div class="grow"><div class="sub" style="font-size:14px">${linkText(it)}</div>${it.lines?.length ? `<div class="dim" style="font-size:12px;margin-top:4px">${it.lines.map((l) => linkText(l)).join(`<br>`)}</div>` : ''}</div></div>`).join('')}</div>`).join('')}`;
}
/** An item's text with its monster's name linked (the News UI's rule). */
function linkText(it) { let t = esc(it.text || ''); if (it.mid && it.mname) { const n = esc(it.mname); const i = t.indexOf(n); if (i >= 0) t = t.slice(0, i) + careerLink(it.mid, it.mname) + t.slice(i + n.length); } return t; }

function racesTab(f) {
  if (!f.season || f.season.week <= 1 && !f.season.awardsFinal) return `<p class="dim">${$t('league.races_start_after_the_first_sunday')}</p>`;
  const races = F.awardRaces(f, { n: 3 }); const frozen = !!f.season.awardsFinal;
  return `<p class="muted">${frozen ? `${$t('league.the_awards', { year: yearOf(f.season.year), finished: f.season.finished ? '' : $t('league.frozen_for_the_playoffs') })}` : $t('league.where_the_award_races_stand_this')}</p>${Object.entries(AWARDS).map(([k, aw]) => { const rows = races[k]; if (!Array.isArray(rows) || !rows.length) return ''; return `<div class="panel tight"><b>${esc(aw.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span><div class="grow"><div class="name">${k === 'coy' ? esc(r.coach || r.name) : careerLink(r.id, r.name)} <span class="dim">${esc(r.position || '')} · ${esc(r.team)}</span></div><div class="sub">${esc(r.why || '')}</div></div></div>`).join('')}</div></div>`; }).join('')}`;
}

function rivalsTab(f) {
  const rv = f.rivals?.[f.tier]; const prot = protectedMonsters(f); const sig = prot.find((p) => p.kind === 'signature');
  const h2h = rv ? headToHead(f, rv.team) : null;
  const rivalPanel = rv ? `<div class="panel" style="border-color:#a855f7"><b>⚔️ ${esc(rv.team)}</b> <span class="dim">GM ${esc(rv.gm)}</span><div class="muted" style="margin-top:4px">${$t('league.all_time_against_you_b_b', { w: h2h.w, l: h2h.l })}${h2h.last ? ` ${$t('league.last_meeting_week', { won: h2h.last.won ? 'W' : 'L', score: esc(h2h.last.score), year: yearOf(h2h.last.year), last: h2h.last.week })}` : ''}</div>
    ${sig ? `<div class="row" style="gap:10px;margin-top:8px;align-items:center">${monsterSprite(sig, 44)}<div class="grow"><div class="name">${careerLink(sig.id, sig.name)} ${badge('signature')}</div><div class="sub">${$t('league.ovr_games_honors_with_the_club', { position: esc(sig.position), ovr: sig.ovr, games: sig.games, honors: sig.honours, n: sig.honours })}</div></div></div>` : `<p class="dim">${$t('league.the_rivals_signature_monster_is_on')}</p>`}
    <div class="grid2" style="margin-top:8px"><button class="btn small" data-action="club" data-club="${esc(rv.team)}">${$t('league.their_roster')}</button></div></div>` : `<p class="dim">${$t('league.no_rival_yet')}</p>`;
  const legends = prot.filter((p) => p.kind === 'legendary');
  return `${rivalPanel}<h3>${$t('league.gym_legendaries')}</h3><p class="muted">${$t('league.each_gyms_legendary_belongs_to_its')}</p><div class="list">${legends.map((p) => `<div class="item static">${monsterSprite(p, 36)}<div class="grow"><div class="name">${careerLink(p.id, p.name)} ${badge('legendary')}</div><div class="sub">${esc(p.club)}${p.gym ? ` ${$t('league.the', { gym: esc(p.gym) })}` : ''} ${$t('league.ovr_games_honors', { position: esc(p.position), ovr: p.ovr, games: p.games, honors: p.honours, n: p.honours })}</div></div><button class="btn small" data-action="club" data-club="${esc(p.club)}">${$t('league.club')}</button></div>`).join('') || `<p class="dim">${$t('league.no_gym_legendaries_on_record_yet')}</p>`}</div>`;
}

export function registerLeagueHubScreens(Router, app) {
  let scope = 'all';
  Router.registerScreen('league', {
    title: $t('league.league_hub'),
    render({ f }) {
      if (!f) return `<div class="panel"><p>${$t('league.no_franchise_is_open')}</p><button class="btn block" data-action="go" data-screen="menu">${$t('league.main_menu')}</button></div>`;
      const tab = TABS.some(([k]) => k === get(TAB_KEY)) ? get(TAB_KEY) : 'clubs';
      const body = tab === 'clubs' ? clubsTab(f) : tab === 'leaders' ? leadersTab(f, scope === 'mine') : tab === 'moves' ? movesTab(f) : tab === 'races' ? racesTab(f) : rivalsTab(f);
      return `<div class="seg wrap" role="tablist" style="margin-bottom:8px">${TABS.map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
    },
    mount(root) {
      delegate(root, { tab: (el) => { set(TAB_KEY, el.dataset.tab); Router.render(); }, scope: (el) => { scope = el.dataset.v; Router.render(); }, club: (el) => Router.go('club', { club: el.dataset.club }), go: (el) => Router.go(el.dataset.screen) });
    },
  });
  Router.registerScreen('club', {
    title: ({ params }) => params.club || $t('league.club'),
    render({ f, params }) {
      const club = params.club; const meta = TEAM_META[club]; if (!meta) return `<p>${$t('league.no_such_club')}</p>`;
      const rows = clubRosterView(f, club); const rec = f.season.records[club] || { w: 0, l: 0 }; const mine = club === f.club;
      const cap = tierById(f.tier).cap; const payroll = mine ? F.salarySummary(f).monsters : (hasLeague(f) ? clubPayroll(f, club) : null);
      const h2h = mine ? null : headToHead(f, club);
      const year = f.season.year;
      return `<div class="panel"><div class="row between"><b style="color:${meta.color}">${esc(club)}</b><span class="chip">${rec.w}-${rec.l}</span></div><div class="muted">${$t('league.monsters_team_ovr', { n: rows.length, club: overallOf(f)(club) })}${payroll != null ? ` ${$t('league.payroll_cr', { toLocaleString: payroll.toLocaleString('en-US'), toLocaleString2: cap.toLocaleString('en-US') })}` : ''}${h2h ? ` ${$t('league.against_you', { w: h2h.w, l: h2h.l })}` : ''}</div></div>
        ${rows.length ? `<div class="list">${rows.map((m) => `<div class="item static ${m.injury ? 'hurt' : ''}">${monsterSprite(m, 32)}<div class="grow"><div class="name">${careerLink(m.id, m.name)} ${m.kind ? badge(m.kind) : ''}${m.rookie ? ` <span class="chip">rookie</span>` : ''}${m.injury ? ` <span class="chip" style="border-color:var(--bad)">${$t('league.out_w', { weeks: m.injury.weeks })}</span>` : ''}</div><div class="sub">${$t('league.ovr_age_lvl', { position: esc(m.position), ovr: m.ovr, age: m.age, level: m.level })}${m.seasonsHere != null ? ` · ${m.seasonsHere === 1 ? 'first season here' : `${m.seasonsHere} seasons here`}` : ''}${m.permanent ? $t('league.for_life') : m.ends != null ? ` ${$t('league.deal_to', { year: yearOf(m.ends) })}` : ''}</div></div></div>`).join('')}</div>` : `<p class="dim">${hasLeague(f) ? $t('league.no_roster_on_record') : $t('league.a_generated_roster_it_changes_each')}</p>`}
        <p class="dim" style="margin-top:8px">${$t('league.tap_a_name_for_the_career', { year: yearOf(year) })}</p>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
}
