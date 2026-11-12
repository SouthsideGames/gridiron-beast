// Captain Partnerships on the screens (GDD §27.4B): the chemistry meter, the "C" badge, the partnership strip on the lineup, the
// captain warning for releases and benching, the post-game rows and the Career Profile card. Plain words for younger players:
// captains, partnership, chemistry, five named levels, "+3% when both are on the field". Everything here reads; nothing writes.
import { esc } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { monsterSprite } from './pixel-monster.js';
import { careerLink } from './career-ui.js';
import * as CP from '../franchise/partnerships.js';
import { findMonster } from '../franchise/career-profile.js';
import { t as $t } from '../text/index.js';

const SIDE_WORD = { offense: 'Offense', defense: 'Defense' };
export const monsterOf = (f, id) => findMonster(f, id)?.m || null;
const nameOf = (f, id) => monsterOf(f, id)?.name || $t('roster.a_former_captain');

/** Four pips (one per level) and a bar toward the next level. */
export function chemMeterHtml(prog, { compact = false } = {}) {
  const pips = [1, 2, 3, 4].map((l) => `<i class="${prog.level >= l ? 'on' : ''}"></i>`).join('');
  const next = prog.next == null ? $t('roster.elite_the_top_level') : `${$t('roster.more_to', { toNext: prog.toNext, levelNames: CP.LEVEL_NAMES[prog.level + 1] })}`;
  return `<span class="chem ${compact ? 'compact' : ''}" title="${esc(`${prog.name} · ${prog.n} plays together · ${next}`)}"><span class="chem-pips lv${prog.level}" aria-hidden="true">${pips}</span><b class="chem-name">${prog.name}</b>${compact ? '' : `<span class="chem-bar" aria-hidden="true"><i style="width:${Math.round(prog.pct * 100)}%"></i></span><span class="chem-next dim">${esc(next)}</span>`}</span>`;
}
/** "C" for a monster who is one of his club's captains this season. */
export function captainBadge(f, id, club = f?.club) { const c = CP.captaincyOf(f, club, id); return c ? `<span class="chip cap-badge" title="${esc(`${SIDE_WORD[c.side]} captain with ${nameOf(f, c.partner)}`)}" aria-label="${$t('roster.captain_3')}">C</span>` : ''; }
const WHY = { gone: $t('roster.is_no_longer_on_the_team'), injured: $t('roster.is_injured'), benched: $t('roster.is_not_in_the_lineup') };
/** Why a side's partnership is inactive this week, in one sentence, or null when it is active. */
export function inactiveText(f, st) {
  if (!st?.pair || !st.inactive) return null;
  const parts = [['a', st.pair.a], ['b', st.pair.b]].filter(([k]) => st.inactive[k]).map(([k, id]) => `${nameOf(f, id)} ${WHY[st.inactive[k]]}`);
  const gone = st.inactive.a === 'gone' || st.inactive.b === 'gone';
  return `${parts.join(' and ')}${$t('roster.no_bonus', { gone: gone ? $t('roster.until_he_returns_or_new_captains') : $t('roster.until_both_are_on_the_field') })}`;
}
/** The partnership strip above a side's lineup. `st` = F.captainStatus(f, side). */
export function partnershipStripHtml(f, side, st) {
  if (!CP.isActive(f) || !st) return '';
  if (!st.pair) return `<div class="cap-strip none"><b>${SIDE_WORD[side]} captains</b><span class="dim">${esc(st.reason || $t('roster.no_partnership_this_season'))}</span></div>`;
  const a = monsterOf(f, st.pair.a), b = monsterOf(f, st.pair.b); const prog = st.progress; const why = inactiveText(f, st);
  return `<button class="cap-strip ${st.active ? 'active' : 'inactive'}" data-action="go" data-screen="captains" aria-label="${esc(`${SIDE_WORD[side]} partnership, ${prog.name}, ${st.active ? 'active' : 'inactive'}`)}">
    <span class="cap-faces">${a ? monsterSprite(a, 30) : ''}${b ? monsterSprite(b, 30) : ''}</span>
    <span class="cap-main"><span class="cap-line"><b>${esc(nameOf(f, st.pair.a))} & ${esc(nameOf(f, st.pair.b))}</b> <span class="dim">${esc(CP.PAIR_TYPES[st.pair.type].label)}</span></span>
      ${chemMeterHtml(prog)}
      <span class="cap-state ${st.active ? 'on' : 'off'}">${st.active ? (prog.bonus ? `${$t('roster.active_when_both_are_on_the', { bonus: prog.bonus })}` : $t('roster.active_no_bonus_yet_chemistry_builds')) : esc(why)}</span></span></button>`;
}
/** The line a release (or any move that takes a captain away) warns with, or ''. */
export function captainWarning(f, id) {
  const c = CP.captaincyOf(f, f.club, id); if (!c || f.season?.finished) return '';
  return ` ${$t('roster.this_monster_is_a_team_captain', { name: nameOf(f, c.partner) })}`;
}
/** A subtle note when a captain drops out of the starting lineup. */
export function benchNote(f, id) { const c = CP.captaincyOf(f, f.club, id); return c ? `${$t('roster.is_a_captain_the_partnership_only', { name: nameOf(f, id) })}` : ''; }
/** The post-game partnership rows (the owner's club only). */
export function postGameHtml(f, rows, note = null) {
  if (!rows?.length) return note ? `<div class="cap-post"><div class="muted" style="font-size:12px;margin-bottom:4px">${$t('roster.captain_partnerships')}</div><p class="dim" style="margin:0">${esc(note)}</p></div>` : '';
  return `<div class="cap-post"><div class="muted" style="font-size:12px;margin-bottom:4px">${$t('roster.captain_partnerships')}</div>${rows.map((x) => { const prog = CP.progressOf(x.type, x.n);
    return `<div class="cap-post-row ${x.levelUp ? 'up' : ''}"><div class="row between"><b>${esc(nameOf(f, x.a))} & ${esc(nameOf(f, x.b))}</b><span class="dim">${$t('roster.plays_together', { earned: x.earned, n: x.earned })}</span></div>${chemMeterHtml(prog)}${x.together === 0 ? `<div class="cap-off" style="font-size:13px">${$t('roster.they_never_played_a_snap_together', { captainOut: captainOut(f, x) })}</div>` : x.together && !x.earned ? `<div class="dim" style="font-size:12px">${$t('roster.on_the_field_together_but_no')}</div>` : ''}${x.levelUp ? `<div class="cap-up">${$t('roster.new_level_b_b_from_the', { name: prog.name, bonus: prog.bonus })}</div>` : ''}${x.garbage ? `<div class="dim" style="font-size:12px">${$t('roster.plays_in_garbage_time_did_not', { garbage: x.garbage, n: x.garbage })}</div>` : ''}${x.capped ? `<div class="dim" style="font-size:12px">${$t('roster.game_limit_reached_more_did_not', { capped: x.capped })}</div>` : ''}</div>`; }).join('')}</div>`;
}
function captainOut(f, x) { const out = [x.a, x.b].map((id) => monsterOf(f, id)).filter((m) => m && (m.injury || !f.roster.some((r) => r.id === m.id))); return out.length ? ` (${out.map((m) => `${m.name} ${f.roster.some((r) => r.id === m.id) ? $t('roster.is_injured') : $t('roster.is_no_longer_on_the_team')}`).join(', ')})` : ''; }
/** The Career Profile's Partnerships card: current captaincy, every partner with chemistry, best first. */
export function careerPartnershipsHtml(f, id) {
  if (!CP.isActive(f)) return '';
  const list = CP.partnershipsOf(f, id); if (!list.length) return '';
  const year = f.season?.year; let current = null;
  for (const club of Object.keys(f.partnerships.captains?.[year] || {})) { const c = CP.captaincyOf(f, club, id, year); if (c) current = { ...c, club }; }
  const rows = list.map((r) => { const seasons = new Set(r.seasons.map((s) => s.y)); const now = current && current.partner === r.partner;
    return `<div class="cap-hist ${now ? 'now' : ''}"><span class="cap-face">${monsterOf(f, r.partner) ? monsterSprite(monsterOf(f, r.partner), 28) : ''}</span><div class="grow"><div>${careerLink(r.partner, nameOf(f, r.partner))} <span class="dim">${esc(CP.PAIR_TYPES[r.type]?.label || r.type)}</span>${now ? ` <span class="chip cap-badge">C</span>` : ` <span class="chip">${$t('roster.not_active')}</span>`}</div>${chemMeterHtml(r.progress, { compact: true })}<div class="dim" style="font-size:12px">${$t('roster.plays_together_seasons_as_captains', { n: r.n, size: seasons.size })}${[...seasons].sort().map((y) => yearOf(y)).join(', ')})</div></div></div>`; }).join('');
  return `<div class="cp-sec"><div class="cp-sec-h">${$t('roster.b_partnerships_b')}<span class="dim">${current ? `${SIDE_WORD[current.side]} captain, ${yearOf(year)}` : $t('roster.not_a_captain_this_season')}</span></div>${rows}</div>`;
}
