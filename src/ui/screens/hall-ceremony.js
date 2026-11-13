// Hall of Fame Day (Task 9): the offseason ceremony at which the anonymous Hall Board's sealed result is opened.
//   opening     the commissioner's remarks
//   nominees    the (at most fifteen) careers the Board reviewed, in name order: the list gives nothing away
//   board       the Board itself: fifteen figures nobody can name, voting in private
//   reveal ×n   one stage per inductee: the plaque, the vote and the career
//   class       the new plaques together, the commissioner's closing remarks, and the League News line
// A year with no nominee, or one in which nobody reached the Board's standard, has its own short ceremony.
// The screen only reads the election that was sealed when the season closed. "Finish" records that the ceremony was held
// (src/franchise/hall-ceremony.js) and saves; a replay shows the same result and records nothing new.
import { esc, delegate } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { TEAM_META } from '../../data/league.js';
import { POSITION_NAME } from '../../data/stat-guide.js';
import { AWARDS } from '../../franchise/awards.js';
import { monsterSprite, portraitSprite } from '../pixel-monster.js';
import { hallCeremony, completeHallCeremony } from '../../franchise/hall-ceremony.js';
import { t as $t } from '../../text/index.js';

const posName = (p) => POSITION_NAME?.[p] || p || '';
const clubColor = (c) => TEAM_META[c]?.color || '#b8891a';
const sprite = (m, size) => (m?.species ? monsterSprite({ id: m.id, name: m.name, species: m.species, stage: m.stage || 0 }, size) : `<span class="hh-nosprite" style="width:${size}px;height:${size}px" aria-hidden="true">?</span>`);
const num = (n) => Number(n || 0).toLocaleString('en-US');

/** The career in one line, by position, from the preserved totals. Empty when the league kept no totals. */
export function careerLine(m) {
  const c = m.career; if (!c) return '';
  switch (m.position) {
    case 'QB': return $t('history.line_qb', { yds: num(c.passYds), td: num(c.passTd), int: num(c.intThrown) });
    case 'RB': return $t('history.line_rb', { yds: num(c.rushYds), td: num((c.rushTd || 0) + (c.recTd || 0)) });
    case 'WR': case 'TE': return $t('history.line_rec', { rec: num(c.rec), yds: num(c.recYds), td: num(c.recTd) });
    case 'DL': case 'LB': return $t('history.line_front', { tackles: num(c.tackles), sacks: num(c.sacks), tfl: num(c.tfl) });
    case 'CB': case 'S': return $t('history.line_back', { tackles: num(c.tackles), int: num(c.int), pd: num(c.pd) });
    case 'K': return $t('history.line_k', { made: num(c.fgm), att: num(c.fga), long: num(c.fgLong) });
    case 'OL': return $t('history.line_ol', { starts: num(c.starts), allowed: num(c.sacksAllowed) });
    default: return '';
  }
}
/** What a career is honoured for, as short lines (only what the league recorded). */
function honours(m) {
  const out = [];
  for (const [k, n] of Object.entries(m.awardsBy || {})) out.push(['🏅', `${n > 1 ? `${n}× ` : ''}${AWARDS[k]?.label || k}`]);
  if (!Object.keys(m.awardsBy || {}).length && m.awards) out.push(['🏅', $t('history.awards_count', { n: m.awards })]);
  if (m.records) out.push(['📈', $t('history.league_records_set', { n: m.records })]);
  if (m.standing != null && m.standing >= 0.75) out.push(['⭐', $t('history.among_the_most_productive', { position: posName(m.position).toLowerCase() })]);
  if (m.titles) out.push(['🏆', $t('history.titles_count', { n: m.titles })]);
  if (m.seasons) out.push(['📅', `${$t('history.seasons_on_record', { n: m.seasons })}${m.games ? ` · ${$t('history.games_count', { n: m.games })}` : ''}`]);
  const line = careerLine(m); if (line) out.push(['📊', line]);
  const clubs = [...new Set((m.clubs || []).map((c) => c.club).filter(Boolean))]; if (clubs.length) out.push(['🏟️', clubs.join(' · ')]);
  return out;
}
const plaque = (m, year) => `<div class="hof-plaque static" style="--club:${clubColor(m.lastClub)}"><span class="hof-frame">${sprite(m, 56)}</span><b class="hof-name">${esc(m.name)}</b><span class="hof-pos">${esc(posName(m.position))}</span><span class="hof-class">${$t('history.class_of', { year: yearOf(year) })}</span><span class="hof-meta">${$t('history.votes_of', { votes: m.votes, voters: m.voters })}</span></div>`;
const speech = (label, lines) => `<div class="commissioner hofd-speech">${portraitSprite('commissioner', 56, { hue: 40 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${label}</div>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div></div>`;
const boardHtml = (seats, voted) => `<div class="hofd-board ${voted ? 'voted' : ''}" role="img" aria-label="${$t('history.the_hall_board_anonymous', { seats })}">${Array.from({ length: seats }, (_, i) => `<span class="hofd-seat" style="--i:${i}"><i class="hofd-figure"></i><i class="hofd-ballot"></i></span>`).join('')}</div>`;

