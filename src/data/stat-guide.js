// What each of the twelve attributes does for each position (GDD §8.2), read from what the football engine (src/sim) actually
// uses, plus the attributes in each position's overall rating (POSITION_WEIGHTS, which also feeds Beast Clash). This file is the
// single source for two things: the in-game "What the stats mean" guide, and the rule that attribute points can only be spent on
// an attribute that helps the monster's position. It imports nothing.

export const POSITIONS = Object.freeze(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);
export const POSITION_NAME = Object.freeze({ QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', OL: 'Offensive line', DL: 'Defensive line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' });
export const ATTR_ORDER = Object.freeze(['speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'durability', 'kicking']);
export const ATTR_NAME = Object.freeze({ speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' });

/**
 * For each attribute: a one-line summary and what it does for each position. A position missing from `by` gets nothing from it:
 * the attribute does not help that position, and points cannot be spent on it.
 */
export const STAT_GUIDE = Object.freeze({
  speed: { summary: 'How fast the monster runs flat out.', by: {
    QB: 'Running on scrambles and keepers.', RB: 'Hitting the hole and pulling away from tacklers; return distance.', WR: 'Getting open deep and running after the catch; return distance.', TE: 'Getting open and running after the catch.',
    OL: 'Getting to the block on pulls and screens.', DL: 'Closing on the quarterback and chasing ball carriers.', LB: 'Running with receivers and chasing ball carriers.', CB: 'Keeping up with receivers in coverage and closing on the ball.', S: 'Covering deep and running down the ball carrier.' } },
  agility: { summary: 'How quickly the monster starts, stops and changes direction.', by: {
    QB: 'Escaping the pass rush and deciding to scramble.', RB: 'Jukes and cuts that make tacklers miss; breaking tackles; return yards.', WR: 'Sharp route cuts, a wider catch radius for off-target balls, jukes after the catch.', TE: 'Route cuts and a wider catch radius.',
    OL: 'Moving to the block on pulls and slides.', DL: 'Getting around blockers on the pass rush.', LB: 'Changing direction in coverage and pursuit.', CB: 'Mirroring receivers through their cuts.', S: 'Changing direction in coverage and pursuit.' } },
  strength: { summary: 'Physical power.', by: {
    QB: 'Breaking tackles on scrambles and keepers.', RB: 'Breaking tackles (half of a ball carrier\'s power) and holding blocks in protection.', WR: 'Breaking tackles after the catch and holding stalk blocks.', TE: 'Holding blocks (40% of a block) and breaking tackles.',
    OL: 'Holding blocks: 40% of how well a block holds (blocking is the rest).', DL: 'Shedding blocks (half of a pass rusher\'s power) and tackling.', LB: 'Shedding blocks and tackling (about a third of a sure tackle).', CB: 'Tackling and shedding blocks on blitzes.', S: 'Tackling and shedding blocks on blitzes.' } },
  awareness: { summary: 'Football IQ: how well the monster reads the field.', by: {
    QB: 'Reading receivers faster, judging who is open, throwing sooner under pressure and misreading less often. The quarterback\'s most important stat after accuracy.', RB: 'Vision: how far ahead it sees running lanes and how well it picks one.', WR: 'Vision after the catch.', TE: 'Vision after the catch.',
    OL: 'Counts toward the overall rating (and Beast Clash).', DL: 'Pursuit angles and resisting jukes.', LB: 'Reacting in zone, pursuit angles and not biting on play-action or fakes.', CB: 'Reacting in zone and not biting on fakes.', S: 'Reacting in zone, pursuit angles and not biting on play-action.', K: 'Counts toward the overall rating (and Beast Clash).' } },
  catching: { summary: 'Hands: catching the ball and holding on to it.', by: {
    QB: 'Ball security: fewer fumbles when sacked or tackled.', RB: 'Catching passes and ball security (fewer fumbles).', WR: 'Catching, especially deep and contested balls; ball security after the catch.', TE: 'Catching, especially contested balls; ball security.',
    LB: 'Turning a tipped or contested pass into an interception.', CB: 'Turning contested passes into interceptions.', S: 'Turning contested passes into interceptions.' } },
  arm: { summary: 'Throwing power.', by: { QB: 'How fast the ball travels, how far it can throw and how quick the release is. A slow ball gives defenders time to close.' } },
  accuracy: { summary: 'Throwing precision.', by: { QB: 'How close the ball lands to where it was aimed. Deep throws, pressure and throwing on the move make it harder.' } },
  blocking: { summary: 'Blocking technique, when the play says to block.', by: {
    RB: 'Pass protection and lead blocks (60% of a block).', WR: 'Stalk blocks on run plays.', TE: 'Run and pass blocking (60% of a block).', OL: 'The line\'s main job: 60% of how well a block holds.' } },
  tackling: { summary: 'Bringing the ball carrier down.', by: {
    DL: 'Finishing sacks and tackles; part of shedding blocks.', LB: 'Sure tackles (55% of a tackle) and finishing sacks on blitzes.', CB: 'Sure tackles in the open field.', S: 'Sure tackles as the last line of defense.' } },
  coverage: { summary: 'Staying with a receiver.', by: {
    LB: 'Covering backs and tight ends.', CB: 'Reacting to a receiver\'s cuts, anticipating the route and breaking up contested catches.', S: 'Deep coverage and breaking up contested catches.' } },
  durability: { summary: 'How well the body holds up over a season.', by: {
    QB: 'Tiring more slowly and fewer injuries.', RB: 'Tiring more slowly and fewer injuries.', WR: 'Tiring more slowly and fewer injuries.', TE: 'Tiring more slowly and fewer injuries.', OL: 'Tiring more slowly and fewer injuries.',
    DL: 'Tiring more slowly and fewer injuries.', LB: 'Tiring more slowly and fewer injuries.', CB: 'Tiring more slowly and fewer injuries.', S: 'Tiring more slowly and fewer injuries.' } },
  kicking: { summary: 'Leg strength and precision.', by: { K: 'Field goal range and accuracy, punts and kickoffs.' } },
});

/** Does `attr` help a monster at `position`? (Spending points is limited to these.) */
export function attributeHelps(position, attr) { return !!STAT_GUIDE[attr]?.by[position]; }
/** The attributes that help a position, in display order. */
export function usefulAttributes(position) { return ATTR_ORDER.filter((a) => attributeHelps(position, a)); }
/** What `attr` does for a `position`, in one sentence (or why it does nothing). */
export function statMeaning(position, attr) {
  const g = STAT_GUIDE[attr]; if (!g) return '';
  return g.by[position] || `Does nothing for a ${POSITION_NAME[position]?.toLowerCase() || position}.`;
}
