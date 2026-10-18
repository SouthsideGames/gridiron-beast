// Pregame coach dialogue (GDD §15.5): two or three lines from the opposing
// head coach before the lineups, picked by relationship state, never
// branching. Gym coaches and the rival GM have full pools; ordinary clubs get
// one generic line. The player may reply (confident / respectful / nothing);
// the reply carries the same small boost media day uses.
//
// Placeholders: {club} = player's club, {me} = speaker's club, {star} = the
// player's best monster, {mine} = the speaker's legendary or star, {badge}.

/** States, checked in order; the first that applies wins. */
export const DIALOGUE_STATES = ['playoff', 'threeLosses', 'badgeHeld', 'theyWon', 'youWon', 'first'];
/** After the player takes a gym's badge: the beaten coach's handshake lines. */
export function beatenLines(club) { return GYM_LINES[club]?.beaten || ['Well played. Don’t get used to it.', 'My monsters will remember this.']; }

const SHARED = {
  playoff: ['Playoff football. Everything you did in October means nothing now.', 'One game. Bring your best six plays and nothing else.'],
  threeLosses: ['Three in a row. I am starting to feel bad for {club}.', 'Same plan as last time? Please say yes.'],
  generic: [
    'Good luck out there. {me} won’t make it easy.',
    'We watched your tape. Interesting choices.',
    'Nothing personal. We need this one as much as you do.',
    'Your {star} is the real deal. We’ll see about the rest.',
    'Let’s make it a clean game.',
  ],
};

/** Per-gym pools: lines by state, two per state. */
export const GYM_LINES = Object.freeze({
  'Harbor Sentinels': {
    first: ['Welcome to the coast. The tide here comes in slow and leaves nothing behind.', 'Play your game. Mine has been the same for twenty years.'],
    theyWon: ['You came in high and fast last time. The water doesn’t mind.', 'Patience, coach. Learn it, or lose to it again.'],
    youWon: ['You beat the tide once. Nobody beats it twice by accident.', 'I made some changes. You will notice.'],
    badgeHeld: ['You carry my badge. Carry it well; I intend to take it back today.', 'Tsunarok remembers you.'],
    beaten: ['Twenty years of the same tide, and you read it in one afternoon. Keep that badge dry.', 'Tsunarok will want this one back. So will I.'],
  },
  'Sunfire Lions': {
    first: ['Bright day for it. We throw the ball and we smile while we do it.', 'Keep up if you can. Most clubs can’t.'],
    theyWon: ['Last time you squinted at the sun all afternoon. Bring sunglasses.', 'Aurelion is faster than your corners. That hasn’t changed.'],
    youWon: ['You found a way to cloud us up. Clever. We practised in the rain all week.', 'Round two. The Lions are rested.'],
    badgeHeld: ['The Dawn Badge in your pocket. It suits you. It would suit my trophy case better.', 'Let’s light it up.'],
    beaten: ['You didn’t squint once. Fine. The Dawn Badge is yours; wear it where I can see it.', 'Nobody out-shines the Lions twice. Enjoy the day.'],
  },
  'Thunder Mesa': {
    first: ['Tempo. Tempo. Tempo. If you blink, we scored.', 'I run plays faster than your coordinator can read them.'],
    theyWon: ['You were a step slow last time. A step is all we need.', 'Voltarch had fun. He wants more.'],
    youWon: ['You slowed us down. Nobody slows us down twice.', 'New wrinkles this week. Try to keep up.'],
    badgeHeld: ['My badge. Your pocket. Temporary.', 'Storms come back around, coach.'],
    beaten: ['You kept up. Nobody keeps up. Take the badge before I change my mind.', 'Voltarch is sulking. That is the nicest thing I can say about today.'],
  },
  'Canyon Crushers': {
    first: ['We run the ball. You know that. Knowing it won’t help.', 'Four yards and a cloud of dust, sixty times.'],
    theyWon: ['Your front got pushed around last time. Did you fix it or just hope?', 'Titanolith asked if you were bringing a bigger line.'],
    youWon: ['You stacked the box. Fine. See what happens when we throw.', 'The canyon remembers every loss.'],
    badgeHeld: ['The Quake Badge. Took me a while to forgive you for that.', 'Today we take it back the hard way.'],
    beaten: ['You held the line against the canyon. That earns the Quake Badge and my respect, in that order.', 'Titanolith wants a rematch. He can wait his turn like everyone else.'],
  },
  'Eastport Phantoms': {
    first: ['You won’t see us coming. That’s rather the point.', 'Trust nothing you see before the snap.'],
    theyWon: ['Last time you kept throwing into Nyxshade. Please, go on.', 'Fooled once. Shall we try for twice?'],
    youWon: ['Hm. You read us. I have rewritten the whole book since.', 'A ghost learns from being seen.'],
    badgeHeld: ['The Dusk Badge sits with you. The dusk always returns.', 'Let’s see if you still see in the dark.'],
    beaten: ['You saw through us. Few do. The Dusk Badge is yours… for now.', 'Nyxshade will study your tape tonight. I will study it tomorrow.'],
  },
  'Frostpeak Howlers': {
    first: ['Up here we don’t make mistakes. We can’t afford the cold.', 'Discipline wins in the snow. Bring some.'],
    theyWon: ['Still running that same cover three? We ate it last time.', 'Glacivern froze your first read. He will do it again.'],
    youWon: ['You beat us at home. I have not slept well since.', 'We corrected everything. Everything.'],
    badgeHeld: ['The Frost Badge belongs on this mountain. You know that.', 'Nothing thaws up here, coach. Not even grudges.'],
    beaten: ['Clean football in the cold. I don’t hand this badge to many. Take it.', 'Glacivern froze nothing today. I will not sleep well.'],
  },
  'Ironpeak Rams': {
    first: ['We hit. That’s the whole speech.', 'Aegistron doesn’t lose a matchup. Pick a receiver to sacrifice.'],
    theyWon: ['You limped off last time. Did your trainer earn his money this week?', 'Same hammer. Same nail.'],
    youWon: ['You beat the hammer. Respect. Won’t happen twice.', 'We forged a few new things.'],
    badgeHeld: ['The Forge Badge. You earned it, and I will take it back fair.', 'Hit first today, or don’t bother.'],
    beaten: ['You hit first all day. The Forge Badge was built for coaches like that.', 'Aegistron lost a matchup. Write the date down; it will not happen again.'],
  },
  'Palmetto Vipers': {
    first: ['So you are the one they talk about. Show me.', 'Aurodrax has never been intercepted on a first read. Try.'],
    theyWon: ['Last time was a lesson. This one is a test.', 'You looked at the dragon and blinked.'],
    youWon: ['Once. You beat the dragon once. The dragon remembers.', 'I have waited all year for this game.'],
    badgeHeld: ['The Wyrm Badge was never meant to leave this stadium.', 'Hold it tight. It is coming home.'],
    beaten: ['So you are the one they talk about. Now I know why. The Wyrm Badge is yours.', 'The dragon remembers every scar. This one he will remember with respect.'],
  },
});

