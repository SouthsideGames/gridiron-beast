// Saturday Media Day, comedy overhaul (owner 2026-11-11; GDD §20.1). Data only: three recurring reporters, the question library
// (every question has four answers: Professional, Trash Talk, Comedy, Unhinged), and THE BEAST TIMES headlines.
//
// Rules this file follows:
//   - A question with `when` is asked only while that situation is TRUE in the saved franchise, and its tokens are filled from
//     the saved data (src/franchise/press.js builds the facts). Nothing here invents a statistic, injury, trade or result.
//   - A question without `when` is generic. Generic jokes are framed as rumours, hypotheticals or the reporter's own nonsense,
//     never as something that happened to this club.
//   - Gameplay effects are the two that already existed and nothing else: `hype` (the Trash Talk answer to a rival-week question:
//     the approved risky rivalry boost) and `star` (answers that talk up the club's star: the approved spotlight).
//   - `insult`, `predict` and `quote` are narrative only (a reporter remembers, a prediction is revisited, a quote resurfaces).
//
// Tokens: {club} {coach} {opp} {rival} {rivalGm} {star} {record} {n} {name} {pos} {type} {yds} {ints} {tds} {weeks} {from}
//         {lastOpp} {us} {them} {margin} {titles} {quote} {reporter}
import { t } from '../text/index.js';

export const STYLES = Object.freeze(['pro', 'trash', 'comedy', 'unhinged']);
export const STYLE_LABEL = Object.freeze({ pro: t('press.professional'), trash: t('press.trash_talk'), comedy: t('press.comedy'), unhinged: t('press.unhinged') });
export const STYLE_ICON = Object.freeze({ pro: '🎙️', trash: '🔥', comedy: '😏', unhinged: '🌀' });
export const STYLE_BLURB = Object.freeze({ pro: t('press.calm_and_diplomatic'), trash: t('press.confident_and_provocative'), comedy: t('press.sarcastic_and_clever'), unhinged: t('press.completely_absurd') });

/** The three recurring reporters. `portrait` is a coach-creator spec (src/ui/coach-portrait.js), so they are drawn by the game's own renderer. */
export const REPORTERS = Object.freeze({
  instigator: { id: 'instigator', name: t('press.dirk_stirwell'), outlet: t('press.the_daily_snap'), role: 'The Instigator', tagline: t('press.lives_for_drama_has_never_once'),
    portrait: 'coach2|1|2|1|2|1|slick|0|mustache|blazer|350|none|shades|none|1' },
  analyst: { id: 'analyst', name: t('press.dr_prudence_ledger'), outlet: t('press.gridiron_quarterly'), role: 'The Serious Analyst', tagline: t('press.treats_every_monster_incident_as_a'),
    portrait: 'coach2|4|1|2|1|0|bun|5|none|blazer|215|none|round|none|0' },
  rookie: { id: 'rookie', name: t('press.toby_fumbleton'), outlet: t('press.beast_beat_junior'), role: 'The Clueless Rookie', tagline: t('press.first_season_on_the_beat_still'),
    portrait: 'coach2|0|0|0|0|2|shortcurls|3|none|hoodie|95|cap_back|none|none|0' },
});

const Q = (id, reporter, when, q, pro, trash, comedy, unhinged, flags = {}) => Object.freeze({ id, reporter, when, q, a: Object.freeze({ pro, trash, comedy, unhinged }), ...flags });

