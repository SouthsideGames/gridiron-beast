// Coach Assist 1.0 (GDD §27.3): one guidance system for the whole game. Pure data and rules; no DOM. The UI (src/ui/tutorial.js)
// renders what these functions decide. Preferences live in the franchise save (f.settings.assist); first-use tips are remembered
// in f.tutorial.seen, so a tip dismissed once stays dismissed in every mode until the player asks to see the tips again.
// Coach Assist never makes a decision, never changes a number in the game, and never touches achievements or the Hall of Fame.

export const ASSIST_MODES = Object.freeze(['guided', 'standard', 'expert']);
export const ASSIST_MODE_TEXT = Object.freeze({
  guided: { label: 'Guided', text: 'Step-by-step help the first time you meet each screen, plain-language explanations, a suggestion when a choice is hard, and what each choice will do.' },
  standard: { label: 'Standard', text: 'A short tip the first time you meet each screen, and brief notes where they matter. Recommended.' },
  expert: { label: 'Expert', text: 'No automatic tips. "? Help" is still on every complex screen, and confirmations for choices you cannot undo always stay.' },
});
export const ASSIST_DEFAULTS = Object.freeze({ mode: 'standard', hints: true, consequences: true });

/**
 * The player's Coach Assist preferences with defaults filled in. Saves from before Coach Assist have none: their old switches
 * carry over (tutorial tips off → Expert; the "Coaching hints" switch → contextual hints), otherwise the safe defaults apply.
 */
export function assistSettings(f) {
  const s = f?.settings || {}; const a = s.assist || {};
  const mode = ASSIST_MODES.includes(a.mode) ? a.mode : (s.tutorial === false ? 'expert' : ASSIST_DEFAULTS.mode);
  const hints = typeof a.hints === 'boolean' ? a.hints : s.hints !== false;
  const consequences = typeof a.consequences === 'boolean' ? a.consequences : ASSIST_DEFAULTS.consequences;
  return { mode, hints, consequences };
}
/** Change one or more preferences (invalid values are refused). Keeps the two older switches in step so nothing that reads them drifts. */
export function setAssist(f, patch = {}) {
  if (!f) return { ok: false, reason: 'No franchise.' };
  const cur = assistSettings(f); const next = { ...cur };
  if ('mode' in patch) { if (!ASSIST_MODES.includes(patch.mode)) return { ok: false, reason: 'Unknown mode.' }; next.mode = patch.mode; }
  for (const k of ['hints', 'consequences']) if (k in patch) next[k] = !!patch[k];
  f.settings ||= {}; f.settings.assist = next; f.settings.tutorial = next.mode !== 'expert'; f.settings.hints = next.hints;
  return { ok: true, assist: next };
}
export const isGuided = (f) => assistSettings(f).mode === 'guided';
export const isExpert = (f) => assistSettings(f).mode === 'expert';
/** Contextual hints (counter plays, upgrade badges, "who fits" notes): a switch of their own, in every mode. */
export const hintsOn = (f) => assistSettings(f).hints;
/** Routine consequence lines ("this costs 42,000 of cap room"): a switch of their own. Confirmations for irreversible actions do not depend on it. */
export const consequencesOn = (f) => assistSettings(f).consequences;
/** Decision support ("Suggested: ..."): Guided only, and never a decision made for the player. */
export const suggestionsOn = (f) => isGuided(f);

/**
 * Topics. `brief` is the Standard tip; `steps` the Guided walk-through added to it. `screens` are where the topic is shown first
 * (auto, once) and where it is listed under "? Help". Plain words: no front-office jargon a younger player would not know.
 */
