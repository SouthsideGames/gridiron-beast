// Card check (GDD §23.9): does each signature ability do what its card says?
// Audited by reading engine.js against every card. Only abilities that do NOT
// fully match are listed; anything absent matches its card.
//   missing: the card's effect does not happen in the engine at all
//   loose:   something similar happens, but not what the card says (wrong
//            condition, wrong range, or a percentage nobody has measured)
// `does` is what the engine really does today. When a mechanic is built to
// match its card, its entry is deleted here, which clears the notice.

export const CARD_CHECK = Object.freeze({
  // ---- missing: the card's effect does not happen
  pyroclast: { status: 'missing', does: 'No once-per-drive guarantee. A strong block, tackle-breaking strength and a better first tackle escape, every play.', needs: 'drive memory' },
  reefclaw: { status: 'missing', does: 'No rule stopping blockers releasing. A shed and anchor bonus.' },
  wavehorn: { status: 'missing', does: 'No sideline drag. A stronger run block only.' },
  tsunarok: { status: 'missing', does: 'Not tied to deep throws or his half. A general bonus to catching picks and breaking on the ball.' },
  thornback: { status: 'missing', does: 'Never fumbles (true), but tacklers who miss him are not slowed.' },
  elderoot: { status: 'missing', does: 'Boosts the reactions of every defender on the field, not those within 5 yards, and not Awareness.' },
  joltrex: { status: 'missing', does: 'No after-sack boost. A faster pass rush from the snap, every play.', needs: 'drive memory' },
  stormcrown: { status: 'missing', does: 'Faster throws (true), but quick passes can still be broken up by trailing defenders.' },
  glacivern: { status: 'missing', does: 'No read freeze. Quicker reactions and small pick bonuses, every play.', needs: 'half memory' },
  duskrunner: { status: 'missing', does: 'His first juke is not guaranteed. He is harder to bring down on the first tackle attempt.' },
  nyxshade: { status: 'missing', does: 'Quarterbacks read him like anyone else. Tighter man coverage and a pick bonus.' },
  prism: { status: 'missing', does: 'Quarterbacks judge windows near him normally. Tighter coverage and more contested catches.' },
  aurelion: { status: 'missing', does: 'No guaranteed touchdown. A big speed burst after the catch and sharper routes.', needs: 'game memory' },
  gearwing: { status: 'missing', does: 'Kicks can still miss for accuracy. A flat +12 kicking.' },
  astralux: { status: 'missing', does: 'No teleport. A much better chance to escape the first tackle, and speed after the catch.', needs: 'game memory' },
  aurodrax: { status: 'missing', does: 'First-read throws can be intercepted and there is no fourth-quarter boost. A flat passing bonus.' },
  vyrnax: { status: 'missing', does: 'The blocker across from him is not slowed. A faster rush and a shed bonus.' },
  enigmane: { status: 'missing', does: 'His defender does not bite on fakes. Sharper routes (agility bonus).' },
  tempestra: { status: 'missing', does: 'Defenders are not spun around. Sharper routes and speed after the catch.' },
  nocturne: { status: 'missing', does: 'His defender never loses track of him. Sharper routes (agility bonus).' },
  titanolith: { status: 'missing', does: 'No +2 yards and he can lose pass blocks. Very strong block and anchor numbers.' },
  icehorn: { status: 'missing', does: 'Runs do not lose a yard on contact. A bonus to shedding blocks against the run.' },
  // ---- loose: similar, but not what the card says
  pyrelynx: { status: 'loose', does: 'Tighter man coverage and faster closing on the ball, on every route, not a timed loss of separation on deep routes.' },
  cerebrix: { status: 'loose', does: 'Reads faster under pressure, but does not always beat a free rusher.' },
  glaciron: { status: 'loose', does: 'Strong anchor and block bonus on pass plays. "30% fewer sacks" has never been measured.' },
  rootram: { status: 'loose', does: 'A big anchor bonus on pass plays. Nothing limits how far he is driven back.' },
  terrabull: { status: 'loose', does: 'Tacklers are 20% less likely to bring him down at any time, not only when he cuts or within 2 yards.' },
  halofang: { status: 'loose', does: 'Faster when chasing any ball carrier, not only from behind.' },
  mireclaw: { status: 'loose', does: 'A faster rush and quicker reactions. "Picked up 30% less" has never been measured.' },
  stormlynx: { status: 'loose', does: 'A contest bonus in coverage. "10% harder" has never been measured.' },
  sablewing: { status: 'loose', does: 'A contest bonus in coverage. "15% harder" has never been measured.' },
  aegistron: { status: 'loose', does: 'A big man-coverage bonus. "35% less" has never been measured.' },
  zephyr: { status: 'loose', does: 'More arm and accuracy on deep throws. Passes do not travel farther or land softer as such.' },
});

export const CARD_STATUS_LABEL = { missing: "Doesn't do what the card says", loose: 'Only roughly what the card says' };
