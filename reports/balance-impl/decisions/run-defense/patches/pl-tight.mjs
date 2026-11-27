const { PLAYS } = await import('/home/claude/gb-impl/src/data/playbook.js'); const A = PLAYS.power_left.assignments;
const p = [[-6.5, 0], [-3, -1.1], [1, -2.2], [6, -2.6], [20, -3]]; A.RB.path = p; A.RB.points = p;
A.RG = { ...A.RG, to: [1.2, -2.6], points: [[-0.6, 1.7], [-1.2, -0.6], [1.2, -2.6]] };
