const { PLAYS } = await import('/home/claude/gb-impl/src/data/playbook.js'); const A = PLAYS.power_left.assignments;
A.RG = { ...A.RG, to: [0.8, -3.0], points: [[-0.6, 1.7], [-1.2, -0.6], [0.8, -3.0]] }; A.LG = { a: 'run_block', to: [3.2, -3.0], points: [[-0.6, -1.7], [3.2, -3.0]] };