/** The stages of a ceremony, in order. */
export function ceremonyStages(c) {
  const s = ['opening'];
  if (c.nominees.length) s.push('nominees', 'board');
  if (c.inductees.length) c.inductees.forEach((_, i) => s.push(`reveal:${i}`)); else s.push('none');
  s.push('class');
  return s;
}
function stageHtml(c, stage) {
  const year = yearOf(c.year); const n = c.inductees.length;
  if (stage === 'opening') return `<h2 class="hofd-h">${$t('history.the_commissioners_address')}</h2>${speech($t('hq.league_commissioner'), [$t('history.opening_remarks_1', { year }), c.membersBefore ? $t('history.opening_remarks_members', { n: c.membersBefore }) : $t('history.opening_remarks_first'), $t('history.opening_remarks_2')])}`;
  if (stage === 'nominees') return `<h2 class="hofd-h">${$t('history.the_nominees', { n: c.nominees.length })}</h2><p class="hofd-lead">${$t('history.the_board_reviewed_the_strongest', { n: c.nominees.length })}</p>
    <div class="hofd-nominees">${c.nominees.map((m, i) => `<div class="hofd-nominee" style="--i:${i}">${sprite(m, 34)}<div class="grow"><b>${esc(m.name)}</b><span>${esc(m.position || '')}${m.seasons ? ` · ${$t('history.seasons_count', { n: m.seasons })}` : ''}${m.awards ? ` · 🏅 ${m.awards}` : ''}${m.records ? ` · 📈 ${m.records}` : ''}</span></div></div>`).join('')}</div>`;
  if (stage === 'board') return `<h2 class="hofd-h">${$t('history.behind_closed_doors')}</h2>${boardHtml(c.seats, true)}<p class="hofd-lead">${$t('history.the_board_votes_in_private', { seats: c.seats })}</p><p class="hofd-lead dim">${$t('history.no_coach_and_no_owner_has')}</p><div class="hofd-envelope" aria-hidden="true">✉️</div>`;
  if (stage === 'none') return `<h2 class="hofd-h">${$t('history.the_sealed_result')}</h2><div class="hofd-none"><div class="hofd-doors" aria-hidden="true">🏛️</div><b>${c.nominees.length ? $t('history.no_nominee_reached_the_boards_standard') : $t('history.no_retired_monster_was_eligible')}</b><p class="hofd-lead">${c.nominees.length ? $t('history.the_hall_stays_as_it_is') : $t('history.a_monster_joins_the_ballot_three')}</p></div>`;
  if (stage.startsWith('reveal:')) { const i = Number(stage.split(':')[1]); const m = c.inductees[i];
    return `<div class="hofd-kicker">${$t('history.inductee_of', { i: i + 1, n })}</div>
      <div class="hofd-reveal" style="--club:${clubColor(m.lastClub)}"><div class="hofd-rays" aria-hidden="true"></div><div class="hofd-portrait">${sprite(m, 96)}</div>
        <div class="hofd-name">${esc(m.name)}</div><div class="hofd-pos">${esc(posName(m.position))}${m.lastClub ? ` · ${esc(m.lastClub)}` : ''}</div>
        <div class="hofd-classline">${$t('history.class_of', { year })}</div>
        <div class="hofd-votes" role="img" aria-label="${$t('history.votes_of', { votes: m.votes, voters: m.voters })}">${Array.from({ length: m.voters }, (_, k) => `<i class="${k < m.votes ? 'on' : ''}" style="--k:${k}"></i>`).join('')}</div><div class="hofd-votes-n">${$t('history.votes_of', { votes: m.votes, voters: m.voters })}</div></div>
      <ul class="hofd-honours">${honours(m).map(([icon, text]) => `<li><span aria-hidden="true">${icon}</span><span>${esc(text)}</span></li>`).join('')}</ul>`; }
  // the class together
  return `<h2 class="hofd-h">${n ? $t('history.the_class_of', { year }) : $t('history.hall_of_fame_day')}</h2>${n ? `<div class="hof-grid hofd-class">${c.inductees.map((m) => plaque(m, c.year)).join('')}</div>` : ''}
    ${speech($t('hq.league_commissioner'), [n ? $t('history.closing_remarks_class', { n }) : $t('history.closing_remarks_none'), $t('history.closing_remarks_2')])}
    <p class="hofd-news">🗞️ ${$t('history.the_result_is_in_league_news')}</p>`;
}

