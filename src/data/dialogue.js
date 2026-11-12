// Pregame coach dialogue (GDD §15.5): two or three lines from the opposing
// head coach before the lineups, picked by relationship state, never
// branching. Gym coaches and the rival GM have full pools; ordinary clubs get
// one generic line. The player may reply (confident / respectful / nothing);
// the reply carries the same small boost media day uses.
//
// Placeholders: {club} = player's club, {me} = speaker's club, {star} = the
// player's best monster, {mine} = the speaker's legendary or star, {badge}.
import { t as $t } from '../text/index.js';

/** States, checked in order; the first that applies wins. */
export const DIALOGUE_STATES = ['playoff', 'threeLosses', 'badgeHeld', 'theyWon', 'youWon', 'first'];
/** After the player takes a gym's badge: the beaten coach's handshake lines. */
export function beatenLines(club) { return GYM_LINES[club]?.beaten || [$t('dialogue.well_played_dont_get_used_to'), $t('dialogue.my_monsters_will_remember_this')]; }

const SHARED = {
  playoff: [$t('dialogue.playoff_football_everything_you_did_in'), $t('dialogue.one_game_bring_your_best_six')],
  threeLosses: [$t('dialogue.three_in_a_row_i_am'), $t('dialogue.same_plan_as_last_time_please')],
  generic: [
    $t('dialogue.good_luck_out_there_wont_make'),
    $t('dialogue.we_watched_your_tape_interesting_choices'),
    $t('dialogue.nothing_personal_we_need_this_one'),
    $t('dialogue.your_is_the_real_deal_well'),
    $t('dialogue.lets_make_it_a_clean_game'),
  ],
};

