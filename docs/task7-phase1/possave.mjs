// Read-only: how much do saves and fresh leagues use secondary positions?
import fs from 'node:fs';
const R = '/home/claude/gridiron-beast/src';
const { migrate } = await import(R + '/franchise/save.js');
const { ensureLeague } = await import(R + '/franchise/franchise.js');
const Reg = await import(R + '/franchise/league-registry.js');
const { buildDepthChart } = await import(R + '/franchise/roster.js');
const { positionOf } = await import(R + '/data/personnel.js');
const { SPECIES_DEX } = await import(R + '/data/species.js');
const SP = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s]));
const S = await import('/home/claude/gridiron-beast/tools/franchise-soak.mjs');
function audit(label, f) {
  const out = { label, owner: {}, ai: {} };
  const one = (roster, manual, depth, o) => {
    o.monsters = (o.monsters || 0) + roster.length;
    o.posNotSpeciesPrimary = (o.posNotSpeciesPrimary || 0) + roster.filter((m) => SP[m.species] && m.position !== SP[m.species].position).length;
    o.legendaryCrossSide = (o.legendaryCrossSide || 0) + roster.filter((m) => SP[m.species]?.rarity === 'legendary' && m.position !== SP[m.species].position).length;
    const ch = buildDepthChart(roster, manual || {}, depth || null); const by = Object.fromEntries(roster.map((m) => [m.id, m]));
    const oop = Object.entries(ch).filter(([s, id]) => id && by[id] && positionOf(s) !== by[id].position);
    o.outOfPositionSlots = (o.outOfPositionSlots || 0) + oop.length; o.teams = (o.teams || 0) + 1;
    for (const [s] of oop) (o.bySlot ||= {})[positionOf(s)] = (o.bySlot[positionOf(s)] || 0) + 1;
    const manualOop = Object.entries(manual || {}).filter(([s, id]) => by[id] && positionOf(s) !== by[id].position).length; o.manualOop = (o.manualOop || 0) + manualOop;
    // would a primary-only chart leave a hole?
    const groups = {}; for (const s of Object.keys(ch)) groups[positionOf(s)] = (groups[positionOf(s)] || 0) + 1;
    for (const [g, n] of Object.entries(groups)) { const have = roster.filter((m) => m.position === g && !m.injury).length; if (have < n) { o.holesPrimaryOnly = (o.holesPrimaryOnly || 0) + (n - have); (o.holeBy ||= {})[g] = (o.holeBy[g] || 0) + (n - have); } }
  };
  one(f.roster, f.lineupManual, f.depth, out.owner);
  if (Reg.hasLeague(f)) for (const c of Reg.leagueClubs(f)) one(Reg.clubRoster(f, c), {}, null, out.ai);
  return out;
}
const res = [];
for (const file of fs.readdirSync('/home/claude/t6work/saves').filter((x) => x.endsWith('.json') && !x.includes('compat'))) {
  try { let raw = JSON.parse(fs.readFileSync('/home/claude/t6work/saves/' + file, 'utf8')); const f = migrate(raw.franchise || raw.core || raw) || raw; if (!Reg.hasLeague(f)) { try { ensureLeague(f); } catch {} } res.push(audit(file, f)); } catch (e) { res.push({ label: file, error: String(e).slice(0, 120) }); }
}
for (const seed of [Number(process.argv[2] || 1)]) { const { f } = S.runFranchise(seed, { seasons: 2 }); res.push(audit('seed' + seed + '-3seasons', f)); }
console.log(JSON.stringify(res, null, 1));
