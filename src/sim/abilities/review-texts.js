// Task 8 Reviewer v2 (spec §25): per-family texts and evidence hints for the four-phase checklist (review-phases.js evaluates them),
// and the separately labelled blocked / failure / interaction variants. Texts restate the approved contracts (each module's header);
// no value or rule lives here. Evidence hints (see review-phases.js):
//   field          the interaction creates a field: resolution = the field live or created; cleanup = every one expired
//   status         resolution = his status application attempt (accepted or refused by the shared gate)
//   resolveEvents  event kinds (his, or tagged with his ability) that evidence the resolution; resolveWhere filters them
//   resolveFn      a custom resolution reader; cleanupFn a custom cleanup condition
//   spent(state)   the game-scope state at the activation play's whistle shows the spend
//   absence        an absence is queued, served (slot vacant) and the absentee returns
//   gameHook       the activation is a rules.js game-level hook (no in-play ability event)
//   cooldown:false no recharge to wait for
import { REVIEW_ONLY } from '../engine.js';
import { blockedEval } from './review-blocked.js';

const after = (kinds, where = () => true) => ({ A, aT, act }) => { const e = A.allEvents.find((x) => kinds.includes(x.kind) && (x.t ?? 0) >= aT - 1e-6 && where(x)); return e ? { play: act, t: e.t ?? aT, text: `engine: ${(e.t ?? 0).toFixed(1)}s ${e.text}` } : null; };
const kickResult = ({ A, act }) => ({ play: act, t: 0, text: `kick result (rules.js): ${A.text}` });

