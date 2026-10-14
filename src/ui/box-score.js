// Halftime / final box score: per-team leaders (with monster art), team
// totals, Players of the Game and the monster-football extras (abilities,
// jukes, broken tackles, blocks shed). Pure functions over the game state.

import { esc, fmtClock } from './dom.js';
import { monsterSprite } from './pixel-monster.js';

const who = (team, slot) => team?.offense?.[slot] || team?.defense?.[slot] || team?.kicker || { name: slot };

function rows(state, side) { return Object.entries(state.stats[side].players || {}).map(([slot, p]) => ({ slot, side, ...p })); }

const OFF_SCORE = (p) => (p.passYds || 0) / 25 + (p.rushYds || 0) / 10 + (p.recYds || 0) / 10 + (p.td || 0) * 6 + (p.rec || 0) * 0.5 + (p.broken || 0) + (p.jukes || 0) * 0.5;
const DEF_SCORE = (p) => (p.tackles || 0) + (p.sacks || 0) * 4 + (p.int || 0) * 5 + (p.ff || 0) * 3 + (p.sheds || 0) * 0.5;
const OFFENSE_SLOTS = new Set(['QB', 'RB', 'WR1', 'WR2', 'WR3', 'TE', 'LG', 'C', 'RG']);

/** Best offensive and defensive performer across both teams. */
export function playersOfGame(state) {
  const all = [...rows(state, 'home'), ...rows(state, 'away')];
  const off = all.filter((p) => OFFENSE_SLOTS.has(p.slot)).sort((a, b) => OFF_SCORE(b) - OFF_SCORE(a))[0] || null;
  const def = all.filter((p) => !OFFENSE_SLOTS.has(p.slot)).sort((a, b) => DEF_SCORE(b) - DEF_SCORE(a))[0] || null;
  return { offense: off && OFF_SCORE(off) > 0 ? off : null, defense: def && DEF_SCORE(def) > 0 ? def : null };
}

function line(p) {
  const bits = [];
  if (p.att) bits.push(`${p.comp || 0}/${p.att}, ${p.passYds || 0} yds`);
  if (p.rush) bits.push(`${p.rush} car, ${p.rushYds || 0} yds`);
  if (p.rec) bits.push(`${p.rec} rec, ${p.recYds || 0} yds`);
  if (p.td) bits.push(`${p.td} TD`);
  if (p.tackles) bits.push(`${p.tackles} tkl`);
  if (p.sacks) bits.push(`${p.sacks} sack${p.sacks === 1 ? '' : 's'}`);
  if (p.int) bits.push(`${p.int} INT`);
  if (p.ff) bits.push(`${p.ff} FF`);
  if (p.broken) bits.push(`${p.broken} broken tkl`);
  if (p.abilities) bits.push(`ability ×${p.abilities}`);
  return bits.join(' · ');
}

const CATS = [
  { label: 'Passing yards', key: 'passYds', sub: (p) => `${p.comp || 0}/${p.att || 0}` },
  { label: 'Rushing yards', key: 'rushYds', sub: (p) => `${p.rush || 0} car` },
  { label: 'Receiving yards', key: 'recYds', sub: (p) => `${p.rec || 0} rec` },
  { label: 'Sacks', key: 'sacks', sub: () => '' },
  { label: 'Tackles', key: 'tackles', sub: () => '' },
  { label: 'Broken tackles', key: 'broken', sub: (p) => (p.jukes ? `${p.jukes} jukes` : '') },
  { label: 'Abilities fired', key: 'abilities', sub: () => '' },
];

function leader(state, side, key) { return rows(state, side).filter((p) => (p[key] || 0) > 0).sort((a, b) => (b[key] || 0) - (a[key] || 0))[0] || null; }

export function boxScoreHtml(state, teams, { title = 'Box score' } = {}) {
  const A = state.away, H = state.home;
  const cell = (side, cat) => {
    const p = leader(state, side, cat.key); if (!p) return `<div class="bs-cell ${side}"><span class="dim">—</span></div>`;
    const m = who(teams[side], p.slot);
    return `<div class="bs-cell ${side}">${monsterSprite(m, 30)}<div><div class="bs-v">${p[cat.key]}</div><div class="bs-n">${esc(m.name)} <span class="dim">${p.slot}</span></div>${cat.sub(p) ? `<div class="dim bs-s">${esc(cat.sub(p))}</div>` : ''}</div></div>`;
  };
  const leaders = CATS.map((c) => `<div class="bs-row">${cell('away', c)}<div class="bs-label">${c.label}</div>${cell('home', c)}</div>`).join('');
  const S = (side) => state.stats[side];
  const tot = [
    ['Total yards', (s) => s.passYards + s.rushYards], ['Passing', (s) => s.passYards], ['Rushing', (s) => s.rushYards],
    ['Completions', (s) => `${s.passComp}/${s.passAtt}`], ['First downs', (s) => s.firstDowns], ['Sacks taken', (s) => s.sacks],
    ['Turnovers', (s) => s.turnovers], ['Possession', (s) => fmtClock(Math.round(s.timeOfPossession || 0))],
  ];
  const totals = `<table class="bs-totals"><thead><tr><th style="color:${A.color}">${esc(A.abbr)}</th><th></th><th style="color:${H.color}">${esc(H.abbr)}</th></tr></thead><tbody>${tot.map(([l, fn]) => `<tr><td>${fn(S('away'))}</td><td class="dim">${l}</td><td>${fn(S('home'))}</td></tr>`).join('')}</tbody></table>`;
  const pog = playersOfGame(state);
  const pogCard = (p, label) => { if (!p) return ''; const m = who(teams[p.side], p.slot); const club = state[p.side]; return `<div class="pog">${monsterSprite(m, 44)}<div><div class="dim" style="font-size:11px;letter-spacing:.08em">${label}</div><b>${esc(m.name)}</b> <span class="dim">${p.slot} · <span style="color:${club.color}">${esc(club.abbr)}</span></span><div class="muted" style="font-size:13px">${esc(line(p))}</div></div></div>`; };
  return `<div class="box-score">
    <div class="bs-head"><span style="color:${A.color}">${esc(A.name)}</span><b class="bs-score">${state.score.away} – ${state.score.home}</b><span style="color:${H.color}">${esc(H.name)}</span></div>
    <div class="center dim" style="margin-bottom:8px">${esc(title)}</div>
    ${pog.offense || pog.defense ? `<h3>Players of the game</h3><div class="pog-wrap">${pogCard(pog.offense, 'OFFENSE')}${pogCard(pog.defense, 'DEFENSE')}</div>` : ''}
    <h3>Leaders</h3><div class="bs-leaders">${leaders}</div>
    <h3>Team stats</h3>${totals}
  </div>`;
}
