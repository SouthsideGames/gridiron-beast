// Reserve batch 3: dropback concepts, shots and play action (see ../playbook-reserve.js).

export default function batch(b) {
  const { offense: O, R, BLOCK, FAKE, PA, BOOT } = b;
  const PASS = (hold) => (hold ? { a: 'pass', hold } : { a: 'pass' });
  const PA_UC = PA([[-1.6, 0], [-4, 0], [-6.5, 0.5]]); // play action from under centre
  const PA_GUN = PA([[-5, 0], [-5.5, 0.5], [-7, 0.5]]); // from the gun
  const PA_PISTOL = PA([[-3.5, 0], [-5, 0], [-7, 0.5]]);
  const plays = []; const lessons = {};
  const add = (play, when, watch, beats, loses) => { plays.push(play); lessons[play.id] = { when, watch, beats, loses }; };
  const P = (primary, progression, drop, tags, desc, extra = {}) => ({ primary, progression, drop, tags: ['pass', ...tags], desc, ...extra });

  // ---- crossers and high-lows
  add(O('drive', 'Drive', 'gun_twins_rt', { QB: PASS(), WR1: R('shallow'), WR2: R('dig'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE'], 'five', ['medium', 'zone_beater', 'man_beater'], 'The slot crosses shallow underneath; the outside receiver runs a dig behind him at twelve yards.')),
  'A reliable chain mover against both man and zone.', 'Read the linebacker: he jumps the shallow, throw the dig over him.', 'Cover 3, Cover 1 and Max Drop.', 'Robber and Tampa 2.');

  add(O('trips_drive', 'Trips Drive', 'spread_trips_rt', { QB: PASS(), WR3: R('shallow'), WR2: R('dig'), WR1: R('go'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'RB', 'WR1'], 'five', ['medium', 'zone_beater'], 'Drive from trips right: the outside receiver clears, the inside man crosses shallow under the dig.')),
  'When the defence matches trips with zone defenders.', 'The go route empties the deep third; the shallow-dig high-low hits the linebacker.', 'Cover 3 and Cover 2 Zone.', 'Robber.');

  add(O('shallow_cross', 'Shallow Cross', 'gun_spread', { QB: PASS(), WR3: R('shallow'), WR2: R('hook'), WR1: R('go'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1'], 'five', ['medium', 'man_beater'], 'The slot crosses shallow; the outside receiver on his side sits in a hook behind him; the far receiver runs off.')),
  'Against man coverage with a slow linebacker.', 'The crosser runs away from his defender all the way across the field.', 'Cover 1 and Cover 0.', 'Tampa 2 and Robber.');

  add(O('pistol_cross', 'Pistol Cross', 'pistol_twins', { QB: PASS(), WR3: R('shallow'), WR2: R('dig'), WR1: R('go'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1'], 'five', ['medium', 'man_beater'], 'From the pistol: the left slot runs shallow one way while the right receiver digs back the other way.')),
  'Against man coverage when you want two crossers going opposite ways.', 'The crossers pass each other at different depths; one comes free off the traffic.', 'Cover 1 and Man Press.', 'Cover 2 Zone and Tampa 2.');

  add(O('sail', 'Sail', 'pro_trips', { QB: PASS(), WR2: R('go'), WR1: R('sail'), TE: R('arrow'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'WR2'], 'five', ['medium', 'zone_beater'], 'Three levels to the right sideline: go deep, sail at fourteen yards, tight end in the flat.')),
  'Against Cover 3 on the trips side.', 'Read high to low: the sail opens when the corner runs with the go.', 'Cover 3 and Fire Zone.', 'Cover 2 Man and Cover 6.');

  add(O('flex_sail', 'Flex Sail', 'tight_flex', { QB: PASS(), TE: R('sail'), RB: R('arrow'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'RB', 'WR1'], 'five', ['medium', 'zone_beater'], 'The flexed tight end runs the sail, the back runs to the flat beneath him and the left receiver crosses deep.')),
  'Against zone when your tight end is a mismatch in space.', 'The back holds the flat defender down; the tight end catches it on the sideline.', 'Cover 3 and Run Wall.', 'Cover 2 Zone with corners squatting.');

  add(O('mills', 'Mills', 'gun_twins_rt', { QB: PASS(), WR2: R('post'), WR1: R('dig'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'five', ['medium', 'deep', 'zone_beater'], 'The outside receiver runs a post over the slot’s dig: a high-low on the safety.')),
  'Against two-deep looks where the safety has to choose.', 'Watch the near safety: he comes down on the dig, the post is behind him.', 'Cover 2 Zone and Cover 4.', 'Cover 3 and Robber.');

  add(O('spread_mills', 'Spread Mills', 'spread_left', { QB: PASS(), WR1: R('post'), WR3: R('dig'), WR2: R('curl'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2', 'RB'], 'five', ['medium', 'deep', 'zone_beater'], 'Post over dig from the left twins, a curl on the right and the back swinging out.')),
  'Against quarters coverage on the twins side.', 'The dig pulls the safety up; the post runs past him.', 'Cover 4 and Cover 6.', 'Cover 3.');

  add(O('scissors', 'Scissors', 'pro_trips', { QB: PASS(), WR2: R('post'), WR1: R('corner'), TE: R('flat'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE'], 'five', ['medium', 'deep', 'man_beater'], 'The outside receiver runs a post, the slot runs a corner behind him: the routes cross like scissors.')),
  'Against man coverage on the trips side.', 'The crossing routes make the man defenders trade or collide.', 'Cover 1 and Cover 2 Man.', 'Cover 4.');

  add(O('bunch_scissors', 'Bunch Scissors', 'spread_bunch', { QB: PASS(), WR3: R('corner'), WR2: R('post'), WR1: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR3', 'WR1'], 'five', ['medium', 'deep', 'man_beater'], 'Scissors from a two-man bunch: the point man runs a corner, the back man a post across him.')),
  'Against press man when receivers cannot get a clean release.', 'The stacked start gives the back man a free release into his post.', 'Man Press and Cover 1.', 'Cover 4 and Prevent.');

  add(O('switch', 'Switch', 'gun_twins_rt', { QB: PASS(), WR2: R('seam'), WR1: R('wheel'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE'], 'five', ['deep', 'man_beater'], 'The receivers swap: outside man runs the seam inside, the slot wheels up the sideline.')),
  'Against man coverage that does not switch on crossers.', 'The slot defender has to run through the outside receiver to stay with the wheel.', 'Cover 1 and Man Press.', 'Cover 3, the corner stays deep.');

  add(O('twins_switch', 'Twins Switch', 'spread_left', { QB: PASS(), WR1: R('seam'), WR3: R('fade'), WR2: R('curl'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2'], 'five', ['deep', 'man_beater'], 'Switch release on the left: outside receiver takes the seam, the slot fades outside behind him.')),
  'Shot play against man with a single safety.', 'The safety must pick a vertical; throw the other.', 'Cover 1 and Safety Blitz.', 'Cover 4.');

  add(O('choice', 'Choice', 'empty_trips', { QB: PASS(), RB: R('sit'), WR3: R('hook'), WR2: R('go'), WR1: R('slant'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR3', 'WR1', 'WR2'], 'three', ['short', 'zone_beater'], 'Empty trips: the back in the middle of the trips sits in the first open window under a hook.')),
  '3rd-and-5 against zone with a smart back.', 'The back settles where the zone defenders are not.', 'Cover 3 and Max Drop.', 'Double A Mug and Cover 0.');

  add(O('curl_seam', 'Curl Seam', 'tight_flex', { QB: PASS(), TE: R('seam'), WR1: R('curl'), RB: R('arrow'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'RB'], 'five', ['medium', 'zone_beater'], 'The flexed tight end runs the seam; the left receiver curls underneath it; the back to the flat.')),
  'Against Cover 3 when the hook defender carries the seam.', 'If the linebacker runs with the tight end, the curl is open.', 'Cover 3 and Fire Zone.', 'Cover 2 Man.');

  add(O('hank', 'Hank', 'gun_spread', { QB: PASS(), WR1: R('curl'), WR3: R('curl'), WR2: R('curl'), RB: R('drift'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1', 'RB'], 'five', ['medium', 'zone_beater'], 'Every receiver curls at eleven yards, spread across the field; the back drifts into the middle.')),
  '2nd-and-long against soft zones.', 'Throw the curl in the gap between two underneath defenders.', 'Cover 3, Cover 4 and Prevent.', 'Cover 2 Man and Man Press.');

  add(O('texas', 'Texas', 'gun_pro_lt', { QB: PASS(), RB: R('texas'), WR1: R('go'), WR2: R('curl'), TE: R('seam'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'TE', 'WR2', 'WR1'], 'five', ['medium', 'man_beater'], 'The back runs the Texas route: out toward the flat, then sharp inside behind the linebackers.')),
  'When linebackers carry the tight end and leave the back.', 'The seam pulls the middle defender; the back breaks in behind him.', 'Cover 1 and Cover 2 Man.', 'Tampa 2 and Robber.');

  add(O('bench', 'Bench', 'tight_twins', { QB: PASS(), WR1: R('deep_out'), TE: R('quick_post'), RB: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'RB'], 'five', ['medium', 'zone_beater'], 'The receiver runs a deep out at twelve yards; the tight end’s quick post holds the safety.')),
  'Sideline throw on 2nd-and-long with a strong-armed quarterback.', 'The out must be thrown before the receiver breaks.', 'Cover 3 and Cover 1.', 'Cover 2 Zone, the corner sinks under it.');

  add(O('double_bench', 'Double Bench', 'gun_pro', { QB: PASS(), WR1: R('deep_out'), WR2: R('deep_out'), TE: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'five', ['medium', 'two_minute'], 'Deep outs on both sidelines with the tight end sitting in the middle.')),
  'Two-minute drill: twelve-yard completions that stop the clock.', 'Pick the side with the softer corner before the snap.', 'Cover 4 and Max Drop.', 'Cover 2 Zone and Cover 6.');

  add(O('deep_cross', 'Deep Cross', 'gun_pro', { QB: PASS(), TE: R('deep_cross'), WR1: R('go'), WR2: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'WR1'], 'five', ['medium', 'deep'], 'The tight end crosses deep from right to left behind the linebackers; the left receiver clears.')),
  'Against single-high coverage that leaves the deep middle to one safety.', 'The go route takes the corner away; the cross arrives in the vacated area.', 'Cover 1 and Cover 3.', 'Cover 4 and Fire Zone pressure.');

  add(O('tight_deep_cross', 'Tight Deep Cross', 'tight_gun', { QB: PASS(), TE: R('deep_cross'), WR1: R('comeback'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'RB'], 'five', ['medium', 'deep'], 'Three linemen protect while the tight end crosses deep over a comeback.')),
  'When you need time to throw: an extra lineman stays in.', 'The comeback holds the corner; the cross comes open behind the hook.', 'Cover 3 and Bear Front.', 'Cover 4.');

  add(O('corner_arrow', 'Corner Arrow', 'pro_bunch', { QB: PASS(), WR2: R('corner'), TE: R('arrow'), WR1: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'TE', 'WR1'], 'three', ['medium', 'redzone', 'zone_beater'], 'From a bunch: corner over an arrow to the flat, with a sit route in the middle.')),
  'Red zone against Cover 2.', 'The corner defender takes the arrow or the corner, never both.', 'Cover 2 Zone and Tampa 2.', 'Cover 4.');

  add(O('empty_mesh', 'Empty Mesh', 'empty_2x2', { QB: PASS(), WR3: R('shallow'), RB: R('drag'), WR1: R('corner'), WR2: R('hook'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'RB', 'WR1', 'WR2'], 'five', ['medium', 'man_beater'], 'Two crossers rub in the middle from an empty set: left slot shallow, back drag.')),
  'Against man coverage when you need a rub.', 'The crossers brush past each other: the trailing defender gets caught.', 'Cover 1, Cover 0 and Man Press.', 'Zone defences; the crossers run into the hook defenders.');

  add(O('pro_mesh', 'Pro Mesh', 'gun_pro', { QB: PASS(), TE: R('drag'), WR2: R('shallow'), WR1: R('corner'), RB: R('angle'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'RB', 'WR1'], 'five', ['medium', 'man_beater'], 'Mesh with the tight end and right receiver crossing, a corner on the left and the back’s angle route.')),
  'Base personnel answer to man coverage.', 'Same rub as Mesh with bigger bodies in the crossing.', 'Cover 1 and Goal Line Man.', 'Tampa 2.');

  add(O('trips_smash', 'Trips Smash', 'spread_trips_rt', { QB: PASS(), WR1: R('hitch'), WR2: R('corner'), WR3: R('seam'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'WR3'], 'five', ['medium', 'zone_beater'], 'Smash from trips: the middle receiver runs the corner over an outside hitch; the inside man runs the seam.')),
  'Against Cover 2 shells with three receivers to one side.', 'The corner defender cannot sink under the corner route and sit on the hitch.', 'Cover 2 Zone and Tampa 2.', 'Cover 4.');

  add(O('bunch_flood', 'Bunch Flood', 'trips_bunch', { QB: PASS(), WR3: R('go'), WR2: R('sail'), WR1: R('arrow'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'WR3'], 'five', ['medium', 'zone_beater'], 'Three levels from a tight bunch: go, sail and arrow to the right sideline.')),
  'Against Cover 3 when the bunch confuses who takes whom.', 'Read the flat defender: he widens, throw the sail inside him.', 'Cover 3 and Fire Zone.', 'Cover 6 and Cover 2 Man.');

  add(O('twins_flood', 'Twins Flood', 'gun_twins_rt', { QB: PASS(), WR2: R('go'), WR1: R('sail'), TE: R('drag'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'WR2'], 'five', ['medium', 'zone_beater'], 'Twins right: go and sail outside while the left tight end drags across to the right flat.')),
  'Against zone when the defence covers the twins with two.', 'The tight end arrives late to the flat as the third level.', 'Cover 3.', 'Cover 2 Man.');

  add(O('y_over', 'Y Over', 'gun_pro', { QB: PASS(), TE: R('over'), WR1: R('dig'), WR2: R('comeback'), RB: R('arrow'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'WR2', 'RB'], 'five', ['medium', 'deep'], 'The tight end runs a deep over route across the field; the left receiver digs under it.')),
  'Against Cover 1 with a slow safety.', 'The over route runs away from the safety; the dig is the safe throw.', 'Cover 1 and Cover 3.', 'Cover 4.');

  add(O('twins_dagger', 'Twins Dagger', 'gun_twins_rt', { QB: PASS(), WR1: R('seam'), WR2: R('dig'), TE: R('drag'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'five', ['medium', 'zone_beater'], 'Dagger from twins right: slot seam clears the hook, outside dig comes in behind it.')),
  'Big yards on 2nd-and-long against Cover 3.', 'The seam pulls the safety and linebacker; the dig settles in the hole.', 'Cover 3 and Cover 1.', 'Cover 4.');

  add(O('double_dig', 'Double Dig', 'gun_spread', { QB: PASS(), WR1: R('dig'), WR2: R('dig'), WR3: R('hook'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'WR3'], 'five', ['medium'], 'Digs from both sides cross behind the linebackers with the slot hooking underneath.')),
  'When the linebackers play shallow.', 'The digs arrive in the middle at different times; throw the first one past the linebacker.', 'Cover 1 and Fire Zone.', 'Robber and Tampa 2.');

  add(O('comebacks', 'Comebacks', 'pistol_pro', { QB: PASS(), WR1: R('comeback'), WR2: R('comeback'), TE: R('seam'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR2', 'TE'], 'five', ['medium'], 'Both receivers sell deep and come back to the sideline; the tight end runs the seam.')),
  'Against corners who bail deep.', 'The receiver plants at fourteen yards and comes back: the corner is still running.', 'Cover 3 and Prevent.', 'Cover 2 Zone and Man Press.');

  add(O('hook_seam', 'Hook Seam', 'empty_trips', { QB: PASS(), WR3: R('seam'), RB: R('hook'), WR2: R('seam'), WR1: R('hook'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR3', 'WR1', 'WR2'], 'five', ['medium', 'zone_beater'], 'Seams outside and inside the trips with the back hooking between them.')),
  'Against two-deep zones.', 'The seams split the safeties; the back sits underneath.', 'Cover 2 Zone and Tampa 2.', 'Cover 3 and Robber.');

  add(O('slot_wheel_dig', 'Slot Wheel Dig', 'spread_left', { QB: PASS(), WR3: R('wheel'), WR1: R('dig'), WR2: R('post'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2'], 'five', ['deep', 'man_beater'], 'The left slot wheels up the sideline while the outside receiver digs inside under him.')),
  'Against man coverage when the slot defender is slow.', 'The dig takes the outside defender inside; the wheel runs free.', 'Cover 1 and Cover 2 Man.', 'Cover 3.');

  add(O('trips_levels', 'Trips Levels', 'spread_trips_rt', { QB: PASS(), WR1: R('dig'), WR2: R('quick_post'), WR3: R('drag'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2'], 'five', ['medium', 'zone_beater'], 'In-breaking routes at three depths from trips right: drag, quick post and dig.')),
  'Against zone when the middle linebacker drifts.', 'Read the linebacker: low, throw the dig; high, throw the drag.', 'Cover 3 and Tampa 2.', 'Robber.');

  // ---- shots
  add(O('four_verticals', 'Four Verticals', 'empty_2x2', { QB: PASS(), WR1: R('go'), WR3: R('seam'), RB: R('seam'), WR2: R('go'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'RB', 'WR1', 'WR2'], 'five', ['deep', 'long'], 'Four receivers straight up the field from an empty set: more verticals than deep defenders.')),
  'Against any single-high safety when you need a big play.', 'Four verticals against three deep: someone is open, but it needs time.', 'Cover 3 and Cover 1.', 'Cover 4, Prevent and any blitz.');

  add(O('verticals_dig', 'Verticals Dig', 'pro_empty', { QB: PASS(), WR1: R('go'), RB: R('seam'), TE: R('dig'), WR2: R('go'), LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'TE', 'WR1', 'WR2'], 'five', ['deep', 'long'], 'Empty with base personnel: three verticals and the tight end digging under them.')),
  'When the deep defenders sit back to stop the verticals.', 'The verticals push the coverage deep; the dig catches it underneath.', 'Cover 4 and Max Drop.', 'Robber.');

  add(O('post_wheel', 'Post Wheel', 'spread_bunch', { QB: PASS(), WR3: R('post'), WR2: R('wheel'), WR1: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR3', 'WR1'], 'five', ['deep', 'man_beater'], 'From the two-man bunch: the point man runs a post, the back man wheels up the sideline behind him.')),
  'Shot play against man coverage.', 'The post pulls the safety inside; the wheel goes up the empty sideline.', 'Cover 1 and Man Press.', 'Cover 4 and Cover 3.');

  add(O('sluggo_seam', 'Sluggo Seam', 'gun_spread', { QB: PASS(1.0), WR1: R('sluggo'), WR3: R('seam'), WR2: R('hitch'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2'], 'five', ['deep', 'long'], 'The left receiver fakes a slant and runs straight up the field; the slot runs the seam.')),
  'After Quick Slants has worked: the corner jumps the slant.', 'Pump on the slant, throw over the top.', 'Man Press and aggressive Cover 2 Man corners.', 'Cover 3 and Cover 4.');

  add(O('out_and_up', 'Out and Up', 'gun_pro', { QB: PASS(1.2), WR2: R('out_up'), WR1: R('curl'), RB: R('flat'), TE: R('sit'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'TE', 'WR1', 'RB'], 'five', ['deep', 'long'], 'The right receiver shows the quick out, then turns up the sideline.')),
  'After a few quick outs, when the corner starts to jump them.', 'Needs protection: the double move takes a second longer.', 'Cover 2 Zone and Man Press.', 'Cover 3 and any blitz.');

  add(O('post_corner', 'Post Corner', 'pro_trips', { QB: PASS(0.8), WR2: R('post_corner'), WR1: R('dig'), TE: R('flat'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'five', ['deep', 'long'], 'The outside receiver breaks toward the post, then back out to the corner.')),
  'Against a safety who jumps the post.', 'The first break sells the post; the throw goes to the corner.', 'Cover 1 and Cover 3.', 'Cover 2 Zone with a deep half safety on that side.');

  add(O('te_post_corner', 'TE Post Corner', 'tight_gun', { QB: PASS(0.8), TE: R('post_corner'), WR1: R('dig'), RB: R('swing'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'RB'], 'five', ['deep', 'man_beater'], 'The tight end runs the double move: post, then corner, against a linebacker or safety.')),
  'When a safety covers your tight end man-to-man.', 'The tight end leans on the post, then breaks to the corner.', 'Cover 1 and Cover 2 Man.', 'Cover 4.');

  add(O('corner_post', 'Corner Post', 'gun_spread', { QB: PASS(0.8), WR3: R('corner_post'), WR1: R('out'), WR2: R('hitch'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2'], 'five', ['deep', 'long'], 'The slot breaks to the corner, then cuts back to the post behind the safety who chased it.')),
  'Against Cover 2 where the safety drives on the corner route.', 'The double break needs time; the out is the safe answer.', 'Cover 2 Zone and Tampa 2.', 'Cover 3 and pressure.');

  add(O('deep_over', 'Deep Over', 'gun_wing', { QB: PASS(), TE: R('over'), WR1: R('go'), WR2: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'WR1'], 'five', ['deep', 'long'], 'The wing tight end crosses deep behind the linebackers with the left receiver clearing.')),
  'Against man coverage with a linebacker on the tight end.', 'The over route runs the linebacker across the field and away from help.', 'Cover 1 and Safety Blitz.', 'Cover 4.');

  add(O('bang_post', 'Bang Post', 'gun_twins_rt', { QB: PASS(), WR2: R('skinny_post'), WR1: R('out'), TE: BLOCK, RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1'], 'five', ['deep', 'long'], 'Two-man route with max protection: the outside receiver runs a skinny post, the slot an out.')),
  'Shot play against a single-high safety who is cheating.', 'Throw the post on rhythm, before the safety turns.', 'Cover 1 and Cover 0.', 'Cover 2 Zone and Cover 4.');

  add(O('go_comeback', 'Go Comeback', 'gun_pro_lt', { QB: PASS(), WR1: R('go'), WR2: R('comeback'), RB: R('wheel'), TE: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'RB', 'WR1'], 'five', ['deep', 'medium'], 'Left receiver runs off, right receiver comes back at fourteen yards, the back wheels up the left sideline.')),
  'Against corners who play deep.', 'The comeback is the throw; the wheel is the shot if the linebacker sits.', 'Cover 3 and Cover 4.', 'Cover 2 Zone.');

  add(O('double_post', 'Double Post', 'gun_spread', { QB: PASS(), WR1: R('post'), WR3: R('post'), WR2: R('curl'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR1', 'WR2'], 'five', ['deep', 'long'], 'Two posts on the right at different depths with a curl on the left.')),
  'Against single-high safeties: two posts, one safety.', 'Throw the post the safety does not take.', 'Cover 1 and Cover 3.', 'Cover 2 Zone and Cover 4.');

  add(O('twins_corner_seam', 'Twins Corner Seam', 'ace_twins', { QB: PASS(), WR2: R('corner'), WR1: R('seam'), TE: R('flat'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'five', ['deep', 'zone_beater'], 'Under centre, twins left: the slot runs a corner, the outside receiver a seam inside him.')),
  'Against Cover 2 on the twins side.', 'The seam holds the safety inside; the corner is open over the corner defender.', 'Cover 2 Zone and Tampa 2.', 'Cover 4.');

  add(O('trips_seams', 'Trips Seams', 'spread_trips_rt', { QB: PASS(), WR1: R('go'), WR2: R('skinny_post'), WR3: R('seam'), RB: R('drift'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'WR2', 'WR1', 'RB'], 'five', ['deep', 'long'], 'Three vertical stems from trips right: go, skinny post and seam.')),
  'Against single-high coverage rolled to trips.', 'The safety can carry only one of the inside verticals.', 'Cover 3 and Cover 1.', 'Cover 4 and Prevent.');

  add(O('bunch_verticals', 'Bunch Verticals', 'trips_bunch', { QB: PASS(), WR3: R('go'), WR1: R('seam'), WR2: R('fade'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2'], 'five', ['deep', 'long', 'man_beater'], 'Three verticals released from a tight bunch, splitting apart as they climb.')),
  'Against man coverage when press is stopping your verticals.', 'The bunch release makes the defenders sort it out at full speed.', 'Man Press and Cover 1.', 'Cover 4.');

  add(O('pistol_out_go', 'Pistol Out Go', 'pistol_twins', { QB: PASS(), WR1: R('go'), WR3: R('out'), WR2: R('skinny_post'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR3', 'WR1'], 'five', ['deep', 'medium'], 'Pistol twins: go and out on the left, a skinny post on the right with the back protecting.')),
  'Against a corner playing off on the right.', 'The skinny post is the shot; the out is the answer if the safety rotates.', 'Cover 1 and Cover 3.', 'Cover 4.');

  add(O('trips_rb_wheel', 'Trips RB Wheel', 'pro_trips', { QB: PASS(), RB: R('wheel'), WR2: R('post'), WR1: R('dig'), TE: BLOCK, LG: BLOCK, RG: BLOCK },
    P('RB', ['RB', 'WR1', 'WR2'], 'five', ['deep', 'man_beater'], 'Trips right draws the coverage; the back wheels up the empty left sideline.')),
  'When a linebacker has to cover the back on the empty side.', 'The back runs to the flat, then turns up: nobody is near him.', 'Cover 1 and Cover 2 Man.', 'Cover 3.');

  add(O('max_shot', 'Max Shot', 'tight_i', { QB: PA([[-1.6, 0], [-4, 0], [-7, 0]]), RB: FAKE, TE: BLOCK, WR1: R('skinny_post'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1'], 'pa', ['deep', 'long', 'play_action'], 'Everyone protects; the lone receiver runs a skinny post off a run fake.')),
  'Once a game against a safety creeping down for the run.', 'One read, one throw: the receiver against the corner deep.', 'Run Wall, Goal Line Stand and Bear Front.', 'Cover 4 and Prevent.');

  add(O('double_wheel', 'Double Wheel', 'empty_2x2', { QB: PASS(), WR3: R('wheel'), RB: R('wheel'), WR1: R('hitch'), WR2: R('hitch'), LG: BLOCK, RG: BLOCK },
    P('WR3', ['WR3', 'RB', 'WR1', 'WR2'], 'five', ['deep', 'man_beater'], 'Both slots in the empty set wheel up the sidelines behind outside hitches.')),
  'Against man coverage with linebackers on the slots.', 'The hitches stop the corners short; the wheels run past the linebackers outside them.', 'Cover 1 and Cover 2 Man.', 'Cover 3 and Cover 4.');

  add(O('fade_seam', 'Fade Seam', 'spread_trips_rt', { QB: PASS(), WR1: R('fade'), WR2: R('seam'), WR3: R('sit'), RB: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'WR3'], 'five', ['deep', 'redzone'], 'Trips right: outside fade, middle seam and an inside sit: a vertical stretch with a short answer.')),
  'Red zone against two-deep coverage.', 'The fade pulls the corner and safety wide; the seam splits them.', 'Cover 2 Zone and Cover 2 Man.', 'Cover 3 and Robber.');

  // ---- play action
  add(O('yankee', 'Yankee', 'i_pro', { QB: PA_UC, RB: FAKE, WR1: R('post'), WR2: R('over'), TE: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1'], 'pa', ['deep', 'long', 'play_action'], 'Play action, two deep routes: a post from the left and a deep over from the right.')),
  'After the run game has pulled the safety down.', 'The fake freezes the safety; the over route comes open behind him.', 'Run Wall, Bear Front and Cover 1.', 'Any blitz and Cover 4.');

  add(O('pa_leak', 'PA Leak', 'tight_wing', { QB: PA_UC, RB: FAKE, TE: R('deep_cross'), WR1: R('post'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'deep', 'play_action'], 'Run fake right; the wing tight end leaks across the field behind the linebackers.')),
  'When linebackers bite hard on the run fake.', 'The tight end stays in for a count, then leaks across; nobody is left there.', 'Run Wall and Goal Line Stand.', 'QB Spy and blitzes.');

  add(O('pa_sail_boot', 'Sail Boot Left', 'tight_wing_lt', { QB: BOOT([[-1.6, 0], [-4, -1], [-5, -6], [-3, -11]]), RB: FAKE, TE: R('sail'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'play_action', 'boot'], 'Fake right, the quarterback boots left; the wing runs the sail and the right receiver crosses deep.')),
  'After runs to the right have drawn the defence over.', 'The quarterback reads high to low on the move: sail, then the crosser.', 'Run Wall and over-pursuing fronts.', 'Edge Contain.');

  add(O('waggle', 'Waggle', 'i_pro', { QB: BOOT([[-1.6, 0], [-4, 1], [-5, 5], [-3, 10]]), RB: FAKE, WR2: R('sail'), TE: R('arrow'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'TE', 'WR1'], 'pa', ['medium', 'play_action', 'boot'], 'The quarterback boots right after the fake with a three-level flood: sail, flat and a deep crosser.')),
  'Against a defence keying the run on early downs.', 'On the move: sail first, tight end in the flat second, crosser last.', 'Run Wall and Bear Front.', 'Edge Contain and QB Spy.');

  add(O('pa_seam', 'PA Seam', 'ace_twins', { QB: PA_UC, RB: FAKE, WR2: R('seam'), WR1: R('comeback'), TE: R('flat'), LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1', 'TE'], 'pa', ['medium', 'deep', 'play_action'], 'Fake the run; the left slot runs straight up the seam past the linebackers.')),
  'When the linebackers fill fast against the run.', 'The fake pulls the hook defender up; the seam is behind him.', 'Run Wall and Cover 3.', 'Cover 2 Zone and Tampa 2.');

  add(O('pa_dagger', 'PA Dagger', 'pistol_pro', { QB: PA_PISTOL, RB: FAKE, TE: R('seam'), WR1: R('dig'), WR2: R('go'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE', 'WR2'], 'pa', ['medium', 'deep', 'play_action'], 'Pistol play action: tight end seam clears the middle, the left receiver digs behind it.')),
  'After a successful pistol run.', 'The fake plus the seam empties the hook zone for the dig.', 'Cover 3 and Run Wall.', 'Cover 4 and blitzes.');

  add(O('pa_crossers', 'PA Crossers', 'tight_pistol', { QB: PA_PISTOL, RB: FAKE, TE: R('deep_cross'), WR1: R('over'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'deep', 'play_action'], 'Two deep crossers going opposite ways at different depths behind a run fake.')),
  'Against man coverage on early downs.', 'The crossers run away from their defenders; the fake buys the time.', 'Cover 1 and Bear Front.', 'Cover 4 and Zone Blitz.');

  add(O('pa_flood', 'PA Flood', 'gun_pro', { QB: PA_GUN, RB: FAKE, WR2: R('go'), TE: R('sail'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1', 'WR2'], 'pa', ['medium', 'play_action'], 'Play action from the gun: go and sail to the right with the left receiver crossing deep behind.')),
  'When the defence plays the gun run game hard.', 'The sail opens when the corner carries the go.', 'Cover 3 and Run Wall.', 'Cover 2 Man and blitzes.');

  add(O('pistol_boot', 'Pistol Boot', 'tight_pistol', { QB: BOOT([[-3.5, 0], [-5, 1], [-6, 6], [-4, 11]]), RB: FAKE, TE: R('arrow'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'play_action', 'boot'], 'Pistol fake, quarterback rolls right; tight end to the flat, left receiver crossing deep.')),
  'Against an over-pursuing defence.', 'The tight end is the first read on the move; the crosser if the flat is taken.', 'Run Wall and Bear Front.', 'Edge Contain.');

  add(O('pa_corner', 'PA Corner', 'tight_i', { QB: PA_UC, RB: FAKE, TE: R('corner'), WR1: R('dig'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'deep', 'play_action', 'redzone'], 'Fake the dive; the tight end runs a corner route while the receiver digs across.')),
  'Red zone after a couple of runs.', 'The tight end is open to the pylon if the safety bites.', 'Goal Line Stand and Run Wall.', 'Cover 4.');

  add(O('te_throwback', 'TE Throwback', 'tight_wing_lt', { QB: BOOT([[-1.6, 0], [-4, 1], [-5, 6], [-3, 11]]), RB: FAKE, WR1: R('deep_out'), TE: R('flat'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['medium', 'play_action', 'boot', 'misdirection'], 'Everything rolls right with the quarterback; the left wing tight end slips out to the left flat for the throwback.')),
  'Once the defence starts flying to the boot side.', 'The quarterback looks right, then throws back across to the tight end.', 'Over-pursuing defences and Zone Blitz.', 'QB Spy.');

  add(O('pa_deep_over', 'PA Deep Over', 'gun_wing', { QB: PA_GUN, RB: FAKE, TE: R('over'), WR1: R('go'), WR2: R('curl'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'WR1'], 'pa', ['deep', 'long', 'play_action'], 'Play action from the gun: the wing tight end crosses deep, the right receiver curls.')),
  'After the gun run game is working.', 'The fake holds the linebackers; the over route crosses behind them.', 'Run Wall and Cover 1.', 'Cover 4 and pressure.');

  add(O('pa_slant_post', 'PA Slant Post', 'ace_twins', { QB: PA_UC, RB: FAKE, WR1: R('slant'), WR2: R('post'), TE: BLOCK, LG: BLOCK, RG: BLOCK },
    P('WR2', ['WR2', 'WR1'], 'pa', ['medium', 'deep', 'play_action'], 'Twins left play action: outside slant underneath, slot post over the top.')),
  'Against a single safety after runs.', 'The slant holds the linebacker; the post beats the safety.', 'Cover 3 and Run Wall.', 'Cover 2 Zone.');

  add(O('pa_te_wheel', 'PA TE Wheel', 'tight_wing', { QB: PA_UC, RB: FAKE, TE: R('wheel'), WR1: R('post'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['deep', 'play_action', 'man_beater'], 'Run fake; the wing tight end runs to the flat and wheels up the sideline.')),
  'When a linebacker covers the tight end and bites on fakes.', 'The tight end looks like he is blocking, then wheels past the linebacker.', 'Cover 1 and Run Wall.', 'Cover 3.');

  add(O('pa_comebacks', 'PA Comebacks', 'i_pro', { QB: PA_UC, RB: FAKE, WR1: R('comeback'), WR2: R('comeback'), TE: R('seam'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR2', 'WR1'], 'pa', ['medium', 'play_action'], 'Play action with both receivers running comebacks and the tight end up the seam.')),
  'Against corners who turn and run on play action.', 'Seam first; if the safety takes it, throw a comeback.', 'Cover 3 and Prevent.', 'Cover 2 Zone.');

  add(O('pistol_pa_post', 'Pistol PA Post', 'pistol_twins', { QB: PA_PISTOL, RB: FAKE, WR1: R('post'), WR3: R('dig'), WR2: R('go'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'WR3', 'WR2'], 'pa', ['deep', 'long', 'play_action'], 'Spread play action from the pistol: post over a dig on the left, go on the right.')),
  'When the defence crowds the box against spread runs.', 'The dig holds the safety; the post goes behind him.', 'Run Wall and Cover 3.', 'Cover 4 and blitzes.');

  add(O('jumbo_boot', 'Jumbo Boot', 'goal_jumbo', { QB: BOOT([[-1.6, 0], [-4, 1], [-5, 5], [-3, 9]]), RB: FAKE, TE: R('flat'), WR1: R('deep_cross'), LG: BLOCK, RG: BLOCK },
    P('TE', ['TE', 'WR1'], 'pa', ['short', 'redzone', 'play_action', 'boot'], 'Goal-line set, quarterback boots right; tight end to the flat, receiver crossing behind him.')),
  'Inside the 5 after a stuffed run.', 'The defence collapses on the fake; the tight end is alone in the flat.', 'Goal Line Stand and Run Wall.', 'Edge Contain.');

  add(O('pa_bench', 'PA Bench', 'tight_twins', { QB: PA_GUN, RB: FAKE, WR1: R('deep_out'), TE: R('seam'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE'], 'pa', ['medium', 'play_action'], 'Play action with a deep out on the twins side and the tight end splitting the safeties.')),
  'After runs from tight personnel.', 'The deep out arrives as the corner turns to run.', 'Cover 3 and Run Wall.', 'Cover 2 Zone.');

  add(O('pa_dig', 'PA Dig', 'tight_i_lt', { QB: PA_UC, RB: FAKE, WR1: R('dig'), TE: R('seam'), LG: BLOCK, RG: BLOCK },
    P('WR1', ['WR1', 'TE'], 'pa', ['medium', 'play_action'], 'Tight end left runs the seam; the right receiver digs in behind the linebackers who bit.')),
  'When the linebackers fly up on run fakes.', 'The dig settles where the linebackers just left.', 'Run Wall and Bear Front.', 'Robber.');

  return { plays, lessons };
}
