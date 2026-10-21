// Reserve batch 1: running plays (see ../playbook-reserve.js).
// Coordinates follow playbook.js: x upfield from the line, y lateral (negative = offense's left).

export default function batch(b) {
  const { offense: O, R, RUNBLOCK, STALK, PULL, CARRY, HANDOFF, KEEP } = b;
  const OPTION = (path) => ({ a: 'option', path });
  const PITCH = (path) => ({ a: 'pitch', path });
  const plays = []; const lessons = {};
  const add = (play, when, watch, beats, loses) => { plays.push(play); lessons[play.id] = { when, watch, beats, loses }; };

  // ---- zone family
  add(O('split_zone', 'Split Zone', 'gun_wing', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-2, -0.2], [2, 1.5], [8, 2], [20, 2.5]]),
    LG: RUNBLOCK([2, -0.5]), RG: RUNBLOCK([2, 2.5]), TE: RUNBLOCK([0.5, -3.8]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: 'Zone to the right while the wing tight end crosses behind the line to seal the backside edge.' }),
  'Against fronts that flow hard with the zone and leave the backside end alone.', 'The tight end kicks across behind the line; the back reads the first lineman and can cut back behind that block.', 'Run Wall and Bear Front, inside defenders who flow hard.', 'Edge Contain, the backside end stays home.');

  add(O('tight_zone', 'Tight Zone', 'tight_pistol', {
    QB: HANDOFF, RB: CARRY([[-6.2, 0], [-3, 0.5], [1, -0.5], [7, -1], [20, -1]]),
    C: RUNBLOCK([2, 0.8]), LG: RUNBLOCK([2, -1.2]), RG: RUNBLOCK([2, 2.4]), TE: RUNBLOCK([2, 4.4]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: 'Inside zone from the pistol with three linemen; the back aims at the centre and cuts off the first block.' }),
  'Early downs when you want a steady four yards with an extra lineman.', 'The back presses the centre, then cuts behind whichever block wins.', 'Nickel looks and Cover 2 Man, light boxes.', 'Bear Front and Goal Line Stand.');

  add(O('wide_zone_rt', 'Wide Zone Right', 'tight_wing', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-4.5, 3], [-1, 7], [4, 10], [20, 12]]),
    C: RUNBLOCK([2, 2.5]), LG: RUNBLOCK([2, 1]), RG: RUNBLOCK([2.5, 4.5]), TE: RUNBLOCK([2.5, 7]), WR1: STALK([4, -14]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Under centre, everyone reaches right behind the wing; the back bends it outside or cuts up.' }),
  'With a fast back against slow edge defenders.', 'One cut: if the wing seals the edge, bounce it; if not, cut up behind the guard.', 'Heavy fronts stacked inside, Run Wall.', 'Edge Contain and fast corners.');

  add(O('pistol_stretch', 'Pistol Stretch', 'pistol_twins', {
    QB: HANDOFF, RB: CARRY([[-6.2, 0], [-4, 3], [-1, 7], [4, 10], [22, 12]]),
    LG: RUNBLOCK([2, 1]), RG: RUNBLOCK([2.5, 4.5]), WR2: STALK([3, 16]), WR1: STALK([4, -16]), WR3: STALK([3, -8]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Spread personnel, wide zone to the open side away from the twins.' }),
  'When the defence lines up light and wide against three receivers.', 'The back stretches to the right edge; the receiver on that side must reach the corner.', 'Nickel defences and Cover 4.', 'Edge Contain.');

  add(O('trips_weak_zone', 'Trips Weak Zone', 'spread_trips_rt', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-2, -0.5], [2, -1.5], [8, -2], [20, -2.5]]),
    LG: RUNBLOCK([2, -2]), RG: RUNBLOCK([2, 0.5]), WR3: STALK([3, 6]), WR2: STALK([4, 12]), WR1: STALK([4, 17]),
  }, { type: 'run', tags: ['run', 'inside'], desc: 'Three receivers pull the defence right; the back runs zone to the empty left side.' }),
  'When the defence rolls its coverage toward trips.', 'Count the defenders on the weak side before the snap: two or fewer and it is a good call.', 'Cover 3 rotated to trips, Cover 6.', 'Bear Front and defences that stay balanced.');

  // ---- gap / power family
  add(O('duo', 'Duo', 'pistol_pro', {
    QB: HANDOFF, RB: CARRY([[-6.2, 0], [-2.5, -0.5], [1, -1], [6, -1.2], [20, -1.5]]),
    LG: RUNBLOCK([1.5, -1]), RG: RUNBLOCK([1.5, -0.2]), TE: RUNBLOCK([1.5, 2.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Two double teams at the point of attack and a downhill back: no reads, just power between the guards.' }),
  'Short yardage and four-minute offence.', 'Both guards double the left A gap; the back hits it fast and falls forward.', 'Nickel and Cover 2 Zone.', 'Double A Mug and Goal Line Stand.');

  add(O('iso', 'Iso', 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, 1], [1, 1.8], [6, 2], [20, 2]]),
    TE: RUNBLOCK([4, 1.8]), C: RUNBLOCK([1.5, 0]), LG: RUNBLOCK([1.5, -2]), RG: RUNBLOCK([1.5, 2.8]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'The tight end leads through the right B gap and takes the linebacker one-on-one.' }),
  '3rd-and-1 and goal line, when you trust your tight end.', 'Follow the lead block: the hole is wherever the tight end takes the linebacker.', 'Cover 0 and pass-first nickel fronts.', 'Run Wall, linebackers who fill first.');

  add(O('pistol_power', 'Pistol Power', 'pistol_pro', {
    QB: HANDOFF, RB: CARRY([[-6.2, 0], [-3, 1], [1, 3], [6, 3.5], [20, 4]]),
    LG: PULL([-2, 0.5], [2, 3.2]), RG: RUNBLOCK([1.5, 0.8]), TE: RUNBLOCK([1.5, 5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: 'Power from the pistol: the tight end kicks out the edge and the left guard pulls through the hole.' }),
  'When Power Right is working but you want the pass-first look of the pistol.', 'Kick-out by the tight end, guard wraps inside it: the back runs off the guard’s hip.', 'Nickel and Cover 2 Man.', 'Edge Contain and Goal Line Stand.');

  add(O('belly', 'Belly', 'i_pro', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-4, 1.5], [0, 3], [6, 4], [20, 4.5]]),
    LG: RUNBLOCK([1.5, -0.5]), RG: RUNBLOCK([1.5, 2]), TE: RUNBLOCK([1.5, 5]), WR2: STALK([3, 15]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: 'Off-tackle to the right with man blocking: everyone takes the man in front of him.' }),
  'A simple downhill run on 1st-and-10.', 'The back aims just outside the tight end and stays on that track.', 'Light boxes and Cover 4.', 'Bear Front and Edge Contain.');

  add(O('dart', 'Dart', 'gun_pro_lt', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-3, -0.5], [1, 1.5], [8, 2], [20, 2]]),
    LG: PULL([-1.5, 0], [1.5, 2.6]), RG: RUNBLOCK([1.5, 0.8]), TE: RUNBLOCK([1.5, 4.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside'], desc: 'The backside guard pulls across to lead the back through the right B gap.' }),
  'When linebackers read the guards: the pull pulls them the wrong way.', 'The back follows the pulling guard and cuts off his block.', 'Run Wall and over-pursuing linebackers.', 'Double A Mug, pressure inside beats the pull.');

  add(O('wham', 'Wham', 'gun_wing', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-2, -0.5], [2, 1], [8, 1.5], [20, 1.5]]),
    LG: RUNBLOCK([3, -2]), RG: RUNBLOCK([3, 2.5]), TE: PULL([-1, 2.6], [1, 1.6]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: 'Both guards climb to the linebackers; the wing tight end comes back and traps the inside lineman.' }),
  'Against aggressive defensive linemen who rush upfield.', 'The lineman is left unblocked on purpose; the tight end hits him from the side.', 'All-Out Pressure, Fire Zone and Double A Mug.', 'Patient fronts like Bear Front.');

  add(O('buck_sweep', 'Buck Sweep', 'tight_wing', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-5, 3], [-2, 7], [2, 10], [20, 12]]),
    LG: PULL([-2, 2], [1.5, 6]), RG: PULL([-2, 3], [2, 8.5]), C: RUNBLOCK([1.5, 1.5]), TE: RUNBLOCK([1.5, 3.5]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Both guards pull right behind the wing tight end’s down block; the back follows them around the edge.' }),
  'A big-play run when the defence is crowding the middle.', 'Two pullers lead: the first kicks out the edge, the second turns up on the linebacker.', 'Run Wall and Bear Front.', 'Edge Contain and fast corners.');

  add(O('student_body', 'Student Body Right', 'i_pro', {
    QB: PITCH([[-1.6, 0], [-3, 1.5]]), RB: CARRY([[-6.5, 0], [-5, 5], [-2, 10], [3, 13], [22, 14]]),
    LG: PULL([-2, 2], [1.5, 8]), RG: PULL([-2, 3.5], [2, 11]), TE: RUNBLOCK([1.5, 5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'A toss with both guards pulling: a wall of blockers sweeps the right side.' }),
  'With a fast back when the edge defender plays inside.', 'The pitch is live: the back catches it moving and gets behind both guards.', 'Heavy fronts and Goal Line Stand.', 'Edge Contain and Man Press corners who come up fast.');

  add(O('pin_pull', 'Pin and Pull', 'tight_gun', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-4, -5], [-1, -8], [4, -10], [22, -11]]),
    C: RUNBLOCK([1.5, 1]), LG: RUNBLOCK([1.5, 0.5]), RG: PULL([-1.5, -1], [1.5, -5]), TE: RUNBLOCK([1.5, 2]), WR1: STALK([3, -16]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Down blocks pin the interior; the right guard pulls to lead the back around the left edge.' }),
  'When the defence slants or stunts inside.', 'The pulling guard is the key block; the back stays on his hip until the corner.', 'Zone Blitz and slanting fronts.', 'Edge Contain.');

  add(O('crack_toss', 'Crack Toss', 'gun_twins_rt', {
    QB: PITCH([[-5, 0], [-5.5, 1]]), RB: CARRY([[-5.2, -2.8], [-5.5, 2], [-3, 8], [2, 13], [20, 15]]),
    WR1: STALK([1, 6]), WR2: STALK([3, 17]), LG: PULL([-2, 2], [1, 9]), RG: RUNBLOCK([1.5, 3.5]), TE: RUNBLOCK([1.5, -1]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'The slot receiver cracks the edge defender; the left guard pulls around for the corner.' }),
  'Against a defence that sets the edge with a linebacker.', 'The slot crack-blocks inside, the guard kicks the corner: the back turns up between them.', 'Base defences with linebackers on the edge.', 'Man Press and Cover 2 Zone corners who squeeze.');

  add(O('bunch_toss', 'Bunch Toss', 'trips_bunch', {
    QB: PITCH([[-5, 0], [-5.5, 0.8]]), RB: CARRY([[-5.2, -2.8], [-5.5, 2], [-3, 7], [2, 11], [20, 14]]),
    WR3: STALK([1.5, 6]), WR1: STALK([2, 9]), WR2: STALK([3, 13]), LG: PULL([-2, 2], [1, 7]), RG: RUNBLOCK([1.5, 3]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Three receivers bunched right become three blockers; the back gets the toss behind them.' }),
  'When the defence covers the bunch with defensive backs.', 'Each receiver blocks the man across; the back picks a crease between the bunch blocks.', 'Cover 3 and nickel defences.', 'Edge Contain.');

  add(O('pistol_counter', 'Pistol Counter', 'tight_pistol', {
    QB: HANDOFF, RB: CARRY([[-6.2, 0], [-5.6, -0.9], [-3.6, 1], [0, 3], [6, 3.8], [20, 4]]),
    LG: PULL([-2, 0], [1.5, 3.8]), C: RUNBLOCK([1.5, -0.5]), RG: RUNBLOCK([1.5, 2]), TE: RUNBLOCK([1.5, 5]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: 'False step left, then the left guard pulls right to lead the back through the hole.' }),
  'After runs to the left have pulled the linebackers that way.', 'The back steps left, plants and follows the pulling guard.', 'Aggressive linebackers and Zone Blitz.', 'Disciplined zone defences that stay home.');

  add(O('jumbo_lead', 'Jumbo Lead', 'goal_jumbo', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, -0.8], [0, -1.2], [4, -1.2], [12, -1.2]]),
    C: RUNBLOCK([1.5, -0.6]), LG: RUNBLOCK([1.5, -2.2]), RG: RUNBLOCK([1.5, 0.8]), TE: PULL([-2.5, 1.5], [1.2, -1.8]), WR1: RUNBLOCK([1, -5]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Goal-line set: the tight end comes across the formation to lead into the left A gap.' }),
  'Inside the 3 when you need one yard.', 'The tight end leads; the back follows him and lowers his shoulder.', 'Goal Line Man and pass-first goal-line calls.', 'Goal Line Stand with all three linemen inside.');

  // ---- quarterback runs
  add(O('qb_power', 'QB Power', 'gun_pro', {
    QB: KEEP([[-5, 0], [-3, 0.8], [0, 2], [5, 2.5], [20, 3]]), RB: RUNBLOCK([1, 3.8]),
    LG: PULL([-2, 0.5], [1.5, 2.5]), RG: RUNBLOCK([1.5, 1]), TE: RUNBLOCK([1.5, 4.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'The quarterback is the runner: the back kicks out the edge and the guard pulls ahead of him.' }),
  'Short yardage with a big, tough quarterback.', 'An extra blocker in the run game: count the box and go if the numbers favour you.', 'Light boxes and man coverage that turns its back.', 'QB Spy, the spy is waiting.');

  add(O('qb_counter', 'QB Counter', 'gun_pro_lt', {
    QB: KEEP([[-5, 0], [-4.5, -1.5], [-2, 1], [1, 3.5], [8, 4], [20, 4.5]]), RB: RUNBLOCK([0, -4]),
    LG: PULL([-2, 0], [1.5, 3.8]), RG: RUNBLOCK([1.5, 0.3]), TE: RUNBLOCK([2, 5.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: 'The back fakes left and blocks; the quarterback steps left then follows the pulling guard right.' }),
  'When the defence keys the running back.', 'Everything flows left with the back; the quarterback comes back right behind the guard.', 'Defences that chase the back and Zone Blitz.', 'QB Spy.');

  add(O('qb_sneak', 'QB Sneak', 'goal_jumbo', {
    QB: KEEP([[-1.6, 0], [0, 0.3], [3, 0.3], [10, 0.3]]), RB: RUNBLOCK([0, -0.8]),
    C: RUNBLOCK([1.5, 0]), LG: RUNBLOCK([1.5, -1.4]), RG: RUNBLOCK([1.5, 1.4]), TE: RUNBLOCK([1.5, 3.6]), WR1: STALK([3, -7]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Under centre, the quarterback falls forward behind the centre for the last yard.' }),
  '4th-and-inches or a goal-line yard.', 'Win the A gaps and fall forward. No reads.', 'Any defence that rushes wide.', 'Double A Mug and Goal Line Stand.');

  add(O('empty_qb_draw', 'Empty QB Draw', 'pro_empty', {
    QB: KEEP([[-5, 0], [-6, 0], [-2, 0.4], [3, 0], [20, 0]]),
    LG: RUNBLOCK([-1.5, -2]), RG: RUNBLOCK([-1.5, 2]), RB: R('go'), TE: R('seam'), WR1: R('go'), WR2: R('go'),
  }, { type: 'run', tags: ['run', 'inside', 'long', 'draw'], desc: 'Five out in an empty set; the quarterback sells the pass, then runs into the empty middle.' }),
  '3rd-and-medium against a defence dropping everyone into coverage.', 'Everyone runs off; the quarterback waits a beat and goes when the rushers get upfield.', 'Max Drop, Prevent and Cover 4.', 'QB Spy and Double A Mug.');

  // ---- option family
  add(O('pistol_zone_read', 'Pistol Zone Read', 'pistol_pro', {
    QB: OPTION([[-3.5, 0], [-3, -1.5], [0, -5], [6, -8], [20, -9]]), RB: CARRY([[-6.2, 0], [-3, 0.5], [1, 1.5], [8, 2], [20, 2]]),
    LG: RUNBLOCK([2, 0]), RG: RUNBLOCK([2, 2.5]), TE: RUNBLOCK([2, 4.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'option'], desc: 'From the pistol: give the zone to the right or keep it around the left end, depending on the end.' }),
  'With a mobile quarterback against defences that crash the end.', 'Left end crashes on the back: keep. End sits: give.', 'Edge rushers who fire upfield, Fire Zone.', 'QB Spy and Edge Contain.');

  add(O('speed_option', 'Speed Option', 'gun_pro_lt', {
    QB: OPTION([[-5, 0], [-4.5, 2], [-1, 6], [4, 9], [20, 11]]), RB: CARRY([[-5.2, -2.8], [-5.5, 2], [-3, 8], [2, 12], [20, 14]]),
    LG: RUNBLOCK([2, 1.5]), RG: RUNBLOCK([2.5, 4]), TE: RUNBLOCK([2.5, 7]), WR2: STALK([4, 15]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'option', 'outside'], desc: 'The quarterback attacks the right edge with the back trailing for the pitch.' }),
  'Quick perimeter yards with a fast back and a smart quarterback.', 'The quarterback runs at the end: he keeps if the end takes the back, pitches if the end comes at him.', 'Heavy fronts stacked inside.', 'Edge Contain and QB Spy.');

  add(O('inverted_veer', 'Inverted Veer', 'gun_pro', {
    QB: OPTION([[-5, 0], [-4, 0.5], [-1, 1.5], [5, 1.5], [20, 1.5]]), RB: CARRY([[-5.2, 2.8], [-5, 6], [-2, 10], [3, 13], [20, 14]]),
    LG: PULL([-1.5, 0.5], [1.5, 2]), RG: RUNBLOCK([1.5, 0.5]), TE: RUNBLOCK([4, 2]), WR2: STALK([3, 16]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'option'], desc: 'The back sweeps outside; the quarterback reads the end and keeps it inside behind the pulling guard.' }),
  'With a strong runner at quarterback against defences that widen to stop the sweep.', 'End widens with the back: the quarterback runs inside. End crashes: give the sweep.', 'Edge Contain and wide defensive ends.', 'QB Spy and Bear Front.');

  add(O('midline_read', 'Midline Read', 'tight_pistol', {
    QB: OPTION([[-3.5, 0], [-2, -0.5], [1, -1], [6, -1.5], [20, -1.5]]), RB: CARRY([[-6.2, 0], [-3, 0.5], [1, 0.8], [6, 1], [20, 1]]),
    LG: RUNBLOCK([3, -2.5]), C: RUNBLOCK([1.5, 0.5]), RG: RUNBLOCK([1.5, 2]), TE: RUNBLOCK([1.5, 4]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'option', 'inside'], desc: 'An inside option: the left guard climbs, leaving a lineman for the quarterback to read.' }),
  'Against an aggressive interior lineman.', 'The read is inside: lineman takes the back, the quarterback keeps up the middle.', 'Double A Mug and penetrating fronts.', 'QB Spy and Run Wall.');

  add(O('option_pitch', 'Option Pitch', 'tight_pistol', {
    QB: OPTION([[-3.5, 0], [-3, 1.5], [0, 5], [5, 8], [20, 9]]), RB: CARRY([[-6.2, 0], [-5, 3], [-3, 8], [2, 12], [20, 14]]),
    C: RUNBLOCK([2, 1.5]), LG: RUNBLOCK([2, 0]), RG: RUNBLOCK([2, 3]), TE: RUNBLOCK([4, 5]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'option', 'outside'], desc: 'The tight end arc-blocks the safety while the quarterback attacks the edge with the back as the pitch man.' }),
  'Against base defences when you have an extra lineman to block inside.', 'Watch the tight end’s arc block: it decides how far outside the play gets.', 'Bear Front and Run Wall.', 'Edge Contain.');

  // ---- sweeps and misdirection
  add(O('fly_sweep', 'Fly Sweep', 'ace_twins', {
    QB: HANDOFF, WR2: CARRY([[-1.4, -4], [-2, -1], [-1.5, 4], [2, 11], [20, 14]]),
    LG: RUNBLOCK([1.5, 1]), RG: RUNBLOCK([2, 4]), TE: RUNBLOCK([2, 6]), RB: RUNBLOCK([0, 8]), WR1: STALK([4, -17]),
  }, { type: 'run', motion: { slot: 'WR2', to: [-1.4, -4] }, tags: ['run', 'outside', 'misdirection'], desc: 'Jet motion: the slot from the twins side starts across before the snap and takes the handoff at full speed around the right end; the back leads.' }),
  'Get your fastest receiver going sideways with a head start.', 'The handoff happens at full speed; the back must reach the edge first.', 'Heavy and base packages with slow linebackers.', 'Man Press and Edge Contain.');

  add(O('end_around', 'End Around', 'gun_pro', {
    QB: HANDOFF, WR2: CARRY([[-1.2, 18], [-4, 8], [-5, 0], [-3, -8], [2, -14], [14, -16]]),
    LG: RUNBLOCK([1.5, -3]), RG: PULL([-2, -1], [1, -7]), TE: RUNBLOCK([1.5, 1]), RB: RUNBLOCK([-1, -6]), WR1: STALK([3, -17]),
  }, { type: 'run', tags: ['run', 'outside', 'misdirection', 'trick'], desc: 'The right receiver loops behind the quarterback and takes it around the left end.' }),
  'Once a game, when the defence is flying to the ball.', 'A long-developing play: the right guard and the back must get to the left edge in time.', 'Over-pursuing defences and Zone Blitz.', 'Edge Contain and disciplined backside defenders.');

  add(O('rocket_toss', 'Rocket Toss', 'spread_left', {
    QB: PITCH([[-5, 0], [-5.5, -0.5]]), WR3: CARRY([[-3.5, -5], [-6.5, -1], [-5.5, 3], [-3, 9], [2, 14], [20, 16]]),
    LG: RUNBLOCK([1.5, 1.5]), RG: RUNBLOCK([2, 4.5]), RB: RUNBLOCK([0, 7]), WR2: STALK([3, 17]), WR1: STALK([4, -16]),
  }, { type: 'run', motion: { slot: 'WR3', to: [-3.5, -5] }, tags: ['run', 'outside', 'misdirection'], desc: 'Rocket motion: the left slot starts back behind the quarterback before the snap and takes the pitch already running right, with the back leading.' }),
  'Against defences that overplay the twins side.', 'Speed to the far side: the back must kick out the first defender.', 'Defences shaded to the twins and Cover 6.', 'Edge Contain.');

  add(O('speed_sweep', 'Speed Sweep', 'pro_trips', {
    QB: HANDOFF, WR1: CARRY([[-1.6, 4.5], [-2, 1], [-1.5, -4], [2, -11], [20, -14]]),
    LG: RUNBLOCK([2, -4]), RG: RUNBLOCK([1.5, -1]), TE: RUNBLOCK([1.5, 1.5]), RB: RUNBLOCK([0, -7]), WR2: STALK([3, 16]),
  }, { type: 'run', motion: { slot: 'WR1', to: [-1.6, 4.5] }, tags: ['run', 'outside', 'misdirection'], desc: 'Jet motion: the trips slot starts across before the snap and takes the handoff at full speed to the empty left side.' }),
  'When the defence rolls everyone toward trips.', 'The back leads to the left edge; the sweep goes where the defence just left.', 'Defences that overload trips, Cover 3 and Cover 6.', 'Balanced Cover 2 Zone with a corner on each side.');

  add(O('empty_jet', 'Empty Jet', 'empty_2x2', {
    QB: HANDOFF, RB: CARRY([[-1.6, 4.5], [-2, 1], [-1.5, -3], [2, -10], [20, -14]]),
    LG: RUNBLOCK([2, -3.5]), RG: RUNBLOCK([1.5, -0.5]), WR3: STALK([2, -11]), WR1: STALK([3, -17]), WR2: STALK([3, 17]),
  }, { type: 'run', motion: { slot: 'RB', to: [-1.6, 4.5] }, tags: ['run', 'outside', 'misdirection'], desc: 'Jet motion from an empty set: the back, split in the right slot, starts across before the snap and takes the handoff at full speed to the left.' }),
  'When an empty formation has the defence spread thin and thinking pass.', 'The left receivers block their men; the back needs one cut at the edge.', 'Max Drop and Cover 4.', 'Edge Contain and Man Press.');

  add(O('lead_draw', 'Lead Draw', 'gun_pro', {
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-5.4, 1], [-2, 0.2], [3, 0], [20, 0]]),
    LG: RUNBLOCK([-1, -2]), RG: RUNBLOCK([-1, 2]), TE: RUNBLOCK([3, 0.5]), WR1: R('go'), WR2: R('go'),
  }, { type: 'run', tags: ['run', 'inside', 'long', 'draw'], desc: 'The line shows pass, the receivers run off, then the back takes it up the middle behind the tight end.' }),
  '2nd-and-long when the defence drops into coverage.', 'Patience: the back waits for the rushers to get upfield, then follows the tight end.', 'Max Drop, Cover 4 and Prevent.', 'Double A Mug and Run Wall.');

  add(O('spread_draw', 'Spread Draw', 'gun_spread', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-5.4, -1], [-2, -0.3], [3, 0], [20, 0]]),
    LG: RUNBLOCK([-1.5, -2]), RG: RUNBLOCK([-1.5, 2]), WR1: R('go'), WR2: R('go'), WR3: R('seam'),
  }, { type: 'run', tags: ['run', 'inside', 'long', 'draw'], desc: 'Three vertical routes clear the coverage; the back takes a delayed handoff into the empty middle.' }),
  '3rd-and-long when you expect a deep zone.', 'The routes must run hard to pull the defenders deep; the back hits the middle late.', 'Cover 4, Prevent and Max Drop.', 'QB Spy and Bear Front.');

  return { plays, lessons };
}
