// power_left becomes the exact mirror of power_right (formation included): tests engine left/right symmetry
const { PLAYS } = await import('/home/claude/gb-impl/src/data/playbook.js');
const M = (p) => (Array.isArray(p) ? [p[0], -p[1]] : p); const MM = (a) => a.map(M);
const src = PLAYS.power_right, dst = PLAYS.power_left;
const swap = (k) => k.replace(/^LG$/, 'RG#').replace(/^RG$/, 'LG').replace('RG#', 'RG');
for (const k of Object.keys(dst.align)) delete dst.align[k];
for (const [k, v] of Object.entries(src.align)) dst.align[swap(k)] = M(v);
for (const k of Object.keys(dst.assignments)) delete dst.assignments[k];
for (const [k, v] of Object.entries(src.assignments)) { const o = { ...v }; for (const f of ['to', 'via']) if (o[f]) o[f] = M(o[f]); for (const f of ['points', 'path']) if (o[f]) o[f] = MM(o[f]); dst.assignments[swap(k)] = o; }
console.error('mirror applied', JSON.stringify(dst.align));
