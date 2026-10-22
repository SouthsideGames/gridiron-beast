// The Type Chart (GDD §32.1) and the matchup info panel (§32.4). Everything here reads the shared chart
// (src/data/type-chart.js) and football's strengths (src/sim/type-matchups.js), so what the screen says is what the
// engine does. Opens as a sheet, so it can be reached from a monster card, the More menu or a live match without
// leaving the screen.

import { CHART_TYPES, typeProfile } from '../data/type-chart.js';
import { TYPES } from '../data/monsters.js';
import { elementFx } from './ability-fx.js';
import { CLASH_VALUES } from '../clash/values.js';
import { FOOTBALL_TYPE_VALUES, CONTESTS, pct } from '../sim/type-matchups.js';
import { esc, sheet } from './dom.js';

const hue = (t) => TYPES[t]?.hue ?? 120;
/** A type chip: glyph, name, the type's colour. */
export function typeChip(t, { cls = '', action = '' } = {}) {
  const fx = elementFx(t);
  const attrs = action ? ` data-action="${action}" data-type="${esc(t)}" aria-label="${esc(t)}"` : '';
  return `<${action ? 'button' : 'span'} class="type-chip ${cls}" style="--h:${hue(t)}"${attrs}><span class="tg" aria-hidden="true">${fx.glyph}</span>${esc(t)}</${action ? 'button' : 'span'}>`;
}

const clashPct = (v) => `${Math.round(Math.abs(v - 1) * 1000) / 10}%`;
export function typeChartHtml(selected = 'Fire') {
  const sel = CHART_TYPES.includes(selected) ? selected : 'Fire';
  const p = typeProfile(sel); const V = FOOTBALL_TYPE_VALUES;
  const grid = CHART_TYPES.map((t) => typeChip(t, { cls: t === sel ? 'on' : '', action: 'tc-pick' })).join('');
  const list = (xs, cls) => xs.length ? xs.map((t) => typeChip(t, { cls, action: 'tc-pick' })).join('') : '<span class="dim">none</span>';
  const neutral = p.neutral.filter((t) => t !== sel);
  return `<div class="type-chart" data-selected="${esc(sel)}">
    <p class="dim tc-lead">Tap a type. Every type is strong against two types and weak against two; the rest are neutral.</p>
    <div class="tc-grid" role="group" aria-label="Types">${grid}</div>
    <div class="tc-profile" style="--h:${hue(sel)}">
      <div class="tc-head">${typeChip(sel)} <span class="dim">${esc(TYPES[sel]?.blurb || '')}</span></div>
      <div class="tc-row"><b class="tc-up">▲ Strong against</b><div>${list(p.strong, 'up')}</div></div>
      <div class="tc-row"><b class="tc-down">▼ Weak against</b><div>${list(p.weak, 'down')}</div></div>
      <div class="tc-row"><b class="dim">Neutral</b><div>${list(neutral, 'dim')}</div></div>
      ${sel === 'Dragon' ? `<p class="tc-note">🐉 <b>Wildcard.</b> In football Dragon also gets ${pct(V.dragonNeutral)} against the types listed as neutral (never against another Dragon). In Beast Clash those matchups stay neutral.</p>` : ''}
    </div>
    <div class="tc-how">
      <b>In football</b>
      <p>Only when two monsters meet head-on: a block, a tackle, a sack attempt, coverage on a route, a contested catch. The edge goes on that monster's side of that one contest: <b class="tc-up">${pct(V.strong)}</b> when strong, <b class="tc-down">${pct(V.weak)}</b> when weak, nothing when neutral${sel === 'Dragon' ? `, ${pct(V.dragonNeutral)} for Dragon against neutral types` : ''}. It never changes ratings or overall, and ratings still matter far more.</p>
      <b>In Beast Clash</b>
      <p>Damage ×${CLASH_VALUES.types.strong} when strong (+${clashPct(CLASH_VALUES.types.strong)}), ×${CLASH_VALUES.types.weak} when weak (−${clashPct(CLASH_VALUES.types.weak)}).</p>
    </div>
    <details class="tc-all"><summary>All matchups</summary>
      <table class="tc-table"><thead><tr><th>Type</th><th>Strong against</th><th>Weak against</th></tr></thead><tbody>
      ${CHART_TYPES.map((t) => { const q = typeProfile(t); return `<tr><td>${typeChip(t)}</td><td>${q.strong.map((x) => typeChip(x, { cls: 'up' })).join(' ')}</td><td>${q.weak.map((x) => typeChip(x, { cls: 'down' })).join(' ')}</td></tr>`; }).join('')}
      </tbody></table></details>
  </div>`;
}