/** Per-gym pools: lines by state, two per state. */
export const GYM_LINES = Object.freeze({
  'Harbor Sentinels': {
    first: [$t('dialogue.welcome_to_the_coast_the_tide'), $t('dialogue.play_your_game_mine_has_been')],
    theyWon: [$t('dialogue.you_came_in_high_and_fast'), $t('dialogue.patience_coach_learn_it_or_lose')],
    youWon: [$t('dialogue.you_beat_the_tide_once_nobody'), $t('dialogue.i_made_some_changes_you_will')],
    badgeHeld: [$t('dialogue.you_carry_my_badge_carry_it'), $t('dialogue.tsunarok_remembers_you')],
    beaten: [$t('dialogue.twenty_years_of_the_same_tide'), $t('dialogue.tsunarok_will_want_this_one_back')],
  },
  'Sunfire Lions': {
    first: [$t('dialogue.bright_day_for_it_we_throw'), $t('dialogue.keep_up_if_you_can_most')],
    theyWon: [$t('dialogue.last_time_you_squinted_at_the'), $t('dialogue.aurelion_is_faster_than_your_corners')],
    youWon: [$t('dialogue.you_found_a_way_to_cloud'), $t('dialogue.round_two_the_lions_are_rested')],
    badgeHeld: [$t('dialogue.the_dawn_badge_in_your_pocket'), $t('dialogue.lets_light_it_up')],
    beaten: [$t('dialogue.you_didnt_squint_once_fine_the'), $t('dialogue.nobody_out_shines_the_lions_twice')],
  },
  'Thunder Mesa': {
    first: [$t('dialogue.tempo_tempo_tempo_if_you_blink'), $t('dialogue.i_run_plays_faster_than_your')],
    theyWon: [$t('dialogue.you_were_a_step_slow_last'), $t('dialogue.voltarch_had_fun_he_wants_more')],
    youWon: [$t('dialogue.you_slowed_us_down_nobody_slows'), $t('dialogue.new_wrinkles_this_week_try_to')],
    badgeHeld: [$t('dialogue.my_badge_your_pocket_temporary'), $t('dialogue.storms_come_back_around_coach')],
    beaten: [$t('dialogue.you_kept_up_nobody_keeps_up'), $t('dialogue.voltarch_is_sulking_that_is_the')],
  },
  'Canyon Crushers': {
    first: [$t('dialogue.we_run_the_ball_you_know'), $t('dialogue.four_yards_and_a_cloud_of')],
    theyWon: [$t('dialogue.your_front_got_pushed_around_last'), $t('dialogue.titanolith_asked_if_you_were_bringing')],
    youWon: [$t('dialogue.you_stacked_the_box_fine_see'), $t('dialogue.the_canyon_remembers_every_loss')],
    badgeHeld: [$t('dialogue.the_quake_badge_took_me_a'), $t('dialogue.today_we_take_it_back_the')],
    beaten: [$t('dialogue.you_held_the_line_against_the'), $t('dialogue.titanolith_wants_a_rematch_he_can')],
  },
  'Eastport Phantoms': {
    first: [$t('dialogue.you_wont_see_us_coming_thats'), $t('dialogue.trust_nothing_you_see_before_the')],
    theyWon: [$t('dialogue.last_time_you_kept_throwing_into'), $t('dialogue.fooled_once_shall_we_try_for')],
    youWon: [$t('dialogue.hm_you_read_us_i_have'), $t('dialogue.a_ghost_learns_from_being_seen')],
    badgeHeld: [$t('dialogue.the_dusk_badge_sits_with_you'), $t('dialogue.lets_see_if_you_still_see')],
    beaten: [$t('dialogue.you_saw_through_us_few_do'), $t('dialogue.nyxshade_will_study_your_tape_tonight')],
  },
  'Frostpeak Howlers': {
    first: [$t('dialogue.up_here_we_dont_make_mistakes'), $t('dialogue.discipline_wins_in_the_snow_bring')],
    theyWon: [$t('dialogue.still_running_that_same_cover_three'), $t('dialogue.glacivern_froze_your_first_read_he')],
    youWon: [$t('dialogue.you_beat_us_at_home_i'), $t('dialogue.we_corrected_everything_everything')],
    badgeHeld: [$t('dialogue.the_frost_badge_belongs_on_this'), $t('dialogue.nothing_thaws_up_here_coach_not')],
    beaten: [$t('dialogue.clean_football_in_the_cold_i'), $t('dialogue.glacivern_froze_nothing_today_i_will')],
  },
  'Ironpeak Rams': {
    first: [$t('dialogue.we_hit_thats_the_whole_speech'), $t('dialogue.aegistron_doesnt_lose_a_matchup_pick')],
    theyWon: [$t('dialogue.you_limped_off_last_time_did'), $t('dialogue.same_hammer_same_nail')],
    youWon: [$t('dialogue.you_beat_the_hammer_respect_wont'), $t('dialogue.we_forged_a_few_new_things')],
    badgeHeld: [$t('dialogue.the_forge_badge_you_earned_it'), $t('dialogue.hit_first_today_or_dont_bother')],
    beaten: [$t('dialogue.you_hit_first_all_day_the'), $t('dialogue.aegistron_lost_a_matchup_write_the')],
  },
  'Palmetto Vipers': {
    first: [$t('dialogue.so_you_are_the_one_they'), $t('dialogue.aurodrax_has_never_been_intercepted_on')],
    theyWon: [$t('dialogue.last_time_was_a_lesson_this'), $t('dialogue.you_looked_at_the_dragon_and')],
    youWon: [$t('dialogue.once_you_beat_the_dragon_once'), $t('dialogue.i_have_waited_all_year_for')],
    badgeHeld: [$t('dialogue.the_wyrm_badge_was_never_meant'), $t('dialogue.hold_it_tight_it_is_coming')],
    beaten: [$t('dialogue.so_you_are_the_one_they_2'), $t('dialogue.the_dragon_remembers_every_scar_this')],
  },
});

