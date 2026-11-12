// Beast Clash in Franchise Mode: the one battle screen for Tuesday encounters, the pregame Clash and the overtime Clash (GDD §26).
// The screen never decides a battle: the franchise module draws the seed and fixes the lineups, the engine plays the battle, and
// this screen shows the record (through the arena player). Revised 2026-10-22 (owner brief): ONE selection phase (the monsters
// and their order of entry), then ONE continuous battle with no further decisions; the next monster steps up on a knockout
// until one side has nobody left. Watch and Skip to results are the identical battle.
import { abilityInfo, masteryInfo } from '../ability-info.js';
import { esc, delegate, toast, sheet, fmtMoney } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import * as F from '../../franchise/franchise.js';
import { CLASH_MODES, CLASH_SPEEDS, clashSettings, pendingDecision, policiesOf, normalizeMode, isT8Record } from '../../franchise/clash-link.js';
import { consequence } from '../../franchise/assist-advice.js';
import { createArena } from '../clash/arena.js';
import { stateAt as stateAtRecord } from '../clash/choreographer.js';
import { toArenaRecord, T8_STATUS_ICON, T8_STATUS_NAME } from '../clash/t8-record.js';
const stateAt = (r, i) => stateAtRecord(toArenaRecord(r), i);
import { monsterOverall } from '../../data/monsters.js';
import { archetypeOf } from '../../clash/stats.js';
import { typeFactor, typeEdge } from '../../clash/types.js';
import { startSundayGame } from './match.js';
import { t as $t } from '../../text/index.js';

const ARCH_GLYPH = { Tank: '🛡', Striker: '⚔️', Support: '💚', Disruptor: '🌀', Balanced: '⚖️' };
export const MODE_TEXT = Object.freeze({
  watch: { label: $t('clash.watch_battle'), help: $t('clash.watch_every_exchange_your_monsters_enter') },
  skip: { label: $t('clash.skip_to_results'), help: $t('clash.the_same_battle_resolved_instantly_skipping') },
});
export const SPEED_LABEL = Object.freeze({ 1: $t('clash.normal'), 2: $t('clash.fast'), 4: $t('clash.fastest') });
export const HELP_HTML = `<p>${$t('clash.b_beast_clash_b_is_a')}</p>
<p>${$t('clash.b_rotations_b_after_both_fighters')}</p>
<p>${$t('clash.b_watch_battle_b_shows_every')}</p>
<p>${$t('clash.b_statuses_b_a_monster_carries')}</p>
<p>${$t('clash.b_type_edges_b_next_to')}</p>
<p>${$t('clash.b_tuesday_encounters_b_the_monster')}</p>
<p>${$t('clash.b_skipping_a_tuesday_encounter_b')}</p>
<p>${$t('clash.monsters_that_battle_earn_a_little')}</p>`;

/**
 * A binding tells the screen which battle it is showing. Every battle record lives in the franchise save, so the screen can be
 * closed and reopened mid-battle. Bindings: encounter (Tuesday). Pregame and overtime are added in their milestones.
 */
