// Postseason story events (GDD §15.7). A losing record makes one mandatory;
// a winning season skips them. Each is a short scene with two or three
// options. Consequences are applied by franchise.js (resolvePostseason).
//
// Placeholders: {star} {club} {rival} {coach} {role} {scheme} {fit} {total}
import { t as $t } from '../text/index.js';

export const POSTSEASON_EVENTS = Object.freeze({
  star_out: {
    title: $t('postseason.a_star_wants_out'),
    speaker: 'agent',
    lines: [$t('postseason.s_agent_is_on_the_line')],
    options: [
      { id: 'raise', label: $t('postseason.raise_their_salary_15'), text: $t('postseason.they_stay_the_raise_counts_against'), rookieFree: false },
      { id: 'promise', label: $t('postseason.promise_a_starting_spot'), text: $t('postseason.they_stay_bench_them_for_three') },
      { id: 'release', label: $t('postseason.let_them_go'), text: $t('postseason.they_sign_with_your_rival_you') },
    ],
    rookie: { id: 'talk', label: $t('postseason.talk_them_into_staying'), text: $t('postseason.rookie_only_a_long_conversation_no') },
  },
  coordinator_offer: {
    title: $t('postseason.a_coordinator_has_an_offer'),
    speaker: 'coach',
    lines: [$t('postseason.knocks_on_your_door_wants_me')],
    options: [
      { id: 'bonus', label: $t('postseason.pay_a_retention_bonus'), text: $t('postseason.they_stay_the_bonus_counts_against') },
      { id: 'leave', label: $t('postseason.let_them_go'), text: $t('postseason.they_leave_the_best_available_coordinator') },
    ],
    rookie: { id: 'talk', label: $t('postseason.appeal_to_loyalty'), text: $t('postseason.rookie_only_they_stay_for_nothing') },
  },
  scheme_mutiny: {
    title: $t('postseason.the_scheme_doesnt_fit_the_roster'),
    speaker: 'coach',
    lines: [$t('postseason.drops_a_stack_of_tape_on')],
    options: [
      { id: 'scheme', label: $t('postseason.change_the_scheme_to_the_roster'), text: $t('postseason.the_coordinator_whose_scheme_best_fits') },
      { id: 'roster', label: $t('postseason.keep_the_scheme_change_the_roster'), text: $t('postseason.stays_nothing_else_changes_the_fit') },
      { id: 'fire', label: $t('postseason.fire_now'), text: $t('postseason.their_remaining_salary_counts_against_next') },
    ],
    rookie: { id: 'talk', label: $t('postseason.ask_for_patience'), text: $t('postseason.rookie_only_they_stay_no_strings') },
  },
});

export const RAISE_PCT = 0.15;
export const RETENTION_BONUS_PCT = 0.5; // of the coordinator's salary
export const PROMISE_BENCH_LIMIT = 3;
