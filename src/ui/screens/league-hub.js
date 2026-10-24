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

const TAB_KEY = 'gridiron-beast-v7-league-tab';
const TABS = [['clubs', 'Clubs'], ['leaders', 'Leaders'], ['moves', 'Moves'], ['races', 'Races'], ['rivals', 'Rivals']];
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* a convenience */ } };
const badge = (kind) => (kind === 'legendary' ? '<span class="chip accent" title="Gym legendary: bound to this club">★ Legend</span>' : kind === 'signature' ? '<span class="chip" style="border-color:#a855f7" title="The rival GM\'s signature monster: bound to this club">⚔️ Signature</span>' : '');
const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;

const overallOf = (f) => (club) => (club === f.club ? teamOverall(F.playerTeam(f)) : teamOverall(F.aiTeam(f, club)));

function clubsTab(f) {
  const dir = clubDirectory(f, { overallOf: overallOf(f) }); const st = F.leagueStandings(f); const place = (c) => st.overall.indexOf(c) + 1;
  if (!hasLeague(f)) return `<p class="muted">This franchise still plays against generated clubs: their rosters are new each season. A persistent league is built when the game next opens it.</p>`;
  const byDiv = {}; for (const c of dir) (byDiv[c.division] ||= []).push(c);
  return `<p class="muted">Sixteen clubs, one universe. Tap a club for its roster; every name opens a career.</p>${Object.entries(byDiv).map(([div, clubs]) => `<h3>${esc(div)}</h3><div class="list">${clubs.sort((a, b) => place(a.club) - place(b.club)).map((c) => `<button class="item ${c.mine ? 'mine' : ''}" data-action="club" data-club="${esc(c.club)}"><span class="rank">${place(c.club)}</span><div class="grow"><div class="name"><span style="color:${TEAM_META[c.club]?.color}">●</span> ${esc(c.club)}${c.mine ? ' <span class="chip accent">you</span>' : ''}${c.rival ? ' <span class="chip" style="border-color:#a855f7">rival</span>' : ''}${c.gym ? ` <span class="chip">gym · ${esc(c.gym.badge)}</span>` : ''}</div><div class="sub">${c.record.w}-${c.record.l}${c.record.t ? '-' + c.record.t : ''} · OVR ${c.overall} · ${c.size} monsters${c.protected.length ? ` · ${c.protected.map((p) => `${p.kind === 'legendary' ? '★' : '⚔️'} ${esc(p.name)}`).join(', ')}` : ''}</div></div><span class="dim">›</span></button>`).join('')}</div>`).join('')}`;
}

function leadersTab(f, mine) {
  const L = universeCareerLeaders(f, { n: 5, mine });
  return `<p class="muted">Career totals, regular season, across ${mine ? 'your roster' : 'every monster the universe holds: the clubs, the pools and the legends who left'}.</p>
    ${seg([['all', 'Whole league'], ['mine', 'Your monsters']], 'scope', mine ? 'mine' : 'all')}
    ${RECORD_CATEGORIES.map((c) => { const rows = L[c.id]; if (!rows?.length) return ''; return `<div class="panel tight"><b>${esc(c.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.club === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span>${monsterSprite(r, 30)}<div class="grow"><div class="name">${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)}${r.club ? ` · ${esc(r.club)}` : ''}${r.where === 'legend' ? ' · retired' : r.where === 'pool' || r.where === 'waivers' ? ' · free agent' : ''}</span></div><div class="sub">${r.games} games</div></div><span class="chip ${i === 0 ? 'accent' : ''} mono">${Number(r.value).toLocaleString('en-US')}</span></div>`).join('')}</div></div>`; }).join('') || '<p class="dim">No career totals yet: careers begin with the first games.</p>'}`;
}

function movesTab(f) {
  const items = (f.leagueNews || []).filter((it) => TRANSACTION_KINDS.has(it.kind)).slice(0, 60);
  if (!items.length) return '<p class="dim">No league moves on record yet. Signings, trades, draft picks and retirements that matter are reported here and in League News as they happen.</p>';
  const byWeek = []; for (const it of items) { const k = `${it.year}|${it.week}`; let g = byWeek.find((x) => x.k === k); if (!g) { g = { k, year: it.year, week: it.week, items: [] }; byWeek.push(g); } g.items.push(it); }
  const label = (w) => (w === 0 ? 'Offseason' : w > 10 ? 'Playoffs' : `Week ${w}`);
  return `<p class="muted">The league's moves worth a line: starters and stars, your former monsters, your rival and your division, first-round picks.</p>${byWeek.map((g) => `<h3>${yearOf(g.year)} · ${label(g.week)}</h3><div class="list">${g.items.map((it) => `<div class="item static"><span>${it.icon || '📰'}</span><div class="grow"><div class="sub" style="font-size:14px">${linkText(it)}</div>${it.lines?.length ? `<div class="dim" style="font-size:12px;margin-top:4px">${it.lines.map((l) => linkText(l)).join('<br>')}</div>` : ''}</div></div>`).join('')}</div>`).join('')}`;
}
/** An item's text with its monster's name linked (the News UI's rule). */
function linkText(it) { let t = esc(it.text || ''); if (it.mid && it.mname) { const n = esc(it.mname); const i = t.indexOf(n); if (i >= 0) t = t.slice(0, i) + careerLink(it.mid, it.mname) + t.slice(i + n.length); } return t; }