export const PRESS_QUESTIONS = Object.freeze([
  // ============================================================ GENERIC: The Instigator
  Q('g_i_01', 'instigator', null, t('press.coach_somebody_in_the_building_says'),
    t('press.i_dont_respond_to_anonymous_quotes'), t('press.tell_somebody_to_say_it_on'), t('press.a_bye_week_with_uniforms_still'), t('press.i_am_the_bye_week_i'), { predict: ['trash'] }),
  Q('g_i_02', 'instigator', null, t('press.is_it_true_you_and_the'),
    t('press.we_have_a_professional_relationship_and'), t('press.ill_shake_their_hand_after_the'), t('press.you_made_it_up_but_its'), t('press.we_dont_shake_hands_we_headbutt'), { insult: ['comedy'] }),
  Q('g_i_03', 'instigator', null, t('press.scale_of_one_to_ten_how'),
    t('press.theyre_a_good_club_im_not'), t('press.ten_and_im_rounding_down'), t('press.id_say_a_strong_seven_which'), t('press.numbers_are_a_prison_i_rate'), { predict: ['trash', 'comedy'] }),
  Q('g_i_04', 'instigator', null, t('press.which_club_in_this_league_would'),
    t('press.id_sit_down_with_any_of'), t('press.the_theyd_fumble_the_bread_basket'), t('press.any_club_with_a_dragon_type'), t('press.i_only_dine_alone_in_the')),
  Q('g_i_05', 'instigator', null, t('press.give_me_one_word_for_the'),
    t('press.prepared_theyre_always_prepared'), '"Lunch."', t('press.sunday_as_in_thats_when_we'), '"Moist."'),
  Q('g_i_06', 'instigator', null, t('press.if_you_and_the_coach_raced'),
    t('press.id_rather_settle_things_with_the'), t('press.me_theyd_pull_a_hamstring_reading'), t('press.neither_wed_both_be_carted_off'), t('press.i_would_simply_become_the_wind')),
  Q('g_i_07', 'instigator', null, t('press.be_honest_is_there_a_coach'),
    t('press.no_competing_hard_isnt_the_same'), t('press.theres_a_list_the_just_moved'), t('press.yes_me_during_the_fourth_quarter'), t('press.the_one_who_lives_in_my')),
  Q('g_i_08', 'instigator', null, t('press.guarantee_a_win_on_sunday_go'),
    t('press.i_guarantee_effort_and_preparation_the'), t('press.guaranteed_write_it_in_pen_write'), t('press.i_guarantee_somebody_wins_im_very'), t('press.i_guarantee_the_sun_will_rise'), { predict: ['trash'] }),
  Q('g_i_09', 'instigator', null, t('press.your_fans_are_calling_the_mascot'),
    t('press.we_ask_our_fans_to_keep'), t('press.i_condone_it_i_may_have'), t('press.id_never_say_that_rugs_have'), t('press.the_rug_and_i_have_spoken')),
  Q('g_i_10', 'instigator', null, t('press.whos_the_most_dangerous_monster_in'),
    t('press.theres_talent_on_every_club_i'), t('press.nobody_if_they_were_that_dangerous'), t('press.the_vending_machine_at_our_facility'), t('press.the_moon_nobody_game_plans_for')),

  Q('g_i_11', 'instigator', null, t('press.is_the_best_monster_in_this'),
    t('press.hes_as_good_as_anyone_and'), t('press.best_in_the_league_ask_anyone'), t('press.both_mostly_the_second_please_dont'), t('press.is_not_a_monster_is_a'), { star: ['pro', 'trash'] }),

  // ============================================================ GENERIC: The Serious Analyst
  Q('g_a_01', 'analyst', null, t('press.coach_a_league_study_suggests_fire'),
    t('press.we_follow_every_league_safety_guideline'), t('press.our_protocol_is_scoring_so_much'), t('press.yes_we_stand_slightly_further_away'), t('press.the_heaters_work_for_us_now')),
  Q('g_a_02', 'analyst', null, t('press.from_a_schematic_standpoint_how_do'),
    t('press.leverage_and_discipline_fundamentals_dont_change'), t('press.let_them_fly_the_ball_still'), t('press.weve_asked_the_league_to_enforce'), t('press.we_have_a_net_a_very')),
  Q('g_a_03', 'analyst', null, t('press.hydration_is_critical_in_general_terms'),
    t('press.our_trainers_have_individual_plans_for'), t('press.we_dont_manage_it_we_aim'), t('press.carefully_and_with_a_mop'), t('press.he_is_not_hydrated_we_are')),
  Q('g_a_04', 'analyst', null, t('press.analytics_say_going_for_it_on'),
    t('press.every_situation_is_different_we_weigh'), t('press.other_coaches_are_scared_im_not'), t('press.because_analytics_has_never_been_yelled'), t('press.i_go_for_it_on_first')),
  Q('g_a_05', 'analyst', null, t('press.what_is_the_single_most_important'),
    t('press.awareness_a_monster_who_knows_where'), t('press.whether_the_other_club_is_afraid'), t('press.whether_he_fits_through_the_locker'), t('press.wingspan_divided_by_vibes')),
  Q('g_a_06', 'analyst', null, t('press.there_is_a_theory_that_ice'),
    t('press.we_prepare_our_monsters_to_play'), t('press.our_ice_types_make_the_stadium'), t('press.the_only_data_i_have_is'), t('press.temperature_is_a_rumor_started_by')),
  Q('g_a_07', 'analyst', null, t('press.clock_management_walk_me_through_your'),
    t('press.weve_rehearsed_it_sideline_first_then'), t('press.my_decision_tree_is_were_already'), t('press.its_less_of_a_tree_and'), t('press.i_throw_the_clock_into_the')),
  Q('g_a_08', 'analyst', null, t('press.is_roster_chemistry_quantifiable_in_your'),
    t('press.not_fully_but_you_can_see'), t('press.sure_count_the_points_we_score'), t('press.yes_ours_is_currently_two_of'), t('press.i_measured_it_once_the_instrument')),
  Q('g_a_09', 'analyst', null, t('press.rule_question_if_a_psychic_type'),
    t('press.thats_for_the_league_office_we'), t('press.if_they_know_the_call_and'), t('press.only_if_he_tells_the_other'), t('press.ive_started_calling_plays_i_havent')),
  Q('g_a_10', 'analyst', null, t('press.looking_at_the_what_is_the'),
    t('press.the_line_of_scrimmage_win_there'), t('press.our_best_against_their_best_i'), t('press.me_against_my_own_play_sheet'), t('press.my_left_hand_against_my_right'), { predict: ['trash'] }),

  Q('g_a_11', 'analyst', null, t('press.which_single_trait_of_s_translates'),
    t('press.his_preparation_hes_the_same_every'), t('press.the_one_where_hes_better_than'), t('press.his_ability_to_make_my_play'), t('press.his_aura_we_had_it_measured'), { star: ['pro', 'trash', 'comedy'] }),

  // ============================================================ GENERIC: The Clueless Rookie
  Q('g_r_01', 'rookie', null, t('press.coach_if_you_score_more_points'),
    t('press.it_does_thats_the_plan_every'), t('press.it_guarantees_it_tell_the_i'), t('press.significantly_we_ran_the_numbers_twice'), t('press.points_are_a_state_of_mind')),
  Q('g_r_02', 'rookie', null, t('press.how_many_quarters_are_you_planning'),
    t('press.all_four_and_well_be_ready'), t('press.four_the_usually_stop_after_two'), t('press.were_aiming_for_four_five_felt'), t('press.as_many_as_it_takes_i')),
  Q('g_r_03', 'rookie', null, t('press.is_the_football_the_same_one'),
    t('press.the_league_supplies_new_game_balls'), t('press.we_wear_ours_out_too_many'), t('press.same_one_were_very_attached_to'), t('press.there_has_only_ever_been_one')),
  Q('g_r_04', 'rookie', null, t('press.which_is_more_important_offense_or'),
    t('press.both_you_need_all_three_phases'), t('press.whichever_one_is_on_the_field'), t('press.parking_have_you_seen_our_lot'), t('press.neither_the_answer_is_weather')),
  Q('g_r_05', 'rookie', null, t('press.do_the_monsters_know_the_rules'),
    t('press.they_know_the_rules_they_study'), t('press.they_know_one_rule_dont_let'), t('press.about_sixty_percent_of_them_its'), t('press.i_dont_tell_them_anything_they')),
  Q('g_r_06', 'rookie', null, t('press.whats_your_favorite_play_is_it'),
    t('press.any_play_thats_executed_the_way'), t('press.the_one_where_the_coach_throws'), t('press.kneeling_at_the_end_it_means'), t('press.the_one_where_everybody_runs_left')),
  Q('g_r_07', 'rookie', null, t('press.when_you_say_we_need_to'),
    t('press.it_just_means_doing_your_job'), t('press.the_other_teams_hopes_not_okay'), t('press.mostly_my_patience'), t('press.nobody_is_okay_welcome_to_football')),
  Q('g_r_08', 'rookie', null, t('press.why_is_it_called_a_down'),
    t('press.its_an_old_term_for_a'), t('press.because_thats_where_the_end_up'), t('press.marketing_ups_tested_badly'), t('press.up_and_down_are_the_same')),
  Q('g_r_09', 'rookie', null, t('press.i_wrote_down_win_the_turnover'),
    t('press.it_means_taking_the_ball_away'), t('press.its_the_game_where_we_take'), t('press.yes_its_held_in_the_parking'), t('press.it_is_an_ancient_duel_i')),
  Q('g_r_10', 'rookie', null, t('press.sorry_i_got_lost_on_the'),
    t('press.thats_me_take_your_time_youre'), t('press.im_the_one_the_have_nightmares'), t('press.im_the_one_who_looks_tired'), t('press.there_is_no_coach_there_is'), { insult: ['comedy'] }),

  Q('g_r_11', 'rookie', null, t('press.is_your_best_one_hes_the'),
    t('press.hes_our_leader_and_hes_earned'), t('press.hes_the_best_one_the_will'), t('press.hes_the_best_one_the_others'), t('press.they_are_all_look_closer'), { star: ['pro', 'trash', 'comedy'] }),

  // ============================================================ SITUATIONAL (real saved data only)
  // ---- winning streak (n straight wins)
  Q('s_streakW_1', 'instigator', 'streakW', t('press.straight_wins_has_the_rest_of'),
    t('press.were_playing_well_but_every_week'), t('press.both_mostly_the_second_one'), t('press.id_say_were_good_the_league'), t('press.we_are_no_longer_a_team')),
  Q('s_streakW_2', 'analyst', 'streakW', t('press.at_consecutive_wins_regression_to_the'),
    t('press.same_preparation_same_standards_streaks_dont'), t('press.we_are_the_mean_now_everyone'), t('press.i_guard_against_it_by_not'), t('press.the_mean_came_to_my_office')),
  Q('s_streakW_3', 'rookie', 'streakW', t('press.youve_won_in_a_row_do'),
    t('press.no_prize_yet_we_keep_going'), t('press.the_prize_is_everybody_elses_tears'), t('press.we_get_a_coupon_one_free'), t('press.the_prize_is_more_football_its')),
  // ---- losing streak (n straight losses)
  Q('s_streakL_1', 'instigator', 'streakL', t('press.straight_losses_whos_to_blame_i'),
    t('press.it_starts_with_me_well_fix'), t('press.blame_the_schedule_and_the_refs'), t('press.its_spelled_c_o_a_c'), t('press.blame_is_a_river_i_am'), { insult: ['trash'] }),
  Q('s_streakL_2', 'analyst', 'streakL', t('press.after_consecutive_losses_at_what_point'),
    t('press.were_not_rebuilding_were_correcting_one'), t('press.keep_digging_youll_find_the_win'), t('press.weve_found_some_pottery_and_a'), t('press.we_dug_so_deep_we_found'), { predict: ['trash'] }),
  Q('s_streakL_3', 'rookie', 'streakL', t('press.youve_lost_in_a_row_have'),
    t('press.thats_the_goal_were_working_on'), t('press.were_saving_it_for_the_surprise'), t('press.we_tried_it_once_didnt_care'), t('press.winning_is_just_losing_in_a'), { predict: ['trash'] }),
  // ---- rival week
  Q('s_rival_1', 'instigator', 'rival', t('press.its_week_says_your_defense_couldnt'),
    t('press.its_a_big_game_for_both'), t('press.tell_the_carts_coming_sunday_and'), t('press.depends_on_the_cart_is_it'), t('press.we_stopped_a_shopping_cart_once'), { hype: true, predict: ['trash'] }),
  Q('s_rival_2', 'instigator', 'rival', t('press.any_message_for_and_before_sunday'),
    t('press.respect_were_looking_forward_to_a'), t('press.they_should_be_worried_were_coming'), t('press.tell_them_we_said_hi_then'), t('press.tell_the_owl_knows_thats_all'), { hype: true }),
  Q('s_rival_3', 'analyst', 'rival', t('press.historically_rivalry_games_are_decided_by'),
    t('press.were_focused_its_a_big_game'), t('press.completely_unregulated_thats_s_problem'), t('press.we_did_breathing_exercises_a_linebacker'), t('press.i_have_regulated_nothing_since_the'), { hype: true }),
  Q('s_rival_4', 'rookie', 'rival', t('press.why_dont_you_and_like_each'),
    t('press.its_a_rivalry_two_good_clubs'), t('press.they_took_our_spot_our_lunch'), t('press.it_was_the_parking_spot_its'), t('press.it_began_long_ago_over_a'), { hype: true }),
  // ---- playoff race / playoffs
  Q('s_race_1', 'analyst', 'playoffRace', t('press.at_you_are_mathematically_in_the'),
    t('press.we_dont_project_we_prepare_for'), t('press.our_projection_is_everybody_else_staying'), t('press.my_internal_projection_is_mostly_indigestion'), t('press.i_asked_the_numbers_the_numbers')),
  Q('s_race_2', 'rookie', 'playoffRace', t('press.youre_is_that_good_people_keep'),
    t('press.it_keeps_us_in_contention_every'), t('press.its_good_enough_to_ruin_somebodys'), t('press.were_running_its_just_very_slow'), t('press.the_race_is_inside_us_mine')),
  Q('s_playoffs_1', 'instigator', 'playoffs', t('press.its_the_playoffs_lose_and_youre'),
    t('press.nobody_personally_we_respect_how_hard'), t('press.all_of_them_ive_booked_the'), t('press.their_kicker_he_looks_like_he'), t('press.i_will_send_them_home_one'), { predict: ['trash'] }),
  Q('s_playoffs_2', 'rookie', 'playoffs', t('press.is_a_playoff_game_longer_than'),
    t('press.same_length_the_stakes_are_what'), t('press.for_the_itll_feel_like_forever'), t('press.its_the_same_but_everyone_forgets'), t('press.time_stops_in_the_playoffs_ive')),
  // ---- defending champions
  Q('s_champ_1', 'instigator', 'champion', t('press.youre_the_defending_beast_bowl_champions'),
    t('press.nobodys_last_season_is_over_were'), t('press.ive_got_the_trophy_they_can'), t('press.i_just_want_my_own_head'), t('press.i_collect_helmets_now_dont_ask')),
  Q('s_champ_2', 'rookie', 'champion', t('press.you_won_the_beast_bowl_do'),
    t('press.no_its_ours_to_keep_but'), t('press.no_and_the_arent_getting_near'), t('press.no_but_they_do_make_you'), t('press.the_trophy_and_i_are_legally')),
  // ---- the quarterback threw {ints} interceptions last game
  Q('s_qbInts_1', 'instigator', 'qbInts', t('press.threw_interceptions_against_has_your_quarterback'),
    t('press.he_knows_he_has_to_be'), t('press.he_was_being_generous_that_ends'), t('press.weve_color_coded_the_jerseys_for'), t('press.he_wasnt_throwing_interceptions_he_was')),
  Q('s_qbInts_2', 'analyst', 'qbInts', t('press.interceptions_for_last_week_is_this'),
    t('press.a_bit_of_both_weve_addressed'), t('press.its_a_their_defense_got_lucky'), t('press.its_mechanical_the_mechanism_is_his'), t('press.it_is_a_spiritual_issue_the')),
  Q('s_qbInts_3', 'rookie', 'qbInts', t('press.when_threw_it_to_the_other'),
    t('press.no_those_were_mistakes_and_he'), t('press.yes_the_trick_is_we_win'), t('press.a_very_long_trick_were_still'), t('press.the_trick_is_on_all_of')),
  // ---- the quarterback threw {tds} touchdown passes last game
  Q('s_qbHot_1', 'analyst', 'qbHot', t('press.threw_touchdown_passes_against_is_that'),
    t('press.hes_seeing_it_well_well_keep'), t('press.sustainable_hes_just_warming_up'), t('press.no_ive_asked_him_to_pace'), t('press.he_has_seen_the_future_and'), { star: ['pro', 'trash'] }),
  // ---- a monster ran for {yds} yards last game
  Q('s_rush_1', 'analyst', 'rushBig', t('press.ran_for_yards_against_is_your'),
    t('press.he_ran_hard_and_the_line'), t('press.the_paperworks_pending_the_should_evacuate'), t('press.not_yet_but_the_insurance_people'), t('press.he_is_classified_as_inevitable_the'), { star: ['pro', 'trash'] }),
  Q('s_rush_2', 'rookie', 'rushBig', t('press.got_yards_last_week_is_that'),
    t('press.its_an_excellent_day_for_a'), t('press.its_more_than_the_will_get'), t('press.there_are_a_hundred_he_used'), t('press.there_are_infinite_yards_he_has'), { star: ['pro'] }),
  // ---- a monster had {yds} receiving yards last game
  Q('s_recv_1', 'instigator', 'recvBig', t('press.torched_for_receiving_yards_should_the'),
    t('press.he_had_a_great_day_the'), t('press.they_can_stay_on_the_bus'), t('press.they_should_at_least_keep_the'), t('press.there_is_no_bus_there_is'), { star: ['pro', 'trash', 'unhinged'] }),
  // ---- a defender dominated last game
  Q('s_def_1', 'analyst', 'defBig', t('press.was_everywhere_against_how_do_you'),
    t('press.effort_and_film_study_hes_earned'), t('press.you_count_the_quarterbacks_who_ask'), t('press.we_count_the_number_of_times'), t('press.you_cannot_quantify_a_thunderstorm_you'), { star: ['pro', 'trash'] }),
  // ---- a starter is injured
  Q('s_injury_1', 'analyst', 'injury', t('press.is_out_for_what_is_the'),
    t('press.next_monster_up_we_adjust_the'), t('press.the_adjustment_is_were_still_better'), t('press.structurally_were_holding_it_together_with'), t('press.i_have_replaced_him_with_a')),
  Q('s_injury_2', 'rookie', 'injury', t('press.with_hurt_do_you_play_with'),
    t('press.we_have_depth_for_exactly_this'), t('press.we_could_play_with_one_fewer'), t('press.were_allowed_a_spare_hes_been'), t('press.we_all_become_now_its_a')),
  // ---- a monster evolved
  Q('s_evo_1', 'analyst', 'evolved', t('press.has_evolved_and_appears_considerably_larger'),
    t('press.its_a_natural_part_of_his'), t('press.the_league_can_approve_it_from'), t('press.we_filed_the_form_under_reason'), t('press.the_league_did_not_approve_did'), { star: ['pro'] }),
  Q('s_evo_2', 'rookie', 'evolved', t('press.looks_different_did_he_get_a'),
    t('press.thats_the_evolution_hes_worked_a'), t('press.thats_the_evolving_thing_the_get'), t('press.both_the_barber_is_still_recovering'), t('press.he_has_shed_his_former_self'), { star: ['pro'] }),
  // ---- a legendary on the roster
  Q('s_legend_1', 'instigator', 'legendary', t('press.you_have_an_actual_legendary_on'),
    t('press.hes_on_our_roster_by_the'), t('press.its_not_cheating_its_shopping'), t('press.its_only_cheating_if_we_win'), t('press.he_was_here_before_the_rules')),
  Q('s_legend_2', 'rookie', 'legendary', t('press.is_really_a_legendary_does_he'),
    t('press.he_knows_he_handles_it_with'), t('press.he_knows_so_will_the_by'), t('press.we_told_him_he_asked_for'), t('press.he_has_always_known_he_told')),
  // ---- a trade brought {name} in
  Q('s_trade_1', 'instigator', 'trade', t('press.you_traded_for_who_did_you'),
    t('press.it_was_a_fair_deal_for'), t('press.theyll_know_on_sunday_and_every'), t('press.they_know_they_sent_a_thank'), t('press.i_traded_a_dream_i_had')),
  Q('s_trade_2', 'analyst', 'trade', t('press.the_acquisition_of_what_need_does'),
    t('press.he_gives_us_quality_at_and'), t('press.it_addresses_our_need_to_embarrass'), t('press.it_addresses_my_need_to_feel'), t('press.he_fills_the_hole_the_hole')),
  // ---- a free agent signed
  Q('s_sign_1', 'analyst', 'signing', t('press.you_signed_walk_me_through_the'),
    t('press.he_fits_what_we_do_and'), t('press.the_model_is_simple_hes_good'), t('press.i_wrote_a_number_he_nodded'), t('press.the_model_is_a_goat_that')),
  Q('s_sign_2', 'rookie', 'signing', t('press.you_got_a_new_monster_did'),
    t('press.we_picked_him_our_scouts_liked'), t('press.we_picked_him_the_wanted_him'), t('press.he_was_in_the_lobby_nobody'), t('press.he_chose_us_we_do_not')),
  // ---- the hot seat
  Q('s_hot_1', 'instigator', 'hotseat', t('press.word_is_the_boards_patience_is'),
    t('press.im_focused_on_sunday_the_rest'), t('press.warm_enough_to_cook_the_on'), t('press.medium_rare_ive_asked_for_a'), t('press.i_no_longer_sit_i_hover')),
  Q('s_hot_2', 'rookie', 'hotseat', t('press.people_keep_saying_youre_on_the'),
    t('press.its_a_figure_of_speech_it'), t('press.ill_get_a_new_chair_after'), t('press.i_asked_the_new_chair_was'), t('press.all_chairs_are_hot_if_you')),
  // ---- an upset win last game
  Q('s_upset_1', 'instigator', 'upsetWin', t('press.nobody_picked_you_to_beat_and'),
    t('press.nobody_we_just_want_to_stack'), t('press.everyone_alphabetical_order_starting_with_you'), t('press.my_own_family_they_had_in'), t('press.i_want_an_apology_from_the'), { insult: ['trash'] }),
  // ---- a heavy defeat last game
  Q('s_blowL_1', 'instigator', 'blowoutLoss', t('press.beat_you_at_what_point_did'),
    t('press.i_watched_every_snap_we_own'), t('press.ive_already_forgotten_it_the_are'), t('press.somewhere_around_the_anthem'), t('press.im_still_watching_its_playing_on'), { predict: ['trash'] }),
  Q('s_blowL_2', 'rookie', 'blowoutLoss', t('press.you_lost_to_was_the_plan'),
    t('press.no_we_were_outplayed_and_weve'), t('press.yes_and_now_theyre_exhausted_and'), t('press.yes_it_nearly_worked_they_looked'), t('press.there_was_no_plan_there_has')),
  // ---- a big win last game
  Q('s_blowW_1', 'analyst', 'blowoutWin', t('press.a_win_over_is_there_a'),
    t('press.theres_always_something_to_clean_up'), t('press.it_isnt_overconfidence_if_youre_right'), t('press.enormous_risk_ive_already_ordered_the'), t('press.we_have_transcended_confidence_we_simply')),
  // ---- an overtime game last week
  Q('s_ot_1', 'rookie', 'overtime', t('press.your_game_with_went_to_overtime'),
    t('press.it_means_the_score_was_level'), t('press.its_because_needed_extra_time_to'), t('press.yes_the_clock_guy_stepped_out'), t('press.time_gave_up_on_us_we')),

  // ============================================================ RUNNING JOKES AND STORYLINES (the club's own press history)
  // ---- a reporter you insulted remembers ({reporter} is this reporter)
  Q('m_insulted_i', 'instigator', 'insulted:instigator', t('press.before_i_start_you_took_a'),
    t('press.that_was_uncalled_for_i_apologize'), t('press.i_take_back_nothing_id_like'), t('press.id_take_it_back_but_it'), t('press.i_said_what_the_prophecy_required'), { insult: ['trash'] }),
  Q('m_insulted_r', 'rookie', 'insulted:rookie', t('press.um_last_time_i_asked_a'),
    t('press.of_course_that_was_on_me'), t('press.you_can_ask_i_cant_promise'), t('press.tell_your_mum_i_said_hello'), t('press.your_mother_and_i_have_been')),
  Q('m_insulted_a', 'analyst', 'insulted:analyst', t('press.for_the_record_your_previous_remark'),
    t('press.understood_i_respect_the_work_you'), t('press.note_this_one_too_i_still'), t('press.id_like_my_apology_peer_reviewed'), t('press.i_am_in_your_footnotes_now'), { insult: ['trash'] }),
  // ---- a guarantee or bold prediction you made, and you won
  Q('m_predHit', 'instigator', 'predictionHit', t('press.you_stood_up_here_and_called'),
    t('press.we_backed_it_up_now_its'), t('press.insufferable_and_undefeated_in_predictions_want'), t('press.i_was_insufferable_before_now_i'), t('press.i_do_not_predict_i_remember'), { predict: ['trash'] }),
  // ---- a guarantee or bold prediction you made, and you lost
  Q('m_predMiss', 'instigator', 'predictionMiss', t('press.you_guaranteed_big_things_against_from'),
    t('press.i_said_it_and_we_didnt'), t('press.play_it_ill_say_it_again'), t('press.no_thank_you_ive_seen_it'), t('press.that_was_a_different_me_he'), { predict: ['trash'] }),
  // ---- the rival answers your trash talk (you talked trash before the rival game; you won / lost)
  Q('m_rivalWon', 'instigator', 'rivalAnswered:won', t('press.says_your_trash_talk_before_the'),
    t('press.we_played_well_that_day_ill'), t('press.tell_the_noise_has_a_scoreboard'), t('press.it_was_luck_weve_been_practicing'), t('press.the_noise_is_coming_from_inside')),
  Q('m_rivalLost', 'instigator', 'rivalAnswered:lost', t('press.had_your_quotes_pinned_to_the'),
    t('press.yes_they_earned_it_and_i'), t('press.no_regrets_ill_write_them_a'), t('press.only_that_i_didnt_charge_them'), t('press.i_regret_nothing_the_wall_and')),
  // ---- one of your unhinged quotes resurfaces
  Q('m_quote_1', 'analyst', 'quote', t('press.earlier_this_season_you_told_this'),
    t('press.i_was_having_some_fun_its'), t('press.i_stand_by_every_word_so'), t('press.id_clarify_it_but_i_think'), t('press.it_clarifies_itself_in_time_to')),
  Q('m_quote_2', 'rookie', 'quote', t('press.my_editor_made_me_write_down'),
    t('press.it_was_a_joke_dont_lose'), t('press.it_means_the_are_in_trouble'), t('press.nobody_knows_it_was_on_a'), t('press.read_it_a_tenth_time_then')),
  // ---- a monster the press keeps hearing about
  Q('m_fav_1', 'rookie', 'mediaFav', t('press.you_talk_about_at_basically_every'),
    t('press.im_proud_of_the_whole_roster'), t('press.hes_everybodys_favorite_except_the'), t('press.i_dont_have_favorites_i_have'), t('press.i_am_not_allowed_to_say'), { star: ['pro', 'comedy'] }),
  Q('m_fav_2', 'instigator', 'mediaFav', t('press.the_fan_club_wants_to_know'),
    t('press.not_at_all_that_locker_room'), t('press.they_should_be_jealous_they_should'), t('press.one_of_them_asked_for_at'), t('press.there_are_no_other_monsters_there'), { star: ['pro'] }),
]);

