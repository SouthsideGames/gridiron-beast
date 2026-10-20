// Reserve batch 5: pressures, run fronts and situational calls (see ../playbook-reserve.js).
// Packages: base DL1 DL2 LB1 LB2 CB1 CB2 FS · nickel DL1 DL2 LB1 CB1 CB2 FS SS
//           heavy DL1 DL2 DL3 LB1 LB2 CB1 CB2 · pressure DL1 DL2 DL3 LB1 CB1 CB2 FS

export default function batch(b) {
  const { defense: D, RUSH, MAN, ZONE, SPY, CONTAIN } = b;
  const TWO = { DL1: RUSH('B_L'), DL2: RUSH('B_R') };
  const THREE = { DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: RUSH('B_R') };
  const MAN_OUT = { CB1: MAN('wideL'), CB2: MAN('wideR') };
  const THIRDS = (fs = 'FS') => ({ CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), [fs]: ZONE('deep_third_M') });
  const plays = []; const lessons = {};
  const add = (play, when, watch, beats, loses) => { plays.push(play); lessons[play.id] = { when, watch, beats, loses }; };
  const T = (tags, desc, align) => ({ tags, desc, ...(align ? { align } : {}) });

  // ================================================================ nickel pressure
  add(D('mike_fire', 'Mike Fire', 'nickel', { ...TWO, LB1: RUSH('A_L'), SS: ZONE('hook_M'), ...THIRDS() },
    T(['blitz', 'zone'], 'The middle linebacker blitzes the left A gap; the strong safety replaces him in the hook; three deep.')),
  'Pressure up the middle without giving up the deep ball.', 'The safety must get to the hook fast: that is where the hot throw goes.', 'Y Cross, PA Shot and slow drops.', 'Curl Flat and the flats.');

  add(D('slot_fire', 'Slot Fire', 'nickel', { DL1: RUSH('B_L'), DL2: RUSH('edge_R'), SS: RUSH('B_R'), LB1: ZONE('hook_M'), ...THIRDS() },
    T(['blitz', 'zone'], 'The slot defender blitzes inside through the right B gap while the end widens; three deep behind.', { SS: [3, 5] })),
  'When the offence slides its protection away from the slot.', 'The inside blitz from the slot is hard to see and harder to pick up.', 'PA Boot to the right and slow throws.', 'Bubble Screen and quick throws to the slot’s receiver.');

  add(D('weak_fire', 'Weak Fire', 'nickel', { DL1: ZONE('hook_L'), LB1: RUSH('B_L'), DL2: RUSH('B_R'), SS: RUSH('edge_R'), ...THIRDS() },
    T(['blitz', 'zone'], 'The left lineman drops into the hook; the linebacker and the strong safety blitz around him.')),
  'To confuse protections: a lineman drops, two others come.', 'The dropping lineman sits in the throwing lane for a hot slant.', 'Quick Slants and Stick to the left.', 'Bubble Screen and outside runs.');

  add(D('sim_pressure', 'Sim Pressure', 'nickel', { DL1: ZONE('curl_flat_L'), DL2: RUSH('A_R'), LB1: RUSH('B_L'), SS: ZONE('hook_R'), ...THIRDS() },
    T(['blitz', 'zone', 'disguise'], 'A simulated pressure: the linebacker blitzes, the left lineman drops wide into the curl-flat.')),
  'Three rushers who look like four.', 'Nobody expects the big lineman in the flat.', 'Curl Flat and quick outs to the left.', 'Deep throws with time and inside runs.');

  add(D('sim_right', 'Sim Right', 'nickel', { DL2: ZONE('hook_R'), DL1: RUSH('B_L'), LB1: RUSH('A_R'), SS: RUSH('edge_R'), ...THIRDS() },
    T(['blitz', 'zone', 'disguise'], 'The right lineman drops into the hook while the linebacker and strong safety come from the right.')),
  'Against offences that slide protection to the strong side.', 'Two rushers attack where the lineman left; the hot throw meets a lineman.', 'Stick and Quick Slants to the right.', 'Throws to the left flat.');

  add(D('nickel_zero', 'Nickel Zero', 'nickel_press', { ...TWO, LB1: RUSH('A_R'), ...MAN_OUT, SS: MAN('inside'), FS: MAN('back') },
    T(['blitz', 'man', 'risky'], 'Pressed man on everyone, no deep safety, the linebacker blitzes.')),
  'When you must have pressure on third down.', 'No help anywhere: one missed tackle is a touchdown.', 'Slow-developing deep passes.', 'Quick Slants, Bubble Screen and Double Move.');

  add(D('rotate_fire', 'Rotate Fire', 'nickel_2high', { ...TWO, FS: RUSH('A_L'), SS: ZONE('deep_third_M'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R') },
    T(['blitz', 'zone', 'disguise'], 'Shows two high; the free safety blitzes from depth and the strong safety spins to the middle.')),
  'Against quarterbacks who read two-high and relax.', 'The blitz comes from twelve yards: the protection never sees it.', 'Smash and Dagger, slow two-high beaters.', 'Quick Slants and screens.');

  add(D('nickel_mug_zero', 'Nickel Mug Zero', 'nickel', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: RUSH('A_L'), SS: RUSH('A_R'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky', 'interior'], 'Linebacker and strong safety mugged in the A gaps, ends wide; man with no safety.', { LB1: [1.2, -0.9], SS: [1.2, 0.9] })),
  'Third-and-medium when the back stays in.', 'Two inside rushers and two outside: the centre can only take one.', 'QB Draw, Stick and slow drops.', 'Bubble Screen and Toss Sweep, nobody outside.');

  add(D('nickel_spy_zero', 'Nickel Spy Zero', 'nickel', { ...TWO, LB1: SPY, SS: RUSH('edge_R'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky', 'anti_scramble'], 'The strong safety blitzes off the edge, the linebacker spies, man with no deep help.')),
  'Against a mobile quarterback on third down.', 'The edge blitz flushes him; the spy waits for him.', 'Scrambles and QB Draw.', 'Deep Post and Slot Fade.');

  add(D('mike_blitz_1', 'Mike Blitz 1', 'nickel', { ...TWO, LB1: RUSH('A_L'), SS: MAN('inside'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'Cover 1 behind a middle linebacker blitz; nobody covers the back.')),
  'Against offences that keep the back in to block.', 'The linebacker hits the A gap; if the back releases, he is open.', 'Y Cross and slow drops.', 'Wheel, Texas and RB Screen.');

  add(D('nickel_blitz_1', 'Nickel Blitz 1', 'nickel', { ...TWO, SS: RUSH('edge_R'), LB1: MAN('inside'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'The slot defender blitzes off the right edge; Cover 1 behind.', { SS: [3, 7] })),
  'Against right-handed quarterbacks who don’t see the right edge.', 'The linebacker must carry the slot after the safety leaves.', 'PA Boot and slow throws.', 'Bubble Screen and Slant Flat to the right.');

  add(D('edge_fire', 'Edge Fire', 'nickel_wide', { DL1: RUSH('wide_L'), DL2: RUSH('wide_R'), LB1: RUSH('A_M'), SS: ZONE('hook_M'), ...THIRDS() },
    T(['blitz', 'zone'], 'Both ends rush from very wide; the linebacker comes straight up the middle; three deep.')),
  'Against pocket passers: squeeze the pocket from three sides.', 'The quarterback has nowhere to step up.', 'PA Shot and long drops.', 'QB Draw and screens.');

  add(D('show_drop', 'Show and Drop', 'nickel_press', { ...TWO, SS: ZONE('curl_flat_R'), LB1: ZONE('hook_L'), ...THIRDS() },
    T(['pass', 'zone', 'disguise'], 'The strong safety walks up as if to blitz, then drops to the curl-flat; corners bail from press.', { SS: [1.5, 6] })),
  'To bait hot throws.', 'The quarterback sees a blitz and throws hot right into the dropping safety.', 'Quick Slants and Stick thrown hot.', 'Anything with time to read.');

  add(D('safeties_fire', 'Safeties Fire', 'nickel', { DL1: RUSH('B_L'), DL2: RUSH('A_R'), FS: RUSH('A_L'), SS: RUSH('B_R'), LB1: MAN('inside'), ...MAN_OUT },
    T(['blitz', 'man', 'risky'], 'Both safeties blitz the inside gaps; man coverage on three receivers and nobody deep.', { FS: [6, -2], SS: [6, 2] })),
  'Once a game on an obvious passing down.', 'Four inside rushers: the quarterback must throw now.', 'Mesh and Y Cross.', 'Slot Fade, Deep Post and Double Move.');

  add(D('cat_zero', 'Cat Zero', 'nickel', { ...TWO, CB1: RUSH('edge_L'), SS: MAN('wideL'), FS: MAN('inside'), LB1: MAN('back'), CB2: MAN('wideR') },
    T(['blitz', 'man', 'risky'], 'The left corner blitzes; the strong safety takes his receiver; man on everyone with no safety.', { CB1: [2, -12], SS: [7, -15] })),
  'Surprise pressure from the boundary on third down.', 'The safety has a long way to cover the left receiver.', 'PA Shot and slow throws from the left.', 'Bubble Screen and quick throws to the left.');

  add(D('overload_left', 'Overload Left', 'nickel', { LB1: RUSH('edge_L'), DL1: RUSH('A_L'), DL2: RUSH('B_R'), SS: MAN('inside'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'Two rushers from the left side, one from the right; Cover 1 behind.')),
  'When the offence slides protection right.', 'More rushers than blockers on the left side.', 'Slow drops and PA Boot to the left.', 'Screens to the left and the back free in the flat.');

  add(D('double_cat', 'Double Cat', 'nickel', { ...TWO, CB1: RUSH('edge_L'), SS: RUSH('edge_R'), LB1: ZONE('hook_M'), FS: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'risky'], 'Left corner and strong safety blitz off both edges; two deep and one hook behind.', { CB1: [2, -12], SS: [3, 7] })),
  'Desperation pressure from both edges.', 'Only three defenders cover: the flats are empty.', 'Slow throws and play action.', 'Bubble Screen, Curl Flat and Swing Screen.');

  add(D('nickel_bear', 'Nickel Bear', 'nickel', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: ZONE('short_R'), SS: ZONE('short_L'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'balanced'], 'Both linemen over the centre, the strong safety and linebacker fill the gaps; man outside.', { DL1: [1, -0.9], DL2: [1, 0.9], SS: [4, -3.5], LB1: [4, 3.5] })),
  'Against inside runs from spread sets.', 'Clog the middle with the linemen; the second level fills.', 'Inside Zone, Duo and QB Draw.', 'Outside Zone and Toss Sweep.');

  add(D('nickel_contain_spy', 'Nickel Contain Spy', 'nickel', { DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), LB1: SPY, SS: ZONE('hook_M'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'anti_outside', 'anti_scramble'], 'Both ends keep contain, the linebacker spies; man outside with one deep safety.')),
  'Against option and quarterback runs from spread.', 'Nobody gets outside; the spy cleans up inside.', 'Speed Option, Zone Read and scrambles.', 'Quick passing and inside runs.');

  add(D('mike_fire_robber', 'Mike Fire Robber', 'nickel', { ...TWO, LB1: RUSH('A_L'), SS: ZONE('robber'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man', 'trap'], 'Linebacker blitzes; the strong safety robs the middle where the hot throw goes.')),
  'When the offence throws hot slants against blitzes.', 'The robber sits exactly where the hot read lands.', 'Quick Slants and Stick thrown hot.', 'The inside receiver vertically and the back.');

  add(D('double_drop_nickel', 'Double Drop Nickel', 'nickel', { DL1: ZONE('short_L'), DL2: ZONE('short_R'), LB1: RUSH('A_M'), SS: RUSH('edge_R'), ...THIRDS() },
    T(['blitz', 'zone', 'disguise'], 'Both linemen drop into short zones while the linebacker and strong safety rush.')),
  'Against screen-happy offences.', 'The linemen drop right into the screen lanes.', 'RB Screen, Middle Screen and Quick Slants.', 'Deep throws with time.');

  add(D('free_fire_man', 'Free Fire Man', 'nickel', { ...TWO, FS: RUSH('A_R'), SS: ZONE('deep_middle'), LB1: MAN('inside'), ...MAN_OUT },
    T(['blitz', 'man', 'disguise'], 'The free safety blitzes up the middle and the strong safety rotates to the deep middle; man underneath.', { FS: [10, 2], SS: [12, 7] })),
  'To hide who the deep safety will be.', 'The quarterback reads two safeties; one blitzes, one rotates.', 'Slow drops.', 'The back released into the flat.');

  add(D('wide_fire_zero', 'Wide Fire Zero', 'nickel_wide', { DL1: RUSH('wide_L'), DL2: RUSH('wide_R'), LB1: RUSH('A_L'), SS: MAN('inside'), FS: MAN('back'), ...MAN_OUT },
    T(['blitz', 'man', 'risky'], 'Wide ends and a linebacker blitz; man on everyone, nobody deep.')),
  'Must-have stop on third-and-long.', 'Three rushers and pure man: a quick throw beats it.', 'Slow drops and deep shots.', 'Quick Slants and screens.');

  add(D('screen_trap', 'Screen Trap', 'nickel', { DL1: ZONE('short_L'), DL2: ZONE('short_R'), LB1: RUSH('A_M'), SS: RUSH('edge_R'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_middle') },
    T(['pass', 'zone', 'trap'], 'Both linemen drop to the short zones and the corners squat in the flats: every screen lane is covered.')),
  'After the offence has hurt you with screens.', 'The defence sits on the screen; anything deep is single-high.', 'RB Screen, Bubble Screen and Tunnel Screen.', 'Deep Post and verticals.');

  add(D('flat_kill', 'Flat Kill', 'nickel', { ...TWO, CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), LB1: ZONE('seam_L'), SS: ZONE('seam_R'), FS: ZONE('deep_middle') },
    T(['pass', 'zone'], 'Corners squat in the flats, two seam defenders carry the verticals, one deep safety.')),
  'Against short-passing teams that live in the flat.', 'The flats are taken away; the deep sideline is the risk.', 'Bubble Screen, Curl Flat and Swing Screen.', 'Deep Corner and Out and Up.');

  add(D('trips_solo', 'Trips Solo', 'nickel', { ...TWO, CB1: MAN('wideL'), SS: ZONE('curl_flat_R'), LB1: ZONE('hook_R'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_middle') },
    T(['pass', 'zone', 'man'], 'Against trips: the single receiver gets the corner alone in man; everyone else rolls to the trips side.')),
  'When the offence lines up three receivers to one side.', 'The solo corner is on an island; the trips side is outnumbered by defenders.', 'Snag, Trips Spacing and Flood to trips.', 'The single receiver on a Slant or Fade.');

  add(D('sideline_cover_2', 'Sideline Cover 2', 'nickel', { ...TWO, CB1: ZONE('curl_flat_L'), CB2: ZONE('curl_flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'), LB1: ZONE('hook_M') },
    T(['pass', 'zone', 'two_minute'], 'Cover 2 with the corners sitting deeper in the curl-flat to take away sideline throws.')),
  'Two-minute defence: keep them in bounds.', 'Corners sit at six yards near the sideline; the middle is open.', 'Quick Outs, Double Bench and outs.', 'Stick and Dagger in the middle.');

  add(D('nickel_goal_line', 'Nickel Goal Line', 'nickel', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: RUSH('B_R'), FS: ZONE('goal_L'), SS: ZONE('goal_R'), ...MAN_OUT },
    T(['goalline', 'short', 'balanced'], 'Goal line with nickel personnel: three rushers, safeties in the goal-line zones, corners man.')),
  'Inside the 5 against a spread offence.', 'The safeties sit on the goal line: quick throws meet them at the line.', 'Snag, Goal Line Fade and spread runs.', 'Jumbo Lead and power runs.');

  // ================================================================ base pressure
  add(D('will_fire', 'Will Fire', 'base', { DL1: RUSH('A_L'), LB1: RUSH('B_L'), DL2: RUSH('B_R'), LB2: ZONE('hook_M'), ...THIRDS() },
    T(['blitz', 'zone'], 'The weak linebacker blitzes the left B gap; the other drops to the middle hook; three deep.')),
  'Base pressure on early downs.', 'Four rushers, three deep, one hook: the flats are soft.', 'Y Cross and PA Post.', 'Curl Flat and Swing Screen.');

  add(D('sam_fire', 'Sam Fire', 'base', { DL1: RUSH('B_L'), DL2: RUSH('A_R'), LB2: RUSH('edge_R'), LB1: ZONE('hook_L'), ...THIRDS() },
    T(['blitz', 'zone'], 'The strong-side linebacker blitzes off the right edge; three deep behind.')),
  'Against tight ends who stay in to block on the right.', 'The edge blitz attacks the tight end’s side.', 'PA Boot to the right and slow throws.', 'Quick throws to the right flat.');

  add(D('double_a_zero', 'Double A Zero', 'base', { DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), LB1: RUSH('A_L'), LB2: RUSH('A_R'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky', 'interior'], 'Both linebackers mug the A gaps and come; ends wide; man with no deep safety.', { LB1: [1.5, -0.9], LB2: [1.5, 0.9] })),
  'Third-and-medium from base personnel.', 'Four rushers, three in man, nobody deep: it must get home.', 'QB Draw and slow drops.', 'Quick Slants, RB Screen and Deep Post.');

  add(D('sam_blitz_1', 'Sam Blitz 1', 'base', { DL1: RUSH('B_L'), DL2: RUSH('A_R'), LB2: RUSH('B_R'), LB1: MAN('inside'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'Cover 1 behind a strong-side linebacker blitz through the B gap.')),
  'When the back usually releases to the left.', 'The blitz comes right; the back is free if he goes left.', 'Inside runs to the right and slow drops.', 'Wheel and the back in the flat.');

  add(D('cross_dog', 'Cross Dog', 'base', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: RUSH('B_R'), LB2: RUSH('B_L'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky'], 'The linebackers cross as they blitz, each attacking the far B gap; man with no safety.')),
  'Against protections that pick up linebackers by alignment.', 'The crossing paths break the blocking rules.', 'Slow drops and PA Post.', 'Quick throws and screens.');

  add(D('double_drop_dog', 'Double Drop Dog', 'base', { LB1: RUSH('A_L'), LB2: RUSH('A_R'), DL1: ZONE('hook_L'), DL2: ZONE('hook_R'), ...THIRDS() },
    T(['blitz', 'zone', 'disguise'], 'Both linebackers blitz the A gaps while both linemen drop into the hooks.')),
  'To confuse protection: the rushers are not who the line expects.', 'The linemen sit in the hot lanes over the middle.', 'Quick Slants and Stick.', 'Outside runs and the flats.');

  add(D('stack_blitz', 'Stack Blitz', 'base_stack', { DL1: RUSH('B_L'), DL2: RUSH('A_R'), LB1: RUSH('A_L'), LB2: RUSH('B_R'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'Stacked linebackers come through the gaps their linemen vacate; Cover 1 behind, nobody on the slot.')),
  'Against a slow-developing passing game.', 'Linebackers hidden behind linemen: hard to identify before the snap.', 'Y Cross and PA Shot.', 'Slot throws and the back.');

  add(D('walk_blitz', 'Walk Blitz', 'base_walk', { ...TWO, LB1: RUSH('edge_L'), LB2: MAN('inside'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'The walked-out linebacker blitzes off the left edge; Cover 1 behind.')),
  'Against offences that read the walked linebacker as a cover man.', 'He looks like he is covering the slot, then he comes.', 'PA Boot to the left and slow drops.', 'Quick throws to the left slot.');

  add(D('spy_fire', 'Spy Fire', 'base', { ...TWO, LB1: SPY, LB2: RUSH('A_R'), ...THIRDS() },
    T(['blitz', 'zone', 'anti_scramble'], 'One linebacker blitzes, the other spies; three deep and no underneath zones.')),
  'Pressure on a running quarterback without losing contain.', 'The spy takes the scramble; the flats and hooks are open.', 'QB Draw and scrambles.', 'Stick, Curl Flat and every short throw.');

  add(D('base_zero_press', 'Base Zero Press', 'base_press', { ...TWO, LB1: RUSH('A_L'), LB2: MAN('back'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky', 'press'], 'Corners press, a linebacker blitzes, the safety and the other linebacker take the inside receiver and the back.')),
  'Short yardage passing downs.', 'Press and pressure, no help.', 'Quick throws that need timing.', 'Double Move, Sluggo Seam and Slot Fade.');

  add(D('wide_double_backer', 'Wide Double Backer', 'base_wide', { DL1: RUSH('wide_L'), DL2: RUSH('wide_R'), LB1: RUSH('B_L'), LB2: RUSH('B_R'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'Both ends very wide, both linebackers through the B gaps; Cover 1 on the outside receivers.')),
  'All-out pass rush with a safety still deep.', 'Four rushers in four lanes; the inside receiver and the back are open.', 'Slow drops and PA Shot.', 'TE Seam, the back and quick inside throws.');

  add(D('base_cat', 'Base Cat', 'base', { ...TWO, CB2: RUSH('edge_R'), LB2: MAN('wideR'), LB1: MAN('inside'), CB1: MAN('wideL'), FS: ZONE('deep_middle') },
    T(['blitz', 'man'], 'The right corner blitzes off the edge; a linebacker takes his receiver; Cover 1 behind.', { CB2: [2, 12], LB2: [6, 14] })),
  'Surprise pressure from the right boundary.', 'The linebacker on a receiver is the mismatch to watch.', 'Slow throws from the right side.', 'Quick throws and fades to the right.');

  add(D('safety_fire_two', 'Safety Fire Two', 'base', { ...TWO, FS: RUSH('A_R'), LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'disguise'], 'The free safety blitzes; the corners bail to deep halves and the linebackers drop to the hooks.')),
  'To blitz the safety without losing the deep halves.', 'The corners play deep; the flats are empty.', 'Deep Post and slow drops.', 'Curl Flat, Bubble Screen and the flats.');

  add(D('corners_deep_blitz', 'Corners Deep Blitz', 'base', { ...TWO, LB1: RUSH('A_L'), LB2: RUSH('B_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R'), FS: ZONE('hole') },
    T(['blitz', 'zone'], 'Both linebackers blitz; the corners play deep halves and the safety sits in the hole.')),
  'Against vertical teams when you want four rushers.', 'Two deep and a hole defender: the flats are the weak spot.', 'Four Verticals and Deep Post.', 'Bubble Screen and Curl Flat.');

  add(D('walk_zone_blitz', 'Walk Zone Blitz', 'base_walk', { LB1: RUSH('edge_L'), DL1: ZONE('curl_flat_L'), DL2: RUSH('B_R'), LB2: RUSH('A_R'), ...THIRDS() },
    T(['blitz', 'zone', 'disguise'], 'The walked linebacker blitzes off the edge while the left lineman drops under him into the curl-flat.')),
  'Against hot throws to the left.', 'The lineman lands where the hot route goes.', 'Quick Slants and Bubble Screen to the left.', 'Throws to the right flat.');

  add(D('base_spy_zero', 'Base Spy Zero', 'base', { ...TWO, LB1: SPY, LB2: MAN('back'), ...MAN_OUT, FS: MAN('inside') },
    T(['pass', 'man', 'risky', 'anti_scramble'], 'Man on everyone with a spy, and nobody deep.')),
  'Against a running quarterback with weak receivers.', 'Every receiver covered, the quarterback spied: no deep help at all.', 'QB Draw and scrambles.', 'Deep Post and Double Move.');

  add(D('base_max_drop', 'Base Max Drop', 'base', { DL1: RUSH('A_M'), DL2: ZONE('hook_M'), LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), ...THIRDS() },
    T(['pass', 'zone', 'long'], 'One rusher, three hook defenders and three deep from base personnel.')),
  '3rd-and-very-long with base personnel on the field.', 'The middle is covered three times; the quarterback must hold it.', 'Dagger, Levels and Stick.', 'QB Draw and screens.');

  add(D('base_prevent', 'Base Prevent', 'base', { ...TWO, LB1: ZONE('curl_flat_L'), LB2: ZONE('curl_flat_R'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_center') },
    T(['pass', 'zone', 'deep', 'prevent'], 'Corners in deep quarters, the safety at twenty yards, linebackers keeping everything in front.', { FS: [18, 0] })),
  'Late in a half with a lead and base personnel.', 'Let them have the short throw; tackle and keep the clock running.', 'Hail Mary and Deep Post.', 'Stick, Curl Flat and every short throw.');

  add(D('base_spy_prevent', 'Base Spy Prevent', 'base', { ...TWO, LB1: SPY, LB2: ZONE('hole'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_center') },
    T(['pass', 'zone', 'deep', 'prevent', 'anti_scramble'], 'Deep prevent with one linebacker spying and the other in the hole.', { FS: [18, 0] })),
  'Late-game prevent against a scrambler.', 'Deep defenders take the shots, the spy takes the run.', 'Scrambles and Hail Mary.', 'Short completions underneath.');

  add(D('wide_contain_3', 'Wide Contain 3', 'base_wide', { DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), ...THIRDS() },
    T(['pass', 'zone', 'anti_scramble', 'anti_outside'], 'Wide ends keep contain, two hooks and three deep: keep the quarterback in the pocket.')),
  'Against a quarterback who extends plays outside the pocket.', 'Nobody rushes upfield past him; he has to throw from the pocket.', 'PA Boot, Waggle and scrambles.', 'Quick passes with time and QB Draw.');

  // ================================================================ heavy pressure
  add(D('heavy_fire', 'Heavy Fire', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: RUSH('B_L'), LB2: ZONE('hook_M'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'run'], 'Three linemen and a linebacker rush; the other linebacker drops to the hook and the corners split the deep field.')),
  'Short yardage when a pass is likely.', 'Four rushers, two deep, one hook: the flats are open.', 'Inside runs and PA Post.', 'Bubble Screen and Curl Flat.');

  add(D('heavy_zero', 'Heavy Zero', 'heavy', { ...THREE, LB1: RUSH('A_R'), LB2: MAN('inside'), ...MAN_OUT },
    T(['blitz', 'man', 'risky'], 'Four rush from the heavy front, man on three receivers, no safety.')),
  'Goal line and short yardage against play action.', 'Everyone is covered except the back.', 'Power, Dive and play action to the receivers.', 'The back in the flat and Swing Screen.');

  add(D('heavy_contain', 'Heavy Contain', 'heavy_wide', { DL1: RUSH('wide_L'), DL3: RUSH('A_M'), DL2: RUSH('wide_R'), LB1: CONTAIN('contain_L'), LB2: CONTAIN('contain_R'), ...MAN_OUT },
    T(['run', 'anti_outside', 'anti_scramble'], 'Wide linemen rush, both linebackers keep contain outside them; man on the receivers.')),
  'Against option teams and bootlegs.', 'Nothing escapes outside; the inside is thin.', 'Speed Option, PA Boot and Toss Sweep.', 'Inside Zone and Duo.');

  add(D('heavy_spy_blitz', 'Heavy Spy Blitz', 'heavy', { ...THREE, LB1: SPY, LB2: RUSH('A_R'), ...MAN_OUT },
    T(['blitz', 'man', 'anti_scramble'], 'Three linemen and a linebacker rush; the other linebacker spies; man on two receivers.')),
  'Against quarterback runs in short yardage.', 'The spy has the quarterback; the inside receiver is uncovered.', 'QB Power, QB Sneak and QB Counter.', 'Passes to the tight end.');

  add(D('heavy_storm', 'Heavy Storm', 'heavy_stack', { DL1: RUSH('A_L'), DL3: RUSH('A_M'), DL2: RUSH('A_R'), LB1: RUSH('B_L'), LB2: RUSH('B_R'), ...MAN_OUT },
    T(['blitz', 'run', 'goalline', 'risky'], 'Five rushers into every inside gap; corners alone in man.')),
  'Fourth-and-one: stop the run at the line.', 'Everyone attacks a gap; a pass to the tight end is open.', 'Dive, Duo, QB Sneak and Iso.', 'PA passes and outside runs.');

  add(D('heavy_halves_fire', 'Heavy Halves Fire', 'heavy', { DL1: RUSH('edge_L'), DL3: RUSH('A_M'), DL2: RUSH('edge_R'), LB1: RUSH('A_L'), LB2: RUSH('A_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'risky'], 'Five rushers from the heavy front with both corners in deep halves.')),
  'When the offence is in max protection.', 'Five rushers, two deep, nothing underneath.', 'PA Shot and long drops.', 'Every short throw.');

  add(D('heavy_sim', 'Heavy Sim', 'heavy', { DL3: ZONE('hook_M'), LB1: RUSH('A_L'), LB2: RUSH('A_R'), DL1: RUSH('B_L'), DL2: RUSH('B_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'disguise'], 'The nose tackle drops into the hook while both linebackers blitz the A gaps.')),
  'To confuse protections against heavy sets.', 'The big man sits where the quick throw goes.', 'Tight Stick Flat and quick inside throws.', 'Outside runs and the flats.');

  add(D('heavy_wide_two', 'Heavy Wide Two', 'heavy_wide', { DL1: RUSH('wide_L'), DL3: RUSH('A_M'), DL2: RUSH('wide_R'), LB1: ZONE('hook_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['pass', 'zone'], 'Wide three-man rush, two hooks and two deep halves.')),
  'Heavy personnel on a passing down.', 'The rush is wide; the middle hooks take inside throws.', 'Dagger and Stick.', 'Curl Flat and outside throws.');

  add(D('heavy_fire_zone', 'Heavy Fire Zone', 'heavy', { DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: ZONE('curl_flat_R'), LB2: RUSH('edge_R'), LB1: ZONE('hook_L'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['blitz', 'zone', 'disguise'], 'The right lineman drops into the curl-flat as the linebacker blitzes off the edge behind him.')),
  'Against hot throws to the tight end side.', 'The dropping lineman lands on the hot route.', 'Tight Slant Flat and quick throws to the right.', 'Throws to the left.');

  add(D('goal_line_zone', 'Goal Line Zone', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: ZONE('goal_L'), LB2: ZONE('goal_R'), ...MAN_OUT },
    T(['goalline', 'short', 'zone'], 'Three linemen in the gaps, linebackers in the goal-line zones, corners in man.')),
  'Inside the 5 against play action.', 'Linebackers read run, then drop to the goal line.', 'Goal Line PA Arrow and Tight End Pop.', 'Power and Jumbo Lead.');

  add(D('goal_line_fire', 'Goal Line Fire', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: RUSH('B_L'), LB2: RUSH('edge_R'), ...MAN_OUT },
    T(['goalline', 'blitz', 'risky'], 'Five rushers at the goal line, corners in man, nobody on the tight end.')),
  'Fourth-and-goal from the 1.', 'Everyone attacks the backfield; a pass to the tight end is the risk.', 'Power, Dive and QB Sneak.', 'Tight End Pop and Goal Line PA Arrow.');

  add(D('goal_line_spy', 'Goal Line Spy', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: SPY, LB2: MAN('inside'), ...MAN_OUT },
    T(['goalline', 'man', 'anti_scramble'], 'Goal-line front with a linebacker spying a running quarterback.')),
  'Inside the 5 against a quarterback who runs.', 'The spy takes the quarterback keep; the back is the linemen’s job.', 'QB Power and Zone Read.', 'The back on a lead play.');

  add(D('goal_line_hole', 'Goal Line Hole', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: ZONE('goal_L'), ...MAN_OUT },
    T(['goalline', 'man', 'short'], 'Man on three receivers with a linebacker sitting in the left goal-line zone.')),
  'Goal line against rub routes.', 'The zone linebacker picks up whoever comes free from the rub.', 'Bunch Snag and Whip Corner.', 'Inside runs, one fewer in the box.');

  add(D('heavy_edge_contain', 'Heavy Edge Contain', 'heavy', { DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), DL3: RUSH('A_M'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), ...MAN_OUT },
    T(['run', 'anti_outside'], 'Ends set the edges, the nose takes the middle, linebackers fill.')),
  'Against sweeps and outside zone from heavy sets.', 'Everything is turned back inside to the linebackers.', 'Toss Sweep, Buck Sweep and Outside Zone.', 'Inside runs and quick passes.');

  add(D('pinch_spill', 'Pinch and Spill', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_M'), DL2: RUSH('A_R'), LB1: CONTAIN('contain_L'), LB2: CONTAIN('contain_R'), ...MAN_OUT },
    T(['run', 'interior', 'anti_outside'], 'All three linemen pinch the inside gaps; the linebackers play outside them.')),
  'Against inside runs that bounce.', 'The pinch spills the back outside, right into the linebackers.', 'Inside Zone, Duo and Iso.', 'Quick passes and play action.');

  add(D('eight_man_front', 'Eight Man Front', 'heavy_wide', { DL1: RUSH('wide_L'), DL3: RUSH('A_M'), DL2: RUSH('wide_R'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), ...MAN_OUT },
    T(['run', 'short'], 'Wide linemen and linebackers close to the line: everyone in the box but the corners.')),
  'Obvious run downs.', 'The corners are alone: one play-action shot beats it.', 'Power, Dive and Inside Zone.', 'PA Shot and Max Shot.');

  // ================================================================ pressure package
  add(D('four_rush_three_deep', 'Four Rush Three Deep', 'pressure', { DL1: RUSH('B_L'), DL3: RUSH('A_R'), DL2: RUSH('edge_R'), LB1: RUSH('A_L'), ...THIRDS() },
    T(['blitz', 'zone', 'risky'], 'Four rushers, three deep thirds and nothing underneath.')),
  'Against long-developing throws.', 'All the short throws are open: tackle well.', 'Deep Post and Three Verticals.', 'Quick Slants, Stick and screens.');

  add(D('mug_sim', 'Mug Sim', 'pressure_mug', { DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: RUSH('A_L'), DL3: ZONE('hook_M'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man', 'disguise'], 'The mugged linebacker blitzes while the nose drops into the hook; man outside, one deep.')),
  'Against a quarterback who throws hot to the middle.', 'The dropping nose takes away the hot read.', 'Quick Slants and Stick.', 'The inside receiver up the seam.');

  add(D('mug_zero', 'Mug Zero', 'pressure_mug', { DL1: RUSH('B_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: RUSH('A_L'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky'], 'The mugged linebacker comes with three linemen; man with no safety, nobody on the back.')),
  'Third-and-short when you need a sack.', 'Four rushers, three in man: the back is the free receiver.', 'Slow drops.', 'Wheel, RB Screen and Swing Screen.');

  add(D('wide_spy', 'Wide Spy', 'pressure_wide', { DL1: RUSH('wide_L'), DL3: RUSH('A_M'), DL2: RUSH('wide_R'), LB1: SPY, ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['pass', 'man', 'anti_scramble'], 'Three wide rushers, a spy, man on the outside receivers and one deep safety.')),
  'Against a mobile quarterback in passing downs.', 'The rush is wide so the spy owns the middle.', 'QB Draw and scrambles.', 'The inside receiver uncovered in the slot.');

  add(D('boundary_fire', 'Boundary Fire', 'pressure', { ...THREE, CB2: RUSH('edge_R'), CB1: ZONE('deep_half_L'), FS: ZONE('deep_half_R'), LB1: ZONE('hook_M') },
    T(['blitz', 'zone'], 'The right corner blitzes; the left corner and the free safety split the deep field; one hook.', { CB2: [2, 12] })),
  'Surprise pressure from the right edge.', 'The safety rotates over the vacated corner; the right flat is open.', 'Slow throws from the right side.', 'Bubble Screen and Swing Screen to the right.');

  add(D('middle_rotate', 'Middle Rotate', 'pressure', { DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), FS: RUSH('A_R'), LB1: ZONE('deep_middle'), ...MAN_OUT },
    T(['blitz', 'man', 'disguise'], 'The free safety blitzes and the linebacker runs back to the deep middle.')),
  'To get the safety into the rush and still have someone deep.', 'The linebacker must turn and run at the snap.', 'Slow drops and PA Post.', 'TE Seam and the slot.');

  add(D('left_overload_zero', 'Left Overload Zero', 'pressure', { LB1: RUSH('edge_L'), DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), ...MAN_OUT, FS: MAN('inside') },
    T(['blitz', 'man', 'risky'], 'Three rushers from the left side and one from the right; man with no safety.')),
  'Against protections that slide right.', 'The left side is overloaded; a quick throw left beats it.', 'Slow drops and right-handed boots.', 'Quick Slants and screens to the left.');

  add(D('spy_three_deep', 'Spy Three Deep', 'pressure', { ...THREE, LB1: SPY, ...THIRDS() },
    T(['pass', 'zone', 'anti_scramble'], 'Three rushers, a spy and three deep thirds; nothing in the short zones.')),
  'Against a scrambling quarterback on long downs.', 'The short field is open; the spy keeps him in the pocket.', 'Scrambles, QB Draw and deep shots.', 'Stick, Curl Flat and every short throw.');

  add(D('contain_zero', 'Contain Zero', 'pressure', { DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), DL3: RUSH('A_M'), LB1: MAN('back'), ...MAN_OUT, FS: MAN('inside') },
    T(['pass', 'man', 'anti_scramble', 'risky'], 'Ends keep contain, the nose rushes, man on everyone and no safety.')),
  'Against a quarterback who runs when pressured.', 'The pocket is pushed from the middle only.', 'Scrambles and PA Boot.', 'Deep throws with time.');

  add(D('wide_fire', 'Wide Fire', 'pressure_wide', { DL1: RUSH('wide_L'), DL3: RUSH('A_M'), DL2: RUSH('wide_R'), LB1: RUSH('A_L'), ...THIRDS() },
    T(['blitz', 'zone'], 'Three wide linemen and the linebacker rush; three deep thirds behind.')),
  'Against pocket passers in long yardage.', 'Four rushers from all angles; nothing short is covered.', 'Deep Post and slow drops.', 'Quick Slants and screens.');

  add(D('mug_rotate', 'Mug Rotate', 'pressure_mug', { ...THREE, LB1: RUSH('A_L'), CB1: ZONE('deep_half_L'), FS: ZONE('deep_half_R'), CB2: ZONE('flat_R') },
    T(['blitz', 'zone', 'disguise'], 'The mugged linebacker blitzes; the left corner and free safety rotate to deep halves; the right corner squats.')),
  'Pressure with a two-deep shell behind it.', 'Two deep and one flat defender: the middle is open.', 'Deep Post and verticals.', 'Stick and Dagger.');

  // ================================================================ run fronts and situational (base)
  add(D('okie_front', 'Okie Front', 'base', { ...TWO, LB1: ZONE('short_L'), LB2: ZONE('short_R'), ...MAN_OUT, FS: ZONE('robber') },
    T(['run', 'balanced'], 'Two linemen in the B gaps, linebackers fill the A gaps, the safety comes down as an extra run defender.')),
  'Early downs against a balanced offence that likes to run.', 'Eight men near the box; the corners are on islands.', 'Inside Zone, Dive and Trap.', 'PA Post, Deep Post and Slot Fade.');

  add(D('under_front', 'Under Front', 'base_wide', { DL1: RUSH('B_L'), DL2: RUSH('A_R'), LB1: ZONE('short_R'), LB2: ZONE('hook_L'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'balanced'], 'The line shifts away from the tight end; the linebackers fill toward it.')),
  'Against strong-side runs.', 'The weak side is thin; runs away from the tight end can hit.', 'Power Right and Belly.', 'Power Left and weak-side zone.');

  add(D('over_front', 'Over Front', 'base', { DL1: RUSH('A_L'), DL2: RUSH('edge_R'), LB1: ZONE('short_L'), LB2: ZONE('robber'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'balanced'], 'The line shifts toward the tight end side; the linebackers balance it.')),
  'Against tight-end-side runs and play action.', 'The right end plays wide; the middle linebacker robs.', 'Outside Zone and PA Boot to the right.', 'Counter and runs to the left.');

  add(D('scrape_exchange', 'Scrape Exchange', 'base', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: CONTAIN('contain_L'), LB2: CONTAIN('contain_R'), ...MAN_OUT, FS: ZONE('robber') },
    T(['run', 'anti_outside'], 'Both linemen slant inside while the linebackers scrape outside them to take the edges.')),
  'Against read option and zone read.', 'The read man sees the end crash and keeps, right into the scraping linebacker.', 'Read Option, Pistol Zone Read and Speed Option.', 'Inside runs that hit before the scrape.');

  add(D('stack_run_blitz', 'Stack Run Blitz', 'base_stack', { DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: RUSH('A_L'), LB2: RUSH('A_R'), ...MAN_OUT, FS: ZONE('short_M') },
    T(['run', 'blitz', 'interior'], 'Stacked linebackers blitz the A gaps on the snap; the safety comes down to fill behind them.')),
  'When you are certain it is a run.', 'Every inside gap is attacked; play action is the danger.', 'Inside Zone, Dive, Duo and Trap.', 'PA Shot, Yankee and outside runs.');

  add(D('option_squeeze', 'Option Squeeze', 'base', { DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), LB1: SPY, LB2: ZONE('short_M'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'anti_outside', 'anti_scramble'], 'Ends squeeze the option from outside, one linebacker spies the quarterback, the other fills.')),
  'Against option offences.', 'Everyone has one option player: end, spy, filler.', 'Speed Option, Option Pitch and Inverted Veer.', 'Passes, the corners are alone.');

  add(D('draw_squeeze', 'Draw Squeeze', 'base', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: ZONE('short_M'), LB2: ZONE('hook_M'), ...THIRDS() },
    T(['run', 'zone', 'interior'], 'Both linemen pinch the centre and two linebackers sit in the middle: built for the draw.')),
  'Third-and-medium against draw-happy teams.', 'The middle is crowded; outside throws are open.', 'QB Draw, Lead Draw and Spread Draw.', 'Curl Flat, outs and outside runs.');

  add(D('nickel_box', 'Nickel Box', 'nickel', { ...TWO, LB1: ZONE('short_M'), SS: ZONE('short_R'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['run', 'balanced'], 'Nickel personnel playing the run: the strong safety drops into the box.', { SS: [4, 4] })),
  'Against spread runs when you are in nickel.', 'Seven men near the box with one deep safety.', 'Inside Zone and Trips Weak Zone.', 'Play action and the slot vertically.');

  add(D('crash_contain', 'Crash Contain', 'pressure', { DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: RUSH('B_R'), LB1: CONTAIN('contain_R'), ...MAN_OUT, FS: ZONE('robber') },
    T(['run', 'anti_outside'], 'Three linemen crash inside; the linebacker keeps contain to the right; the safety robs.')),
  'Against runs to the right edge.', 'The crash clogs the middle; the right edge is sealed.', 'Toss Sweep and Outside Zone to the right.', 'Runs and boots to the left.');

  add(D('tampa_spy', 'Tampa Spy', 'nickel', { DL1: SPY, DL2: RUSH('A_R'), LB1: ZONE('deep_middle'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R') },
    T(['pass', 'zone', 'anti_scramble'], 'Tampa 2 behind one rusher, with a lineman dropping to spy the quarterback.')),
  'Against a scrambler who also throws the seam.', 'The linebacker takes the deep middle; the big man spies.', 'TE Seam, scrambles and QB Draw.', 'Any throw with time: one rusher only.');

  add(D('bear_spy', 'Bear Spy', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: SPY, LB2: ZONE('short_R'), ...MAN_OUT },
    T(['run', 'anti_scramble'], 'Bear front over the centre and guards, one linebacker spying, the other filling right.', { DL1: [1, -1.6], DL3: [1, 0.9], DL2: [1, 2.6] })),
  'Against a quarterback who runs inside from tight sets.', 'The bear front takes away the inside run; the spy takes the keep.', 'QB Power, Midline Read and inside runs.', 'Toss Sweep and outside runs.');

  add(D('bear_halves', 'Bear Halves', 'heavy', { DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: ZONE('short_L'), LB2: ZONE('hook_R'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R') },
    T(['run', 'zone'], 'Bear front with the corners bailing to deep halves to stop the play-action shot.', { DL1: [1, -1.6], DL3: [1, 0.9], DL2: [1, 2.6] })),
  'Run downs when a play-action shot is likely.', 'The bear stops the inside run; the corners stop the shot.', 'Inside runs and PA Shot.', 'The flats and quick outs.');

  add(D('nickel_spy_fire', 'Nickel Spy Fire', 'nickel', { ...TWO, LB1: SPY, SS: RUSH('edge_R'), ...THIRDS() },
    T(['blitz', 'zone', 'anti_scramble'], 'The strong safety blitzes off the edge, the linebacker spies, three deep.', { SS: [3, 7] })),
  'Flush a mobile quarterback and wait for him.', 'The edge blitz pushes him up into the spy.', 'Scrambles and PA Boot.', 'Stick and short throws, nobody underneath.');

  add(D('weak_blitz_robber', 'Weak Blitz Robber', 'base', { ...TWO, LB1: RUSH('A_L'), LB2: ZONE('robber'), ...MAN_OUT, FS: ZONE('deep_middle') },
    T(['blitz', 'man', 'trap'], 'The weak linebacker blitzes; the other robs the middle; man outside, one deep.')),
  'Base pressure against hot slants.', 'The hot throw goes into the robber.', 'Quick Slants and Stick thrown hot.', 'The back and the tight end vertically.');

  add(D('stack_goal_line', 'Stack Goal Line', 'base_stack', { DL1: RUSH('A_L'), DL2: RUSH('A_R'), LB1: RUSH('B_L'), LB2: RUSH('B_R'), ...MAN_OUT, FS: ZONE('goal_R') },
    T(['goalline', 'blitz', 'run'], 'Four rushers into the inside gaps at the goal line, man outside, the safety at the right goal line.')),
  'Goal line from base personnel.', 'Everyone attacks; the safety helps against the pass to the right.', 'Dive, Iso and Jumbo Lead.', 'Passes to the left and the tight end.');

  return { plays, lessons };
}
