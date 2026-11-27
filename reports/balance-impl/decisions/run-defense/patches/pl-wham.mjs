const { PLAYS } = await import('/home/claude/gb-impl/src/data/playbook.js');
const A = PLAYS.power_left.assignments; const V='wham';
if (V==='wham') { A.TE = { a: 'pull', via: [-1.4, 1.2], to: [1.0, -2.6], points: [[-0.6, 3.2], [-1.4, 1.2], [1.0, -2.6]] }; A.LG = { a: 'run_block', to: [3.0, -3.2], points: [[-0.6, -1.7], [3.0, -3.2]] }; }
if (V==='hinge') { A.TE = { a: 'run_block', to: [0.6, 2.6], points: [[-0.6, 3.2], [0.6, 2.6]] }; }
console.error('patch', V, JSON.stringify(A.TE));
