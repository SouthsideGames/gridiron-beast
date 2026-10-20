// Reserve batch 2: quick game, screens and short passes (see ../playbook-reserve.js).

export default function batch(b) {
  const { offense: O, R, BLOCK, STALK, RELEASE, FAKE, PA } = b;
  const PASS = (hold) => (hold ? { a: 'pass', hold } : { a: 'pass' });
  const plays = []; const lessons = {};
  const add = (play, when, watch, beats, loses) => { plays.push(play); lessons[play.id] = { when, watch, beats, loses }; };
  const P = (primary, progression, drop, tags, desc, extra = {}) => ({ primary, progression, drop, tags: ['pass', ...tags], desc, ...extra });

  // ---- rhythm throws
  add(O('spacing', 'Spacing', 'gun_spread', { QB: PASS(), WR1: R('sit'), WR3: R('sit'), WR2: R('speed_out'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'RB', 'WR1'], 'quick', ['quick', 'short', 'zone_beater'], 'Receivers settle five yards deep spread across the field; the quarterback throws to the open window.')),
  'A safe completion on 2nd-and-short or against soft zones.', 'Find the defender who is between two receivers and throw away from him.', 'Cover 3, Cover 4 and Max Drop.', 'Man Press and Cover 0.');

  add(O('trips_spacing', 'Trips Spacing', 'spread_trips_rt', { QB: PASS(), WR1: R('hitch'), WR2: R('sit'), WR3: R('arrow'), RB: R('drift'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR3', 'WR1', 'RB'], 'quick', ['quick', 'short', 'zone_beater'], 'Three receivers right stretch the flat at three spots; the back drifts into the middle as an outlet.')),
  'Against a defence with two defenders over three receivers.', 'Count the defenders over trips: three receivers against two means someone is open.', 'Cover 2 Zone and Cover 3.', 'Cover 6 rotated to trips.');

  add(O('empty_sit', 'Empty Sit', 'empty_2x2', { QB: PASS(), WR1: R('hitch'), WR3: R('sit'), RB: R('sit'), WR2: R('hitch'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'RB', 'WR1', 'WR2'], 'quick', ['quick', 'short'], 'Empty set, four quick sit and hitch routes: the ball is out before any rush arrives.')),
  'Against blitzes when you want four quick answers.', 'The quarterback picks a side before the snap and throws on his third step.', 'Fire Zone, Zone Blitz and DB Blitz.', 'Man Press and Cover 2 Man.');

  add(O('snag', 'Snag', 'spread_trips_rt', { QB: PASS(), WR1: R('corner'), WR2: R('snag'), WR3: R('arrow'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR3', 'WR1'], 'three', ['short', 'zone_beater'], 'A triangle on one defender: corner high, snag in the middle, arrow to the flat.')),
  'Red zone and 3rd-and-short against zone.', 'Read the flat defender: he takes the arrow, throw the snag; he sinks, throw the arrow.', 'Cover 3 and Cover 2 Zone.', 'Cover 1, man defenders run with every route.');

  add(O('bunch_snag', 'Bunch Snag', 'pro_bunch', { QB: PASS(), WR2: R('corner'), TE: R('snag'), WR1: R('arrow'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'WR2', 'RB'], 'three', ['short', 'zone_beater', 'man_beater'], 'The snag triangle from a tight bunch, so the receivers rub defenders as they release.')),
  'Against man coverage when you need a rub to get open.', 'The bunch releases on different paths; a defender trailing a receiver gets caught in traffic.', 'Cover 1, Man Press and Goal Line Man.', 'Robber and Cover 4.');

  add(O('empty_snag', 'Empty Snag', 'empty_trips', { QB: PASS(), WR2: R('corner'), RB: R('snag'), WR3: R('arrow'), WR1: R('slant'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR3', 'WR2', 'WR1'], 'three', ['short', 'zone_beater'], 'Snag from an empty trips set with the back as the snag route and a backside slant.')),
  'When a linebacker has to cover the back in space.', 'The back settles in the hole between the linebacker and the flat defender.', 'Cover 3 and Tampa 2.', 'Cover 1 Robber.');

  add(O('all_hitch', 'All Hitch', 'gun_spread', { QB: PASS(), WR1: R('hitch'), WR2: R('hitch'), WR3: R('hitch'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1', 'RB'], 'quick', ['quick', 'short'], 'Every receiver runs a six-yard hitch; the back swings as the outlet.')),
  'When the corners play off and give up the cushion.', 'Throw on time to the receiver whose corner is deepest.', 'Cover 3, Cover 4 and Prevent.', 'Man Press and Cover 2 Zone corners squatting.');

  add(O('quick_outs', 'Quick Outs', 'empty_2x2', { QB: PASS(), WR1: R('speed_out'), WR3: R('slant'), RB: R('slant'), WR2: R('speed_out'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'RB', 'WR1', 'WR3'], 'quick', ['quick', 'short', 'two_minute'], 'Outs outside, slants inside on both sides: a quick answer whichever way the defence leans.')),
  'Two-minute drill: completions that stop the clock.', 'The outside out is the clock-stopper; the slant is there if the corner jumps the out.', 'Cover 3 and Cover 4.', 'Cover 2 Zone with corners sitting in the flats.');

  add(O('twins_speed_out', 'Twins Speed Out', 'gun_twins_rt', { QB: PASS(), WR2: R('speed_out'), WR1: R('seam'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'quick', ['quick', 'short', 'two_minute'], 'The slot runs a seam to lift the defender; the outside receiver breaks out underneath.')),
  'Sideline completions against off coverage.', 'If the seam pulls the flat defender up the field, the out is wide open.', 'Cover 3 and Cover 4.', 'Cover 2 Zone and Cover 6.');

  add(O('slant_flat', 'Slant Flat', 'gun_twins_rt', { QB: PASS(), WR2: R('slant'), WR1: R('arrow'), TE: R('stick'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'quick', ['quick', 'short', 'man_beater'], 'Outside receiver slants inside while the slot runs to the flat, crossing the defenders’ paths.')),
  'Against press man coverage.', 'The two routes cross: the slant goes over the arrow, so a man defender has to fight through.', 'Man Press, Cover 1 and Cover 0.', 'Robber and Cover 2 Zone.');

  add(O('tight_slant_flat', 'Tight Slant Flat', 'tight_twins', { QB: PASS(), WR1: R('slant'), TE: R('arrow'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'RB'], 'quick', ['quick', 'short'], 'From a three-lineman set, the receiver slants while the tight end releases to the flat underneath.')),
  'When the defence crowds the box against your tight personnel.', 'The tight end clears the flat defender out; the slant comes open behind him.', 'Run Wall and Bear Front.', 'Robber and Cover 2 Zone.');

  add(O('hitch_seam', 'Hitch Seam', 'spread_left', { QB: PASS(), WR1: R('hitch'), WR3: R('seam'), WR2: R('hitch'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2', 'RB'], 'three', ['short', 'medium', 'zone_beater'], 'Outside hitches hold the corners while the left slot attacks the seam.')),
  'Against two deep safeties who split wide.', 'If the safety widens with the hitch, the seam is open behind the linebacker.', 'Cover 2 Zone and Cover 4.', 'Cover 3 with a middle safety.');

  add(O('trips_hitch_seam', 'Trips Hitch Seam', 'pro_trips', { QB: PASS(), WR2: R('hitch'), WR1: R('seam'), TE: R('hitch'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE', 'RB'], 'three', ['short', 'medium'], 'Hitches outside and inside with the trips middle man splitting them up the seam.')),
  'When a single safety has to choose between trips and the backside.', 'The seam runs right at the safety: he jumps it, throw a hitch.', 'Cover 3 and Cover 1.', 'Cover 4.');

  add(O('stick_nod', 'Stick Nod', 'tight_twins', { QB: PASS(1.0), TE: R('stick_nod'), WR1: R('speed_out'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'RB'], 'three', ['medium', 'man_beater'], 'The tight end shows the stick route, then turns it upfield past a defender who jumped it.')),
  'After Stick has worked a few times.', 'The nod: tight end sells the sit, then runs past the linebacker driving on it.', 'Cover 3 and linebackers who sit on Stick.', 'Cover 4 and Cover 2 Zone.');

  add(O('fade_out', 'Fade Out', 'pro_trips', { QB: PASS(), WR2: R('fade'), WR1: R('speed_out'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'quick', ['short', 'deep', 'man_beater'], 'Outside fade with the slot running out underneath: a high-low on the corner.')),
  'Against a pressed corner on the outside.', 'If the corner sinks with the fade, throw the out; if he sits, throw the fade over him.', 'Man Press and Cover 2 Zone.', 'Cover 3, the corner has deep help.');

  add(O('twins_fade_out', 'Twins Fade Out', 'ace_twins', { QB: PASS(), WR1: R('fade'), WR2: R('speed_out'), TE: R('flat'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE'], 'quick', ['short', 'deep', 'man_beater'], 'Under centre with twins left: fade outside, out from the slot, tight end to the flat on the other side.')),
  'When the defence leaves the twins side one-on-one.', 'The quarterback picks the twins side pre-snap and throws on rhythm.', 'Cover 1 and Man Press.', 'Cover 2 Zone and Cover 6.');

  add(O('bunch_whip', 'Bunch Whip', 'trips_bunch', { QB: PASS(), WR1: R('whip'), WR3: R('go'), WR2: R('arrow'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'WR3'], 'quick', ['quick', 'short', 'man_beater'], 'From a bunch: the inside receiver steps in and whips back out under a vertical and an arrow.')),
  'Against man coverage near the sticks.', 'The whip: two steps in, then snap back outside away from the defender.', 'Cover 1 and Cover 0.', 'Cover 2 Zone, the flat is occupied.');

  add(O('whip_corner', 'Whip Corner', 'pro_bunch', { QB: PASS(), WR1: R('whip'), WR2: R('corner'), TE: R('sit'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE', 'RB'], 'three', ['short', 'man_beater'], 'Whip underneath with a corner over the top from a tight bunch.')),
  'Red zone against man: rubs and a corner route to the pylon.', 'The corner route clears space for the whip; if the corner defender jumps the whip, throw over him.', 'Man Press and Goal Line Man.', 'Cover 4 and Robber.');

  add(O('y_pivot', 'Y Pivot', 'pro_bunch', { QB: PASS(), TE: R('pivot'), WR1: R('arrow'), WR2: R('go'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'WR2'], 'three', ['short', 'man_beater'], 'The tight end fakes outside then pivots back inside, away from the defender who bit.')),
  'Against linebackers in man coverage on your tight end.', 'The pivot: two steps out, plant, back to the middle. Throw it as he turns.', 'Cover 1 and Cover 2 Man.', 'Robber and Tampa 2.');

  add(O('pivot_seam', 'Pivot Seam', 'empty_trips', { QB: PASS(), RB: R('pivot'), WR3: R('seam'), WR2: R('hitch'), WR1: R('hitch'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR3', 'WR2', 'WR1'], 'three', ['short', 'man_beater'], 'Empty trips: the back pivots under a seam with hitches on both outsides.')),
  'When a linebacker is matched up on the back in an empty set.', 'The seam pulls the safety; the back pivots under the linebacker.', 'Cover 1 and Cover 0.', 'Cover 3 and Tampa 2.');

  add(O('double_quick_post', 'Double Quick Post', 'gun_pro', { QB: PASS(), WR1: R('quick_post'), WR2: R('quick_post'), RB: R('arrow'), TE: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'RB'], 'three', ['short', 'medium'], 'Both outside receivers run a short post behind the linebackers; the tight end stays in to block.')),
  'Against blitzes that leave the middle empty behind them.', 'Throw the post that breaks away from the deep safety.', 'Fire Zone and Safety Blitz.', 'Cover 2 Zone and Robber.');

  add(O('pro_stick', 'Wing Stick', 'gun_wing', { QB: PASS(), TE: R('stick'), RB: R('arrow'), WR2: R('fade'), WR1: R('slant'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'RB', 'WR1', 'WR2'], 'quick', ['quick', 'short'], 'The wing tight end sits at the sticks, the back runs to the flat, the outside receiver clears with a fade.')),
  '2nd-and-medium chain mover.', 'The tight end finds the hole between linebacker and flat defender and turns to face the quarterback.', 'Cover 3 and Cover 4.', 'Tampa 2.');

  add(O('empty_stick', 'Empty Stick', 'empty_2x2', { QB: PASS(), RB: R('stick'), WR3: R('stick'), WR2: R('fade'), WR1: R('slant'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR3', 'WR1', 'WR2'], 'quick', ['quick', 'short'], 'Stick routes from both slots in an empty set: two inside answers on the third step.')),
  'Quick 3rd-and-4 against zone.', 'Pick the stick away from the linebacker and throw it on time.', 'Cover 3 and Max Drop.', 'Double A Mug and Cover 0.');

  add(O('twins_curl_flat', 'Twins Curl Flat', 'gun_twins_rt', { QB: PASS(), WR2: R('curl'), WR1: R('arrow'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'three', ['short', 'zone_beater'], 'Curl outside with the slot to the flat beneath it, a high-low on the flat defender.')),
  'Against Cover 3 on the twins side.', 'Throw the curl if the flat defender jumps the arrow; otherwise the arrow.', 'Cover 3.', 'Cover 2 Man.');

  add(O('slant_seam', 'Slant Seam', 'spread_left', { QB: PASS(), WR1: R('slant'), WR3: R('seam'), WR2: R('slant'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2', 'RB'], 'quick', ['quick', 'short', 'medium'], 'Twin slants outside with the left slot running a seam between them.')),
  'Against single-high defences that sit underneath.', 'The seam holds the linebacker deep; the slant comes open under him.', 'Cover 1 and Cover 3.', 'Robber.');

  add(O('pistol_smash', 'Pistol Smash', 'pistol_twins', { QB: PASS(), WR1: R('hitch'), WR3: R('corner'), WR2: R('slant'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2'], 'three', ['medium', 'zone_beater'], 'Smash to the twins side from the pistol: slot corner over an outside hitch; backside slant.')),
  'Against Cover 2 shells.', 'The corner defender cannot cover the hitch and the corner route at once.', 'Cover 2 Zone and Tampa 2.', 'Cover 4.');

  add(O('tight_stick_flat', 'Tight Stick Flat', 'tight_i', { QB: PASS(), TE: R('stick'), RB: R('flat'), WR1: R('slant'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'RB', 'WR1'], 'quick', ['quick', 'short'], 'Under centre with three linemen: tight end stick, back to the flat, receiver slant.')),
  'Play-action looks without the fake: quick throws from a run formation.', 'The defence expects a run; the tight end is free for a step.', 'Run Wall and Goal Line Stand.', 'Cover 2 Zone.');

  add(O('angle_stick', 'Angle Stick', 'gun_pro_lt', { QB: PASS(), RB: R('angle'), TE: R('stick'), WR1: R('hitch'), WR2: R('slant'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'TE', 'WR2', 'WR1'], 'three', ['short', 'man_beater'], 'The back runs an angle route inside while the tight end sits at the sticks.')),
  'When a linebacker has to cover the back.', 'The angle: out toward the flat, then sharp back inside.', 'Cover 1 and Cover 2 Man.', 'Tampa 2 and Robber.');

  add(O('arrow_go', 'Arrow Go', 'tight_gun', { QB: PASS(), WR1: R('go'), TE: R('arrow'), RB: R('drift'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'RB'], 'quick', ['quick', 'short'], 'The receiver runs off the corner; the tight end sprints to the flat underneath.')),
  'Against corners who bail deep.', 'The go route takes the corner away; the tight end catches it in the flat with room.', 'Cover 3 and Cover 4.', 'Cover 2 Zone.');

  add(O('out_seam', 'Out Seam', 'pistol_pro', { QB: PASS(), WR1: R('speed_out'), WR2: R('speed_out'), TE: R('seam'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'WR1'], 'three', ['short', 'medium'], 'Both receivers break out; the tight end splits the safeties up the seam.')),
  'Against two-deep safeties playing wide.', 'The seam is the first look; the outs are there if a safety comes inside.', 'Cover 2 Zone and Cover 2 Man.', 'Cover 3.');

  add(O('shallow_sit', 'Shallow Sit', 'pro_empty', { QB: PASS(), RB: R('shallow'), TE: R('sit'), WR1: R('hitch'), WR2: R('slant'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'TE', 'WR2', 'WR1'], 'quick', ['quick', 'short', 'man_beater'], 'Empty set: the back crosses shallow under the tight end’s sit route.')),
  'Against man coverage with a linebacker on the back.', 'The tight end’s sit route is a natural pick for the crosser.', 'Cover 1 and Cover 0.', 'Tampa 2.');

  add(O('bunch_slant_arrow', 'Bunch Slant Arrow', 'spread_bunch', { QB: PASS(), WR3: R('slant'), WR2: R('arrow'), WR1: R('hitch'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1'], 'quick', ['quick', 'short', 'man_beater'], 'From a two-man bunch: the point man slants, the back man runs to the flat behind him.')),
  'Quick answer against press man.', 'The stacked release makes it hard to press both receivers.', 'Man Press and Cover 0.', 'Robber.');

  add(O('trips_slants', 'Trips Slants', 'spread_trips_rt', { QB: PASS(), WR1: R('slant'), WR2: R('slant'), WR3: R('slant'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'WR3', 'RB'], 'quick', ['quick', 'short', 'blitz_beater'], 'Three slants from trips right; the back runs to the empty left flat.')),
  'Against an all-out blitz.', 'Three slants at three depths across the middle: one beats the blitz.', 'All-Out Pressure, Cover 0 and DB Blitz.', 'Robber and Tampa 2.');

  add(O('slant_wheel', 'Slant Wheel', 'gun_twins_rt', { QB: PASS(), WR2: R('slant'), WR1: R('wheel'), TE: BLOCK, RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'RB'], 'three', ['medium', 'deep', 'man_beater'], 'The outside receiver slants inside; the slot wheels up the sideline behind him.')),
  'Against man coverage when the slot defender trails.', 'The slant picks the slot defender; the wheel runs free up the sideline.', 'Cover 1 and Man Press.', 'Cover 3, the corner sinks under the wheel.');

  // ---- screens
  add(O('tunnel_screen', 'Tunnel Screen', 'gun_twins_rt', { QB: PASS(0.6), WR2: R('tunnel'), WR1: STALK([1, 15]), LG: RELEASE([1, 8]), RG: BLOCK, TE: BLOCK, RB: BLOCK },
    P('WR2', ['WR2'], 'quick', ['screen', 'quick', 'short'], 'The outside receiver comes back inside behind the line; the slot blocks out and the left guard leads.')),
  'Against off coverage and aggressive pass rushers.', 'The receiver catches it moving inside, then follows the guard upfield.', 'Cover 3, Cover 4 and All-Out Pressure.', 'Man Press and Robber.');

  add(O('jailbreak', 'Jailbreak Screen', 'spread_left', { QB: PASS(1.0), WR2: R('tunnel'), LG: RELEASE([0, 6]), RG: RELEASE([1, 10]), RB: BLOCK, WR1: R('go'), WR3: R('go'), },
    P('WR2', ['WR2', 'WR3'], 'three', ['screen', 'short', 'blitz_beater'], 'Both guards release to the right; the receiver comes inside behind them for a convoy.')),
  'When the defence brings pressure: let it in and throw behind it.', 'The quarterback waits a beat, then throws as both guards get out in front.', 'All-Out Pressure, Fire Zone and Cover 0.', 'QB Spy and Max Drop.');

  add(O('te_screen', 'TE Screen', 'gun_pro', { QB: PASS(1.5), TE: R('screen'), LG: RELEASE([1, 4]), RG: RELEASE([2, 7]), WR1: R('go'), WR2: R('go'), RB: BLOCK },
    P('TE', ['TE'], 'five', ['screen', 'long', 'blitz_beater'], 'The tight end blocks for a count, slips into the right flat and catches it behind two releasing guards.')),
  '2nd-and-long against an aggressive rush.', 'The rushers are let through; the tight end sneaks out behind them.', 'All-Out Pressure and Zone Blitz.', 'QB Spy and Max Drop.');

  add(O('swing_screen', 'Swing Screen', 'pro_trips', { QB: PASS(1.2), RB: R('swing'), LG: RELEASE([0, -6]), WR1: R('go'), WR2: R('go'), TE: BLOCK, RG: BLOCK },
    P('RB', ['RB'], 'three', ['screen', 'short'], 'Trips right pulls the coverage over; the back swings to the empty left side behind a releasing guard.')),
  'When the defence overloads the trips side.', 'Throw it once the guard is out in front of the back.', 'Cover 3 and Cover 6 rolled to trips.', 'Edge Contain.');

  add(O('middle_screen', 'Middle Screen', 'gun_spread', { QB: PASS(1.6), RB: R('drift'), LG: RELEASE([1, -1]), RG: RELEASE([1, 1.5]), WR1: R('go'), WR2: R('go'), WR3: R('go') },
    P('RB', ['RB'], 'five', ['screen', 'long'], 'Three verticals take the coverage deep; both guards release inside and the back catches it in the middle behind them.')),
  '3rd-and-long when the defence rushes upfield and drops deep.', 'The back sets up as if to block, then drifts into the middle.', 'Max Drop, Prevent and Fire Zone.', 'QB Spy and Run Wall.');

  add(O('slot_screen', 'Slot Screen', 'empty_trips', { QB: PASS(0.7), WR3: R('screen'), WR2: STALK([1, 17]), RB: STALK([2, 12]), LG: RELEASE([0, 5]), WR1: R('go'), RG: BLOCK },
    P('WR3', ['WR3'], 'quick', ['screen', 'quick', 'short'], 'The inside trips receiver steps back for the ball; the other two block and the left guard leads.')),
  'Quick perimeter yards from an empty set.', 'Two receivers and a guard block for the slot; he needs one cut.', 'Cover 4 and Max Drop.', 'Man Press and Cover 2 Zone.');

  add(O('flex_slip', 'Flex Slip Screen', 'tight_flex', { QB: PASS(0.9), TE: R('tunnel'), LG: RELEASE([0, 4]), WR1: R('go'), RB: BLOCK, RG: BLOCK },
    P('TE', ['TE'], 'three', ['screen', 'short'], 'The flexed tight end comes back inside behind the line with the left guard leading.')),
  'When the defence treats the flexed tight end as a receiver.', 'He catches it going inside and follows the guard.', 'Cover 3 and Cover 4.', 'Robber.');

  // ---- short-yardage and goal line
  add(O('goal_fade', 'Goal Line Fade', 'goal_jumbo', { QB: PASS(), WR1: R('fade'), TE: R('flat'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE'], 'quick', ['short', 'redzone', 'man_beater'], 'From the jumbo set the lone receiver fades to the corner of the end zone.')),
  'Inside the 5 with a tall receiver against man.', 'Back-shoulder throw to the receiver’s outside; he goes up and gets it.', 'Goal Line Man and Goal Line Stand.', 'Cover 2 Zone with a corner sitting on the fade.');

  add(O('goal_pa_arrow', 'Goal Line PA Arrow', 'goal_jumbo', { QB: PA([[-1.6, 0], [-3, 0], [-4.5, 0]]), RB: FAKE, WR1: R('slant'), TE: R('arrow'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['short', 'redzone', 'play_action'], 'Fake the goal-line dive; the tight end slips to the flat while the receiver slants.')),
  'After a run or two inside the 5.', 'The fake pulls the linebackers in; the tight end is alone in the flat.', 'Goal Line Stand and Run Wall.', 'Goal Line Man.');

  add(O('te_pop', 'Tight End Pop', 'goal_jumbo', { QB: PA([[-1.6, 0], [-3.5, 0], [-5, 0]]), RB: FAKE, TE: R('seam'), WR1: STALK([2, -7]), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE'], 'pa', ['short', 'redzone', 'play_action'], 'Jumbo play-action: the tight end blocks for a step, then pops straight up the seam.')),
  'Goal line, after the defence has stuffed two runs.', 'One read: the tight end behind the linebackers who bit on the fake.', 'Goal Line Stand and Run Wall.', 'Goal Line Man.');

  return { plays, lessons };
}
