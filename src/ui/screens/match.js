// Sunday: pregame lineups and the pregame Beast Clash for possession (GDD §26.2), then the live match screen.
// The screen only collects the human's choices; rules.js and game-runner.js
// do everything else, exactly as they do for the simulated league.

import { esc, delegate, toast, sheet, fmtClock, confirmSheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import * as Save from '../../franchise/save.js';
import * as R from '../../sim/rules.js';
import { momentSheet } from '../tutorial.js';
import { isExpert } from '../../franchise/assist.js';
import * as AI from '../../sim/coach-ai.js';
import { step, aiController, newTendencies } from '../../sim/game-runner.js';
import { rngFromState } from '../../core/rng.js';
import { PLAYS } from '../../data/playbook.js';
import { TRAINING_FOCI } from '../../data/staff.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { fieldSvg, FIELD_VIEWBOX, presnapLook, cameraFor } from '../field-view.js';
import { playCardSvg } from '../play-art.js';
import { monsterSprite, portraitSprite } from '../pixel-monster.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { beatenLines } from '../../data/dialogue.js';
import { TYPES, SPECIES_BY_ID, resolveSpecies } from '../../data/monsters.js';
const BADGE_LINES = ['Well played. Don’t get used to it.', 'You earned that one. Keep it polished for me.', 'I had you beaten on tape. Tape lies, apparently.', 'My monsters will remember this.', 'The league will hear about you now.', 'Fine. Take it. We’ll talk next season.', 'That was football. Respect.', 'Eight badges is a long road. You’re on it.'];
import { fieldGoalDistance, yardLabel } from '../../core/field.js';
import { teamOverall } from '../../franchise/roster.js';
import { boxScoreHtml } from '../box-score.js';
import { kickFrames } from '../kick-anim.js';
import { buildFx, shakeBetween, endHold } from '../ability-fx.js';
import { matchupEdges } from '../../sim/type-matchups.js';
import { weatherClass } from '../stadium-art.js';
import { venueHtml } from '../stadium-preview.js';
import { replayReason, replayPlan, replayPosition, REPLAY } from '../replay.js';
import { openMatchupPanel } from '../type-chart.js';

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
        <button class="btn primary big block" data-action="toss">⚔️ Beast Clash for possession →</button></div>`;
    },
    mount(root) {
      delegate(root, {
        reply: (el) => { const r = F.replyToCoach(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        toss: () => { const pv = F.pregamePreview(app.f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'pregame' }); },
      });
    },
  });

  /** Comeback mode and scheme lock, shown while they apply (GDD §17). */
  function edgeStrip(f, s, teams, me) {
    const bits = [];
    const cb = R.comebackSide(s);
    if (cb) bits.push(`<span class="edge-chip comeback ${cb === me ? 'mine' : ''}">🔥 COMEBACK · ${esc(s[cb].abbr)} +${s.comeback.edge}</span>`);
    else if (s.comeback && s.quarter < 4 && !s.finished) bits.push(`<span class="edge-chip dim">Comeback mode: trail by ${s.comeback.margin}+ in the 4th</span>`);
    const lock = teams[me]?.schemeLock; if (lock?.offense) bits.push('<span class="edge-chip scheme mine">✦ SCHEME LOCK · offense</span>'); if (lock?.defense) bits.push('<span class="edge-chip scheme mine">✦ SCHEME LOCK · defense</span>');
    const them = R.opponent(me); const tl = teams[them]?.schemeLock; if (tl?.offense || tl?.defense) bits.push('<span class="edge-chip scheme">✦ Their scheme is locked</span>');
    return bits.length ? `<div class="edge-strip">${bits.join('')}</div>` : '';
  }
  startSundayGame = (f) => {
    const m = F.sundayMatchup(f); const toss = F.pregamePossession(f);
    const state = R.newGame({ home: m.home, away: m.away, venue: F.gameVenue(f, m.home.name), seed: rngFromState(f.rngState).seed(), quarterLength: f.settings.quarterLength, coinWinner: toss.coinWinner, choice: toss.choice, comeback: F.comebackRule(f), otPeriods: F.OT_PERIODS });
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
      const s = G.state; const me = G.playerSide, them = R.opponent(me);
      const myBall = s.possession === me;
      const teams = teamsFor(f);
      const look = presnapInfo(f, teams);
      const offenseTeamSide = s.possession;
      const offColor = s[offenseTeamSide].color, defColor = s[R.opponent(offenseTeamSide)].color;
      const fieldInner = anim
        ? fieldSvg({ venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), frame: anim.frames[anim.i], ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, event: G.event, noLines: anim.follow, sprites: spritesFor(f, anim.ev.offenseSide) })
        : fieldSvg({ venue: G.state.venue, ballOn: s.ballOn, ballLat: s.ballLat, toGo: s.toGo, colors: { off: offColor, def: defColor }, frame: null, presnap: look.presnap, typeIcons: typeIconsFor(f, teams, look), ownLabel: s[s.possession].abbr, oppLabel: s[R.opponent(s.possession)].abbr, event: G.event, sprites: spritesFor(f, s.possession) });
      const sit = s.finished ? 'FINAL' : s.phase === 'scrimmage' ? `${s[s.possession].abbr} ${R.situationText(s).replace('OWN', 'own').replace('OPP', 'opp')}` : s.phase === 'try' ? 'Try' : s.phase === 'kickoff' ? 'Kickoff' : s.phase === 'free_kick' ? 'Free kick' : '';
      const ab = G.lastEvent?.abilities?.length ? `<div class="ability-strip">${G.lastEvent.abilities.slice(0, 3).map((x) => `<span class="${x.team === me ? 'mine' : ''} ${x.trait ? 'trait' : ''}">${x.trait ? '·' : '⚡'} ${esc(x.who)} · ${esc(x.what)}</span>`).join('')}</div>` : '';
      const co = G.lastEvent?.callout; const fresh = !!G.lastEvent?.fresh; if (G.lastEvent) G.lastEvent.fresh = false; // the pop plays once, not on every re-render
      const banner = G.lastEvent ? `<div class="field-banner ${G.lastEvent.important ? 'important' : ''} ${co ? `tier-${co.tier} ${co.mine === true ? 'mine' : co.mine === false ? 'theirs' : ''}` : ''} ${fresh ? 'fresh' : ''}" id="banner">${co && co.tier !== 'routine' ? `<div class="callout">${esc(co.text)}</div>` : co ? `<span class="callout small">${esc(co.text)}</span> ` : ''}${esc(G.lastEvent.text)}${ab}</div>` : '';
      const tdFlash = fresh && co?.tier === 'td' ? ` td-flash ${co.mine ? 'mine' : 'theirs'}` : fresh && co?.tier === 'turnover' ? ' to-flash' : '';
      const bump = (side) => (G.scoreSeen?.[side] != null && G.scoreSeen[side] !== s.score[side]) ? 'bump' : ''; const bumpA = bump('away'), bumpH = bump('home'); G.scoreSeen = { ...s.score };
      const eventBanner = G.event === 'rival' ? `<div class="rival-banner compact">⚔️ RIVALRY GAME · ${esc(s[them].name)} · GM ${esc(f.rivals[f.tier]?.gm || '')}</div>` : G.event === 'playoff' ? `<div class="rival-banner compact" style="border-color:#f5c542;background:linear-gradient(90deg,#4a3a0a,#2a2008)">🏆 PLAYOFFS · ${esc(G.tag || 'Win or go home')}</div>` : '';
      return `${eventBanner}
        <div class="scoreboard" aria-live="polite">
          <div class="team"><span class="pos" style="visibility:${s.possession === 'away' && !s.finished ? 'visible' : 'hidden'}"></span><span class="abbr"><span style="color:${s.away.color}">${esc(s.away.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.away)}${'○'.repeat(3 - s.timeouts.away)}</span></span><span class="score ${bumpA}">${s.score.away}</span></div>
          <div class="mid"><b>${s.finished ? 'FINAL' : R.quarterText(s)} ${s.ot ? '' : fmtClock(s.clock)}</b>${esc(sit)}${clockStateHtml(s, G, myBall)}</div>
          <div class="team right"><span class="score ${bumpH}">${s.score.home}</span><span class="abbr"><span style="color:${s.home.color}">${esc(s.home.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.home)}${'○'.repeat(3 - s.timeouts.home)}</span></span><span class="pos" style="visibility:${s.possession === 'home' && !s.finished ? 'visible' : 'hidden'}"></span></div>
        </div>
        <div class="situation"><span>${s.phase === 'scrimmage' && !s.finished ? `<b>${myBall ? 'YOUR BALL' : 'YOUR DEFENSE'}</b> · ${esc(spotFor(s.ballOn, myBall))}` : esc(sit)}</span><span>${me === 'home' ? 'Home' : 'Away'}${G.mode === 'key' ? ' · Key Moments' : ''}</span></div>
        ${edgeStrip(f, s, teams, me)}
        <div class="field-wrap${tdFlash}${venueClass(s.venue)}${anim?.replay ? ' replaying' : ''}" id="fieldwrap" aria-label="Football field"><svg id="field" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img">${fieldInner}</svg>${weatherLayer(f, s.venue)}${anim?.replay ? `<div class="replay-badge" role="status"><span class="rec">●</span> INSTANT REPLAY <b>${esc(anim.replay.reason.label)}</b></div><div class="replay-slow" aria-hidden="true">SLOW-MO</div>` : banner}</div>${!anim && presnapEdges.length ? '<div class="tm-legend"><span><b class="up">▲</b> type advantage</span><span><b class="down">▼</b> disadvantage</span><span>tap an icon</span></div>' : ''}
        <div id="controls">${controlsHtml(f, teams, look)}</div>`;
    },
    mount(root, ctx) {
      const f = app.f; if (!f?.game) { delegate(root, { hq: () => Router.go('hq', {}, { reset: true }) }); return; }
      { const G = f.game, st = G.state; if (!anim && !st.finished && st.quarter >= 3 && !G.halftimeShown) { G.halftimeShown = true; app.save(); sheet(boxScoreHtml(st, teamsFor(f), { title: 'Halftime' }), { title: 'Halftime' }); } }
      startPlayClock(f, root);
      scheduleAuto(f);
      delegate(root, {
        hq: () => Router.go('hq', {}, { reset: true }),
        log: () => showLog(f),
        pick: (el) => { const G = f.game; G.selected[el.dataset.side] = el.dataset.id; app.save(); Router.render(); },
        snap: () => act(f, {}),
        go: () => act(f, { fourthDown: 'go' }),
        punt: () => act(f, { fourthDown: 'punt' }),
        fg: () => act(f, { fourthDown: 'fg' }),
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
        simfinal: async () => { if (!(await confirmSheet('Let the coach play the rest of the game out instantly? You will see the final score and box score; no replays.', { title: 'Sim to final', okLabel: 'Sim it' }))) return; simToFinal(f); },
        skip: () => { if (anim) finishAnim(f, true); },
        replay: () => { if (!anim && lastReplay && lastReplay.gameKey === f.game?.state.seed) startReplay(f, lastReplay); },
        finish: () => finishGame(f),
        otclash: () => { const pv = F.overtimePreview(f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'overtime' }); },
        boxscore: () => sheet(boxScoreHtml(f.game.state, teamsFor(f), { title: `${R.quarterText(f.game.state)} ${fmtClock(f.game.state.clock)}` }), { title: 'Box score' }),
        kneel: () => { R.kneel(f.game.state); afterStep(f, { kind: 'kneel', text: f.game.state.lastPlay.text }); },
        spike: () => { R.spike(f.game.state); afterStep(f, { kind: 'spike', text: f.game.state.lastPlay.text }); },
      });
      root.querySelector('#fieldwrap')?.addEventListener('click', (e) => {
        // A type icon opens its matchup panel and nothing else: no skip, no selection, no snap.
        const icon = e.target.closest?.('.tm-icon'); if (icon) { e.stopPropagation(); e.preventDefault(); openTypeIcon(icon); return; }
        if (anim) finishAnim(f, true);
      });
      root.querySelector('#fieldwrap')?.addEventListener('keydown', (e) => { const icon = e.target.closest?.('.tm-icon'); if (icon && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openTypeIcon(icon); } });
      document.querySelector('.topbar [data-action="log"]')?.addEventListener('click', () => showLog(f));
      document.querySelector('.topbar [data-action="help"]')?.addEventListener('click', () => sheet(`${matchHelpHtml(f)}<button class="btn small" data-action="assist-help" data-screen="match" style="margin-top:8px">? More help (Coach Assist)</button>`, { title: 'How a match works' }));
      { const s1 = f.game?.state; if (s1?.finished && s1.needsTiebreak && !s1.winner && !document.querySelector('.sheet')) momentSheet(f, 'overtime', () => app.save()); } // Coach Assist: what the overtime Clash is, once
      { const s0 = f.game?.state; if (s0 && !s0.finished && s0.phase === 'scrimmage' && R.inTwoMinute(s0) && !document.querySelector('.sheet')) momentSheet(f, 'clock', () => app.save()); }
      document.querySelector('.topbar [data-action="box"]')?.addEventListener('click', () => sheet(boxScoreHtml(f.game.state, teamsFor(f), { title: f.game.state.finished ? 'Final' : `${R.quarterText(f.game.state)} ${fmtClock(f.game.state.clock)}` }), { title: 'Box score' }));
    },
    unmount() { clearTimeout(replayTimer); replayTimer = null; stopAnim(); clearInterval(playClockTimer); playClockTimer = null; clearTimeout(autoTimer); autoTimer = null; },
  });

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
      : { key, side, defense: AI.chooseDefensePlay(rng, s, team, team.defensePlays, G.tendencies[s.possession], teams[R.opponent(side)]) };
    G.aiCall = call;
    return call;
  }
  function presnapInfo(f, teams) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    if (s.phase !== 'scrimmage' || s.finished) return { presnap: null };
    const ai = aiCall(f, teams, them);
    if (s.possession === me) {
      const mine = G.selected.offense && teams[me].offensePlays.includes(G.selected.offense) ? G.selected.offense : null;
      const defLook = presnapLook(ai.defense);
      return { presnap: { play: mine ? PLAYS[mine] : null, offensePlay: mine ? PLAYS[mine] : presnapLook(teams[me].offensePlays[0]), defensePlay: defLook }, aiDefense: ai.defense, myPlay: mine };
    }
    const mine = G.selected.defense && teams[me].defensePlays.includes(G.selected.defense) ? G.selected.defense : null;
    const offLook = presnapLook(ai.offense);
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
    G.selected[side] = AI.suggestPlay(s, teams[me], plan, side, G.tendencies[myBall ? me : them], teams[them]) || plan[0];
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
      <h3>Calling plays</h3><p>Pick one of the six cards you set on Friday and press Snap; on defense pick a defense. ★ is the coach's suggestion; ✦ counters what you learned scouting; a greyed card needs a package you cannot field. <b>FG</b> kicks on any down when the kick is makeable.</p>
      <h3>Key Moments · Full Coaching · Auto · Sim</h3><p><b>Key Moments</b> simulates the routine downs and stops for the big ones; <b>Full Coaching</b> lets you call every snap. <b>Auto</b> calls the coach's plays for you (1× or 2×) until you stop it. <b>Sim to key moment</b> jumps ahead; <b>Sim to final</b> ends the game at once.</p>
      <h3>Edges</h3><p>${F.comebackRule(f) ? `<b>Comeback mode:</b> down ${F.COMEBACK.margin}+ in the fourth, either side plays with +${F.COMEBACK.edge}. ` : ''}<b>Scheme lock:</b> all starters on a side fitting the coordinator's scheme play with +${F.SCHEME_LOCK_EDGE}. Training (T) and media day (+) lifts show on the pregame lineup. Abilities fire on the strip under the field.</p>
      <h3>Type matchups</h3><p>Before the snap, a green <b>▲</b> or amber <b>▼</b> beside one of your monsters means a type advantage or disadvantage against the monster he is expected to face. Tap it to see the matchup. In the play, the edge (+4% or −4% on his side of a block, tackle, sack, separation or contested catch; Dragon +2% against neutral types) counts only against the monster he really meets. It never changes ratings. The Type Chart is under More and on every monster card.</p>`;
  }
  function controlsHtml(f, teams, look) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    // While a play animates in Auto, keep the Auto controls on screen so it can be stopped at any moment (no Skip: Auto is already watching the game for you).
    if (anim && G.auto) return `<div class="match-actions"><div class="secondary"><button class="btn primary big" data-action="auto" style="flex:2">Auto ■ stop</button><button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed" title="Auto speed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button></div><p class="dim center" style="margin:4px 0 0">Auto is calling the coach's plays. Stop and you take over on the next snap.</p>${anim.replay ? '<button class="btn block" data-action="skip" style="margin-top:6px">Skip replay ▸▸</button>' : ''}</div>`;
    if (anim) return `<div class="match-actions"><button class="btn block ${anim.replay ? 'primary' : ''}" data-action="skip">${anim.replay ? 'Skip replay ▸▸' : 'Skip ▸▸'}</button></div>`;
    // Auto stays stoppable in every phase it plays through (continues, kickoffs, tries), not only at the snap.
    const autoBar = G.auto && !s.finished ? `<div class="secondary" style="margin-bottom:6px"><button class="btn primary" data-action="auto" style="flex:2">Auto ■ stop</button><button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button></div>` : '';
    if (s.finished && s.needsTiebreak && !s.winner) { const n = F.inPlayoffs(f) ? 5 : 3; return `<div class="match-actions"><div class="panel center"><h2>STILL TIED</h2><div class="muted">${esc(s.away.name)} ${s.score.away}-${s.score.home} ${esc(s.home.name)} after overtime</div><p class="muted" style="margin:6px 0 0">A <b>${n}v${n} Beast Clash</b> decides the game. The football score stays as it is; the Clash winner takes the win.</p></div><button class="btn primary big block" data-action="otclash">⚔️ Overtime Beast Clash →</button></div>`; }
    if (s.finished) return `<div class="match-actions"><div class="panel center"><h2>${s.winner === me ? 'VICTORY' : s.winner === null ? 'TIE' : 'DEFEAT'}</h2><div class="muted">${esc(s.away.name)} ${s.score.away}-${s.score.home} ${esc(s.home.name)}${s.tiebreak ? ` (OT · won by ${s.tiebreak.size}v${s.tiebreak.size} Beast Clash)` : s.ot ? ' (OT)' : ''}</div></div><button class="btn primary big block" data-action="finish">Continue →</button></div>`;
    if (G.lastEvent?.needsContinue) return `<div class="match-actions">${autoBar}<button class="btn primary big block" data-action="continue">Continue →</button></div>`;
    if (s.phase === 'kickoff' || s.phase === 'free_kick') {
      const weKick = s.kickingTeam === me;
      return `<div class="match-actions">${autoBar}${weKick ? `<div class="primary-row ${s.phase === 'kickoff' ? 'three' : ''}" style="grid-template-columns:${s.phase === 'kickoff' ? '2fr 1fr' : '1fr'}"><button class="btn primary big" data-action="kickoff">${s.phase === 'free_kick' ? 'Free kick' : 'Kick off'}</button>${s.phase === 'kickoff' ? '<button class="btn" data-action="onside">Onside</button>' : ''}</div>` : `<button class="btn primary big block" data-action="kickoff">Receive the kick</button>`}</div>`;
    }
    if (s.phase === 'try') {
      if (s.tryTeam !== me) return `<div class="match-actions">${autoBar}<button class="btn primary big block" data-action="continue">Opponent's try: continue</button></div>`;
      const two = PLAYS; const plays = teams[me].offensePlays.filter((id) => PLAYS[id].tags.some((t) => ['short', 'goalline', 'redzone', 'quick'].includes(t)));
      return `<div class="match-actions">${autoBar}<p class="muted center" style="margin:0">Touchdown! Kick (${AI.tryDecision(s) === 'two' ? 'coach suggests two' : 'coach suggests the kick'})</p>
        <div class="primary-row" style="grid-template-columns:1fr 1fr"><button class="btn primary big" data-action="trykick">Kick PAT (+1)</button><button class="btn big" data-action="trytwo">Go for two</button></div>
        ${cards(plays, 'offense', G.selected.offense, null)}</div>`;
    }
    // Scrimmage.
    const myBall = s.possession === me;
    const side = myBall ? 'offense' : 'defense';
    const plan = teams[me][side === 'offense' ? 'offensePlays' : 'defensePlays'];
    const suggestion = AI.suggestPlay(s, teams[me], plan, side, G.tendencies[myBall ? me : them], teams[them]);
    const selected = look.myPlay;
    let primary;
    if (myBall && s.down === 4) {
      const fg = R.fieldGoalInfo(s, teams); const dec = AI.fourthDownDecision(s, teams[me]);
      primary = `<div class="primary-row three"><button class="btn ${dec === 'go' ? 'primary' : ''} big" data-action="snap" ${selected ? '' : 'disabled'}>Go for it</button><button class="btn ${dec === 'punt' ? 'primary' : ''} big" data-action="punt">Punt</button><button class="btn ${dec === 'fg' ? 'primary' : ''} big" data-action="fg">FG ${fg.distance} yd<br><small>${Math.round(fg.chance * 100)}%</small></button></div>`;
    } else primary = `<button class="btn primary big block" data-action="snap" ${selected ? '' : 'disabled'}>${myBall ? (selected ? `Snap · ${esc(PLAYS[selected].name)}` : 'Pick a play') : (selected ? `Set defense · ${esc(PLAYS[selected].name)}` : 'Pick a defense')}</button>`;
    // Early field goal: on any down, when the kick is makeable; highlighted when a half is about to end.
    let fgEarly = '';
    if (myBall && s.down < 4 && s.phase === 'scrimmage') { const fg = R.fieldGoalInfo(s, teams); if (fg.chance >= 0.2) fgEarly = `<button class="btn small ${!s.ot && s.clock <= 30 && (s.quarter === 2 || s.quarter >= 4) ? 'good' : ''}" data-action="fg" title="Kick now instead of running a play">FG ${fg.distance} yd · ${Math.round(fg.chance * 100)}%</button>`; }
    const secondary = `<div class="secondary">
      <button class="btn small" data-action="timeout" ${s.timeouts[me] ? '' : 'disabled'}>Timeout (${s.timeouts[me]})</button>
      ${myBall ? `<select class="btn small" data-change="tempo" aria-label="Tempo" style="min-height:36px;margin:0;flex:1"><option value="normal" ${(G.tempo || 'normal') === 'normal' ? 'selected' : ''}>Tempo: normal</option><option value="hurry" ${G.tempo === 'hurry' ? 'selected' : ''}>Tempo: hurry-up</option><option value="milk" ${G.tempo === 'milk' ? 'selected' : ''}>Tempo: milk clock</option></select>` : ''}
      ${fgEarly}
      ${myBall && AI.shouldKneel(s) ? '<button class="btn small" data-action="kneel">Kneel</button>' : ''}${myBall && !s.ot && s.clockRunning && s.quarter >= 2 && s.clock < 60 ? '<button class="btn small" data-action="spike">Spike</button>' : ''}
      <button class="btn small ${G.auto ? 'primary' : ''}" data-action="auto" title="Auto: the coach's suggested plays are called for you, every play animated, until you turn it off">${G.auto ? 'Auto ■ stop' : 'Auto ▶'}</button>
      ${G.auto ? `<button class="btn small ${(G.autoSpeed || 1) === 2 ? 'primary' : ''}" data-action="autospeed" title="Auto speed">${(G.autoSpeed || 1) === 2 ? '2× ▶▶' : '1× ▶'}</button>` : ''}
      <button class="btn small" data-action="mode">${G.mode === 'key' ? 'Key Moments ✓' : 'Full Coaching ✓'}</button>
      <button class="btn small" data-action="simfinal" title="Skip the rest of the game">Sim to final ⏭</button>
      ${lastReplay && lastReplay.gameKey === s.seed ? `<button class="btn small" data-action="replay" title="Watch the last big play again: ${esc(lastReplay.reason.label.toLowerCase())}">📼 Replay</button>` : ''}
      ${G.mode === 'key' ? '<button class="btn small good" data-action="keymoment">Sim to key moment ▸</button>' : ''}</div>`;
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
    G.lastEvent = null; G.aiCall = null;
    const ev = step(s, teams, controllers, G.tendencies, c);
    if (ev) { ev.offenseSide = offenseSide; ev.toGo = toGo; ev.down = down; }
    afterStep(f, ev);
  }
  /** The human side: never auto-kneels, spikes or burns timeouts; tempo comes from the UI. */
  function humanController(side, G) {
    const ai = aiController(side);
    return { ...ai, timeoutOnDefense: () => false, timeoutOnOffense: () => false, kneel: () => false, spike: () => false, tempo: () => G.tempo || 'normal' };
  }
  function afterStep(f, ev) {
    const G = f.game;
    if (!ev) { app.save(); Router.render(); return; }
    if (ev.sim && ev.sim.frames?.length > 1 && !f.settings.reducedMotion) { startAnim(f, ev); return; }
    if (!ev.sim && !f.settings.reducedMotion && (ev.kind === 'kickoff' || ev.kind === 'punt' || ev.kind === 'field_goal')) {
      const frames = kickFrames(ev);
      if (frames?.length > 1) { ev.offenseSide = ev.kicking; ev.sim = { frames, ballOn: 0, ballLat: 0, kick: true }; startAnim(f, ev); return; }
    }
    G.lastEvent = { text: ev.text, important: ev.scored || KEY_RESULTS.has(ev.sim?.result) || ev.kind === 'field_goal', needsContinue: false, abilities: abilitiesFired(ev), callout: callout(ev, G.playerSide), fresh: true };
    app.save(); Router.render();
  }
  function startAnim(f, ev) {
    const G = f.game; const sim = ev.sim;
    anim = { frames: sim.frames, i: 0, ev, camera: sim.kick ? cameraFor(Math.max(0, sim.frames[0].ball[0] + 6)) : cameraFor(sim.ballOn), ballOn: sim.ballOn, ballLat: sim.ballLat, start: performance.now(), msPerFrame: 100 / ((f.settings.speed || 1) * (G.auto ? (G.autoSpeed || 1) : 1)), follow: !!sim.kick, sprites: spritesFor(f, ev.offenseSide || G.state.possession) };
    anim.fx = sim.kick ? null : buildFx(sim, fxLookup(f, ev.offenseSide || G.state.possession));
    G.lastEvent = null;
    Router.render();
    const tick = (now) => {
      if (!anim) return;
      // requestAnimationFrame timestamps can sit a hair before the performance.now() taken at start: clamp at frame 0, never finish early.
      const raw = Math.max(0, Math.floor((now - anim.start) / anim.msPerFrame));
      const idx = Math.min(sim.frames.length - 1, raw);
      if (!sim.frames.length) { finishAnim(f, false); return; } // a play with no frames (nothing to draw)
      // End-of-play hold: keep drawing the last frame while an effect that fired at the whistle plays out.
      if (raw > sim.frames.length - 1 && anim.fx && !anim.follow) {
        const last = sim.frames[sim.frames.length - 1]; const extra = (raw - (sim.frames.length - 1)) * 0.1; const hold = anim.hold ??= endHold(anim.fx, last.t ?? 0);
        const svg2 = document.querySelector('#field');
        if (extra < hold && svg2 && now - (anim.holdDrawn || 0) >= 33) { anim.holdDrawn = now; const s2 = G.state; svg2.innerHTML = fieldSvg({ venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), frame: last, prevFrame: last, fx: anim.fx, fxQuality: fxQualityFor(f), time: (last.t ?? 0) + extra, ownLabel: s2[anim.ev.offenseSide].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites }); anim.raf = requestAnimationFrame(tick); return; }
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
        if (anim.follow) { const target = cameraFor(sim.frames[idx].ball[0] + 4); anim.camera = { bottom: anim.camera.bottom + (target.bottom - anim.camera.bottom) * 0.35, top: 0 }; anim.camera.top = anim.camera.bottom + (target.top - target.bottom); }
        const prevT = sim.frames[Math.max(0, idx - 1)].t ?? 0, ft = sim.frames[idx].t ?? 0;
        const drawFrame = half ? midFrame(sim.frames[idx], sim.frames[idx + 1]) : sim.frames[idx];
        svg.innerHTML = fieldSvg({ venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), frame: drawFrame, prevFrame: sim.frames[idx - 1] || null, fx: anim.fx, fxQuality: fxQualityFor(f), ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites });
        if (idx > 0 && !half && shakeBetween(anim.fx, prevT, ft)) shakeField(f);
        if (performance.now() - t0 > 18) anim.slow = true; // this device cannot afford half-steps: back off for the rest of the play
      }
      if (idx >= sim.frames.length - 1 && !(anim.fx && !anim.follow && endHold(anim.fx, sim.frames[sim.frames.length - 1].t ?? 0) > 0)) { finishAnim(f, false); return; }
      anim.raf = requestAnimationFrame(tick);
    };
    anim.raf = requestAnimationFrame(tick);
  }
  /** Monster art for the field (null = simple circles/squares, per Settings). */
  function spritesFor(f, offSide) {
    if (f.settings.fieldMarkers === 'simple') return null;
    const T = teamsFor(f); const defSide = R.opponent(offSide);
    const pack = (team) => { const map = { ...team.offense, ...team.defense }; const pool = Object.values(map).filter((m) => m?.id); return { map, pool: team.kicker?.id ? [team.kicker, ...pool] : pool }; };
    const off = pack(T[offSide]), def = pack(T[defSide]);
    return { off: { map: T[offSide].offense, pool: off.pool }, def: { map: T[defSide].defense, pool: def.pool } };
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
    G.lastEvent = { text: ev.text, important: !!ev.scored || KEY_RESULTS.has(ev.sim?.result), needsContinue: false, abilities: abilitiesFired(ev), callout: callout(ev, G.playerSide), fresh: true };
    app.save(); Router.render();
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
    const plan = replayPlan(sim, rp.reason);
    anim = { replay: rp, plan, frames: sim.frames, i: plan.i0, ev: rp.ev, camera: sim.kick ? cameraFor(Math.max(0, sim.frames[plan.i0].ball[0] + 6)) : cameraFor(sim.ballOn), ballOn: sim.ballOn, ballLat: sim.ballLat, follow: !!sim.kick, sprites: spritesFor(f, rp.ev.offenseSide || G.state.possession), start: performance.now() + REPLAY.transitionMs };
    anim.fx = sim.kick ? null : buildFx(sim, fxLookup(f, rp.ev.offenseSide || G.state.possession));
    if (G.lastEvent) G.lastEvent.fresh = false; // the touchdown flash and score pulse belong to the live play only
    Router.render();
    const zoomOn = !f.settings.reducedMotion;
    const tick = (now) => {
      if (!anim?.replay) return;
      const pos = replayPosition(plan, now - anim.start);
      if (pos.done) { endReplay(f); return; }
      const svg = document.querySelector('#field'); const wrap = document.querySelector('#fieldwrap');
      const key = pos.i * 4 + Math.floor(pos.k * 4);
      if (svg && key !== anim.key) {
        anim.key = key; anim.i = pos.i;
        const a = sim.frames[pos.i], b = sim.frames[Math.min(plan.i1, pos.i + 1)];
        const frame = pos.k >= 0.5 && b !== a ? midFrame(a, b) : a;
        if (anim.follow) { const target = cameraFor(a.ball[0] + 4); anim.camera = { bottom: anim.camera.bottom + (target.bottom - anim.camera.bottom) * 0.35, top: 0 }; anim.camera.top = anim.camera.bottom + (target.top - target.bottom); }
        const s2 = G.state;
        svg.innerHTML = fieldSvg({ venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), frame, prevFrame: sim.frames[pos.i - 1] || null, fx: anim.fx, fxQuality: fxQualityFor(f), ownLabel: s2[anim.ev.offenseSide || s2.possession].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide || s2.possession)].abbr, camera: anim.camera, event: G.event, noLines: true, sprites: anim.sprites, time: frame.t });
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
    Router.render();
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
      const m = look(e.side, e.by); const sp = m?.species ? SPECIES_BY_ID[m.species] : null; const ab = sp?.ability;
      if (!ab || seen[ab.name]) continue;
      seen[ab.name] = true; app.save();
      const side = e.side === 'off' ? off : R.opponent(off); const yours = side === G.playerSide; const club = G.state[side]?.name || '';
      if (G.auto) { toast(`✨ ${ab.name} (${m.name}, ${yours ? 'yours' : club}): ${ab.text}`, 'good', 5000); return; }
      sheet(`<p style="margin-top:0"><b>${esc(m.name)}</b> ${yours ? '(yours)' : `of the ${esc(club)}`} just used <b>${esc(ab.name)}</b>.</p><p class="muted">${esc(ab.text)}</p><p class="dim" style="font-size:12px">Every signature ability belongs to one monster in the league. You will see this tip once per ability.</p><button class="btn small see-it" data-see-it="${sp.id}">▶ See it again</button>`, { title: `✨ ${ab.name}` });
      return;
    }
  }
  /** "Flaroo's Quick Feet kicks in" → "Flaroo · Quick Feet". */
  function abilityLabel(e) { const m = /^(.*)'s (.*) kicks in$/.exec(e.text || ''); return m ? m[2] : 'ability'; }
  function abilitiesFired(ev) { const off = ev.offenseSide || 'home'; return (ev.sim?.events || []).filter((e) => e.kind === 'ability').sort((a, b) => (a.trait ? 1 : 0) - (b.trait ? 1 : 0)).map((e) => { const m = /^(.*)'s (.*) kicks in$/.exec(e.text || ''); return { team: e.side === 'off' ? off : R.opponent(off), who: m ? m[1] : e.by, what: m ? m[2] : 'ability', trait: !!e.trait }; }); }
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } document.querySelector('#fieldwrap')?.classList.remove('shake'); }
  /** Species lookup for the effect layer: team side + slot → { element, name }. */
  function fxLookup(f, offSide) {
    const T = teamsFor(f); const defSide = R.opponent(offSide);
    return (team, slot) => { const m = (team === 'off' ? T[offSide].offense : T[defSide].defense)?.[slot]; if (!m) return null; const sp = resolveSpecies(m); return { element: sp?.element || m.type || null, name: m.name, species: sp?.id || null }; };
  }
  function fxQualityFor(f) { return f.settings.reducedMotion ? 'min' : f.settings.fieldMarkers === 'simple' ? 'low' : 'full'; }
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
    if (lines.length > 1) sheet(`<div class="log">${lines.map((l) => `<div class="entry"><span class="t"></span><span>${esc(l)}</span></div>`).join('')}</div>`, { title: 'Simulated plays' });
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
    sheet(`<div class="log">${s.log.slice().reverse().map((e) => `<div class="entry ${e.important ? 'important' : ''}"><span class="t">${R.quarterText({ quarter: e.q })} ${fmtClock(e.clock)}</span><span>${esc(e.text)}${e.repro ? `<br><small class="dim mono">repro ${esc(e.repro)}</small>` : ''}</span></div>`).join('')}</div><p class="dim">A repro code replays that exact play: <span class="mono">node tests/tools/replay.js CODE</span>.</p>`, { title: 'Play-by-play' });
  }

  function finishGame(f) {
    const G = f.game; const s = G.state; const me = G.playerSide;
    const won = s.winner === me;
    const teams = teamsFor(f);
    const r = F.finishSunday(f, s); app.save(); Save.backup(f);
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
        <button class="btn primary big block" data-action="shake" style="margin-top:10px">🤝 Shake hands</button></div>`, { title: 'Midfield', onClose: celebrate });
      document.querySelector('.sheet [data-action="shake"]')?.addEventListener('click', () => close());
    };
    const celebrate = () => {
      if (!gym) return toHq();
      const hue = TYPES[gym.element]?.hue ?? 120; const n = Object.keys(f.campaign.badges).length; const sp = SPECIES_BY_ID[gym.legendary];
      const { close } = sheet(`<div class="badge-win" style="--hue:${hue}"><div class="badge-win-ring"><span>★</span></div><div class="badge-win-title">BADGE EARNED</div><div class="badge-win-name">${esc(gym.badge)}</div>
        <p class="muted">${esc(gym.coach.name)} and the ${esc(badgeClub)} fall, ${s.score[me]}-${s.score[R.opponent(me)]}. That's badge ${n} of 8.</p>
        <div class="row" style="justify-content:center;gap:10px">${portraitSprite(gym.coach.portrait, 44, { hue })}<p class="talk-line" style="margin:0;max-width:26ch">“${esc(BADGE_LINES[n % BADGE_LINES.length])}”</p></div>
        ${sp ? `<p class="dim" style="margin-top:8px">${esc(sp.name)}, their legendary, can now be tracked when you win the Beast Bowl.</p>` : ''}
        <button class="btn primary big block" data-action="badge-ok" style="margin-top:8px">Continue</button></div>`, { title: 'Gym cleared', onClose: toHq });
      document.querySelector('.sheet [data-action="badge-ok"]')?.addEventListener('click', () => close());
    };
    // The final whistle (2026-10-22 presentation pass): a result hero weighted to the occasion, the box score, then what the
    // game did to the roster: XP for every starter, level-ups with the rating change, injuries.
    const them = R.opponent(me); const tag = G.tag || ''; const champ = G.event === 'playoff' && /final|bowl/i.test(tag); const playoff = G.event === 'playoff';
    const diff = s.score[me] - s.score[them]; const feel = won ? (champ ? 'BEAST BOWL CHAMPIONS' : playoff ? 'PLAYOFF WIN' : diff >= 17 ? 'DOMINANT WIN' : diff <= 3 ? 'NARROW WIN' : 'VICTORY') : (champ ? 'BEAST BOWL LOST' : playoff ? 'SEASON OVER' : diff >= -3 ? 'NARROW LOSS' : 'DEFEAT');
    const hero = `<div class="final-hero ${won ? 'won' : 'lost'} ${champ ? 'champ' : playoff ? 'playoff' : ''}"><div class="final-feel">${feel}</div><div class="final-score"><span style="color:${s[me].color}">${esc(s[me].abbr)}</span> ${s.score[me]} <span class="dim">–</span> ${s.score[them]} <span style="color:${s[them].color}">${esc(s[them].abbr)}</span></div><div class="dim">${esc(tag || `Week ${f.season.week}`)}${otTag}${G.event === 'rival' ? ' · ⚔️ rivalry' : ''}</div></div>`;
    const xpRows = ev.filter((e) => e.kind === 'xp').sort((a, b) => b.amount - a.amount);
    const lvl = ev.filter((e) => e.kind === 'levelup' || e.kind === 'evolve'); const inj = ev.filter((e) => e.kind === 'injury');
    const after = `${lvl.length ? `<h3>Level-ups</h3><div class="list">${lvl.map((e) => e.kind === 'evolve' ? `<div class="item static good"><div class="grow"><div class="name">✨ EVOLUTION · ${esc(e.from)} → ${esc(e.to)}</div></div></div>` : `<div class="item static"><div class="grow"><div class="name">⬆️ ${esc(e.name)} · level ${e.level}</div><div class="sub">${e.from} → <b style="color:var(--good)">${e.to}</b> OVR${f.settings.autoPoints ? '' : ' · 2 points to spend on the Roster'}</div></div></div>`).join('')}</div>` : ''}
      ${inj.length ? `<h3>Injuries</h3><div class="list">${inj.map((e) => `<div class="item static" style="border-color:var(--bad)"><div class="grow"><div class="name" style="color:var(--bad)">🩹 ${esc(e.name)}</div><div class="sub">${esc(e.severity)} · out ${e.weeks} week${e.weeks === 1 ? '' : 's'}</div></div></div>`).join('')}</div>` : ''}
      ${xpRows.length ? `<h3>Experience</h3><div class="xp-grid">${xpRows.slice(0, 12).map((x) => `<div class="xp-row"><span class="xp-name">${esc(x.name)} <span class="dim">${esc(x.position)}</span></span><span class="xp-amt">+${x.amount}</span><div class="bar"><i style="width:${Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div><span class="dim mono xp-lv">Lv ${x.level}</span></div>`).join('')}${xpRows.length > 12 ? `<p class="dim">and ${xpRows.length - 12} more starters.</p>` : ''}</div>` : ''}
      ${!lvl.length && !inj.length ? '<p class="dim">No injuries. Fatigue builds with every game and recovers through the week.</p>' : ''}`;
    sheet(`${hero}${box}${after}`, { title: gym ? 'Final · badge game' : champ ? 'Beast Bowl' : playoff ? 'Final · playoffs' : 'Final', onClose: handshake });
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
