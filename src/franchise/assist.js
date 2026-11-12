// Coach Assist 1.0 (GDD §27.3): one guidance system for the whole game. Pure data and rules; no DOM. The UI (src/ui/tutorial.js)
// renders what these functions decide. Preferences live in the franchise save (f.settings.assist); first-use tips are remembered
// in f.tutorial.seen, so a tip dismissed once stays dismissed in every mode until the player asks to see the tips again.
// Coach Assist never makes a decision, never changes a number in the game, and never touches achievements or the Hall of Fame.
import { t as $t } from '../text/index.js';

export const ASSIST_MODES = Object.freeze(['guided', 'standard', 'expert']);
export const ASSIST_MODE_TEXT = Object.freeze({
  guided: { label: 'Guided', text: $t('franchise.step_by_step_help_the_first') },
  standard: { label: 'Standard', text: $t('franchise.a_short_tip_the_first_time') },
  expert: { label: 'Expert', text: $t('franchise.no_automatic_tips_help_is_still') },
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
  if (!f) return { ok: false, reason: $t('franchise.no_franchise') };
  const cur = assistSettings(f); const next = { ...cur };
  if ('mode' in patch) { if (!ASSIST_MODES.includes(patch.mode)) return { ok: false, reason: $t('franchise.unknown_mode') }; next.mode = patch.mode; }
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
  owner: { area: $t('franchise.getting_started'), title: $t('franchise.you_are_the_owner'), brief: $t('franchise.you_run_the_club_not_the'), steps: [$t('franchise.hire_the_staff_or_keep_the'), $t('franchise.each_week_work_through_monday_to'), 'Play the game on Sunday, then do it again next week.'], screens: ['welcome'] },
  staff: { area: $t('franchise.getting_started'), title: $t('franchise.your_coaching_staff'), brief: $t('franchise.five_coaches_the_head_coach_and'), steps: [$t('franchise.look_at_each_role_and_what'), $t('franchise.hire_one_coach_per_role_the'), 'You can replace a coach later from the Staff screen.'], screens: ['hire', 'staff'] },
  week: { area: $t('franchise.getting_started'), title: $t('franchise.welcome_to_your_week'), brief: $t('franchise.a_season_is_10_weeks_each'), steps: [$t('franchise.press_the_big_yellow_button_it'), $t('franchise.finish_the_job_and_you_come'), 'On Sunday the button starts the game.'], screens: ['hq'], primer: true },
  postgame: { area: $t('franchise.getting_started'), title: $t('franchise.after_the_game'), brief: $t('franchise.the_box_score_shows_who_did'), screens: [], after: 'week' },
  // --- scouting and recruitment
  scout: { area: $t('franchise.scouting_and_signing'), title: $t('franchise.monday_scouting'), brief: $t('franchise.pick_a_region_and_your_scout'), steps: [$t('franchise.pick_a_region_whose_element_you'), $t('franchise.read_the_prospects_position_overall_ovr'), 'Tomorrow you can battle one of them to sign it.'], screens: ['scout'] },
  attributes: { area: $t('franchise.scouting_and_signing'), title: $t('franchise.ratings_and_potential'), brief: $t('franchise.every_monster_has_twelve_ratings_but'), steps: [$t('franchise.compare_ovr_with_your_monster_at'), $t('franchise.a_young_monster_with_high_potential'), 'More → What the stats mean lists what every rating does at every position.'], screens: ['scout', 'monster'] },
  recruit: { area: $t('franchise.scouting_and_signing'), title: $t('franchise.tuesday_monster_encounter'), brief: $t('franchise.pick_one_prospect_and_meet_it'), steps: [$t('franchise.choose_the_prospect_you_want_most'), $t('franchise.keep_the_automatic_lineup_or_pick'), 'Choose Play, Auto or Skip to results, then sign the prospect or let it go.'], screens: ['recruit'] },
  companions: { area: $t('franchise.scouting_and_signing'), title: $t('franchise.wild_companions'), brief: $t('franchise.why_3v3_a_monster_in_the'), screens: ['recruit', 'clash-battle'] },
  skips: { area: $t('franchise.scouting_and_signing'), title: $t('franchise.skip_encounter_or_skip_to_results'), brief: $t('franchise.skip_the_encounter_means_no_battle'), screens: ['recruit', 'clash-battle'] },
  // --- Beast Clash
  clash: { area: $t('franchise.beast_clash'), title: $t('franchise.how_beast_clash_works'), brief: $t('franchise.each_side_lines_up_its_monsters'), steps: [$t('franchise.pick_your_monsters_and_the_order'), $t('franchise.watch_the_battle_at_the_speed'), 'Everyone who battled earns experience and gets a little tired.'], screens: ['clash-battle'] },
  elements: { area: $t('franchise.beast_clash'), title: $t('franchise.elements_and_type_edges'), brief: $t('franchise.every_monster_has_an_element_fire'), screens: ['clash-battle'] },
  order: { area: $t('franchise.beast_clash'), title: $t('franchise.order_of_entry'), brief: $t('franchise.your_lineup_order_is_the_order'), screens: ['clash-battle'] },
  pregame: { area: $t('franchise.beast_clash'), title: $t('franchise.the_pregame_clash'), brief: $t('franchise.before_kickoff_a_3v3_beast_clash'), screens: ['pregame'] },
  overtime: { area: $t('franchise.beast_clash'), title: $t('franchise.overtime'), brief: $t('franchise.a_tie_after_the_overtime_quarter'), screens: [] },
  // --- football
  match: { area: 'Football', title: $t('franchise.your_first_game'), brief: $t('franchise.football_in_one_breath_the_offense'), screens: ['match'], sheet: true, primer: true },
  modes: { area: 'Football', title: $t('franchise.key_moments_or_full_coaching'), brief: $t('franchise.key_moments_recommended_simulates_the_routine'), screens: ['match'] },
  clock: { area: 'Football', title: $t('franchise.the_clock'), brief: $t('franchise.every_play_uses_a_few_seconds'), screens: [], sheet: true },
  plays: { area: 'Football', title: $t('franchise.plays'), brief: $t('franchise.every_play_has_a_lesson_what'), screens: ['playbook', 'playdetail'] },
  training: { area: 'Football', title: $t('franchise.wednesday_training'), brief: $t('franchise.choose_one_thing_to_work_on'), steps: [$t('franchise.pick_the_area_your_team_is'), 'Pick the intensity: harder gives more, with more risk of injury.'], screens: ['training'] },
  scoutopp: { area: 'Football', title: $t('franchise.thursday_scout_the_opponent'), brief: $t('franchise.pick_a_side_of_their_team'), screens: ['scoutopp'] },
  gameplan: { area: 'Football', title: $t('franchise.friday_game_plan'), brief: $t('franchise.choose_six_plays_for_your_offense'), steps: [$t('franchise.start_from_the_coordinators_plan_already'), $t('franchise.swap_in_any_plays_they_counter'), 'Keep both runs and passes so the defense cannot guess.'], screens: ['gameplan'] },
  lineup: { area: 'Football', title: $t('franchise.saturday_media_day'), brief: $t('franchise.the_press_asks_three_questions_spotlight'), screens: ['lineup'] },
  gameday: { area: 'Football', title: $t('franchise.sunday_game_day'), brief: $t('franchise.first_the_pregame_clash_decides_who'), screens: ['pregame'] },
  // --- roster
  roster: { area: 'Roster', title: $t('franchise.your_roster'), brief: $t('franchise.seven_starters_a_side_plus_package'), steps: [$t('franchise.starters_are_the_top_name_at'), $t('franchise.an_injured_monster_cannot_play_a'), 'Training points banked each offseason are spent on the monster card.'], screens: ['roster', 'assign'] },
  health: { area: 'Roster', title: $t('franchise.injuries_and_fatigue'), brief: $t('franchise.fatigue_builds_with_games_practice_and'), screens: ['roster', 'monster'] },
  evolution: { area: 'Roster', title: $t('franchise.levels_and_evolution'), brief: $t('franchise.monsters_level_up_from_games_and'), screens: ['monster'] },
  // --- contracts and cap
  contracts: { area: $t('franchise.contracts_and_money'), title: $t('franchise.contracts_and_the_salary_cap'), brief: $t('franchise.every_monster_and_coach_is_paid'), steps: [$t('franchise.check_the_cap_bar_green_means'), $t('franchise.re_sign_the_monsters_you_need'), 'Below 26 monsters you cannot play: sign free agents to get there.'], screens: ['offseason', 'contracts'] },
  // --- draft
  draft: { area: 'Draft', title: $t('franchise.draft_day'), brief: $t('franchise.every_club_takes_three_first_year'), steps: [$t('franchise.look_at_the_prospects_your_scout'), $t('franchise.pick_for_a_position_with_no'), 'Confirm: a draft pick cannot be undone.'], screens: ['draft', 'draftclass'] },
  // --- trading (explains the existing system only)
  trading: { area: 'Trading', title: $t('franchise.trading_draft_picks'), brief: $t('franchise.you_can_trade_your_draft_picks'), steps: [$t('franchise.on_the_draft_screen_shop_this'), $t('franchise.a_club_may_also_call_you'), 'Check the cap before you accept: his salary counts at once.'], screens: ['draft'] },
  board: { area: $t('franchise.the_board'), title: $t('franchise.the_board_and_your_goal'), brief: $t('franchise.before_each_season_the_board_forecasts'), steps: [$t('franchise.read_the_forecast_it_is_your'), $t('franchise.a_rebuilding_club_is_forecast_low'), 'Commit to one goal. The safe goal is what the Board expects, not a guarantee.'], screens: ['goals', 'office'] },
  confidence: { area: $t('franchise.the_board'), title: $t('franchise.board_confidence_and_dismissal'), brief: $t('franchise.a_met_goal_adds_1_2'), screens: ['goals', 'office'] },
  league: { area: 'League', title: $t('franchise.the_league'), brief: $t('franchise.sixteen_clubs_two_conferences_eight_make'), screens: ['league', 'standings', 'playoffs'] },
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
/** A tip tied to a moment rather than a screen (the clock late in a half, the first overtime Clash). */
export function momentTip(f, key) {
  if (!f || !TOPICS[key] || assistSettings(f).mode === 'expert' || f.tutorial?.seen?.[key]) return null; const t = TOPICS[key]; const g = assistSettings(f).mode === 'guided';
  return { key, title: t.title, text: t.brief, steps: g ? (t.steps || []) : [], sheet: true, primer: !!t.primer, guided: g };
}
/** Saves from before Coach Assist remembered tips under older names: carry them over so nothing already dismissed comes back. */
export function migrateTips(f) {
  const seen = f?.tutorial?.seen; if (!seen) return;
  for (const [from, to] of [['hq', 'week'], ['playbook', 'plays'], ['offseason', 'contracts'], ['pregame', 'gameday'], ['decisions', 'order']]) if (seen[from] && !seen[to]) seen[to] = true;
}
export function dismissTip(f, key) { f.tutorial ||= { seen: {} }; f.tutorial.seen ||= {}; f.tutorial.seen[key] = true; }
export function resetTips(f) { if (f) f.tutorial = { seen: {} }; }
const FIRST_RUN = ['week', 'scout', 'recruit', 'training', 'scoutopp', 'gameplan', 'lineup', 'pregame', 'match', 'postgame'];
/** "Tip n of m" for the first season's run of screens. */
export function tipProgress(f) { const seen = f?.tutorial?.seen || {}; return { done: FIRST_RUN.filter((k) => seen[k]).length, total: FIRST_RUN.length }; }