export const TOPICS = Object.freeze({
  // --- onboarding
  owner: { area: 'Getting started', title: 'You are the owner', brief: 'You run the club, not the plays on the field. You hire the coaches, sign and train the monsters, and choose six plays for each side every week. On Sunday you call one of those plays on each snap and the monsters do the rest.', steps: ['Hire the staff (or keep the balanced staff you were given).', 'Each week, work through Monday to Saturday from headquarters.', 'Play the game on Sunday, then do it again next week.'], screens: ['welcome'] },
  staff: { area: 'Getting started', title: 'Your coaching staff', brief: 'Five coaches. The head coach and the two coordinators set the schemes your plays come from, the scout finds monsters and reports on opponents, and the trainer runs practice. A coach who likes the same scheme as your monsters gives a small edge.', steps: ['Look at each role and what it does.', 'Hire one coach per role; the cost counts against your salary cap.', 'You can replace a coach later from the Staff screen.'], screens: ['hire', 'staff'] },
  week: { area: 'Getting started', title: 'Welcome to your week', brief: 'A season is 10 weeks. Each week runs Monday to Sunday: scout monsters, battle one to sign it, train, study the opponent, set your plays, talk to the press, then play on Sunday. The big yellow button always says what is next. "Let the staff run the week" does the weekday chores for you.', steps: ['Press the big yellow button: it opens today\'s job.', 'Finish the job and you come back here for the next day.', 'On Sunday the button starts the game.'], screens: ['hq'], primer: true },
  postgame: { area: 'Getting started', title: 'After the game', brief: 'The box score shows who did what. Your monsters earn experience and get tired; practice adds a little more, Saturday\'s lineup check takes most of it off, and a bye clears it. Win and the standings climb; lose and the season moves on, no replays.', screens: [], after: 'week' },
  // --- scouting and recruitment
  scout: { area: 'Scouting and signing', title: 'Monday: scouting', brief: 'Pick a region and your scout brings back prospects. Each region has its own elements (types) of monster. A better scout finds more prospects and shows more of their ratings.', steps: ['Pick a region whose element you want.', 'Read the prospects: position, overall (OVR) and the ratings your scout could see.', 'Tomorrow you can battle one of them to sign it.'], screens: ['scout'] },
  attributes: { area: 'Scouting and signing', title: 'Ratings and potential', brief: 'Every monster has twelve ratings, but each position only uses some of them (accuracy matters to a quarterback, not a receiver). OVR is the overall for its position. Potential is how far it can still grow. A "?" means your scout has not seen that rating yet.', steps: ['Compare OVR with your monster at the same position (the ⓘ button does it for you).', 'A young monster with high potential grows the most.', 'More → What the stats mean lists what every rating does at every position.'], screens: ['scout', 'monster'] },
  recruit: { area: 'Scouting and signing', title: 'Tuesday: monster encounter', brief: 'Pick one prospect and meet it in a 3v3 Beast Clash. Only that prospect can join you: it fights beside two wild companions that cannot be signed, and the companions are matched to your club\'s strength, so the battle stays a real test as your team grows. Win and the prospect wants to sign; lose and you still get one pitch. Signing costs salary against your cap.', steps: ['Choose the prospect you want most.', 'Keep the automatic lineup or pick your three strongest healthy monsters: a stronger lineup wins more often, a weaker one never makes the companions easier.', 'Choose Play, Auto or Skip to results, then sign the prospect or let it go.'], screens: ['recruit'] },
  companions: { area: 'Scouting and signing', title: 'Wild companions', brief: 'Why 3v3: a monster in the wild runs with a pack, so you meet three. The prospect you chose leads; the other two are wild companions. They are never signable, never join the roster, and their strength follows your club: the three together sit a little below your best three. Your strongest lineup wins about four times in five; your weakest rarely wins.', screens: ['recruit', 'clash-battle'] },
  skips: { area: 'Scouting and signing', title: 'Skip Encounter or Skip to Results?', brief: '"Skip the encounter" means no battle this Tuesday: no signing, and nothing else lost. "Skip to results" still fights the battle, it just shows the result at once: the same battle, the same winner, the same experience.', screens: ['recruit', 'clash-battle'] },
  // --- Beast Clash
  clash: { area: 'Beast Clash', title: 'How Beast Clash works', brief: 'Each side lines up three monsters. The front two trade strikes, Supports and bench Disruptors act from the back, and a side may swap its front monster every few exchanges. The last side standing wins, or the side with more health left after 30 exchanges.', steps: ['Your strongest healthy monsters are picked for you; change them if you like.', 'Play lets you make the swap calls; Auto watches the same battle; Skip to results shows it at once.', 'Everyone who battled earns experience and gets a little tired.'], screens: ['clash-battle'] },
  elements: { area: 'Beast Clash', title: 'Elements and abilities', brief: 'Every monster has an element (fire, water and so on). Some elements hit others harder, and every monster has one move and an ability that can turn a battle. A swap can put a better match-up in front.', screens: ['clash-battle'] },
  decisions: { area: 'Beast Clash', title: 'Your call: swap or stay', brief: 'In Play mode the battle stops when you may swap. Swap in a fresh or better-matched monster (it acts at half strength that exchange), or keep the one in front and be asked again in a few exchanges.', screens: [] },
  pregame: { area: 'Beast Clash', title: 'The pregame Clash', brief: 'Before kickoff a 3v3 Beast Clash replaces the coin toss. The winner chooses: receive the opening kickoff, or defer and get the ball to start the second half.', screens: ['pregame'] },
  overtime: { area: 'Beast Clash', title: 'Overtime', brief: 'A tie after the overtime quarter is settled by a Beast Clash: 3v3 in the season, 5v5 in the playoffs. The football score stands; the Clash decides who gets the win.', screens: [] },
  // --- football
  match: { area: 'Football', title: 'Your first game', brief: 'Football in one breath: the offense has four tries ("downs") to move the ball 10 yards. Make it and you get four more; reach the far end zone for a touchdown (6 points, plus a 1-point kick). Fail on fourth down and the other team takes over, which is why you usually punt or kick a field goal (3 points) on fourth.\n\nYou coach, you do not steer: pick one of your six play cards, press Snap, and watch the monsters run it.', screens: ['match'], sheet: true, primer: true },
  modes: { area: 'Football', title: 'Key Moments or Full Coaching', brief: 'Key Moments (recommended) simulates the routine snaps and stops for the big downs. Full Coaching lets you call every play, and takes about twice as long. Change it any time in Settings.', screens: ['match'] },
  clock: { area: 'Football', title: 'The clock', brief: 'Every play uses a few seconds, and if the last play ended with the clock running, the time between plays comes off when you snap. A timeout stops it; hurry-up is free; a spike stops it for the price of a down. Ahead late? Milk the clock or kneel.', screens: [], sheet: true },
  plays: { area: 'Football', title: 'Plays', brief: 'Every play has a lesson: what it is for and what beats it. You do not need to know them all; your six on Friday are what matter.', screens: ['playbook', 'playdetail'] },
  training: { area: 'Football', title: 'Wednesday: training', brief: 'Choose one thing to work on this week. Harder sessions give more but risk injuries, and the same focus three weeks running stops working.', steps: ['Pick the area your team is weakest in.', 'Pick the intensity: harder gives more, with more risk of injury.'], screens: ['training'] },
  scoutopp: { area: 'Football', title: 'Thursday: scout the opponent', brief: 'Pick a side of their team to study. You learn the exact six plays they will call on Sunday, which is how you choose the plays that beat them.', screens: ['scoutopp'] },
  gameplan: { area: 'Football', title: 'Friday: game plan', brief: 'Choose six plays for your offense and six for your defense. Those are the only plays you can call on Sunday. Plays marked ✦ counter what you learned on Thursday. A mix of runs and passes is safest.', steps: ['Start from the coordinators\' plan (already filled in).', 'Swap in any ✦ plays: they counter what the opponent showed.', 'Keep both runs and passes so the defense cannot guess.'], screens: ['gameplan'] },
  lineup: { area: 'Football', title: 'Saturday: media day', brief: 'The press asks three questions. Every answer is spoken in the voice of one nature (Swift, Cerebral, Ferocious…); monsters who share that nature hear themselves and play Sunday with a lift. Your lineup is checked here too: injured or tired starters are swapped automatically.', screens: ['lineup'] },
  gameday: { area: 'Football', title: 'Sunday: game day', brief: 'First the pregame Clash decides who gets the ball. On the field, the top monster in each position starts. Badges show who got a training (T) or media (+) lift today.', screens: ['pregame'] },
  // --- roster
  roster: { area: 'Roster', title: 'Your roster', brief: 'Seven starters a side, plus package players for special situations. Tap a monster for its ratings, nature and ability. Starters are set for you, and you can override any slot.', steps: ['Starters are the top name at each position.', 'An injured monster cannot play; a tired one plays worse.', 'Attribute points from level-ups are spent on the monster card.'], screens: ['roster', 'assign'] },
  health: { area: 'Roster', title: 'Injuries and fatigue', brief: 'Fatigue builds with games, practice and battles and comes off on Saturday and in a bye. Tired monsters play worse. Injured monsters miss a number of weeks and cannot play or battle.', screens: ['roster', 'monster'] },
  evolution: { area: 'Roster', title: 'Levels and evolution', brief: 'Monsters level up from games and battles and get attribute points to spend where they help their position. At certain levels a monster can evolve: a bigger form with better ratings. You choose when; nothing evolves without you.', screens: ['monster'] },
  // --- contracts and cap
  contracts: { area: 'Contracts and money', title: 'Contracts and the salary cap', brief: 'Every monster and coach is paid every season, and the total must fit under the salary cap. Over the cap, the commissioner picks who goes. Deals run one or two seasons; when one ends you re-sign, offer less, or let them go.', steps: ['Check the cap bar: green means room.', 'Re-sign the monsters you need first.', 'Below 26 monsters you cannot play: sign free agents to get there.'], screens: ['offseason', 'contracts'] },
  // --- draft
  draft: { area: 'Draft', title: 'Draft day', brief: 'Every club takes three first-year monsters, worst record first. Scouted prospects show their ratings; the rest are a gamble on the public board rank. Rookies cost 70% of market for two seasons, the cheapest good players you will ever sign.', steps: ['Look at the prospects your scout studied first.', 'Pick for a position with no backup, or the best monster you can see.', 'Confirm: a draft pick cannot be undone.'], screens: ['draft', 'draftclass'] },
  // --- trading (explains the existing system only)
  trading: { area: 'Trading', title: 'Trading draft picks', brief: 'You can trade your draft picks with other clubs: ask for a player at a position, ask for better picks, or answer a club that calls you with an offer. A trade cannot be undone. A player who arrives brings his salary with him.', steps: ['On the draft screen, "Shop this pick" asks clubs what they would give.', 'A club may also call you during the season; the offer lasts until the week ends.', 'Check the cap before you accept: his salary counts at once.'], screens: ['draft'] },
  board: { area: 'The Board', title: 'The Board and your goal', brief: 'Before each season the Board forecasts your wins by comparing your team\'s overall rating with this league\'s average. The safe goal is that forecast, rounded: do what is expected. The medium goal is the playoffs, or one gym badge you do not hold yet for a rebuilding club. The stretch goal is the Beast Bowl, worth double.', steps: ['Read the forecast: it is your club against this league, not against a fixed number.', 'A rebuilding club is forecast low and asked for little; a contender is asked for more.', 'Commit to one goal. The safe goal is what the Board expects, not a guarantee.'], screens: ['goals', 'office'] },
  confidence: { area: 'The Board', title: 'Board confidence and dismissal', brief: 'A met goal adds +1 (+2 for the title) and wipes out any deficit. A miss costs 1. At −1 you are on the hot seat; a second miss there ends the franchise, unless it was narrow (within one win of the goal, or at least the forecast): then it is a final warning. Three missed seasons in a row end the franchise however narrow, because the Board wants sustained results, not excuses.', screens: ['goals', 'office'] },
  league: { area: 'League', title: 'The league', brief: 'Sixteen clubs, two conferences. Eight make the playoffs: four per conference, then three rounds to the Beast Bowl. Eight clubs are gyms: beat each one for a badge on the road to the Hall of Fame.', screens: ['league', 'standings', 'playoffs'] },
});
export const TOPIC_KEYS = Object.freeze(Object.keys(TOPICS));
export const AREAS = Object.freeze([...new Set(Object.values(TOPICS).map((t) => t.area))]);