/** The rival GM: lines by head-to-head state. */
export const RIVAL_LINES = Object.freeze({
  first: [$t('dialogue.division_rivals_same_rebuild_different_owners'), $t('dialogue.ill_be_honest_i_bet_the')],
  theyWon: [$t('dialogue.we_beat_you_last_time_everyone'), $t('dialogue.still_running_the_same_six_plays')],
  youWon: [$t('dialogue.you_got_us_once_i_have'), $t('dialogue.this_is_the_one_that_matters')],
  playoff: [$t('dialogue.rivals_in_the_playoffs_someones_season'), $t('dialogue.no_excuses_after_today')],
  threeLosses: [$t('dialogue.three_straight_my_board_is_asking'), $t('dialogue.i_would_wish_you_luck_but')],
  hotSeat: [$t('dialogue.i_hear_the_board_is_counting'), $t('dialogue.lose_today_and_ill_send_flowers')],
});

export const REPLIES = Object.freeze([
  { id: 'confident', label: $t('dialogue.were_taking_this_one'), text: $t('dialogue.confident_back_it_up_and_the'), effect: null },
  { id: 'respectful', label: $t('dialogue.respect_itll_be_a_good_game'), text: $t('dialogue.respectful_a_calm_word_before_kickoff'), effect: null },
  { id: 'silent', label: $t('dialogue.say_nothing'), text: $t('dialogue.no_effect'), effect: null },
]);

/** Pick the state for a matchup from the head-to-head record. */
export function dialogueState({ playoff = false, h2h = null, badgeHeld = false } = {}) {
  if (playoff) return 'playoff';
  if ((h2h?.streakL || 0) >= 3) return 'threeLosses';
  if (badgeHeld) return 'badgeHeld';
  if (h2h?.last === 'l') return 'theyWon';
  if (h2h?.last === 'w') return 'youWon';
  return 'first';
}

function fill(line, vars) { return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''); }

/**
 * Lines for a matchup. `kind` is 'gym' | 'rival' | 'ordinary'. Returns
 * { speaker, title, lines[], replies: bool }.
 */
export function pregameDialogue({ kind, club, speaker, state, vars = {}, seed = 0 }) {
  const pick = (arr) => arr[Math.abs(seed) % arr.length];
  if (kind === 'gym') {
    const pool = GYM_LINES[club]; const lines = (pool && pool[state]) || SHARED[state] || pool?.first || SHARED.generic;
    return { speaker, title: `${$t('dialogue.head_coach', { club })}`, lines: lines.map((l) => fill(l, vars)), replies: true, state };
  }
  if (kind === 'rival') {
    const lines = RIVAL_LINES[state] || RIVAL_LINES.first;
    return { speaker, title: `GM, ${club}`, lines: lines.map((l) => fill(l, vars)), replies: true, state };
  }
  return { speaker, title: `${$t('dialogue.head_coach', { club })}`, lines: [fill(pick(SHARED.generic), vars)], replies: false, state: 'generic' };
}

/** The rival GM's weekly needle for the HQ rival card: by who is ahead in the standings and whether the game is this week. */
export const RIVAL_WEEKLY = Object.freeze({
  ahead: [$t('dialogue.enjoy_the_view_from_up_there'), $t('dialogue.nice_start_my_scouts_say_your'), $t('dialogue.the_division_runs_through_us_it')],
  behind: [$t('dialogue.we_are_coming_the_board_will'), $t('dialogue.a_game_back_is_nothing_ask'), $t('dialogue.your_schedule_gets_harder_ours_gets')],
  level: [$t('dialogue.dead_even_one_of_us_is'), $t('dialogue.same_record_different_futures'), $t('dialogue.tiebreakers_favor_the_club_that_wants')],
  gameWeek: [$t('dialogue.rivalry_week_i_have_cleared_my'), $t('dialogue.sunday_bring_the_real_playbook_this'), $t('dialogue.my_monsters_have_been_talking_about')],
});
