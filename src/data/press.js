// Saturday Media Day, comedy overhaul (owner 2026-11-11; GDD §20.1). Data only: three recurring reporters, the question library
// (every question has four answers: Professional, Trash Talk, Comedy, Unhinged), and THE BEAST TIMES headlines.
//
// Rules this file follows:
//   - A question with `when` is asked only while that situation is TRUE in the saved franchise, and its tokens are filled from
//     the saved data (src/franchise/press.js builds the facts). Nothing here invents a statistic, injury, trade or result.
//   - A question without `when` is generic. Generic jokes are framed as rumours, hypotheticals or the reporter's own nonsense,
//     never as something that happened to this club.
//   - Gameplay effects are the two that already existed and nothing else: `hype` (the Trash Talk answer to a rival-week question:
//     the approved risky rivalry boost) and `star` (answers that talk up the club's star: the approved spotlight).
//   - `insult`, `predict` and `quote` are narrative only (a reporter remembers, a prediction is revisited, a quote resurfaces).
//
// Tokens: {club} {coach} {opp} {rival} {rivalGm} {star} {record} {n} {name} {pos} {type} {yds} {ints} {tds} {weeks} {from}
//         {lastOpp} {us} {them} {margin} {titles} {quote} {reporter}

export const STYLES = Object.freeze(['pro', 'trash', 'comedy', 'unhinged']);
export const STYLE_LABEL = Object.freeze({ pro: 'Professional', trash: 'Trash Talk', comedy: 'Comedy', unhinged: 'Unhinged' });
export const STYLE_ICON = Object.freeze({ pro: '🎙️', trash: '🔥', comedy: '😏', unhinged: '🌀' });
export const STYLE_BLURB = Object.freeze({ pro: 'Calm and diplomatic', trash: 'Confident and provocative', comedy: 'Sarcastic and clever', unhinged: 'Completely absurd' });

/** The three recurring reporters. `portrait` is a coach-creator spec (src/ui/coach-portrait.js), so they are drawn by the game's own renderer. */
export const REPORTERS = Object.freeze({
  instigator: { id: 'instigator', name: 'Dirk Stirwell', outlet: 'The Daily Snap', role: 'The Instigator', tagline: 'Lives for drama. Has never once let a quote go.',
    portrait: 'coach2|1|2|1|2|1|slick|0|mustache|blazer|350|none|shades|none|1' },
  analyst: { id: 'analyst', name: 'Dr. Prudence Ledger', outlet: 'Gridiron Quarterly', role: 'The Serious Analyst', tagline: 'Treats every monster incident as a matter of record.',
    portrait: 'coach2|4|1|2|1|0|bun|5|none|blazer|215|none|round|none|0' },
  rookie: { id: 'rookie', name: 'Toby Fumbleton', outlet: 'Beast Beat Junior', role: 'The Clueless Rookie', tagline: 'First season on the beat. Still finding the stadium.',
    portrait: 'coach2|0|0|0|0|2|shortcurls|3|none|hoodie|95|cap_back|none|none|0' },
});

const Q = (id, reporter, when, q, pro, trash, comedy, unhinged, flags = {}) => Object.freeze({ id, reporter, when, q, a: Object.freeze({ pro, trash, comedy, unhinged }), ...flags });

