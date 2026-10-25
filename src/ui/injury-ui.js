// Injury History on the full-screen Monster Career Profile (GDD §50): four numbers at a glance (career injuries, games missed,
// durability, the injury-history indicator) and a folded, chronological injury log. A record of the past, never a forecast;
// the game's own words (severity and body part), never a diagnosis. Reads only.
import { esc } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { injurySummary, MIN_OPPORTUNITY } from '../franchise/injury-history.js';
import { findMonster } from '../franchise/career-profile.js';

const weekText = (r) => (r.po ? `Week ${r.w} · playoffs` : `Week ${r.w}`);
const what = (r) => [r.sev, r.type].filter(Boolean).join(' ').replace(/^./, (c) => c.toUpperCase()) || 'Injury';
function entry(r) {
  const how = r.src === 'game' ? (r.vs ? `In the game against the ${r.vs}` : 'In a game') : r.src === 'practice' ? 'In practice' : r.src === 'before' ? 'Already injured when tracking began' : 'Away from a game';
  const est = r.est ? ` · expected out ${r.est} week${r.est === 1 ? '' : 's'}` : '';
  const missed = `Missed ${r.missed || 0} game${r.missed === 1 ? '' : 's'}${r.mp ? ` (${r.mp} in the playoffs)` : ''}`;
  const status = r.open ? 'Out now' : r.back?.off ? 'Recovered in the offseason' : r.back ? `Recovered · back ${yearOf(r.back.y) === yearOf(r.y) ? `Week ${r.back.w}` : `${yearOf(r.back.y)} Week ${r.back.w}`}` : '';
  return `<li class="inj-row ${r.open ? 'open' : ''}"><div class="inj-when">${esc(yearOf(r.y))} · ${esc(weekText(r))}</div><div class="inj-what"><b>${esc(what(r))}</b><span class="dim">${esc(how)}${esc(est)}</span></div><div class="inj-out"><span>${esc(missed)}</span><span class="${r.open ? 'inj-now' : 'dim'}">${esc(status)}</span></div></li>`;
}
/** The section, or '' when the save has no injury record yet (it starts with the first game under v42.3). */
export function careerInjuryHtml(f, id, { firstSeason = null } = {}) {
  const s = injurySummary(f, id, { firstSeason }); if (!s) return '';
  const m = findMonster(f, id)?.m; const dur = m?.attributes?.durability;
  const facts = [['Career injuries', String(s.incidents)], ['Games missed', String(s.missed)], ['Durability', Number.isFinite(dur) ? String(Math.round(dur)) : '—']];
  const ind = `<span class="chip inj-ind ${s.indicator}" title="${esc(s.indicator === 'early' ? `Classified after ${MIN_OPPORTUNITY} scheduled games on a roster since tracking began.` : `Since tracking began: ${s.missed} of ${s.opp} scheduled games missed, ${s.incidents} injur${s.incidents === 1 ? 'y' : 'ies'}. A record of the past, not a forecast.`)}">${esc(s.label)}</span>`;
  const note = s.note ? `<p class="dim inj-note">Injury history tracking began in ${esc(yearOf(s.note.y))}${s.note.w > 1 ? `, week ${s.note.w}` : ''}. Earlier seasons are not on record.</p>` : '';
  const recs = s.records.slice().reverse(); // newest first
  const log = recs.length ? `<details class="inj-log"${s.current ? ' open' : ''}><summary>Injury log <span class="dim">(${recs.length})</span></summary><ol class="inj-list">${recs.map(entry).join('')}</ol></details>` : `<p class="inj-none">No injuries recorded since tracking began.</p>`;
  return `<div class="cp-sec inj-sec"><div class="cp-sec-h"><b>Injury History</b>${ind}</div>
    <div class="cp-facts inj-facts">${facts.map(([l, v]) => `<div><b class="mono">${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
    ${note}${log}</div>`;
}