function bindings(app, Router) {
  return {
    encounter: {
      title: $t('clash.tuesday_beast_clash'),
      skipLabel: $t('clash.skip_encounter'), skipHelp: $t('clash.skipping_the_encounter_means_no_battle'),
      skip: (f) => { F.skipEncounter(f); app.save(); toast($t('clash.encounter_skipped_on_to_wednesday')); Router.go('hq', {}, { reset: true }); },
      theirName: () => $t('clash.the_wild'),
      record: (f) => f.week.encounter,
      preview: (f, i) => F.encounterPreview(f, i),
      start: (f, i, opts) => F.startEncounter(f, i, opts),
      battle: (f) => F.encounterBattle(f), decide: (f, ex, choice) => F.encounterDecide(f, ex, choice),
      resolve: (f) => F.resolveEncounter(f),
      occasion: 'encounter', mySide: 'a',
      resultHtml(f, e) {
        const p = f.week.prospects[e.prospectIndex];
        // Signing or letting the monster go clears the week's prospects; the result screen then names it from the battle snapshot and always offers the way on.
        const m = p?.monster || f.roster.find((x) => x.id === e.wild?.[0]) || e.b?.[0] || null;
        if (!m) return `<div class="panel"><button class="btn primary block" data-action="done">${$t('clash.continue_to_wednesday')}</button></div>`;
        const won = e.result?.winner === 'a';
        if (e.status === 'offer') { const cap = F.salarySummary(f, m.salary); return `<div class="panel"><p>${$t('clash.b_b_is_impressed_and_wants', { name: esc(m.name), club: esc(f.club) })}</p><p class="muted">${$t('clash.ovr_yr_roster', { position: esc(m.position), monsterOverall: monsterOverall(m), amount: fmtMoney(m.salary), n: f.roster.length + 1, rosterMax: F.ROSTER_MAX })}${cap.over ? ` · <span style="color:var(--bad)">${$t('clash.over_the_cap_by', { amount: fmtMoney(-cap.remaining) })}</span>` : ` ${$t('clash.cap_room_after', { amount: fmtMoney(cap.remaining) })}`}</p>${(() => { const c = consequence(f, 'sign', { salary: m.salary }); return c ? `<p class="assist-note">${esc(c)}</p>` : ''; })()}<div class="row"><button class="btn primary grow" data-action="accept">${$t('clash.sign', { name: esc(m.name) })}</button><button class="btn" data-action="decline">${$t('clash.let_them_go')}</button></div></div>`; }
        if (e.status === 'pitch') return `<div class="panel"><p>${$t('clash.won_the_battle_but_will_still', { name: esc(m.name) })}</p><div class="grid3">${F.RECRUIT_APPROACHES.map((a) => `<button class="btn small" data-action="pitch" data-v="${a.id}" title="${esc(a.text)}">${esc(a.label)}</button>`).join('')}</div><p class="dim">${$t('clash.the_usual_odds_apply_development_suits')}</p><button class="btn block" data-action="decline">${$t('clash.let_them_go')}</button></div>`;
        return `<div class="panel"><p>${e.status === 'signed' ? `<b>${esc(m.name)}</b> signed!` : e.status === 'walked' ? `${$t('clash.turned_you_down', { name: esc(m.name) })}` : `${$t('clash.you_let_go', { name: esc(m.name) })}`}${won ? '' : ''}</p><button class="btn primary block" data-action="done">${$t('clash.continue_to_wednesday')}</button></div>`;
      },
      actions(root, rerender) {
        return {
          accept: async () => { const f = app.f; const e = f.week.encounter; const p = f.week.prospects[e.prospectIndex]; const rc = F.releaseCandidates(f, p);
            if (rc.needed) { const { el: sh, close } = sheet(`<p>${$t('clash.choose_who_leaves_so_b_b', { reason: esc(rc.reason), name: esc(p.monster.name) })}</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}"><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr${c.capOk ? '' : $t('clash.still_over_the_cap_after_this')}</div></div><span class="chip ${c.position === p.monster.position ? 'accent' : ''}">${c.position === p.monster.position ? 'same position' : 'release'}</span></button>`).join('')}</div>`, { title: $t('clash.make_room') });
              sh.addEventListener('click', (ev) => { const id = ev.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); const r = F.acceptOffer(f, { releaseId: id }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${$t('clash.signed_you_are_over_the_cap', { name: r.monster.name })}` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); }); return; }
            const r = F.acceptOffer(f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${$t('clash.signed_you_are_over_the_cap', { name: r.monster.name })}` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); },
          decline: () => { const r = F.declineOffer(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); rerender(); },
          pitch: (el) => { const f = app.f; const e = f.week.encounter; const p = f.week.prospects[e.prospectIndex];
            const send = (releaseId = null) => { const r = F.recruit(f, e.prospectIndex, el.dataset.v, { releaseId }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.success ? `${r.monster.name} signed!` : $t('clash.they_turned_you_down'), r.success ? 'good' : 'info'); rerender(); };
            const rc = p ? F.releaseCandidates(f, p) : { needed: false };
            if (!rc.needed) { send(); return; }
            // A full roster: choose who would leave if the pitch works (found by the combined-build walkthrough: the pitch used to fail with no way to choose).
            const { el: sh, close } = sheet(`<p>${$t('clash.if_says_yes_who_leaves', { reason: esc(rc.reason), name: esc(p.monster.name) })}</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}"><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr</div></div><span class="chip">release</span></button>`).join('')}</div>`, { title: $t('clash.make_room') });
            sh.addEventListener('click', (ev) => { const id = ev.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); send(id); }); },
          done: () => Router.go('hq', {}, { reset: true }),
        };
      },
    },
    pregame: {
      title: $t('clash.sunday_beast_clash_for_possession'),
      record: (f) => f.week.pregame,
      preview: (f) => F.pregamePreview(f),
      start: (f, i, opts) => F.startPregameClash(f, opts),
      battle: (f) => F.pregameBattle(f), decide: (f, ex, choice) => F.pregameDecide(f, ex, choice),
      resolve: (f) => F.resolvePregameClash(f),
      occasion: 'pregame', mySide: 'a',
      theirName: (f) => F.pregamePreview(f).opponent || $t('clash.their_team'),
      introText: (f) => { const pv = F.pregamePreview(f); return `${$t('clash.before_kickoff_against_b_b_three', { opponent: esc(pv.opponent || $t('clash.the_opponent')) })}`; },
      resultHtml(f, e) {
        const opp = e.opponent || $t('clash.the_opponent_2');
        if (e.status === 'choose') return `<div class="panel"><p>${$t('clash.b_you_choose_the_opening_possession')}</p><div class="stack"><button class="btn primary" data-action="choose" data-v="receive">${$t('clash.receive_the_opening_kickoff')}</button><button class="btn" data-action="choose" data-v="defer">${$t('clash.defer_to_the_second_half')}</button><button class="btn" data-action="choose" data-v="kick">${$t('clash.kick_off')}</button></div><p class="dim">${$t('clash.receive_you_start_with_the_ball')}</p></div>`;
        const theirs = e.result?.winner !== 'a';
        return `<div class="panel"><p>${theirs ? `${$t('clash.b_b_won_the_clash_and', { opp: esc(opp), choice: esc(e.choice === 'defer' ? $t('clash.defer_to_the_second_half_2') : $t('clash.receive_the_opening_kickoff_2')) })}` : `${$t('clash.you_chose_to_b_b', { choice: esc(e.choice === 'receive' ? $t('clash.receive_the_opening_kickoff_2') : e.choice === 'defer' ? $t('clash.defer_to_the_second_half_2') : 'kick off') })}`}</p><button class="btn primary big block" data-action="kickoff">${$t('clash.kick_off_2')}</button></div>`;
      },
      actions() {
        return {
          choose: (el) => { const r = F.choosePossession(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
          kickoff: () => { startSundayGame(app.f); },
        };
      },
    },
    overtime: {
      title: $t('clash.overtime_beast_clash'),
      record: (f) => f.week.overtime,
      preview: (f) => F.overtimePreview(f),
      start: (f, i, opts) => F.startOvertimeClash(f, { ...opts, state: app.f?.game?.state || null }), // the football state: statuses and exhaustion carry into the deciding Clash (§10, §12)
      battle: (f) => F.overtimeBattle(f), decide: (f, ex, choice) => F.overtimeDecide(f, ex, choice),
      resolve: (f) => F.resolveOvertimeClash(f),
      occasion: 'overtime', mySide: 'a',
      theirName: (f) => F.overtimePreview(f).opponent || $t('clash.their_team'),
      introText: (f) => { const pv = F.overtimePreview(f); const s = f.game?.state; return `${$t('clash.still_tied')}${s ? ` at ${s.score.home}-${s.score.away}` : ''} ${$t('clash.after_overtime_against_b_b_a', { opponent: esc(pv.opponent || $t('clash.the_opponent')), size: pv.size, size2: pv.size, playoff: pv.playoff ? $t('clash.playoffs_five_a_side') : '' })}`; },
      resultHtml(f, e) {
        const s = f.game?.state; const won = e.result?.winner === 'a';
        return `<div class="panel"><p>${won ? `${$t('clash.b_you_win_the_game_b')} ${s ? `${s.score.home}-${s.score.away}` : ''} ${$t('clash.on_the_overtime_beast_clash')}` : `${$t('clash.b_b_win_the_game', { opponent: esc(e.opponent) })} ${s ? `${s.score.home}-${s.score.away}` : ''} ${$t('clash.on_the_overtime_beast_clash')}`}</p><p class="dim">${$t('clash.the_record_shows_the_football_score')}</p><button class="btn primary big block" data-action="final">${$t('clash.continue_to_the_final')}</button></div>`;
      },
      actions() {
        return {
          final: () => { const f = app.f; if (!f.game?.state) { Router.go('hq', {}, { reset: true }); return; } F.applyTiebreak(f, f.game.state); app.save(); Router.go('match', {}, { reset: true }); },
        };
      },
    },
  };
}