export const PRESS_QUESTIONS = Object.freeze([
  // ============================================================ GENERIC: The Instigator
  Q('g_i_01', 'instigator', null, 'Coach, somebody in the {opp} building says your club is "a bye week with uniforms". Care to respond?',
    'I don’t respond to anonymous quotes. We’ll play the game Sunday.', 'Tell "somebody" to say it on the fifty-yard line. We’ll be there at kickoff.', 'A bye week with uniforms still shows up better dressed than their defense.', 'I AM the bye week. I am rest. I am inevitable. Next question.', { predict: ['trash'] }),
  Q('g_i_02', 'instigator', null, 'Is it true you and the {opp} coach don’t shake hands, or did I make that up to get a quote?',
    'We have a professional relationship and I respect their staff.', 'I’ll shake their hand after the game. It’ll be the only thing they catch all day.', 'You made it up. But it’s a good rumor, so I’m keeping it.', 'We don’t shake hands. We headbutt. It’s in the bylaws.', { insult: ['comedy'] }),
  Q('g_i_03', 'instigator', null, 'Scale of one to ten, how overrated are the {opp}?',
    'They’re a good club. I’m not putting a number on anybody.', 'Ten. And I’m rounding down.', 'I’d say a strong seven, which is also how many yards I expect them to gain.', 'Numbers are a prison. I rate them "purple".', { predict: ['trash', 'comedy'] }),
  Q('g_i_04', 'instigator', null, 'Which club in this league would you least like to have dinner with?',
    'I’d sit down with any of them. It’s a league of good people.', 'The {opp}. They’d fumble the bread basket.', 'Any club with a Dragon type. I’ve seen what they do to a buffet.', 'I only dine alone, in the end zone, at midnight.'),
  Q('g_i_05', 'instigator', null, 'Give me one word for the {opp}. Just one. Make it a headline.',
    '"Prepared." They’re always prepared.', '"Lunch."', '"Sunday." As in, that’s when we find out.', '"Moist."'),
  Q('g_i_06', 'instigator', null, 'If you and the {opp} coach raced forty yards, who wins and how badly?',
    'I’d rather settle things with the teams on the field.', 'Me. They’d pull a hamstring reading the starting line.', 'Neither. We’d both be carted off by the fifteen.', 'I would simply become the wind.'),
  Q('g_i_07', 'instigator', null, 'Be honest: is there a coach in this league you just can’t stand?',
    'No. Competing hard isn’t the same as disliking someone.', 'There’s a list. The {opp} just moved up it.', 'Yes. Me, during the fourth quarter.', 'The one who lives in my mirror. He knows what he did.'),
  Q('g_i_08', 'instigator', null, 'Guarantee a win on Sunday. Go on. Do it. Right into this microphone.',
    'I guarantee effort and preparation. The scoreboard takes care of itself.', 'Guaranteed. Write it in pen. Write it on the {opp} bus.', 'I guarantee somebody wins. I’m very confident in that.', 'I guarantee the sun will rise and it will be afraid of us.', { predict: ['trash'] }),
  Q('g_i_09', 'instigator', null, 'Your fans are calling the {opp} mascot "a rug with opinions". Do you condone that?',
    'We ask our fans to keep it respectful to everyone.', 'I condone it. I may have started it.', 'I’d never say that. Rugs have a purpose.', 'The rug and I have spoken. We have an understanding.'),
  Q('g_i_10', 'instigator', null, 'Who’s the most dangerous monster in this league that ISN’T on your roster? Careful, they’re listening.',
    'There’s talent on every club. I won’t single anyone out.', 'Nobody. If they were that dangerous they’d play for us.', 'The vending machine at our facility. It’s taken more money than free agency.', 'The moon. Nobody game-plans for the moon.'),

  Q('g_i_11', 'instigator', null, 'Is {star} the best monster in this league, or just the best one you could afford?',
    'He’s as good as anyone, and he makes everyone around him better.', 'Best in the league. Ask anyone who’s had to tackle him.', 'Both. Mostly the second. Please don’t tell him.', '{star} is not a monster. {star} is a season.', { star: ['pro', 'trash'] }),

  // ============================================================ GENERIC: The Serious Analyst
  Q('g_a_01', 'analyst', null, 'Coach, a league study suggests Fire types are responsible for most sideline heater malfunctions. Does your club have a protocol?',
    'We follow every league safety guideline.', 'Our protocol is scoring so much that nobody’s cold.', 'Yes. We stand slightly further away and hope.', 'The heaters work for us now. They’ve chosen a side.'),
  Q('g_a_02', 'analyst', null, 'From a schematic standpoint, how do you account for an opponent who can, hypothetically, fly?',
    'Leverage and discipline. Fundamentals don’t change.', 'Let them fly. The ball still has to come down, and we’ll be under it.', 'We’ve asked the league to enforce gravity more consistently.', 'We have a net. A very big net. I’ve said too much.'),
  Q('g_a_03', 'analyst', null, 'Hydration is critical. In general terms, how does a staff manage a Water type who IS the hydration?',
    'Our trainers have individual plans for everyone.', 'We don’t manage it. We aim it at the other sideline.', 'Carefully, and with a mop.', 'He is not hydrated. We are all hydrated THROUGH him.'),
  Q('g_a_04', 'analyst', null, 'Analytics say going for it on fourth down is correct far more often than coaches do it. Why the hesitation across the league?',
    'Every situation is different. We weigh field position, the clock and the matchup.', 'Other coaches are scared. I’m not other coaches.', 'Because analytics has never been yelled at by an owner.', 'I go for it on first down. It confuses everyone, including us.'),
  Q('g_a_05', 'analyst', null, 'What is the single most important measurable when you evaluate a monster? Please be specific.',
    'Awareness. A monster who knows where to be makes everyone better.', 'Whether the other club is afraid of him.', 'Whether he fits through the locker room door.', 'Wingspan divided by vibes.'),
  Q('g_a_06', 'analyst', null, 'There is a theory that Ice types perform worse in warm stadiums. Does the data in your building support it?',
    'We prepare our monsters to play anywhere.', 'Our Ice types make the stadium cold. That’s the data.', 'The only data I have is a puddle where a linebacker used to be.', 'Temperature is a rumor started by thermometers.'),
  Q('g_a_07', 'analyst', null, 'Clock management: walk me through your decision tree with ninety seconds and two timeouts.',
    'We’ve rehearsed it. Sideline first, then the middle, save one for the kick.', 'My decision tree is: we’re already winning.', 'It’s less of a tree and more of a nervous shrub.', 'I throw the clock into the crowd. No clock, no problem.'),
  Q('g_a_08', 'analyst', null, 'Is roster chemistry quantifiable, in your professional opinion?',
    'Not fully, but you can see it on tape when two monsters trust each other.', 'Sure. Count the points we score. That’s the chemistry.', 'Yes. Ours is currently "two of them share snacks".', 'I measured it once. The instrument burst into song.'),
  Q('g_a_09', 'analyst', null, 'Rule question: if a Psychic type knows the play call before the snap, should that be a penalty?',
    'That’s for the league office. We play by the rules as written.', 'If they know the call and still can’t stop it, that’s their problem.', 'Only if he tells the other team. Then it’s just rude.', 'I’ve started calling plays I haven’t thought of yet. Checkmate.'),
  Q('g_a_10', 'analyst', null, 'Looking at the {opp}: what is the key matchup on Sunday, in purely technical terms?',
    'The line of scrimmage. Win there and everything else follows.', 'Our best against their best. I like ours. A lot.', 'Me against my own play sheet. It’s laminated and I still lose it.', 'My left hand against my right. Only one calls plays.', { predict: ['trash'] }),

  Q('g_a_11', 'analyst', null, 'Which single trait of {star}’s translates most directly into wins for this club?',
    'His preparation. He’s the same every day, and the others follow it.', 'The one where he’s better than whoever the {opp} put across from him.', 'His ability to make my play calls look intentional.', 'His aura. We had it measured. The device is still humming.', { star: ['pro', 'trash', 'comedy'] }),

  // ============================================================ GENERIC: The Clueless Rookie
  Q('g_r_01', 'rookie', null, 'Coach, if you score more points than the {opp}, does that improve your chances of winning?',
    'It does. That’s the plan every week.', 'It guarantees it. Tell the {opp} I said so.', 'Significantly. We ran the numbers twice.', 'Points are a state of mind. But yes.'),
  Q('g_r_02', 'rookie', null, 'How many quarters are you planning to play on Sunday?',
    'All four, and we’ll be ready for overtime.', 'Four. The {opp} usually stop after two.', 'We’re aiming for four. Five felt greedy.', 'As many as it takes. I have brought extra quarters.'),
  Q('g_r_03', 'rookie', null, 'Is the football the same one you used last week, or do you get a new one?',
    'The league supplies new game balls each week.', 'We wear ours out. Too many touchdowns.', 'Same one. We’re very attached to it. His name is Gerald.', 'There has only ever been one football. Think about it.'),
  Q('g_r_04', 'rookie', null, 'Which is more important, offense or defense? My editor said to ask.',
    'Both. You need all three phases to win.', 'Whichever one is on the field when the {opp} are crying.', 'Parking. Have you seen our lot on game day?', 'Neither. The answer is weather.'),
  Q('g_r_05', 'rookie', null, 'Do the monsters know the rules, or do you just tell them where to run?',
    'They know the rules. They study as hard as any athlete.', 'They know one rule: don’t let the other team have nice things.', 'About sixty percent of them. It’s a strong sixty.', 'I don’t tell them anything. They tell me. I’m a hostage.'),
  Q('g_r_06', 'rookie', null, 'What’s your favorite play? Is it the one where you get the points?',
    'Any play that’s executed the way we practiced it.', 'The one where the {opp} coach throws his headset.', 'Kneeling at the end. It means we got away with it.', 'The one where everybody runs left and I run home.'),
  Q('g_r_07', 'rookie', null, 'When you say "we need to execute", who is being executed? Is everyone okay?',
    'It just means doing your job on each play. Everyone’s fine.', 'The other team’s hopes. Not okay. Thanks for asking.', 'Mostly my patience.', 'Nobody is okay. Welcome to football.'),
  Q('g_r_08', 'rookie', null, 'Why is it called a "down" if the goal is to go up the field?',
    'It’s an old term for a play. Good question, actually.', 'Because that’s where the {opp} end up.', 'Marketing. "Ups" tested badly.', 'Up and down are the same direction if you’re brave enough.'),
  Q('g_r_09', 'rookie', null, 'I wrote down "win the turnover battle". Is that a different game you play at halftime?',
    'It means taking the ball away more than you give it up.', 'It’s the game where we take their ball and keep it.', 'Yes. It’s held in the parking lot. Bring pastries.', 'It is an ancient duel. I can say no more.'),
  Q('g_r_10', 'rookie', null, 'Sorry, I got lost on the way in. Which one of you is the coach?',
    'That’s me. Take your time, you’re doing fine.', 'I’m the one the {opp} have nightmares about.', 'I’m the one who looks tired. Narrow it down from there.', 'There is no coach. There is only the whistle.', { insult: ['comedy'] }),

  Q('g_r_11', 'rookie', null, 'Is {star} your best one? He’s the only one I recognize.',
    'He’s our leader, and he’s earned it. But it takes all of them.', 'He’s the best one. The {opp} will recognize him too, from behind.', 'He’s the best one. The others know. We don’t discuss it.', 'They are all {star}. Look closer.', { star: ['pro', 'trash', 'comedy'] }),

  // ============================================================ SITUATIONAL (real saved data only)
  // ---- winning streak (n straight wins)
  Q('s_streakW_1', 'instigator', 'streakW', '{n} straight wins. Has the rest of the league just given up, or are you that good?',
    'We’re playing well, but every week starts at zero.', 'Both. Mostly the second one.', 'I’d say we’re good. The league says we’re "under review".', 'We are no longer a team. We are a weather system.'),
  Q('s_streakW_2', 'analyst', 'streakW', 'At {n} consecutive wins, regression to the mean is a concern. How do you guard against it?',
    'Same preparation, same standards. Streaks don’t change the work.', 'We are the mean now. Everyone else can regress to us.', 'I guard against it by not knowing what it means.', 'The mean came to my office. I ate it.'),
  Q('s_streakW_3', 'rookie', 'streakW', 'You’ve won {n} in a row! Do you get a prize, or do you have to keep going?',
    'No prize yet. We keep going until the season’s over.', 'The prize is everybody else’s tears.', 'We get a coupon. One free loss. Trying not to use it.', 'The prize is more football. It’s a curse, really.'),
  // ---- losing streak (n straight losses)
  Q('s_streakL_1', 'instigator', 'streakL', '{n} straight losses. Who’s to blame? I need a name and I need it spelled correctly.',
    'It starts with me. We’ll fix it together.', 'Blame the schedule. And the refs. And whoever’s holding that microphone.', 'It’s spelled "C-O-A-C-H". Capital everything.', 'Blame is a river. I am but a duck upon it.', { insult: ['trash'] }),
  Q('s_streakL_2', 'analyst', 'streakL', 'After {n} consecutive losses, at what point does rebuilding become an archaeological excavation?',
    'We’re not rebuilding. We’re correcting, one week at a time.', 'Keep digging. You’ll find the win we’re about to bury the {opp} under.', 'We’ve found some pottery and a very old playbook.', 'We dug so deep we found a second, worse team.', { predict: ['trash'] }),
  Q('s_streakL_3', 'rookie', 'streakL', 'You’ve lost {n} in a row. Have you tried winning instead?',
    'That’s the goal. We’re working on it every day.', 'We’re saving it for the {opp}. Surprise.', 'We tried it once. Didn’t care for the attention.', 'Winning is just losing in a nicer hat.', { predict: ['trash'] }),
  // ---- rival week
  Q('s_rival_1', 'instigator', 'rival', 'It’s {rival} week. {rivalGm} says your defense couldn’t stop a shopping cart. Is that accurate?',
    'It’s a big game for both clubs. We’ll let our play answer.', 'Tell {rivalGm} the cart’s coming Sunday, and it’s full of touchdowns.', 'Depends on the cart. Is it one with the wobbly wheel?', 'We stopped a shopping cart once. It never recovered. Neither did we.', { hype: true, predict: ['trash'] }),
  Q('s_rival_2', 'instigator', 'rival', 'Any message for {rivalGm} and {rival} before Sunday? I’ll deliver it personally. Loudly.',
    'Respect. We’re looking forward to a good game.', 'They should be worried. We’re coming, and we’re bringing snacks for after.', 'Tell them we said hi. Then run.', 'Tell {rivalGm} the owl knows. That’s all. He’ll understand.', { hype: true }),
  Q('s_rival_3', 'analyst', 'rival', 'Historically, rivalry games are decided by emotional regulation. How regulated is your club ahead of {rival}?',
    'We’re focused. It’s a big game, and we’re treating it like the next one.', 'Completely unregulated. That’s {rival}’s problem.', 'We did breathing exercises. A linebacker hyperventilated.', 'I have regulated nothing since the preseason.', { hype: true }),
  Q('s_rival_4', 'rookie', 'rival', 'Why don’t you and {rival} like each other? Did they take your parking spot?',
    'It’s a rivalry. Two good clubs that want the same thing.', 'They took our spot, our lunch and soon an L.', 'It was the parking spot. It’s always the parking spot.', 'It began long ago, over a sandwich. The sandwich is still out there.', { hype: true }),
  // ---- playoff race / playoffs
  Q('s_race_1', 'analyst', 'playoffRace', 'At {record}, you are mathematically in the playoff race. What is your internal projection?',
    'We don’t project. We prepare for the {opp} and count at the end.', 'Our projection is everybody else staying home.', 'My internal projection is mostly indigestion.', 'I asked the numbers. The numbers asked for a lawyer.'),
  Q('s_race_2', 'rookie', 'playoffRace', 'You’re {record}. Is that good? People keep saying "the race" and I don’t see anyone running.',
    'It keeps us in contention. Every game matters from here.', 'It’s good enough to ruin somebody’s December.', 'We’re running. It’s just very slow and there’s a lot of standing around.', 'The race is inside us. Mine has a cramp.'),
  Q('s_playoffs_1', 'instigator', 'playoffs', 'It’s the playoffs. Lose and you’re done. Who on the {opp} are you sending home personally?',
    'Nobody personally. We respect how hard it is to get here.', 'All of them. I’ve booked the bus.', 'Their kicker. He looks like he has plans anyway.', 'I will send them home one at a time, by catapult.', { predict: ['trash'] }),
  Q('s_playoffs_2', 'rookie', 'playoffs', 'Is a playoff game longer than a normal game, or does it just feel like it?',
    'Same length. The stakes are what make it feel different.', 'For the {opp} it’ll feel like forever.', 'It’s the same, but everyone forgets how to breathe.', 'Time stops in the playoffs. I’ve been here since last year.'),
  // ---- defending champions
  Q('s_champ_1', 'instigator', 'champion', 'You’re the defending Beast Bowl champions. Everyone wants your head. Whose head do YOU want?',
    'Nobody’s. Last season is over. We’re earning it again.', 'I’ve got the trophy. They can have the envy.', 'I just want my own head back. The parade was a lot.', 'I collect helmets now. Don’t ask what’s in them.'),
  Q('s_champ_2', 'rookie', 'champion', 'You won the Beast Bowl! Do you have to give the trophy back if you lose on Sunday?',
    'No, it’s ours to keep. But we want another one.', 'No. And the {opp} aren’t getting near it.', 'No, but they do make you dust it.', 'The trophy and I are legally married.'),
  // ---- the quarterback threw {ints} interceptions last game
  Q('s_qbInts_1', 'instigator', 'qbInts', '{name} threw {ints} interceptions against {lastOpp}. Has your quarterback considered throwing to his own team?',
    'He knows he has to be better. We’ve looked at every one of them on tape.', 'He was being generous. That ends Sunday.', 'We’ve color-coded the jerseys for him. Fingers crossed.', 'He wasn’t throwing interceptions. He was making friends.'),
  Q('s_qbInts_2', 'analyst', 'qbInts', '{ints} interceptions for {name} last week. Is this a decision-making issue or a mechanical one?',
    'A bit of both. We’ve addressed it and I expect a cleaner game.', 'It’s a "their defense got lucky" issue.', 'It’s mechanical. The mechanism is his arm, and it’s pointing the wrong way.', 'It is a spiritual issue. The ball has lost faith in him.'),
  Q('s_qbInts_3', 'rookie', 'qbInts', 'When {name} threw it to the other team {ints} times, was that part of a trick play?',
    'No. Those were mistakes, and he owns them.', 'Yes. The trick is we win anyway.', 'A very long trick. We’re still waiting for the reveal.', 'The trick is on all of us.'),
  // ---- the quarterback threw {tds} touchdown passes last game
  Q('s_qbHot_1', 'analyst', 'qbHot', '{name} threw {tds} touchdown passes against {lastOpp}. Is that sustainable, statistically?',
    'He’s seeing it well. We’ll keep giving him clean looks.', 'Sustainable? He’s just warming up.', 'No. I’ve asked him to pace himself so I look less replaceable.', 'He has seen the future, and it is in the end zone.', { star: ['pro', 'trash'] }),
  // ---- a monster ran for {yds} yards last game
  Q('s_rush_1', 'analyst', 'rushBig', '{name} ran for {yds} yards against {lastOpp}. Is your running back legally classified as a natural disaster?',
    'He ran hard and the line gave him lanes. Credit all of them.', 'The paperwork’s pending. The {opp} should evacuate.', 'Not yet, but the insurance people have called twice.', 'He is classified as "inevitable". The league agreed quickly.', { star: ['pro', 'trash'] }),
  Q('s_rush_2', 'rookie', 'rushBig', '{name} got {yds} yards last week. Is that a lot? How many yards are there?',
    'It’s an excellent day for a back. He earned every one.', 'It’s more than the {opp} will get as a team.', 'There are a hundred. He used most of them, some twice.', 'There are infinite yards. He has merely begun.', { star: ['pro'] }),
  // ---- a monster had {yds} receiving yards last game
  Q('s_recv_1', 'instigator', 'recvBig', '{name} torched {lastOpp} for {yds} receiving yards. Should the {opp} secondary just stay on the bus?',
    'He had a great day. The {opp} will have a plan for him, and we’ll need answers.', 'They can stay on the bus. He’ll catch passes over that too.', 'They should at least keep the engine running.', 'There is no bus. There is only {name}.', { star: ['pro', 'trash', 'unhinged'] }),
  // ---- a defender dominated last game
  Q('s_def_1', 'analyst', 'defBig', '{name} was everywhere against {lastOpp}. How do you quantify that kind of defensive performance?',
    'Effort and film study. He’s earned everything he’s getting.', 'You count the quarterbacks who ask to go home.', 'We count the number of times the other coach says "who is that?"', 'You cannot quantify a thunderstorm. You can only apologize to it.', { star: ['pro', 'trash'] }),
  // ---- a starter is injured
  Q('s_injury_1', 'analyst', 'injury', '{name} is out for {weeks}. What is the adjustment at {pos}, structurally?',
    'Next monster up. We adjust the plan around who we have.', 'The adjustment is we’re still better than the {opp}.', 'Structurally, we’re holding it together with tape and optimism.', 'I have replaced him with a very convincing shrub.'),
  Q('s_injury_2', 'rookie', 'injury', 'With {name} hurt, do you play with one fewer monster, or are you allowed a spare?',
    'We have depth for exactly this. Somebody steps in.', 'We could play with one fewer and still beat the {opp}.', 'We’re allowed a spare. He’s been in the trunk all season.', 'We all become {name} now. It’s a team-building thing.'),
  // ---- a monster evolved
  Q('s_evo_1', 'analyst', 'evolved', '{name} has evolved and appears considerably larger. Has the league approved this?',
    'It’s a natural part of his development. Everything’s by the book.', 'The league can approve it from underneath him.', 'We filed the form. Under "reason" we wrote "look at him".', 'The league did not approve. {name} did not ask.', { star: ['pro'] }),
  Q('s_evo_2', 'rookie', 'evolved', '{name} looks different. Did he get a haircut, or is that the evolving thing?',
    'That’s the evolution. He’s worked a long time for it.', 'That’s the evolving thing. The {opp} get to meet it first.', 'Both. The barber is still recovering.', 'He has shed his former self. We keep it in a jar.', { star: ['pro'] }),
  // ---- a legendary on the roster
  Q('s_legend_1', 'instigator', 'legendary', 'You have {name}, an actual legendary, on the roster. Isn’t that basically cheating?',
    'He’s on our roster by the rules, and he works as hard as anyone.', 'It’s not cheating. It’s shopping.', 'It’s only cheating if we win. So, yes, eventually.', 'He was here before the rules. The rules live in his shadow.'),
  Q('s_legend_2', 'rookie', 'legendary', 'Is {name} really a legendary? Does he know? Should someone tell him?',
    'He knows. He handles it with a lot of humility.', 'He knows. So will the {opp}, by the second quarter.', 'We told him. He asked for a bigger locker.', 'He has always known. He told ME.'),
  // ---- a trade brought {name} in
  Q('s_trade_1', 'instigator', 'trade', 'You traded for {name}. Who did you fleece, and do they know yet?',
    'It was a fair deal for both clubs. We’re glad to have him.', 'They’ll know on Sunday. And every Sunday after.', 'They know. They sent a thank-you card. It was sarcastic.', 'I traded a dream I had for him. Best dream I ever sold.'),
  Q('s_trade_2', 'analyst', 'trade', 'The acquisition of {name}: what need does that trade address in the depth chart?',
    'He gives us quality at {pos} and competition in that room.', 'It addresses our need to embarrass people at {pos}.', 'It addresses my need to feel something in the trade window.', 'He fills the hole. The hole in all of us.'),
  // ---- a free agent signed
  Q('s_sign_1', 'analyst', 'signing', 'You signed {name}. Walk me through the valuation model that produced that contract.',
    'He fits what we do and the number worked under the cap.', 'The model is simple: he’s good and now the {opp} don’t have him.', 'I wrote a number, he nodded, we both pretended it was planned.', 'The model is a goat that points at things.'),
  Q('s_sign_2', 'rookie', 'signing', 'You got a new monster, {name}! Did you pick him, or did he come with the building?',
    'We picked him. Our scouts liked him a lot.', 'We picked him. The {opp} wanted him. Too slow.', 'He was in the lobby. Nobody asked questions.', 'He chose us. We do not know why. We are afraid to ask.'),
  // ---- the hot seat
  Q('s_hot_1', 'instigator', 'hotseat', 'Word is the board’s patience is gone. How warm is that seat, Coach? Describe it for the readers.',
    'I’m focused on Sunday. The rest isn’t mine to control.', 'Warm enough to cook the {opp} on.', 'Medium-rare. I’ve asked for a cushion.', 'I no longer sit. I hover. It’s safer.'),
  Q('s_hot_2', 'rookie', 'hotseat', 'People keep saying you’re "on the hot seat". Can’t you just ask for a different chair?',
    'It’s a figure of speech. It means I need to win.', 'I’ll get a new chair after we beat the {opp}. A throne.', 'I asked. The new chair was also on fire.', 'All chairs are hot if you sit with enough guilt.'),
  // ---- an upset win last game
  Q('s_upset_1', 'instigator', 'upsetWin', 'Nobody picked you to beat {lastOpp}, and you won {us}-{them}. Who do you want an apology from first?',
    'Nobody. We just want to stack another good week.', 'Everyone. Alphabetical order. Starting with you.', 'My own family. They had {lastOpp} in the office pool.', 'I want an apology from the concept of doubt.', { insult: ['trash'] }),
  // ---- a heavy defeat last game
  Q('s_blowL_1', 'instigator', 'blowoutLoss', '{lastOpp} beat you {them}-{us}. At what point did you personally stop watching?',
    'I watched every snap. We own that one and we’ve moved on to the {opp}.', 'I’ve already forgotten it. The {opp} are about to help everyone else forget too.', 'Somewhere around the anthem.', 'I’m still watching. It’s playing on the inside of my eyelids.', { predict: ['trash'] }),
  Q('s_blowL_2', 'rookie', 'blowoutLoss', 'You lost {them}-{us} to {lastOpp}. Was the plan to let them tire themselves out scoring?',
    'No. We were outplayed, and we’ve worked on why.', 'Yes. And now they’re exhausted and we’re fresh for the {opp}.', 'Yes. It nearly worked. They looked very tired at {them}.', 'There was no plan. There has never been a plan. Shh.'),
  // ---- a big win last game
  Q('s_blowW_1', 'analyst', 'blowoutWin', 'A {us}-{them} win over {lastOpp}. Is there a risk of overconfidence in the building?',
    'There’s always something to clean up. We found plenty on tape.', 'It isn’t overconfidence if you’re right.', 'Enormous risk. I’ve already ordered the rings.', 'We have transcended confidence. We simply know.'),
  // ---- an overtime game last week
  Q('s_ot_1', 'rookie', 'overtime', 'Your game with {lastOpp} went to overtime. Is that because nobody was keeping track of the time?',
    'It means the score was level after four quarters.', 'It’s because {lastOpp} needed extra time to lose properly.', 'Yes. The clock guy stepped out for a sandwich.', 'Time gave up on us. We kept playing out of spite.'),

  // ============================================================ RUNNING JOKES AND STORYLINES (the club's own press history)
  // ---- a reporter you insulted remembers ({reporter} is this reporter)
  Q('m_insulted_i', 'instigator', 'insulted:instigator', 'Before I start: you took a shot at me from that podium a while back. My readers noticed. Anything you’d like to take back?',
    'That was uncalled for. I apologize. Ask your question.', 'I take back nothing. I’d like to add to it.', 'I’d take it back, but it got a bigger laugh than our offense.', 'I said what the prophecy required.', { insult: ['trash'] }),
  Q('m_insulted_r', 'rookie', 'insulted:rookie', 'Um. Last time I asked a question you made fun of me, and my mum saw it. Can I still ask one?',
    'Of course. That was on me, and I’m sorry. Go ahead.', 'You can ask. I can’t promise your mum will like this one either.', 'Tell your mum I said hello, and that you’re doing great.', 'Your mother and I have been in correspondence. Proceed.'),
  Q('m_insulted_a', 'analyst', 'insulted:analyst', 'For the record, your previous remark about my methodology has been noted in my methodology. Shall we proceed?',
    'Understood. I respect the work you do.', 'Note this one too: I still don’t read your charts.', 'I’d like my apology peer-reviewed.', 'I am in your footnotes now. I live there.', { insult: ['trash'] }),
  // ---- a guarantee or bold prediction you made, and you won
  Q('m_predHit', 'instigator', 'predictionHit', 'You stood up here and called it against {lastOpp}, and then you went and did it. Are you insufferable now?',
    'We backed it up. Now it’s the {opp}, and that one’s over.', 'Insufferable and undefeated in predictions. Want another one?', 'I was insufferable before. Now I have evidence.', 'I do not predict. I remember forwards.', { predict: ['trash'] }),
  // ---- a guarantee or bold prediction you made, and you lost
  Q('m_predMiss', 'instigator', 'predictionMiss', 'You guaranteed big things against {lastOpp} from this very podium. Then you lost {them}-{us}. Would you like the clip played back?',
    'I said it and we didn’t back it up. That’s on me.', 'Play it. I’ll say it again about the {opp}, and this time I’m right.', 'No thank you. I’ve seen it. My whole family sent it to me.', 'That was a different me. He has been dealt with.', { predict: ['trash'] }),
  // ---- the rival answers your trash talk (you talked trash before the rival game; you won / lost)
  Q('m_rivalWon', 'instigator', 'rivalAnswered:won', '{rivalGm} says your trash talk before the {rival} game was "noise" and the win was "luck". Your reply?',
    'We played well that day. I’ll leave it there.', 'Tell {rivalGm} the noise has a scoreboard attached.', 'It was luck. We’ve been practicing luck all year.', 'The noise is coming from inside {rivalGm}’s house.'),
  Q('m_rivalLost', 'instigator', 'rivalAnswered:lost', '{rivalGm} had your quotes pinned to the {rival} locker room wall, and then they beat you. Any regrets?',
    'Yes. They earned it, and I gave them the motivation.', 'No regrets. I’ll write them a new wall next time.', 'Only that I didn’t charge them for the decorating.', 'I regret nothing. The wall and I are in talks.'),
  // ---- one of your unhinged quotes resurfaces
  Q('m_quote_1', 'analyst', 'quote', 'Earlier this season you told this room, and I quote: "{quote}" Would you care to clarify that for the record?',
    'I was having some fun. It’s a long season.', 'I stand by every word. So should the {opp}.', 'I’d clarify it, but I think it’s funnier this way.', 'It clarifies itself, in time, to those who are ready.'),
  Q('m_quote_2', 'rookie', 'quote', 'My editor made me write down something you said: "{quote}" I’ve read it nine times. What does it mean?',
    'It was a joke. Don’t lose sleep over it.', 'It means the {opp} are in trouble.', 'Nobody knows. It was on a mug in my office.', 'Read it a tenth time. Then come find me.'),
  // ---- a monster the press keeps hearing about
  Q('m_fav_1', 'rookie', 'mediaFav', 'You talk about {name} at basically every press conference. Is he your favorite? Are coaches allowed favorites?',
    'I’m proud of the whole roster. He’s earned the attention.', 'He’s everybody’s favorite except the {opp}’.', 'I don’t have favorites. I have {name}, and then the others.', 'I am not allowed to say. {name} is listening.', { star: ['pro', 'comedy'] }),
  Q('m_fav_2', 'instigator', 'mediaFav', 'The {name} fan club wants to know: is it true the other monsters are jealous of all the coverage he gets from this podium?',
    'Not at all. That locker room pulls for each other.', 'They should be jealous. They should also block better.', 'One of them asked for "at least a mention". So: hello, the others.', 'There are no other monsters. There never were.', { star: ['pro'] }),
]);