/** Open the chart in a sheet; tapping a type re-draws it in place. */
export function openTypeChart(selected = 'Fire') {
  const s = sheet(`<div id="tc-host">${typeChartHtml(selected)}</div>`, { title: 'Type Chart' });
  s.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="tc-pick"]'); if (!b) return;
    e.preventDefault(); const host = s.el.querySelector('#tc-host'); host.innerHTML = typeChartHtml(b.dataset.type);
    host.querySelector('.tc-profile')?.scrollIntoView?.({ block: 'nearest' });
  });
  return s;
}

// ------------------------------------------------------------ the matchup panel (tap an on-field icon)
const POS = { WR: 'WR', TE: 'TE', RB: 'RB', OL: 'OL', QB: 'QB', DL: 'DL', LB: 'LB', CB: 'CB', S: 'S' };
/** HTML for one expected matchup, seen from `me` ('off' or 'def'). `x` comes from describeMatchup. */
export function matchupPanelHtml(x, me = 'off') {
  const mine = x[me], theirs = x[me === 'off' ? 'def' : 'off'];
  const label = mine.mod > 0 ? (mine.edge === 'wild' ? 'Dragon wildcard edge' : 'Type advantage') : 'Type disadvantage';
  const cls = mine.mod > 0 ? 'up' : 'down';
  const rows = mine.mod ? mine.contests.map((c) => `<li><span>${esc(CONTESTS[c])}</span><b class="tc-${cls}">${pct(mine.mod)}</b></li>`).join('') : '';
  const theirRows = theirs.mod ? `<p class="dim tm-their">${esc(theirs.name)}'s side: ${theirs.contests.map((c) => `${esc(CONTESTS[c])} <b class="tc-${theirs.mod > 0 ? 'up' : 'down'}">${pct(theirs.mod)}</b>`).join(' · ')}</p>` : '';
  return `<div class="tm-panel">
    <div class="tm-title">${typeChip(mine.type || '?')} <b>${POS[mine.position] || esc(mine.position)}</b> <span class="dim">vs</span> ${typeChip(theirs.type || '?')} <b>${POS[theirs.position] || esc(theirs.position)}</b></div>
    <div class="tm-names"><b>${esc(mine.name)}</b> <span class="dim">(${esc(mine.type || 'no type')} ${esc(mine.position)})</span> against <b>${esc(theirs.name)}</b> <span class="dim">(${esc(theirs.type || 'no type')} ${esc(theirs.position)})</span></div>
    ${mine.mod ? `<div class="tm-verdict ${cls}">${mine.mod > 0 ? '▲' : '▼'} ${label}</div><ul class="tm-rows">${rows}</ul>` : '<div class="tm-verdict">Neutral matchup</div>'}
    <p class="tm-reason">${esc(mine.reason)}</p>
    ${theirRows}
    <p class="dim tm-foot">These are situational modifiers, not permanent stat increases. This is the expected matchup before the snap: the edge only counts if these two actually meet. Once the play starts, every contest uses the monster really in it.</p>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn small" data-action="tm-chart" data-type="${esc(mine.type || 'Fire')}">Type Chart</button><button class="btn small primary" data-action="sheet-close">Got it</button></div>
  </div>`;
}
export function openMatchupPanel(x, me = 'off') {
  const s = sheet(matchupPanelHtml(x, me), { title: 'Matchup' });
  s.el.addEventListener('click', (e) => { const b = e.target.closest('[data-action="tm-chart"]'); if (!b) return; e.preventDefault(); s.close(); openTypeChart(b.dataset.type); });
  return s;
}