/** Topics listed under "? Help" for a screen (always available, every mode). Empty when the screen needs no help button. */
export function helpTopics(screen) { const ks = TOPIC_KEYS.filter((k) => TOPICS[k].screens.includes(screen)); return [...ks.filter((k) => TOPICS[k].screens[0] === screen), ...ks.filter((k) => TOPICS[k].screens[0] !== screen)]; } // a screen's own topics first
/** Screens that carry the "? Help" button. */
export const HELP_SCREENS = Object.freeze([...new Set(Object.values(TOPICS).flatMap((t) => t.screens))]);

/** The first-use topic for a screen: its first topic the player has not dismissed. The HQ shows "after the game" once the first game is played. */
function firstUseKey(f, screen) {
  const seen = f.tutorial?.seen || {};
  if (screen === 'hq' && seen.week && (f.season?.week > 1 || f.week?.gameResult)) return seen.postgame ? null : 'postgame';
  return helpTopics(screen).find((k) => !seen[k]) || null;
}
/**
 * The tip to show automatically on `screen`, or null. Expert: never. Guided and Standard: once per topic. Guided adds the
 * step list. A tip with `sheet: true` opens as an overlay (the match screen has no room for a panel).
 */
export function autoTip(f, screen) {
  if (!f) return null; const a = assistSettings(f); if (a.mode === 'expert') return null;
  const key = firstUseKey(f, screen); if (!key) return null; const t = TOPICS[key];
  return { key, title: t.title, text: t.brief, steps: a.mode === 'guided' ? (t.steps || []) : [], sheet: !!t.sheet, primer: !!t.primer, guided: a.mode === 'guided' };
}
/** A tip tied to a moment rather than a screen (the clock late in a half, the first swap decision, the first overtime Clash). */
export function momentTip(f, key) {
  if (!f || !TOPICS[key] || assistSettings(f).mode === 'expert' || f.tutorial?.seen?.[key]) return null; const t = TOPICS[key]; const g = assistSettings(f).mode === 'guided';
  return { key, title: t.title, text: t.brief, steps: g ? (t.steps || []) : [], sheet: true, primer: !!t.primer, guided: g };
}
/** Saves from before Coach Assist remembered tips under older names: carry them over so nothing already dismissed comes back. */
export function migrateTips(f) {
  const seen = f?.tutorial?.seen; if (!seen) return;
  for (const [from, to] of [['hq', 'week'], ['playbook', 'plays'], ['offseason', 'contracts'], ['pregame', 'gameday']]) if (seen[from] && !seen[to]) seen[to] = true;
}
export function dismissTip(f, key) { f.tutorial ||= { seen: {} }; f.tutorial.seen ||= {}; f.tutorial.seen[key] = true; }
export function resetTips(f) { if (f) f.tutorial = { seen: {} }; }
const FIRST_RUN = ['week', 'scout', 'recruit', 'training', 'scoutopp', 'gameplan', 'lineup', 'pregame', 'match', 'postgame'];
/** "Tip n of m" for the first season's run of screens. */
export function tipProgress(f) { const seen = f?.tutorial?.seen || {}; return { done: FIRST_RUN.filter((k) => seen[k]).length, total: FIRST_RUN.length }; }
