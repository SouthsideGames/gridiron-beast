// Saturday media day: the owner answers the press. Each answer suits a
// temperament; monsters whose nature matches get a small boost for Sunday.

/** Temperaments group the 25 natures. */
export const TEMPERAMENTS = Object.freeze({
  fiery: { label: 'Fiery', natures: ['powerful', 'ferocious', 'aggressive', 'explosive', 'gifted', 'hardy'] },
  calm: { label: 'Calm', natures: ['disciplined', 'focused', 'cerebral', 'precise', 'calm', 'patient'] },
  loose: { label: 'Loose', natures: ['swift', 'elusive', 'technical', 'instinctive', 'slippery', 'adaptive'] },
  steady: { label: 'Steady', natures: ['sturdy', 'relentless', 'surehanded', 'protective', 'secure', 'resistant', 'balanced'] },
});
export const temperamentOf = (nature) => Object.entries(TEMPERAMENTS).find(([, t]) => t.natures.includes(nature))?.[0] || 'steady';

/** Question pool. `{opp}`, `{rival}`, `{star}`, `{record}` are filled in. Rival-only questions carry `rival: true`. */
export const QUESTIONS = [
  { q: 'How do you see Sunday against {opp}?', a: [
    { text: 'We’re the better team, and we’ll prove it.', t: 'fiery' },
    { text: 'They’re dangerous. We’ve prepared for everything.', t: 'calm' },
    { text: 'We just want to go out and have fun.', t: 'loose' } ] },
  { q: 'Your team is {record}. What’s the message in the locker room?', a: [
    { text: 'Keep stacking good days. Nothing changes.', t: 'steady' },
    { text: 'Not good enough. I want more.', t: 'fiery' },
    { text: 'Trust the plan. Results follow.', t: 'calm' } ] },
  { q: 'Is {star} the best player in this league?', a: [
    { text: 'Absolutely. Nobody can guard them.', t: 'fiery', star: true },
    { text: 'They’re great because the whole team is.', t: 'steady' },
    { text: 'Ask me again in December.', t: 'loose' } ] },
  { q: 'What did you work on in practice this week?', a: [
    { text: 'Details. Footwork, reads, assignments.', t: 'calm' },
    { text: 'Hitting. We want to be the tougher team.', t: 'fiery' },
    { text: 'Conditioning. We’ll be fresh in the fourth.', t: 'steady' } ] },
  { q: 'Fans want more trick plays. Will we see some?', a: [
    { text: 'Maybe. You never know with us.', t: 'loose' },
    { text: 'We win with execution, not tricks.', t: 'calm' },
    { text: 'We’ll do whatever it takes.', t: 'fiery' } ] },
  { q: 'How’s the injury situation?', a: [
    { text: 'Next monster up. Our depth is ready.', t: 'steady' },
    { text: 'No excuses. We play with who we have.', t: 'fiery' },
    { text: 'We’re managing it carefully.', t: 'calm' } ] },
  { q: 'Any words for {rival} and their GM?', rival: true, a: [
    { text: 'They should be worried. We’re coming.', t: 'fiery', hype: true },
    { text: 'Respect. It’s a big game for both clubs.', t: 'calm' },
    { text: 'It’s just another game on the schedule.', t: 'steady' } ] },
];

export const MEDIA_BOOST = 2; // per answer, to the matching temperament (stacks across answers, capped)
export const MEDIA_CAP = 4;
export const HYPE_BOOST = 2; // trash talk before a rival game: extra boost for the whole team... and a cost if you lose