/** Situations, most newsworthy first: at most two situational questions are asked on one Saturday. */
export const SITUATION_ORDER = Object.freeze(['predictionHit', 'predictionMiss', 'rivalAnswered:won', 'rivalAnswered:lost', 'rival', 'playoffs', 'qbInts', 'blowoutLoss', 'upsetWin', 'evolved', 'trade', 'signing', 'rushBig', 'recvBig', 'qbHot', 'defBig', 'streakL', 'streakW', 'hotseat', 'injury', 'champion', 'blowoutWin', 'overtime', 'legendary', 'playoffRace', 'insulted:instigator', 'insulted:analyst', 'insulted:rookie', 'quote', 'mediaFav']);

// ---------------------------------------------------------------- THE BEAST TIMES
/** Headlines by the tone of the press conference (the style used most; `mixed` when no style was used twice). */
export const HEADLINES = Object.freeze({
  pro: [t('press.coach_says_nothing_at_length'), t('press.one_game_at_a_time_says'), t('press.coach_confirms_team_will_try_to'), t('press.press_conference_ends_no_news_reported'), t('press.coach_respects_opponent_process_furniture'), t('press.focused_on_sunday_sources_inside_coachs'), t('press.coach_gives_110_percent_of_an'), 'REPORTERS ASLEEP BY SECOND QUESTION'],
  trash: [t('press.coach_declares_war_on_dignity'), t('press.write_it_in_pen_coach_wont'), t('press.bulletin_board_runs_out_of_space'), t('press.coach_guarantees_everything'), t('press.coach_picks_fight_with_entire_league'), t('press.bulletin_coach_said_that_out_loud'), t('press.coach_cant_wait_for_sunday_after'), 'COACH CASHES CHECK; TEAM TO FIND OUT SUNDAY IF IT CLEARS'],
  comedy: [t('press.coach_workshops_new_material_at_podium'), t('press.coach_funnier_than_offense_critics_say'), t('press.press_room_laughs_coach_unsure_if'), t('press.coach_here_all_week_contract_permitting'), t('press.coach_answers_question_with_better_question'), t('press.coach_requests_two_drink_minimum_for'), t('press.sarcasm_leads_in_sacks'), 'COACH {COACH} DEFLECTS; LEADS LEAGUE IN PASSES DEFENDED'],
  unhinged: [t('press.coach_the_moon_knows_what_it'), t('press.coach_escorted_gently_from_podium'), t('press.league_office_monitoring_coach'), t('press.coach_speaks_for_ten_minutes_no'), t('press.coach_claims_to_be_the_weather'), t('press.reporters_file_stories_then_check_on'), t('press.coach_answers_question_nobody_asked_in'), 'WELLNESS CHECK REQUESTED AT {CLUB} FACILITY'],
  mixed: [t('press.coach_tries_every_tone_commits_to'), t('press.presser_described_as_a_journey'), t('press.coach_starts_calm_ends_somewhere_else'), t('press.three_questions_three_coaches_which_shows'), t('press.coach_gives_answers_reporters_given_whiplash'), 'ANALYSTS UNABLE TO DETERMINE COACH {COACH}’S MOOD'],
});