function racesTab(f) {
  if (!f.season || f.season.week <= 1 && !f.season.awardsFinal) return '<p class="dim">Races start after the first Sunday.</p>';
  const races = F.awardRaces(f, { n: 3 }); const frozen = !!f.season.awardsFinal;
  return `<p class="muted">${frozen ? `The ${yearOf(f.season.year)} awards${f.season.finished ? '' : ', frozen for the playoffs'}.` : 'Where the award races stand this week; stats from every club count.'}</p>${Object.entries(AWARDS).map(([k, aw]) => { const rows = races[k]; if (!Array.isArray(rows) || !rows.length) return ''; return `<div class="panel tight"><b>${esc(aw.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span><div class="grow"><div class="name">${k === 'coy' ? esc(r.coach || r.name) : careerLink(r.id, r.name)} <span class="dim">${esc(r.position || '')} · ${esc(r.team)}</span></div><div class="sub">${esc(r.why || '')}</div></div></div>`).join('')}</div></div>`; }).join('')}`;
}

function rivalsTab(f) {
  const rv = f.rivals?.[f.tier]; const prot = protectedMonsters(f); const sig = prot.find((p) => p.kind === 'signature');
  const h2h = rv ? headToHead(f, rv.team) : null;
  const rivalPanel = rv ? `<div class="panel" style="border-color:#a855f7"><b>⚔️ ${esc(rv.team)}</b> <span class="dim">GM ${esc(rv.gm)}</span><div class="muted" style="margin-top:4px">All-time against you: <b>${h2h.w}-${h2h.l}</b>${h2h.last ? ` · last meeting ${h2h.last.won ? 'W' : 'L'} ${esc(h2h.last.score)} (${yearOf(h2h.last.year)}, week ${h2h.last.week})` : ''}</div>
    ${sig ? `<div class="row" style="gap:10px;margin-top:8px;align-items:center">${monsterSprite(sig, 44)}<div class="grow"><div class="name">${careerLink(sig.id, sig.name)} ${badge('signature')}</div><div class="sub">${esc(sig.position)} · OVR ${sig.ovr} · ${sig.games} games · ${sig.honours} honour${sig.honours === 1 ? '' : 's'} · with the club every season</div></div></div>` : '<p class="dim">The rival\'s signature monster is on his roster once the persistent league is built.</p>'}
    <div class="grid2" style="margin-top:8px"><button class="btn small" data-action="club" data-club="${esc(rv.team)}">Their roster</button></div></div>` : '<p class="dim">No rival yet.</p>';
  const legends = prot.filter((p) => p.kind === 'legendary');
  return `${rivalPanel}<h3>Gym legendaries</h3><p class="muted">Each gym's legendary belongs to its club for the life of the franchise: same monster, same id, every season.</p><div class="list">${legends.map((p) => `<div class="item static">${monsterSprite(p, 36)}<div class="grow"><div class="name">${careerLink(p.id, p.name)} ${badge('legendary')}</div><div class="sub">${esc(p.club)}${p.gym ? ` · the ${esc(p.gym)}` : ''} · ${esc(p.position)} · OVR ${p.ovr} · ${p.games} games · ${p.honours} honour${p.honours === 1 ? '' : 's'}</div></div><button class="btn small" data-action="club" data-club="${esc(p.club)}">Club</button></div>`).join('') || '<p class="dim">No gym legendaries on record yet.</p>'}</div>`;
}

