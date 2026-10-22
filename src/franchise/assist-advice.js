// Coach Assist advice (GDD §27.3): roster and cap warnings, Guided suggestions and routine consequence lines, all read-only.
// Nothing here changes the franchise or decides anything; the UI shows it and the player chooses.
import * as F from './franchise.js';
import { monsterOverall, salaryFor } from '../data/monsters.js';
import { hintsOn, consequencesOn, suggestionsOn } from './assist.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');

/**
 * Roster and cap problems. `critical` ones (over the cap, too few monsters to play, no legal lineup) are safety warnings and
 * show in every mode; the rest are contextual hints and follow the hints switch.
 */
export function rosterWarnings(f, { all = false } = {}) {
  if (!f?.season) return [];
  const out = []; const cap = F.salarySummary(f);
  if (cap.over) out.push({ level: 'critical', key: 'cap', text: `Over the salary cap by ${fmt(-cap.remaining)} cr. ${f.offseason ? 'The commissioner reviews the books in week 1 and picks who goes, unless you make room first.' : 'The commissioner reviews the books before your next game.'}`, screen: f.offseason ? 'offseason' : 'contracts' });
  if (f.roster.length < F.ROSTER_MIN) out.push({ level: 'critical', key: 'min', text: `Only ${f.roster.length} monsters: a club needs ${F.ROSTER_MIN} to play. ${f.offseason ? 'Sign free agents or draft to get there.' : 'Sign a monster on Tuesday.'}`, screen: f.offseason ? 'offseason' : 'recruit' });
  if (!f.offseason && !f.season.finished) { const m = F.sundayMatchup(f); if (m?.forfeit) out.push({ level: 'critical', key: 'forfeit', text: `No legal lineup for Sunday: ${m.forfeitReason || 'a position cannot be filled'}.`, screen: 'roster' }); }
  if (!all && !hintsOn(f)) return out;
  const needs = F.depthNeeds(f).filter((n) => n.status === 'short');
  if (needs.length) out.push({ level: 'warn', key: 'depth', text: `Short at ${needs.map((n) => n.position).join(', ')}: fewer healthy monsters than starting spots. Scout for ${needs.length === 1 ? 'that position' : 'those positions'}.`, screen: 'scout' });
  const hurt = f.roster.filter((m) => m.injury).length; if (hurt >= 3) out.push({ level: 'warn', key: 'hurt', text: `${hurt} monsters injured. Easier training and a bye help them recover.`, screen: 'roster' });
  if (!cap.over && cap.remaining < cap.cap * 0.03) out.push({ level: 'warn', key: 'tight', text: `Only ${fmt(cap.remaining)} cr of cap room left: a new signing may not fit.`, screen: 'contracts' });
  const pts = f.roster.filter((m) => (m.points || 0) > 0).length; if (pts && !f.settings?.autoPoints) out.push({ level: 'warn', key: 'points', text: `${pts} monster${pts === 1 ? ' has' : 's have'} attribute points to spend (tap them on the Roster).`, screen: 'roster' });
  if (f.offseason) { const n = F.offseasonPending(f).length; if (n) out.push({ level: 'warn', key: 'expiring', text: `${n} contract${n === 1 ? '' : 's'} to decide before the draft.`, screen: 'offseason' }); }
  return out;
}

/** How much a monster would add at its position: its OVR against the best healthy monster you already have there. */
export function upgradeOver(f, m) {
  const same = f.roster.filter((x) => x.position === m.position && !x.injury && x.id !== m.id).map(monsterOverall);
  return { best: same.length ? Math.max(...same) : 0, gain: monsterOverall(m) - (same.length ? Math.max(...same) : 0), count: same.length };
}

