// Read-only previews and explicit roster-review reminders. No automatic lineup edits.
import { buildDepthChart } from '../franchise/roster.js';
import { autoDepth } from '../franchise/franchise.js';
import { esc } from './dom.js';
export function bestLineupChanges(f) {
  const next = { ...f };
  autoDepth(next);
  const before = buildDepthChart(f.roster, f.lineupManual, f.depth);
  const after = buildDepthChart(next.roster, next.lineupManual, next.depth);
  const names = new Map(f.roster.map(m => [m.id, m.name]));
  return Object.keys(after).filter(slot => before[slot] !== after[slot]).map(slot => ({ slot, before: names.get(before[slot]) || 'Empty', after: names.get(after[slot]) || 'Empty' }));
}
export function bestLineupMessage(f) {
  const changes = bestLineupChanges(f);
  return changes.length ? changes.map(x => `${x.slot}: ${x.before} → ${x.after}`).join('\n') : 'Your starters will stay the same. Depth order will be sorted by overall rating.';
}
export function trackRosterReviews(f) {
  const p = (f.polish ||= {}), key = `${f.uid || f.seed}|${f.club}`;
  const snapshot = Object.fromEntries(f.roster.map(m => [m.id, !!m.injury]));
  const old = p.rosterReviewSnapshot;
  if (old?.key === key) {
    const pending = new Map((p.rosterReviews || []).map(x => [`${x.id}:${x.kind}`, x]));
    for (const m of f.roster) {
      const kind = !(m.id in old.beasts) ? 'joined' : old.beasts[m.id] && !m.injury ? 'healthy' : null;
      if (kind) pending.set(`${m.id}:${kind}`, { id: m.id, kind });
    }
    p.rosterReviews = [...pending.values()].filter(x => snapshot[x.id] !== undefined && (x.kind !== 'healthy' || !snapshot[x.id])).slice(-38);
  } else p.rosterReviews = [];
  const changed = JSON.stringify(old) !== JSON.stringify({ key, beasts: snapshot });
  p.rosterReviewSnapshot = { key, beasts: snapshot };
  return changed;
}
export function rosterReviewHtml(f) {
  const rows = (f.polish?.rosterReviews || []).map(x => ({ ...x, m: f.roster.find(m => m.id === x.id) })).filter(x => x.m && (x.kind !== 'healthy' || !x.m.injury));
  if (!rows.length) return '';
  return `<section class="panel tight" aria-label="Lineup Review"><b>Review Your Lineup</b>${rows.map(x => `<p>${esc(x.m.name)} ${x.kind === 'healthy' ? 'is healthy again.' : 'has joined your team.'}</p>`).join('')}<div class="row wrap"><button class="btn" data-polish="review-lineup">Review Lineup</button><button class="btn ghost" data-polish="dismiss-roster-review">Dismiss</button></div></section>`;
}
