const { PLAYS } = await import('/home/claude/gb-impl/src/data/playbook.js');
const a = PLAYS.counter.assignments.RB; const p = [[-6.5,0],[-5.2,1.2],[-3.9,-1],[0,-2.2],[6,-2.4],[20,-2.6]];
try { a.path = p; a.points = p; } catch (e) { console.error('frozen', e.message); }
if (PLAYS.counter.assignments.RB.points[1][1] !== 1.2) console.error('PATCH NOT APPLIED');