/** Guided: which Tuesday prospect to battle for, and why. Null when nothing stands out or suggestions are off. */
export function suggestProspect(f) {
  if (!suggestionsOn(f)) return null; const ps = f.week?.prospects || []; if (!ps.length) return null;
  const needs = Object.fromEntries(F.depthNeeds(f).map((n) => [n.position, n.status]));
  const scored = ps.map((p, i) => { const u = upgradeOver(f, p.monster); const need = needs[p.monster.position]; const affordable = !F.salarySummary(f, p.monster.salary || salaryFor(p.monster)).over;
    return { i, p, u, need, affordable, score: u.gain + (need === 'short' ? 12 : need === 'thin' ? 5 : 0) + (affordable ? 0 : -30) }; }).sort((a, b) => b.score - a.score);
  const top = scored[0]; if (!top || top.score < -5) return { i: null, text: 'None of these would start for you or fill a gap. Skipping the encounter costs nothing.' };
  const why = top.need === 'short' ? `you are short at ${top.p.monster.position}` : top.u.gain > 0 ? `${top.u.gain} OVR better than your best ${top.p.monster.position}` : `cover at ${top.p.monster.position}`;
  return { i: top.i, text: `Suggested: ${top.p.monster.name} (${top.p.monster.position}, ${monsterOverall(top.p.monster)} OVR): ${why}${top.affordable ? '' : ', but the salary does not fit the cap'}.` };
}

/** Guided: the draft prospect to look at first (scouted, best OVR, a needed position breaks ties). */
export function suggestDraftPick(f) {
  if (!suggestionsOn(f)) return null; const d = f.draft; if (!d?.class) return null;
  const avail = d.class.filter((m) => (d.available || d.class.map((x) => x.id)).includes(m.id) && (d.revealed?.[m.id] || 0) >= 3);
  if (!avail.length) return { id: null, text: 'Your scout has not studied anyone still on the board: the public rank is all you have.' };
  const needs = Object.fromEntries(F.depthNeeds(f).map((n) => [n.position, n.status]));
  const best = avail.map((m) => ({ m, s: monsterOverall(m) + (needs[m.position] === 'short' ? 6 : needs[m.position] === 'thin' ? 3 : 0) + (m.potential || 0) / 20 })).sort((a, b) => b.s - a.s)[0].m;
  return { id: best.id, text: `Suggested: ${best.name} (${best.position}, ${monsterOverall(best)} OVR)${needs[best.position] !== 'ok' ? `, a position where you need depth` : ', the best scouted monster left'}.` };
}

/** Guided: re-sign or let go, for one expiring monster contract. */
export function suggestContract(f, item) {
  if (!suggestionsOn(f) || item.kind !== 'monster') return null;
  const m = f.roster.find((x) => x.id === item.id); if (!m) return null;
  const peers = f.roster.filter((x) => x.position === m.position && x.id !== m.id).map(monsterOverall).sort((a, b) => b - a);
  const starter = peers.length < (F.GROUP_SLOTS[m.position]?.length || 1) || monsterOverall(m) >= (peers[(F.GROUP_SLOTS[m.position]?.length || 1) - 1] ?? 0);
  const fits = !F.salarySummary(f, item.ask - (m.salary || 0)).over;
  if (starter && fits) return { choice: 'sign', text: `Suggested: re-sign. ${m.name} is one of your starting ${m.position}s and the deal fits the cap.` };
  if (!fits) return { choice: starter ? 'counter' : 'walk', text: starter ? 'Suggested: counter. The ask does not fit the cap; a lower offer might.' : 'Suggested: let go. A backup whose ask does not fit the cap.' };
  return { choice: 'either', text: `Your call: ${m.name} is a backup ${m.position}. Re-signing keeps depth; letting go frees ${fmt(item.ask)} cr.` };
}

/** A routine consequence line, or '' when the player turned them off. */
export function consequence(f, kind, data = {}) {
  if (!consequencesOn(f)) return '';
  const cap = F.salarySummary(f, data.salary || 0);
  switch (kind) {
    case 'sign': return `Signing adds ${fmt(data.salary)} cr a season for two seasons: cap room after ${cap.over ? 'none (over the cap)' : fmt(cap.remaining) + ' cr'}, roster ${f.roster.length + 1} of ${F.ROSTER_MAX}.`;
    case 'draft': return `A rookie deal: about ${fmt(data.salary || 0)} cr a season for two seasons. A pick cannot be undone.`;
    case 'release': return 'Released monsters go back to the free-agent pool, where any club can sign them. Nothing comes back for them.';
    case 'walk': return 'Letting a contract walk frees its salary now; the monster goes to the free-agent pool.';
    case 'skip-encounter': return 'Skipping costs nothing: no battle, no signing, no penalty.';
    case 'trade': return 'Picks you trade away are gone for good. A player who arrives brings his salary at once.';
    default: return '';
  }
}
