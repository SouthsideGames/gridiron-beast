// Task 9: Hall of Fame ceremony presentation. Read-only and deterministic.
// The Board is anonymous; election outcomes were sealed at season close.
export function hallCeremony(f, year = f?.season?.year) {
  const election = (f?.monsterHallOfFame?.elections || []).find((e) => e?.year === year);
  if (!election) return null;
  const nominees = (election.ballot || []).slice(0, 15);
  const inductees = (election.inductees || []).slice(0, 3);
  return {
    year, board: { identity: 'undisclosed', voting: 'secret', membersNamed: false },
    commissioner: {
      opening: 'Every season, legends rise. Tonight, we honor those whose greatness has stood the test of time.',
      nominees: 'The Board has reviewed the fifteen most distinguished eligible careers. Its decision is final.',
      closing: inductees.length ? 'Their names now belong to the history of our league.' : 'Greatness is earned. The Hall awaits its next legends.',
    },
    nominees, inductees,
    stages: [
      { id: 'welcome', kind: 'commissioner' },
      { id: 'nominees', kind: 'nominees' },
      { id: 'board', kind: 'secret-ballot' },
      ...inductees.map((c, i) => ({ id: 'reveal-' + i, kind: 'inductee', monster: c })),
      { id: 'closing', kind: 'commissioner' },
    ],
  };
}
