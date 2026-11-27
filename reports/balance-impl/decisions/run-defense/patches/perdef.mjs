// per-defence breakdown with generated clubs (same construction as playbook-situations)
const root='/home/claude/gb-impl';
const { simulatePlay } = await import(root+'/src/sim/engine.js'); const { PLAYS } = await import(root+'/src/data/playbook.js'); const { generatedTeam } = await import(root+'/src/franchise/roster.js');
if (process.argv[4]) await import(process.argv[4]);
const plays=process.argv[2].split(','), defs=process.argv[3].split(',');
const clubs = Array.from({ length: 16 }, (_, i) => [generatedTeam(51000 + i, { id: 'o', name: 'O', quality: 50 + (i * 7) % 15 }), generatedTeam(52000 + i, { id: 'd', name: 'D', quality: 50 + (i * 11) % 15 })]);
for (const pid of plays) { const line=[]; for (const dp of defs) { let n=0,y=0,neg=0; for (const [ci,[o,d]] of clubs.entries()) for (const bo of [30,50]) for (let s=0;s<4;s++) { const sim=simulatePlay({offensePlay:PLAYS[pid],defensePlay:PLAYS[dp],offense:o.offense,defense:d.defense,ballOn:bo,ballLat:0,seed:3+ci*1013+s*37+bo}); n++; y+=sim.yards||0; if((sim.yards||0)<0) neg++; } line.push(`${dp}:${(y/n).toFixed(2)}`); } console.log(pid.padEnd(12), line.join(' ')); }
