// Franchise History (Task 9): the four history screens of a franchise and the strip that joins them.
//   history       the franchise season by season: totals, champions, accomplishments, every recorded season by decade
//   awardhistory  the league's award winners, by season or by award
//   records       the record book: single game, single season, career leaders and team records, with previous holders
//   monsterhof    the Monster Hall of Fame: inductees, every annual election and the retired candidates
// Everything is read from the save through src/franchise/task9-history.js; nothing here writes to the franchise, and where the
// save holds no record the screen says so. The owner's own Hall of Fame card (the GM Hall of Fame, screen 'hof') is separate.

import { esc, delegate, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { TEAM_META } from '../../data/league.js';
import { POSITION_NAME } from '../../data/stat-guide.js';
import { monsterSprite } from '../pixel-monster.js';
import { careerLink } from '../career-ui.js';
import { awardsHtml } from './hq.js';
import { AWARDS } from '../../franchise/awards.js';
import { RECORD_CATEGORIES } from '../../franchise/stats.js';
import { resolveRecordHolder } from '../../franchise/career-profile.js';
import { universeCareerLeaders } from '../../franchise/league-careers.js';
import { franchiseSeasonHistory, championshipHistory, historicalAwards, historicalHallOfFame, historicalRecords, franchiseTotals, monsterHallStatus, WAIT_SEASONS, MAX_INDUCTEES, VOTER_COUNT, VOTE_THRESHOLD } from '../../franchise/task9-history.js';
import { fieldText, t as $t } from '../../text/index.js';

const clubColor = (c) => TEAM_META[c]?.color || '#9fb8ad';
const abbr = (c) => TEAM_META[c]?.abbr || (c ? c.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase() : '—');
const rec = (r) => (r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '—');
const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const posName = (p) => POSITION_NAME?.[p] || p || '';
const sprite = (m, size) => (m?.species ? monsterSprite({ id: m.id, name: m.name, species: m.species, stage: m.stage || 0 }, size) : `<span class="hh-nosprite" style="width:${size}px;height:${size}px" aria-hidden="true">?</span>`);
const SCREENS = [['history', () => $t('history.nav_history'), '📜'], ['awardhistory', () => $t('history.nav_awards'), '🏅'], ['records', () => $t('history.nav_records'), '📈'], ['monsterhof', () => $t('history.nav_hall'), '🏛️']];

/** The strip that joins the four history screens. Moving along it replaces the screen, so Back leaves the history in one step. */
export const historyNavHtml = (current) => `<nav class="hh-nav" aria-label="${$t('history.sections')}">${SCREENS.map(([s, label, icon]) => `<button class="hh-nav-btn ${current === s ? 'on' : ''}" data-action="hnav" data-screen="${s}" aria-current="${current === s ? 'page' : 'false'}"><span aria-hidden="true">${icon}</span>${label()}</button>`).join('')}</nav>`;
const navActions = (Router) => ({ hnav: (el) => { if (Router.currentScreen()?.name !== el.dataset.screen) Router.go(el.dataset.screen, {}, { replace: true }); } });
const glance = (cells) => `<div class="cp-facts hh-glance">${cells.map(([v, l]) => `<div><b class="mono">${esc(v)}</b><span>${l}</span></div>`).join('')}</div>`;
const empty = (text) => `<div class="panel hh-empty"><p class="dim" style="margin:0">${text}</p></div>`;

// ---------------------------------------------------------------- Franchise History
function historyHtml(f, params) {
  const seasons = franchiseSeasonHistory(f); const tot = franchiseTotals(f); const hall = historicalHallOfFame(f); const champs = championshipHistory(f);
  const raw = new Map((f.history || []).map((h) => [h.year, h]));
  const head = `<div class="panel hh-head" style="--club:${clubColor(f.club)}"><div class="hh-club"><i></i><b>${esc(f.club)}</b></div>
      <div class="dim hh-owner">${f.owner ? `${esc(f.owner.first)} ${esc(f.owner.last)}${f.owner.hometown ? ` · ${esc(f.owner.hometown)}` : ''}` : ''}</div>
      ${glance([[tot.seasons, $t('history.seasons')], [tot.seasons ? rec(tot) : '—', $t('history.all_time_record')], [tot.titleYears.length, $t('history.titles')], [tot.playoffs, $t('history.playoff_trips')], [tot.clubAwards.length, $t('history.league_awards')], [hall.inductees.length, $t('history.hall_of_famers')]])}
      ${f.badges ? `<div class="dim hh-tiers">${$t('hq.challenger_vanguard_sovereign', { challenger: f.badges.challenger, vanguard: f.badges.vanguard, sovereign: f.badges.sovereign })}</div>` : ''}</div>`;
  if (!seasons.length) return `${head}${empty($t('hq.no_completed_seasons_yet'))}`;

  const feats = [];
  if (tot.titleYears.length) feats.push(['🏆', $t('history.beast_bowl_champions'), tot.titleYears.map((y) => yearOf(y)).join(' · ')]);
  if (tot.best) feats.push(['⭐', $t('history.best_season'), `${yearOf(tot.best.year)} · ${rec(tot.best.record)}${tot.best.place ? ` · ${$t('history.place_overall', { place: ord(tot.best.place) })}` : ''}`]);
  if (tot.playoffs) feats.push(['🎟️', $t('history.playoff_appearances'), $t('history.in_seasons', { n: tot.playoffs, total: tot.seasons })]);
  if (tot.recordsHeld.length) feats.push(['📈', $t('history.league_records_held'), tot.recordsHeld.slice(0, 4).map((r) => `${esc(r.label)} (${r.value})`).join(' · ') + (tot.recordsHeld.length > 4 ? ` +${tot.recordsHeld.length - 4}` : ''), true]);
  const awardRows = tot.clubAwards.slice().sort((a, b) => b.year - a.year);
  const accomplishments = feats.length || awardRows.length ? `<div class="panel"><div class="cp-sec-h"><b>${$t('history.accomplishments')}</b></div><ol class="cp-moments">${feats.map(([icon, title, text, safe]) => `<li><span aria-hidden="true">${icon}</span><div><b>${title}</b><span class="dim">${safe ? text : esc(text)}</span></div></li>`).join('')}
      ${awardRows.length ? `<li><span aria-hidden="true">🏅</span><div><b>${$t('history.award_winners_from_this_club')}</b><span class="hh-wrap">${awardRows.slice(0, 12).map((a) => `<span class="chip">${esc(AWARDS[a.award]?.short || a.award)} ${yearOf(a.year)} · ${a.id ? careerLink(a.id, a.name) : esc(a.name || '')}</span>`).join('')}${awardRows.length > 12 ? `<button class="chip" data-action="hnav" data-screen="awardhistory">+${awardRows.length - 12}</button>` : ''}</span></div></li>` : ''}</ol></div>` : '';

  const champions = champs.length ? `<div class="panel"><div class="cp-sec-h"><b>${$t('history.past_champions')}</b><span class="dim">${$t('history.beast_bowl')}</span></div><div class="hh-champs">${champs.slice().reverse().map((c) => `<span class="hh-champ ${c.ownerWon ? 'mine' : ''}" style="--club:${clubColor(c.champion)}" title="${esc(c.champion)}"><b class="mono">${yearOf(c.year)}</b><i></i><span>${esc(c.champion)}</span></span>`).join('')}</div></div>` : '';

  const inductedIn = (year) => hall.elections.find((e) => e.year === year)?.inductees || [];
  const row = (s) => { const h = raw.get(s.year) || {}; const mine = s.champion != null && s.champion === s.club; const lm = s.awards.mvp?.[0]; const cm = h.awards?.mvp; const ind = inductedIn(s.year);
    return `<div class="item static hh-season ${mine ? 'champ' : ''}"><div class="grow">
        <div class="name"><span class="mono">${yearOf(s.year)}</span> · <span class="mono">${rec(s.record)}</span>${s.place ? ` <span class="dim">${$t('history.place_overall', { place: ord(s.place) })}</span>` : ''} ${mine ? `<span class="chip accent">🏆 ${$t('history.champions')}</span>` : s.playoffs ? `<span class="chip">${$t('history.playoffs')}</span>` : ''}${h.legacy ? ` <span class="chip">${$t('history.imported')}</span>` : ''}</div>
        <div class="sub">${esc(s.club)}${s.champion && !mine ? ` · ${$t('history.champion_was', { champion: esc(s.champion) })}` : ''}</div>
        ${lm || cm ? `<div class="sub">${lm ? `${$t('history.league_mvp')} ${lm.id ? careerLink(lm.id, lm.name) : esc(lm.name || '')}` : ''}${lm && cm ? ' · ' : ''}${cm ? `${$t('history.club_mvp')} ${cm.id ? careerLink(cm.id, cm.name) : esc(cm.name || '')}` : ''}</div>` : ''}
        ${ind.length ? `<div class="sub">🏛️ ${$t('history.hall_class')} ${ind.map((x) => careerLink(x.id, x.name)).join(', ')}</div>` : ''}</div>
      <div class="hh-season-btns">${h.championship ? `<button class="btn small good" data-action="ceremony" data-year="${s.year}" title="${$t('hq.the_beast_bowl_ceremony_and_summary')}">${$t('hq.ceremony')}</button>` : ''}${h.awards ? `<button class="btn small" data-action="awards" data-year="${s.year}">${$t('hq.awards')}</button>` : ''}</div></div>`; };
  // ten seasons to a group, newest first: a 30-season franchise is three folds, and only the newest is open
  const newest = seasons.slice().reverse(); const groups = []; for (let i = 0; i < newest.length; i += 10) groups.push(newest.slice(i, i + 10));
  const open = params.open != null ? Number(params.open) : 0;
  const list = groups.map((g, i) => { const w = g.reduce((n, s) => n + (s.record?.w || 0), 0), l = g.reduce((n, s) => n + (s.record?.l || 0), 0); const titles = g.filter((s) => s.champion != null && s.champion === s.club).length; const from = yearOf(g[g.length - 1].year), to = yearOf(g[0].year);
    return `<details class="hh-decade" data-group="${i}" ${i === open ? 'open' : ''}><summary><b class="mono">${from === to ? from : `${from}–${to}`}</b><span class="dim">${$t('history.seasons_count', { n: g.length })} · ${w}-${l}${titles ? ` · 🏆 ${titles}` : ''}</span></summary><div class="list">${g.map(row).join('')}</div></details>`; }).join('');
  return `${head}${accomplishments}${champions}<h3 class="hh-h">${$t('history.season_by_season')}</h3>${list}`;
}

// ---------------------------------------------------------------- Awards
function awardsScreenHtml(f, params) {
  const live = f.season?.awardsFinal && !f.season.finished ? { year: f.season.awardsFinal.year ?? f.season.year, league: f.season.awardsFinal.winners || {} } : null;
  const seasons = [...(f.history || []).filter((h) => h.awards?.league).map((h) => ({ year: h.year, league: h.awards.league })), ...(live ? [{ ...live, live: true }] : [])].sort((a, b) => b.year - a.year);
  if (!seasons.length) return empty($t('hq.award_winners_are_named_when_the'));
  const mode = params.mode === 'award' ? 'award' : 'season';
  const kinds = Object.keys(AWARDS).filter((k) => seasons.some((s) => s.league[k]));
  const kind = kinds.includes(params.kind) ? params.kind : kinds[0];
  const who = (k, w) => (k === 'coy' ? esc(w.coach || w.name || '') : w.id ? careerLink(w.id, w.name) : esc(w.name || ''));
  const winner = (k, w, s, label) => `<div class="item static ${w.team === f.club ? 'mine' : ''}">${k === 'coy' ? '<span class="hh-nosprite coach" aria-hidden="true">🧢</span>' : sprite(w, 32)}<div class="grow"><div class="name">${label} · ${who(k, w)}</div><div class="sub">${esc(w.team || '')}${w.position && k !== 'coy' ? ` · ${esc(w.position)}` : ''}${w.record ? ` · ${esc(w.record)}` : ''}${fieldText(w, 'why') ? ` · ${esc(fieldText(w, 'why'))}` : ''}</div></div></div>`;
  const seg = `<div class="seg hh-seg" role="tablist"><button class="btn small ${mode === 'season' ? 'primary' : ''}" role="tab" aria-selected="${mode === 'season'}" data-action="amode" data-v="season">${$t('history.by_season')}</button><button class="btn small ${mode === 'award' ? 'primary' : ''}" role="tab" aria-selected="${mode === 'award'}" data-action="amode" data-v="award">${$t('history.by_award')}</button></div>`;
  let body;
  if (mode === 'season') {
    body = seasons.map((s, i) => `<details class="hh-decade" ${i === 0 ? 'open' : ''}><summary><b class="mono">${yearOf(s.year)}</b>${s.live ? `<span class="chip">${$t('hq.this_season_2')}</span>` : ''}<span class="dim">${s.league.mvp ? `${esc(AWARDS.mvp.short)} ${esc(s.league.mvp.name || '')}` : ''}</span></summary><div class="list">${Object.entries(AWARDS).map(([k, a]) => (s.league[k] ? winner(k, s.league[k], s, esc(a.short)) : '')).join('')}</div></details>`).join('');
  } else {
    const rows = seasons.filter((s) => s.league[kind]); const a = AWARDS[kind];
    // the monsters named most often for this award, from the recorded winners only
    const tally = new Map(); if (kind !== 'coy') for (const s of rows) { const w = s.league[kind]; if (w.id == null) continue; const x = tally.get(w.id) || { id: w.id, name: w.name, n: 0 }; x.n++; tally.set(w.id, x); }
    const multi = [...tally.values()].filter((x) => x.n > 1).sort((x, y) => y.n - x.n).slice(0, 3);
    body = `<div class="hh-kinds" role="tablist">${kinds.map((k) => `<button class="cp-tab ${k === kind ? 'on' : ''}" role="tab" aria-selected="${k === kind}" data-action="akind" data-v="${k}">${esc(AWARDS[k].short)}</button>`).join('')}</div>
      <div class="panel tight"><b>${esc(a.label)}</b><div class="dim">${$t('history.winners_on_record', { n: rows.length })}${multi.length ? ` · ${$t('history.most_often')} ${multi.map((x) => `${careerLink(x.id, x.name)} ×${x.n}`).join(', ')}` : ''}</div></div>
      <div class="list">${rows.map((s) => winner(kind, s.league[kind], s, `<span class="mono">${yearOf(s.year)}</span>${s.live ? ` <span class="chip">${$t('hq.this_season_2')}</span>` : ''}`)).join('')}</div>`;
  }
  return `${seg}${body}`;
}

// ---------------------------------------------------------------- Records
function recordsHtml(f, params) {
  const tab = ['game', 'season', 'career', 'team'].includes(params.tab) ? params.tab : 'game';
  const tabs = [['game', $t('hq.single_game')], ['season', $t('hq.season_3')], ['career', $t('hq.your_careers')], ['team', $t('hq.team')]];
  const model = Object.fromEntries(historicalRecords(f).map((s) => [s.scope, s.rows]));
  const holder = (r, cat) => { const id = r.name ? (r.id || resolveRecordHolder(f, r, { scope: tab === 'season' ? 'season' : 'game', cat }).id) : null; return id ? careerLink(id, r.name) : esc(r.name || r.team || ''); };
  const prevLine = (p) => (p ? `<div class="sub hh-prev">${$t('history.previous_record')} <b class="mono">${p.value}</b> · ${p.name ? (p.id ? careerLink(p.id, p.name) : esc(p.name)) : esc(p.team || '')}${p.name && p.team ? ` (${esc(p.team)})` : ''}${p.year != null ? ` · ${yearOf(p.year)}` : ''}</div>` : '');
  const row = (label, r, sub, cat = null) => `<div class="item static hh-record ${r?.team === f.club ? 'mine' : ''}">${r?.species ? monsterSprite(r, 30) : ''}<div class="grow"><div class="name">${esc(label)}</div><div class="sub">${r ? `<b>${holder(r, cat)}</b>${r.position ? ` (${esc(r.position)})` : ''} · ${sub(r)}` : $t('hq.no_record_yet')}</div>${prevLine(r?.previous)}</div><span class="chip accent hh-value">${r ? r.value : '·'}</span></div>`;
  const playoff = (r) => (r.playoff ? ` ${$t('history.in_the_playoffs')}` : '');
  let body = ''; let held = null;
  if (tab === 'game') { body = model.game.map((x) => row(x.label, x.record, (r) => `${$t('history.game_line', { team: esc(r.team), opp: esc(r.opp), year: yearOf(r.year), week: r.week })}${playoff(r)}`, x.category)).join(''); held = model.game; }
  else if (tab === 'season') { body = model.season.map((x) => row(x.label, x.record, (r) => `${esc(r.team)} · ${yearOf(r.year)}`, x.category)).join('') + `<p class="dim">${$t('hq.season_records_are_written_when_a')}</p>`; held = model.season; }
  else if (tab === 'career') { const L = universeCareerLeaders(f, { n: 1 }); body = RECORD_CATEGORIES.map((c) => { const r = L[c.id]?.[0]; return row(c.label, r ? { ...r, team: r.club || '' } : null, (x) => `${$t('hq.regular_season_games', { club: x.club ? esc(x.club) : x.where === 'legend' ? 'retired' : 'free agent', games: x.games })}`, c.id); }).join('') + `<p class="dim">${$t('hq.career_totals_across_every_monster_the')}</p>`; }
  else { body = model.team.map((x) => row(x.label, x.record, (r) => `${$t('history.team_game_line', { score: esc(r.score || ''), opp: esc(r.opp), year: yearOf(r.year), week: r.week })}${playoff(r)}`)).join(''); held = model.team; }
  const set = held ? held.filter((x) => x.record) : []; const mine = set.filter((x) => x.record.team === f.club).length;
  const summary = held ? `<div class="dim hh-recsum">${set.length ? $t('history.records_set_and_held', { set: set.length, total: held.length, mine, club: esc(f.club) }) : $t('history.no_records_have_been_set_yet')}</div>` : '';
  return `<div class="seg hh-seg" role="tablist">${tabs.map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-action="rtab" data-v="${k}">${l}</button>`).join('')}</div>${summary}<div class="list">${body}</div>`;
}

// ---------------------------------------------------------------- Monster Hall of Fame
const honourChips = (h) => (h ? [[h.titles, '🏆', (n) => $t('history.titles_count', { n })], [h.awards, '🏅', (n) => $t('history.awards_count', { n })], [h.records, '📈', (n) => $t('history.records_count', { n })]].filter(([n]) => n > 0).map(([n, icon, l]) => `<span class="chip honours">${icon} ${l(n)}</span>`).join('') : '');
const voteBar = (b) => `<div class="hof-vote" role="img" aria-label="${$t('history.votes_of', { votes: b.votes, voters: b.voters })}"><div class="hof-vote-track"><i style="width:${Math.round((b.votes / b.voters) * 100)}%"></i><u style="left:${VOTE_THRESHOLD * 100}%"></u></div><span class="mono">${b.votes}/${b.voters}</span></div>`;
function hallHtml(f, params, reduced) {
  const hall = historicalHallOfFame(f); const view = ['inductees', 'elections', 'candidates'].includes(params.view) ? params.view : 'inductees';
  const stub = (id) => f.league?.legends?.[id] || null; const cand = new Map(hall.candidates.map((c) => [String(c.id), c]));
  const lastYear = hall.elections.length ? hall.elections[hall.elections.length - 1].year : null;
  const classes = hall.elections.filter((e) => e.inductees.length).length;
  const hero = `<div class="panel hof-hero ${reduced ? '' : 'anim'}"><div class="hof-crest" aria-hidden="true">🏛️</div><div class="hof-title">${$t('history.monster_hall_of_fame')}</div>
      <div class="hof-sub">${$t('history.the_leagues_greatest_retired_monsters')}</div>
      ${glance([[hall.inductees.length, $t('history.inductees')], [classes, $t('history.classes')], [hall.elections.length, $t('history.elections')]])}
      <p class="dim hof-rule">${$t('history.hall_rule', { wait: WAIT_SEASONS, voters: VOTER_COUNT, pct: Math.round(VOTE_THRESHOLD * 100), max: MAX_INDUCTEES })}</p></div>`;
  const seg = `<div class="seg hh-seg" role="tablist">${[['inductees', $t('history.inductees')], ['elections', $t('history.elections')], ['candidates', $t('history.candidates')]].map(([k, l]) => `<button class="btn small ${view === k ? 'primary' : ''}" role="tab" aria-selected="${view === k}" data-action="hview" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body;
  if (view === 'inductees') {
    const newest = hall.inductees.slice().sort((a, b) => b.inductedYear - a.inductedYear || b.votes - a.votes);
    body = newest.length ? `<div class="hof-grid">${newest.map((x) => { const s = stub(x.id); const c = cand.get(String(x.id)); const isNew = x.inductedYear === lastYear;
      return `<button class="hof-plaque ${isNew ? 'new' : ''}" data-career="${esc(x.id)}" style="--club:${clubColor(s?.lastClub)}" aria-label="${esc(x.name)}: ${$t('history.class_of', { year: yearOf(x.inductedYear) })}">
          ${isNew ? `<span class="hof-new">${$t('history.newest_class')}</span>` : ''}<span class="hof-frame">${sprite(s ? { ...s, name: x.name } : null, 56)}</span>
          <b class="hof-name">${esc(x.name)}</b><span class="hof-pos">${esc(posName(x.position))}${s?.lastClub ? ` · ${esc(abbr(s.lastClub))}` : ''}</span>
          <span class="hof-class">${$t('history.class_of', { year: yearOf(x.inductedYear) })}</span>
          <span class="hof-meta">${Number.isInteger(x.retiredYear) ? $t('history.retired_in', { year: yearOf(x.retiredYear) }) : $t('history.retirement_year_not_recorded')} · ${$t('history.votes_of', { votes: x.votes, voters: x.voters })}</span>
          <span class="hof-hon">${honourChips(c?.honours) || `<span class="dim">${$t('history.career_summary_not_kept')}</span>`}</span></button>`; }).join('')}</div>`
      : empty(hall.elections.length ? $t('history.no_monster_has_been_inducted_yet') : $t('history.the_first_election_is_held_when'));
  } else if (view === 'elections') {
    // one election open at a time, and its ballot shortened to the inductees and the leading votes: a long franchise has
    // hundreds of ballot lines, and the screen stays a few thumb-lengths long
    const els = hall.elections.slice().reverse(); const withBallot = els.filter((e) => e.ballot.length);
    const cur = withBallot.find((e) => e.year === Number(params.year)) || withBallot[0] || null; const all = params.all === '1' || params.all === 1;
    const ballotHtml = (e) => { const ids = new Set(e.inductees.map((x) => String(x.id))); const TOP = 8;
      const ordered = [...e.ballot.filter((b) => ids.has(String(b.id))), ...e.ballot.filter((b) => !ids.has(String(b.id)))];
      const shown = all ? ordered : ordered.slice(0, Math.max(TOP, e.inductees.length));
      return `<div class="list hof-ballots">${shown.map((b) => { const s = stub(b.id); const inn = ids.has(String(b.id));
        return `<div class="item static hof-ballot ${inn ? 'in' : ''}">${sprite(s ? { ...s, name: b.name } : null, 30)}<div class="grow"><div class="name">${careerLink(b.id, b.name)} ${inn ? `<span class="chip accent">🏛️ ${$t('history.inducted')}</span>` : b.qualified ? `<span class="chip">${$t('history.qualified_class_full')}</span>` : ''}</div><div class="sub">${esc(posName(b.position))}${Number.isInteger(b.retiredYear) ? ` · ${$t('history.retired_in', { year: yearOf(b.retiredYear) })}` : ''}</div>${voteBar(b)}</div></div>`; }).join('')}</div>
        ${ordered.length > shown.length ? `<button class="btn block hh-more" data-action="hall-all" data-v="1">${$t('history.show_the_whole_ballot', { n: ordered.length })}</button>` : all && ordered.length > TOP ? `<button class="btn block hh-more" data-action="hall-all" data-v="0">${$t('history.show_the_leading_votes')}</button>` : ''}`; };
    body = els.length ? `<div class="list hof-elections">${els.map((e) => { const on = cur && e.year === cur.year;
      if (!e.ballot.length) return `<div class="hof-quiet"><b class="mono">${yearOf(e.year)}</b><span class="dim">${$t('history.no_eligible_candidates')}</span></div>`;
      return `<div class="hof-election ${on ? 'on' : ''}"><button class="hof-election-h" data-action="hall-year" data-year="${e.year}" aria-expanded="${on}"><b class="mono">${yearOf(e.year)}</b><span class="dim">${$t('history.on_the_ballot', { n: e.ballot.length })} · ${e.inductees.length ? $t('history.inducted_count', { n: e.inductees.length }) : $t('history.nobody_inducted')}</span>${e.inductees.length ? `<span class="hof-election-names">🏛️ ${e.inductees.map((x) => esc(x.name)).join(', ')}</span>` : ''}</button>${on ? ballotHtml(e) : ''}</div>`; }).join('')}</div>`
      : empty($t('history.the_first_election_is_held_when'));
  } else {
    const inducted = new Map(hall.inductees.map((x) => [String(x.id), x])); const LIMIT = 30; const all = params.all === '1' || params.all === 1;
    const sorted = hall.candidates.slice().sort((a, b) => (b.retiredYear ?? 0) - (a.retiredYear ?? 0) || String(a.name).localeCompare(String(b.name)));
    const rows = all ? sorted : sorted.slice(0, LIMIT);
    body = sorted.length ? `<p class="dim hh-recsum">${$t('history.candidates_are_retired_monsters_whose_career')}</p><div class="list">${rows.map((c) => { const s = stub(c.id); const st = monsterHallStatus(f, c.id); const inn = inducted.get(String(c.id));
      const status = inn ? `<span class="chip accent">🏛️ ${$t('history.class_of', { year: yearOf(inn.inductedYear) })}</span>` : st.lastBallot ? `<span class="chip">${$t('history.last_vote', { votes: st.lastBallot.votes, voters: st.lastBallot.voters, year: yearOf(st.lastBallot.year) })}</span>` : `<span class="chip">${$t('history.first_ballot', { year: yearOf(st.eligibleYear) })}</span>`;
      return `<div class="item static ${inn ? 'hof-ballot in' : ''}">${sprite(s ? { ...s, name: c.name } : null, 30)}<div class="grow"><div class="name">${careerLink(c.id, c.name)}</div><div class="sub">${esc(posName(c.position))} · ${$t('history.retired_in', { year: yearOf(c.retiredYear) })}${c.seasons ? ` · ${$t('history.seasons_on_record', { n: c.seasons })}` : ''}${c.games ? ` · ${$t('history.games_count', { n: c.games })}` : ''}</div><div class="hh-wrap" style="margin-top:4px">${status}${honourChips(c.honours)}</div></div></div>`; }).join('')}</div>
      ${sorted.length > rows.length ? `<button class="btn block hh-more" data-action="hall-all" data-v="1">${$t('history.show_all_candidates', { n: sorted.length })}</button>` : all && sorted.length > LIMIT ? `<button class="btn block hh-more" data-action="hall-all" data-v="0">${$t('history.show_the_most_recent')}</button>` : ''}`
      : empty($t('history.no_retired_monster_has_a_preserved'));
  }
  return `${hero}${seg}${body}<p class="dim cp-foot">${$t('history.the_owners_hall_of_fame_card_is')}</p>`;
}

export function registerHistoryScreens(Router, app) {
  const nav = navActions(Router); const reduced = () => !!(app.settings?.reducedMotion || app.f?.settings?.reducedMotion);
  const wrap = (name, html) => `<div class="history-hub hh-${name}">${historyNavHtml(name)}${html}</div>`;
  const noFranchise = () => `<div class="panel"><p>${$t('career.no_franchise_is_open')}</p></div>`;
  Router.registerScreen('history', {
    title: $t('hq.franchise_history'),
    render: ({ f, params }) => (f ? wrap('history', historyHtml(f, params)) : noFranchise()),
    mount(root, ctx) { const params = ctx.params; delegate(root, { ...nav,
      ceremony: (el) => Router.go('ceremony', { year: Number(el.dataset.year) }),
      awards: (el) => { const h = app.f.history.find((x) => x.year === Number(el.dataset.year)); if (h?.awards) sheet(awardsHtml(h.awards), { title: `${$t('hq.awards_2', { year: yearOf(h.year) })}` }); } });
      for (const d of root.querySelectorAll('details.hh-decade')) d.addEventListener('toggle', () => { if (d.open) params.open = Number(d.dataset.group); }); // Back from a profile returns to the same fold
    },
  });
  Router.registerScreen('awardhistory', {
    title: $t('hq.award_history_2'),
    render: ({ f, params }) => (f ? wrap('awardhistory', awardsScreenHtml(f, params)) : noFranchise()),
    mount(root, ctx) { const params = ctx.params; delegate(root, { ...nav, amode: (el) => { params.mode = el.dataset.v; Router.render(); }, akind: (el) => { params.kind = el.dataset.v; Router.render(); } }); },
  });
  Router.registerScreen('records', {
    title: $t('hq.records_book_2'),
    render: ({ f, params }) => (f ? wrap('records', recordsHtml(f, params)) : noFranchise()),
    mount(root, ctx) { const params = ctx.params; delegate(root, { ...nav, rtab: (el) => { params.tab = el.dataset.v; Router.render(); } }); },
  });
  Router.registerScreen('monsterhof', {
    title: $t('history.monster_hall_of_fame'),
    render: ({ f, params }) => (f ? wrap('monsterhof', hallHtml(f, params, reduced())) : noFranchise()),
    mount(root, ctx) { const params = ctx.params; delegate(root, { ...nav, hview: (el) => { params.view = el.dataset.v; delete params.all; Router.render(); }, 'hall-year': (el) => { params.year = Number(el.dataset.year); delete params.all; Router.render(); }, 'hall-all': (el) => { params.all = el.dataset.v; Router.render(); } }); },
  });
}
