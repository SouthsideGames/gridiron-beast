// Reserve batch 4: coverage calls, two- and three-man rushes (see ../playbook-reserve.js).
// Packages: base DL1 DL2 LB1 LB2 CB1 CB2 FS · nickel DL1 DL2 LB1 CB1 CB2 FS SS
//           heavy DL1 DL2 DL3 LB1 LB2 CB1 CB2 · pressure DL1 DL2 DL3 LB1 CB1 CB2 FS

export default function batch(b) {
  const { defense: D, RUSH, MAN, ZONE, SPY, BRACKET } = b;
  const TWO = { DL1: RUSH('B_L'), DL2: RUSH('B_R') }; // standard two-man rush
  const THREE = { DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: RUSH('B_R') };
  const plays = []; const lessons = {};
  const add = (play, when, watch, beats, loses) => { plays.push(play); lessons[play.id] = { when, watch, beats, loses }; };
  const T = (tags, desc, align) => ({ tags, desc, ...(align ? { align } : {}) });

  // ================================================================ nickel: three-deep
  add(D('cover_3_sky', 'Cover 3 Sky', 'nickel', { ...TWO, LB1: ZONE('hook_L'), SS: ZONE('curl_flat_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'balanced'], 'Three deep thirds; the strong safety rolls down to the right curl-flat, the linebacker takes the left hook.', { SS: [6, 10] })),
  'A sound base call against balanced offences.', 'The safety in the curl-flat must widen with the first receiver to the flat.', 'Deep Post, Three Verticals and Curl Flat to the right.', 'Flood and Levels to the left, where the hook is alone.');

  add(D('cover_3_cloud', 'Cover 3 Cloud', 'nickel', { ...TWO, LB1: ZONE('hook_M'), CB2: ZONE('flat_R'), SS: ZONE('deep_third_R'), CB1: ZONE('deep_third_L'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'The right corner squats in the flat and the strong safety rotates over the top of him.', { CB2: [3, 16], SS: [11, 10] })),
  'Against offences that love quick throws to the right flat.', 'The corner jams and sits; the safety must get deep in time.', 'Bubble Screen, Quick Slants and Curl Flat to the right.', 'Smash and Deep Corner to the right.');

  add(D('cover_3_buzz', 'Cover 3 Buzz', 'nickel_buzz', { ...TWO, SS: ZONE('buzz_R'), LB1: ZONE('hook_L'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'Three deep with the strong safety buzzing down into the right hook-curl window.')),
  'When the offence keeps hitting digs and curls to the right.', 'The buzz safety drops under the dig from the slot.', 'Dagger, Levels and Y Cross.', 'Flood and Sail to the right flat.');

  add(D('cover_3_seam', 'Cover 3 Seam', 'nickel', { ...TWO, LB1: ZONE('seam_L'), SS: ZONE('seam_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'deep'], 'Three deep with two seam defenders who carry any vertical up the hashes.')),
  'Against four-vertical teams and seam-heavy offences.', 'The seam defenders run with verticals so the deep thirds are never outnumbered.', 'Three Verticals, TE Seam and Dagger.', 'Bubble Screen and Stick, the flats are empty.');

  add(D('cover_3_rotate', 'Cover 3 Rotate', 'nickel_2high', { ...TWO, CB1: ZONE('flat_L'), FS: ZONE('deep_third_L'), SS: ZONE('deep_third_M'), CB2: ZONE('deep_third_R'), LB1: ZONE('hook_R') },
    T(['pass', 'zone', 'disguise'], 'Shows two high safeties, then rotates: the left corner squats, the free safety spins to the left third.')),
  'To confuse a quarterback who reads the safeties before the snap.', 'Two high at the snap, three deep a second later.', 'Smash and Deep Corner aimed at a two-high look.', 'Flood and Sail to the right.');

  add(D('cover_3_bail', 'Cover 3 Bail', 'nickel_press', { ...TWO, LB1: ZONE('hook_M'), SS: ZONE('flat_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'disguise'], 'Corners show press at the line, then bail to their deep thirds at the snap.')),
  'Against quarterbacks who throw quick against press.', 'Press look, zone coverage: the quick fade or slant meets a deep defender.', 'Slot Fade and quick throws chosen against press.', 'Curl Flat and Stick.');

  add(D('wide_nine_three', 'Wide Nine Three', 'nickel_wide', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: ZONE('hook_M'), SS: ZONE('curl_flat_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'Both rushers line up wide and attack the edges; three deep behind them.')),
  'Against pocket passers who step up rarely.', 'Wide rushers collapse the edges; the middle is the soft spot.', 'PA Boot and outside runs that bounce.', 'QB Draw and Inside Zone up the middle.');

  // ================================================================ nickel: two-deep
  add(D('cover_2_invert', 'Cover 2 Invert', 'nickel', { ...TWO, CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R'), FS: ZONE('flat_L'), SS: ZONE('flat_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'disguise'], 'An inverted Cover 2: the corners bail to the deep halves and the safeties come down to the flats.', { FS: [6, -12], SS: [6, 12] })),
  'Against teams that attack the Cover 2 hole on the sideline.', 'Safeties in the flats tackle anything quick; corners carry the deep shots.', 'Smash, Bubble Screen and Deep Corner.', 'TE Seam and Dagger down the middle.');

  add(D('cover_2_sink', 'Cover 2 Sink', 'nickel_2high', { ...TWO, CB1: ZONE('sink_L'), CB2: ZONE('sink_R'), FS: ZONE('deep_two_L'), SS: ZONE('deep_two_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'deep'], 'Corners sink to eight yards under the sideline routes; safeties play deep halves.')),
  'Late in halves when the offence must throw outside.', 'The sinking corner closes the window for the corner route.', 'Smash, Deep Corner and Double Bench.', 'Bubble Screen and Stick underneath.');

  add(D('cover_2_hole', 'Cover 2 Hole', 'nickel', { ...TWO, CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'), LB1: ZONE('hole') },
    T(['pass', 'zone'], 'Cover 2 with the linebacker sitting deeper, in the hole between the safeties.')),
  'Against offences that throw the deep dig and the seam.', 'The linebacker sits at ten yards in the middle: anything inside meets him.', 'Dagger, TE Seam and Levels.', 'Stick and Quick Slants in front of him.');

  add(D('cover_2_jam', 'Cover 2 Jam', 'nickel_press', { ...TWO, CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'press'], 'Cover 2 with the corners jamming the receivers at the line before sitting in the flats.')),
  'Against timing offences and quick passing.', 'The jam throws off the route; the safeties are over the top.', 'Quick Slants, Bubble Screen and Curl Flat.', 'Smash and Slot Fade.');

  add(D('wide_tampa', 'Wide Tampa', 'nickel_wide', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: ZONE('deep_middle'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R') },
    T(['pass', 'zone'], 'Tampa 2 behind a wide edge rush: the linebacker runs the deep middle.')),
  'When you need pressure from two and help over the middle.', 'Wide rushers flush the quarterback up into the linebacker’s area.', 'TE Seam and Four Verticals.', 'Stick, QB Draw and inside runs.');

  add(D('two_deep_spy', 'Two Deep Spy', 'nickel', { ...TWO, LB1: SPY, CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R') },
    T(['pass', 'zone', 'anti_scramble'], 'Cover 2 shell with the linebacker spying the quarterback instead of dropping.')),
  'Against a running quarterback in passing situations.', 'Nobody in the hook zone: the spy mirrors the quarterback.', 'QB Draw, Read Option and scrambles.', 'Stick, Dagger and anything over the middle.');

  add(D('cover_6_lock', 'Cover 6 Lock', 'nickel', { ...TWO, CB1: MAN('wideL'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_half_R'), CB2: ZONE('flat_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'man'], 'Split field: the left corner locks on his receiver with a safety over the top; Cover 2 to the right.', { SS: [12, 8] })),
  'When the left receiver is their best player.', 'Lock-man corner with help left; the right side plays Cover 2.', 'Deep Post and Slot Fade to the left.', 'Flood and Stick to the right.');

  add(D('double_bracket', 'Double Bracket', 'nickel', { ...TWO, CB1: MAN('wideL', 'under'), CB2: MAN('wideR', 'under'), FS: BRACKET('wideL', 'deep_quarter_LL'), SS: BRACKET('wideR', 'deep_quarter_RR'), LB1: MAN('inside') },
    T(['pass', 'man', 'bracket'], 'Both outside receivers get a corner underneath and a safety over the top; the linebacker takes the slot.', { FS: [12, -14], SS: [12, 14] })),
  'Against offences with two dangerous outside receivers.', 'The middle of the field is wide open: the slot and the back are the outlets.', 'Deep Post, Deep Corner and Double Move.', 'TE Seam, Mesh and inside runs.');

  // ================================================================ nickel: quarters
  add(D('quarters_press', 'Quarters Press', 'nickel_press', { ...TWO, LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R') },
    T(['pass', 'zone', 'deep', 'press'], 'Four deep quarters from a press alignment: the corners jam, then run.')),
  'Against vertical offences with fast receivers.', 'Jam to disrupt the timing, then carry everything deep.', 'Three Verticals, Four Verticals and Deep Post.', 'Stick, Curl Flat and the run.');

  add(D('cover_7', 'Cover 7', 'nickel', { ...TWO, LB1: MAN('inside'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R') },
    T(['pass', 'zone', 'man', 'deep'], 'Quarters behind, with the linebacker locked on the inside receiver underneath.')),
  'Against offences that attack quarters with the slot.', 'Four deep and a man on the slot: the outside flats are the only soft spots.', 'TE Seam, Dagger and Slot Fade.', 'Bubble Screen and Curl Flat.');

  add(D('drop_quarters', 'Drop Quarters', 'nickel', { DL1: ZONE('hook_L'), DL2: RUSH('A_M'), LB1: ZONE('hook_R'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R') },
    T(['pass', 'zone', 'deep', 'long'], 'One rusher, two hook defenders and four deep quarters.')),
  '3rd-and-very-long: nothing deep gets out.', 'The quarterback has time; he has nowhere deep to throw.', 'Four Verticals, Dagger and Hail Mary.', 'QB Draw, screens and Stick.');

  add(D('prevent_middle', 'Prevent Middle', 'nickel', { ...TWO, LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_post'), SS: ZONE('hole') },
    T(['pass', 'zone', 'deep', 'prevent'], 'Three deep with the free safety at twenty-two yards and the strong safety in the hole.', { FS: [20, 0], SS: [11, 3] })),
  'End of a half with the lead: nothing over the top.', 'Everyone keeps the ball in front; tackle in bounds.', 'Hail Mary, Deep Post and Four Verticals.', 'Every short pass and the draw.');

  add(D('deep_prevent', 'Deep Prevent', 'nickel_2high', { ...TWO, LB1: ZONE('hole'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_two_L'), SS: ZONE('deep_two_R') },
    T(['pass', 'zone', 'deep', 'prevent'], 'Four deep and very deep, with one linebacker in the hole.', { FS: [17, -8], SS: [17, 8] })),
  'Last play of a half or game, from midfield.', 'Nobody gets behind the deepest defender.', 'Hail Mary and Four Verticals.', 'Anything underneath, and the clock.');

  add(D('hail_prevent', 'Hail Mary Prevent', 'nickel', { DL1: RUSH('B_L'), DL2: ZONE('hook_M'), LB1: ZONE('deep_middle'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_center'), SS: ZONE('deep_post') },
    T(['pass', 'zone', 'deep', 'prevent', 'desperation'], 'One rusher; everybody else races to the end zone to bat the ball down.', { FS: [18, -3], SS: [19, 3] })),
  'Final play, opponent needs a touchdown from long range.', 'Get bodies under the ball and knock it down.', 'Hail Mary.', 'Any short throw with time left, and the scramble.');

  add(D('spy_prevent', 'Spy Prevent', 'nickel', { ...TWO, LB1: SPY, CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R') },
    T(['pass', 'zone', 'deep', 'anti_scramble'], 'Four deep quarters with the linebacker spying a mobile quarterback.')),
  'Protect a lead against a quarterback who runs.', 'Deep zones take the shots; the spy takes away the scramble.', 'Four Verticals and QB Draw.', 'Stick, Curl Flat and screens.');

  add(D('lineman_spy', 'Lineman Spy', 'nickel', { DL1: SPY, DL2: RUSH('A_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('curl_flat_R') },
    T(['pass', 'zone', 'anti_scramble'], 'A defensive lineman drops to spy the quarterback; one rusher, Cover 3 behind.')),
  'Against a scrambler when you want your linebacker in coverage.', 'The big man sits in the middle and mirrors the quarterback.', 'QB Draw and scrambles.', 'Any pass with time: one rusher only.');

  // ================================================================ nickel: man
  add(D('cover_1_rat', 'Cover 1 Rat', 'nickel', { ...TWO, LB1: ZONE('short_M'), CB1: MAN('wideL'), CB2: MAN('wideR'), SS: MAN('inside'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Man across with a deep safety and the linebacker sitting low in the middle as the rat.')),
  'Against crossing routes and shallow drags.', 'The rat sits at three yards and jumps anything crossing underneath.', 'Mesh, Shallow Cross and Drive.', 'Wheel and the back out of the backfield.');

  add(D('cover_1_lurk', 'Cover 1 Lurk', 'nickel_2high', { ...TWO, LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'), SS: ZONE('hook_L') },
    T(['pass', 'man', 'disguise', 'trap'], 'Shows two high, then plays Cover 1 with the strong safety lurking in the left hook.')),
  'Against quarterbacks who throw the dig against two-high looks.', 'The lurking safety drives on the first in-breaker on the left.', 'Levels, Dagger and Quick Slants to the left.', 'Flood and Sail to the right.');

  add(D('cover_1_buzz', 'Cover 1 Buzz', 'nickel_buzz', { ...TWO, SS: ZONE('buzz_R'), LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Cover 1 with the strong safety buzzing into the right hook-curl as an extra zone defender.')),
  'Against curls and digs from the right.', 'The buzz safety helps the right corner on anything breaking in.', 'Curl Flat, Dagger and Stick to the right.', 'Wheel and Slot Fade.');

  add(D('cover_1_spy', 'Cover 1 Spy', 'nickel', { ...TWO, LB1: SPY, SS: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man', 'anti_scramble'], 'Nickel Cover 1 with the linebacker spying the quarterback and the safety on the slot.')),
  'Against a running quarterback with three receivers.', 'The spy has nothing else to do; the back is free if he releases.', 'QB Draw, Read Option and Zone Read.', 'Wheel, Texas and backs in the pass game.');

  add(D('nickel_press_1', 'Nickel Press 1', 'nickel_press', { ...TWO, LB1: MAN('back'), SS: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man', 'press'], 'Press man on every receiver and the back, one deep safety.')),
  'When your corners can win at the line.', 'Press disrupts the timing; a beaten jam is a big play.', 'Quick Slants, Bubble Screen and Jet Sweep.', 'Double Move, Sluggo Seam and Mesh.');

  add(D('two_man_press', 'Two Man Press', 'nickel_press', { ...TWO, LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R') },
    T(['pass', 'man', 'press'], 'Two deep halves with the corners pressing their receivers underneath.')),
  '3rd-and-medium against timing throws.', 'Corners squeeze and trail; the safeties take anything deep.', 'Curl Flat, Stick and outs.', 'Mesh, the back and quarterback runs.');

  add(D('wide_nine_man', 'Wide Nine Man', 'nickel_wide', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: MAN('inside'), SS: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Man across behind two wide edge rushers.')),
  'Passing downs when you trust your coverage.', 'Wide rushers win outside; nobody spies the middle.', 'Slow-developing deep passes.', 'QB Draw and Mesh.');

  // ================================================================ base
  add(D('base_cover_3', 'Base Cover 3', 'base', { ...TWO, LB1: ZONE('curl_flat_L'), LB2: ZONE('curl_flat_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'balanced'], 'Two linebackers widen to the curl-flat zones; three deep behind them.')),
  'Base personnel against a balanced offence.', 'Linebackers must get width; the middle hook is open.', 'Curl Flat, Flood and outside runs.', 'Stick, Dagger and the middle of the field.');

  add(D('stack_cover_3', 'Stack Cover 3', 'base_stack', { ...TWO, LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'Linebackers stacked behind the linemen drop to the hooks; three deep.')),
  'Against offences that attack the middle.', 'Two hook defenders and a middle safety close the inside.', 'Stick, Dagger and Levels.', 'Curl Flat and Bubble Screen.');

  add(D('walk_cover_3', 'Walk Cover 3', 'base_walk', { ...TWO, LB1: ZONE('curl_flat_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'The left linebacker walks out over the slot and plays the curl-flat; the other takes the right hook.')),
  'Against spread looks from base personnel.', 'The walked linebacker takes away the left flat early.', 'Bubble Screen and Curl Flat to the left.', 'Flood to the right.');

  add(D('press_bail', 'Press Bail', 'base_press', { ...TWO, LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_middle') },
    T(['pass', 'zone', 'disguise'], 'Corners show press, then bail deep; the safety plays the middle and two linebackers take the hooks.')),
  'Against quarterbacks who check to quick throws against press.', 'Press look before the snap, three deep after it.', 'Slot Fade and Quick Slants called against press.', 'Curl Flat and the flats.');

  add(D('base_seam_3', 'Base Seam 3', 'base', { ...TWO, LB1: ZONE('seam_L'), LB2: ZONE('seam_R'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'deep'], 'Base Cover 3 with both linebackers carrying the seams.')),
  'Against tight ends who run the seam.', 'Linebackers run with any vertical inside the numbers.', 'TE Seam and Three Verticals.', 'Bubble Screen and Stick.');

  add(D('cover_3_robber', 'Cover 3 Robber', 'base', { ...TWO, LB1: ZONE('hook_L'), LB2: ZONE('robber'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'trap'], 'Three deep with one linebacker sitting at eight yards in the middle to rob in-breaking routes.')),
  'Against offences that live on digs and slants.', 'The robber reads the quarterback’s eyes and jumps the middle throw.', 'Quick Slants, Levels and Dagger.', 'Flood and Curl Flat outside.');

  add(D('base_cloud', 'Base Cloud', 'base', { ...TWO, CB1: ZONE('flat_L'), FS: ZONE('deep_half_L'), CB2: ZONE('deep_half_R'), LB1: ZONE('hook_M'), LB2: ZONE('curl_flat_R') },
    T(['pass', 'zone'], 'Two deep from base: the free safety and the right corner split the field while the left corner squats.')),
  'When you need two deep without a nickel back.', 'The left corner sits in the flat; the right corner bails to a deep half.', 'Bubble Screen to the left and Deep Post.', 'Curl Flat to the right and the seam.');

  add(D('base_two_deep', 'Base Two Deep', 'base', { ...TWO, CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R'), FS: ZONE('hole'), LB1: ZONE('curl_flat_L'), LB2: ZONE('curl_flat_R') },
    T(['pass', 'zone', 'disguise'], 'Corners take the deep halves; the free safety comes down to the hole between the linebackers.')),
  'To show one-high and play two-high.', 'The safety looks like a single deep man, then drops only to ten yards.', 'Deep Post and Dagger.', 'Smash and outside throws in front of the corners.');

  add(D('spy_three', 'Spy Three', 'base', { ...TWO, LB1: SPY, LB2: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'anti_scramble'], 'Cover 3 with one linebacker spying the quarterback and the other in the middle hook.')),
  'Against a mobile quarterback on early downs.', 'The spy only watches the quarterback; the flats are open.', 'QB Draw, Read Option and PA Boot.', 'Curl Flat and Flood.');

  add(D('cover_1_hole', 'Cover 1 Hole', 'base', { ...TWO, LB1: MAN('inside'), LB2: ZONE('hole'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Cover 1 with the second linebacker in the hole at ten yards instead of on the back.')),
  'When the back stays in to block anyway.', 'The hole player takes away the deep dig and crossers.', 'Y Cross, Dagger and Drive.', 'The back on a Wheel or Texas route.');

  add(D('cover_1_hooks', 'Cover 1 Hooks', 'base', { ...TWO, LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man', 'zone'], 'Man on the outside receivers, zone hooks inside, a deep safety: a combination coverage.')),
  'Against offences that win inside with tight ends and slots.', 'Outside is man; the inside receivers run into zone defenders.', 'Stick, Mesh and Y Cross.', 'Wheel and Texas, the back gets out free.');

  add(D('press_spy', 'Press Spy', 'base_press', { ...TWO, LB1: SPY, LB2: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man', 'press', 'anti_scramble'], 'Corners press, a linebacker spies the quarterback, the other takes the inside receiver.')),
  'Against a mobile quarterback with average receivers.', 'Press slows the routes; the spy takes the scramble lane.', 'QB Draw and quick throws.', 'Double Move and the back out of the backfield.');

  add(D('stack_cover_1', 'Stack Cover 1', 'base_stack', { ...TWO, LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Cover 1 with the linebackers stacked behind the linemen, playing off before they pick up their man.')),
  'When the offence mixes run and pass from the same set.', 'Stacked linebackers see the run first, then find their man.', 'Inside runs and Y Cross.', 'Mesh, Slot Fade and quick throws.');

  add(D('wide_cover_1', 'Wide Cover 1', 'base_wide', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Cover 1 with both rushers attacking the edges from wide alignments.')),
  'Against pocket passers who hold the ball.', 'Edge pressure, man coverage, a single safety.', 'PA Shot and slow-developing throws.', 'Inside runs and QB Draw.');

  add(D('cover_0_robber', 'Cover 0 Robber', 'base_stack', { ...TWO, LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('robber') },
    T(['pass', 'man', 'risky', 'trap'], 'Man on everyone with no deep safety: the free safety comes down to rob the middle.')),
  'When the offence keeps throwing slants and digs.', 'No deep help: one double move is a touchdown.', 'Quick Slants, Levels and Mesh.', 'Deep Post, Double Move and Sluggo Seam.');

  // ================================================================ heavy (three linemen, two linebackers, two corners)
  add(D('heavy_two_deep', 'Heavy Two Deep', 'heavy', { ...THREE, LB1: ZONE('curl_flat_L'), LB2: ZONE('curl_flat_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['pass', 'zone'], 'Three-man rush; linebackers in the curl-flats and both corners playing deep halves.')),
  'When heavy personnel faces an unexpected pass.', 'The middle hook is empty: inside throws are the risk.', 'Deep Corner and Deep Post.', 'Stick, Dagger and the seam.');

  add(D('heavy_cover_1', 'Heavy Cover 1', 'heavy_wide', { ...THREE, LB1: MAN('inside'), LB2: ZONE('deep_middle'), CB1: MAN('wideL'), CB2: MAN('wideR') },
    T(['pass', 'man', 'run'], 'Three linemen spread wide, one linebacker on the inside receiver and the other running to the deep middle.')),
  'Against play action from heavy sets.', 'A linebacker plays the deep safety: he must not bite on the fake.', 'PA Post and PA Shot.', 'Inside runs and the back in the flat.');

  add(D('heavy_combo', 'Heavy Combo', 'heavy_stack', { ...THREE, LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: MAN('wideL'), CB2: MAN('wideR') },
    T(['run', 'pass', 'balanced'], 'Corners in man outside, stacked linebackers in the hooks: built to stop the run first.')),
  'Short yardage where a pass is possible.', 'Linebackers read run first, then drop to the hooks.', 'Inside Zone, Power and Stick.', 'Deep throws, there is no deep defender.');

  add(D('heavy_spy', 'Heavy Spy', 'heavy', { ...THREE, LB1: SPY, LB2: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR') },
    T(['run', 'man', 'anti_scramble'], 'Three down linemen, a spy on the quarterback, man on the receivers.')),
  'Against option and quarterback runs from tight sets.', 'The spy takes the quarterback; the linemen take the back.', 'Read Option, QB Power and QB Counter.', 'Play action deep.');

  add(D('heavy_robber', 'Heavy Robber', 'heavy', { ...THREE, LB1: MAN('inside'), LB2: ZONE('robber'), CB1: MAN('wideL'), CB2: MAN('wideR') },
    T(['run', 'man', 'trap'], 'Heavy man coverage with a linebacker robbing the middle.')),
  'Against short passes from run formations.', 'The robber jumps the tight end’s stick or slant.', 'Tight Stick Flat and quick throws.', 'Corner routes and deep play action.');

  add(D('heavy_halves', 'Heavy Halves', 'heavy', { ...THREE, LB1: ZONE('short_L'), LB2: ZONE('short_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['run', 'zone', 'short'], 'Run Wall up front with the corners bailing to deep halves behind it.')),
  'Run downs when you fear a play-action shot.', 'Linebackers fill fast; corners make sure nothing goes over the top.', 'Power, Dive and PA Shot.', 'Curl Flat and the flats in front of the corners.');

  // ================================================================ pressure package as coverage
  add(D('three_man_cover_1', 'Three Man Cover 1', 'pressure', { ...THREE, LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man'], 'Three linemen rush, man coverage on three receivers, one deep safety.')),
  'Against three-receiver sets when you want three big rushers.', 'The back is free if he releases; three rushers must win.', 'Flood and slow drops.', 'Wheel, Texas and the back.');

  add(D('pressure_cover_3', 'Pressure Cover 3', 'pressure_wide', { DL1: RUSH('edge_L'), DL3: RUSH('A_M'), DL2: RUSH('edge_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone'], 'Three wide rushers, one hook defender and three deep thirds.')),
  'When you want pressure without risking the deep ball.', 'Only one underneath defender: the flats are open.', 'Deep Post and Three Verticals.', 'Curl Flat, Stick and screens.');

  add(D('mug_drop_3', 'Mug Drop 3', 'pressure_mug', { ...THREE, LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M') },
    T(['pass', 'zone', 'disguise'], 'The linebacker shows a blitz in the A gap, then drops to the hook; three deep behind.')),
  'To make the offence change its protection for a blitz that never comes.', 'The quarterback sees pressure and throws hot into the dropping linebacker.', 'Quick Slants and Stick thrown hot.', 'Flood and the flats.');

  add(D('pressure_spy', 'Pressure Spy', 'pressure', { ...THREE, LB1: SPY, CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside') },
    T(['pass', 'man', 'anti_scramble', 'risky'], 'Three linemen rush, a spy on the quarterback, man on three receivers and no deep safety.')),
  'Against a scrambling quarterback in obvious passing downs.', 'No deep help: the corners are on an island.', 'QB Draw and scrambles.', 'Deep Post, Slot Fade and Double Move.');

  add(D('rotated_two', 'Rotated Two', 'pressure', { ...THREE, CB1: ZONE('deep_half_L'), FS: ZONE('deep_half_R'), CB2: ZONE('flat_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'disguise'], 'The free safety and left corner rotate to deep halves; the right corner squats in the flat.')),
  'To get two deep from the pressure package.', 'Looks single-high before the snap, two-deep after it.', 'Deep Post and Three Verticals.', 'Smash and Corner Arrow to the right.');

  add(D('pressure_robber', 'Pressure Robber', 'pressure', { ...THREE, LB1: ZONE('robber'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle') },
    T(['pass', 'man', 'trap'], 'Man on the outside, a deep safety, and the linebacker robbing the middle.')),
  'Against quick inside throws in passing downs.', 'The inside receiver is in the robber’s zone, not man coverage.', 'Quick Slants and Stick.', 'TE Seam and the back.');

  add(D('cover_2_spy_heavy', 'Heavy Two Spy', 'heavy_wide', { ...THREE, LB1: SPY, LB2: ZONE('hook_M'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['run', 'zone', 'anti_scramble'], 'Wide heavy front with a spy, a hook defender and two deep corners.')),
  'Against option teams that also throw deep.', 'The spy takes the quarterback; the corners take the shots.', 'Read Option and PA Shot.', 'The flats and outside runs.');

  add(D('red_zone_two_man', 'Red Zone Two Man', 'nickel', { ...TWO, LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('goal_L'), SS: ZONE('goal_R') },
    T(['pass', 'man', 'redzone', 'short'], 'Inside the 10: man underneath with both safeties sitting at the goal line.')),
  'Red zone against passing teams.', 'The safeties are shallow because the end zone is short.', 'Slot Fade, Goal Line Fade and Mesh.', 'Inside runs and QB Draw.');

  add(D('red_zone_match', 'Red Zone Match', 'nickel', { ...TWO, LB1: ZONE('hook_M'), CB1: ZONE('goal_L'), CB2: ZONE('goal_R'), FS: ZONE('flat_L'), SS: ZONE('flat_R') },
    T(['pass', 'zone', 'redzone', 'short'], 'A red-zone zone: corners in the goal-line zones, safeties in the flats, linebacker in the hook.')),
  'Inside the 10 against quick throws.', 'Everyone is shallow: the back of the end zone is the risk.', 'Snag, Bunch Snag and Goal Line PA Arrow.', 'Fade and Corner routes.');

  return { plays, lessons };
}