export function registerLeagueHubScreens(Router, app) {
  let scope = 'all';
  Router.registerScreen('league', {
    title: 'League Hub',
    render({ f }) {
      if (!f) return '<div class="panel"><p>No franchise is open.</p><button class="btn block" data-action="go" data-screen="menu">Main menu</button></div>';
      const tab = TABS.some(([k]) => k === get(TAB_KEY)) ? get(TAB_KEY) : 'clubs';
      const body = tab === 'clubs' ? clubsTab(f) : tab === 'leaders' ? leadersTab(f, scope === 'mine') : tab === 'moves' ? movesTab(f) : tab === 'races' ? racesTab(f) : rivalsTab(f);
      return `<div class="seg wrap" role="tablist" style="margin-bottom:8px">${TABS.map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
    },
    mount(root) {
      delegate(root, { tab: (el) => { set(TAB_KEY, el.dataset.tab); Router.render(); }, scope: (el) => { scope = el.dataset.v; Router.render(); }, club: (el) => Router.go('club', { club: el.dataset.club }), go: (el) => Router.go(el.dataset.screen) });
    },
  });
  Router.registerScreen('club', {
    title: ({ params }) => params.club || 'Club',
    render({ f, params }) {
      const club = params.club; const meta = TEAM_META[club]; if (!meta) return '<p>No such club.</p>';
      const rows = clubRosterView(f, club); const rec = f.season.records[club] || { w: 0, l: 0 }; const mine = club === f.club;
      const cap = tierById(f.tier).cap; const payroll = mine ? F.salarySummary(f).monsters : (hasLeague(f) ? clubPayroll(f, club) : null);
      const h2h = mine ? null : headToHead(f, club);
      const year = f.season.year;
      return `<div class="panel"><div class="row between"><b style="color:${meta.color}">${esc(club)}</b><span class="chip">${rec.w}-${rec.l}</span></div><div class="muted">${rows.length} monsters · team OVR ${overallOf(f)(club)}${payroll != null ? ` · payroll ${payroll.toLocaleString('en-US')} / ${cap.toLocaleString('en-US')} cr` : ''}${h2h ? ` · against you ${h2h.w}-${h2h.l}` : ''}</div></div>
        ${rows.length ? `<div class="list">${rows.map((m) => `<div class="item static ${m.injury ? 'hurt' : ''}">${monsterSprite(m, 32)}<div class="grow"><div class="name">${careerLink(m.id, m.name)} ${m.kind ? badge(m.kind) : ''}${m.rookie ? ' <span class="chip">rookie</span>' : ''}${m.injury ? ` <span class="chip" style="border-color:var(--bad)">out ${m.injury.weeks}w</span>` : ''}</div><div class="sub">${esc(m.position)} · OVR ${m.ovr} · age ${m.age} · lvl ${m.level}${m.seasonsHere != null ? ` · ${m.seasonsHere === 1 ? 'first season here' : `${m.seasonsHere} seasons here`}` : ''}${m.permanent ? ' · for life' : m.ends != null ? ` · deal to ${yearOf(m.ends)}` : ''}</div></div></div>`).join('')}</div>` : `<p class="dim">${hasLeague(f) ? 'No roster on record.' : 'A generated roster: it changes each season until the persistent league is built.'}</p>`}
        <p class="dim" style="margin-top:8px">${yearOf(year)} · tap a name for the career.</p>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
}