/** The rival GM: lines by head-to-head state. */
export const RIVAL_LINES = Object.freeze({
  first: ['Division rivals. Same rebuild, different owners. Let’s see who got it right.', 'I’ll be honest: I bet the board you would finish below us.'],
  theyWon: ['We beat you last time. Everyone in the division noticed.', 'Still running the same six plays? Good.'],
  youWon: ['You got us once. I have spent every day since thinking about it.', 'This is the one that matters.'],
  playoff: ['Rivals in the playoffs. Someone’s season ends in the family.', 'No excuses after today.'],
  threeLosses: ['Three straight. My board is asking why they still call this a rivalry.', 'I would wish you luck, but I like winning.'],
  hotSeat: ['I hear the Board is counting. So am I. Enjoy the job while it lasts.', 'Lose today and I’ll send flowers to your office. The next owner can keep them.'],
});

export const REPLIES = Object.freeze([
  { id: 'confident', label: 'We’re taking this one.', text: 'Confident: the physical natures (speed, strength, agility, arm, tackling, durability) feed off it (+1), but lose and the room is rattled next week.', effect: { natureGroup: 'physical', amount: 1, rattleOnLoss: true } },
  { id: 'respectful', label: 'Respect. It’ll be a good game.', text: 'Respectful: the thinking natures (awareness, accuracy, hands, coverage, blocking, and the neutral three) settle (+1).', effect: { natureGroup: 'mental', amount: 1 } },
  { id: 'silent', label: 'Say nothing.', text: 'No effect.', effect: null },
]);

/** Pick the state for a matchup from the head-to-head record. */
export function dialogueState({ playoff = false, h2h = null, badgeHeld = false } = {}) {
  if (playoff) return 'playoff';
  if ((h2h?.streakL || 0) >= 3) return 'threeLosses';
  if (badgeHeld) return 'badgeHeld';
  if (h2h?.last === 'l') return 'theyWon';
  if (h2h?.last === 'w') return 'youWon';
  return 'first';
}

function fill(line, vars) { return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''); }

/**
 * Lines for a matchup. `kind` is 'gym' | 'rival' | 'ordinary'. Returns
 * { speaker, title, lines[], replies: bool }.
 */
export function pregameDialogue({ kind, club, speaker, state, vars = {}, seed = 0 }) {
  const pick = (arr) => arr[Math.abs(seed) % arr.length];
  if (kind === 'gym') {
    const pool = GYM_LINES[club]; const lines = (pool && pool[state]) || SHARED[state] || pool?.first || SHARED.generic;
    return { speaker, title: `Head coach, ${club}`, lines: lines.map((l) => fill(l, vars)), replies: true, state };
  }
  if (kind === 'rival') {
    const lines = RIVAL_LINES[state] || RIVAL_LINES.first;
    return { speaker, title: `GM, ${club}`, lines: lines.map((l) => fill(l, vars)), replies: true, state };
  }
  return { speaker, title: `Head coach, ${club}`, lines: [fill(pick(SHARED.generic), vars)], replies: false, state: 'generic' };
}

/** The rival GM's weekly needle for the HQ rival card: by who is ahead in the standings and whether the game is this week. */
export const RIVAL_WEEKLY = Object.freeze({
  ahead: ['Enjoy the view from up there. It never lasts for your lot.', 'Nice start. My scouts say your secondary is held together with tape.', 'The division runs through us. It always has.'],
  behind: ['We are coming. The Board will hear about it before you do.', 'A game back is nothing. Ask anyone who has lost to us in December.', 'Your schedule gets harder. Ours gets us.'],
  level: ['Dead even. One of us is lying to their fans.', 'Same record, different futures.', 'Tiebreakers favour the club that wants it. That is us.'],
  gameWeek: ['Rivalry week. I have cleared my calendar for your excuses.', 'Sunday. Bring the real playbook this time.', 'My monsters have been talking about this one since the schedule came out.'],
});
