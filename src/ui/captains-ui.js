// Captain Partnerships on the screens (GDD §27.4B): the chemistry meter, the "C" badge, the partnership strip on the lineup, the
// captain warning for releases and benching, the post-game rows and the Career Profile card. Plain words for younger players:
// captains, partnership, chemistry, five named levels, "+3% when both are on the field". Everything here reads; nothing writes.
import { esc } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { monsterSprite } from './pixel-monster.js';
import { careerLink } from './career-ui.js';
import * as CP from '../franchise/partnerships.js';
import { findMonster } from '../franchise/career-profile.js';

const SIDE_WORD = { offense: 'Offense', defense: 'Defense' };
export const monsterOf = (f, id) => findMonster(f, id)?.m || null;
const nameOf = (f, id) => monsterOf(f, id)?.name || 'a former captain';

/** Four pips (one per level) and a bar toward the next level. */
export function chemMeterHtml(prog, { compact = false } = {}) {
  const pips = [1, 2, 3, 4].map((l) => `<i class="${prog.level >= l ? 'on' : ''}"></i>`).join('');
  const next = prog.next == null ? 'Elite: the top level' : `${prog.toNext} more to ${CP.LEVEL_NAMES[prog.level + 1]}`;
  return `<span class="chem ${compact ? 'compact' : ''}" title="${esc(`${prog.name} · ${prog.n} plays together · ${next}`)}"><span class="chem-pips lv${prog.level}" aria-hidden="true">${pips}</span><b class="chem-name">${prog.name}</b>${compact ? '' : `<span class="chem-bar" aria-hidden="true"><i style="width:${Math.round(prog.pct * 100)}%"></i></span><span class="chem-next dim">${esc(next)}</span>`}</span>`;
}
/** "C" for a monster who is one of his club's captains this season. */
export function captainBadge(f, id, club = f?.club) { const c = CP.captaincyOf(f, club, id); return c ? `<span class="chip cap-badge" title="${esc(`${SIDE_WORD[c.side]} captain with ${nameOf(f, c.partner)}`)}" aria-label="Captain">C</span>` : ''; }
const WHY = { gone: 'is no longer on the team', injured: 'is injured', benched: 'is not in the lineup' };
/** Why a side's partnership is inactive this week, in one sentence, or null when it is active. */
export function inactiveText(f, st) {
  if (!st?.pair || !st.inactive) return null;
  const parts = [['a', st.pair.a], ['b', st.pair.b]].filter(([k]) => st.inactive[k]).map(([k, id]) => `${nameOf(f, id)} ${WHY[st.inactive[k]]}`);
  const gone = st.inactive.a === 'gone' || st.inactive.b === 'gone';
  return `${parts.join(' and ')}: no bonus${gone ? ' until he returns or new captains are chosen next offseason' : ' until both are on the field'}.`;
}
/** The partnership strip above a side's lineup. `st` = F.captainStatus(f, side). */
export function partnershipStripHtml(f, side, st) {
  if (!CP.isActive(f) || !st) return '';
  if (!st.pair) return `<div class="cap-strip none"><b>${SIDE_WORD[side]} captains</b><span class="dim">${esc(st.reason || 'No partnership this season.')}</span></div>`;
  const a = monsterOf(f, st.pair.a), b = monsterOf(f, st.pair.b); const prog = st.progress; const why = inactiveText(f, st);
  return `<button class="cap-strip ${st.active ? 'active' : 'inactive'}" data-action="go" data-screen="captains" aria-label="${esc(`${SIDE_WORD[side]} partnership, ${prog.name}, ${st.active ? 'active' : 'inactive'}`)}">
    <span class="cap-faces">${a ? monsterSprite(a, 30) : ''}${b ? monsterSprite(b, 30) : ''}</span>
    <span class="cap-main"><span class="cap-line"><b>${esc(nameOf(f, st.pair.a))} & ${esc(nameOf(f, st.pair.b))}</b> <span class="dim">${esc(CP.PAIR_TYPES[st.pair.type].label)}</span></span>
      ${chemMeterHtml(prog)}
      <span class="cap-state ${st.active ? 'on' : 'off'}">${st.active ? (prog.bonus ? `Active · +${prog.bonus}% when both are on the field` : 'Active · no bonus yet: chemistry builds as they make plays together') : esc(why)}</span></span></button>`;
}
/** The line a release (or any move that takes a captain away) warns with, or ''. */
export function captainWarning(f, id) {
  const c = CP.captaincyOf(f, f.club, id); if (!c || f.season?.finished) return '';
  return ` This monster is a team captain. Losing them will deactivate their partnership with ${nameOf(f, c.partner)} until they return or new captains are selected next offseason.`;
}
/** A subtle note when a captain drops out of the starting lineup. */
export function benchNote(f, id) { const c = CP.captaincyOf(f, f.club, id); return c ? `${nameOf(f, id)} is a captain: the partnership only works when both captains play.` : ''; }
/** The post-game partnership rows (the owner's club only). */
export function postGameHtml(f, rows, note = null) {
  if (!rows?.length) return note ? `<div class="cap-post"><div class="muted" style="font-size:12px;margin-bottom:4px">CAPTAIN PARTNERSHIPS</div><p class="dim" style="margin:0">${esc(note)}</p></div>` : '';
  return `<div class="cap-post"><div class="muted" style="font-size:12px;margin-bottom:4px">CAPTAIN PARTNERSHIPS</div>${rows.map((x) => { const prog = CP.progressOf(x.type, x.n);
    return `<div class="cap-post-row ${x.levelUp ? 'up' : ''}"><div class="row between"><b>${esc(nameOf(f, x.a))} & ${esc(nameOf(f, x.b))}</b><span class="dim">${x.earned} play${x.earned === 1 ? '' : 's'} together</span></div>${chemMeterHtml(prog)}${x.together === 0 ? `<div class="cap-off" style="font-size:13px">They never played a snap together this game${captainOut(f, x)}, so no chemistry.</div>` : x.together && !x.earned ? '<div class="dim" style="font-size:12px">On the field together, but no play this game counted for both of them.</div>' : ''}${x.levelUp ? `<div class="cap-up">🤝 New level: <b>${prog.name}</b>! +${prog.bonus}% from the next game.</div>` : ''}${x.garbage ? `<div class="dim" style="font-size:12px">${x.garbage} play${x.garbage === 1 ? '' : 's'} in garbage time did not count.</div>` : ''}${x.capped ? `<div class="dim" style="font-size:12px">Game limit reached: ${x.capped} more did not count.</div>` : ''}</div>`; }).join('')}</div>`;
}
function captainOut(f, x) { const out = [x.a, x.b].map((id) => monsterOf(f, id)).filter((m) => m && (m.injury || !f.roster.some((r) => r.id === m.id))); return out.length ? ` (${out.map((m) => `${m.name} ${f.roster.some((r) => r.id === m.id) ? 'is injured' : 'is no longer on the team'}`).join(', ')})` : ''; }
/** The Career Profile's Partnerships card: current captaincy, every partner with chemistry, best first. */
export function careerPartnershipsHtml(f, id) {
  if (!CP.isActive(f)) return '';
  const list = CP.partnershipsOf(f, id); if (!list.length) return '';
  const year = f.season?.year; let current = null;
  for (const club of Object.keys(f.partnerships.captains?.[year] || {})) { const c = CP.captaincyOf(f, club, id, year); if (c) current = { ...c, club }; }
  const rows = list.map((r) => { const seasons = new Set(r.seasons.map((s) => s.y)); const now = current && current.partner === r.partner;
    return `<div class="cap-hist ${now ? 'now' : ''}"><span class="cap-face">${monsterOf(f, r.partner) ? monsterSprite(monsterOf(f, r.partner), 28) : ''}</span><div class="grow"><div>${careerLink(r.partner, nameOf(f, r.partner))} <span class="dim">${esc(CP.PAIR_TYPES[r.type]?.label || r.type)}</span>${now ? ' <span class="chip cap-badge">C</span>' : ' <span class="chip">Not active</span>'}</div>${chemMeterHtml(r.progress, { compact: true })}<div class="dim" style="font-size:12px">${r.n} plays together · ${seasons.size} season${seasons.size === 1 ? '' : 's'} as captains (${[...seasons].sort().map((y) => yearOf(y)).join(', ')})</div></div></div>`; }).join('');
  return `<div class="cp-sec"><div class="cp-sec-h"><b>Partnerships</b><span class="dim">${current ? `${SIDE_WORD[current.side]} captain, ${yearOf(year)}` : 'Not a captain this season'}</span></div>${rows}</div>`;
}