/** Subheadlines by the club's real situation (the first live one in this order is used), then by tone. */
export const SUBHEADS = Object.freeze({
  predictionMiss: [t('press.earlier_guarantee_about_aged_like_milk'), 'Coach’s last prediction still being fact-checked by the scoreboard.'],
  predictionHit: [t('press.last_bold_prediction_came_true_coach'), 'Called the {lastOpp} result. Has mentioned it eleven times since.'],
  streakL: [t('press.team_has_lost_straight_practice_facility'), t('press.straight_losses_fans_advised_to_bring'), 'Losing streak reaches {n}. Morale described as "technically present".'],
  streakW: [t('press.team_has_won_straight_rest_of'), t('press.wins_in_a_row_bandwagon_reports'), 'Winning streak hits {n}. Humility not expected to recover.'],
  blowoutLoss: [t('press.follows_loss_to_that_witnesses_describe'), 'Scoreboard operator from the {lastOpp} game still icing wrist.'],
  upsetWin: [t('press.comes_days_after_shock_win_over'), 'Nobody saw the {lastOpp} result coming, including {club}.'],
  blowoutWin: ['{us}-{them} rout of {lastOpp} has club "insufferable", neighbors say.'],
  rival: [t('press.week_both_fan_bases_already_hoarse'), t('press.arrive_sunday_stadium_security_has_a'), 'Rivalry game Sunday. Local hospitals request everyone calm down.'],
  playoffs: [t('press.win_or_go_home_have_not'), 'Playoff football Sunday. Nails across the city in danger.'],
  hotseat: [t('press.board_watching_closely_which_is_never'), 'Owner’s box described as "quiet, in a loud way".'],
  qbInts: [t('press.threw_interceptions_last_week_receivers_hopeful'), 'After {ints} interceptions, {name} "working on aiming".'],
  rushBig: ['{name} ran for {yds} yards last week. Groundskeepers still repairing the field.'],
  recvBig: ['{name} had {yds} receiving yards last week. Opposing secondary "resting comfortably".'],
  qbHot: ['{name} threw {tds} touchdowns last week and would like you to know.'],
  defBig: ['{name} terrorised {lastOpp} last week. Quarterbacks league-wide "aware".'],
  evolved: [t('press.has_evolved_equipment_staff_ordering_bigger'), 'Newly evolved {name} no longer fits in team photo.'],
  trade: ['New arrival {name} "still learning where the cafeteria is".'],
  signing: ['New signing {name} reportedly "happy to be here, wherever here is".'],
  injury: ['{name} out {weeks}. Trainers "doing their best with the tape they have".'],
  champion: ['Defending champions. Trophy reportedly "smug".'],
  legendary: ['{name} seen nodding slowly in background throughout.'],
  playoffRace: ['Club sits at {record}. Mathematicians cautiously interested.'],
  generic: [t('press.are_kickoff_against_is_sunday'), t('press.club_is_heading_into_weather_expected'), t('press.the_declined_to_comment_loudly'), t('press.sunday_versus_popcorn_sales_up'), t('press.press_room_coffee_described_as_a'), 'Reporters outnumbered answers three to one.'],
});
export const TONE_KICKERS = Object.freeze({
  pro: [t('press.full_transcript_available_to_anyone_having'), 'Coach thanked reporters. Reporters unsure what for.'],
  trash: [t('press.the_have_printed_the_quotes_in'), 'League reminds coaches that microphones are "always on".'],
  comedy: [t('press.tour_dates_to_be_announced'), 'One reporter laughed so hard he missed deadline.'],
  unhinged: [t('press.a_league_spokesman_said_only_were'), 'Team doctor has asked to "just have a quick chat".'],
  mixed: [t('press.body_language_experts_gave_up_at'), 'Next week: possibly the same coach.'],
});
