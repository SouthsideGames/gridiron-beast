// Card check (GDD §23.9): does each signature ability do what its card says?
// Audited by reading engine.js against every card. Only abilities that do NOT
// fully match are listed; anything absent matches its card.
//   missing: the card's effect does not happen in the engine at all
//   loose:   something similar happens, but not what the card says (wrong
//            condition, wrong range, or a percentage nobody has measured)
// `does` is what the engine really does today. When a mechanic is built to
// match its card, its entry is deleted here, which clears the notice.

export const CARD_CHECK = Object.freeze({
  // Empty: every signature ability does what its card says (v29.5, GDD §23.12).
  // v29.4 built 26 to their cards; v29.5 built the nine approved new cards (Pincer Hold, Deep Roots,
  // Bramble Shell, Vanishing Cut, Precision Gears, Foresight, Echo Read, Mind Game, Dragonhide).
  // Add an entry here whenever a card and the engine disagree; the owner is notified until it is fixed.
});

/**
 * Proposed new cards (GDD §23.10): uncommon and rare signature abilities may not be absolutes
 * ("never", "always", "every time"); those belong to legendaries. Shown in the Ability Audit for
 * approval; built once approved, then removed from here. All nine of v29.5 were approved and built.
 * v42.14 (Phase A): defenders no longer know a play-action designation, so Echo Read works on what
 * he sees: the mesh moves him half as much and the back leaving without the ball counts twice. He
 * bites on about a quarter as many fakes as other linebackers (17% vs 69%), not "half as long" each
 * time (0.19 s either way). Proposed wording, awaiting the owner.
 */
export const CARD_PROPOSALS = Object.freeze({
  echolot: 'Reads play-action a beat early: a fake moves him half as much, and he spots the back leaving without the ball twice as fast.',
});

export const CARD_STATUS_LABEL = { missing: "Doesn't do what the card says", loose: 'Only roughly what the card says' };