/** Situations, most newsworthy first: at most two situational questions are asked on one Saturday. */
export const SITUATION_ORDER = Object.freeze(['predictionHit', 'predictionMiss', 'rivalAnswered:won', 'rivalAnswered:lost', 'rival', 'playoffs', 'qbInts', 'blowoutLoss', 'upsetWin', 'evolved', 'trade', 'signing', 'rushBig', 'recvBig', 'qbHot', 'defBig', 'streakL', 'streakW', 'hotseat', 'injury', 'champion', 'blowoutWin', 'overtime', 'legendary', 'playoffRace', 'insulted:instigator', 'insulted:analyst', 'insulted:rookie', 'quote', 'mediaFav']);

// ---------------------------------------------------------------- THE BEAST TIMES
/** Headlines by the tone of the press conference (the style used most; `mixed` when no style was used twice). */
export const HEADLINES = Object.freeze({
  pro: ['COACH {COACH} SAYS NOTHING, AT LENGTH', '"ONE GAME AT A TIME," SAYS COACH, FOR THE 400TH TIME', '{CLUB} COACH CONFIRMS TEAM WILL "TRY TO SCORE POINTS"', 'PRESS CONFERENCE ENDS; NO NEWS REPORTED', 'COACH {COACH} RESPECTS OPPONENT, PROCESS, FURNITURE', '{CLUB} "FOCUSED ON SUNDAY," SOURCES INSIDE COACH’S MOUTH SAY', 'COACH GIVES 110 PERCENT OF AN ANSWER', 'REPORTERS ASLEEP BY SECOND QUESTION'],
  trash: ['COACH {COACH} DECLARES WAR ON {OPP}, DIGNITY', '"WRITE IT IN PEN": {CLUB} COACH WON’T STOP TALKING', '{OPP} BULLETIN BOARD RUNS OUT OF SPACE', 'COACH {COACH} GUARANTEES EVERYTHING', '{CLUB} COACH PICKS FIGHT WITH ENTIRE LEAGUE BEFORE LUNCH', 'BULLETIN: COACH {COACH} SAID THAT OUT LOUD', '{OPP} COACH "CAN’T WAIT FOR SUNDAY" AFTER {CLUB} PRESSER', 'COACH CASHES CHECK; TEAM TO FIND OUT SUNDAY IF IT CLEARS'],
  comedy: ['COACH {COACH} WORKSHOPS NEW MATERIAL AT PODIUM', '{CLUB} COACH FUNNIER THAN {CLUB} OFFENSE, CRITICS SAY', 'PRESS ROOM LAUGHS; COACH UNSURE IF WITH OR AT', 'COACH {COACH} "HERE ALL WEEK," CONTRACT PERMITTING', '{CLUB} COACH ANSWERS QUESTION WITH BETTER QUESTION', 'COACH REQUESTS TWO-DRINK MINIMUM FOR NEXT PRESSER', 'SARCASM LEADS {CLUB} IN SACKS', 'COACH {COACH} DEFLECTS; LEADS LEAGUE IN PASSES DEFENDED'],
  unhinged: ['COACH {COACH}: "THE MOON KNOWS WHAT IT DID"', '{CLUB} COACH ESCORTED GENTLY FROM PODIUM', 'LEAGUE OFFICE "MONITORING" COACH {COACH}', 'COACH SPEAKS FOR TEN MINUTES; NO WORDS RECOGNIZED', '{CLUB} COACH CLAIMS TO BE "THE WEATHER NOW"', 'REPORTERS FILE STORIES, THEN CHECK ON EACH OTHER', 'COACH {COACH} ANSWERS QUESTION NOBODY ASKED, IN RHYME', 'WELLNESS CHECK REQUESTED AT {CLUB} FACILITY'],
  mixed: ['COACH {COACH} TRIES EVERY TONE, COMMITS TO NONE', '{CLUB} PRESSER DESCRIBED AS "A JOURNEY"', 'COACH STARTS CALM, ENDS SOMEWHERE ELSE ENTIRELY', 'THREE QUESTIONS, THREE COACHES: WHICH {COACH} SHOWS UP SUNDAY?', '{CLUB} COACH GIVES ANSWERS; REPORTERS GIVEN WHIPLASH', 'ANALYSTS UNABLE TO DETERMINE COACH {COACH}’S MOOD'],
});