export function registerClashBattle(Router, app) {
  const BINDINGS = bindings(app, Router);
  const st = { kind: null, i: 0, arena: null, cursor: 0, result: null, lineup: null, editing: false, replaying: false };
  const settings = () => clashSettings(app.f?.settings);
  const saveSettings = (patch) => { if (!app.f) return; app.f.settings.clash = { ...settings(), ...patch }; app.save(); };
  const stop = () => { if (st.arena) { st.cursor = st.arena.cursor; st.arena.destroy(); st.arena = null; } };
  const B = () => BINDINGS[st.kind];

  // ---------- the one selection phase (before the seed is drawn): the monsters and their order of entry
  function setupHtml(f) {
    const b = B(); const pv = b.preview(f, st.i);
    if (!pv.ok) return `<div class="panel"><p>${esc(pv.reason)}</p><button class="btn block" data-action="back">${$t('clash.back')}</button></div>`;
    // The automatic lineup is only the starting proposal (or what Auto lineup asks for): once the player edits it, removals stick,
    // even down to an empty lineup (the Enter buttons wait for at least one monster).
    st.lineup = (st.lineup || pv.lineup.map((m) => m.id)).filter((id) => pv.eligible.some((m) => m.id === id)).slice(0, pv.size);
    const mine = st.lineup.map((id) => f.roster.find((m) => m.id === id)); const theirs = pv.wild.slice(0, pv.size);
    const s = settings(); const preferred = s.mode !== 'ask' ? s.mode : 'watch';
    const edge = (m, foe) => { if (!foe) return ''; const x = typeFactor(m.type, foe.type), y = typeFactor(foe.type, m.type); return x > 1 ? '<b class="edge strong" title="hits their front monster harder">▲</b>' : y > 1 ? `<b class="edge weak" title="${$t('clash.their_front_monster_hits_this_one')}">▼</b>` : ''; };
    const slotLabel = (i, n) => i === 0 ? 'enters first' : i === n - 1 && n > 1 ? 'last' : `${i + 1}${i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} in`;
    // Task 8 M6: the Clash ability of each fighter; for your own monsters, its Clash mastery tier (the mode's mastery, spec §6).
    const abLine = (m, side) => { const a = abilityInfo(m.species, 'clash'); if (!a) return `<div class="dim" style="line-height:1.25">${$t('clash.no_clash_ability_basic')}</div>`; const k = side === 'a' && m.dev ? masteryInfo(m, 'clash') : null; return `<div style="line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-clash-ability="${a.id}">✦ ${esc(a.name)}${k ? ` <span class="dim">· ${k.tier}${k.mastered ? '' : ` ${k.credits}/${k.next}`}</span>` : ''}</div>`; };
    const card = (m, i, side, n) => `<div class="item static cl-pick ${i === 0 ? 'first' : ''}" style="gap:8px"><span class="cl-slot ${i === 0 ? 'first' : ''}">${i + 1}</span>${monsterSprite(m, 34)}<div class="grow" style="font-size:12px;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${esc(m.name)}</b> <span class="dim">${$t('clash.ovr', { monsterOverall: monsterOverall(m) })}</span> ${side === 'a' ? edge(m, theirs[0]) : edge(m, mine[0])}</div>${abLine(m, side)}<div class="dim" style="line-height:1.25">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · <b style="color:var(--ink-2)">${slotLabel(i, n)}</b>${m.companion ? $t('clash.cannot_sign') : ''}${m.fatigue >= 30 ? ` · <span style="color:var(--warn)">${$t('clash.tired', { fatigue: m.fatigue })}</span>` : ''}</div></div>${side === 'a' ? `<span class="cl-pick-btns"><button class="btn small ghost" data-action="moveup" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${$t('clash.move_up')}">↑</button><button class="btn small ghost" data-action="movedown" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="${$t('clash.move_down')}">↓</button><button class="btn small ghost" data-action="remove" data-id="${m.id}" aria-label="${$t('clash.remove')}">✕</button></span>` : ''}</div>`;
    const rest = pv.eligible.filter((m) => !st.lineup.includes(m.id));
    const picker = st.lineup.length < pv.size || st.editing ? `<div class="list" style="margin-top:6px;max-height:280px;overflow:auto">${rest.map((m) => `<button class="item" style="min-height:0;padding:6px 8px" data-action="add" data-id="${m.id}" ${st.lineup.length >= pv.size ? 'disabled' : ''}>${monsterSprite(m, 28)}<div class="grow" style="font-size:12px;min-width:0"><b>${esc(m.name)}</b> <span class="dim">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · ${monsterOverall(m)} OVR${m.fatigue >= 30 ? ` ${$t('clash.tired_2', { fatigue: m.fatigue })}` : ''}</span> ${edge(m, theirs[0])}</div><span class="chip">${st.lineup.length >= pv.size ? 'full' : 'add'}</span></button>`).join('') || `<p class="dim">${$t('clash.everyone_healthy_is_in_the_lineup')}</p>`}</div>` : '';
    return `<p class="muted">${b.introText ? b.introText(f) : `${$t('clash.you_met_b_b_in_the', { name: esc(pv.wild[0].name) })}${pv.wild.length > 1 ? ` ${$t('clash.with_wild_companion_matched_to_your', { n: pv.wild.length - 1, wild: pv.wild.length > 2 ? 's' : '' })}` : ''}${$t('clash.win_the_v_and_will_want', { size: pv.size, size2: pv.size, name: esc(pv.wild[0].name) })}`} <button class="btn small ghost" data-action="help">${$t('clash.help')}</button></p>${pv.basicBonus?.active ? `<p class="panel tight" style="margin:6px 0"><b>✨ ${esc(pv.basicBonus.label)}</b><span class="dim"> ${$t('clash.for_every_battler_if_you_win', { name: esc(pv.wild[0].name) })}</span></p>` : ''}
      <div class="panel cl-setup"><div class="row between">${$t('clash.b_your_lineup_b')}<span class="dim">${$t('clash.of_in_order_of_entry', { n: mine.length, size: pv.size })}</span></div>
        <div class="list" style="margin-top:6px">${mine.map((m, i) => card(m, i, 'a', mine.length)).join('')}${!mine.length ? `<p class="dim" style="margin:4px 0">${$t('clash.no_monsters_picked_add_up_to', { size: pv.size })}</p>` : mine.length < pv.size ? `<p class="dim" style="margin:4px 0">${$t('clash.slots_open_add_more_or_enter', { n: pv.size - mine.length, n2: mine.length, n3: mine.length, n4: mine.length })}</p>` : ''}</div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small" data-action="edit">${st.editing ? $t('clash.done') : $t('clash.change_a_monster')}</button><button class="btn small ghost" data-action="autol">${$t('clash.auto_lineup')}</button></div>${picker}
        <p class="dim" style="margin:6px 0 0">${$t('clash.the_first_monster_fights_until_it')}</p></div>
      <div class="panel cl-setup theirs"><div class="row between"><b>${esc(b.theirName?.(f) || $t('clash.their_team'))}</b><span class="dim">${$t('clash.in_order_of_entry', { n: theirs.length })}</span></div><div class="list" style="margin-top:6px">${theirs.map((m, i) => card(m, i, 'b', theirs.length)).join('')}</div></div>
      <div class="panel" style="margin-top:8px"><div class="row between" style="flex-wrap:wrap;gap:6px">${$t('clash.b_speed_b')}<span class="chips">${CLASH_SPEEDS.map((x) => `<button class="chip ${s.speed === x ? 'on accent' : ''}" data-action="speed" data-v="${x}">${SPEED_LABEL[x]}</button>`).join('')}</span></div>
        <div class="stack" style="margin-top:8px;gap:6px">${CLASH_MODES.map((k) => `<button class="btn big block cl-mode ${preferred === k ? 'primary' : ''}" data-action="enter" data-v="${k}" ${mine.length ? '' : 'disabled'}><span class="cl-mode-label">${k === 'watch' ? '▶ ' : '⏭ '}${MODE_TEXT[k].label}</span><span class="cl-mode-help">${MODE_TEXT[k].help}</span></button>`).join('')}</div>
        ${b.skipLabel ? `<button class="btn block" data-action="skipenc" style="margin-top:6px">${esc(b.skipLabel)}</button><p class="dim" style="margin:6px 0 0">${b.skipHelp}</p>` : ''}
      </div>`;
  }

  // ---------- the battle itself: continuous; in Watch the t8 engine stops at the player's legal rotation phases (D1) and the prompt below answers them
  function battleHtml(f, e) {
    const pend = isT8Record(e) && st.result?.pending ? pendingDecision(st.result) : null;
    return `<div class="row between" style="margin-bottom:4px"><span class="muted">${e.size}v${e.size} · ${esc(B().title.split('·').pop().trim())}</span><span class="row" style="gap:6px">${pend ? `<button class="btn small primary" data-action="rotprompt">${$t('clash.rotation_your_call')}</button>` : ''}<button class="btn small ghost" data-action="help">${$t('clash.help')}</button></span></div>
      <div id="fb-arena"></div>`;
  }
  function teamNames(f, e) { const theirs = st.kind === 'encounter' ? $t('clash.the_wild') : (e.opponent || $t('clash.the_opponent_2')); return { a: f.club.split(' ').pop(), b: theirs }; }
  function mountBattle(root, f, e) {
    const host = root.querySelector('#fb-arena'); if (!host) return;
    st.result = B().battle(f); if (!st.result) { toast($t('clash.the_battle_could_not_be_rebuilt'), 'bad'); return; }
    const legacyPend = !isT8Record(e) && policiesOf(e).a === 'manual' ? pendingDecision(st.result) : null; // a 'play' battle from before 2026-10-22 left mid-decision: it finishes on its own as Auto
    if (legacyPend) { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; app.save(); st.result = B().battle(f); }
    const end = st.result.log.length - 1;
    // Looks hook (Task 8 M4): the Clash looks module (src/ui/fx/clash*, branch task8-fx-clash) plugs in here as `looks` once it exists;
    // until then the arena plays its functional cues. See src/ui/clash/t8-record.js for the contract.
    st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, names: teamNames(f, e), edge: typeEdge, simple: true, looks: app.clashLooks || null, onCursor: (i) => { st.cursor = i; }, onEnd: () => atEnd(f) });
    if (st.cursor) st.arena.setCursor(Math.min(st.cursor, end));
    if (st.cursor >= end) { atEnd(f); return; }
    setTimeout(() => st.arena?.play(), 300);
  }
  /** The log has been played to its last event: either the battle is over (settle it) or the engine stopped at the player's rotation prompt (D1). */
  function atEnd(f) {
    const e = B().record(f); const p = e && isT8Record(e) && st.result?.pending ? pendingDecision(st.result) : null;
    if (p) { promptRotation(f, e, p); return; }
    finish(f);
  }
  /**
   * The rotation prompt (owner ruling D1, §25 item 1): at a legal rotation phase of the player's side in Watch mode: Stay in, bring in
   * a reserve, or "Auto for the rest of this battle" (the AI policy, D2, from here on; never asked again). The answer is recorded on the
   * battle record, so a reload or a replay continues identically; the arena then plays on from the prompt.
   */
  function promptRotation(f, e, p) {
    if (document.querySelector('.sheet [data-rot]')) return;
    const act = st.result.lines[p.side].find((x) => x.id === p.activeId); const foe = st.result.lines[p.side === 'a' ? 'b' : 'a'].find((x) => x.active);
    const stat = (x) => (x.status ? ` · ${T8_STATUS_ICON[x.status.id] || ''} ${T8_STATUS_NAME[x.status.id] || x.status.id} (${x.status.remaining})` : '');
    const edge = (x) => (foe ? (typeFactor(x.type, foe.type) > 1 ? ` <b class="edge strong">▲</b>` : typeFactor(foe.type, x.type) > 1 ? ` <b class="edge weak">▼</b>` : '') : '');
    const row = (x, label, rot) => `<button class="item" data-rot="${rot}" style="min-height:0;padding:8px"><div class="grow" style="min-width:0"><div><b>${esc(x.name)}</b>${edge(x)} <span class="dim">${ARCH_GLYPH[x.archetype] || ''} ${esc(x.archetype)} · ${esc(x.type)}</span></div><div class="dim" style="font-size:12px">HP ${x.hp}/${x.maxHp}${stat(x)}</div></div><span class="chip ${rot === 'stay' ? 'accent' : ''}">${label}</span></button>`;
    const html = `<p class="muted" style="margin:0 0 6px">${$t('clash.exchange_after_both_fighters_acted_you', { ex: p.ex })} ${foe ? `${$t('clash.their_active_b_b_hp', { name: esc(foe.name), type: esc(foe.type), hp: foe.hp, maxHp: foe.maxHp })}` : ''}</p>
      <div class="list">${act ? row(act, $t('clash.stay_in'), 'stay') : ''}${p.reserves.map((o) => row(st.result.lines[p.side].find((x) => x.id === o.id) || { ...o, status: o.status ? { id: o.status, remaining: '?' } : null }, $t('clash.bring_in'), o.id)).join('')}</div>
      <button class="btn block" data-rot="auto" style="margin-top:8px">${$t('clash.auto_for_the_rest_of_this')}</button><p class="dim" style="margin:4px 0 0">${$t('clash.auto_hands_your_rotations_to_the')}</p>`;
    const { el, close } = sheet(html, { title: $t('clash.rotation_your_call_2') });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-rot]'); if (!b) return; const choice = b.dataset.rot; close();
      const r = B().decide(f, p.ex, choice); if (!r.ok) { toast(r.reason, 'bad'); return; }
      app.save(); const from = st.arena ? st.arena.cursor : st.cursor; stop(); st.cursor = from; Router.render(); // the remount rebuilds the battle from the record and plays on from the prompt
    });
  }
  function finish(f) {
    const r = B().resolve(f); if (!r.ok) { if (r.pending?.kind === 'rotation') { promptRotation(f, B().record(f), r.pending); return; } toast(r.reason, 'bad'); return; }
    app.save(); stop(); st.cursor = 0; Router.render();
  }
  /** Each battler's XP: amount gained, a bar toward the next level, and any level-up. */
  function xpRows(e) {
    const rows = (e.events || []).filter((x) => x.kind === 'xp'); const lv = (e.events || []).filter((x) => x.kind === 'levelup');
    if (!rows.length) return `<div class="dim" style="margin-top:4px">${$t('clash.your_battlers_earned_experience')}${lv.length ? ` · <b>${esc(lv.map((x) => `${$t('clash.level', { name: x.name, level: x.level })}`).join(', '))}</b>` : ''}.</div>`;
    return `<div style="margin-top:8px;text-align:left">${rows.map((x) => `<div class="row between" style="font-size:13px;gap:8px;margin-top:4px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(x.name)}</b> <span class="mono" style="color:var(--good)">${x.max ? $t('clash.max') : `+${Math.round(x.amount * 10) / 10} XP`}${x.training ? ` ${$t('clash.training', { training: Math.round(x.training * 1000) / 10 })}` : ''}${x.masteryCredits ? ` ${$t('clash.clash_mastery', { masteryCredits: x.masteryCredits })}` : ''}${x.gradeAdj ? ` ${$t('clash.grade', { gradeAdj: x.gradeAdj > 0 ? '+' : '', n: Math.round(x.gradeAdj * 100) })}` : ''}</span>${x.bonus ? ` <span class="dim mono" title="${esc(x.bonusLabel || '')}">${$t('clash.basic_bonus', { base: x.base, bonus: x.bonus })}</span>` : ''}${x.levelsGained ? ` <span class="chip good">${$t('clash.level_2', { level: x.level })}</span>` : ''}</span><span class="dim mono" style="white-space:nowrap">Lv ${x.level} · ${x.xp}/${x.next}</span></div><div class="bar" style="margin:2px 0 0"><i style="width:${Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div>`).join('')}</div>`;
  }
  /** The outcome in one glance: who won and how, who is still standing on each side, knockouts by each side, then XP. */
  function resultHtml(f, e) {
    const r = e.result; const won = r?.winner === B().mySide; const mine = e.a || f.roster.filter((m) => e.mine.includes(m.id));
    const full = st.result || B().battle(f); const last = full ? stateAt(full, full.log.length - 1) : null;
    const standing = (side) => last ? last.order[side].filter((id) => !last.S[side][id].ko).length : null;
    const kos = (side) => full ? full.log.filter((x) => x.kind === 'ko' && x.target?.[0] === side).length : 0;
    const names = teamNames(f, e); const theirs = e.b || [];
    const headline = won ? (st.kind === 'pregame' ? $t('clash.you_won_the_clash') : st.kind === 'overtime' ? $t('clash.you_win_the_game') : 'VICTORY') : (st.kind === 'pregame' ? $t('clash.they_won_the_clash') : st.kind === 'overtime' ? $t('clash.they_win_the_game') : 'DEFEAT');
    const how = r.by === 'knockout' ? `${$t('clash.ran_out_of_monsters', { won: won ? names.b : names.a })}` : r.by === 'hp' ? $t('clash.more_health_left_after_30_exchanges') : $t('clash.a_coin_flip_after_an_exact');
    const roster = (list, side) => `<div class="cl-result-team"><div class="cl-strip-label ${side === 'a' ? 'mine' : ''}">${esc(names[side])}${last ? ` ${$t('clash.standing', { standing: standing(side) })}` : ''}</div><div class="row" style="gap:4px;flex-wrap:wrap">${list.map((m) => { const id = full?.lines[side].find((x) => x.combatant.monsterId === m.id)?.id; const ko = id && last ? last.S[side][id].ko : false; return `<span class="cl-result-mon ${ko ? 'ko' : ''}" title="${ko ? $t('clash.knocked_out_2', { name: esc(m.name) }) : esc(m.name)}">${monsterSprite(m, 30)}</span>`; }).join('')}</div></div>`;
    return `<div class="panel cl-result ${won ? 'won' : 'lost'}"><div class="cl-result-head">${headline}</div><div class="muted">${$t('clash.exchanges_knockouts', { how, exchanges: r.exchanges, kos: kos('b'), kos2: kos('a'), n: r.exchanges })}</div>
      <div class="cl-result-teams">${roster(mine, 'a')}${roster(theirs, 'b')}</div>
      ${xpRows(e)}
      <div class="row" style="justify-content:center;gap:6px;margin-top:8px"><button class="btn small ghost" data-action="replay">${$t('clash.watch_the_replay')}</button></div></div>
      ${B().resultHtml(f, e)}`;
  }

  Router.registerScreen('clash-battle', {
    title: ({ params }) => BINDINGS[params.kind || st.kind]?.title || $t('clash.beast_clash'), tabs: false,
    render({ f, params }) {
      // A different battle (kind or prospect) starts from its own proposed lineup, not the last battle's edits.
      const key = `${params.kind || st.kind}|${params.i ?? st.i}|${f?.season?.year}|${f?.season?.week}`; if (key !== st.key) { st.key = key; st.lineup = null; st.editing = false; }
      if (params.kind) st.kind = params.kind; if (params.i != null) st.i = Number(params.i);
      const b = B(); if (!b || !f) return `<p>${$t('clash.no_battle')}</p>`;
      const e = b.record(f);
      if (!e || e.status === 'ready' || e.status === 'skipped') return setupHtml(f);
      if (!f.week || (st.kind === 'pregame' && f.game) || (st.kind === 'overtime' && !f.game)) { setTimeout(() => Router.go(f.game ? 'match' : 'hq', {}, { reset: true }), 0); return `<p class="muted">${$t('clash.opening_the_game')}</p>`; }
      if (e.status === 'battle') { if (e.mode === 'skip' && !st.replaying) { setTimeout(() => finish(f), 0); return `<p class="muted">${$t('clash.playing_the_battle')}</p>`; } return battleHtml(f, e); }
      if (st.replaying) return `${battleHtml(f, e)}<button class="btn block" data-action="endreplay" style="margin-top:8px">${$t('clash.back_to_the_result')}</button>`;
      return resultHtml(f, e);
    },
    mount(root) {
      const f = app.f; const b = B(); if (!b || !f) return; const e = b.record(f);
      const rerender = () => Router.render();
      delegate(root, {
        back: () => Router.back(),
        help: () => sheet(HELP_HTML, { title: $t('clash.how_beast_clash_works') }),
        rotprompt: () => atEnd(f),
        edit: () => { st.editing = !st.editing; Router.render(); },
        autol: () => { st.lineup = null; st.editing = false; Router.render(); },
        add: (el) => { const id = el.dataset.id; const pv = b.preview(f, st.i); if (!st.lineup.includes(id) && st.lineup.length < pv.size) st.lineup.push(id); else if (st.lineup.length >= pv.size) toast(`${$t('clash.up_to_monsters', { size: pv.size })}`, 'info'); Router.render(); },
        remove: (el) => { st.lineup = st.lineup.filter((x) => x !== el.dataset.id); Router.render(); },
        moveup: (el) => { const i = Number(el.dataset.i); if (i > 0) { [st.lineup[i - 1], st.lineup[i]] = [st.lineup[i], st.lineup[i - 1]]; Router.render(); } },
        movedown: (el) => { const i = Number(el.dataset.i); if (i < st.lineup.length - 1) { [st.lineup[i + 1], st.lineup[i]] = [st.lineup[i], st.lineup[i + 1]]; Router.render(); } },
        enter: (el) => { const mode = normalizeMode(el.dataset.v) || 'watch'; const r = b.start(f, st.i, { lineup: st.lineup, mode }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); st.cursor = 0; st.editing = false; Router.render(); },
        skipenc: () => b.skip?.(f, Router),
        speed: (el) => { saveSettings({ speed: Number(el.dataset.v) }); st.arena?.setSpeed(Number(el.dataset.v)); Router.render(); },
        toresults: () => { stop(); if (st.replaying) { st.replaying = false; Router.render(); return; } finish(f); },
        replay: () => { st.replaying = true; st.cursor = 0; Router.render(); },
        endreplay: () => { stop(); st.replaying = false; st.cursor = 0; Router.render(); },
        ...b.actions(root, rerender),
      });
      root.classList.toggle('cl-wide', !!(e && (e.status === 'battle' || st.replaying)));
      if (e && e.status === 'battle' && e.mode !== 'skip') mountBattle(root, f, e);
      else if (e && st.replaying) { st.result = b.battle(f); const host = root.querySelector('#fb-arena'); if (host && st.result) { st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, names: teamNames(f, e), edge: typeEdge, simple: true, onCursor: (i) => { st.cursor = i; } }); setTimeout(() => st.arena?.play(), 300); } }
    },
    unmount() { stop(); st.replaying = false; },
  });
  return st;
}