export const SPECS = {
  // ------------------------------------------------------------------------------------------------------------------- Fire
  emberfox: { targets: 'Every defender within tackling reach when the first eligible tackle of the ignited carry begins', expect: 'On the ignited rushing carry the first eligible tackle starts one encounter: that tackler and every defender already in reach break their attempts; the ignition is spent; later arrivals tackle normally.',
    trigger: 'An ignited rushing carry (three qualifying rushes, or the staged ignition) and the first eligible tackle attempt on him', resolve: 'The encounter\'s tackle attempts break (broken tackles)', cleanup: 'Ignition spent; the next carry is ordinary and starts building charges again',
    resolveEvents: ['broken_tackle'], resolveWhere: (e) => e.side === 'off', spent: (s) => s.ignited === false },
  ashkit: { targets: 'Every non-Fire monster of both teams inside the 6 x 4 zone', expect: 'Three personally credited defensive plays fill the bar; at his next defensive snap a stationary Fire zone appears on his alignment spot and slows non-Fire monsters inside; it lasts 1-4 completed plays by mastery.',
    trigger: 'The bar full (three credited tackles / assists / sacks)', resolve: 'The Fire zone is created at his next defensive snap', cleanup: 'Bar empty; the zone expires after its lifetime', field: true, spent: (s) => s.bar === 0 && s.queued === false },
  firestorm: { targets: 'Opponents within 3 yards of the catch point', expect: 'A ready pass aimed 15+ yards downfield commits at the release; a completed catch releases a shockwave that pushes opponents within 3 yards away (1-1.75 yd by mastery); cooldown three offensive plays.',
    trigger: 'Ready (cooldown 0) and a forward pass aimed 15+ yards beyond the line', resolve: 'The completed catch releases the shockwave (opponents displaced)', cleanup: 'Cooldown runs three completed offensive plays and returns to ready',
    resolveEvents: ['ability'], resolveWhere: (e) => e.phase === 'shockwave' },
  cinderclaw: { targets: 'The first blocker who engages him', expect: 'The first blocker to engage him while ready is marked: in engagements against him only, that blocker\'s Strength and Blocking drop 10-16% by mastery for the rest of the play.',
    trigger: 'Ready and his first block engagement of the play', resolve: 'The blocker is marked (pair-only attribute reduction)', cleanup: 'The mark clears at the whistle; cooldown three defensive plays, then ready' },
  pyrelynx: { targets: 'Opponents (non-Fire) within 3 yards of him', expect: 'A passive aura: opponents within 3 yards lose 10-16% effective Catching by mastery while inside; Fire types are immune.',
    trigger: 'An opponent comes within 3 yards during live play', resolve: 'The opponent\'s Catching layer is reduced while inside', cleanup: 'The layer is removed when he leaves the aura or at the whistle; nothing carries to the next play', cooldown: false },
  pyroclast: { targets: 'Non-Fire monsters of both teams inside the Burning Wake', expect: 'A catch-and-run of 5+ yards after the catch earns a token; before his next offensive snap it becomes a Fire zone (width = YAC) 5 yards past the line that slows non-Fire monsters 25-34% by mastery for two completed plays.',
    trigger: 'A catch-and-run reaching 5 YAC while ready (the token is earned)', resolve: 'The Burning Wake is created before his next offensive snap', cleanup: 'Token spent at the spawn; the zone expires after two completed plays', field: true, spent: (s) => s.pending === false },
  // ------------------------------------------------------------------------------------------------------------------ Water
  tidepaw: { targets: 'Ball carriers and route runners who cut or stop inside the 6 x 4 Water patch', expect: 'His personally credited pass breakup while ready creates a Water patch at the deflection spot; sharp cuts or sudden stops inside roll a slip chance; it lasts two completed plays.',
    trigger: 'Ready and his own pass breakup', resolve: 'The Water patch is created at the deflection spot', cleanup: 'The patch expires after two plays; cooldown three plays, then ready', field: true },
  mudcub: { targets: 'Up to two defenders within his reach', expect: 'At a ready offensive snap he braces (spent at the snap); during the play he may hold two defenders at once within normal reach.',
    trigger: 'Ready at an eligible offensive snap', resolve: 'He holds two defenders at once', cleanup: 'The double hold ends at the whistle; cooldown, then ready', resolveEvents: ['ability'], resolveWhere: (e) => e.phase === 'double' },
  reefclaw: { targets: 'The engaged opposing blocker', expect: 'At his first block engagement while ready, the engaged blocker loses 5-20 current stamina points by mastery at once.',
    trigger: 'Ready and his first block engagement', resolve: 'The blocker\'s current stamina is drained', cleanup: 'The drain is permanent for the game (stamina pool); cooldown runs, then ready' },
  tidefin: { targets: 'Himself (the bobbled ball)', expect: 'A reached pass he fails to catch gets one more ordinary catch attempt at the same live ball (no bonus).',
    trigger: 'Ready and a reached pass he drops', resolve: 'The second ordinary attempt resolves (caught or incomplete)', cleanup: 'Cooldown runs, then ready', resolveFn: after(['catch', 'incomplete', 'interception']) },
  wavehorn: { targets: 'Opponents within 3 yards while his snap assignment is blocking', expect: 'A passive aura on blocking snaps: opponents within 3 yards lose 25-40% of effective Strength by mastery while inside.',
    trigger: 'A blocking snap assignment and an opponent within 3 yards', resolve: 'The opponent\'s Strength layer is reduced while inside', cleanup: 'The layer is removed outside the aura and at the whistle', cooldown: false },
  tsunarok: { targets: 'The opposing secondary\'s zone: everyone in the full-width Water line 12 yards deep', expect: 'His own interception while ready: before his team\'s next offensive snap a full-width Water line lands 12 yards past the line (slip 30-36% by mastery) for two completed plays; cooldown five.',
    trigger: 'Ready and his own secured interception', resolve: 'The Tsunami Line is created before his team\'s next offensive snap', cleanup: 'The line expires after two completed plays; the cooldown returns to ready', field: true },
  // ----------------------------------------------------------------------------------------------------------------- Nature
  thornkit: { targets: 'Opponents crossing the two Nature patches', expect: 'His first designated route cut of 45+ degrees while ready earns a token; at his next offensive snap two random Nature patches appear (one completed play).',
    trigger: 'Ready and his first designated route cut of 45+ degrees on a passing play', resolve: 'Two Nature patches are created at his next offensive snap', cleanup: 'The patches expire after one play; cooldown, then ready', field: true },
  mossclaw: { targets: 'The engaged blocker (vaulted over)', expect: 'Rushing the QB on a pass play, at his first single-block engagement while ready he vaults over the blocker to the nearest clear landing (Agility vs Blocking contest).',
    trigger: 'Ready, a pass rush and his first single-block engagement', resolve: 'He lands past the blocker', cleanup: 'Back to ordinary rushing; cooldown, then ready', resolveEvents: ['vault_land'] },
  rootram: { targets: 'Himself (and the first defender whose shed fails)', expect: 'At his first block engagement while ready he roots: no translation or forced displacement until the whistle; the first ordinary shed against him fails.',
    trigger: 'Ready and his first block engagement', resolve: 'He is rooted at the engagement point for the play', cleanup: 'Roots release at the whistle; cooldown, then ready' },
  leafhorn: { targets: 'One random other defensive teammate each snap', expect: 'Before each defensive snap one other teammate is chosen: he cannot receive Stumbled during the play.',
    trigger: 'A defensive scrimmage snap', resolve: 'The teammate is covered for the play', cleanup: 'Protection ends at the whistle; a new teammate is chosen next snap', cooldown: false },
  thornback: { targets: 'One non-Nature defender of the pre-play formation (the patch center)', expect: 'His first broken tackle after a reception while ready earns a token; at his next offensive snap an 8 x 6 Nature patch is centered on a random non-Nature defender (one play).',
    trigger: 'Ready and a broken tackle after his reception', resolve: 'The Bramble patch is created at his next offensive snap', cleanup: 'The patch expires after one play; cooldown, then ready', field: true },
  elderoot: { targets: 'His Grove Guardian clone (a temporary defender)', expect: 'At a ready defensive snap a clone appears beside him with 60-75% of his ratings by mastery and plays his assignment.',
    trigger: 'Ready at a defensive scrimmage snap', resolve: 'The clone is raised and plays the snap', cleanup: 'The clone leaves at the whistle; cooldown, then ready' },
  // --------------------------------------------------------------------------------------------------------------- Electric
  flicker: { targets: 'An allied route runner within 5 yards and the opposing defenders within 3 yards of either', expect: 'At a ready offensive snap he swaps routes with a nearby allied receiver; nearby defenders roll Confused.',
    trigger: 'Ready, a route snap and an allied route runner within 5 yards', resolve: 'The routes are crossed (and the Confused rolls made)', cleanup: 'Any Confused clears after its duration; cooldown, then ready' },
  voltfin: { targets: 'Opponents crossing the sideline-to-sideline Electric strip', expect: 'His rushing first down while ready earns a token; at his next offensive pre-play an 8-yard Electric strip appears (one play) and stuns crossers.',
    trigger: 'Ready and his own rushing first down', resolve: 'The Charge Strip is created at his next offensive snap', cleanup: 'The strip expires after one play; cooldown, then ready', field: true },
  voltfang: { targets: 'Himself (phased: ignores collisions and jams)', expect: 'At a ready route snap he phases: he ignores body collisions and jams until his first designated cut, the pass release or the whistle.',
    trigger: 'Ready at a receiving-route snap', resolve: 'Phased until the cut / release / whistle (then solidifies)', cleanup: 'Solid again; cooldown, then ready', resolveEvents: ['ability_end'] },
  stormlynx: { targets: 'Non-Electric monsters in the 12 x 7 Electric field 5-12 yards past the line', expect: 'Before every ready defensive snap an Electric field appears over his alignment; crossers may be stunned; one play.',
    trigger: 'Ready at a defensive scrimmage pre-play', resolve: 'The Static Field is created for the snap', cleanup: 'The field expires after the play; cooldown, then ready', field: true, gameHook: true },
  joltrex: { targets: 'The nearest other engaged offensive blocker within 3 yards', expect: 'His first successful ordinary block shed while ready arcs to another engaged blocker: a Stumbled attempt.',
    trigger: 'Ready and his first successful ordinary shed', resolve: 'The arc attempts Stumbled on the target', cleanup: 'Stumbled clears at the whistle; cooldown, then ready', status: true },
  stormcrown: { targets: 'Two temporary pass-blocking guards beside the line', expect: 'On a ready passing play two Stormguard blockers appear outside each end of the line and pass-protect.',
    trigger: 'Ready and an eligible passing play called', resolve: 'Both guards are summoned and block', cleanup: 'The guards leave at the whistle; cooldown, then ready' },
  // -------------------------------------------------------------------------------------------------------------------- Ice
  snowmoth: { targets: 'Opposing ball carriers in the 8 x 6 Ice patch on his team\'s next defensive snaps', expect: 'A made field goal banks a Frostmark; at his team\'s next defensive snap an Ice patch appears (braking 20/25% by form) for 1-4 opposing plays by mastery.',
    trigger: 'A successful field goal (no pending Frostmark)', resolve: 'The Ice patch is created at his team\'s next defensive snap', cleanup: 'The patch expires after its lifetime', field: true, cooldown: false },
  hailfang: { targets: 'His tracked receiver', expect: 'Before the release, when his receiver reaches two yards of separation, he fires a snowball: the receiver is Slowed for the rest of the play.',
    trigger: 'Ready and his tracked receiver two yards clear before the release', resolve: 'The snowball hits: Slowed applied', cleanup: 'Slowed clears at the whistle; cooldown, then ready', status: true },
  frostclaw: { targets: 'Offensive monsters under the two snowballs', expect: 'Three low-yardage defensive plays fill the bar; at his next defensive snap two snowballs fall: hit monsters may be stunned, misses leave obstacles for the play.',
    trigger: 'The bar full (three plays allowing 3 yards or less)', resolve: 'The snowballs land (hit or obstacle)', cleanup: 'Obstacles and stuns clear at the whistle; the bar refills from zero', resolveEvents: ['snowball'], spent: (s) => s.bar === 0 },
  icehorn: { targets: 'The opposing backfield inside the 10-yard Ice zone', expect: 'His tackle for loss or sack while ready banks Permafrost; at his next defensive pre-play an Ice zone covers the backfield.',
    trigger: 'Ready and his personal tackle for loss or sack', resolve: 'The Permafrost zone is created at his next defensive snap', cleanup: 'The zone expires; the cooldown returns to ready', field: true },
  glaciron: { targets: 'The first opposing monster attempting a new activation inside his 3-yard aura', expect: 'While block-engaged and ready, the first new opposing activation inside 3 yards is suppressed (Cold Snap).',
    trigger: 'Ready, engaged, and an opposing activation attempt inside 3 yards', resolve: 'The opposing activation is suppressed', cleanup: 'The suppression lasts the play; cooldown, then ready' },
  glacivern: { targets: 'Himself (the retried kick)', expect: 'The first eligible missed field goal of the game is retried at once with a fresh ordinary check.',
    trigger: 'His first eligible missed field goal', resolve: 'The retry\'s result', cleanup: 'Once per game: used', resolveFn: kickResult, spent: (s) => s.used === true, cooldown: false },
  // ------------------------------------------------------------------------------------------------------------------- Wind
  gustling: { targets: 'Allies running through the 6-wide Wind runway at the line', expect: 'At his next offensive snap while ready a Wind runway appears at the line (before the play calls).',
    trigger: 'Ready at an offensive snap\'s pre-choice point', resolve: 'The Wind runway is created for the snap', cleanup: 'The runway expires after its lifetime; cooldown, then ready', field: true, gameHook: true },
  breezefang: { targets: 'Opponents around him when he crosses the line', expect: 'With the bar full (broken tackles) his next rushing play activates when he crosses the line: everyone near is blasted back.',
    trigger: 'The bar full and a rushing carry crossing the line', resolve: 'The blast displaces nearby opponents', cleanup: 'Bar empty; refills from broken tackles', spent: (s) => s.charges === 0 },
  skywarden: { targets: 'The receiver he guards', expect: 'With the bar full (three PBUs), a catch by the receiver he guards within 8 yards drives that receiver back.',
    trigger: 'The bar full and a catch by his receiver', resolve: 'The receiver is driven back', cleanup: 'Bar empty; refills from breakups', spent: (s) => s.charges === 0 },
  windlynx: { targets: 'Allies in the two Wind lanes', expect: 'With the bar full (two PBUs) his next defensive pre-play creates two Wind lanes.',
    trigger: 'The bar full at a defensive pre-play', resolve: 'The two Wind lanes are created', cleanup: 'Bar empty; the lanes expire after their lifetime', field: true, gameHook: true, spent: (s) => s.charges === 0 },
  zephyr: { targets: 'The nearest eligible allied non-Wind blocker with a running cooldown', expect: 'At a ready offensive snap he picks a nearby allied blocker whose cooldown is running; at the whistle that cooldown loses one extra unit.',
    trigger: 'Ready and an eligible allied blocker with a running cooldown in range', resolve: 'The blocker\'s cooldown is reduced by one extra unit', cleanup: 'His own cooldown runs, then ready' },
  tempestra: { targets: 'The first three different non-Wind opponents near the tornado', expect: 'Three receptions fill the bar; his next reception creates a stationary tornado that fires crescent blasts at up to three opponents (Stumbled).',
    trigger: 'The bar full and his next reception', resolve: 'The tornado fires and its blasts hit', cleanup: 'The tornado ends at the whistle; the bar refills from receptions', resolveEvents: ['ability_hit', 'ability_shot'], spent: (s) => s.charges === 0 },
  // ------------------------------------------------------------------------------------------------------------------ Earth
  pebble: { targets: 'The defender at his first pancake opportunity', expect: 'A banked guarantee turns his first legal pancake opportunity on a later play into a guaranteed pancake (Knocked Down).',
    trigger: 'A banked guarantee and his first pancake opportunity', resolve: 'The guaranteed pancake', cleanup: 'Guarantee spent; it is banked again by an ordinary pancake', spent: (s) => s.banked === false },
  rockram: { targets: 'The opposing passer\'s next legal forward pass', expect: 'Three qualifying low-yardage defensive plays fill the bar; the next legal forward pass is knocked down (incomplete).',
    trigger: 'The bar full and a legal forward pass', resolve: 'The pass is knocked down: incomplete', cleanup: 'Bar empty; refills from qualifying plays', resolveFn: after(['incomplete']), spent: (s) => s.bar === 0 },
  boulderox: { targets: 'The defender three yards ahead', expect: 'On a designed carry while ready, a defender within three yards ahead triggers the boulder charge: a push contest.',
    trigger: 'Ready, a designed carry and a defender three yards ahead', resolve: 'The push contest resolves', cleanup: 'Cooldown, then ready', resolveEvents: ['stone_charge'] },
  stoneguard: { targets: 'The punt returner', expect: 'Once per game, his first punt caught in the field of play: the returner is cuffed at the catch spot (no return).',
    trigger: 'His first punt caught and returnable', resolve: 'The return is canceled at the catch spot', cleanup: 'Once per game: used', resolveFn: kickResult, spent: (s) => s.used === true, cooldown: false },
  terrabull: { targets: 'Pursuers on the wall side', expect: 'A secure reception 5+ yards past the line while ready raises a one-sided stone wall beside him that stops pursuers.',
    trigger: 'Ready and a secure reception 5+ yards past the line', resolve: 'The stone wall rises (and stops a pursuer or cracks)', cleanup: 'The wall goes at the whistle; cooldown, then ready' },
  titanolith: { targets: 'The defenders aligned in front of the wall', expect: 'Once per possession at the first eligible snap a stone wall erupts across the front and pushes those defenders back.',
    trigger: 'The first eligible offensive snap of the possession', resolve: 'The wall pushes the front back', cleanup: 'Used for this possession; no second wall on the next snap', spent: (s) => s.usedDrive != null },
  // ------------------------------------------------------------------------------------------------------------------- Dark
  shadowkit: { targets: 'Opposing receivers in the Dark patch', expect: 'His own pass breakup while ready banks a Dark field; it is created at his next defensive snap.',
    trigger: 'Ready and his own pass breakup', resolve: 'The Shadow Patch is created at his next defensive snap', cleanup: 'The field expires after its lifetime; cooldown, then ready', field: true },
  nightowl: { targets: 'Non-Dark allies inside his radius standing in an opposing Dark field', expect: 'Allies inside his 4-7 yard radius (by mastery) ignore an opposing Dark field\'s effect.',
    trigger: 'An ally inside his radius stands in an opposing Dark field', resolve: 'The ally keeps his sight', cleanup: 'The cover ends outside the radius / at the whistle', cooldown: false },
  duskrunner: { targets: 'The defender he jukes', expect: 'After the mastery-required rushing yards, his first ordinary juke while ready leaves the defender unable to find him.',
    trigger: 'Ready, the required rushing yards, and an ordinary juke', resolve: 'The juked defender loses him', cleanup: 'Cooldown, then ready' },
  mireclaw: { targets: 'The opposing ball carrier', expect: 'Three plays allowing 4 yards or less fill the bar; the next snap launches the claw: the carrier is Weakened for the play.',
    trigger: 'The bar full', resolve: 'The claw tags the carrier (Weakened attempt)', cleanup: 'Weakened clears at the whistle; the bar refills', status: true, spent: (s) => s.charges === 0 },
  nocturne: { targets: 'Allied receivers in the Blackout Pocket', expect: 'His completion of 15+ yards while ready banks a Dark field created at his next offensive snap.',
    trigger: 'Ready and his own 15+ yard completion', resolve: 'The Blackout Pocket is created at his next offensive snap', cleanup: 'The field expires; cooldown, then ready', field: true },
  nyxshade: { targets: 'The ally he swaps with (the closer defender at the catch point)', expect: 'With the bar full (two PBUs), at a pass release an ally near the catch point swaps places with him.',
    trigger: 'The bar full and an ally within 3 yards of the catch point at the release', resolve: 'The swap', cleanup: 'Bar empty; refills from breakups', spent: (s) => s.charges === 0 },
  // ------------------------------------------------------------------------------------------------------------------ Light
  glimmer: { targets: 'Allies in the Beacon Lane', expect: 'His receiving first down while ready banks a Light field created at his next offensive snap (paused clock).',
    trigger: 'Ready and his receiving first down', resolve: 'The Beacon Lane is created', cleanup: 'The field expires after its lifetime; cooldown, then ready', field: true },
  sunwhistle: { targets: 'The kickoff coverage teammate it quickens', expect: 'A good extra point banks support; on his kickoff a coverage teammate is Quickened for the play.',
    trigger: 'His club\'s successful extra point', resolve: 'Quickened applied on the kickoff', cleanup: 'Quickened clears at the whistle; support spent', status: true, spent: (s) => s.pending === false, cooldown: false },
  lumen: { targets: 'The first allied receiver catching within the aura', expect: 'The first allied reception within his radius of the line is Shielded (one fumble save) for its duration.',
    trigger: 'Ready and an allied reception inside the radius', resolve: 'Shielded applied to the receiver', cleanup: 'Shielded expires after its duration; cooldown, then ready', status: true },
  prism: { targets: 'The enemy Wind zone (removed)', expect: 'With the bar full, at his defensive pre-choice point he removes an enemy zone (Prism Break).',
    trigger: 'The bar full and an enemy zone on the field', resolve: 'The enemy zone is removed', cleanup: 'Bar empty (no charge this play)', gameHook: true, spent: (s) => s.charges === 0,
    resolveFn: ({ A, act }) => { const gone = A.fieldsBefore.list.filter((f) => !f.own && !A.fieldsAfter.list.some((g) => g.id === f.id && g.holes === f.holes)); const line = A.gameLog.find((x) => x.kind === 'ability'); return gone.length || line ? { play: act, t: 0, text: `${line ? line.text : ''}${gone.length ? ` (field ${gone.map((f) => `${f.type} ${f.id}`).join(', ')} removed or cut)` : ''}` } : null; } },
  halofang: { targets: 'Himself (pursuit speed until his tackle)', expect: 'The mastery-required rushing tackles arm Radiant Pursuit; his next defensive snap lights it up until his tackle.',
    trigger: 'Armed (required rushing tackles)', resolve: 'Radiant Pursuit active until it fades into a tackle', cleanup: 'Spent; re-armed by new tackles', resolveEvents: ['ability_end', 'ability'], spent: (s) => s.armed === false },
  aurelion: { targets: 'Everyone affected by the flare', expect: 'Two conceded touchdowns charge Daybreak; his live reception flares it.',
    trigger: 'Both charges (two opposing touchdowns) and a live reception', resolve: 'Daybreak flares', cleanup: 'Charges spent', cooldown: false },
  // ------------------------------------------------------------------------------------------------------------------ Metal
  ironcub: { targets: 'The defender pushing him', expect: 'At his first engagement while ready the Anchor Plate drops and absorbs the defender\'s push.',
    trigger: 'Ready and an engagement whose defender begins a push', resolve: 'Push absorbed (yards logged at the whistle)', cleanup: 'Cooldown, then ready', resolveEvents: ['ability_end'] },
  steelpaw: { targets: 'Allied defenders within 3-6 yards at the snap', expect: 'Allies near him at the snap have their stamina drain reduced on qualifying plays.',
    trigger: 'Allies within range at the snap on a qualifying play', resolve: 'Their drain is reduced', cleanup: 'Per play', cooldown: false },
  gearwing: { targets: 'Opposing offense in the Metal Gear Grid', expect: 'His punt of 35+ net yards without a touchback banks a Metal field created at the opposing offense\'s next snap.',
    trigger: 'A 35+ net-yard punt, no touchback', resolve: 'The Gear Grid is created', cleanup: 'The field expires after its lifetime', field: true, cooldown: false },
  ironjaw: { targets: 'The ball carrier he tackles (the ball)', expect: 'An own sack while ready earns the token. On his next successful normal tackle whose first fumble check did not fumble, he makes ONE extra ordinary fumble check at 0.25 / 0.40 / 0.55 / 0.70 of the normal probability; no guaranteed turnover.',
    trigger: 'The token (earned by his own sack) and a successful normal tackle whose first fumble check held', resolve: 'The extra fumble check is rolled (fumble or held)', cleanup: 'Token spent; his next tackle has no extra check',
    triggerEvent: (e, { slot }) => (e.kind === 'tackle' || e.kind === 'fumble') && e.by === slot, triggerReady: (st, { charges }) => st?.token === true || charges.length > 0,
    resolveFn: ({ aEv, act, plays }) => { if (!aEv || aEv.p == null) return null; const A = plays[act]; const fum = A.allEvents.find((e) => e.kind === 'fumble'); return { play: act, t: aEv.t, text: `extra ordinary fumble check at p = ${(aEv.p * 100).toFixed(3)}%: ${aEv.fumble ? `jarred loose${fum ? ` (${fum.text})` : ''}` : 'held, no fumble'} · token true -> ${A.after.token}` }; },
    spent: (s) => s.token === false,
    cleanupFn: ({ plays, act, slot }) => { const i = plays.findIndex((p, j) => j > act && p.allEvents.some((e) => e.kind === 'tackle' && e.by === slot) && !p.allEvents.some((e) => e.ability === 'MET-04-F')); return i > 0 ? { ok: true, text: `his next tackle (play ${plays[i].n}) had no extra check` } : { ok: false, text: 'his next tackle without an extra check' }; } },
  metalhorn: { targets: 'Allies in the Bulwark Grid', expect: 'His receiving first down (or pancake) while ready banks a Metal field created at his next offensive snap.',
    trigger: 'Ready and his receiving first down or pancake', resolve: 'The Bulwark Grid is created', cleanup: 'The field expires; cooldown, then ready', field: true },
  aegistron: { targets: 'Opponents meeting the gate panels', expect: 'Armed (three low-yardage plays), once per defensive possession the Fortress Gate panels rise on safe ground.',
    trigger: 'Armed and unused this possession', resolve: 'The gate panels rise', cleanup: 'Panels go at the whistle; used for this possession', spent: (s) => s.armed === false },
  // ---------------------------------------------------------------------------------------------------------------- Psychic
  mindwing: { targets: 'The opposing backfield inside the Psychic zone', expect: 'His tackle or assist after a completion while ready banks a Psychic zone created at the next defensive pre-choice.',
    trigger: 'Ready and his tackle after an opposing completion', resolve: 'The Mind Bend zone is created', cleanup: 'The zone expires; cooldown, then ready', field: true },
  shadewisp: { targets: 'His man receiver', expect: 'In man coverage, his receiver\'s first route cut in range is mirrored at once.',
    trigger: 'Ready, man coverage and his receiver\'s first cut in range', resolve: 'He mirrors the cut', cleanup: 'Cooldown, then ready' },
  cerebrix: { targets: 'The marked linebacker', expect: 'An LB within 3 yards of the line is marked; if he blitzes he is Confused for the play.',
    trigger: 'Ready and an LB aligned within 3 yards', resolve: 'The mark resolves (confused / misses)', cleanup: 'Confusion clears at the whistle; cooldown, then ready', status: true, triggerEvent: (e, { slot }) => e.kind === 'foresight_mark' && e.by === slot },
  echolot: { targets: 'The opposing offense in the Psychic field', expect: 'His kickoff returned without a touchdown while ready banks a Psychic field created at the next opposing offensive snap.',
    trigger: 'Ready and his kickoff caught and returned (no touchdown)', resolve: 'The Echo Landing field is created', cleanup: 'The field expires; ready again after the cooldown', field: true, cooldown: false },
  enigmane: { targets: 'His man defender (chases the afterimage)', expect: 'Four plays without a reception fill the bar; at his first route cut with his man within 2 yards the man bites on an afterimage.',
    trigger: 'The bar full and a cut with his man within 2 yards', resolve: 'The defender chases the afterimage', cleanup: 'The afterimage ends; bar empty', spent: (s) => s.bar === 0 },
  astralux: { targets: 'Himself (teleport upfield)', expect: 'Once per game, after 8 net rushing yards, a new tackle attempt makes him blink upfield.',
    trigger: '8 net rushing yards and a new tackle attempt', resolve: 'He blinks upfield', cleanup: 'Once per game: used', spent: (s) => s.used === true, cooldown: false },
  // ----------------------------------------------------------------------------------------------------------------- Dragon
  drakeling: { targets: 'The next tackler', expect: 'An ordinary juke or broken tackle prepares the pounce for the next tackle attempt on the same carry.',
    trigger: 'An ordinary juke or broken tackle on the carry', resolve: 'The pounce contest against the next tackler', cleanup: 'Per carry', cooldown: false },
  wyrmkit: { targets: 'Allies inside the Dragon Call radius at the snap', expect: 'Three offensive plays fill the bar; at his next offensive snap the call pulses: harmful statuses cleansed and protected for the play.',
    trigger: 'The bar full at an offensive snap', resolve: 'The pulse cleanses and protects recipients', cleanup: 'The protection ends at the whistle; bar empty', spent: (s) => s.bar === 0 },
  sablewing: { targets: 'The ball (carried to a new spot)', expect: 'Any fumble he recovers on a defensive scrimmage play triggers the flight: the ball goes to a better spot for his offense.',
    trigger: 'A fumble he recovers', resolve: 'The flight sets the turnover spot', cleanup: 'His team\'s next offensive snap starts at the flight spot', cooldown: false,
    cleanupFn: ({ plays, act }) => { const e = plays[act].allEvents.find((x) => x.ability === 'DRA-03-F'); const nx = plays[act + 1]; return nx && e && nx.situation.possession === 'home' && nx.situation.ballOn === e.spot ? { ok: true, text: `his offense snapped at the flight spot (own ${e.spot}) on play ${nx.n}` } : { ok: false, text: `his offense's next snap at the flight spot (${e?.spot})` }; } },
  scaleguard: { targets: 'The engaged DL', expect: 'Three plays finished engaged fill the bar; the next engagement with a DL stomps: a Knocked Down attempt.',
    trigger: 'The bar full and an engagement with a DL', resolve: 'The stomp (flattens or withstood)', cleanup: 'Knocked Down clears at the whistle; bar empty', spent: (s) => s.bar === 0 },
  vyrnax: { targets: 'His chosen field-goal attempt', expect: 'The player\'s chosen field-goal attempt gets the Dragon Roar.',
    trigger: 'The player\'s Dragon Roar call on an eligible attempt', resolve: 'The roared kick\'s result', cleanup: 'Once per game: used', resolveFn: kickResult, spent: (s) => s.used === true, cooldown: false },
  aurodrax: { targets: 'The would-be interceptor (swallowed by the spectral dragon)', expect: 'Charged (three consecutive qualifying completions), his next released pass is protected once per game: a would-be interception falls incomplete, a spectral dragon swallows the defender, who misses his team\'s next defensive snap against Aurodrax\'s offense and returns the play after.',
    trigger: 'Charged, unused, and his released pass reaching the catch point', resolve: 'Dragon intervention: the would-be interception is denied, the pass falls incomplete and the defender is swallowed', cleanup: 'The defender is absent on the next offensive play and returns on the play after; the protection is used for the game',
    triggerEvent: (e) => e.kind === 'throw', triggerReady: (st) => st?.charged === true && st?.used === false, absence: true, spent: (s) => s.used === true && s.charged === false, cooldown: false,
    resolveFn: ({ A, act, aT }) => { const ev = A.allEvents; const deny = ev.find((e) => e.contract === true && /cannot hold it/.test(e.text) && (e.t ?? 0) >= aT - 1e-6); const inc = ev.find((e) => e.kind === 'incomplete' && e.denied); const sw = ev.find((e) => e.kind === 'dragon_swallow');
      if (!deny || !inc || !sw) return null; return { play: act, t: deny.t, text: `1. dragon intervention: ${deny.text} (${deny.victim}) · 2. ${inc.text} · 3. ${sw.text}`, steps: [deny, inc, sw] }; } },
};