export function registerHallCeremony(Router, app) {
  Router.registerScreen('hofceremony', {
    title: $t('history.hall_of_fame_day'), tabs: false, back: false, help: false,
    render({ f, params }) {
      const c = f ? hallCeremony(f, Number(params.year ?? f.season?.year)) : null;
      if (!c) return `<div class="panel"><p>${$t('history.no_hall_of_fame_election_was')}</p><button class="btn block" data-action="hofd-leave">${$t('career.back')}</button></div>`;
      const stages = ceremonyStages(c); const step = Math.max(0, Math.min(stages.length - 1, Number(params.step || 0))); const stage = stages[step]; const last = step === stages.length - 1;
      const reduced = !!(f.settings?.reducedMotion || app.settings?.reducedMotion);
      const label = last ? (c.held ? $t('history.close') : $t('history.finish_the_ceremony')) : stage === 'board' ? $t('history.open_the_sealed_result') : $t('career.continue');
      return `<div class="hofd ${reduced ? 'reduced' : ''}" data-stage="${stage.split(':')[0]}" data-step="${step}">
        <header class="hofd-head"><div class="hofd-over">${$t('history.the_commissioner_presents')}</div><div class="hofd-title">🏛️ ${$t('history.hall_of_fame_day')}</div><div class="hofd-year">${$t('history.season_year', { year: yearOf(c.year) })}${c.held ? ` · ${$t('history.replay')}` : ''}</div>
          <div class="hofd-dots" aria-hidden="true">${stages.map((_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('')}</div></header>
        <section class="hofd-stage" aria-live="polite">${stageHtml(c, stage)}</section>
        <footer class="hofd-foot">${step > 0 ? `<button class="btn" data-action="hofd-prev" aria-label="${$t('history.previous')}">‹</button>` : `<button class="btn" data-action="hofd-leave">${c.held ? $t('career.back') : $t('history.leave')}</button>`}<button class="btn primary grow" data-action="hofd-next">${label}</button></footer></div>`;
    },
    mount(root, ctx) {
      const params = ctx.params; const leave = () => Router.go(params.from === 'hall' ? 'monsterhof' : params.from === 'offseason' ? 'offseason' : 'hq', {}, { reset: params.from !== 'hall' && params.from !== 'offseason', replace: true });
      delegate(root, {
        'hofd-leave': leave,
        'hofd-prev': () => { params.step = Math.max(0, Number(params.step || 0) - 1); Router.render(); },
        'hofd-next': () => { const c = hallCeremony(app.f, Number(params.year ?? app.f.season?.year)); if (!c) { leave(); return; }
          const stages = ceremonyStages(c); const step = Number(params.step || 0);
          if (step >= stages.length - 1) { const r = completeHallCeremony(app.f, c.year); if (r.first) app.save(); leave(); return; }   // held once, saved once; a replay changes nothing
          params.step = step + 1; Router.render(); window.scrollTo?.(0, 0); },
      });
    },
  });
}
