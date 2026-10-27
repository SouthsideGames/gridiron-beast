// QB read presentation (GDD §53): the read list shown with replays and in the AI Testing Lab, built ONLY from what the engine
// recorded during the play (sim.qb: the order of reads, each look with the reason he passed it over, the decision and any missed
// open receiver measured at that moment). Nothing is reconstructed after the fact; what was not recorded is not shown.
import { esc } from './dom.js';
import { REASON_TEXT } from '../sim/qb-read.js';
import { devDisplaysAllowed } from '../version.js';

/**
 * QB reads in the game itself (replay read list and ring, practice field, the live read ring) are a DEVELOPMENT display
 * (v42.11.1, owner decision): shown while the game is in development and the Developer Tools switch is on (default on), never
 * in the released game (BUILD.release). The AI Testing Lab is a developer tool and always shows them. `live` is the separate
 * live-play read ring, off unless switched on.
 */
export function qbReadsShown(settings, { live = false } = {}) {
  if (!devDisplaysAllowed()) return false;
  return live ? !!settings?.qbReads : settings?.devQbReads !== false;
}

const ACTION_TEXT = { throw: 'Throw', scramble: 'Scramble', throwaway: 'Throw-away' };
const WHY_TEXT = { first_read: 'first read', progression: 'progression', noticed: 'spotted open', revisit: 'came back to him', hot: 'hot throw under pressure', late_best: 'best option late in the down', human: 'your call', escape: 'escaping pressure', lane: 'open running lane', nothing_open: 'nothing open', pressure: 'pressure arriving', no_receivers: 'no receivers' };

/** The outcome line from the play's own result. */
export function resultText(sim) {
  const y = sim.yards ?? 0; const caught = sim.stats?.receiver != null && sim.result !== 'interception';
  if (sim.result === 'interception') return 'Intercepted';
  if (sim.result === 'sack') return `Sacked for ${y} yard${Math.abs(y) === 1 ? '' : 's'}`;
  if (sim.result === 'throwaway') return 'Thrown away (incomplete)';
  if (sim.result === 'incomplete') return 'Incomplete';
  if (sim.events?.some((e) => e.kind === 'scramble') && !caught) return `Scramble for ${y} yard${Math.abs(y) === 1 ? '' : 's'}${sim.result === 'touchdown' ? ', touchdown' : ''}`;
  if (caught) return `Completed for ${y} yard${Math.abs(y) === 1 ? '' : 's'}${sim.result === 'touchdown' ? ', touchdown' : ''}`;
  return sim.result;
}

/** Recorded read lines: [{ t, kind: 'read'|'pressure'|'decision'|'missed'|'result', text }]. `name(slot)` labels a receiver. */
export function qbReadLines(sim, name = (s) => s) {
  const q = sim?.qb; if (!q) return [];
  const out = []; let n = 0;
  for (const e of q.reads || []) {
    if (e.kind === 'read') { n++; out.push({ t: e.t, kind: 'read', slot: e.slot, text: `Read ${n}: ${name(e.slot)} — ${e.why === 'fixed' ? `${REASON_TEXT.fixed}, ` : ''}${REASON_TEXT[e.reason] || e.reason}${e.why === 'revisit' ? ' (second look)' : ''}` }); }
    if (e.kind === 'pressure') out.push({ t: e.t, kind: 'pressure', text: `Pressure: ${name(e.by, 'def')} closing` });
  }
  const d = q.decision;
  if (d) {
    out.push({ t: d.t, kind: 'decision', text: `Decision: ${ACTION_TEXT[d.action] || d.action}${d.slot ? ` to ${name(d.slot)}` : ''} (${WHY_TEXT[d.reason] || d.reason})${d.action === 'throwaway' && d.legal === false ? ' — intentional grounding' : ''}` });
    if (d.missed) out.push({ t: d.t, kind: 'missed', text: `Missed opportunity: ${name(d.missed)} was open` });
  }
  out.push({ t: sim.elapsed, kind: 'result', text: `Result: ${resultText(sim)}` });
  return out;
}

/** The compact panel under the field (replays, the Lab). `upTo` (seconds) hides lines the replay has not reached yet. */
export function qbReadPanelHtml(sim, name, { upTo = Infinity, title = 'QB reads' } = {}) {
  const lines = qbReadLines(sim, name); if (!lines.length) return '';
  return `<div class="qb-reads" aria-label="${esc(title)}"><b>${esc(title)}</b><ol>${lines.map((l) => `<li class="qr-${l.kind}${l.t > upTo ? ' later' : ''}">${esc(l.text)}</li>`).join('')}</ol></div>`;
}