// --------------------------------------------------------------------------------------------------- labelled variants
// kind: 'blocked' (a real gate prevents the start: nothing is spent), 'failure' (the trigger condition is not met: the ordinary
// outcome stands) or 'interaction' (an important interaction, a full demonstration with its own scenario). A blocked / failure variant
// carries `spec.blocked` (review-phases.js blockedEval); an interaction variant is evaluated like the main demonstration.
const ECLIPSE = ({ addField }) => { for (const type of ['Light', 'Dark']) addField({ type, strength: 25, centerLat: 0, width: 53.3, yardFrom: 0, yardTo: 100, ownerTeam: 'away', ability: `scenario-${type.toLowerCase()}` }); };
const MAN_PASS = [['quick_slants', 'cover_2_man'], ['curl_flat', 'man_press'], ['stick', 'cover_1'], ['smash', 'cover_2_man']];
const RUNS = [['inside_zone', 'cover_3'], ['power_right', 'cover_2_man'], ['outside_zone', 'cover_4'], ['dive', 'man_press']];
const sovereignOptions = ({ state }) => { const st = state.t8.ability.review_subject; return st && !st.used ? { [REVIEW_ONLY]: { wouldBeInterception: true } } : null; };

export const VARIANTS = {
  aurodrax: [
    { id: 'failure-uncharged', kind: 'failure', label: 'Failure: not charged (the would-be interception stands)',
      scenario: { prime: null, seeds: 6, snaps: 4, options: () => ({ [REVIEW_ONLY]: { wouldBeInterception: true } }), how: 'no charge (streak 0); the same controlled would-be interception: Sovereign Arm is not charged, so the ordinary interception stands' },
      spec: { blocked: blockedEval({ situation: (p) => p.allEvents.find((e) => e.kind === 'throw'), reason: (p) => (!p.before?.charged ? `not charged (state ${JSON.stringify(p.before)})` : null), ordinary: (p) => p.allEvents.find((e) => e.kind === 'interception'), kept: (b, a) => a.charged === false && a.used === false,
        labels: ['Pass released at the catch point', 'No activation: Sovereign Arm not charged', 'Ordinary outcome: the interception stands', 'Nothing spent (streak reset by the play, protection unused)'] }) } },
    { id: 'blocked-eclipse', kind: 'blocked', label: 'Blocked: inside an Eclipse (charge kept)',
      scenario: { setup: ECLIPSE, seeds: 6, snaps: 4, options: () => ({ [REVIEW_ONLY]: { wouldBeInterception: true } }), how: 'charged; an opposing Light + Dark field over the whole field forms an Eclipse: active signatures cannot start inside; the same controlled would-be interception' },
      spec: { blocked: blockedEval({ situation: (p) => p.allEvents.find((e) => e.kind === 'throw'), reason: (p, { slot }) => { const e = p.allEvents.find((x) => x.kind === 'field_blocked_start' && x.by === slot); return e ? e.text : null; }, ordinary: (p) => p.allEvents.find((e) => e.kind === 'interception'), kept: (b, a) => a.charged === true && a.used === false,
        labels: ['Charged pass at the catch point', 'Activation blocked by the Eclipse', 'Ordinary outcome: the interception stands', 'Nothing spent: the charge is kept'] }) } },
  ],
  ironjaw: [
    { id: 'interaction-jarred-loose', kind: 'interaction', label: 'Interaction: the extra check jars the ball loose (natural roll, fixed seed)',
      scenario: { prime: () => ({ token: true }), calls: RUNS, seeds: 1, snaps: 12, seed0: (form, mastery) => (mastery === 3 ? 57 : 123), how: 'token primed; run plays; the fixed seed (123; 57 at mastery 3) is the first where the extra check\'s own roll on the abilities\' random stream comes up fumble: a natural outcome, not forced (found by an offline search of seeds 1-3000)' },
      spec: { cleanupFn: null, resolveFn: (x) => { const r = SPECS.ironjaw.resolveFn(x); return r && x.aEv?.fumble ? r : null; }, resolve: 'The extra fumble check jars the ball loose (the fumble and its ordinary recovery)' } },
    { id: 'failure-no-token', kind: 'failure', label: 'Failure: no token (an ordinary tackle, no extra check)',
      scenario: { prime: () => ({ token: false }), calls: RUNS, seeds: 6, snaps: 12, how: 'no token: his tackles are ordinary' },
      spec: { blocked: blockedEval({ situation: (p, { slot }) => p.allEvents.find((e) => e.kind === 'tackle' && e.by === slot && !e.offBlock), reason: (p) => (p.before?.token !== true ? `no token (state ${JSON.stringify(p.before)})` : null), ordinary: (p, { slot }) => p.allEvents.find((e) => e.kind === 'tackle' && e.by === slot && !e.offBlock), kept: (b, a) => a.token === false,
        labels: ['His successful normal tackle', 'No activation: no Ball Clamp token', 'Ordinary outcome: the tackle, one fumble check only', 'Nothing spent'] }) } },
    { id: 'blocked-eclipse', kind: 'blocked', label: 'Blocked: inside an Eclipse (token kept)',
      scenario: { prime: () => ({ token: true }), calls: RUNS, setup: ECLIPSE, seeds: 6, snaps: 12, how: 'token primed; an opposing Light + Dark field over the whole field forms an Eclipse' },
      spec: { blocked: blockedEval({ situation: (p, { slot }) => p.allEvents.find((e) => e.kind === 'tackle' && e.by === slot && !e.offBlock), reason: (p, { slot }) => { const e = p.allEvents.find((x) => x.kind === 'field_blocked_start' && x.by === slot); return e ? e.text : null; }, ordinary: (p, { slot }) => p.allEvents.find((e) => e.kind === 'tackle' && e.by === slot && !e.offBlock), kept: (b, a) => a.token === true,
        labels: ['His successful normal tackle with the token', 'Activation blocked by the Eclipse', 'Ordinary outcome: the tackle', 'Nothing spent: the token is kept'] }) } },
  ],
  firestorm: [
    { id: 'blocked-eclipse', kind: 'blocked', label: 'Blocked: inside an Eclipse (cooldown not spent)',
      scenario: { setup: ECLIPSE, seeds: 4, snaps: 6, how: 'ready; deep aimed passes inside an opposing Eclipse: the powered release cannot start' },
      spec: { blocked: blockedEval({ situation: (p, { slot }) => p.allEvents.find((e) => e.kind === 'field_blocked_start' && e.by === slot), reason: (p, { slot }) => { const e = p.allEvents.find((x) => x.kind === 'field_blocked_start' && x.by === slot); return e ? `${e.text} (the deep release tried to start)` : null; }, ordinary: (p) => p.allEvents.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind)), kept: (b, a) => a.cd === 0,
        labels: ['A deep aimed pass released while ready', 'Activation blocked by the Eclipse', 'Ordinary outcome: the pass resolves normally', 'Nothing spent: cooldown stays 0'] }) } },
  ],
  mossclaw: [
    { id: 'interaction-cold-snap', kind: 'interaction', label: 'Interaction: an opposing Cold Snap suppresses the vault',
      scenario: { setup: ({ place }) => { for (const s2 of ['LG', 'RG']) place('away', 'offense', s2, { species: 'glaciron' }, `scenario_glaciron_${s2}`); }, how: 'ready; an opposing Glacier Wall OL (Cold Snap, ready) pass-blocks: the vault attempt inside his aura is suppressed' },
      spec: { blocked: blockedEval({ situation: (p, { slot }) => p.allEvents.find((e) => e.kind === 'ability' && e.ability === 'ICE-05-F' && e.victim === slot), reason: (p, { slot }) => { const e = p.allEvents.find((x) => x.kind === 'ability' && x.ability === 'ICE-05-F' && x.victim === slot); return e ? e.text : null; }, ordinary: (p) => p.allEvents.find((e) => ['sack', 'throw', 'handoff'].includes(e.kind)), kept: (b, a) => a.cd === 0,
        labels: ['His vault attempt inside the Cold Snap aura', 'Activation suppressed by the opposing Cold Snap', 'Ordinary outcome: the play continues', 'Nothing spent: readiness kept'] }) } },
  ],
};
