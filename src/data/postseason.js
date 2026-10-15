// Postseason story events (GDD §15.7). A losing record makes one mandatory;
// a winning season skips them. Each is a short scene with two or three
// options. Consequences are applied by franchise.js (resolvePostseason).
//
// Placeholders: {star} {club} {rival} {coach} {role} {scheme} {fit} {total}

export const POSTSEASON_EVENTS = Object.freeze({
  star_out: {
    title: 'A star wants out',
    speaker: 'agent',
    lines: ['{star}’s agent is on the line. “A {record} season. My client didn’t sign up for a rebuild that never ends. {rival} has made an offer. What are you going to do about it?”'],
    options: [
      { id: 'raise', label: 'Raise their salary 15%', text: 'They stay. The raise counts against next season’s cap.', rookieFree: false },
      { id: 'promise', label: 'Promise a starting spot', text: 'They stay. Bench them for three games next season and they walk mid-season.' },
      { id: 'release', label: 'Let them go', text: 'They sign with your rival. You will see them on Sundays.' },
    ],
    rookie: { id: 'talk', label: 'Talk them into staying', text: 'Rookie only: a long conversation, no cost.' },
  },
  coordinator_offer: {
    title: 'A coordinator has an offer',
    speaker: 'coach',
    lines: ['{coach} knocks on your door. “{other} wants me to run their {side}. More money, a better roster. I’d rather stay, but I need a reason.”'],
    options: [
      { id: 'bonus', label: 'Pay a retention bonus', text: 'They stay. The bonus counts against next season’s cap.' },
      { id: 'leave', label: 'Let them go', text: 'They leave. The best available coordinator is hired in their place.' },
    ],
    rookie: { id: 'talk', label: 'Appeal to loyalty', text: 'Rookie only: they stay for nothing.' },
  },
  scheme_mutiny: {
    title: 'The scheme doesn’t fit the roster',
    speaker: 'coach',
    lines: ['{coach} drops a stack of tape on your desk. “I run {scheme}. {fit} of {total} starters on my side fit it. Either the roster changes, the scheme changes, or I do.”'],
    options: [
      { id: 'scheme', label: 'Change the scheme to the roster', text: 'The coordinator whose scheme best fits your starters is hired; {coach} leaves with no severance.' },
      { id: 'roster', label: 'Keep the scheme, change the roster', text: '{coach} stays. Nothing else changes; the fit is on you.' },
      { id: 'fire', label: 'Fire {coach} now', text: 'Their remaining salary counts against next season’s cap; the best available replacement is hired.' },
    ],
    rookie: { id: 'talk', label: 'Ask for patience', text: 'Rookie only: they stay, no strings.' },
  },
});

export const RAISE_PCT = 0.15;
export const RETENTION_BONUS_PCT = 0.5; // of the coordinator's salary
export const PROMISE_BENCH_LIMIT = 3;