/** Subheadlines by the club's real situation (the first live one in this order is used), then by tone. */
export const SUBHEADS = Object.freeze({
  predictionMiss: ['Earlier guarantee about {lastOpp} "aged like milk", sources confirm.', 'Coach’s last prediction still being fact-checked by the scoreboard.'],
  predictionHit: ['Last bold prediction came true. Coach now impossible to be around.', 'Called the {lastOpp} result. Has mentioned it eleven times since.'],
  streakL: ['Team has lost {n} straight. Practice facility reportedly "fine".', '{n} straight losses. Fans advised to bring a book.', 'Losing streak reaches {n}. Morale described as "technically present".'],
  streakW: ['Team has won {n} straight. Rest of league files complaint.', '{n} wins in a row. Bandwagon reports it is "full, try the next one".', 'Winning streak hits {n}. Humility not expected to recover.'],
  blowoutLoss: ['Follows {them}-{us} loss to {lastOpp} that witnesses describe as "long".', 'Scoreboard operator from the {lastOpp} game still icing wrist.'],
  upsetWin: ['Comes days after shock {us}-{them} win over {lastOpp}. Experts "re-evaluating careers".', 'Nobody saw the {lastOpp} result coming, including {club}.'],
  blowoutWin: ['{us}-{them} rout of {lastOpp} has club "insufferable", neighbors say.'],
  rival: ['{rival} week. Both fan bases already hoarse.', '{rival} arrive Sunday. Stadium security "has a plan, probably".', 'Rivalry game Sunday. Local hospitals request everyone calm down.'],
  playoffs: ['Win or go home. {club} have not packed.', 'Playoff football Sunday. Nails across the city in danger.'],
  hotseat: ['Board "watching closely", which is never good.', 'Owner’s box described as "quiet, in a loud way".'],
  qbInts: ['{name} threw {ints} interceptions last week. Receivers hopeful.', 'After {ints} interceptions, {name} "working on aiming".'],
  rushBig: ['{name} ran for {yds} yards last week. Groundskeepers still repairing the field.'],
  recvBig: ['{name} had {yds} receiving yards last week. Opposing secondary "resting comfortably".'],
  qbHot: ['{name} threw {tds} touchdowns last week and would like you to know.'],
  defBig: ['{name} terrorised {lastOpp} last week. Quarterbacks league-wide "aware".'],
  evolved: ['{name} has evolved. Equipment staff ordering bigger everything.', 'Newly evolved {name} no longer fits in team photo.'],
  trade: ['New arrival {name} "still learning where the cafeteria is".'],
  signing: ['New signing {name} reportedly "happy to be here, wherever here is".'],
  injury: ['{name} out {weeks}. Trainers "doing their best with the tape they have".'],
  champion: ['Defending champions. Trophy reportedly "smug".'],
  legendary: ['{name} seen nodding slowly in background throughout.'],
  playoffRace: ['Club sits at {record}. Mathematicians cautiously interested.'],
  generic: ['{club} are {record}. Kickoff against {opp} is Sunday.', 'Club is {record} heading into {opp}. Weather: expected.', 'The {opp} declined to comment, loudly.', 'Sunday: {club} versus {opp}. Popcorn sales up.', 'Press room coffee described as "a cry for help".', 'Reporters outnumbered answers three to one.'],
});
export const TONE_KICKERS = Object.freeze({
  pro: ['Full transcript available to anyone having trouble sleeping.', 'Coach thanked reporters. Reporters unsure what for.'],
  trash: ['The {opp} have printed the quotes. In color.', 'League reminds coaches that microphones are "always on".'],
  comedy: ['Tour dates to be announced.', 'One reporter laughed so hard he missed deadline.'],
  unhinged: ['A league spokesman said only: "We’re aware."', 'Team doctor has asked to "just have a quick chat".'],
  mixed: ['Body-language experts gave up at the second answer.', 'Next week: possibly the same coach.'],
});
