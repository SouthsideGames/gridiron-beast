// What each of the twelve attributes does for each position (GDD §8.2), read from what the football engine (src/sim) actually
// uses, plus the attributes in each position's overall rating (POSITION_WEIGHTS, which also feeds Beast Clash). This file is the
// single source for two things: the in-game "What the stats mean" guide, and the rule that attribute points can only be spent on
// an attribute that helps the monster's position. It imports nothing.
import { t as $t } from '../text/index.js';

export const POSITIONS = Object.freeze(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);
export const POSITION_NAME = Object.freeze({ QB: $t('guide.quarterback'), RB: $t('guide.running_back'), WR: $t('guide.wide_receiver'), TE: $t('guide.tight_end'), OL: $t('guide.offensive_line'), DL: $t('guide.defensive_line'), LB: $t('guide.linebacker'), CB: $t('guide.cornerback'), S: $t('guide.safety'), K: $t('guide.kicker') });
export const ATTR_ORDER = Object.freeze(['speed', 'agility', 'strength', 'awareness', 'catching', 'arm', 'accuracy', 'blocking', 'tackling', 'coverage', 'durability', 'kicking']);
export const ATTR_NAME = Object.freeze({ speed: $t('guide.speed'), agility: $t('guide.agility'), strength: $t('guide.strength'), awareness: $t('guide.awareness'), catching: $t('guide.catching'), arm: $t('guide.arm'), accuracy: $t('guide.accuracy'), blocking: $t('guide.blocking'), tackling: $t('guide.tackling'), coverage: $t('guide.coverage'), durability: $t('guide.durability'), kicking: $t('guide.kicking') });

/**
 * For each attribute: a one-line summary and what it does for each position. A position missing from `by` gets nothing from it:
 * the attribute does not help that position, and points cannot be spent on it.
 */
