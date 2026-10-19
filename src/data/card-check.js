// Card check (GDD §23.9): does each signature ability do what its card says?
// Audited by reading engine.js against every card. Only abilities that do NOT
// fully match are listed; anything absent matches its card.
//   missing: the card's effect does not happen in the engine at all
//   loose:   something similar happens, but not what the card says (wrong
//            condition, wrong range, or a percentage nobody has measured)
// `does` is what the engine really does today. When a mechanic is built to
// match its card, its entry is deleted here, which clears the notice.

export const CARD_CHECK = Object.freeze({
  // Built to match their cards in v29.4 (GDD §23.11): Eruption, Riptide, Undertow, Ancient Grove, Overcharge,
  // Thunderclap, Whiteout, Night Veil, Refraction, Daybreak (new card), Blink, Sovereign Arm, Dragon's Roar,
  // Cyclone, Eclipse Route, Landslide, Permafrost, Heat Haze, Glacier Wall, Quake Step, Radiant Pursuit, Ambush,
  // Static Field, Wing Shadow, Fortress, Tailwind.
  // Still open: non-legendary cards written like legendaries. Each has a proposed card below (CARD_PROPOSALS);
  // the owner approves the new card, then it is built.
  reefclaw: { status: 'missing', does: 'No rule stopping blockers releasing. A shed and anchor bonus.' },
  thornback: { status: 'missing', does: 'Never fumbles (true), but tacklers who miss him are not slowed.' },
  duskrunner: { status: 'missing', does: 'His first juke is not guaranteed. He is harder to bring down on the first tackle attempt.' },
  gearwing: { status: 'missing', does: 'Kicks can still miss for accuracy. A flat +12 kicking.' },
  enigmane: { status: 'missing', does: 'His defender does not bite on fakes. Sharper routes (agility bonus).' },
  cerebrix: { status: 'loose', does: 'Reads faster under pressure, but does not always beat a free rusher.' },
  rootram: { status: 'loose', does: 'A big anchor bonus on pass plays. Nothing limits how far he is driven back.' },
});

/**
 * Proposed new cards (GDD §23.10): uncommon and rare signature abilities may not
 * be absolutes ("never", "always", "every time"); those belong to legendaries.
 * Each proposal keeps the ability's idea and makes it distinctive but limited.
 * Nothing changes until the owner approves it in the Ability Audit.
 */
export const CARD_PROPOSALS = Object.freeze({
  reefclaw: 'Blockers he engages are slow to let go: they reach the second level a full second late.',
  rootram: 'Pass rushers drive him back at half speed.',
  thornback: 'Fumbles half as often, and a tackler who misses him is slowed for a moment.',
  duskrunner: 'The first defender he jukes each play freezes for a full second.',
  gearwing: '+12 Kicking, and +6 more on field goals of 40 yards or longer.',
  cerebrix: 'Sees blitzes early: against a blitz he gets to his hot read twice as fast.',
  echolot: 'Reads play-action a beat early: he bites half as long as other defenders.',
  enigmane: 'His man defender bites on his first fake half the time, losing a step.',
  scaleguard: 'When beaten, he recovers twice as fast to block again.',
});

export const CARD_STATUS_LABEL = { missing: "Doesn't do what the card says", loose: 'Only roughly what the card says' };
