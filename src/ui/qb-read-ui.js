// QB read presentation (GDD §53): the read list shown with replays and in the AI Testing Lab, built ONLY from what the engine
// recorded during the play (sim.qb: the order of reads, each look with the reason he passed it over, the decision and any missed
// open receiver measured at that moment). Nothing is reconstructed after the fact; what was not recorded is not shown.
import { esc } from './dom.js';
import { REASON_TEXT } from '../sim/qb-read.js';
import { devDisplaysAllowed } from '../version.js';
import { t as $t, fieldText } from '../text/index.js';

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

const ACTION_TEXT = { throw: $t('match.throw'), scramble: $t('match.scramble'), throwaway: $t('match.throw_away') };
const WHY_TEXT = { first_read: 'first read', progression: 'progression', noticed: 'spotted open', revisit: $t('match.came_back_to_him'), hot: 'hot throw under pressure', late_best: $t('match.best_option_late_in_the_down'), human: $t('match.your_call'), escape: 'escaping pressure', lane: 'open running lane', nothing_open: 'nothing open', pressure: 'pressure arriving', no_receivers: $t('match.no_receivers') };

/** The outcome line from the play's own result. */
export function resultText(sim) {
  const y = sim.yards ?? 0; const caught = sim.stats?.receiver != null && sim.result !== 'interception';
  if (sim.result === 'interception') return $t('match.intercepted_2');
  if (sim.result === 'sack') return `${$t('match.sacked_for_yards', { y, n: Math.abs(y) })}`;
  if (sim.result === 'throwaway') return $t('match.thrown_away_incomplete');
  if (sim.result === 'incomplete') return $t('match.incomplete');
  if (sim.events?.some((e) => e.kind === 'scramble') && !caught) return `${$t('match.scramble_for_yards', { y, result: sim.result === 'touchdown' ? $t('match.touchdown') : '', n: Math.abs(y) })}`;
  if (caught) return `${$t('match.completed_for_yards', { y, result: sim.result === 'touchdown' ? $t('match.touchdown') : '', n: Math.abs(y) })}`;
  return sim.result;
}

/** Recorded read lines: [{ t, kind: 'read'|'pressure'|'decision'|'missed'|'result', text }]. `name(slot)` labels a receiver. */
export function qbReadLines(sim, name = (s) => s) {
  const q = sim?.qb; if (!q) return [];
  const out = []; let n = 0;
  for (const e of q.reads || []) {
    if (e.kind === 'read') { n++; out.push({ t: e.t, kind: 'read', slot: e.slot, text: `Read ${n}: ${name(e.slot)} — ${fieldText(e, 'why') === 'fixed' ? `${REASON_TEXT.fixed}, ` : ''}${REASON_TEXT[e.reason] || e.reason}${fieldText(e, 'why') === 'revisit' ? $t('match.second_look') : ''}` }); }
    if (e.kind === 'pressure') out.push({ t: e.t, kind: 'pressure', text: `${$t('match.pressure_closing', { name: name(e.by, 'def') })}` });
  }
  const d = q.decision;
  if (d) {
    out.push({ t: d.t, kind: 'decision', text: `${$t('match.decision', { actionText: ACTION_TEXT[d.action] || d.action })}${d.slot ? ` to ${name(d.slot)}` : ''} (${WHY_TEXT[d.reason] || d.reason})${d.action === 'throwaway' && d.legal === false ? $t('match.intentional_grounding') : ''}` });
    if (d.missed) out.push({ t: d.t, kind: 'missed', text: `${$t('match.missed_opportunity_was_open', { name: name(d.missed) })}` });
  }
  out.push({ t: sim.elapsed, kind: 'result', text: `${$t('match.result', { result: resultText(sim) })}` });
  return out;
}

/** The compact panel under the field (replays, the Lab). `upTo` (seconds) hides lines the replay has not reached yet. */
export function qbReadPanelHtml(sim, name, { upTo = Infinity, title = $t('match.qb_reads') } = {}) {
  const lines = qbReadLines(sim, name); if (!lines.length) return '';
  return `<div class="qb-reads" aria-label="${esc(title)}"><b>${esc(title)}</b><ol>${lines.map((l) => `<li class="qr-${l.kind}${l.t > upTo ? ' later' : ''}">${esc(l.text)}</li>`).join('')}</ol></div>`;
}
