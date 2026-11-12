// Sunday: pregame lineups and the pregame Beast Clash for possession (GDD §26.2), then the live match screen.
// The screen only collects the human's choices; rules.js and game-runner.js
// do everything else, exactly as they do for the simulated league.

import { abilityInfo } from '../ability-info.js';
import { esc, delegate, toast, sheet, fmtClock, confirmSheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import * as R from '../../sim/rules.js';
import { momentSheet } from '../tutorial.js';
import { isExpert } from '../../franchise/assist.js';
import * as AI from '../../sim/coach-ai.js';
import { step, aiController, newTendencies } from '../../sim/game-runner.js';
import { rngFromState } from '../../core/rng.js';
import { PLAYS } from '../../data/playbook.js';
import { TRAINING_FOCI } from '../../data/staff.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { fieldSvg, fieldDraw, FIELD_VIEWBOX, presnapLook, cameraFor } from '../field-view.js';
import { playCardSvg } from '../play-art.js';
import { monsterSprite, portraitSprite } from '../pixel-monster.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { isBeastBowlTag } from '../../data/league.js';
import { beatenLines } from '../../data/dialogue.js';
import { TYPES, SPECIES_BY_ID, resolveSpecies } from '../../data/monsters.js';
const BADGE_LINES = ['Well played. Don’t get used to it.', 'You earned that one. Keep it polished for me.', 'I had you beaten on tape. Tape lies, apparently.', 'My monsters will remember this.', 'The league will hear about you now.', 'Fine. Take it. We’ll talk next season.', 'That was football. Respect.', 'Eight badges is a long road. You’re on it.'];
import { fieldGoalDistance, yardLabel } from '../../core/field.js';
import { teamOverall } from '../../franchise/roster.js';
import { boxScoreHtml } from '../box-score.js';
import { buildFx, shakeBetween, endHold } from '../ability-fx.js';
import { kickPlay, presnapFields, presnapFx, createRevealClock, abilityTicks, absentMonsters, dexAbilityName, createAbsenceTracker, servedVacancies, inspectInfo, lastPlayNotes, findMonster, conditionalNotes } from '../fx/match-fx.js';
import { fxOptionsFor, reducedFlash } from '../flash-pref.js';
import { matchupEdges } from '../../sim/type-matchups.js';
import { weatherClass } from '../stadium-art.js';
import { venueHtml } from '../stadium-preview.js';
import { replayReason, replayPlan, replayPosition, REPLAY } from '../replay.js';
import { qbReadPanelHtml, qbReadsShown } from '../qb-read-ui.js';
import { openMatchupPanel } from '../type-chart.js';
import { postGameHtml } from '../captains-ui.js';

/** Start Sunday's game from the settled pregame Clash (set by registerMatchScreens; the battle screen calls it). */
export let startSundayGame = null;

export function registerMatchScreens(Router, app) {
  // ------------------------------------------------------------ pregame
  Router.registerScreen('pregame', {
    title: 'Match Day', tabs: false,
    render({ f }) {
      const m = F.sundayMatchup(f); if (!m) return '<p>No game today.</p>';
      if (f.week.pregame && f.week.pregame.status !== 'ready' && !f.game) { setTimeout(() => Router.go('clash-battle', { kind: 'pregame' }, { replace: true }), 0); return '<p class="muted">Opening the pregame Clash…</p>'; }
      const mine = m[m.playerSide], theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
      const col = (team, label) => `<div class="panel tight"><div class="row"><b style="color:${team.color}">${esc(team.name)}</b><span class="chip">${label}</span></div><div class="muted" style="font-size:12px">OVR ${teamOverall(team)} · ${esc(team.offensePlays.length)} / ${esc(team.defensePlays.length)} plays</div>
        <h3 style="font-size:12px">Offense</h3>${OFFENSE_BASE.map((s) => line(s, team.offense[s], team)).join('')}
        <h3 style="font-size:12px">Defense</h3>${DEFENSE_BASE.map((s) => line(s, team.defense[s], team)).join('')}
        <h3 style="font-size:12px">Packages</h3>${[...OFFENSE_PACKAGE_SLOTS, ...DEFENSE_PACKAGE_SLOTS].map((s) => line(s, team.offense[s] || team.defense[s], team)).join('')}</div>`;
      function line(s, m, team) { const b = team?.boosts?.[m?.id]; const badges = b ? `${b.media ? `<span class="boost media" title="Media day: +${b.media.amount} ${b.media.attr}">+</span>` : ''}${b.training ? `<span class="boost train" title="Training: ${b.training.join(', ')}">T</span>` : ''}` : ''; return `<div class="slotline"><span class="mono">${s}</span><span class="row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap">${m ? monsterSprite(m, 18) : ''}${esc(m?.name || '·')}${badges}</span></div>`; }
      const rv = f.rivals[f.tier];
      const gym = GYM_BY_CLUB[m.opponent]; const held = gym && F.badgeOf(f, m.opponent);
      return `<div class="pregame">${m.rival ? `<div class="rival-banner">⚔️ RIVALRY GAME<div class="muted" style="font-weight:600;font-size:12px">GM ${esc(rv?.gm || '')} · all-time ${rv?.headToHead.w || 0}-${rv?.headToHead.l || 0}</div></div>` : m.playoff ? `<div class="rival-banner" style="border-color:#f5c542;background:linear-gradient(90deg,#4a3a0a,#2a2008)">🏆 ${esc(m.tag)}</div>` : ''}${gym ? `<div class="rival-banner" style="border-color:hsl(${TYPES[gym.element]?.hue ?? 120} 70% 55%);background:linear-gradient(90deg,hsl(${TYPES[gym.element]?.hue ?? 120} 40% 18%),hsl(${TYPES[gym.element]?.hue ?? 120} 30% 10%))">${held ? `🏅 ${esc(gym.badge).toUpperCase()} HELD` : `🏅 BADGE GAME · ${esc(gym.badge).toUpperCase()}`}<div class="muted" style="font-weight:600;font-size:12px">${esc(gym.coach.name)} · ${esc(gym.element)} gym${held ? '' : ' · win to earn it, no replays'}</div></div>` : ''}<div class="center" style="margin-bottom:8px"><div class="muted">${esc(m.tag)}</div><div style="font-size:18px;font-weight:900">${esc(m.away.name)} <span class="dim">@</span> ${esc(m.home.name)}</div></div>
        ${(() => { const rec = (t) => { const r = f.season.records[t]; return r ? `${r.w}-${r.l}` : ''; }; const side = (team, label) => `<div class="mu-club"><div class="mu-abbr" style="color:${team.color}">${esc(team.abbr)}</div><div class="mu-name">${esc(team.name)}</div><div class="dim mono">${esc(rec(team.name))} · OVR ${teamOverall(team)}</div><div class="chip">${label}</div></div>`;
          return `<div class="matchup-head ${m.playoff ? 'playoff' : ''}">${side(mine, m.playerSide === 'home' ? 'HOME' : 'AWAY')}<div class="mu-vs"><div class="mu-vs-word">VS</div><div class="dim" style="font-size:11px">${esc(m.tag || '')}</div></div>${side(theirs, m.playerSide === 'home' ? 'AWAY' : 'HOME')}</div>`; })()}
        ${(() => { const v = F.sundayVenue(f); if (!v) return ''; const n = (team) => v.type ? Object.values({ ...team.offense, ...team.defense }).filter((p, i, arr) => p?.type === v.type && arr.findIndex((q) => q?.id === p.id) === i).length : null; return venueHtml(v, { mine: n(mine), theirs: n(theirs) }); })()}
        ${talkHtml(f)}
        <div class="lineups">${col(mine, m.playerSide === 'home' ? 'HOME' : 'AWAY')}${col(theirs, m.playerSide === 'home' ? 'AWAY' : 'HOME')}</div>
        ${(() => { const nMedia = Object.values(mine.boosts || {}).filter((b) => b.media).length; const tr = f.week.trainingFocus; return nMedia || tr ? `<div class="panel tight" style="margin-top:8px"><b>Today's boosts</b><div class="muted" style="font-size:13px">${tr ? `<span class="boost train">T</span> Training (${esc(TRAINING_FOCI[tr]?.label || tr)}): +${f.week.training?.amount ?? ''} ${esc((TRAINING_FOCI[tr]?.attrs || []).join(', '))} for every starter` : ''}${tr && nMedia ? '<br>' : ''}${nMedia ? `<span class="boost media">+</span> Media day: ${nMedia} monster${nMedia === 1 ? '' : 's'} fired up` : ''}</div></div>` : ''; })()}
        <p class="dim" style="margin-top:8px">Coaching mode: <b>${f.settings.mode === 'key' ? 'Key Moments' : 'Full Coaching'}</b> (change in Settings).</p>
        <p class="dim">Possession is decided by a <b>3v3 Beast Clash</b> between the two rosters: the winner chooses to receive, defer or kick.</p>
        <button class="btn primary big block" data-action="toss">⚔️ Beast Clash for Possession →</button></div>`;
    },
    mount(root) {
      delegate(root, {
        reply: (el) => { const r = F.replyToCoach(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        toss: () => { const pv = F.pregamePreview(app.f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'pregame' }); },
      });
    },
  });

  /** Scheme lock, shown while it applies (GDD §17; comeback mode is retired, N8a: comebackSide is always null). */
  function edgeStrip(f, s, teams, me, returning = []) {
    const bits = [];
    const cb = R.comebackSide(s);
    if (cb) bits.push(`<span class="edge-chip comeback ${cb === me ? 'mine' : ''}">🔥 COMEBACK · ${esc(s[cb].abbr)} +${s.comeback.edge}</span>`);
    const lock = teams[me]?.schemeLock; if (lock?.offense) bits.push('<span class="edge-chip scheme mine">✦ SCHEME LOCK · offense</span>'); if (lock?.defense) bits.push('<span class="edge-chip scheme mine">✦ SCHEME LOCK · defense</span>');
    const them = R.opponent(me); const tl = teams[them]?.schemeLock; if (tl?.offense || tl?.defense) bits.push('<span class="edge-chip scheme">✦ Their scheme is locked</span>');
    // Task 8 (I5, Sovereign Arm): the swallowed defender's portrait with the dragon mouth while he is out (read from the game's absence list)
    for (const a of absentMonsters(s, teams)) bits.push(`<span class="edge-chip absent ${a.team === me ? 'mine' : ''}" title="Swallowed by Sovereign Arm"><span class="absent-face">${a.monster ? monsterSprite(a.monster, 18) : ''}<i aria-hidden="true">🐲</i></span> ${esc(a.monster?.name || 'A defender')} swallowed · out for ${esc(s[a.serveOn]?.abbr || 'the')} next offensive play</span>`);
    // ... and, on the play-call screen of the play he is back for, that he has returned (the field plays his return once: presnapT8)
    for (const b of returning) bits.push(`<span class="edge-chip absent returned ${b.team === me ? 'mine' : ''}" title="Back from Sovereign Arm"><span class="absent-face">${b.monster ? monsterSprite(b.monster, 18) : ''}</span> ${esc(b.monster?.name || 'The defender')} is back in the formation</span>`);
    return bits.length ? `<div class="edge-strip">${bits.join('')}</div>` : '';
  }
  startSundayGame = (f) => {
    F.ensureCaptains(f); // Captain Partnerships (GDD §27.4B): an initial selection still open is settled with the suggestion now
    const m = F.sundayMatchup(f); const toss = F.pregamePossession(f);
    const state = R.newGame({ home: m.home, away: m.away, venue: F.gameVenue(f, m.home.name, m.away.name), seed: rngFromState(f.rngState).seed(), quarterLength: f.settings.quarterLength, coinWinner: toss.coinWinner, choice: toss.choice, comeback: F.comebackRule(f), otPeriods: F.OT_PERIODS });
    f.rngState = rngFromState(f.rngState).state;
    f.game = { state, playerSide: m.playerSide, tendencies: { home: newTendencies(), away: newTendencies() }, selected: { offense: null, defense: null }, mode: f.settings.mode, lastEvent: null, simmed: [], event: m.rival ? 'rival' : m.playoff ? 'playoff' : null, tag: m.tag };
    app.save();
    Router.go('match', {}, { reset: true });
  };

  // ------------------------------------------------------------ live match
  let anim = null; // active animation {raf, frames, i, done}
  let playClockTimer = null;
  let autoTimer = null; // Auto mode: the coach's suggestions play themselves out, one play at a time
  const KEY_RESULTS = new Set(['touchdown', 'interception', 'fumble', 'touchback_return', 'safety']);
  /**
   * What just happened, in one word and one tier, so the field can show it with the right weight (2026-10-22 presentation
   * pass): a touchdown is bigger than a first down, a turnover is unmistakable, a sack lands, a routine gain just reports its yards.
   */
  function callout(ev, me) {
    if (!ev) return null; const r = ev.sim?.result || ev.outcome?.result || null; const yards = ev.outcome?.yards ?? ev.sim?.yards; const off = ev.offenseSide;
    const mineOff = off === me; const scoredFor = ev.scored?.team || (ev.scored ? off : null);
    if (r === 'touchdown' || (ev.kind === 'kickoff' && ev.scored)) return { tier: 'td', text: 'TOUCHDOWN!', mine: scoredFor ? scoredFor === me : mineOff };
    if (r === 'safety') return { tier: 'score', text: 'SAFETY', mine: !mineOff };
    if (r === 'interception' || r === 'touchback_return') return { tier: 'turnover', text: 'INTERCEPTED!', mine: !mineOff };
    if (r === 'fumble') return { tier: 'turnover', text: 'FUMBLE!', mine: !mineOff };
    if (ev.kind === 'field_goal') return ev.scored ? { tier: 'score', text: 'FIELD GOAL', mine: ev.kicking === me } : { tier: 'loss', text: 'NO GOOD', mine: ev.kicking !== me };
    if (ev.kind === 'try') return /good|GOOD|converts|two-point conversion is good/i.test(ev.text) ? { tier: 'score', text: /two/i.test(ev.text) ? 'TWO POINTS' : 'EXTRA POINT', mine: mineOff } : /no good|fails|stopped|missed/i.test(ev.text) ? { tier: 'loss', text: 'NO GOOD', mine: !mineOff } : null;
    if (r === 'sack') return { tier: 'sack', text: 'SACK', mine: !mineOff };
    if (r === 'incomplete' || r === 'throwaway') return { tier: 'routine', text: 'INCOMPLETE', mine: !mineOff };
    if (ev.kind === 'punt') return { tier: 'routine', text: 'PUNT', mine: null };
    if (ev.kind === 'kickoff') return { tier: 'routine', text: /touchback/i.test(ev.text) ? 'TOUCHBACK' : 'KICKOFF', mine: null };
    if (typeof yards === 'number' && ev.kind === 'play') {
      const toGo = ev.toGo ?? 10; const first = yards >= toGo;
      if (first) return { tier: 'first', text: yards >= 20 ? `BIG PLAY · +${yards}` : 'FIRST DOWN', mine: mineOff };
      if (yards >= 15) return { tier: 'big', text: `+${yards} YDS`, mine: mineOff };
      if (yards < 0) return { tier: 'loss', text: `${yards} YDS`, mine: !mineOff };
      return { tier: 'routine', text: yards === 0 ? 'NO GAIN' : `+${yards} YDS`, mine: mineOff };
    }
    return null;
  }

  Router.registerScreen('match', {
    title: ({ f }) => f?.game ? `${f.game.state.away.abbr} ${f.game.state.score.away}-${f.game.state.score.home} ${f.game.state.home.abbr}` : 'Match', back: false, tabs: false, help: false, // the ⓘ button is this screen's help (it links to Coach Assist)
    topRight: () => `<button class="btn ghost small" data-action="box" aria-label="Box score">📊</button><button class="btn ghost small" data-action="log" aria-label="Play log">📋</button><button class="btn ghost small" data-action="help" aria-label="How a match works">ⓘ</button>`,
    render({ f }) {
      const G = f.game; if (!G) return `<div class="panel"><p>No game in progress.</p><button class="btn block" data-action="hq">Headquarters</button></div>`;
      const P = screenParts(f);
      // Three in-place regions (refresh(): a play's start and end update them without rebuilding the screen): the head, the field
      // with what lies over it, the panels under the field; then the controls. display:contents wrappers add no box of their own.
      return `<div id="match-head" style="display:contents">${P.head}</div>
        <div class="${P.wrapClass}" id="fieldwrap" aria-label="Football field"><svg id="field" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img">${fieldSvg(P.field)}</svg>${P.over}</div><div id="field-after" style="display:contents">${P.after}</div>
        <div id="controls">${P.controls}</div>`;
    },
    mount(root, ctx) {
      const f = app.f; if (!f?.game) { delegate(root, { hq: () => Router.go('hq', {}, { reset: true }) }); return; }
      afterRender(f, root);
      delegate(root, {
        hq: () => Router.go('hq', {}, { reset: true }),
        log: () => showLog(f),
        pick: (el) => { const G = f.game; G.selected[el.dataset.side] = el.dataset.id; app.save(); refresh(f); },
        snap: () => act(f, {}),
        go: () => act(f, { fourthDown: 'go' }),
        punt: () => act(f, { fourthDown: 'punt' }),
        fg: () => act(f, { fourthDown: 'fg' }),
        fgsig: () => act(f, { fourthDown: 'fg', fgSignature: true }), // Task 8 M3: a player-activated field-goal signature (Dragon Roar)
        kickoff: () => act(f, { kickoff: 'normal' }),
        onside: () => act(f, { kickoff: 'onside' }),
        trykick: () => act(f, { tryChoice: 'kick' }),
        trytwo: () => { const G = f.game; if (!G.selected.offense) { toast('Pick a play for the two-point try.'); return; } act(f, { tryChoice: 'two' }); },
        continue: () => act(f, {}),
        timeout: () => { const G = f.game; if (R.timeout(G.state, G.playerSide)) { G.lastEvent = { text: `Timeout, ${G.state[G.playerSide].name}.` }; app.save(); Router.render(); } else toast('No timeouts left.'); },
        tempo: (el) => { f.game.tempo = el.value; app.save(); },
        mode: () => { const G = f.game; G.mode = G.mode === 'key' ? 'full' : 'key'; app.save(); Router.render(); },
        auto: () => { const G = f.game; G.auto = !G.auto; app.save(); if (!G.auto) { clearTimeout(autoTimer); autoTimer = null; } Router.render(); },
        autospeed: () => { const G = f.game; G.autoSpeed = (G.autoSpeed || 1) === 2 ? 1 : 2; app.save(); Router.render(); },
        keymoment: () => simToKeyMoment(f),
        simfinal: async () => { if (!(await confirmSheet('Let the coach play the rest of the game out instantly? You will see the final score and box score; no replays.', { title: 'Sim to Final', okLabel: 'Sim It' }))) return; simToFinal(f); },
        skip: () => { if (anim) finishAnim(f, true); },
        replay: () => { if (!anim && lastReplay && lastReplay.gameKey === f.game?.state.seed) startReplay(f, lastReplay); },
        finish: () => finishGame(f),
        otclash: () => { const pv = F.overtimePreview(f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'overtime' }); },
        boxscore: () => sheet(boxScoreHtml(f.game.state, teamsFor(f), { title: `${R.quarterText(f.game.state)} ${fmtClock(f.game.state.clock)}` }), { title: 'Box Score' }),
        kneel: () => { R.kneel(f.game.state); afterStep(f, { kind: 'kneel', text: f.game.state.lastPlay.text }); },
        spike: () => { R.spike(f.game.state); afterStep(f, { kind: 'spike', text: f.game.state.lastPlay.text }); },
      });
      root.querySelector('#fieldwrap')?.addEventListener('click', (e) => {
        // A type icon opens its matchup panel and nothing else: no skip, no selection, no snap.
        const icon = e.target.closest?.('.tm-icon'); if (icon) { e.stopPropagation(); e.preventDefault(); openTypeIcon(icon); return; }
        if (anim) { finishAnim(f, true); return; }
        // Task 8 (I4): inspect a monster: an entry of the last play's ability strip, or a monster standing in the formation
        const chip = e.target.closest?.('[data-inspect]'); if (chip) { e.stopPropagation(); e.preventDefault(); openInspect(app.f, chip.dataset.inspect); return; }
        const pl = e.target.closest?.('#field .fv-pl > g'); const who = pl ? inspectMap?.[Array.prototype.indexOf.call(pl.parentNode.children, pl)] : null; if (who?.mid) openInspect(app.f, who.mid);
      });
      root.querySelector('#fieldwrap')?.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const icon = e.target.closest?.('.tm-icon'); if (icon) { e.preventDefault(); e.stopPropagation(); openTypeIcon(icon); return; }
        const chip = !anim && e.target.closest?.('[data-inspect]'); if (chip) { e.preventDefault(); e.stopPropagation(); openInspect(app.f, chip.dataset.inspect); } });
      document.querySelector('.topbar [data-action="log"]')?.addEventListener('click', () => showLog(f));
      document.querySelector('.topbar [data-action="help"]')?.addEventListener('click', () => sheet(`${matchHelpHtml(f)}<button class="btn small" data-action="assist-help" data-screen="match" style="margin-top:8px">? More Help (Coach Assist)</button>`, { title: 'How a Match Works' }));
      momentSheets(f);
      document.querySelector('.topbar [data-action="box"]')?.addEventListener('click', () => sheet(boxScoreHtml(f.game.state, teamsFor(f), { title: f.game.state.finished ? 'Final' : `${R.quarterText(f.game.state)} ${fmtClock(f.game.state.clock)}` }), { title: 'Box Score' }));
    },
    unmount() { settleSave(); clearTimeout(replayTimer); replayTimer = null; stopAnim(); clearInterval(playClockTimer); playClockTimer = null; clearTimeout(autoTimer); autoTimer = null; },
  });

  /** Everything the match screen shows, as the strings render() and refresh() place: title, head, field options, overlays, panels, controls. */
  function screenParts(f) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    const myBall = s.possession === me;
    const teams = teamsFor(f);
    absenceTrack.observe(s.seed, s, teams, G.fxAbsence); // presentation-only save data, outside the simulation state
    const look0 = presnapInfo(f, teams);
    const pre8 = presnapT8(f, teams, look0); // Task 8 (I2, I5): fields visible before the snap; a swallowed defender's empty spot and his return
    G.fxAbsence = absenceTrack.snapshot(); // saved with the match; no RNG, rewards or ability state is changed
    // I5: the formation is drawn without the defender who sits this snap out (his alignment stays known, for the mark on his empty spot)
    const look = pre8?.vacant?.length && look0.presnap ? { ...look0, presnap: withoutSlots(look0.presnap, pre8.vacant) } : look0;
    const offenseTeamSide = s.possession;
    const offColor = s[offenseTeamSide].color, defColor = s[R.opponent(offenseTeamSide)].color;
    const field = anim
      ? { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), frame: anim.frames[anim.i], ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, event: G.event, noLines: anim.follow, sprites: spritesFor(f, anim.ev.offenseSide), ...(anim.fx && !anim.replay ? { fields: anim.ev.sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), prevFrame: anim.frames[anim.i - 1] || null, ...(anim.pre && anim.i === 0 && !anim.key ? { time: -anim.pre } : {}) } : {}) }
      : { venue: G.state.venue, ballOn: s.ballOn, ballLat: s.ballLat, toGo: s.toGo, colors: { off: offColor, def: defColor }, frame: null, presnap: look.presnap, typeIcons: typeIconsFor(f, teams, look), ownLabel: s[s.possession].abbr, oppLabel: s[R.opponent(s.possession)].abbr, event: G.event, sprites: spritesFor(f, s.possession), ...(pre8 ? { fields: pre8.fields.length ? pre8.fields : null, fx: pre8.fx, time: pre8.time, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings) } : {}) };
    if (presnapNow) presnapNow.field = field;
    // Task 8 (I4): who stands where in the drawn formation (the players' paint order: defense, then offense), for the inspect sheet
    inspectMap = null; inspectForm = null;
    if (!anim && field.presnap && s.phase === 'scrimmage' && !s.finished) {
      const dS = R.opponent(s.possession); const row = (side, unit, play, team) => { if (!play?.onField) return []; const sl = R.pickSlots(teams[side][unit], play.onField, teams[side], play); return play.onField.map((slot) => ({ team, slot, mid: sl[slot]?.id || null })); };
      inspectMap = [...row(dS, 'defense', field.presnap.defensePlay, 'def'), ...row(s.possession, 'offense', field.presnap.offensePlay, 'off')];
      inspectForm = { defSide: dS, defensePlay: look0.presnap.defensePlay, exact: dS === me && !!look0.myPlay, vacant: pre8?.vacant || [] };
    }
    const sit = s.finished ? 'FINAL' : s.phase === 'scrimmage' ? `${s[s.possession].abbr} ${R.situationText(s).replace('OWN', 'own').replace('OPP', 'opp')}` : s.phase === 'try' ? 'Try' : s.phase === 'kickoff' ? 'Kickoff' : s.phase === 'free_kick' ? 'Free kick' : '';
    const ab = G.lastEvent?.abilities?.length ? `<div class="ability-strip">${G.lastEvent.abilities.slice(0, 3).map((x) => `<span class="${x.team === me ? 'mine' : ''} ${x.trait ? 'trait' : ''}"${x.mid ? ` role="button" tabindex="0" data-inspect="${esc(x.mid)}" aria-label="Inspect ${esc(x.who)}"` : ''}>${x.trait ? '·' : '⚡'} ${esc(x.who)} · ${esc(x.what)}${x.tick ? ` <i class="ability-tick">✓ ${esc(x.tick)}</i>` : ''}</span>`).join('')}</div>` : '';
    const co = G.lastEvent?.callout; const fresh = !!G.lastEvent?.fresh; if (G.lastEvent) G.lastEvent.fresh = false; // the pop plays once, not on every re-render
    const banner = G.lastEvent ? `<div class="field-banner ${G.lastEvent.important ? 'important' : ''} ${co ? `tier-${co.tier} ${co.mine === true ? 'mine' : co.mine === false ? 'theirs' : ''}` : ''} ${fresh ? 'fresh' : ''}" id="banner">${co && co.tier !== 'routine' ? `<div class="callout">${esc(co.text)}</div>` : co ? `<span class="callout small">${esc(co.text)}</span> ` : ''}${esc(G.lastEvent.text)}${ab}</div>` : '';
    const tdFlash = reducedFlash(f.settings) ? '' : fresh && co?.tier === 'td' ? ` td-flash ${co.mine ? 'mine' : 'theirs'}` : fresh && co?.tier === 'turnover' ? ' to-flash' : '';
    const bump = (side) => (G.scoreSeen?.[side] != null && G.scoreSeen[side] !== s.score[side]) ? 'bump' : ''; const bumpA = bump('away'), bumpH = bump('home'); G.scoreSeen = { ...s.score };
    const eventBanner = G.event === 'rival' ? `<div class="rival-banner compact">⚔️ RIVALRY GAME · ${esc(s[them].name)} · GM ${esc(f.rivals[f.tier]?.gm || '')}</div>` : G.event === 'playoff' ? `<div class="rival-banner compact" style="border-color:#f5c542;background:linear-gradient(90deg,#4a3a0a,#2a2008)">🏆 PLAYOFFS · ${esc(G.tag || 'Win or go home')}</div>` : '';
    const head = `${eventBanner}
        <div class="scoreboard" aria-live="polite">
          <div class="team"><span class="pos" style="visibility:${s.possession === 'away' && !s.finished ? 'visible' : 'hidden'}"></span><span class="abbr"><span style="color:${s.away.color}">${esc(s.away.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.away)}${'○'.repeat(3 - s.timeouts.away)}</span></span><span class="score ${bumpA}">${s.score.away}</span></div>
          <div class="mid"><b>${s.finished ? 'FINAL' : R.quarterText(s)} ${s.ot ? '' : fmtClock(s.clock)}</b>${esc(sit)}${clockStateHtml(s, G, myBall)}</div>
          <div class="team right"><span class="score ${bumpH}">${s.score.home}</span><span class="abbr"><span style="color:${s.home.color}">${esc(s.home.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.home)}${'○'.repeat(3 - s.timeouts.home)}</span></span><span class="pos" style="visibility:${s.possession === 'home' && !s.finished ? 'visible' : 'hidden'}"></span></div>
        </div>
        <div class="situation"><span>${s.phase === 'scrimmage' && !s.finished ? `<b>${myBall ? 'YOUR BALL' : 'YOUR DEFENSE'}</b> · ${esc(spotFor(s.ballOn, myBall))}` : esc(sit)}</span><span>${me === 'home' ? 'Home' : 'Away'}${G.mode === 'key' ? ' · Key Moments' : ''}</span></div>
        ${edgeStrip(f, s, teams, me, pre8?.returning || [])}`;
    const wrapClass = `field-wrap${tdFlash}${venueClass(s.venue)}${anim?.replay ? ' replaying' : ''}`;
    const over = `${weatherLayer(f, s.venue)}${anim?.replay ? `<div class="replay-badge" role="status"><span class="rec">●</span> INSTANT REPLAY <b>${esc(anim.replay.reason.label)}</b></div><div class="replay-slow" aria-hidden="true">SLOW-MO</div>` : banner}`;
    // N9c: a field the snap creates only if its creator is in the play (Runway, Bloom Break, Crosswind Rescue) is marked as conditional
    const warning = !anim ? (s.t8?.preChoice?.foresight || []).map((m) => `<div class="t8-conditional" role="note">Foresight: ${esc(findMonster(teams, m.targetMid)?.monster?.name || m.targetSlot)} is marked. Blitzing risks Confused this play.</div>`).join('') + (s.t8?.preChoice?.prism || []).map(() => '<div class="t8-conditional" role="note">Prism Break shattered an existing enemy zone before play selection.</div>').join('') : '';
    const cond = !anim && pre8?.notes?.length ? `<div class="t8-conditional" role="note">${pre8.notes.map((n) => `<span class="${n.shown ? '' : 'held'}" data-ability="${esc(n.ability)}">◇ <b>${esc(n.name)}</b> ${n.shown ? `is created at the snap only if ${esc(n.creator)} is on the field for the play` : `is not created: ${esc(n.creator)} is not on the field in this play (it stays ready)`}</span>`).join('')}</div>` : '';
    const after = `${cond}${warning}${anim?.replay && anim.ev?.sim?.qb && qbReadsShown(f.settings) ? qbReadPanelHtml(anim.ev.sim, (slot, side) => `${(side === 'def' ? anim.ev.sim.names?.def : anim.ev.sim.names?.off)?.[slot] || slot} (${slot})`, { title: 'QB Reads on This Play' }) : ''}${!anim && presnapEdges.length ? '<div class="tm-legend"><span><b class="up">▲</b> type advantage</span><span><b class="down">▼</b> disadvantage</span><span>tap an icon</span><span>tap a monster to inspect</span></div>' : !anim && inspectMap ? '<div class="tm-legend"><span>Tap a monster to inspect: stamina, status, ability</span></div>' : ''}`;
    const title = `${s.away.abbr} ${s.score.away}-${s.score.home} ${s.home.abbr}`;
    return { title, head, wrapClass, field, over, after, controls: controlsHtml(f, teams, look) };
  }
  /** What mount() does after the markup is in place; refresh() repeats it (the play clock restarts, Auto is rescheduled, the halftime sheet opens). */
  function afterRender(f, root) {
    { const G = f.game, st = G.state; if (!anim && !st.finished && st.quarter >= 3 && !G.halftimeShown) { G.halftimeShown = true; app.save(); sheet(boxScoreHtml(st, teamsFor(f), { title: 'Halftime' }), { title: 'Halftime' }); } }
    startPlayClock(f, root);
    runPresnapReveal(f);
    scheduleAuto(f);
  }
  function momentSheets(f) {
    { const s1 = f.game?.state; if (s1?.finished && s1.needsTiebreak && !s1.winner && !document.querySelector('.sheet')) momentSheet(f, 'overtime', () => app.save()); } // Coach Assist: what the overtime Clash is, once
    { const s0 = f.game?.state; if (s0 && !s0.finished && s0.phase === 'scrimmage' && R.inTwoMinute(s0) && !document.querySelector('.sheet')) momentSheet(f, 'clock', () => app.save()); }
  }
  /**
   * Update the match screen in place (docs/task8/RENDER_OPT.md: no whole-screen re-render at a play's start and end). The same
   * strings render() would produce go into the existing regions: the title, the head, the field (fieldDraw keeps the sprite
   * symbols and the static layer), what lies over the field, the panels under it, the controls. Event delegation on the screen
   * root and the field wrap's own listeners stay as mounted. When the screen is not the mounted match screen, the full render runs.
   */
  function refresh(f) {
    const root = document.querySelector('#screen'); const wrap = root?.querySelector('#fieldwrap'); const svg = wrap?.querySelector('#field');
    const head = root?.querySelector('#match-head'), after = root?.querySelector('#field-after'), controls = root?.querySelector('#controls');
    if (Router.currentScreen()?.name !== 'match' || !f?.game || !svg || !head || !after || !controls) { Router.render(); return; }
    const P = screenParts(f);
    const h1 = document.querySelector('.topbar .title'); if (h1) h1.textContent = P.title;
    const put = (el, html) => { if (el.__html !== html) { el.innerHTML = html; el.__html = html; } }; // unchanged regions are not rebuilt
    put(head, P.head);
    wrap.className = P.wrapClass;
    fieldDraw(svg, P.field);
    while (svg.nextSibling) svg.nextSibling.remove();
    svg.insertAdjacentHTML('afterend', P.over);
    put(after, P.after);
    if (f.settings.liveClock) { controls.innerHTML = P.controls; controls.__html = null; } else put(controls, P.controls); // the live play clock's digits are reset by a rebuild
    afterRender(f, root);
    momentSheets(f);
  }

  // ------------------------------------------------------------ the end-of-play save (docs/task8/RENDER_OPT.md)
  // finishAnim requests the save as before (app.save(): stamped now, queued in the store, 1.2 s debounce in the game). What changed is when
  // its main-thread work runs: (1) as soon as the browser is idle after the end-of-play screen update (requestIdleCallback, hard
  // deadline 300 ms, before the debounce would fire), (2) at the latest synchronously at the next snap, replay or screen exit,
  // before the simulation and before any animation frame. The store snapshots the franchise synchronously when the write starts
  // and encodes it in a worker (store.js encodeParts), so what remains on the main thread is the snapshot and the IndexedDB commit.
  // A save that is already being written is left to finish (its commit is asynchronous and small). Page hide/unload keeps the
  // store's own guarantee (main.js leaving(): immediate save + synchronous journal of anything still queued or in flight).
  let idleSave = null;
  function settleSave() {
    if (idleSave) { (globalThis.cancelIdleCallback || clearTimeout)(idleSave); idleSave = null; }
    const st = app.storage?.store; if (st?.busy?.()) st.flush?.();
  }
  function saveWhenIdle() {
    if (idleSave) return;
    const run = () => { idleSave = null; if (!anim) settleSave(); };
    idleSave = globalThis.requestIdleCallback ? requestIdleCallback(run, { timeout: 300 }) : setTimeout(run, 0);
  }

  // ------------------------------------------------------------ stadium (GDD §33)
  /** The weather layer over the field: CSS only (no redraw per frame), off with reduced motion; indoors never. */
  function weatherLayer(f, venue) { const c = weatherClass(venue); return c && !f.settings.reducedMotion ? `<div class="weather ${c}" aria-hidden="true"></div>` : ''; }
  function venueClass(venue) { return venue?.env ? ` env-${venue.env}` : ''; }

  // ------------------------------------------------------------ type matchups (GDD §32.3–32.4)
  // Before the snap: the expected matchups from the player's own call and the other side's visible alignment (never
  // the AI's actual call). Icons are drawn for the player's monsters only. The engine never reads these: during the
  // play every contest uses the opponent really in it.
  let presnapEdges = []; let presnapMe = 'off';
  function typeIconsFor(f, teams, look) {
    presnapEdges = []; const G = f.game; const s = G.state; const p = look?.presnap;
    if (!p || anim || f.settings.typeIcons === false || s.phase !== 'scrimmage' || s.finished) return null;
    const me = G.playerSide; const offSide = s.possession, defSide = R.opponent(offSide);
    presnapMe = offSide === me ? 'off' : 'def';
    const offense = R.pickSlots(teams[offSide].offense, p.offensePlay.onField, teams[offSide], p.offensePlay);
    const defense = R.pickSlots(teams[defSide].defense, p.defensePlay.onField, teams[defSide], p.defensePlay);
    presnapEdges = matchupEdges({ offensePlay: p.offensePlay, defensePlay: p.defensePlay }, offense, defense).filter((x) => x[presnapMe].mod);
    const icons = { off: {}, def: {} };
    for (const x of presnapEdges) icons[presnapMe][x[presnapMe].slot] = x[presnapMe].mod > 0 ? 'up' : 'down';
    return icons;
  }
  function openTypeIcon(icon) {
    const [team, slot] = (icon.dataset.tm || '').split(':'); const x = presnapEdges.find((m) => m[team]?.slot === slot); if (x) openMatchupPanel(x, team);
  }

  // ------------------------------------------------------------ helpers
  /** Ball spot from the player's point of view. */
  function spotFor(ballOn, myBall) {
    if (myBall) return yardLabel(ballOn);
    if (ballOn === 50) return 'MIDFIELD';
    return ballOn < 50 ? `THEIR ${ballOn}` : `YOUR ${100 - ballOn}`;
  }
  function teamsFor(f) { const m = F.sundayMatchup(f); return { home: m.home, away: m.away }; }

  /** The AI's call for the current situation is fixed once per situation so the pre-snap look matches the snap. */
  function aiCall(f, teams, side) {
    const G = f.game; const s = G.state;
    const key = [s.quarter, s.clock, s.down, s.ballOn, s.possession, s.phase, s.playCount].join('|');
    if (G.aiCall?.key === key) return G.aiCall;
    const rng = rngFromState(s.rngState ^ 0x5bd1e995);
    const team = teams[side];
    const call = s.possession === side
      ? { key, side, offense: AI.chooseOffensePlay(rng, s, team, team.offensePlays, G.tendencies[side], teams[R.opponent(side)]) }
      : { key, side, defense: AI.chooseDefensePlay(rng, s, team, team.defensePlays, G.tendencies[s.possession], teams[R.opponent(side)], G.tendencies[side]) };
    G.aiCall = call;
    return call;
  }
  function presnapInfo(f, teams) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    if (s.phase !== 'scrimmage' || s.finished) return { presnap: null };
    const previousChoice = s.t8?.preChoice;
    const preChoice = anim ? null : R.preparePreChoice(s, teams);
    if (preChoice && preChoice !== previousChoice && (preChoice.foresight.length || preChoice.prism.length)) app.save();
    const ai = aiCall(f, teams, them);
    if (s.possession === me) {
      const mine = G.selected.offense && teams[me].offensePlays.includes(G.selected.offense) ? G.selected.offense : null;
      const defLook = presnapLook(preChoice?.defense || ai.defense);
      return { presnap: { play: mine ? PLAYS[mine] : null, offensePlay: mine ? PLAYS[mine] : presnapLook(teams[me].offensePlays[0]), defensePlay: defLook }, aiDefense: ai.defense, myPlay: mine };
    }
    const mine = G.selected.defense && teams[me].defensePlays.includes(G.selected.defense) ? G.selected.defense : null;
    const offLook = presnapLook(preChoice?.offense || ai.offense);
    return { presnap: { play: mine ? PLAYS[mine] : null, offensePlay: offLook, defensePlay: mine ? PLAYS[mine] : presnapLook(teams[me].defensePlays[0]) }, aiOffense: ai.offense, myPlay: mine };
  }

  // ------------------------------------------------------------ auto mode
  /** With Auto on, after each render take the next action the coach would: suggested play, the coach's fourth-down and try calls. */
  function scheduleAuto(f) {
    clearTimeout(autoTimer); autoTimer = null;
    const G = f.game; if (!G?.auto || !G.state || G.state.finished || anim) return;
    autoTimer = setTimeout(() => {
      autoTimer = null; const G2 = app.f?.game; if (!G2?.auto || G2.state.finished || anim) return;
      if (document.querySelector('.sheet')) { scheduleAuto(app.f); return; } // a halftime or tutorial sheet is open: wait
      if (replayTimer) { scheduleAuto(app.f); return; } // an instant replay is about to start: Auto waits for it
      autoStep(app.f);
    }, (G.autoSpeed || 1) === 2 ? 300 : 700);
  }
  function autoStep(f) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me); const teams = teamsFor(f);
    if (G.lastEvent?.needsContinue) return act(f, {});
    if (s.phase === 'kickoff' || s.phase === 'free_kick') return act(f, s.kickingTeam === me ? { kickoff: 'normal' } : {});
    if (s.phase === 'try') {
      if (s.tryTeam !== me) return act(f, {});
      if (AI.tryDecision(s) === 'two') { const plays = teams[me].offensePlays.filter((id) => PLAYS[id].tags.some((t) => ['short', 'goalline', 'redzone', 'quick'].includes(t))); G.selected.offense = plays[0] || teams[me].offensePlays[0]; return act(f, { tryChoice: 'two' }); }
      return act(f, { tryChoice: 'kick' });
    }
    if (s.phase !== 'scrimmage') return act(f, {});
    const myBall = s.possession === me; const side = myBall ? 'offense' : 'defense';
    const plan = teams[me][myBall ? 'offensePlays' : 'defensePlays'];
    G.selected[side] = AI.suggestPlay(s, teams[me], plan, side, G.tendencies[myBall ? me : them], teams[them], G.tendencies[me]) || plan[0];
    if (myBall && s.down === 4) { const dec = AI.fourthDownDecision(s, teams[me]); return act(f, dec === 'punt' ? { fourthDown: 'punt' } : dec === 'fg' ? { fourthDown: 'fg' } : {}); }
    if (myBall && AI.shouldKneel(s)) { R.kneel(s); return afterStep(f, { kind: 'kneel', text: s.lastPlay.text }); }
    return act(f, {});
  }

  /** The clock line under the score (GDD §20.4): is time going to come off at the next snap, and how much. */
  function clockStateHtml(s, G, myBall) {
    if (s.finished || s.ot || s.phase !== 'scrimmage') return '';
    if (!s.clockRunning) return '<div class="clockstate stopped">⏸ STOPPED · snap costs 0 s</div>';
    const tempo = myBall ? (G.tempo || 'normal') : null; const cost = tempo ? R.RUNOFF[tempo] : null;
    const unstoppable = s.timeouts[myBall ? R.opponent(s.possession) : s.possession] === 0 && s.clock <= R.RUNOFF.milk;
    return `<div class="clockstate running">▶ RUNNING · ${cost != null ? `−${cost} s at snap` : 'time off at snap'}${unstoppable ? ' · can’t be stopped' : ''}</div>`;
  }
  /** The ⓘ sheet: every control on the match screen, in plain words. */
  function matchHelpHtml(f) {
    return `<h3>Downs</h3><p>Four tries to gain 10 yards. Make it and you get four more; reach the end zone for a touchdown (6, plus a 1-point kick). On fourth down you usually punt or kick a field goal (3).</p>
      <h3>The clock</h3><p>The clock does not tick on its own: each play uses a few seconds, and if the last play ended with the clock <b>running</b> (tackled in bounds, no score), the time between plays comes off <b>when you snap</b>: ${R.RUNOFF.normal} s at normal tempo, ${R.RUNOFF.hurry} s in hurry-up, ${R.RUNOFF.milk} s milking it. The line under the score tells you which. An incompletion, a run out of bounds, a score or a timeout stops it: the next snap then costs nothing.</p>
      <h3>Timeout · Spike · Kneel · Tempo</h3><p><b>Timeout</b> (three a half) stops the clock so your next snap costs no time, on defense it is how you get the ball back from a team running the clock out. <b>Hurry-up</b> tempo cuts the runoff to ${R.RUNOFF.hurry} s for free; <b>milk clock</b> raises it to ${R.RUNOFF.milk} s when you are protecting a lead. <b>Spike</b> stops the clock for the price of a down (appears under a minute); <b>kneel</b> burns time when you are ahead, if the other side has no timeouts and less than ${R.RUNOFF.milk} s is left, the clock runs out and the game is over.</p>
      <h3>Calling plays</h3><p>Pick one of the six cards you set on Friday and press Snap; on defense pick a defense. ★ is the coach's suggestion; ✦ counters what you learned scouting; a grayed card needs a package you cannot field. <b>FG</b> kicks on any down when the kick is makeable.</p>
      <h3>Key Moments · Full Coaching · Auto · Sim</h3><p><b>Key Moments</b> simulates the routine downs and stops for the big ones; <b>Full Coaching</b> lets you call every snap. <b>Auto</b> calls the coach's plays for you (1× or 2×) until you stop it. <b>Sim to key moment</b> jumps ahead; <b>Sim to final</b> ends the game at once.</p>
      <h3>Edges</h3><p>${F.comebackRule(f) ? `<b>Comeback mode:</b> down ${F.COMEBACK.margin}+ in the fourth, either side plays with +${F.COMEBACK.edge}. ` : ''}<b>Scheme lock:</b> all starters on a side fitting the coordinator's scheme play with +${F.SCHEME_LOCK_EDGE}. Training (T) and media day (+) lifts show on the pregame lineup. Abilities fire on the strip under the field. <b>Inspect:</b> before the snap, tap a monster in the formation (or an entry of the ability strip) for its stamina, status and ability, and what is protecting it.</p>
      <h3>Type matchups</h3><p>Before the snap, a green <b>▲</b> or amber <b>▼</b> beside one of your monsters means a type advantage or disadvantage against the monster he is expected to face. Tap it to see the matchup. In the play, the edge (+4% or −4% on his side of a block, tackle, sack, separation or contested catch; Dragon +2% against neutral types) counts only against the monster he really meets. It never changes ratings. The Type Chart is under More and on every monster card.</p>`;
  }
  function controlsHtml(f, teams, look) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    // While a play animates in Auto, keep the Auto controls on screen so it can be stopped at any moment (no Skip: Auto is already watching the game for you).
    if (anim && G.auto) return `<div class="match-actions"><div class="secondary"><button class="btn primary big" data-action="auto" style="flex:2">Auto ■ Stop</button><button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed" title="Auto speed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button></div><p class="dim center" style="margin:4px 0 0">Auto is calling the coach's plays. Stop and you take over on the next snap.</p>${anim.replay ? '<button class="btn block" data-action="skip" style="margin-top:6px">Skip Replay ▸▸</button>' : ''}</div>`;
    if (anim) return `<div class="match-actions"><button class="btn block ${anim.replay ? 'primary' : ''}" data-action="skip">${anim.replay ? 'Skip Replay ▸▸' : 'Skip ▸▸'}</button></div>`;
    // Auto stays stoppable in every phase it plays through (continues, kickoffs, tries), not only at the snap.
    const autoBar = G.auto && !s.finished ? `<div class="secondary" style="margin-bottom:6px"><button class="btn primary" data-action="auto" style="flex:2">Auto ■ Stop</button><button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button></div>` : '';
    // 📼 the last big play again (GDD §34.4): offered between plays, on kickoffs and tries too (right after a touchdown).
    const rpRow = lastReplay && lastReplay.gameKey === s.seed && !s.finished && s.phase !== 'scrimmage' ? `<div class="secondary" style="margin-bottom:6px"><button class="btn small" data-action="replay">📼 Replay: ${esc(lastReplay.reason.label.toLowerCase())}</button></div>` : '';
    if (s.finished && s.needsTiebreak && !s.winner) { const n = F.inPlayoffs(f) ? 5 : 3; return `<div class="match-actions"><div class="panel center"><h2>STILL TIED</h2><div class="muted">${esc(s.away.name)} ${s.score.away}-${s.score.home} ${esc(s.home.name)} after overtime</div><p class="muted" style="margin:6px 0 0">A <b>${n}v${n} Beast Clash</b> decides the game. The football score stays as it is; the Clash winner takes the win.</p></div><button class="btn primary big block" data-action="otclash">⚔️ Overtime Beast Clash →</button></div>`; }
    if (s.finished) return `<div class="match-actions"><div class="panel center"><h2>${s.winner === me ? 'VICTORY' : s.winner === null ? 'TIE' : 'DEFEAT'}</h2><div class="muted">${esc(s.away.name)} ${s.score.away}-${s.score.home} ${esc(s.home.name)}${s.tiebreak ? ` (OT · won by ${s.tiebreak.size}v${s.tiebreak.size} Beast Clash)` : s.ot ? ' (OT)' : ''}</div></div><button class="btn primary big block" data-action="finish">Continue →</button></div>`;
    if (G.lastEvent?.needsContinue) return `<div class="match-actions">${autoBar}${rpRow}<button class="btn primary big block" data-action="continue">Continue →</button></div>`;
    if (s.phase === 'kickoff' || s.phase === 'free_kick') {
      const weKick = s.kickingTeam === me;
      return `<div class="match-actions">${autoBar}${rpRow}${weKick ? `<div class="primary-row ${s.phase === 'kickoff' ? 'three' : ''}" style="grid-template-columns:${s.phase === 'kickoff' ? '2fr 1fr' : '1fr'}"><button class="btn primary big" data-action="kickoff">${s.phase === 'free_kick' ? 'Free Kick' : 'Kick Off'}</button>${s.phase === 'kickoff' ? '<button class="btn" data-action="onside">Onside</button>' : ''}</div>` : `<button class="btn primary big block" data-action="kickoff">Receive the Kick</button>`}</div>`;
    }
    if (s.phase === 'try') {
      if (s.tryTeam !== me) return `<div class="match-actions">${autoBar}${rpRow}<button class="btn primary big block" data-action="continue">Opponent's Try: Continue</button></div>`;
      const two = PLAYS; const plays = teams[me].offensePlays.filter((id) => PLAYS[id].tags.some((t) => ['short', 'goalline', 'redzone', 'quick'].includes(t)));
      return `<div class="match-actions">${autoBar}${rpRow}<p class="muted center" style="margin:0">Touchdown! Kick (${AI.tryDecision(s) === 'two' ? 'coach suggests two' : 'coach suggests the kick'})</p>
        <div class="primary-row" style="grid-template-columns:1fr 1fr"><button class="btn primary big" data-action="trykick">Kick PAT (+1)</button><button class="btn big" data-action="trytwo">Go for Two</button></div>
        ${cards(plays, 'offense', G.selected.offense, null)}</div>`;
    }
    // Scrimmage.
    const myBall = s.possession === me;
    const side = myBall ? 'offense' : 'defense';
    const plan = teams[me][side === 'offense' ? 'offensePlays' : 'defensePlays'];
    const suggestion = AI.suggestPlay(s, teams[me], plan, side, G.tendencies[myBall ? me : them], teams[them], G.tendencies[me]);
    const selected = look.myPlay;
    let primary;
    if (myBall && s.down === 4) {
      const fg = R.fieldGoalInfo(s, teams); const dec = AI.fourthDownDecision(s, teams[me]);
      primary = `<div class="primary-row three"><button class="btn ${dec === 'go' ? 'primary' : ''} big" data-action="snap" ${selected ? '' : 'disabled'}>Go for It</button><button class="btn ${dec === 'punt' ? 'primary' : ''} big" data-action="punt">Punt</button><button class="btn ${dec === 'fg' ? 'primary' : ''} big" data-action="fg">FG ${fg.distance} yd<br><small>${Math.round(fg.chance * 100)}%</small></button></div>`;
    } else primary = `<button class="btn primary big block" data-action="snap" ${selected ? '' : 'disabled'}>${myBall ? (selected ? `Snap · ${esc(PLAYS[selected].name)}` : 'Pick a Play') : (selected ? `Set Defense · ${esc(PLAYS[selected].name)}` : 'Pick a Defense')}</button>`;
    // Early field goal: on any down, when the kick is makeable; highlighted when a half is about to end.
    let fgEarly = '';
    if (myBall && s.down < 4 && s.phase === 'scrimmage') { const fg = R.fieldGoalInfo(s, teams); if (fg.chance >= 0.2) fgEarly = `<button class="btn small ${!s.ot && s.clock <= 30 && (s.quarter === 2 || s.quarter >= 4) ? 'good' : ''}" data-action="fg" title="Kick now instead of running a play">FG ${fg.distance} yd · ${Math.round(fg.chance * 100)}%</button>`; }
    const secondary = `<div class="secondary">
      <button class="btn small" data-action="timeout" ${s.timeouts[me] ? '' : 'disabled'}>Timeout (${s.timeouts[me]})</button>
      ${myBall ? `<select class="btn small" data-change="tempo" aria-label="Tempo" style="min-height:36px;margin:0;flex:1"><option value="normal" ${(G.tempo || 'normal') === 'normal' ? 'selected' : ''}>Tempo: normal</option><option value="hurry" ${G.tempo === 'hurry' ? 'selected' : ''}>Tempo: hurry-up</option><option value="milk" ${G.tempo === 'milk' ? 'selected' : ''}>Tempo: milk clock</option></select>` : ''}
      ${fgEarly}
      ${myBall && s.phase === 'scrimmage' ? (() => { const sg = R.fieldGoalSignature(s, teams); return sg?.available ? `<button class="btn small good" data-action="fgsig" title="Once per game: the signature kick's own chart">${esc(sg.label)} ${sg.distance} yd · ${Math.round(sg.chance * 100)}%</button>` : ''; })() : ''}
      ${myBall && AI.shouldKneel(s) ? '<button class="btn small" data-action="kneel">Kneel</button>' : ''}${myBall && !s.ot && s.clockRunning && s.quarter >= 2 && s.clock < 60 ? '<button class="btn small" data-action="spike">Spike</button>' : ''}
      <button class="btn small ${G.auto ? 'primary' : ''}" data-action="auto" title="Auto: the coach's suggested plays are called for you, every play animated, until you turn it off">${G.auto ? 'Auto ■ Stop' : 'Auto ▶'}</button>
      ${G.auto ? `<button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed" title="Auto speed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button>` : ''}
      <button class="btn small" data-action="mode">${G.mode === 'key' ? 'Key Moments ✓' : 'Full Coaching ✓'}</button>
      <button class="btn small" data-action="simfinal" title="Skip the rest of the game">Sim to Final ⏭</button>
      ${lastReplay && lastReplay.gameKey === s.seed ? `<button class="btn small" data-action="replay" title="Watch the last big play again: ${esc(lastReplay.reason.label.toLowerCase())}">📼 Replay</button>` : ''}
      ${G.mode === 'key' ? '<button class="btn small good" data-action="keymoment">Sim to Key Moment ▸</button>' : ''}</div>`;
    const clock = f.settings.liveClock && s.phase === 'scrimmage' ? `<div class="playclock">Play clock <b id="pc">40</b><div class="bar"><i id="pcbar" style="width:100%"></i></div></div>` : '';
    return `<div class="match-actions">${primary}${secondary}${clock}</div>
      <div class="muted" style="font-size:12px;margin:4px 0">${myBall ? 'Your offensive plays' : 'Your defensive plays'} · ★ coach's suggestion · opponent's call is hidden${teams[me].blockedPlays?.length ? ` · <span style="color:var(--bad)">${teams[me].blockedPlays.length} play${teams[me].blockedPlays.length === 1 ? '' : 's'} unavailable (no legal ${teams[me].blockedSlots.join('/')})</span>` : ''}</div>
      ${cards(plan, side, selected, suggestion)}`;
  }
  function cards(ids, side, selected, suggestion) {
    return `<div class="play-grid">${ids.slice(0, 6).map((id) => `<button class="card ${selected === id ? 'selected' : ''} ${suggestion === id ? 'suggested' : ''} ${PLAYS[id].legendary ? 'legendary' : ''}" data-action="pick" data-side="${side}" data-id="${id}" aria-pressed="${selected === id}" aria-label="${esc(PLAYS[id].name)}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}</div>`;
  }

  /** Run one step with the human's choices applied, then animate if there is a play. */
  function act(f, choices) {
    const G = f.game; const s = G.state; if (s.finished || anim) return;
    const teams = teamsFor(f); const me = G.playerSide, them = R.opponent(me);
    const controllers = { [me]: humanController(me, G), [them]: aiController(them) };
    const ai = s.phase === 'scrimmage' ? aiCall(f, teams, them) : null;
    const c = { ...choices, tempo: G.tempo || 'normal' };
    const offenseSide = s.possession, toGo = s.toGo, down = s.down;
    if (s.phase === 'scrimmage') {
      if (s.possession === me) { c.offensePlayId = G.selected.offense; if (ai?.defense) c.defensePlayId = ai.defense; }
      else { c.defensePlayId = G.selected.defense; if (ai?.offense) c.offensePlayId = ai.offense; }
      if (!c.fourthDown && s.down === 4 && s.possession === me) c.fourthDown = 'go';
    }
    if (s.phase === 'try' && s.tryTeam === me && c.tryChoice === 'two') c.offensePlayId = G.selected.offense;
    if (s.phase === 'try' && s.tryTeam !== me) { /* AI decides */ }
    if (s.phase === 'kickoff' && s.kickingTeam !== me) delete c.kickoff;
    settleSave(); // a save still waiting from the last play is written now, before this snap: never inside the play's animation
    G.lastEvent = null; G.aiCall = null;
    const rpT = globalThis.__gbRenderPerf?.onStep ? performance.now() : 0; // render-perf harness only (inert otherwise): times the simulation step
    const shownPre = s.phase === 'scrimmage' ? presnapNow?.shown || null : null; // presentation only: the fields revealed on this play-call screen
    const servedNow = s.phase === 'scrimmage' ? absentMonsters(s, teams).filter((a) => a.serveOn === offenseSide) : []; // presentation only (I5): absences this snap serves
    const ev = step(s, teams, controllers, G.tendencies, c);
    if (rpT) globalThis.__gbRenderPerf.onStep(rpT, performance.now() - rpT, ev);
    if (ev) { ev.offenseSide = offenseSide; ev.toGo = toGo; ev.down = down; if (shownPre?.length) ev.fxRevealed = shownPre; if (servedNow.length && ev.sim) { const vac = servedVacancies(servedNow, ev.sim, teams, R.opponent(offenseSide)); if (vac.length) ev.fxStaged = vac; } }
    afterStep(f, ev);
  }
  /** The human side: never auto-kneels, spikes or burns timeouts; tempo comes from the UI. */
  function humanController(side, G) {
    const ai = aiController(side);
    return { ...ai, timeoutOnDefense: () => false, timeoutOnOffense: () => false, kneel: () => false, spike: () => false, tempo: () => G.tempo || 'normal' };
  }
  function afterStep(f, ev) {
    const G = f.game;
    if (!ev) { app.save(); refresh(f); return; }
    if (ev.kind === 'kickoff' && ev.sim) ev.offenseSide = R.opponent(ev.kicking); // a live kickoff (Task 8 M2): the return unit is the engine's offense
    if (ev.sim && ev.sim.frames?.length > 1 && !f.settings.reducedMotion) { startAnim(f, ev); return; }
    if (!ev.sim && !f.settings.reducedMotion && (ev.kind === 'kickoff' || ev.kind === 'punt' || ev.kind === 'field_goal')) {
      // Task 8 (I1): the formula kick as the reviewer draws it (buildKickFx: the kick animation plus the kick ability's cue derived from
      // the final result: Second Chance, Dragon Roar, Stone Cradle). An ordinary kick has no cue and plays exactly as before (no fx).
      const K = kickPlay(ev, kickLookup(f, ev.kicking), fxMeta(ev, true));
      if (K?.sim?.frames?.length > 1) { ev.offenseSide = ev.kicking; ev.sim = K.sim; ev.kickerName = teamsFor(f)[ev.kicking]?.kicker?.name || null; if (K.fx) kickFx.set(K.sim, K.fx); startAnim(f, ev); return; }
    }
    G.lastEvent = { text: ev.text, important: ev.scored || KEY_RESULTS.has(ev.sim?.result) || ev.kind === 'field_goal', needsContinue: false, abilities: abilitiesFired(ev), inspect: inspectNotes(ev), callout: callout(ev, G.playerSide), fresh: true };
    app.save(); refresh(f);
  }
  function startAnim(f, ev, opts = {}) {
    settleSave(); // every way into a play (snap, kneel/spike, harness): no queued save may fire inside the animation
    const G = f.game; const sim = ev.sim;
    anim = { frames: sim.frames, i: 0, ev, camera: followsBall(sim) ? cameraFor(Math.max(0, (sim.ballOn || 0) + sim.frames[0].ball[0] + 6)) : cameraFor(sim.ballOn), ballOn: sim.ballOn, ballLat: sim.ballLat, start: performance.now(), msPerFrame: 100 / ((f.settings.speed || 1) * (G.auto ? (G.autoSpeed || 1) : 1)), follow: followsBall(sim), sprites: spritesFor(f, ev.offenseSide || G.state.possession) };
    anim.fx = opts.lookup && (!sim.kick || sim.kickAbility) ? buildFx(sim, opts.lookup, fxMeta(ev, true)) : fxFor(f, ev, true);
    // Task 8 (I6): effects that begin before the snap (gates rising, Foresight's eye, a field's reveal, Dragon Roar's roar) get their
    // time before it: the first frame is held for fx.preroll seconds of play time while they draw, then the play runs as recorded.
    anim.pre = anim.fx?.preroll || 0; if (anim.pre) anim.start += anim.pre * 10 * anim.msPerFrame;
    G.lastEvent = null;
    refresh(f);
    const tick = (rafNow) => {
      if (!anim) return;
      const now = RP_CLOCK ? RP_CLOCK(rafNow) : rafNow; // render-perf harness only (inert otherwise): a fixed clock for frame-exact screenshots
      // requestAnimationFrame timestamps can sit a hair before the performance.now() taken at start: clamp at frame 0, never finish early.
      if (anim.pre && now < anim.start && sim.frames.length) { // the pre-roll: the snap is at anim.start
        const svg0 = document.querySelector('#field');
        if (svg0 && now - (anim.preDrawn || 0) >= 33) { anim.preDrawn = now; const s0 = G.state; fieldDraw(svg0, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s0, anim.ev), frame: sim.frames[0], prevFrame: null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), time: Math.max(-anim.pre, (now - anim.start) / anim.msPerFrame * 0.1), ownLabel: s0[anim.ev.offenseSide].abbr, oppLabel: s0[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites }); }
        anim.raf = requestAnimationFrame(tick); return;
      }
      const raw = Math.max(0, Math.floor((now - anim.start) / anim.msPerFrame));
      const idx = Math.min(sim.frames.length - 1, raw);
      if (!sim.frames.length) { finishAnim(f, false); return; } // a play with no frames (nothing to draw)
      // End-of-play hold: keep drawing the last frame while an effect that fired at the whistle plays out.
      if (raw > sim.frames.length - 1 && anim.fx && holds(anim)) {
        const last = sim.frames[sim.frames.length - 1]; const extra = (raw - (sim.frames.length - 1)) * 0.1; const hold = anim.hold ??= endHold(anim.fx, last.t ?? 0);
        const svg2 = document.querySelector('#field');
        if (extra < hold && svg2 && now - (anim.holdDrawn || 0) >= 33) { anim.holdDrawn = now; const s2 = G.state; fieldDraw(svg2, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), frame: last, prevFrame: last, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), time: (last.t ?? 0) + extra, ownLabel: s2[anim.ev.offenseSide].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites }); anim.raf = requestAnimationFrame(tick); return; }
        if (extra < hold) { anim.raf = requestAnimationFrame(tick); return; }
        finishAnim(f, false); return;
      }
      const svg = document.querySelector('#field'); // re-query: stopping Auto mid-play re-renders the screen
      // Smoother movement (2026-10-22): the sim records 10 frames a second; between two frames a half-step is drawn at the
      // midpoint (20 fps) unless the last draw was slow on this device, in which case the plain frames are kept. Reduced
      // motion never animates a play at all (afterStep), so nothing changes there.
      const exact = Math.max(0, (now - anim.start) / anim.msPerFrame); const half = !anim.slow && raw < sim.frames.length - 1 && exact - raw >= 0.5;
      const key = idx * 2 + (half ? 1 : 0);
      if (key !== anim.key && svg) {
        anim.key = key; anim.i = idx;
        const s = G.state; const t0 = performance.now();
        if (anim.follow) { const target = cameraFor((sim.ballOn || 0) + sim.frames[idx].ball[0] + 4); anim.camera = { bottom: anim.camera.bottom + (target.bottom - anim.camera.bottom) * 0.35, top: 0 }; anim.camera.top = anim.camera.bottom + (target.top - target.bottom); }
        const prevT = sim.frames[Math.max(0, idx - 1)].t ?? 0, ft = sim.frames[idx].t ?? 0;
        const drawFrame = half ? midFrame(sim.frames[idx], sim.frames[idx + 1]) : sim.frames[idx];
        fieldDraw(svg, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), frame: drawFrame, prevFrame: sim.frames[idx - 1] || null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), qbRead: qbReadsShown(f.settings, { live: true }), ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites });
        if (idx > 0 && !half && shakeBetween(anim.fx, prevT, ft)) shakeField(f);
        if (performance.now() - t0 > 18 && !(RP_CLOCK && globalThis.__gbRenderPerf.clock)) anim.slow = true; // this device cannot afford half-steps: back off for the rest of the play (never under the harness's fixed clock: frame-exact screenshots)
      }
      if (idx >= sim.frames.length - 1 && !(anim.fx && holds(anim) && endHold(anim.fx, sim.frames[sim.frames.length - 1].t ?? 0) > 0)) { finishAnim(f, false); return; }
      anim.raf = requestAnimationFrame(tick);
    };
    anim.raf = requestAnimationFrame(tick);
  }
  /** Kick plays follow the ball with the camera: the formula animations (kick-anim.js) and the live kickoff's engine frames. */
  function followsBall(sim) { return !!(sim.kick || sim.kickoff); }
  /** The end-of-play hold (an effect that fired at the whistle plays out): scrimmage plays, and a formula kick that carries a kick ability's cue (Stone Cradle's cuffs crumble after the whistle). */
  function holds(a) { return !a.follow || !!a.ev?.sim?.kickAbility; }
  /** Monster art for the field (null = simple circles/squares, per Settings). */
  function spritesFor(f, offSide) {
    if (f.settings.fieldMarkers === 'simple') return null;
    const T = teamsFor(f); const defSide = R.opponent(offSide);
    const pack = (team) => { const map = { ...team.offense, ...team.defense }; const pool = Object.values(map).filter((m) => m?.id); return { map, pool: team.kicker?.id ? [team.kicker, ...pool] : pool }; };
    const off = pack(T[offSide]), def = pack(T[defSide]);
    // A live kickoff's units mix lineups (a kicker covering, a corner returning): its slots are looked up in the whole club.
    const kickMap = (team, p) => ({ ...p.map, ...(team.kicker?.id ? { K: team.kicker } : {}) });
    return { off: { map: { ...kickMap(T[offSide], off), ...T[offSide].offense }, pool: off.pool }, def: { map: { ...kickMap(T[defSide], def), ...T[defSide].defense }, pool: def.pool } };
  }
  /** The midpoint between two sim frames: positions and the ball lerped, everything else (engagement, status, holder) from the first. Frames across a phase change are not blended. */
  function midFrame(a, b) {
    if (!a || !b || a.phase !== b.phase || !a.ball || !b.ball || a.motion !== b.motion) return a;
    const lerp = (p, q) => q && q[0] === p[0] ? [p[0], (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, p[3], p[4]] : p;
    const byId = (list) => Object.fromEntries(list.map((p) => [p[0], p]));
    const bo = byId(b.off), bd = byId(b.def);
    return { ...a, t: ((a.t ?? 0) + (b.t ?? 0)) / 2, off: a.off.map((p) => lerp(p, bo[p[0]])), def: a.def.map((p) => lerp(p, bd[p[0]])), ball: [(a.ball[0] + b.ball[0]) / 2, (a.ball[1] + b.ball[1]) / 2, a.ball[2]], mid: true };
  }
  function animColors(s, ev) { const o = ev.offenseSide || 'home'; return { off: s[o].color, def: s[R.opponent(o)].color }; }
  function finishAnim(f, skipped) {
    if (!anim) return;
    if (anim.replay) { endReplay(f); return; }
    const { ev } = anim; cancelAnimationFrame(anim.raf); anim = null;
    const G = f.game;
    G.lastEvent = { text: ev.text, important: !!ev.scored || KEY_RESULTS.has(ev.sim?.result), needsContinue: false, abilities: abilitiesFired(ev), inspect: inspectNotes(ev), callout: callout(ev, G.playerSide), fresh: true };
    app.save(); refresh(f); saveWhenIdle(); // the play's result is requested above and written while the screen is idle after it
    // Instant replay (GDD §34): the outcome is final and saved above; the replay only re-draws this play's recorded frames.
    const reason = replayReason(ev, G.state, G.playerSide);
    if (reason) lastReplay = { ev, reason, gameKey: G.state.seed };
    if (reason && f.settings.replays !== false) { pendingTip = ev; clearTimeout(replayTimer); replayTimer = setTimeout(() => { replayTimer = null; const G2 = app.f?.game; if (!anim && G2 && G2.state.seed === lastReplay?.gameKey && document.querySelector('#fieldwrap') && !document.querySelector('.sheet')) startReplay(app.f, lastReplay); else { firstAbilityTip(app.f, ev); pendingTip = null; } }, 350); return; }
    firstAbilityTip(f, ev);
  }

  // ------------------------------------------------------------ instant replay (GDD §34)
  // A replay is presentation only: it draws frames already in memory (ev.sim.frames) and touches nothing in f.game.
  // The buffer is the one most recent eligible play, in memory only (never saved).
  let lastReplay = null; let pendingTip = null; let replayTimer = null;
  const VB = FIELD_VIEWBOX.split(' ').map(Number); // [-HW, 0, 2HW, SPAN]
  function startReplay(f, rp) {
    const G = f.game; const sim = rp.ev.sim; if (!sim?.frames?.length || anim) return;
    settleSave();
    const plan = replayPlan(sim, rp.reason);
    anim = { replay: rp, plan, frames: sim.frames, i: plan.i0, ev: rp.ev, camera: followsBall(sim) ? cameraFor(Math.max(0, (sim.ballOn || 0) + sim.frames[plan.i0].ball[0] + 6)) : cameraFor(sim.ballOn), ballOn: sim.ballOn, ballLat: sim.ballLat, follow: followsBall(sim), sprites: spritesFor(f, rp.ev.offenseSide || G.state.possession), start: performance.now() + REPLAY.transitionMs };
    anim.fx = fxFor(f, rp.ev, false);
    if (G.lastEvent) G.lastEvent.fresh = false; // the touchdown flash and score pulse belong to the live play only
    refresh(f);
    const zoomOn = !f.settings.reducedMotion;
    const tick = (rafNow) => {
      if (!anim?.replay) return;
      const now = RP_CLOCK ? RP_CLOCK(rafNow) : rafNow; // render-perf harness only (inert otherwise)
      const pos = replayPosition(plan, now - anim.start);
      if (pos.done) { endReplay(f); return; }
      const svg = document.querySelector('#field'); const wrap = document.querySelector('#fieldwrap');
      const key = pos.i * 4 + Math.floor(pos.k * 4);
      if (svg && key !== anim.key) {
        anim.key = key; anim.i = pos.i;
        const a = sim.frames[pos.i], b = sim.frames[Math.min(plan.i1, pos.i + 1)];
        const frame = pos.k >= 0.5 && b !== a ? midFrame(a, b) : a;
        if (anim.follow) { const target = cameraFor((sim.ballOn || 0) + a.ball[0] + 4); anim.camera = { bottom: anim.camera.bottom + (target.bottom - anim.camera.bottom) * 0.35, top: 0 }; anim.camera.top = anim.camera.bottom + (target.top - target.bottom); }
        const s2 = G.state;
        fieldDraw(svg, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), frame, prevFrame: sim.frames[pos.i - 1] || null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), qbRead: qbReadsShown(f.settings), ownLabel: s2[anim.ev.offenseSide || s2.possession].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide || s2.possession)].abbr, camera: anim.camera, event: G.event, noLines: true, sprites: anim.sprites, time: frame.t });
        // Camera: a slight zoom that tracks the ball (CSS transform on the svg; the wrap clips it).
        if (zoomOn) { const bx = (anim.ballLat + frame.ball[1] - VB[0]) / VB[2], by = (anim.camera.top - (anim.ballOn + frame.ball[0])) / VB[3]; svg.style.transformOrigin = `${(Math.max(0.15, Math.min(0.85, bx)) * 100).toFixed(1)}% ${(Math.max(0.15, Math.min(0.85, by)) * 100).toFixed(1)}%`; svg.style.transform = `scale(${REPLAY.zoom})`; }
        wrap?.classList.toggle('slowmo', !!pos.slow);
      }
      anim.raf = requestAnimationFrame(tick);
    };
    anim.raf = requestAnimationFrame(tick);
  }
  function endReplay(f) {
    if (!anim?.replay) return;
    cancelAnimationFrame(anim.raf); anim = null;
    const svg = document.querySelector('#field'); if (svg) { svg.style.transform = ''; svg.style.transformOrigin = ''; }
    if (f.game?.lastEvent) f.game.lastEvent.fresh = false; // the play's callout already played: no second score pulse
    refresh(f);
    if (pendingTip) { const ev = pendingTip; pendingTip = null; firstAbilityTip(f, ev); }
  }
  /**
   * The first time a signature ability fires in one of this career's games (polish 2.0): a short tip
   * naming it, whose it is and what it does, with "▶ See it". Once per ability; off with tutorial tips.
   * During Auto it is a toast, so the game keeps moving.
   */
  function firstAbilityTip(f, ev) {
    if (isExpert(f) || !ev.sim) return; // Coach Assist: Expert has no automatic tips
    const G = f.game; const seen = (f.abilityTips ||= {}); const off = ev.offenseSide || G.state.possession; const look = fxLookup(f, off);
    for (const e of (Array.isArray(ev.sim.events) ? ev.sim.events : [])) {
      if (e.kind !== 'ability' || e.trait) continue;
      const m = look(e.side, e.by); const sp = m?.species ? SPECIES_BY_ID[m.species] : null; const info = sp ? abilityInfo(sp.id, 'football') : null; const ab = info ? { name: info.name, text: info.summary } : null; // the Dex ability (Task 8), never the retired legacy card
      if (!ab || seen[ab.name]) continue;
      seen[ab.name] = true; app.save();
      const side = e.side === 'off' ? off : R.opponent(off); const yours = side === G.playerSide; const club = G.state[side]?.name || '';
      if (G.auto) { toast(`✨ ${ab.name} (${m.name}, ${yours ? 'yours' : club}): ${ab.text}`, 'good', 5000); return; }
      sheet(`<p style="margin-top:0"><b>${esc(m.name)}</b> ${yours ? '(yours)' : `of the ${esc(club)}`} just used <b>${esc(ab.name)}</b>.</p><p class="muted">${esc(ab.text)}</p><p class="dim" style="font-size:12px">Every signature ability belongs to one monster in the league. You will see this tip once per ability.</p><button class="btn small see-it" data-see-it="${sp.id}">▶ See It Again</button>`, { title: `✨ ${ab.name}` });
      return;
    }
  }
  /** "Flaroo's Quick Feet kicks in" → "Flaroo · Quick Feet". */
  function abilityLabel(e) { const m = /^(.*)'s (.*) kicks in$/.exec(e.text || ''); return m ? m[2] : 'ability'; }
  /** Task 8 (I4): who the last play's Iron Lungs / Night Watch acted for (match-fx.js lastPlayNotes), kept with the last event for the inspect sheet. */
  function playNotes(ev) { if (!ev?.sim?.events) return { lungs: [], watch: [], by: {} }; return (ev.fxNotes ||= lastPlayNotes(ev.sim, teamsFor(app.f), ev.offenseSide || 'home')); }
  function inspectNotes(ev) { const n = playNotes(ev); return n.lungs.length || n.watch.length ? { lungs: n.lungs, watch: n.watch } : null; }
  function abilitiesFired(ev) { const off = ev.offenseSide || 'home'; const notes = playNotes(ev); const ticks = abilityTicks(ev.sim, (side, slot) => (side === 'def' ? ev.sim?.names?.def : ev.sim?.names?.off)?.[slot] || slot); /* Task 8 (I4) */ return (ev.sim?.events || []).filter((e) => e.kind === 'ability').sort((a, b) => (a.trait ? 1 : 0) - (b.trait ? 1 : 0)).map((e) => { const m = /^(.*)'s (.*) kicks in$/.exec(e.text || ''); const dex = m ? null : dexAbilityName(e.ability); /* a Dex ability's line is its own sentence: name it from the Dex */ return { team: e.side === 'off' ? off : R.opponent(off), who: m ? m[1] : (ev.sim.kick && ev.kickerName) || (dex && (e.side === 'def' ? ev.sim.names?.def : ev.sim.names?.off)?.[e.by]) || e.by, what: m ? m[2] : dex || (ev.sim.kick && e.text) || 'ability', trait: !!e.trait, tick: ticks[`${e.side}:${e.by}:${e.ability}`] || null, mid: notes.by[`${e.side}:${e.by}`] || null }; }).filter((x, i, all) => all.findIndex((y) => y.team === x.team && y.who === x.who && y.what === x.what) === i); }
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } document.querySelector('#fieldwrap')?.classList.remove('shake'); }
  /** Species lookup for the effect layer: team side + slot → { element, name }. */
  function fxLookup(f, offSide) {
    const T = teamsFor(f); const defSide = R.opponent(offSide);
    const club = (t) => ({ ...t.defense, ...t.offense, ...(t.kicker?.id ? { K: t.kicker } : {}) }); // a live kickoff's units mix lineups
    return (team, slot) => { const m = (team === 'off' ? T[offSide].offense : T[defSide].defense)?.[slot] || club(team === 'off' ? T[offSide] : T[defSide])[slot]; if (!m) return null; const sp = resolveSpecies(m); return { element: sp?.element || m.type || null, name: m.name, species: sp?.id || null }; };
  }
  /** The effect state of one play. A formula kick draws effects only when a kick ability acted on it (kickSim's `kickAbility`); every other kick is drawn as before, without an effect layer. */
  function fxFor(f, ev, live) {
    const sim = ev.sim; const side = ev.offenseSide || f.game.state.possession;
    if (sim.kick) return sim.kickAbility ? (live && kickFx.get(sim)) || buildFx(sim, kickLookup(f, side), fxMeta(ev, live)) : null;
    return buildFx(sim, fxLookup(f, side), fxMeta(ev, live));
  }
  /** Formula kick units use their own slot names (kick-anim.js): the kicker is 'K' on field goals and kickoffs and 'P' on punts. */
  function kickLookup(f, kickingSide) { const base = fxLookup(f, kickingSide); return (team, slot) => base(team, team === 'off' && slot === 'P' ? 'K' : slot); }
  const kickFx = new WeakMap(); // a formula kick's effect state as buildKickFx built it (in memory only, with the kick's frames)
  /** buildFx meta: the live play opts into the pre-roll (I6; a replay keeps the pre-snap choreography inside the play); fields already revealed on the play-call screen (I2) are simply there. */
  function fxMeta(ev, live) { return { ...(live ? { preroll: true } : {}), ...(ev?.fxRevealed?.length ? { revealed: ev.fxRevealed } : {}), ...(ev?.fxStaged?.length ? { staged: ev.fxStaged } : {}) }; }
  // ---- I4: the monster inspect sheet (match-fx.js inspectInfo; the game's sheet()). Opened from the formation or the ability strip.
  let inspectMap = null; let inspectForm = null;
  const STATUS_NAME = { stunned: 'Stunned', slowed: 'Slowed', stumbled: 'Stumbled', knockedDown: 'Knocked Down', afflicted: 'Afflicted', weakened: 'Weakened', confused: 'Confused' };
  function inspectHtml(f, I) {
    const s = f.game.state; const m = I.monster; const st = I.stamina; const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
    const note = (n) => `<div class="inspect-note ${n.tick ? 'tick' : ''}">${n.tick ? '<b aria-hidden="true">✓</b> ' : ''}${esc(n.text)}</div>`;
    const bar = I.full ? `<div class="inspect-bar ${st.exhausted ? 'out' : st.low ? 'low' : ''}" role="img" aria-label="Stamina ${num(st.now)} of ${st.capacity}"><i style="width:${Math.round(st.frac * 100)}%"></i></div>` : '';
    const stamLine = I.full ? `${num(st.now)} / ${st.capacity}${st.played ? '' : ' · has not played yet'}` : st.exhausted ? 'Exhausted' : st.low ? 'Low' : 'Not low';
    return `<div class="inspect" data-inspect-sheet="${esc(m.id)}">
      <div class="row" style="gap:10px;align-items:center">${monsterSprite(m, 44)}<div class="grow"><b>${esc(m.name)}</b><div class="muted" style="font-size:12px">${esc(m.type || '')} ${esc(m.position || '')}${I.slot ? ` · lined up at ${esc(I.slot)}` : ''} · ${esc(s[I.team].abbr)}${I.full ? '' : ' (opponent)'}</div></div></div>
      ${I.absent ? `<div class="inspect-note tick">🐲 Swallowed by Sovereign Arm: he misses ${esc(s[I.absent.serveOn]?.abbr || 'the offense')}'s next offensive play, then returns to his formation spot.</div>` : ''}
      <div class="inspect-sec" data-sec="stamina"><div class="row between"><b>Stamina</b><span>${stamLine}</span></div>${bar}
        ${st.exhausted ? '<div class="inspect-note">Exhausted for the rest of the game: every attribute is halved.</div>' : st.low ? '<div class="inspect-note">Low: the battery shows over his head.</div>' : ''}${I.staminaNotes.map(note).join('')}</div>
      ${I.awarenessNotes.length ? `<div class="inspect-sec" data-sec="awareness"><b>Awareness</b>${I.awarenessNotes.map(note).join('')}</div>` : ''}
      <div class="inspect-sec" data-sec="status"><div class="row between"><b>Status</b><span>${I.status ? `${esc(STATUS_NAME[I.status.id] || I.status.id)}${I.status.remaining != null ? ` · ${I.status.remaining} play${I.status.remaining === 1 ? '' : 's'} left` : ' · this play'}` : 'None'}</span></div></div>
      ${I.ability ? `<div class="inspect-sec" data-sec="ability"><b>${esc(I.ability.name)}</b><div class="muted" style="font-size:12px">${esc(I.ability.text)}</div></div>` : ''}</div>`;
  }
  function openInspect(f, mid) {
    const G = f?.game; if (!G || !mid) return; const teams = teamsFor(f); const mine = findMonster(teams, mid)?.team === G.playerSide; // an opponent shows only what the field already shows
    const I = inspectInfo(G.state, teams, mid, { formation: inspectForm, last: G.lastEvent?.inspect || null, full: mine }); if (!I) return;
    sheet(inspectHtml(f, I), { title: 'Inspect' });
  }
  // ---- I5: a temporary absence (Sovereign Arm) on the formation: the empty spot while he is out, his return once (match-fx.js).
  const absenceTrack = createAbsenceTracker();
  /** A pre-snap look without some defensive slots: they are not drawn (the alignments stay, so a mark can sit on the empty spot). */
  function withoutSlots(presnap, slots) {
    const cut = (p) => ({ ...p, onField: p.onField.filter((sl) => !slots.includes(sl)) });
    return { ...presnap, ...(presnap.defensePlay ? { defensePlay: cut(presnap.defensePlay) } : {}), ...(presnap.play?.side === 'defense' ? { play: cut(presnap.play) } : {}) };
  }
  // ---- I2: the fields both teams may see before the snap, on the play-call screen (match-fx.js). The reveal of a new field plays once.
  let choiceClock = { key: null, start: 0 };
  const revealClock = createRevealClock(); let presnapNow = null; let presnapRaf = null;
  function presnapT8(f, teams, look) {
    const G = f.game, s = G.state; presnapNow = null;
    if (anim || s.phase !== 'scrimmage' || s.finished || !look?.presnap) return null;
    const mine = s.possession === G.playerSide;
    const calls = look.myPlay ? (mine ? { offense: look.myPlay, defense: look.aiDefense } : { offense: look.aiOffense, defense: look.myPlay }) : null;
    const drawn = look.presnap.offensePlay?.id && look.presnap.defensePlay?.id ? { offense: look.presnap.offensePlay.id, defense: look.presnap.defensePlay.id } : null; // the formations on screen before a play is chosen
    const list = presnapFields(s, teams, calls, { hideDefenseAlign: mine, formation: drawn });
    const lookup = fxLookup(f, s.possession); const animate = !f.settings.reducedMotion; const dLook = look.presnap.defensePlay;
    const choiceKey = `${s.seed}|${s.t8?.preChoice?.key}`;
    if (choiceClock.key !== choiceKey) choiceClock = { key: choiceKey, start: performance.now() };
    const at = (now) => {
      const C = list.length ? revealClock.frame(s.seed, list, now, animate) : { fields: [], time: 0, until: 0, shown: [] };
      const A = absenceTrack.frame(s, teams, dLook, now, animate); // the return's clock is its own; on the draw clock it began `age` seconds ago
      const staged = A.staged.map(({ age, ...g }) => (age != null ? { ...g, t: C.time - age } : g));
      return { fields: C.fields, fx: presnapFx(C.fields, lookup, staged, { record: s.t8?.preChoice, time: C.time, age: animate ? (now - choiceClock.start) / 1000 : 2, frame: { home: s.possession === 'home', ballOn: s.ballOn, ballLat: s.ballLat || 0 } }), time: C.time, until: Math.max(C.until, A.until, animate && (s.t8?.preChoice?.prism?.length || s.t8?.preChoice?.foresight?.length) ? choiceClock.start + 2000 : 0), shown: C.shown, vacant: A.vacant, returning: A.returning };
    };
    const first = at(performance.now()); first.notes = conditionalNotes(s, teams, list, calls); // N9c: fields shown as conditional on their creator taking part
    if (!list.length && !first.fx && !first.returning.length && !first.notes.length) return null;
    presnapNow = { at, shown: first.shown, until: first.until, field: null };
    return first;
  }
  /** While a reveal is running on the play-call screen, redraw the field at the reveal's clock (about 30 a second), then once more settled. */
  function runPresnapReveal(f) {
    cancelAnimationFrame(presnapRaf); presnapRaf = null;
    if (!presnapNow?.until || !presnapNow.field || anim) return;
    const P0 = presnapNow; let last = 0;
    const tick = (now) => {
      presnapRaf = null; const svg = document.querySelector('#field');
      if (anim || presnapNow !== P0 || !svg || Router.currentScreen()?.name !== 'match') return;
      if (now - last >= 33) { last = now; const C = P0.at(performance.now()); fieldDraw(svg, { ...P0.field, fields: C.fields.length ? C.fields : null, fx: C.fx, time: C.time }); if (!C.until) return; }
      presnapRaf = requestAnimationFrame(tick);
    };
    presnapRaf = requestAnimationFrame(tick);
  }
  function fxQualityFor(f) { return f.settings.reducedMotion ? 'min' : f.settings.fieldMarkers === 'simple' ? 'low' : 'full'; }
  // Render-performance harness hook (tools/perf/render, docs/task8/RENDER_PERF.md). Inert: it exists only when the harness defines
  // globalThis.__gbRenderPerf before the app loads, and nothing in the game calls it. It hands a precomputed play to this screen's own
  // playback (startAnim) and says when the playback has finished; `lookup` (optional) is the effect lookup for a staged scene's monsters.
  // If the harness also sets `onStep`, act() reports the start and duration of each simulation step (combined live-gameplay mode).
  // `clock(rafNow)` (optional, screenshot identity checks: tools/perf/render/shots.mjs) replaces the animation clock, so a chosen
  // frame can be held on screen; `animInfo()` reports the running playback's timing. Both are undefined in the game.
  const RP_CLOCK = globalThis.__gbRenderPerf ? (t) => (globalThis.__gbRenderPerf.clock ? globalThis.__gbRenderPerf.clock(t) : t) : null;
  if (globalThis.__gbRenderPerf) Object.assign(globalThis.__gbRenderPerf, {
    playMatch(ev, { lookup = null } = {}) { startAnim(app.f, ev, { lookup }); return !!anim; },
    matchBusy: () => !!anim,
    animInfo: () => (anim ? { start: anim.start, msPerFrame: anim.msPerFrame ?? null, frames: anim.frames.length, key: anim.key ?? null, follow: !!anim.follow, replay: !!anim.replay, hold: anim.hold ?? null, hasFx: !!anim.fx } : null),
  });
  let shakeTimer = null;
  function shakeField(f) {
    if (f.settings.screenShake === false || f.settings.reducedMotion) return;
    const el = document.querySelector('#fieldwrap'); if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    clearTimeout(shakeTimer); shakeTimer = setTimeout(() => el.classList.remove('shake'), 260);
    try { navigator.vibrate?.(35); } catch { /* not supported (iPhone browsers): the shake is enough */ }
  }

  /** Key Moments: let the AI run routine downs for the player until something matters. */
  function simToKeyMoment(f) {
    const G = f.game; const s = G.state; if (s.finished) return;
    const teams = teamsFor(f); const me = G.playerSide, them = R.opponent(me);
    const controllers = { [me]: aiController(me), [them]: aiController(them) }; // routine downs: the AI coaches for you
    const lines = []; let n = 0;
    const isKey = () => {
      if (s.finished || s.ot) return true;
      if (s.phase === 'try' && s.tryTeam === me) return true;
      if (s.phase !== 'scrimmage') return false;
      const mine = s.possession === me;
      if (s.down >= 3) return true;
      if (s.ballOn >= 80) return true;
      if (R.inTwoMinute(s)) return true;
      return false;
    };
    G.aiCall = null;
    while (n < 40) {
      const ev = step(s, teams, controllers, G.tendencies, {});
      n++; if (ev) lines.push(ev.text);
      if (!ev) break;
      if (ev.scored || KEY_RESULTS.has(ev.sim?.result) || isKey()) break;
    }
    G.simmed = lines.slice(-6);
    G.lastEvent = { text: `${n} play${n === 1 ? '' : 's'} simulated. ${lines[lines.length - 1] || ''}`, important: false };
    G.selected = { offense: null, defense: null }; G.aiCall = null;
    app.save(); Router.render();
    if (lines.length > 1) sheet(`<div class="log">${lines.map((l) => `<div class="entry"><span class="t"></span><span>${esc(l)}</span></div>`).join('')}</div>`, { title: 'Simulated Plays' });
  }

  /** Skip the rest of the game: the coach plays it out headless, then the final whistle screen. */
  function simToFinal(f) {
    const G = f.game; const s = G.state; if (s.finished) return;
    const teams = teamsFor(f); const me = G.playerSide, them = R.opponent(me);
    const controllers = { [me]: aiController(me), [them]: aiController(them) };
    let n = 0; while (!s.finished && n++ < 600) { const ev = step(s, teams, controllers, G.tendencies, {}); if (!ev) break; }
    stopAnim(); clearTimeout(autoTimer); autoTimer = null; G.auto = false;
    G.lastEvent = { text: `Simulated to the final whistle. ${s[me].name} ${s.score[me]}, ${s[them].name} ${s.score[them]}.`, important: true };
    G.selected = { offense: null, defense: null }; G.aiCall = null;
    app.save(); Router.render();
  }

  function showLog(f) {
    const s = f.game?.state; if (!s) return;
    sheet(`<div class="log">${s.log.slice().reverse().map((e) => `<div class="entry ${e.important ? 'important' : ''}"><span class="t">${R.quarterText({ quarter: e.q })} ${fmtClock(e.clock)}</span><span>${esc(e.text)}${e.repro ? `<br><small class="dim mono">repro ${esc(e.repro)}</small>` : ''}</span></div>`).join('')}</div><p class="dim">A repro code replays that exact play: <span class="mono">node tests/tools/replay.js CODE</span>.</p>`, { title: 'Play-by-Play' });
  }

  function finishGame(f) {
    if (!f.game?.state?.finished || finishGame.busy) return; // a second tap (the button stays under the result sheet) must not run the final whistle twice
    finishGame.busy = true; setTimeout(() => { finishGame.busy = false; }, 0);
    const G = f.game; const s = G.state; const me = G.playerSide;
    const won = s.winner === me;
    const teams = teamsFor(f);
    const r = F.finishSunday(f, s); app.save(); app.backup(f);
    const ev = r.events || [];
    const badgeClub = r.newBadge; const gym = badgeClub ? GYM_BY_CLUB[badgeClub] : null;
    const otTag = s.tiebreak ? ` (OT · ${s.tiebreak.size}v${s.tiebreak.size} Clash)` : s.ot ? ' (OT)' : ''; const box = boxScoreHtml(s, teams, { title: gym ? `Final${otTag} · 🏅 BADGE GAME WON` : `Final${otTag}` });
    // Beast Bowl won: the ceremony follows the final whistle (GDD §35). The result, the title and the season's end are already
    // saved above (finishSunday), so skipping the ceremony can never skip anything that counts.
    const title = won && f.season.champion === f.club && (f.history || []).some((h) => h.year === f.season.year && h.championship);
    const toHq = () => (title ? Router.go('ceremony', { year: f.season.year, fromGame: true }, { reset: true }) : Router.go('hq', {}, { reset: true }));
    // Gym cleared: the beaten coach's handshake first, then the badge itself (GDD §15.4, playtest round 3).
    const handshake = () => {
      if (!gym) return toHq();
      const hue = TYPES[gym.element]?.hue ?? 120; const lines = beatenLines(badgeClub);
      const { close } = sheet(`<div class="talk handshake"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite(gym.coach.portrait, 56, { hue })}<div class="grow"><div class="talk-name">${esc(gym.coach.name)} <span class="dim">· head coach, ${esc(badgeClub)}</span></div>${lines.map((l) => `<p class="talk-line">“${esc(l)}”</p>`).join('')}</div></div>
        <button class="btn primary big block" data-action="shake" style="margin-top:10px">🤝 Shake Hands</button></div>`, { title: 'Midfield', onClose: celebrate });
      document.querySelector('.sheet [data-action="shake"]')?.addEventListener('click', () => close());
    };
    const celebrate = () => {
      if (!gym) return toHq();
      const hue = TYPES[gym.element]?.hue ?? 120; const n = Object.keys(f.campaign.badges).length; const sp = SPECIES_BY_ID[gym.legendary];
      const { close } = sheet(`<div class="badge-win" style="--hue:${hue}"><div class="badge-win-ring"><span>★</span></div><div class="badge-win-title">BADGE EARNED</div><div class="badge-win-name">${esc(gym.badge)}</div>
        <p class="muted">${esc(gym.coach.name)} and the ${esc(badgeClub)} fall, ${s.score[me]}-${s.score[R.opponent(me)]}. That's badge ${n} of 8.</p>
        <div class="row" style="justify-content:center;gap:10px">${portraitSprite(gym.coach.portrait, 44, { hue })}<p class="talk-line" style="margin:0;max-width:26ch">“${esc(BADGE_LINES[n % BADGE_LINES.length])}”</p></div>
        ${sp ? `<p class="dim" style="margin-top:8px">${esc(sp.name)}, their legendary, can now be tracked when you win the Beast Bowl.</p>` : ''}
        <button class="btn primary big block" data-action="badge-ok" style="margin-top:8px">Continue</button></div>`, { title: 'Gym Cleared', onClose: toHq });
      document.querySelector('.sheet [data-action="badge-ok"]')?.addEventListener('click', () => close());
    };
    // The final whistle (2026-10-22 presentation pass): a result hero weighted to the occasion, the box score, then what the
    // game did to the roster: XP for every starter, level-ups with the rating change, injuries.
    const them = R.opponent(me); const tag = G.tag || ''; const champ = G.event === 'playoff' && isBeastBowlTag(tag); /* only the Beast Bowl itself ("Titan Semifinal" matched /final/ before v42.11) */ const playoff = G.event === 'playoff';
    const diff = s.score[me] - s.score[them]; const feel = won ? (champ ? 'BEAST BOWL CHAMPIONS' : playoff ? 'PLAYOFF WIN' : diff >= 17 ? 'DOMINANT WIN' : diff <= 3 ? 'NARROW WIN' : 'VICTORY') : (champ ? 'BEAST BOWL LOST' : playoff ? 'SEASON OVER' : diff >= -3 ? 'NARROW LOSS' : 'DEFEAT');
    const hero = `<div class="final-hero ${won ? 'won' : 'lost'} ${champ ? 'champ' : playoff ? 'playoff' : ''}"><div class="final-feel">${feel}</div><div class="final-score"><span style="color:${s[me].color}">${esc(s[me].abbr)}</span> ${s.score[me]} <span class="dim">–</span> ${s.score[them]} <span style="color:${s[them].color}">${esc(s[them].abbr)}</span></div><div class="dim">${esc(tag || `Week ${f.season.week}`)}${otTag}${G.event === 'rival' ? ' · ⚔️ rivalry' : ''}</div></div>`;
    const xpRows = ev.filter((e) => e.kind === 'xp').sort((a, b) => b.amount - a.amount);
    const lvl = ev.filter((e) => e.kind === 'levelup' || e.kind === 'evolve'); const inj = ev.filter((e) => e.kind === 'injury');
    const after = `${lvl.length ? `<h3>Level-ups</h3><div class="list">${lvl.map((e) => e.kind === 'evolve' ? `<div class="item static good"><div class="grow"><div class="name">✨ EVOLUTION · ${esc(e.from)} → ${esc(e.to)}</div></div></div>` : `<div class="item static"><div class="grow"><div class="name">⬆️ ${esc(e.name)} · level ${e.level}</div><div class="sub">${e.from} → <b style="color:var(--good)">${e.to}</b> OVR</div></div></div>`).join('')}</div>` : ''}
      ${inj.length ? `<h3>Injuries</h3><div class="list">${inj.map((e) => `<div class="item static" style="border-color:var(--bad)"><div class="grow"><div class="name" style="color:var(--bad)">🩹 ${esc(e.name)}</div><div class="sub">${esc(e.severity)} · out ${e.weeks} week${e.weeks === 1 ? '' : 's'}</div></div></div>`).join('')}</div>` : ''}
      ${xpRows.length ? `<h3>Experience</h3><div class="xp-grid">${xpRows.slice(0, 12).map((x) => `<div class="xp-row"><span class="xp-name">${esc(x.name)} <span class="dim">${esc(x.position)}</span></span><span class="xp-amt">${x.max ? 'MAX' : `+${Math.round(x.amount * 10) / 10}`}${x.training ? `<span class="dim" title="Training bar progress (shared by football and Beast Clash)"> · +${Math.round(x.training * 1000) / 10}% training</span>` : ''}${x.masteryCredits ? `<span class="dim" data-reward="mastery" title="Football ability mastery: valid uses this game"> · +${x.masteryCredits} mastery</span>` : ''}${x.gradeAdj ? `<span class="dim" data-reward="grade" title="Performance grade: the adjustment to this game's level XP"> · grade ${x.gradeAdj > 0 ? '+' : ''}${Math.round(x.gradeAdj * 100)}%</span>` : ''}</span><div class="bar"><i style="width:${x.max ? 100 : Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div><span class="dim mono xp-lv">Lv ${x.level}</span></div>`).join('')}${xpRows.length > 12 ? `<p class="dim">and ${xpRows.length - 12} more starters.</p>` : ''}</div>` : ''}
      ${(() => { const pr = ev.filter((e) => e.kind === 'practice'); return pr.length ? `<h3>Development slots</h3><div class="xp-grid">${pr.map((x) => `<div class="xp-row"><span class="xp-name">${esc(x.name)} <span class="dim">${esc(x.position)}</span></span><span class="xp-amt">${x.max ? 'MAX' : `+${Math.round(x.amount * 10) / 10}`}${x.training ? `<span class="dim" title="Training bar progress (shared by football and Beast Clash)"> · +${Math.round(x.training * 1000) / 10}% training</span>` : ''}${x.masteryCredits ? `<span class="dim" data-reward="mastery" title="Football ability mastery: valid uses this game"> · +${x.masteryCredits} mastery</span>` : ''}${x.gradeAdj ? `<span class="dim" data-reward="grade" title="Performance grade: the adjustment to this game's level XP"> · grade ${x.gradeAdj > 0 ? '+' : ''}${Math.round(x.gradeAdj * 100)}%</span>` : ''}</span><div class="bar"><i style="width:${x.max ? 100 : Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div><span class="dim mono xp-lv">Lv ${x.level}</span></div>`).join('')}<p class="dim">Practice XP for reserves in development slots who did not start.</p></div>` : ''; })()}
      ${!lvl.length && !inj.length ? '<p class="dim">No injuries. Fatigue builds with every game and recovers through the week.</p>' : ''}`;
    sheet(`${hero}${box}${postGameHtml(f, r.partnerships, r.captainNote)}${after}`, { title: gym ? 'Final · badge game' : champ ? 'Beast Bowl' : playoff ? 'Final · playoffs' : 'Final', onClose: handshake });
  }

  function startPlayClock(f, root) {
    clearInterval(playClockTimer); playClockTimer = null;
    if (!f.settings.liveClock) return;
    let left = 40; let last = performance.now();
    playClockTimer = setInterval(() => {
      const G = f.game; if (!G || G.state.finished || G.state.phase !== 'scrimmage' || anim || G.lastEvent?.needsContinue) { last = performance.now(); return; }
      const now = performance.now(); left -= (now - last) / 1000; last = now;
      const pc = root.querySelector('#pc'), bar = root.querySelector('#pcbar');
      if (pc) pc.textContent = Math.max(0, Math.ceil(left)); if (bar) bar.style.width = `${Math.max(0, left / 40 * 100)}%`;
      if (left <= 0 && G.state.possession === G.playerSide) {
        left = 40; const s = G.state; s.ballOn = Math.max(1, s.ballOn - 5); s.toGo += 5; s.clockRunning = false;
        R.log(s, 'Delay of game: 5-yard penalty.', 'info'); G.lastEvent = { text: 'Delay of game, 5-yard penalty.', important: false }; G.aiCall = null; app.save(); Router.render();
      } else if (left <= 0) left = 40;
    }, 250);
  }
}

/** The other coach's words before the lineups (GDD §15.5): portrait, lines, and one reply the player may give. */
function talkHtml(f) {
  const t = F.pregameTalk(f); if (!t) return '';
  const hue = t.speaker.element ? (TYPES[t.speaker.element]?.hue ?? 120) : null;
  const chosen = t.replies.find((r) => r.id === t.reply);
  return `<div class="talk ${t.kind}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">${portraitSprite(t.speaker.portrait, 48, { hue })}<div class="grow" style="min-width:0"><div class="muted" style="font-size:11px;letter-spacing:.06em">${esc(t.speaker.name).toUpperCase()} · ${esc(t.title)}</div>${t.lines.map((l) => `<p class="talk-line">“${esc(l)}”</p>`).join('')}</div></div>
    ${t.replies && t.replies.length && t.kind !== 'ordinary' ? (chosen ? `<div class="talk-reply"><span class="dim">You:</span> “${esc(chosen.label)}” <span class="dim">· ${esc(chosen.text)}</span></div>` : `<div class="talk-replies">${t.replies.map((r) => `<button class="btn small" data-action="reply" data-v="${r.id}" title="${esc(r.text)}">${esc(r.label)}</button>`).join('')}</div>`) : ''}</div>`;
}