export const STAT_GUIDE = Object.freeze({
  speed: { summary: $t('guide.how_fast_the_monster_runs_flat'), by: {
    QB: $t('guide.running_on_scrambles_and_keepers'), RB: $t('guide.hitting_the_hole_and_pulling_away'), WR: $t('guide.getting_open_deep_and_running_after'), TE: $t('guide.getting_open_and_running_after_the'),
    OL: $t('guide.getting_to_the_block_on_pulls'), DL: $t('guide.closing_on_the_quarterback_and_chasing'), LB: $t('guide.running_with_receivers_and_chasing_ball'), CB: $t('guide.keeping_up_with_receivers_in_coverage'), S: $t('guide.covering_deep_and_running_down_the') } },
  agility: { summary: $t('guide.how_quickly_the_monster_starts_stops'), by: {
    QB: $t('guide.escaping_the_pass_rush_and_deciding'), RB: $t('guide.jukes_and_cuts_that_make_tacklers'), WR: $t('guide.sharp_route_cuts_a_wider_catch'), TE: $t('guide.route_cuts_and_a_wider_catch'),
    OL: $t('guide.moving_to_the_block_on_pulls'), DL: $t('guide.getting_around_blockers_on_the_pass'), LB: $t('guide.changing_direction_in_coverage_and_pursuit'), CB: $t('guide.mirroring_receivers_through_their_cuts'), S: $t('guide.changing_direction_in_coverage_and_pursuit') } },
  strength: { summary: $t('guide.physical_power'), by: {
    QB: $t('guide.breaking_tackles_on_scrambles_and_keepers'), RB: $t('guide.breaking_tackles_half_of_a_ball'), WR: $t('guide.breaking_tackles_after_the_catch_and'), TE: $t('guide.holding_blocks_40_of_a_block'),
    OL: $t('guide.holding_blocks_40_of_how_well'), DL: $t('guide.shedding_blocks_half_of_a_pass'), LB: $t('guide.shedding_blocks_and_tackling_about_a'), CB: $t('guide.tackling_and_shedding_blocks_on_blitzes'), S: $t('guide.tackling_and_shedding_blocks_on_blitzes') } },
  awareness: { summary: $t('guide.football_iq_how_well_the_monster'), by: {
    QB: $t('guide.reading_receivers_faster_judging_who_is'), RB: $t('guide.vision_how_far_ahead_it_sees'), WR: $t('guide.vision_after_the_catch'), TE: $t('guide.vision_after_the_catch'),
    OL: $t('guide.counts_toward_the_overall_rating_and'), DL: $t('guide.pursuit_angles_and_resisting_jukes'), LB: $t('guide.reacting_in_zone_pursuit_angles_and'), CB: $t('guide.reacting_in_zone_and_not_biting'), S: $t('guide.reacting_in_zone_pursuit_angles_and_2'), K: $t('guide.counts_toward_the_overall_rating_and') } },
  catching: { summary: $t('guide.hands_catching_the_ball_and_holding'), by: {
    QB: $t('guide.ball_security_fewer_fumbles_when_sacked'), RB: $t('guide.catching_passes_and_ball_security_fewer'), WR: $t('guide.catching_especially_deep_and_contested_balls'), TE: $t('guide.catching_especially_contested_balls_ball_securit'),
    LB: $t('guide.turning_a_tipped_or_contested_pass'), CB: $t('guide.turning_contested_passes_into_interceptions'), S: $t('guide.turning_contested_passes_into_interceptions') } },
  arm: { summary: $t('guide.throwing_power'), by: { QB: $t('guide.how_fast_the_ball_travels_how') } },
  accuracy: { summary: $t('guide.throwing_precision'), by: { QB: $t('guide.how_close_the_ball_lands_to') } },
  blocking: { summary: $t('guide.blocking_technique_when_the_play_says'), by: {
    RB: $t('guide.pass_protection_and_lead_blocks_60'), WR: $t('guide.stalk_blocks_on_run_plays'), TE: $t('guide.run_and_pass_blocking_60_of'), OL: $t('guide.the_lines_main_job_60_of') } },
  tackling: { summary: $t('guide.bringing_the_ball_carrier_down'), by: {
    DL: $t('guide.finishing_sacks_and_tackles_part_of'), LB: $t('guide.sure_tackles_55_of_a_tackle'), CB: $t('guide.sure_tackles_in_the_open_field'), S: $t('guide.sure_tackles_as_the_last_line') } },
  coverage: { summary: $t('guide.staying_with_a_receiver'), by: {
    LB: $t('guide.covering_backs_and_tight_ends'), CB: $t('guide.reacting_to_a_receivers_cuts_anticipating'), S: $t('guide.deep_coverage_and_breaking_up_contested') } },
  durability: { summary: $t('guide.how_well_the_body_holds_up'), by: {
    QB: $t('guide.tiring_more_slowly_and_fewer_injuries'), RB: $t('guide.tiring_more_slowly_and_fewer_injuries'), WR: $t('guide.tiring_more_slowly_and_fewer_injuries'), TE: $t('guide.tiring_more_slowly_and_fewer_injuries'), OL: $t('guide.tiring_more_slowly_and_fewer_injuries'),
    DL: $t('guide.tiring_more_slowly_and_fewer_injuries'), LB: $t('guide.tiring_more_slowly_and_fewer_injuries'), CB: $t('guide.tiring_more_slowly_and_fewer_injuries'), S: $t('guide.tiring_more_slowly_and_fewer_injuries') } },
  kicking: { summary: $t('guide.leg_strength_and_precision'), by: { K: $t('guide.field_goal_range_and_accuracy_punts') } },
});

/** Does `attr` help a monster at `position`? (Spending points is limited to these.) */
export function attributeHelps(position, attr) { return !!STAT_GUIDE[attr]?.by[position]; }
/** The attributes that help a position, in display order. */
export function usefulAttributes(position) { return ATTR_ORDER.filter((a) => attributeHelps(position, a)); }
/** What `attr` does for a `position`, in one sentence (or why it does nothing). */
export function statMeaning(position, attr) {
  const g = STAT_GUIDE[attr]; if (!g) return '';
  return g.by[position] || `${$t('guide.does_nothing_for_a', { toLowerCase: POSITION_NAME[position]?.toLowerCase() || position })}`;
}
