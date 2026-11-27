import { presnapReadiness } from '../fx/match-fx.js';
import { beastSpeciesHtml } from '../beast-identity.js';
import { autoSpeed, cycleAutoSpeed } from '../phone-navigation.js';
import { matchLogMatches } from '../match-log-filter.js';
import { activityPaused } from '../activity.js';
import { iconifyMarkup, infoIcon } from '../icons.js';
import { crowdTalk, showCrowdTalk } from '../stadium-crowd.js';
import { surroundHtml, setStadiumScene, stadiumScene, standsDepth, lookFor, introPlateHtml, kickoffRevealHtml, REVEAL_MS, stadiumReaction, introReaction, playStadiumReaction, stopStadiumReaction, resumeStadiumReaction, layoutSurround, stadiumFxLevel } from '../stadium-fx.js';
import { crowdFor } from '../stadium-crowd.js';
import { guideFootball, guideMoment } from '../guided-week.js';
import { recorder } from '../../testing/recorder.js';
import { eligiblePlays } from '../../sim/substitutions.js';
import { substitutionStrip, openSubstitutions } from '../coaching-substitutions.js';
import { zonePlans, zonePlannerHtml, zonePlannerOverlay } from '../zone-planner.js';
import { setZoneChoice } from '../../sim/t8/zone-planning.js';
// Sunday: pregame lineups and the pregame Beast Clash for possession (GDD §26.2), then the live match screen.
// The screen only collects the human's choices; rules.js and game-runner.js
// do everything else, exactly as they do for the simulated league.

import { abilityInfo } from '../ability-info.js';
import { esc, delegate, toast, sheet, fmtClock, confirmSheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import * as R from '../../sim/rules.js';
import { momentSheet } from '../tutorial.js';
import { automaticTipsOff } from '../../franchise/assist.js';
import * as AI from '../../sim/coach-ai.js';
import { step, aiController, newTendencies } from '../../sim/game-runner.js';
import { rngFromState } from '../../core/rng.js';
import { PLAYS } from '../../data/playbook.js';
import { TRAINING_FOCI } from '../../data/staff.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { MatchCamera, ZoomCrop } from '../match-camera.js';
import { fieldSvg, fieldDraw, fieldViewBox, presnapLook, cameraFor, cameraFrom, fitFieldSpan, fieldSpan } from '../field-view.js';
import { playCardSvg } from '../play-art.js';
import { monsterSprite, portraitSprite } from '../pixel-monster.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { isBeastBowlTag, TEAM_META, teamInk } from '../../data/league.js';
import { beatenLines } from '../../data/dialogue.js';
import { TYPES, SPECIES_BY_ID, resolveSpecies } from '../../data/monsters.js';
const BADGE_LINES = [$t('match.well_played_dont_get_used_to'), $t('match.you_earned_that_one_keep_it'), $t('match.i_had_you_beaten_on_tape'), $t('match.my_monsters_will_remember_this'), $t('match.the_league_will_hear_about_you'), $t('match.fine_take_it_well_talk_next'), $t('match.that_was_football_respect'), $t('match.eight_badges_is_a_long_road')];
import { fieldGoalDistance, yardLabel } from '../../core/field.js';
import { teamOverall } from '../../franchise/roster.js';
import { boxScoreHtml } from '../box-score.js';
import { buildFx, shakeBetween, endHold } from '../ability-fx.js';
import { kickPlay, presnapFields, presnapFx, createRevealClock, abilityTicks, absentMonsters, dexAbilityName, createAbsenceTracker, servedVacancies, inspectInfo, lastPlayNotes, findMonster, conditionalNotes } from '../fx/match-fx.js';
import { fxOptionsFor, reducedFlash } from '../flash-pref.js';
import { matchupEdges } from '../../sim/type-matchups.js';
import { venueHtml } from '../stadium-preview.js';
import { gameKits, kitJersey } from '../team-kit.js';
import { teamLogo } from '../team-logo.js';
const kitMemo = new Map(); const gameKitsFor = (s) => { const k = `${s.home.name}|${s.away.name}`; if (!kitMemo.has(k)) kitMemo.set(k, gameKits(s.home.name, s.away.name)); return kitMemo.get(k); };
import { replayReason, replayPlan, replayPosition, REPLAY } from '../replay.js';
import { qbReadsShown } from '../qb-read-ui.js';
import { openMatchupPanel } from '../type-chart.js';
import { hauntHtml } from '../stadium-haunt.js';
import { captainsOf } from '../../franchise/partnerships.js';
import { postGameHtml } from '../captains-ui.js';
import { t as $t, lineText } from '../../text/index.js';

/** Start Sunday's game from the settled pregame Clash (set by registerMatchScreens; the battle screen calls it). */
export let startSundayGame = null;

// Owner revision 2026-11-15 (Prism Break): when the player's charged Prismara faces two or more enemy zones, the play-call screen
// lists them (nearest first) and outlines them on the field; nothing is removed until the player picks or snaps (Auto = nearest).
/** The zoom button's magnifier: + to zoom in, − to zoom back out (owner play test 2026-11-26). */
const zoomIcon = (zoomed) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>${zoomed ? '' : '<line x1="10" y1="7" x2="10" y2="13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;
function prismPickerHtml(s) {
  const c = s.t8?.preChoice?.prismChoice; if (!c?.options?.length) return '';
  const btn = (id, label, primary) => `<button class="btn small ${primary ? 'primary' : 'ghost'}" data-action="prismpick" data-choice="${esc(id)}" style="min-height:44px">${esc(label)}</button>`;
  return `<div class="panel tight zone-planner" role="region" aria-label="Prism Break target"><b>◇ Prism Break is ready</b><p class="dim" style="font-size:12px;margin:4px 0">Choose which enemy zone to shatter. Snapping without a choice breaks the nearest one.</p><div class="row" style="gap:5px;flex-wrap:wrap">${btn('auto', `Nearest (Auto) · ${c.options[0].type}`, true)}${c.options.map((o, i) => btn(o.id, `${o.type}${o.kind === 'overlap' ? ' overlap' : ' zone'} · ${o.dist} yd${i === 0 ? ' · nearest' : ''}`, false)).join('')}</div></div>`;
}
function prismOverlay(s, camera) {
  const c = s.t8?.preChoice?.prismChoice; if (!c?.options?.length) return '';
  const dir = s.possession === 'home' ? 1 : -1;
  return c.options.map((o, i) => { const ys = o.yard.map((y) => (dir === 1 ? y : 100 - y)), ls = o.lat.map((y) => dir * y);
    const x = Math.min(...ls), y = camera.top - Math.max(...ys), w = Math.max(...ls) - x, h = Math.max(...ys) - Math.min(...ys); const col = i === 0 ? '#ffffff' : '#c9f0ff';
    return `<g data-action="prismpick" data-choice="${esc(o.id)}" role="button" tabindex="0" aria-label="${esc(`Shatter the ${o.type} zone`)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" fill-opacity="0.08" stroke="${col}" stroke-width="0.32" stroke-dasharray="0.6 0.4"/><text x="${x + w / 2}" y="${y + h / 2 + 0.5}" text-anchor="middle" fill="${col}" stroke="#14281f" stroke-width="0.12" paint-order="stroke" font-size="1.4" font-weight="bold" pointer-events="none">◇ ${esc(o.type)}</text></g>`; }).join('');
}
export function conversionCallout(ev, playerSide) {
  const mine = ev.tryTeam === playerSide;
  const defensiveScore = ev.sim?.stats?.defensiveScore;
  if (defensiveScore || ev.good) {
    const twoPoints = defensiveScore || ev.offensePlayId != null;
    return { tier: 'score', text: $t(twoPoints ? 'match.two_points' : 'match.extra_point'),
      mine: defensiveScore ? !mine : mine };
  }
  return { tier: 'loss', text: $t('match.no_good'), mine: !mine };
}

export function playResultCallout(ev, me, teams) {
  const result = ev.sim?.result || ev.outcome?.result;
  const stats = ev.sim?.stats;
  const offense = ev.offenseSide;
  const defense = offense ? R.opponent(offense) : null;
  const lines = [];

  if (result === 'throwaway') lines.push($t('match.pass_thrown_away'));
  if (result === 'incomplete') {
    lines.push(stats?.pbuBy ? $t('match.pass_broken_up')
      : stats?.dropped ? $t('match.pass_dropped') : $t('match.pass_incomplete'));
  }

  if (result === 'fumble' || stats?.recoveredTeam) {
    const side = stats?.recoveredTeam === 'off' ? offense : defense;
    const name = ev.sim?.names?.[stats?.recoveredTeam]?.[stats?.recoveredSlot];
    const club = teams?.[side]?.abbr;
    const recovery = name && club ? `${name} (${club})` : name || club;
    lines.push(recovery ? $t('match.fumble_recovered_by', { recovery }) : $t('match.fumble'));
    if (!ev.outcome?.turnoverOnDowns) {
      return { tier: result === 'fumble' ? 'turnover' : 'routine', text: lines.join(' · '), mine: side ? side === me : null };
    }
  }

  const receiving = ev.outcome?.turnoverOnDowns;
  if (receiving) {
    const club = teams?.[receiving]?.abbr;
    const text = club ? $t('match.turnover_on_downs_team', { club }) : $t('match.turnover_on_downs');
    return { tier: 'turnover', text: [text, ...lines].join(' · '), mine: receiving === me };
  }
  return lines.length ? { tier: 'routine', text: lines.join(' · '), mine: defense ? defense === me : null } : null;
}

export function registerMatchScreens(Router, app) {
  let pregameTeam = 'mine';
  const autoCamera = new MatchCamera();
  const zoomCrop = new ZoomCrop(); // the player's zoom button (owner play test 2026-11-26)
  let cameraRaf = null, cameraField = null, cameraSvg = null, cameraLastDraw = 0;
  function cameraOptions(f, field) {
    const G = f.game;
    const portal = field.frame && (field.frame.hoardFlight || field.fx?.t8?.items?.some(i => i.id === 'PSY-02-F' && (field.frame.t ?? 0) >= i.t0));
    const close0 = portal ? cameraFor(field.ballOn + field.frame.ball[0]) : field.camera || cameraFor(field.ballOn);
    // The close camera is always exactly as tall as the field box holds (owner 2026-11-25): a camera kept from a moment when the box
    // was a different height (the play ran in a taller box) is refitted, keeping the same spot a third of the way up, so the close
    // view never shrinks the field and shows the side stands. Only Auto's zoom-out shows those.
    const d = (close0.top - close0.bottom) - fieldSpan();
    const close = Math.abs(d) > 0.01 ? cameraFrom(close0.bottom + d * 15 / 46) : close0;
    const viewCamera = autoCamera.sample(close, { key: G.state, auto: G.auto && !G.state.finished && !anim?.replay, closeView: G.autoCloseView, reducedMotion: f.settings.reducedMotion || !!anim?.replay, pad: standsDepth() ? 3.5 : 0 }); // zoomed out: the white all round with the goal posts on it; the stands in view are the two along the sidelines // zoomed out: the white all round, and the goal posts standing on it
    // Planner art is caller-projected in the close camera's coordinate space.
    // Owner play test 2026-11-26: the planner art is projected here, with the close camera the field is drawn with. It used to be
    // projected when the screen was built; right after a play the banner changes the field box's height, the camera is refitted at the
    // first draw, and the zone boxes stood off their spots until the next refresh.
    const art = field.underlayAt ? field.underlayAt(close) : field.underlay;
    const underlay = art ? `<g transform="translate(0 ${viewCamera.top - close.top})">${art}</g>` : '';
    return { ...field, viewCamera, underlay };
  }
  function drawMatchField(svg, field) {
    cameraField = field; cameraSvg = svg; cameraLastDraw = performance.now();
    if (fitFieldSpan(svg) && !anim) field = { ...field, camera: null }; // the box changed size: a new close camera at the new height (not mid-play)
    const opts = cameraOptions(app.f, field);
    const result = fieldDraw(svg, opts);
    applyFieldZoom(svg, opts);
    if ((autoCamera.moving || zoomCrop.moving) && cameraRaf == null) cameraRaf = requestAnimationFrame(tickCamera);
    return result;
  }
  /** The zoom button's crop of the drawn close view: never in Auto (its own camera) or a replay; eased like Auto's zoom. */
  const zoomAllowed = (f) => !!f?.game && !f.game.auto && !anim?.replay;
  function applyFieldZoom(svg, o) {
    const f = app.f; const amount = zoomCrop.sample(!!f?.settings?.fieldZoom && zoomAllowed(f), { reducedMotion: !!f?.settings?.reducedMotion });
    if (amount <= 0.0001) { zoomCrop.focus = null; return; }
    const vb = svg.viewBox.baseVal; const cam = o.viewCamera; const fr = o.frame;
    const lat = (o.ballLat || 0) + (fr?.ball ? fr.ball[1] : 0), yard = (o.ballOn ?? 25) + (fr?.ball ? fr.ball[0] : 0);
    svg.setAttribute('viewBox', zoomCrop.crop({ x: vb.x, y: vb.y, width: vb.width, height: vb.height }, amount, lat, cam.top - yard, { follow: !!(anim && fr) }));
  }
  function tickCamera(now) {
    cameraRaf = null;
    if (!cameraSvg?.isConnected || Router.currentScreen()?.name !== 'match' || !app.f?.game) return;
    if (now - cameraLastDraw < 32) { cameraRaf = requestAnimationFrame(tickCamera); return; }
    drawMatchField(cameraSvg, cameraField);
  }
  function cameraButton(f) {
    return f.game.auto ? `<button class="btn small" data-action="autocamera" aria-pressed="${!!f.game.autoCloseView}">${f.game.autoCloseView ? $t('match.camera_full_field') : $t('match.camera_close_view')}</button>` : '';
  }


  function pregameTypeReport(mine,theirs) {
    const publicLook=p=>p?{onField:p.onField,align:p.align}:null;
    const ownAttack=PLAYS[mine.offensePlays?.[0]], ownDefense=PLAYS[mine.defensePlays?.[0]];
    const theirAttack=publicLook(PLAYS[theirs.offensePlays?.[0]]),theirDefense=publicLook(PLAYS[theirs.defensePlays?.[0]]);
    const pairs=[...matchupEdges({offensePlay:ownAttack,defensePlay:theirDefense},mine.offense,theirs.defense).map(x=>({me:x.off,them:x.def,myMonster:mine.offense[x.off.slot],theirMonster:theirs.defense[x.def.slot]})),...matchupEdges({offensePlay:theirAttack,defensePlay:publicLook(ownDefense)},theirs.offense,mine.defense).map(x=>({me:x.def,them:x.off,myMonster:mine.defense[x.def.slot],theirMonster:theirs.offense[x.off.slot]}))].filter(x=>x.me.mod);
    return pairs.length?`<details class="panel tight pregame-types"><summary>${$t('playview.expected_matchups')}</summary><p class="muted">${$t('playview.forecast_only')}</p>${pairs.map(x=>`<div class="pregame-type-pair">${monsterSprite(x.myMonster,32)}<p>${x.me.mod>0?$t('playview.good_matchup',{name:esc(x.me.name),opponent:esc(x.them.name)}):$t('playview.tough_matchup',{name:esc(x.me.name),opponent:esc(x.them.name)})}</p>${monsterSprite(x.theirMonster,32)}</div>`).join('')}</details>`:'';
  }

  // ------------------------------------------------------------ pregame
  Router.registerScreen('pregame', {
    title: $t('match.match_day'), tabs: false,
    render({ f }) {
      const m = F.sundayMatchup(f); if (!m) return `<p>${$t('match.no_game_today')}</p>`;
      if (f.week.pregame && f.week.pregame.status !== 'ready' && !f.game) { setTimeout(() => Router.go('clash-battle', { kind: 'pregame' }, { replace: true }), 0); return `<p class="muted">${$t('match.opening_the_pregame_clash')}</p>`; }
      const mine = m[m.playerSide], theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
      const col = (team, label) => `<div class="panel pregame-lineup" style="--team:${team.color}"><div class="row between"><b style="color:${teamInk(team.name, team.color)}">${esc(team.name)}</b><span class="chip">${label}</span></div><div class="muted">${$t('match.ovr_plays', { teamOverall: teamOverall(team), n: team.offensePlays.length, n2: team.defensePlays.length })}</div>
        ${[[ $t('match.offense'), OFFENSE_BASE, true ], [ $t('match.defense'), DEFENSE_BASE, false ], [ $t('match.packages'), [...OFFENSE_PACKAGE_SLOTS, ...DEFENSE_PACKAGE_SLOTS], false ]].map(([label,slots,open]) => `<details class="pregame-unit" ${open?'open':''}><summary>${label}</summary><div class="pregame-grid">${slots.map(slot=>line(slot,team.offense[slot]||team.defense[slot],team)).join('')}</div></details>`).join('')}</div>`;
      function line(slot, beast, team) {
        const boost=team?.boosts?.[beast?.id];
        return `<button class="pregame-player" data-action="pregame-detail" data-slot="${slot}" ${beast?'':'disabled'}><b class="mono">${slot}</b>${beast?monsterSprite(beast,36):'<span></span>'}<span class="pregame-player-name">${esc(beast?.name||'—')}</span><span class="pregame-boosts">${boost?.training?'<span class="boost train">T</span>':''}${boost?.media?'<span class="boost media">+</span>':''}</span><span class="pregame-info info-mark" aria-hidden="true">${infoIcon()}</span></button>`;
      }
      const rv = f.rivals[f.tier];
      const gym = GYM_BY_CLUB[m.opponent]; const held = gym && F.badgeOf(f, m.opponent);
      return `<div class="pregame">${m.rival ? `<div class="rival-banner">${$t('match.rivalry_game')}<div class="muted" style="font-weight:600;font-size:12px">${$t('match.gm_all_time', { gm: esc(rv?.gm || ''), w: rv?.headToHead.w || 0, l: rv?.headToHead.l || 0 })}</div></div>` : m.playoff ? `<div class="rival-banner" style="border-color:#f5c542;background:linear-gradient(90deg,#4a3a0a,#2a2008)">🏆 ${esc(m.tag)}</div>` : ''}${gym ? `<div class="rival-banner" style="border-color:hsl(${TYPES[gym.element]?.hue ?? 120} 70% 55%);background:linear-gradient(90deg,hsl(${TYPES[gym.element]?.hue ?? 120} 40% 18%),hsl(${TYPES[gym.element]?.hue ?? 120} 30% 10%))">${held ? `${$t('match.held', { toUpperCase: esc(gym.badge).toUpperCase() })}` : `${$t('match.badge_game', { toUpperCase: esc(gym.badge).toUpperCase() })}`}<div class="muted" style="font-weight:600;font-size:12px">${$t('match.gym', { name: esc(gym.coach.name), element: esc(gym.element), held: held ? '' : $t('match.win_to_earn_it_no_replays') })}</div></div>` : ''}
        ${(() => { const rec = (t) => { const r = f.season.records[t]; return r ? `${r.w}-${r.l}` : ''; }; const side = (team, label, who) => `<div class="mu-club ${who}">${teamLogo(team.name, 46, { cls: 'team-logo mu-logo' })}<div class="mu-abbr" style="color:${teamInk(team.name, team.color)}">${esc(team.abbr)}</div><div class="mu-name">${esc(team.name)}</div><div class="dim mono">${$t('match.ovr', { rec: esc(rec(team.name)), teamOverall: teamOverall(team) })}</div><div class="chip">${label}</div></div>`;
          return `<div class="matchup-head md-hero ${m.playoff ? 'playoff' : ''}" style="--mine:${mine.color};--theirs:${theirs.color}">${side(mine, m.playerSide === 'home' ? $t('match.home') : $t('match.away'), 'mine')}<div class="mu-vs"><div class="mu-vs-word">VS</div><div class="mu-tag">${(m.tag || '').includes(' · ') ? (m.tag || '').split(' · ').map((t) => `<span class="mu-tag-line">${esc(t)}</span>`).join('') : esc(m.tag || '')}</div></div>${side(theirs, m.playerSide === 'home' ? $t('match.away') : $t('match.home'), 'theirs')}</div>`; })()}
        ${(() => { const v = F.sundayVenue(f); if (!v) return ''; const n = (team) => v.type ? Object.values({ ...team.offense, ...team.defense }).filter((p, i, arr) => p?.type === v.type && arr.findIndex((q) => q?.id === p.id) === i).length : null; return venueHtml(v, { mine: n(mine), theirs: n(theirs) }); })()}
        ${(() => { const hn = m.playerSide === 'home' ? mine.name : theirs.name, an = m.playerSide === 'home' ? theirs.name : mine.name; const k = gameKits(hn, an); if (!k.home || !k.away) return ''; const fig = (kit) => `<figure>${kitJersey(kit, 64)}<figcaption>${esc(TEAM_META[kit.club].abbr)} · ${({ home: $t('match.kit_home'), away: $t('match.kit_away'), alt: $t('match.kit_alt') })[kit.kind]}</figcaption></figure>`; return `<div class="panel kit-panel"><div class="muted" style="margin-bottom:4px">${$t('match.uniforms_today')}</div><div class="kit-pair">${fig(k.away)}${fig(k.home)}</div></div>`; })()}
        ${pregameTypeReport(mine,theirs)}${talkHtml(f)}
        <div class="pregame-team-tabs" role="group" aria-label="${$t('presentation.lineups')}"><button class="btn ${pregameTeam==='mine'?'primary':''}" data-action="pregame-team" data-team="mine" aria-pressed="${pregameTeam==='mine'}">${$t('presentation.your_team')}</button><button class="btn ${pregameTeam==='theirs'?'primary':''}" data-action="pregame-team" data-team="theirs" aria-pressed="${pregameTeam==='theirs'}">${$t('presentation.opponent')}</button></div>${pregameTeam==='mine'?col(mine,m.playerSide==='home'?$t('match.home'):$t('match.away')):col(theirs,m.playerSide==='home'?$t('match.away'):$t('match.home'))}
        ${(() => { const nMedia = Object.values(mine.boosts || {}).filter((b) => b.media).length; const tr = f.week.trainingFocus; return nMedia || tr ? `<div class="panel tight" style="margin-top:8px">${$t('match.b_todays_boosts_b')}<div class="muted" style="font-size:13px">${tr ? `<span class="boost train">T</span> ${$t('match.training', { label: esc(TRAINING_FOCI[tr]?.label || tr), amount: f.week.training?.amount ?? '' })} ${esc((TRAINING_FOCI[tr]?.attrs || []).join(', '))} ${$t('match.for_every_starter')}` : ''}${tr && nMedia ? '<br>' : ''}${nMedia ? `<span class="boost media">+</span> ${$t('match.media_day_monsters_fired_up', { nMedia, n: nMedia })}` : ''}</div></div>` : ''; })()}
        <p class="dim" style="margin-top:8px">${$t('match.coaching_mode_b_b_change_in', { mode: f.settings.mode === 'key' ? $t('match.key_moments') : $t('match.full_coaching') })}</p>
        <details class="pregame-rules"><summary>${$t('presentation.clash_purpose')}</summary><p class="dim">${$t('match.possession_is_decided_by_a_b')}</p></details>
        <div class="pregame-start"><button class="btn primary big block" data-action="toss">${$t('match.beast_clash_for_possession')}</button></div></div>`;
    },
    mount(root) {
      delegate(root, {
        'pregame-detail': el => { const m=F.sundayMatchup(app.f); if(!m)return; const team=pregameTeam==='mine'?m[m.playerSide]:m[m.playerSide==='home'?'away':'home']; const beast=team.offense[el.dataset.slot]||team.defense[el.dataset.slot]; if(!beast)return; const boost=team.boosts?.[beast.id]; sheet(`<div class="row">${monsterSprite(beast,64)}<div><b>${esc(beast.name)}</b><p>${beastSpeciesHtml(beast)} · ${esc(beast.position)} · ${esc(beast.type)}</p></div></div>${boost?.media?`<p>${$t('match.media_day',{amount:boost.media.amount,attr:esc(boost.media.attr)})}</p>`:''}${boost?.training?`<p>${$t('presentation.training_boost',{attributes:esc(boost.training.join(', '))})}</p>`:''}`,{title:beast.name}); },
        'pregame-team': (el) => { pregameTeam=el.dataset.team==='theirs'?'theirs':'mine'; Router.render(); },
        reply: (el) => { const r = F.replyToCoach(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        toss: () => { const pv = F.pregamePreview(app.f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'pregame' }); },
      });
    },
  });

  /** Scheme lock, shown while it applies (GDD §17; comeback mode is retired, N8a: comebackSide is always null). */
  function edgeStrip(f, s, teams, me, returning = []) {
    const bits = [];
    const cb = R.comebackSide(s);
    if (cb) bits.push(`<span class="edge-chip comeback ${cb === me ? 'mine' : ''}">${$t('match.comeback', { abbr: esc(s[cb].abbr), edge: s.comeback.edge })}</span>`);
    const lock = teams[me]?.schemeLock; if (lock?.offense) bits.push(`<span class="edge-chip scheme mine">${$t('match.scheme_lock_offense')}</span>`); if (lock?.defense) bits.push(`<span class="edge-chip scheme mine">${$t('match.scheme_lock_defense')}</span>`);
    const them = R.opponent(me); const tl = teams[them]?.schemeLock; if (tl?.offense || tl?.defense) bits.push(`<span class="edge-chip scheme">${$t('match.their_scheme_is_locked')}</span>`);
    // Task 8 (I5, Sovereign Arm): the swallowed defender's portrait with the dragon mouth while he is out (read from the game's absence list)
    for (const a of absentMonsters(s, teams)) bits.push(`<span class="edge-chip absent ${a.team === me ? 'mine' : ''}" title="${$t('match.swallowed_by_sovereign_arm')}"><span class="absent-face">${a.monster ? monsterSprite(a.monster, 18) : ''}<i aria-hidden="true">🐲</i></span> ${$t('match.swallowed_out_for_next_offensive_play', { name: esc(a.monster?.name || $t('match.a_defender')), abbr: esc(s[a.serveOn]?.abbr || 'the') })}</span>`);
    // ... and, on the play-call screen of the play he is back for, that he has returned (the field plays his return once: presnapT8)
    for (const b of returning) bits.push(`<span class="edge-chip absent returned ${b.team === me ? 'mine' : ''}" title="${$t('match.back_from_sovereign_arm')}"><span class="absent-face">${b.monster ? monsterSprite(b.monster, 18) : ''}</span> ${$t('match.is_back_in_the_formation', { name: esc(b.monster?.name || $t('match.the_defender')) })}</span>`);
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
  function callout(ev, me, teams) {
    if (!ev) return null; const r = ev.sim?.result || ev.outcome?.result || null; const yards = ev.outcome?.yards ?? ev.sim?.yards; const off = ev.offenseSide;
    if (ev.kind === 'try') return conversionCallout(ev, me);
    const mineOff = off === me; const scoredFor = ev.scored?.team || (ev.scored ? off : null);
    if (r === 'touchdown' || (ev.kind === 'kickoff' && ev.scored)) return { tier: 'td', text: $t('match.touchdown_2'), mine: scoredFor ? scoredFor === me : mineOff };
    if (r === 'safety') return { tier: 'score', text: 'SAFETY', mine: !mineOff };
    if (r === 'interception' || r === 'touchback_return') return { tier: 'turnover', text: $t('match.intercepted'), mine: !mineOff };
    const playResult = playResultCallout(ev, me, teams);
    if (playResult) return playResult;
    if (ev.kind === 'field_goal') return ev.scored ? { tier: 'score', text: $t('match.field_goal'), mine: ev.kicking === me } : { tier: 'loss', text: $t('match.no_good'), mine: ev.kicking !== me };
    if (r === 'sack') return { tier: 'sack', text: 'SACK', mine: !mineOff };
    if (ev.kind === 'punt') return { tier: 'routine', text: 'PUNT', mine: null };
    if (ev.kind === 'kickoff') return { tier: 'routine', text: /touchback/i.test(ev.text) ? 'TOUCHBACK' : 'KICKOFF', mine: null };
    if (typeof yards === 'number' && ev.kind === 'play') {
      const toGo = ev.toGo ?? 10; const first = yards >= toGo;
      if (first) return { tier: 'first', text: yards >= 20 ? `${$t('match.big_play', { yards })}` : $t('match.first_down'), mine: mineOff };
      if (yards >= 15) return { tier: 'big', text: `${$t('match.yds', { yards })}`, mine: mineOff };
      if (yards < 0) return { tier: 'loss', text: `${$t('match.yds_2', { yards })}`, mine: !mineOff };
      return { tier: 'routine', text: yards === 0 ? $t('match.no_gain') : `${$t('match.yds', { yards })}`, mine: mineOff };
    }
    return null;
  }

  Router.registerScreen('match', {
    title: ({ f }) => f?.game ? `${f.game.state.away.abbr} ${f.game.state.score.away}-${f.game.state.score.home} ${f.game.state.home.abbr}` : $t('match.match'), back: false, tabs: false, help: false, // the ⓘ button is this screen's help (it links to Coach Assist)
    topRight: () => `${recorder.active() ? '<button class="btn ghost small" data-action="test-report-issue" aria-label="Report Last Play">⚑</button>' : ''}<button class="btn ghost small" data-action="box" aria-label="${$t('match.box_score')}">📊</button><button class="btn ghost small" data-action="log" aria-label="${$t('match.play_log')}">📋</button><button class="btn ghost small" data-action="help" aria-label="${$t('match.how_a_match_works')}" title="${$t('playview.guide_notices')}">${infoIcon()}</button>`,
    render({ f }) {
      const G = f.game; if (!G) return `<div class="panel"><p>${$t('match.no_game_in_progress')}</p><button class="btn block" data-action="hq">${$t('match.headquarters')}</button></div>`;
      const P = screenParts(f);
      // Three in-place regions (refresh(): a play's start and end update them without rebuilding the screen): the head, the field
      // with what lies over it, the panels under the field; then the controls. display:contents wrappers add no box of their own.
      return `<div class="match-console"><div id="live-status"></div><div id="match-head">${P.head}</div>
        <div class="${P.wrapClass}" id="fieldwrap" aria-label="${$t('match.football_field')}">${P.surround}<svg id="field" viewBox="${fieldViewBox()}" preserveAspectRatio="xMidYMid meet" role="img">${fieldSvg(P.field)}</svg>${P.over}</div><div id="field-after">${P.after}</div>
        <div id="controls">${P.controls}</div></div>`;
    },
    mount(root, ctx) {
      const f = app.f; if (!f?.game) { delegate(root, { hq: () => Router.go('hq', {}, { reset: true }) }); return; }
      const notices=document.createElement('div'); notices.id='match-notices'; notices.hidden=true;
      for(const child of [...root.children])if(!child.classList.contains('match-console')) {
        notices.appendChild(child);
      }
      notices.insertAdjacentHTML('beforeend', `<section class="match-guide"><h3>${$t('match.how_a_match_works_2')}</h3>${matchHelpHtml(f)}<button class="btn small" data-action="assist-help" data-screen="match">${$t('match.more_help_coach_assist')}</button></section>`);
      root.appendChild(notices);
      drawMatchField(root.querySelector('#field'), screenParts(f).field);
      afterRender(f, root);
      delegate(root, {
        'match-panel': el => openMatchPanel(root, el.dataset.panel),
        matchup: el => {const x=presnapEdges[Number(el.dataset.i)];if(x)openMatchupPanel(x,presnapMe);},
        hq: () => Router.go('hq', {}, { reset: true }),
        log: () => showLog(f),
        substitutions: () => { if(anim) return; openSubstitutions(f,teamsFor(f),{save:()=>app.save(),refresh:()=>refresh(f)}); },
        pick: (el) => { const G = f.game; G.selected[el.dataset.side] = el.dataset.id; app.save(); refresh(f); },
        zonepick: (el) => { setZoneChoice(f.game.state, el.dataset.zone, el.dataset.choice); f.game.zoneFocus = el.dataset.zone; app.save(); refresh(f); },
        zonefocus: (el) => { f.game.zoneFocus = el.dataset.zone; refresh(f); },
        prismpick: (el) => { R.choosePrismTarget(f.game.state, teamsFor(f), el.dataset.choice === 'auto' ? null : el.dataset.choice); app.save(); refresh(f); }, // Prism Break: the player's target zone
        snap: () => act(f, {}),
        go: () => act(f, { fourthDown: 'go' }),
        punt: () => act(f, { fourthDown: 'punt' }),
        fg: () => act(f, { fourthDown: 'fg' }),
        fgsig: () => act(f, { fourthDown: 'fg', fgSignature: true }), // Task 8 M3: a player-activated field-goal signature (Dragon Roar)
        kickoff: () => kickoffWithReveal(f, root, () => act(f, { kickoff: 'normal' })),
        onside: () => act(f, { kickoff: 'onside' }),
        trykick: () => act(f, { tryChoice: 'kick' }),
        trytwo: () => { const G = f.game; if (!G.selected.offense) { toast($t('match.pick_a_play_for_the_two')); return; } act(f, { tryChoice: 'two' }); },
        continue: () => act(f, {}),
        timeout: () => { const G = f.game; if (R.timeout(G.state, G.playerSide)) { G.lastEvent = { text: `${$t('match.timeout', { name: G.state[G.playerSide].name })}` }; app.save(); Router.render(); } else toast($t('match.no_timeouts_left')); },
        tempo: (el) => { f.game.tempo = el.value; app.save(); },
        mode: () => { const G = f.game; G.mode = G.mode === 'key' ? 'full' : 'key'; app.save(); Router.render(); },
        auto: () => { const G = f.game; G.auto = !G.auto; G.autoCloseView = false; app.save(); if (!G.auto) { clearTimeout(autoTimer); autoTimer = null; } Router.render(); },
        autocamera: () => { f.game.autoCloseView = !f.game.autoCloseView; app.save(); refresh(f); },
        fieldzoom: () => { f.settings.fieldZoom = !f.settings.fieldZoom; app.save(); const b = document.querySelector('[data-action="fieldzoom"]'); if (b) { b.setAttribute('aria-pressed', String(!!f.settings.fieldZoom)); b.setAttribute('aria-label', f.settings.fieldZoom ? $t('match.zoom_out') : $t('match.zoom_in')); b.innerHTML = zoomIcon(f.settings.fieldZoom); } if (cameraSvg?.isConnected && cameraField) drawMatchField(cameraSvg, cameraField); },
        autospeed: () => { cycleAutoSpeed(f); if(anim){const now=performance.now(),frames=(now-anim.start)/anim.msPerFrame;anim.msPerFrame=100/((f.settings.speed||1)*autoSpeed(f));anim.start=now-frames*anim.msPerFrame;} app.save(); Router.render(); },
        keymoment: () => simToKeyMoment(f),
        simfinal: async () => { if (!(await confirmSheet($t('match.let_the_coach_play_the_rest'), { title: $t('match.sim_to_final'), okLabel: $t('match.sim_it') }))) return; simToFinal(f); },
        skip: () => { if (anim) finishAnim(f, true); },
        replay: () => { if (!anim && lastReplay && lastReplay.gameKey === f.game?.state.seed) startReplay(f, lastReplay); },
        finish: () => finishGame(f),
        otclash: () => { const pv = F.overtimePreview(f); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'overtime' }); },
        boxscore: () => openLiveBox(f),
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
      document.querySelector('.topbar [data-action="help"]')?.addEventListener('click', () => openMatchPanel(root,'notices'));
      momentSheets(f);
      if (!anim && f.game?.lastEvent?.sim?.events?.some(e => e.kind === 'ability' || e.kind === 'status')) guideMoment(f, 'status', () => app.save());
      document.querySelector('.topbar [data-action="box"]')?.addEventListener('click', () => openLiveBox(f));
    },
    unmount() { cancelReveal(); stopStadiumReaction(); setStadiumScene(null); pendingStadium = null; cancelAnimationFrame(cameraRaf); cameraRaf = null; cameraField = cameraSvg = null; autoCamera.reset(null); settleSave(); clearTimeout(replayTimer); replayTimer = null; stopAnim(); clearInterval(playClockTimer); playClockTimer = null; clearTimeout(autoTimer); autoTimer = null; },
  });

  /** Everything the match screen shows, as the strings render() and refresh() place: title, head, field options, overlays, panels, controls. */

  // Sheet copies carry no game datasets. Document capture sees exactly one
  // original action, including tutorial progress, pause resumes and substitutions.
  function openMatchPanel(root,kind) {
    // Guide opens with this play's matchups first (they used to sit under the buttons, on the play screen itself).
    const hosts=(kind==='notices'?[root.querySelector('[data-match-panel="matchups"]'),root.querySelector('#match-notices')]:[root.querySelector('[data-match-panel="'+kind+'"]')]).filter(Boolean);
    if(!hosts.length)return;
    const title=kind==='plays'?$t('playview.choose_play'):kind==='zones'?$t('playview.zones'):kind==='notices'?$t('playview.guide_notices'):$t('playview.more_controls');
    const source=hosts.flatMap(host=>[...host.querySelectorAll('button,select,input')]);
    const {el,close}=sheet(hosts.map(host=>host.innerHTML).join(''),{title});
    el.classList.add('match-control-sheet');
    el.classList.toggle('match-more-sheet',kind==='more');
    [...el.querySelector('.sheet-body').querySelectorAll('button,select,input')].forEach((copy,i)=>{
      for(const k of Object.keys(copy.dataset))delete copy.dataset[k];
      copy.dataset.liveControl=String(i);
    });
    const forward=event=>{
      const control=event.target.closest('[data-live-control]');if(!control)return;
      const original=source[Number(control.dataset.liveControl)];if(!original)return;
      event.stopPropagation();
      if(original.disabled){event.preventDefault();return;}
      if(event.type==='change'){original.value=control.value;close();original.dispatchEvent(new Event('change',{bubbles:true}));}
      else if(control.tagName==='BUTTON'){event.preventDefault();close();original.click();}
    };
    el.addEventListener('click',forward);el.addEventListener('change',forward);
  }

  function openLiveBox(f, title = $t('match.box_score_2')) {
    const s = f.game.state;
    const clock = s.finished ? $t('match.final_3') : `${R.quarterText(s)} ${fmtClock(s.clock)}`;
    const { el } = sheet(boxScoreHtml(s, teamsFor(f), { title: clock, live: true }), { title });
    el.addEventListener('click', event => {
      const button = event.target.closest('[data-box-inspect]');
      if (button) openInspect(f, button.dataset.boxInspect);
    });
  }

  function kickoffCaptains(f, s, teams) {
    return `<div class="kickoff-captains">${['away', 'home'].map(side => {
      const selected = captainsOf(f, s[side].name);
      const members = ['offense', 'defense'].flatMap(unit => {
        const pair = selected?.[unit];
        return pair ? [pair.a, pair.b] : [];
      }).map(id => findMonster(teams, id)).filter(entry => entry?.team === side && !entry.monster.injury);
      return `<div class="kickoff-captain-team ${side}" aria-label="${esc(s[side].name)} captains">${members.map(({ monster }) => `<span title="${esc(monster.name)}">${monsterSprite(monster, 40, { flip: side === 'home' })}</span>`).join('')}</div>`;
    }).join('')}</div>`;
  }

  function turnoverCue(ev) {
    const first = ev.sim?.events?.find(e => e.kind === 'fumble' || e.kind === 'interception');
    if (first) return { time: first.t, text: first.kind === 'fumble' ? 'FUMBLE!' : 'INTERCEPTION!' };
    const result = ev.sim?.result;
    if (['fumble', 'interception', 'touchback_return'].includes(result)) {
      return { time: ev.sim.frames?.at(-1)?.t || 0, text: result === 'fumble' ? 'FUMBLE!' : 'INTERCEPTION!' };
    }
    return null;
  }

  const fieldBox = () => fieldViewBox().split(' ').map(Number); // [-half width, 0, width, span] of the picture on screen now
  let pendingStadium = null; let pendingTalk = null; // the crowd's bubbles for the play just shown (stadium-crowd.js)
  // Stadium Polish: on the opening kickoff the stadium's strike reveals the football between the captains before the kick.
  // It only delays the kick the player just asked for, never changes it, and a tap (or the button again) skips it.
  let revealFinish = null;
  function kickoffWithReveal(f, root, go) {
    if (revealFinish) { revealFinish(); return; } // pressed again while it plays: skip
    const s = f.game.state; const level = stadiumFxLevel(f.settings);
    const opening = s.phase === 'kickoff' && s.quarter === 1 && !s.playCount && !(s.log || []).some((e) => e.kind === 'kick');
    const wrap = root?.querySelector('#fieldwrap'); const html = opening && wrap && !anim && !f.game.auto ? kickoffRevealHtml(s.venue, level) : '';
    if (!html) { go(); return; }
    wrap.insertAdjacentHTML('beforeend', html); const el = wrap.lastElementChild; wrap.classList.add('sfx-revealing');
    playStadiumReaction(wrap, { ...introReaction(), ms: REVEAL_MS[level] || REVEAL_MS.full }, level);
    let timer = null; const finish = () => { if (!revealFinish) return; revealFinish = null; clearTimeout(timer); el.remove(); wrap.classList.remove('sfx-revealing'); go(); };
    revealFinish = finish; timer = setTimeout(finish, REVEAL_MS[level] || REVEAL_MS.full); el.addEventListener('click', finish);
  }
  function cancelReveal() { if (!revealFinish) return; revealFinish = null; document.querySelector('.sfx-reveal')?.remove(); } // a stadium reaction waiting for the field to be on screen
  function screenParts(f) {
    const G = f.game; const s = G.state;
    // Stadium Polish: the stand and its crowd for this game (the camera and the field drawing read it; null for a plain stadium).
    setStadiumScene(s.venue, crowdFor({ type: s.venue?.type || lookFor(s.venue?.env)?.crowd, seed: s.seed, homeColor: s.home.color, awayColor: s.away.color, homeColor2: TEAM_META[s.home.name]?.secondary || null, awayColor2: TEAM_META[s.away.name]?.secondary || null, homeRecord: f.season?.records?.[s.home.name], awayRecord: f.season?.records?.[s.away.name], event: G.event })); const me = G.playerSide, them = R.opponent(me);
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
      ? { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), ...kitOpts(s, anim.ev.offenseSide), frame: anim.frames[anim.i], ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, event: G.event, noLines: anim.follow, sprites: spritesFor(f, anim.ev.offenseSide), ...(anim.fx && !anim.replay ? { fields: anim.ev.sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), prevFrame: anim.frames[anim.i - 1] || null, ...(anim.pre && anim.i === 0 && !anim.key ? { time: -anim.pre } : {}) } : {}) }
      : { venue: G.state.venue, ballOn: s.ballOn, ballLat: s.ballLat, toGo: s.toGo, colors: { off: offColor, def: defColor }, ...kitOpts(s, offenseTeamSide), frame: null, presnap: look.presnap, readinessHud: presnapReadiness(s, teams), typeIcons: typeIconsFor(f, teams, look), ownLabel: s[s.possession].abbr, oppLabel: s[R.opponent(s.possession)].abbr, event: G.event, sprites: spritesFor(f, s.possession), ...(pre8 ? { fields: pre8.fields.length ? pre8.fields : null, fx: pre8.fx, time: pre8.time, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings) } : {}) };
    const openingKickoff = !anim && !s.finished && s.phase === 'kickoff' && s.quarter === 1 && !s.playCount && !(s.log || []).some(e => e.kind === 'kick');
    if (openingKickoff) { field.camera = cameraFor(50); field.noLines = true; }
    if (!anim && look.myPlay && s.phase === 'scrimmage') {
      const mine = s.possession === me;
      const plans = zonePlans(s, teams, me, mine ? look.myPlay : look.presnap.offensePlay.id, mine ? look.presnap.defensePlay.id : look.myPlay);
      const plan = plans.find((p) => p.key === G.zoneFocus) || plans[0];
      field.zonePlan = plan;
    }
    // The planner art (zone placement, Prism Break targets) in a given camera's space: drawn with the camera the field is drawn with.
    const zonePlan = field.zonePlan || null; const prism = !anim && s.phase === 'scrimmage' && s.possession !== me;
    if (zonePlan || prism) {
      field.underlayAt = (cam) => (zonePlan ? zonePlannerOverlay(zonePlan, s, cam, { reducedMotion: !!f.settings.reducedMotion }) : '') + (prism ? prismOverlay(s, cam) : '');
      field.underlay = field.underlayAt(cameraFor(s.ballOn)); // the first paint (fieldSvg), before the box is measured
    }
    if (presnapNow) presnapNow.field = field;
    // Task 8 (I4): who stands where in the drawn formation (the players' paint order: defense, then offense), for the inspect sheet
    inspectMap = null; inspectForm = null;
    if (!anim && field.presnap && s.phase === 'scrimmage' && !s.finished) {
      const dS = R.opponent(s.possession); const row = (side, unit, play, team) => { if (!play?.onField) return []; const sl = R.pickSlots(teams[side][unit], play.onField, teams[side], play); return play.onField.map((slot) => ({ team, slot, mid: sl[slot]?.id || null })); };
      inspectMap = [...row(dS, 'defense', field.presnap.defensePlay, 'def'), ...row(s.possession, 'offense', field.presnap.offensePlay, 'off')];
      inspectForm = { defSide: dS, defensePlay: look0.presnap.defensePlay, exact: dS === me && !!look0.myPlay, vacant: pre8?.vacant || [] };
    }
    const sit = s.finished ? 'FINAL' : s.phase === 'scrimmage' ? `${s[s.possession].abbr} ${R.situationText(s).replace('OWN', 'own').replace('OPP', 'opp')}` : s.phase === 'try' ? $t('match.try') : s.phase === 'kickoff' ? $t('match.kickoff') : s.phase === 'free_kick' ? $t('match.free_kick') : '';
    const ab = G.lastEvent?.abilities?.length ? `<div class="ability-strip">${G.lastEvent.abilities.slice(0, 3).map((x) => `<span class="${x.team === me ? 'mine' : ''} ${x.trait ? 'trait' : ''}"${x.mid ? ` role="button" tabindex="0" data-inspect="${esc(x.mid)}" aria-label="Inspect ${esc(x.who)}"` : ''}>${x.trait ? '·' : '⚡'} ${esc(x.who)} · ${esc(x.what)}${x.tick ? ` <i class="ability-tick">✓ ${esc(x.tick)}</i>` : ''}</span>`).join('')}</div>` : '';
    const contact=G.lastEvent?.sim?.typeContests?.find(x=>x.mod>(x.env?0.02:0));
    const contactNames=G.lastEvent?.sim?.names;
    const typeNote=contact&&contactNames?.[contact.team]?.[contact.a]&&contactNames?.[contact.team==='off'?'def':'off']?.[contact.b] ? $t('playview.type_contact',{name:esc(contactNames[contact.team][contact.a]),opponent:esc(contactNames[contact.team==='off'?'def':'off'][contact.b])}):'';
    const co = G.lastEvent?.callout; const fresh = !!G.lastEvent?.fresh; const reaction = fresh && !anim ? G.lastEvent.stadium || null : null; if (fresh && !anim && G.lastEvent?.talk?.length) pendingTalk = G.lastEvent.talk; if (G.lastEvent) G.lastEvent.fresh = false; // the pop plays once, not on every re-render
    const banner = G.lastEvent ? `<div class="field-banner ${G.lastEvent.important ? 'important' : ''} ${co ? `tier-${co.tier} ${co.mine === true ? 'mine' : co.mine === false ? 'theirs' : ''}` : ''} ${fresh ? 'fresh' : ''}" id="banner">${co && co.tier !== 'routine' ? `<div class="callout">${esc(co.text)}</div>` : co ? `<span class="callout small">${esc(co.text)}</span> ` : ''}${esc(G.lastEvent.text)}${typeNote?`<div class="type-contact-note">${typeNote}</div>`:''}${ab}</div>` : '';
    const tdFlash = reducedFlash(f.settings) ? '' : fresh && co?.tier === 'td' ? ` td-flash ${co.mine ? 'mine' : 'theirs'}` : fresh && co?.tier === 'turnover' ? ' to-flash' : '';
    const bump = (side) => (G.scoreSeen?.[side] != null && G.scoreSeen[side] !== s.score[side]) ? 'bump' : ''; const bumpA = bump('away'), bumpH = bump('home'); G.scoreSeen = { ...s.score };
    const eventBanner = G.event === 'rival' ? `<div class="rival-banner compact">${$t('match.rivalry_game_gm', { name: esc(s[them].name), gm: esc(f.rivals[f.tier]?.gm || '') })}</div>` : G.event === 'playoff' ? `<div class="rival-banner compact" style="border-color:#f5c542;background:linear-gradient(90deg,#4a3a0a,#2a2008)">${$t('match.playoffs', { tag: esc(G.tag || $t('match.win_or_go_home')) })}</div>` : '';
    const head = `${eventBanner}
        <div class="scoreboard" aria-live="polite" style="--away:${s.away.color};--home:${s.home.color};--away2:${TEAM_META[s.away.name]?.secondary || s.away.color};--home2:${TEAM_META[s.home.name]?.secondary || s.home.color}">
          <div class="team"><span class="pos" style="visibility:${s.possession === 'away' && !s.finished ? 'visible' : 'hidden'}"></span>${teamLogo(s.away.name, 18, { cls: 'team-logo sb-logo' })}<span class="abbr"><span style="color:${teamInk(s.away.name, s.away.color)}">${esc(s.away.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.away)}${'○'.repeat(3 - s.timeouts.away)}</span></span><span class="score ${bumpA}">${s.score.away}</span></div>
          <div class="mid"><b>${s.finished ? $t('match.final') : R.quarterText(s)} ${s.ot ? '' : fmtClock(s.clock)}</b>${esc(sit)}</div>
          <div class="team right"><span class="score ${bumpH}">${s.score.home}</span><span class="abbr"><span style="color:${teamInk(s.home.name, s.home.color)}">${esc(s.home.abbr)}</span><span class="to">${'●'.repeat(s.timeouts.home)}${'○'.repeat(3 - s.timeouts.home)}</span></span>${teamLogo(s.home.name, 18, { cls: 'team-logo sb-logo' })}<span class="pos" style="visibility:${s.possession === 'home' && !s.finished ? 'visible' : 'hidden'}"></span></div>
          ${clockStateHtml(s, G, myBall)}
        </div>
        <div class="situation"><span>${s.phase === 'scrimmage' && !s.finished ? `<b>${myBall ? $t('match.your_ball') : $t('match.your_defense')}</b> · ${esc(spotFor(s.ballOn, myBall))}` : esc(sit)}</span><span>${me === 'home' ? $t('match.home_2') : $t('match.away_2')}${G.mode === 'key' ? $t('match.key_moments_2') : ''}</span></div>
        ${edgeStrip(f, s, teams, me, pre8?.returning || [])}`;
    const wrapClass = `field-wrap${tdFlash}${venueClass(s.venue)}${anim?.replay ? ' replaying' : ''}`;
    const zoomBtn = !G.auto && !anim?.replay ? `<button class="field-zoom" data-action="fieldzoom" aria-pressed="${!!f.settings.fieldZoom}" aria-label="${f.settings.fieldZoom ? $t('match.zoom_out') : $t('match.zoom_in')}">${zoomIcon(f.settings.fieldZoom)}</button>` : '';
    const over = `${zoomBtn}${s.finished && !anim ? finalCelebration(f, s, teams) : ''}${openingKickoff ? introPlateHtml(s.venue, esc) + kickoffCaptains(f, s, teams) : ''}${anim?.replay ? `<div class="replay-badge" role="status"><span class="rec">●</span> ${$t('match.instant_replay_b_b', { label: esc(anim.replay.reason.label) })}</div><div class="replay-slow" aria-hidden="true">${$t('match.slow_mo')}</div>` : banner}${!anim && fresh && G.lastEvent?.turnover ? `<div class="turnover-cue" role="status">${esc(G.lastEvent.turnover)}</div>` : ''}`;
    // N9c: a field the snap creates only if its creator is in the play (Runway, Bloom Break, Crosswind Rescue) is marked as conditional
    const warning = !anim ? (s.t8?.preChoice?.foresight || []).map((m) => `<div class="t8-conditional" role="note">${$t('match.foresight_is_marked_blitzing_risks_confused', { name: esc(findMonster(teams, m.targetMid)?.monster?.name || m.targetSlot) })}</div>`).join('') + (s.t8?.preChoice?.prism || []).map(() => `<div class="t8-conditional" role="note">${$t('match.prism_break_shattered_an_existing_enemy')}</div>`).join('') : '';
    const cond = !anim && pre8?.notes?.length ? `<div class="t8-conditional" role="note">${pre8.notes.map((n) => `<span class="${n.shown ? '' : 'held'}" data-ability="${esc(n.ability)}">◇ <b>${esc(n.name)}</b> ${n.shown ? `${$t('match.is_created_at_the_snap_only', { creator: esc(n.creator) })}` : `${$t('match.is_not_created_is_not_on', { creator: esc(n.creator) })}`}</span>`).join('')}</div>` : '';
    const after = `${cond}${warning}${!anim && presnapEdges.length ? `<div class="tm-legend"><span><b class="up">${$t('match.b_type_advantage')}</span><span><b class="down">${$t('match.b_disadvantage')}</span><span>${$t('match.tap_an_icon')}</span><span>${$t('match.tap_a_monster_to_inspect')}</span></div>` : !anim && inspectMap ? `<div class="tm-legend"><span>${$t('match.tap_a_monster_to_inspect_stamina')}</span></div>` : ''}`;
    const title = `${s.away.abbr} ${s.score.away}-${s.score.home} ${s.home.abbr}`;
    // Stadium Polish: the reaction to the play just shown, or the kickoff flourish (once per game), handed to afterRender.
    if (reaction) pendingStadium = reaction;
    else if (openingKickoff && !G.stadiumIntroShown) { G.stadiumIntroShown = true; pendingStadium = introReaction(); }
    return { title, head, wrapClass, field, over, after, surround: surroundHtml(s.venue) + hauntHtml(s.venue, stadiumFxLevel(f.settings)), controls: controlsHtml(f, teams, look) };
  }
  /** What mount() does after the markup is in place; refresh() repeats it (the play clock restarts, Auto is rescheduled, the halftime sheet opens). */
  function afterRender(f, root) {
    { const wrap = root?.querySelector('#fieldwrap'), svg = wrap?.querySelector('#field'); if (wrap && svg) { { const v = fieldBox(); layoutSurround(wrap, svg, v[2] / v[3], v[2]); } const r = pendingStadium; pendingStadium = null; if (r) playStadiumReaction(wrap, r, stadiumFxLevel(f.settings)); else resumeStadiumReaction(wrap);
      const tk = pendingTalk; pendingTalk = null; if (tk && stadiumFxLevel(f.settings) !== 'off') { const S = f.game.state; showCrowdTalk(wrap, tk, { seed: `${S.seed}|${S.playCount || 0}`, colors: { home: S.home.color, away: S.away.color } }); } } }
    { const G = f.game, st = G.state; if (!anim && !st.finished && st.quarter >= 3 && !G.halftimeShown) { G.halftimeShown = true; app.save(); openLiveBox(f, $t('match.halftime')); } }
    if (!anim) guideFootball(f, () => app.save());
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
    const put = (el, html) => { if (el.__html !== html) { el.innerHTML = iconifyMarkup(html); el.__html = html; } }; // unchanged regions are not rebuilt
    put(head, P.head);
    wrap.className = P.wrapClass;
    while (svg.nextSibling) svg.nextSibling.remove();
    svg.insertAdjacentHTML('afterend', P.over);
    put(after, P.after);
    if (f.settings.liveClock) { controls.innerHTML = iconifyMarkup(P.controls); controls.__html = null; } else put(controls, P.controls); // the live play clock's digits are reset by a rebuild
    // The field last (owner 2026-11-25): the result text over it and the buttons under it set the field box's height, so the
    // close camera is fitted to the box as it now is. Drawn before them, a play's end fitted the taller box of the play and the
    // field shrank into the middle once the result text appeared, with the seats showing beside it.
    if (!anim?.noDraw) drawMatchField(svg, P.field);
    afterRender(f, root);
    momentSheets(f);
    if (!anim && f.game?.lastEvent?.sim?.events?.some(e => e.kind === 'ability' || e.kind === 'status')) guideMoment(f, 'status', () => app.save());
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
  // Weather is no longer drawn over the field (owner's decision, 2026-11-23: the rain, snow and wind layers did not look good).
  // A game's venue still records its weather, so saved games are unchanged; nothing in the simulation ever read it.
  /**
   * When the game is over, the winners celebrate on the field: nine of their starters jumping together, confetti in the club's
   * colour, and a line saying who won. Whichever side won, so after a defeat it is the opponent celebrating. Nothing for a tie.
   * Presentation only. Stadium Effects: Full has the jumping and confetti, Reduced shows the group standing still, Off nothing.
   */
  function finalCelebration(f, s, teams) {
    const level = stadiumFxLevel(f.settings); const side = s.winner; if (level === 'off' || !side || !teams?.[side]) return '';
    const seen = new Set(); const pick = (unit, n) => Object.values(teams[side][unit] || {}).filter((m) => m?.id && !m.injury && !seen.has(m.id) && seen.add(m.id)).slice(0, n);
    const members = [...pick('offense', 5), ...pick('defense', 4)]; if (!members.length) return '';
    const club = s[side]; const moving = level === 'full';
    const confetti = moving ? `<div class="final-confetti">${Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 5.6 + (i % 3) * 1.7).toFixed(1)}%;--d:${(2.4 + (i % 5) * 0.35).toFixed(2)}s;animation-delay:-${((i * 0.37) % 3).toFixed(2)}s;background:${i % 3 === 0 ? '#fff' : i % 3 === 1 ? club.color : '#ffd24a'}"></i>`).join('')}</div>` : '';
    return `<div class="final-celebration${moving ? ' moving' : ''}" style="--team:${club.color}">${confetti}<div class="final-party" role="img" aria-label="${esc($t('match.final_celebrate', { club: club.name }))}">${members.map((m, i) => `<span style="animation-delay:-${(i * 0.11).toFixed(2)}s">${monsterSprite(m, 44, { flip: i % 2 === 1 })}</span>`).join('')}</div><div class="final-cheer">${esc($t('match.final_celebrate', { club: club.name }))}</div></div>`;
  }
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
    return ballOn < 50 ? `${$t('match.their', { ballOn })}` : `${$t('match.your', { ballOn: 100 - ballOn })}`;
  }
  function teamsFor(f) {
    const m = F.sundayMatchup(f), teams = { home: m.home, away: m.away }, s=f.game?.state;
    if(s)for(const side of ['home','away'])for(const unit of ['offense','defense']) teams[side][`${unit}Plays`]=eligiblePlays(s,teams[side],teams[side][`${unit}Plays`],PLAYS);
    if(s && !s.finished && ['scrimmage','try'].includes(s.phase)) for(const side of ['home','away']) {
      const unit=(s.phase==='try'?s.tryTeam:s.possession)===side?'offense':'defense';
      const offered=teams[side][`${unit}Plays`], chosen=side===f.game.playerSide ? f.game.selected?.[unit] : null;
      if(chosen && !offered.includes(chosen)) f.game.selected[unit]=null;
      const id=(offered.includes(chosen)?chosen:null) || offered[0];
      const play=PLAYS[id]; if(play) Object.assign(teams[side][unit],R.pickSlots(teams[side][unit],play.onField,teams[side],play,s,side));
    }
    return teams;
  }

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
    const preChoice = anim ? null : R.preparePreChoice(s, teams, {}, { chooser: me }); // a charged Prism Break with several enemy zones waits for the player's pick
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
    const G = f.game; if (activityPaused() || !G?.auto || !G.state || G.state.finished || anim) return;
    autoTimer = setTimeout(() => {
      autoTimer = null; const G2 = app.f?.game; if (activityPaused() || !G2?.auto || G2.state.finished || anim) return;
      if (document.querySelector('.sheet')) { scheduleAuto(app.f); return; } // a halftime or tutorial sheet is open: wait
      if (replayTimer) { scheduleAuto(app.f); return; } // an instant replay is about to start: Auto waits for it
      autoStep(app.f);
    }, Math.round(700 / autoSpeed(f)));
  }
  function autoStep(f) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me); const teams = teamsFor(f);
    if (G.lastEvent?.needsContinue) return act(f, {});
    if (s.phase === 'kickoff' || s.phase === 'free_kick') return act(f, s.kickingTeam === me ? { kickoff: 'normal' } : {});
    if (s.phase === 'try') {
      if (s.tryTeam !== me) return act(f, {});
      if (AI.tryDecision(s, me, teams[me]) === 'two') { const plays = teams[me].offensePlays.filter((id) => PLAYS[id].tags.some((t) => ['short', 'goalline', 'redzone', 'quick'].includes(t))); G.selected.offense = plays[0] || teams[me].offensePlays[0]; return act(f, { tryChoice: 'two' }); }
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
    if (!s.clockRunning) return `<div class="clockstate stopped">${$t('match.stopped_snap_costs_0_s')}</div>`;
    const tempo = myBall ? (G.tempo || 'normal') : null; const cost = tempo ? R.RUNOFF[tempo] : null;
    const unstoppable = s.timeouts[myBall ? R.opponent(s.possession) : s.possession] === 0 && s.clock <= R.RUNOFF.milk;
    return `<div class="clockstate running">${$t('match.running')} ${cost != null ? `${$t('match.s_at_snap', { cost })}` : $t('match.time_off_at_snap')}${unstoppable ? $t('match.cant_be_stopped') : ''}</div>`;
  }
  /** The ⓘ sheet: every control on the match screen, in plain words. */
  function matchHelpHtml(f) {
    return `<h3>${$t('match.downs')}</h3><p>${$t('match.four_tries_to_gain_10_yards')}</p>
      <h3>${$t('match.the_clock')}</h3><p>${$t('match.the_clock_does_not_tick_on', { normal: R.RUNOFF.normal, hurry: R.RUNOFF.hurry, milk: R.RUNOFF.milk })}</p>
      <h3>${$t('match.timeout_spike_kneel_tempo')}</h3><p>${$t('match.b_timeout_b_three_a_half', { hurry: R.RUNOFF.hurry, milk: R.RUNOFF.milk, milk2: R.RUNOFF.milk })}</p>
      <h3>${$t('match.calling_plays')}</h3><p>${$t('match.pick_one_of_the_six_cards')}</p>
      <h3>${$t('match.key_moments_full_coaching_auto_sim')}</h3><p>${$t('match.b_key_moments_b_simulates_the')}</p>
      <h3>${$t('match.edges')}</h3><p>${F.comebackRule(f) ? `${$t('match.b_comeback_mode_b_down_in', { margin: F.COMEBACK.margin, edge: F.COMEBACK.edge })} ` : ''}${$t('match.b_scheme_lock_b_all_starters', { schemeLockEdge: F.SCHEME_LOCK_EDGE })}</p>
      <h3>${$t('match.type_matchups')}</h3><p>${$t('match.before_the_snap_a_green_b')}</p>`;
  }
  function controlsHtml(f, teams, look) {
    const G = f.game; const s = G.state; const me = G.playerSide, them = R.opponent(me);
    // While a play animates in Auto, keep the Auto controls on screen so it can be stopped or its current animation skipped.
    if (anim && G.auto) return `<div class="match-actions"><div class="secondary auto-camera-controls"><button class="btn primary big" data-action="auto" style="flex:2">${$t('match.auto_stop')}</button><button class="btn small ${autoSpeed(f) > 1 ? 'primary' : ''}" data-action="autospeed" title="${$t('match.auto_speed')}">${`${autoSpeed(f)}× ▶`}</button>${cameraButton(f)}</div><p class="dim center" style="margin:4px 0 0">${$t('match.auto_is_calling_the_coachs_plays')}</p><button class="btn block" data-action="skip" style="margin-top:6px">${anim.replay ? $t('match.skip_replay') : 'Skip Animation'}</button></div>`;
    if (anim) return `<div class="match-actions"><button class="btn block ${anim.replay ? 'primary' : ''}" data-action="skip">${anim.replay ? $t('match.skip_replay') : $t('match.skip')}</button></div>`;
    // Auto stays stoppable in every phase it plays through (continues, kickoffs, tries), not only at the snap.
    const autoBar = G.auto && !s.finished ? `<div class="secondary auto-camera-controls" style="margin-bottom:6px"><button class="btn primary" data-action="auto" style="flex:2">${$t('match.auto_stop')}</button><button class="btn small ${autoSpeed(f) > 1 ? 'primary' : ''}" data-action="autospeed">${`${autoSpeed(f)}× ▶`}</button>${cameraButton(f)}</div>` : '';
    // 📼 the last big play again (GDD §34.4): offered between plays, on kickoffs and tries too (right after a touchdown).
    const rpRow = lastReplay && lastReplay.gameKey === s.seed && !s.finished && s.phase !== 'scrimmage' ? `<div class="secondary" style="margin-bottom:6px"><button class="btn small" data-action="replay">${$t('match.replay', { toLowerCase: esc(lastReplay.reason.label.toLowerCase()) })}</button></div>` : '';
    if (s.finished && s.needsTiebreak && !s.winner) { const n = F.inPlayoffs(f) ? 5 : 3; return `<div class="match-actions"><div class="panel center"><h2>${$t('match.still_tied')}</h2><div class="muted">${$t('match.after_overtime', { name: esc(s.away.name), away: s.score.away, home: s.score.home, name2: esc(s.home.name) })}</div><p class="muted" style="margin:6px 0 0">${$t('match.a_b_v_beast_clash_b', { n, n2: n })}</p></div><button class="btn primary big block" data-action="otclash">${$t('match.overtime_beast_clash')}</button></div>`; }
    if (s.finished) return `<div class="match-actions"><div class="panel center"><h2>${s.winner === me ? $t('match.victory') : s.winner === null ? $t('match.tie') : $t('match.defeat')}</h2><div class="muted">${esc(s.away.name)} ${s.score.away}-${s.score.home} ${esc(s.home.name)}${s.tiebreak ? ` ${$t('match.ot_won_by_v_beast_clash', { size: s.tiebreak.size, size2: s.tiebreak.size })}` : s.ot ? ' (OT)' : ''}</div></div><button class="btn primary big block" data-action="finish">${$t('match.continue')}</button></div>`;
    if (G.lastEvent?.needsContinue) return `<div class="match-actions">${autoBar}${rpRow}<button class="btn primary big block" data-action="continue">${$t('match.continue')}</button></div>`;
    const noKickNote = (text) => `<p class="muted center no-kicker-note" role="note" style="margin:0 0 6px;font-size:12px">⚠ ${text}</p>`; // A-3 (the key is looked up at the call, so the text check sees it)
    if (s.phase === 'kickoff' || s.phase === 'free_kick') {
      const weKick = s.kickingTeam === me;
      // A-3 (owner 2026-11-26): a kicking team without an available kicker does not kick: the receiver starts at its own 20.
      if (!R.kickerAvailable(s, teams[s.kickingTeam])) return `<div class="match-actions">${autoBar}${rpRow}${noKickNote($t('match.no_kicker_kickoff'))}<button class="btn primary big block" data-action="kickoff">${$t('match.continue')}</button></div>`;
      return `<div class="match-actions">${autoBar}${rpRow}${weKick ? `<div class="primary-row ${s.phase === 'kickoff' ? 'three' : ''}" style="grid-template-columns:${s.phase === 'kickoff' ? '2fr 1fr' : '1fr'}"><button class="btn primary big" data-action="kickoff">${s.phase === 'free_kick' ? $t('match.free_kick_2') : $t('match.kick_off')}</button>${s.phase === 'kickoff' ? `<button class="btn" data-action="onside">${$t('match.onside')}</button>` : ''}</div>` : `<button class="btn primary big block" data-action="kickoff">${$t('match.receive_the_kick')}</button>`}</div>`;
    }
    if (s.phase === 'try') {
      // Live console: the try's decision comes first; lineup changes and the replay sit in the More sheet, so the field and the
      // choice stay on screen together on short phones (validation 2026-11-18: at 320 x 568 Choose Play fell below the screen).
      const tryMore = (sub) => sub || rpRow ? `<button class="btn small" data-action="match-panel" data-panel="more">${$t('playview.more_controls')}</button><div hidden data-match-panel="more">${rpRow}${sub}</div>` : '';
      if (s.tryTeam !== me) { const more = tryMore(substitutionStrip(f)); return `<div class="match-actions compact-actions">${autoBar}<button class="btn primary big block" data-action="continue">${$t('match.opponents_try_continue')}</button>${more ? `<div class="match-quick-actions">${more}</div>` : ''}</div>`; }
      const near = (id) => PLAYS[id]?.tags.some((t) => ['short', 'goalline', 'redzone', 'quick'].includes(t));
      // The short-yardage plays first, then the rest of the plan: a plan without one used to open an empty Choose Play sheet (owner 2026-11-24).
      const plan = teams[me].offensePlays.filter((id) => PLAYS[id]); const plays = [...plan.filter(near), ...plan.filter((id) => !near(id))];
      const canKick = R.kickerAvailable(s, teams[me]); // A-3: without a kicker the try is a two-point conversion
      return `<div class="match-actions compact-actions">${autoBar}${canKick ? `<p class="muted center" style="margin:0;font-size:12px">${$t('match.touchdown_kick', { tryDecision: AI.tryDecision(s) === 'two' ? 'coach suggests two' : $t('match.coach_suggests_the_kick') })}</p>` : noKickNote($t('match.no_kicker_try'))}
        ${canKick ? `<div class="primary-row" style="grid-template-columns:1fr 1fr"><button class="btn primary big" data-action="trykick">${$t('match.kick_pat_1')}</button><button class="btn big" data-action="trytwo">${$t('match.go_for_two')}</button></div>` : `<button class="btn primary big block" data-action="trytwo">${$t('match.go_for_two')}</button>`}
        <div class="match-quick-actions"><button class="btn small" data-action="match-panel" data-panel="plays">${$t('playview.choose_play')}</button>${tryMore(substitutionStrip(f))}</div><div hidden data-match-panel="plays">${plays.length ? cards(plays, 'offense', G.selected.offense, null) : `<p class="muted" style="margin:4px 0 12px">${$t('match.no_play_can_be_run_for_the_try')}</p>`}</div></div>`;
    }
    // Scrimmage.
    const myBall = s.possession === me;
    const side = myBall ? 'offense' : 'defense';
    const plan = teams[me][side === 'offense' ? 'offensePlays' : 'defensePlays'];
    const suggestion = AI.suggestPlay(s, teams[me], plan, side, G.tendencies[myBall ? me : them], teams[them], G.tendencies[me]);
    const selected = look.myPlay;
    let primary;
    const myKicker = R.kickerAvailable(s, teams[me]); // A-3
    if (myBall && s.down === 4 && !myKicker) primary = `${noKickNote($t('match.no_kicker_fourth'))}<button class="btn primary big block" data-action="snap" ${selected ? '' : 'disabled'}>${$t('match.go_for_it')}</button>`;
    else if (myBall && s.down === 4) {
      const fg = R.fieldGoalInfo(s, teams); const dec = AI.fourthDownDecision(s, teams[me]);
      primary = `<div class="primary-row three"><button class="btn ${dec === 'go' ? 'primary' : ''} big" data-action="snap" ${selected ? '' : 'disabled'}>${$t('match.go_for_it')}</button><button class="btn ${dec === 'punt' ? 'primary' : ''} big" data-action="punt">${$t('match.punt')}</button><button class="btn ${dec === 'fg' ? 'primary' : ''} big" data-action="fg">${$t('match.fg_yd_br', { distance: fg.distance })}<small>${Math.round(fg.chance * 100)}%</small></button></div>`;
    } else primary = `<button class="btn primary big block" data-action="snap" ${selected ? '' : 'disabled'}>${myBall ? (selected ? `${$t('match.snap', { name: esc(PLAYS[selected].name) })}` : $t('match.pick_a_play')) : (selected ? `${$t('match.set_defense', { name: esc(PLAYS[selected].name) })}` : $t('match.pick_a_defense'))}</button>`;
    // Early field goal: on any down, when the kick is makeable; highlighted when a half is about to end.
    let fgEarly = '';
    if (myBall && myKicker && s.down < 4 && s.phase === 'scrimmage') { const fg = R.fieldGoalInfo(s, teams); if (fg.chance >= 0.2) fgEarly = `<button class="btn small ${!s.ot && s.clock <= 30 && (s.quarter === 2 || s.quarter >= 4) ? 'good' : ''}" data-action="fg" title="${$t('match.kick_now_instead_of_running_a')}">FG ${fg.distance} yd · ${Math.round(fg.chance * 100)}%</button>`; }
    const secondary = `<div class="secondary">
      <button class="btn small" data-action="timeout" ${s.timeouts[me] ? '' : 'disabled'}>${$t('match.timeout_2', { timeouts: s.timeouts[me] })}</button>
      ${myBall ? `<select class="btn small" data-change="tempo" aria-label="${$t('match.tempo')}" style="min-height:36px;margin:0;flex:1"><option value="normal" ${(G.tempo || 'normal') === 'normal' ? 'selected' : ''}>${$t('match.tempo_normal')}</option><option value="hurry" ${G.tempo === 'hurry' ? 'selected' : ''}>${$t('match.tempo_hurry_up')}</option><option value="milk" ${G.tempo === 'milk' ? 'selected' : ''}>${$t('match.tempo_milk_clock')}</option></select>` : ''}
      ${fgEarly}
      ${myBall && myKicker && s.phase === 'scrimmage' ? (() => { const sg = R.fieldGoalSignature(s, teams); return sg?.available ? `<button class="btn small good" data-action="fgsig" title="${$t('match.once_per_game_the_signature_kicks')}">${esc(sg.label)} ${sg.distance} yd · ${Math.round(sg.chance * 100)}%</button>` : ''; })() : ''}
      ${myBall && AI.shouldKneel(s) ? `<button class="btn small" data-action="kneel">${$t('match.kneel')}</button>` : ''}${myBall && !s.ot && s.clockRunning && s.quarter >= 2 && s.clock < 60 ? `<button class="btn small" data-action="spike">${$t('match.spike')}</button>` : ''}
      <button class="btn small ${G.auto ? 'primary' : ''}" data-action="auto" title="${$t('match.auto_the_coachs_suggested_plays_are')}">${G.auto ? $t('match.auto_stop') : $t('match.auto')}</button>
      ${G.auto ? `<button class="btn small ${autoSpeed(f) > 1 ? 'primary' : ''}" data-action="autospeed" title="${$t('match.auto_speed')}">${`${autoSpeed(f)}× ▶`}</button>${cameraButton(f)}` : ''}
      <button class="btn small" data-action="mode">${G.mode === 'key' ? $t('match.key_moments_3') : $t('match.full_coaching_2')}</button>
      <button class="btn small" data-action="simfinal" title="${$t('match.skip_the_rest_of_the_game')}">${$t('match.sim_to_final_2')}</button>
      ${lastReplay && lastReplay.gameKey === s.seed ? `<button class="btn small" data-action="replay" title="${$t('match.watch_the_last_big_play_again', { play: esc(lastReplay.reason.label.toLowerCase()) })}">${$t('match.replay_2')}</button>` : ''}
      ${G.mode === 'key' ? `<button class="btn small good" data-action="keymoment">${$t('match.sim_to_key_moment')}</button>` : ''}</div>`;
    const subPanel = substitutionStrip(f);
    const clock = f.settings.liveClock && s.phase === 'scrimmage' ? `<div class="playclock">${$t('match.play_clock')} <b id="pc">40</b><div class="bar"><i id="pcbar" style="width:100%"></i></div></div>` : '';
    const plans = selected ? zonePlans(s, teams, me, myBall ? selected : look.presnap.offensePlay.id, myBall ? look.presnap.defensePlay.id : selected) : [];
    return `<div class="match-actions compact-actions">${autoBar}${primary}<div class="match-quick-actions">
      <button class="btn small" data-action="match-panel" data-panel="plays">${$t('playview.choose_play')}</button>
      ${plans.length || s.t8?.preChoice?.prismChoice ? `<button class="btn small" data-action="match-panel" data-panel="zones">${$t('playview.zones')}</button>`:''}
      <button class="btn small" data-action="match-panel" data-panel="more">${$t('playview.more_controls')}</button>
      <button class="btn small" data-action="match-panel" data-panel="notices">${$t('playview.guide_notices')}</button></div>${clock}</div>
      <div hidden data-match-panel="matchups">${presnapEdges.length?`<h3>${$t('playview.matchups_this_play')}</h3>`:''}${presnapEdges.map((x,i)=>`<button class="match-type-note" data-action="matchup" data-i="${i}">${x[presnapMe].mod>0?$t('playview.good_matchup',{name:esc(x[presnapMe].name),opponent:esc(x[presnapMe==='off'?'def':'off'].name)}):$t('playview.tough_matchup',{name:esc(x[presnapMe].name),opponent:esc(x[presnapMe==='off'?'def':'off'].name)})}</button>`).join('')}</div>
      <div hidden data-match-panel="zones">${myBall?'':prismPickerHtml(s)}${zonePlannerHtml(plans,{focus:G.zoneFocus})}</div>
      <div hidden data-match-panel="more">${secondary}${subPanel}<div class="muted">${$t('match.coachs_suggestion_opponents_call_is_hidden',{myBall:myBall?$t('match.your_offensive_plays'):$t('match.your_defensive_plays')})}${teams[me].blockedPlays?.length?` · ${$t('match.plays_unavailable_no_legal',{n:teams[me].blockedPlays.length})} ${teams[me].blockedSlots.join('/')})`:''}</div></div>
      <div hidden data-match-panel="plays">${cards(plan,side,selected,suggestion)}</div>`;
  }
  function cards(ids, side, selected, suggestion) {
    return `<div class="play-grid">${ids.slice(0, 6).map((id) => {
      const picked = selected === id;
      const advised = suggestion === id;
      const badges = [picked ? $t('match.selected_play') : '', advised ? $t('match.coach_pick') : ''].filter(Boolean);
      return `<button class="card ${picked ? 'selected' : ''} ${PLAYS[id].legendary ? 'legendary' : ''}" data-action="pick" data-side="${side}" data-id="${id}" aria-pressed="${picked}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span>${badges.length ? `<span class="play-card-badges">${badges.map(badge => `<span>${esc(badge)}</span>`).join('')}</span>` : ''}</button>`;
    }).join('')}</div>`;
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
    const ev = recorder.runStep(s, teams, G.tendencies, c, () => step(s, teams, controllers, G.tendencies, c), { mode: 'human', playerSide: me, tempo: G.tempo || 'normal' });
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
    stopStadiumReaction(); // the next play: a held cheer (a score) ends here (owner 2026-11-24)
    if (!ev) { app.save(); refresh(f); return; }
    { // a first down on this play (for the crowd's bubbles): the offense's first-down count went up
      const st = G.state.stats || {}; const now = { home: st.home?.firstDowns || 0, away: st.away?.firstDowns || 0 }; const was = G.fdSeen || now;
      const side = ev.offenseSide || G.state.possession; ev.firstDown = !!side && now[side] > (was[side] || 0); G.fdSeen = now; }
    if (ev.kind === 'kickoff' && ev.sim) ev.offenseSide = R.opponent(ev.kicking); // a live kickoff (Task 8 M2): the return unit is the engine's offense
    if (ev.sim && ev.sim.frames?.length > 1 && !f.settings.reducedMotion) { startAnim(f, ev); return; }
    if (!ev.sim && !f.settings.reducedMotion && (ev.kind === 'kickoff' || ev.kind === 'punt' || ev.kind === 'field_goal' || (ev.kind === 'try' && ev.res))) {
      // Task 8 (I1): the formula kick as the reviewer draws it (buildKickFx: the kick animation plus the kick ability's cue derived from
      // the final result: Second Chance, Dragon Roar, Stone Cradle). An ordinary kick has no cue and plays exactly as before (no fx).
      const K = kickPlay(ev, kickLookup(f, ev.kicking), fxMeta(ev, true));
      if (K?.sim?.frames?.length > 1) { ev.offenseSide = ev.kicking; ev.sim = K.sim; ev.kickerName = teamsFor(f)[ev.kicking]?.kicker?.name || null; if (K.fx) kickFx.set(K.sim, K.fx); startAnim(f, ev); return; }
    }
    G.lastEvent = { turnover: turnoverCue(ev)?.text, text: ev.text, important: ev.scored || KEY_RESULTS.has(ev.sim?.result) || ev.kind === 'field_goal', needsContinue: false, abilities: abilitiesFired(ev), inspect: inspectNotes(ev), callout: callout(ev, G.playerSide, G.state), stadium: stadiumReaction(ev), talk: crowdTalk(ev, { away: stadiumScene()?.crowd?.mix?.away ?? 0, seed: `${G.state.seed}|${G.state.playCount || 0}` }), fresh: true };
    app.save(); refresh(f);
  }
  function startAnim(f, ev, opts = {}) {
    settleSave(); // every way into a play (snap, kneel/spike, harness): no queued save may fire inside the animation
    const G = f.game; const sim = ev.sim;
    anim = { frames: sim.frames, i: 0, ev, camera: followsBall(sim) ? cameraFor(Math.max(0, (sim.ballOn || 0) + sim.frames[0].ball[0] + 6)) : cameraFor(sim.ballOn), ballOn: sim.ballOn, ballLat: sim.ballLat, start: performance.now(), msPerFrame: 100 / ((f.settings.speed || 1) * (G.auto ? autoSpeed(f) : 1)), follow: followsBall(sim), sprites: spritesFor(f, ev.offenseSide || G.state.possession) };
    anim.fx = opts.lookup && (!sim.kick || sim.kickAbility) ? buildFx(sim, opts.lookup, fxMeta(ev, true)) : fxFor(f, ev, true);
    // Task 8 (I6): effects that begin before the snap (gates rising, Foresight's eye, a field's reveal, Dragon Roar's roar) get their
    // time before it: the first frame is held for fx.preroll seconds of play time while they draw, then the play runs as recorded.
    anim.pre = anim.fx?.preroll || 0; if (anim.pre) anim.start += anim.pre * 10 * anim.msPerFrame;
    G.lastEvent = null;
    anim.noDraw = true; refresh(f); anim.noDraw = false; // the field is drawn once, below, at its play-time size
    // The snap without a stall (owner 2026-11-25): the field box takes its play-time height now (the result text above it and the
    // play-call buttons under it are gone), so the camera is fitted once here instead of on the first frames of the play, and the
    // play's clock starts at its first drawn frame, so the start of the play is never skipped while the screen updates.
    { const svg0 = document.querySelector('#field'); if (svg0 && fitFieldSpan(svg0)) anim.camera = followsBall(sim) ? cameraFor(Math.max(0, (sim.ballOn || 0) + sim.frames[0].ball[0] + 6)) : cameraFor(sim.ballOn);
      if (svg0) drawMatchField(svg0, screenParts(f).field); }
    anim.t0 = performance.now();
    const cue = turnoverCue(ev);
    let cueShown = false;
    const tick = (rafNow) => {
      if (!anim) return;
      if (activityPaused()) { anim.pausedAt ??= rafNow; anim.raf = requestAnimationFrame(tick); return; }
      if (anim.pausedAt != null) { anim.start += rafNow - anim.pausedAt; delete anim.pausedAt; }
      if (anim.t0 != null) { if (!RP_CLOCK && rafNow > anim.t0) anim.start += rafNow - anim.t0; anim.t0 = null; } // the clock starts at the first frame
      const now = RP_CLOCK ? RP_CLOCK(rafNow) : rafNow; // render-perf harness only (inert otherwise): a fixed clock for frame-exact screenshots
      // requestAnimationFrame timestamps can sit a hair before the performance.now() taken at start: clamp at frame 0, never finish early.
      if (anim.pre && now < anim.start && sim.frames.length) { // the pre-roll: the snap is at anim.start
        const svg0 = document.querySelector('#field');
        if (svg0 && now - (anim.preDrawn || 0) >= 33) { anim.preDrawn = now; const s0 = G.state; drawMatchField(svg0, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s0, anim.ev), ...kitOpts(s0, anim.ev.offenseSide), frame: sim.frames[0], prevFrame: null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), time: Math.max(-anim.pre, (now - anim.start) / anim.msPerFrame * 0.1), ownLabel: s0[anim.ev.offenseSide].abbr, oppLabel: s0[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites }); }
        anim.raf = requestAnimationFrame(tick); return;
      }
      const raw = Math.max(0, Math.floor((now - anim.start) / anim.msPerFrame));
      if (cue && !cueShown && (now - anim.start) / anim.msPerFrame * .1 >= cue.time) {
        cueShown = true;
        document.querySelector('#fieldwrap')?.insertAdjacentHTML('beforeend', `<div class="turnover-cue" role="status">${cue.text}</div>`);
      }
      const idx = Math.min(sim.frames.length - 1, raw);
      if (!sim.frames.length) { finishAnim(f, false); return; } // a play with no frames (nothing to draw)
      // End-of-play hold: keep drawing the last frame while an effect that fired at the whistle plays out.
      if (raw > sim.frames.length - 1 && anim.fx && holds(anim)) {
        const last = sim.frames[sim.frames.length - 1]; const extra = (raw - (sim.frames.length - 1)) * 0.1; const hold = anim.hold ??= endHold(anim.fx, last.t ?? 0);
        const svg2 = document.querySelector('#field');
        if (extra < hold && svg2 && now - (anim.holdDrawn || 0) >= 33) { anim.holdDrawn = now; const s2 = G.state; drawMatchField(svg2, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), ...kitOpts(s2, anim.ev.offenseSide), frame: last, prevFrame: last, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), time: (last.t ?? 0) + extra, ownLabel: s2[anim.ev.offenseSide].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites }); anim.raf = requestAnimationFrame(tick); return; }
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
        else if (anim.camera) { const target = carrierCamera(sim.ballOn || 0, sim.frames[idx]); anim.camera = { bottom: anim.camera.bottom + (target.bottom - anim.camera.bottom) * 0.35, top: 0 }; anim.camera.top = anim.camera.bottom + (target.top - target.bottom); }
        const prevT = sim.frames[Math.max(0, idx - 1)].t ?? 0, ft = sim.frames[idx].t ?? 0;
        const drawFrame = half ? midFrame(sim.frames[idx], sim.frames[idx + 1]) : sim.frames[idx];
        drawMatchField(svg, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s, anim.ev), ...kitOpts(s, anim.ev.offenseSide), frame: drawFrame, prevFrame: sim.frames[idx - 1] || null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), qbRead: qbReadsShown(f.settings, { live: true }), ownLabel: s[anim.ev.offenseSide].abbr, oppLabel: s[R.opponent(anim.ev.offenseSide)].abbr, camera: anim.camera, noLines: anim.follow, event: G.event, sprites: anim.sprites });
        if (idx > 0 && !half && shakeBetween(anim.fx, prevT, ft)) shakeField(f);
        if (performance.now() - t0 > 18 && !(RP_CLOCK && globalThis.__gbRenderPerf.clock)) anim.slow = true; // this device cannot afford half-steps: back off for the rest of the play (never under the harness's fixed clock: frame-exact screenshots)
      }
      if (cue && idx >= sim.frames.length - 1 && now < anim.start + cue.time * 10 * anim.msPerFrame + 650) { anim.raf = requestAnimationFrame(tick); return; }
      if (idx >= sim.frames.length - 1 && !(anim.fx && holds(anim) && endHold(anim.fx, sim.frames[sim.frames.length - 1].t ?? 0) > 0)) { finishAnim(f, false); return; }
      anim.raf = requestAnimationFrame(tick);
    };
    anim.raf = requestAnimationFrame(tick);
  }
  /**
   * Scrimmage plays (owner 2026-11-24): the close camera stays at the line until the ball nears an edge of the picture, then
   * follows the ball carrier, so a long run is seen all the way to the end zone. It stops where the play's own camera stops: the
   * stands behind the end line (cameraFor clamps). Zoomed out (Auto), the whole field is shown and this changes nothing.
   */
  function carrierCamera(ballOn, frame) {
    const base = cameraFor(ballOn); const y = ballOn + (frame?.ball?.[0] ?? 0); const span = base.top - base.bottom;
    if (y > base.top - 12) return cameraFrom(y - span + 12); // 12 yards of field kept ahead of the ball
    if (y < base.bottom + 6) return cameraFrom(y - 6); // a sack or a loss: 6 yards kept behind it
    return base;
  }
  /** Kick plays follow the ball with the camera: the formula animations (kick-anim.js) and the live kickoff's engine frames. */
  function followsBall(sim) { return !!(sim.kick || sim.kickoff || sim.events?.some((e) => e.ability === 'PSY-02-F' || e.ability === 'DRA-03-F')); }
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
    if (!a || !b || a.phase !== b.phase || !a.ball || !b.ball || a.motion !== b.motion || a.ballHidden !== b.ballHidden) return a;
    const lerp = (p, q) => q && q[0] === p[0] ? [p[0], (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, p[3], p[4]] : p;
    const byId = (list) => Object.fromEntries(list.map((p) => [p[0], p]));
    const bo = byId(b.off), bd = byId(b.def);
    return { ...a, t: ((a.t ?? 0) + (b.t ?? 0)) / 2, off: a.off.map((p) => lerp(p, bo[p[0]])), def: a.def.map((p) => lerp(p, bd[p[0]])), ball: [(a.ball[0] + b.ball[0]) / 2, (a.ball[1] + b.ball[1]) / 2, a.ball[2]], mid: true };
  }
  // Uniforms (team-kit.js): the home club in its home kit, the visitors in the kit that stands apart from it; the field's branding
  // needs to know which end zone the home club defends (the camera always has the offense attacking up).
  function kitOpts(s, offenseSide) { const kits = gameKitsFor(s); const o = offenseSide || 'home'; return { kits: { off: kits[o], def: kits[R.opponent(o)] }, homeOnOffense: o === 'home' }; }
  function animColors(s, ev) { const o = ev.offenseSide || 'home'; return { off: s[o].color, def: s[R.opponent(o)].color }; }
  function finishAnim(f, skipped) {
    if (!anim) return;
    if (anim.replay) { endReplay(f); return; }
    const { ev } = anim; cancelAnimationFrame(anim.raf); anim = null;
    const G = f.game;
    G.lastEvent = { text: ev.text, important: !!ev.scored || KEY_RESULTS.has(ev.sim?.result), needsContinue: false, abilities: abilitiesFired(ev), inspect: inspectNotes(ev), callout: callout(ev, G.playerSide, G.state), stadium: stadiumReaction(ev), talk: crowdTalk(ev, { away: stadiumScene()?.crowd?.mix?.away ?? 0, seed: `${G.state.seed}|${G.state.playCount || 0}` }), fresh: true };
    app.save(); refresh(f); saveWhenIdle(); // the play's result is requested above and written while the screen is idle after it
    // Instant replay (GDD §34): the outcome is final and saved above; the replay only re-draws this play's recorded frames.
    const reason = replayReason(ev, G.state, G.playerSide);
    if (reason) lastReplay = { ev, reason, gameKey: G.state.seed };
    if (reason && !skipped && f.settings.replays !== false) { pendingTip = ev; clearTimeout(replayTimer); replayTimer = setTimeout(() => { replayTimer = null; const G2 = app.f?.game; if (!anim && G2 && G2.state.seed === lastReplay?.gameKey && document.querySelector('#fieldwrap') && !document.querySelector('.sheet')) startReplay(app.f, lastReplay); else { firstAbilityTip(app.f, ev); pendingTip = null; } }, 350); return; }
    firstAbilityTip(f, ev);
  }

  // ------------------------------------------------------------ instant replay (GDD §34)
  // A replay is presentation only: it draws frames already in memory (ev.sim.frames) and touches nothing in f.game.
  // The buffer is the one most recent eligible play, in memory only (never saved).
  let lastReplay = null; let pendingTip = null; let replayTimer = null;
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
      if (activityPaused()) { anim.pausedAt ??= rafNow; anim.raf = requestAnimationFrame(tick); return; }
      if (anim.pausedAt != null) { anim.start += rafNow - anim.pausedAt; delete anim.pausedAt; }
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
        drawMatchField(svg, { venue: G.state.venue, ballOn: anim.ballOn, ballLat: anim.ballLat, toGo: anim.ev.toGo ?? 10, colors: animColors(s2, anim.ev), ...kitOpts(s2, anim.ev.offenseSide), frame, prevFrame: sim.frames[pos.i - 1] || null, fields: sim.fields || null, fx: anim.fx, fxQuality: fxQualityFor(f), fxOptions: fxOptionsFor(f.settings), qbRead: false, ownLabel: s2[anim.ev.offenseSide || s2.possession].abbr, oppLabel: s2[R.opponent(anim.ev.offenseSide || s2.possession)].abbr, camera: anim.camera, event: G.event, noLines: true, sprites: anim.sprites, time: frame.t });
        // Camera: a slight zoom that tracks the ball (CSS transform on the svg; the wrap clips it).
        if (zoomOn) { const VB = fieldBox(); const bx = (anim.ballLat + frame.ball[1] - VB[0]) / VB[2], by = (anim.camera.top - (anim.ballOn + frame.ball[0])) / VB[3]; svg.style.transformOrigin = `${(Math.max(0.15, Math.min(0.85, bx)) * 100).toFixed(1)}% ${(Math.max(0.15, Math.min(0.85, by)) * 100).toFixed(1)}%`; svg.style.transform = `${`scale(${REPLAY.zoom})`}`; }
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
    if (automaticTipsOff(f) || !ev.sim) return; // Coach Assist: no automatic tips in Expert or after the guided tour's kickoff handoff
    const G = f.game; const seen = (f.abilityTips ||= {}); const off = ev.offenseSide || G.state.possession; const look = fxLookup(f, off);
    for (const e of (Array.isArray(ev.sim.events) ? ev.sim.events : [])) {
      if (e.kind !== 'ability' || e.trait) continue;
      const m = look(e.side, e.by); const sp = m?.species ? SPECIES_BY_ID[m.species] : null; const info = sp ? abilityInfo(sp.id, 'football') : null; const ab = info ? { name: info.name, text: info.summary } : null; // the Dex ability (Task 8), never the retired legacy card
      if (!ab || seen[ab.name]) continue;
      seen[ab.name] = true; app.save();
      const side = e.side === 'off' ? off : R.opponent(off); const yours = side === G.playerSide; const club = G.state[side]?.name || '';
      if (G.auto) { toast(`✨ ${ab.name} (${m.name}, ${yours ? 'yours' : club}): ${ab.text}`, 'good', 5000); return; }
      sheet(`<p style="margin-top:0"><b>${esc(m.name)}</b> ${yours ? '(yours)' : `${$t('match.of_the', { club: esc(club) })}`} ${$t('match.just_used_b_b', { name: esc(ab.name) })}</p><p class="muted">${esc(ab.text)}</p><p class="dim" style="font-size:12px">${$t('match.every_signature_ability_belongs_to_one')}</p><button class="btn small see-it" data-see-it="${sp.id}">${$t('match.see_it_again')}</button>`, { title: `✨ ${ab.name}` });
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
  const STATUS_NAME = { stunned: $t('match.stunned'), slowed: $t('match.slowed'), stumbled: $t('match.stumbled'), knockedDown: $t('match.knocked_down'), afflicted: $t('match.afflicted'), weakened: $t('match.weakened'), confused: $t('match.confused') };
  function inspectHtml(f, I) {
    const s = f.game.state; const m = I.monster; const st = I.stamina; const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
    const note = (n) => `<div class="inspect-note ${n.tick ? 'tick' : ''}">${n.tick ? `<b aria-hidden="true">✓</b> ` : ''}${esc(n.text)}</div>`;
    const bar = I.full ? `<div class="inspect-bar ${st.exhausted ? 'out' : st.low ? 'low' : ''}" role="img" aria-label="${$t('match.stamina_of', { now: num(st.now), capacity: st.capacity })}"><i style="width:${Math.round(st.frac * 100)}%"></i></div>` : '';
    const stamLine = I.full ? `${num(st.now)} / ${st.capacity}${st.played ? '' : $t('match.has_not_played_yet')}` : st.exhausted ? $t('match.exhausted') : st.low ? $t('match.low') : $t('match.not_low');
    return `<div class="inspect" data-inspect-sheet="${esc(m.id)}">
      <div class="row" style="gap:10px;align-items:center">${monsterSprite(m, 44)}<div class="grow"><b>${esc(m.name)}</b><div class="muted" style="font-size:12px">${beastSpeciesHtml(m)} · ${esc(m.position || '')} · ${esc(m.type || '')}${I.slot ? ` ${$t('match.lined_up_at', { slot: esc(I.slot) })}` : ''} · ${esc(s[I.team].abbr)}${I.full ? '' : ' (opponent)'}</div></div></div>
      ${I.absent ? `<div class="inspect-note tick">${$t('match.swallowed_by_sovereign_arm_he_misses', { abbr: esc(s[I.absent.serveOn]?.abbr || $t('match.the_offense')) })}</div>` : ''}
      <div class="inspect-sec" data-sec="stamina"><div class="row between">${$t('match.b_stamina_b')}<span>${stamLine}</span></div>${bar}
        ${st.exhausted ? `<div class="inspect-note">${$t('match.exhausted_for_the_rest_of_the')}</div>` : st.low ? `<div class="inspect-note">${$t('match.low_the_battery_shows_over_his')}</div>` : ''}${I.staminaNotes.map(note).join('')}</div>
      ${I.awarenessNotes.length ? `<div class="inspect-sec" data-sec="awareness">${$t('match.b_awareness_b')}${I.awarenessNotes.map(note).join('')}</div>` : ''}
      <div class="inspect-sec" data-sec="status"><div class="row between">${$t('match.b_status_b')}<span>${I.status ? `${esc(STATUS_NAME[I.status.id] || I.status.id)}${I.status.remaining != null ? ` ${$t('match.plays_left', { remaining: I.status.remaining, n: I.status.remaining })}` : $t('match.this_play')}` : $t('match.none')}</span></div></div>
      ${I.ability ? `<div class="inspect-sec" data-sec="ability"><b>${esc(I.ability.name)}</b><div style="font-size:14px;margin-top:2px">${esc(I.ability.text)}</div></div>` : ''}</div>`;
  }
  function openInspect(f, mid) {
    const G = f?.game; if (!G || !mid) return; const teams = teamsFor(f); const mine = findMonster(teams, mid)?.team === G.playerSide; // an opponent shows only what the field already shows
    const I = inspectInfo(G.state, teams, mid, { formation: inspectForm, last: G.lastEvent?.inspect || null, full: mine }); if (!I) return;
    sheet(inspectHtml(f, I), { title: $t('match.inspect') });
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
    const list = presnapFields(s, teams, calls, { hideDefenseAlign: mine, formation: drawn, viewerSide: G.playerSide });
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
      if (now - last >= 33) { last = now; const C = P0.at(performance.now()); drawMatchField(svg, { ...P0.field, fields: C.fields.length ? C.fields : null, fx: C.fx, time: C.time }); if (!C.until) return; }
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
      const ev = recorder.runStep(s, teams, G.tendencies, {}, () => step(s, teams, controllers, G.tendencies, {}), 'ai');
      n++; if (ev) lines.push(ev.text);
      if (!ev) break;
      if (ev.scored || KEY_RESULTS.has(ev.sim?.result) || isKey()) break;
    }
    G.simmed = lines.slice(-6);
    G.lastEvent = { text: `${$t('match.plays_simulated', { n, n3: lines[lines.length - 1] || '' })}`, important: false };
    G.selected = { offense: null, defense: null }; G.aiCall = null;
    app.save(); Router.render();
    if (lines.length > 1) sheet(`<div class="log">${lines.map((l) => `<div class="entry"><span class="t"></span><span>${esc(l)}</span></div>`).join('')}</div>`, { title: $t('match.simulated_plays') });
  }

  /** Skip the rest of the game: the coach plays it out headless, then the final whistle screen. */
  function simToFinal(f) {
    const G = f.game; const s = G.state; if (s.finished) return;
    const teams = teamsFor(f); const me = G.playerSide, them = R.opponent(me);
    const controllers = { [me]: aiController(me), [them]: aiController(them) };
    let n = 0; while (!s.finished && n++ < 600) { const ev = recorder.runStep(s, teams, G.tendencies, {}, () => step(s, teams, controllers, G.tendencies, {}), 'ai'); if (!ev) break; }
    stopAnim(); clearTimeout(autoTimer); autoTimer = null; G.auto = false;
    G.lastEvent = { text: `${$t('match.simulated_to_the_final_whistle', { name: s[me].name, score: s.score[me], name2: s[them].name, score2: s.score[them] })}`, important: true };
    G.selected = { offense: null, defense: null }; G.aiCall = null;
    app.save(); Router.render();
  }

  /**
   * Task 10 (owner 2026-11-13): the play-by-play reads like a broadcast by default: grouped by quarter, each snap with the down,
   * distance and spot it started from, who had the ball and the play that was called. The technical view (a toggle in the sheet)
   * adds the engine's own detail for testing: the result code, the yards, both play ids and the repro code that replays the play.
   */
  function showLog(f, technical = showLog.technical || false, filter = 'all') {
    const s = f.game?.state; if (!s) return;
    showLog.technical = technical;
    const abbr = (side) => s[side]?.abbr || '';
    const playName = (id) => (id && PLAYS[id] ? PLAYS[id].name : '');
    const row = (e) => {
      const snap = e.kind === 'play' && e.down;
      const sit = snap ? `${abbr(e.team)} · ${R.situationText({ phase: 'scrimmage', down: e.down, toGo: e.toGo, ballOn: e.ballOn })}` : '';
      const call = snap && e.off ? playName(e.off) : '';
      const tech = technical && (e.result || e.repro) ? `<br><small class="dim mono">${esc([e.result, e.yards != null ? `${e.yards} yds` : null, e.off && e.def ? `${e.off} vs ${e.def}` : null, e.kind].filter(Boolean).join(' · '))}${e.repro ? `<br>repro ${esc(e.repro)}` : ''}</small>` : '';
      return `<div class="entry ${e.important ? 'important' : ''} ${e.kind}"><span class="t">${fmtClock(e.clock)}</span><span>${sit ? `<small class="pbp-sit">${esc(sit)}${call ? ` · ${esc(call)}` : ''}</small><br>` : ''}${esc(lineText(e))}${tech}</span></div>`;
    };
    const groups = []; for (const e of s.log.slice().reverse().filter(e => matchLogMatches(e, filter))) { const q = R.quarterText({ quarter: e.q }); if (groups.at(-1)?.q !== q) groups.push({ q, rows: [] }); groups.at(-1).rows.push(e); }
    const body = groups.map((g) => `<h4 class="pbp-q">${esc(g.q)}</h4>${g.rows.map(row).join('')}`).join('');
    const toggle = `<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-action="pbp-view" aria-pressed="${technical}">${technical ? $t('match.pbp_simple_view') : $t('match.pbp_technical_view')}</button></div>`;
    const foot = technical ? `<p class="dim">${$t('match.a_repro_code_replays_that_exact')} <span class="mono">node tests/tools/replay.js CODE</span>.</p>` : '';
    const filters = `<div class="row wrap">${[['all',$t('polish.all')],['scoring',$t('polish.scoring')],['turnovers',$t('polish.turnovers')],['injuries',$t('polish.injuries')],['abilities',$t('polish.abilities')]].map(([id,label])=>`<button class="btn small ${filter===id?'primary':''}" data-log-filter="${id}">${label}</button>`).join('')}</div>`;
    const sh = sheet(`${toggle}${filters}<div class="log pbp">${body}</div>${foot}`, { title: $t('match.play_by_play') });
    sh.el.querySelectorAll('[data-log-filter]').forEach(b=>b.addEventListener('click',()=>{sh.close();showLog(f,technical,b.dataset.logFilter);}));
    sh.el.querySelector('[data-action="pbp-view"]')?.addEventListener('click', () => { sh.close(); showLog(f, !technical, filter); });
  }

  function finishGame(f) {
    if (!f.game?.state?.finished || finishGame.busy) return; // protect against a second tap
    if (finishGame.pendingFor === f.game) return; // already settling
    if (f.guide?.enabled) { f.guide.evidence.gameFinished = true; app.save(); }
    finishGame.busy = true; setTimeout(() => { finishGame.busy = false; }, 0);
    const G = f.game; const s = G.state; const me = G.playerSide;
    const won = s.winner === me;
    const teams = teamsFor(f);
    // Play test 2026-11-26: settling the week (finishSunday) and the save took seconds with the screen frozen. The result now opens at
    // once with "Wrapping up the week…"; the rest fills in when ready. Closing early is carried out once the week is settled.
    const them = R.opponent(me); const tag = G.tag || ''; const champ = G.event === 'playoff' && isBeastBowlTag(tag); /* only the Beast Bowl itself ("Titan Semifinal" matched /final/ before v42.11) */ const playoff = G.event === 'playoff';
    const diff = s.score[me] - s.score[them]; const feel = won ? (champ ? $t('match.beast_bowl_champions') : playoff ? $t('match.playoff_win') : diff >= 17 ? $t('match.dominant_win') : diff <= 3 ? $t('match.narrow_win') : 'VICTORY') : (champ ? $t('match.beast_bowl_lost') : playoff ? $t('match.season_over') : diff >= -3 ? $t('match.narrow_loss') : 'DEFEAT');
    let settled = null; let closeWanted = false; let onSettledClose = null; finishGame.pendingFor = G;
    const pending = sheet(`<div class="final-hero ${won ? 'won' : 'lost'} ${champ ? 'champ' : playoff ? 'playoff' : ''}"><div class="final-feel">${feel}</div><div class="final-score"><span style="color:${teamInk(s[me].name, s[me].color)}">${esc(s[me].abbr)}</span> ${s.score[me]} <span class="dim">–</span> ${s.score[them]} <span style="color:${teamInk(s[them].name, s[them].color)}">${esc(s[them].abbr)}</span></div></div><p class="final-pending muted center" role="status">${$t('match.wrapping_up_week')}</p>`,
      { title: $t('match.final_3'), onClose: () => { if (settled) onSettledClose?.(); else closeWanted = true; } });
    const settle = () => {
      try { const r = F.finishSunday(f, s); app.save(); app.backup(f); settled = r; finishScreen(r); } finally { finishGame.pendingFor = null; } // no second settle from a tap behind the sheet
    };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(settle, 0))); // paint first, then work
    const finishScreen = (r) => {
    const ev = r.events || [];
    const badgeClub = r.newBadge; const gym = badgeClub ? GYM_BY_CLUB[badgeClub] : null;
    const otTag = s.tiebreak ? ` ${$t('match.ot_v_clash', { size: s.tiebreak.size, size2: s.tiebreak.size })}` : s.ot ? ' (OT)' : ''; const box = boxScoreHtml(s, teams, { title: gym ? `${$t('match.final_badge_game_won', { otTag })}` : `${$t('match.final_2', { otTag })}` });
    // Beast Bowl won: the ceremony follows the final whistle (GDD §35). The result, the title and the season's end are already
    // saved above (finishSunday), so skipping the ceremony can never skip anything that counts.
    const title = won && f.season.champion === f.club && (f.history || []).some((h) => h.year === f.season.year && h.championship);
    const toHq = () => (title ? Router.go('ceremony', { year: f.season.year, fromGame: true }, { reset: true }) : Router.go('hq', {}, { reset: true }));
    // Gym cleared: the beaten coach's handshake first, then the badge itself (GDD §15.4, playtest round 3).
    const handshake = () => {
      if (!gym) return toHq();
      const hue = TYPES[gym.element]?.hue ?? 120; const lines = beatenLines(badgeClub);
      const { close } = sheet(`<div class="talk handshake"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite(gym.coach.portrait, 56, { hue })}<div class="grow"><div class="talk-name">${esc(gym.coach.name)} <span class="dim">${$t('match.head_coach', { badgeClub: esc(badgeClub) })}</span></div>${lines.map((l) => `<p class="talk-line">“${esc(l)}”</p>`).join('')}</div></div>
        <button class="btn primary big block" data-action="shake" style="margin-top:10px">${$t('match.shake_hands')}</button></div>`, { title: $t('match.midfield'), onClose: celebrate });
      document.querySelector('.sheet [data-action="shake"]')?.addEventListener('click', () => close());
    };
    const celebrate = () => {
      if (!gym) return toHq();
      const hue = TYPES[gym.element]?.hue ?? 120; const n = Object.keys(f.campaign.badges).length; const sp = SPECIES_BY_ID[gym.legendary];
      const { close } = sheet(`<div class="badge-win" style="--hue:${hue}"><div class="badge-win-ring"><span>★</span></div><div class="badge-win-title">${$t('match.badge_earned')}</div><div class="badge-win-name">${esc(gym.badge)}</div>
        <p class="muted">${$t('match.and_the_fall_thats_badge_of', { name: esc(gym.coach.name), badgeClub: esc(badgeClub), score: s.score[me], score2: s.score[R.opponent(me)], n })}</p>
        <div class="row" style="justify-content:center;gap:10px">${portraitSprite(gym.coach.portrait, 44, { hue })}<p class="talk-line" style="margin:0;max-width:26ch">“${esc(BADGE_LINES[n % BADGE_LINES.length])}”</p></div>
        ${sp ? `<p class="dim" style="margin-top:8px">${$t('match.their_legendary_can_now_be_tracked', { name: esc(sp.name) })}</p>` : ''}
        <button class="btn primary big block" data-action="badge-ok" style="margin-top:8px">${$t('match.continue_2')}</button></div>`, { title: $t('match.gym_cleared'), onClose: toHq });
      document.querySelector('.sheet [data-action="badge-ok"]')?.addEventListener('click', () => close());
    };
    // The final whistle (2026-10-22 presentation pass): a result hero weighted to the occasion, the box score, then what the
    // game did to the roster: XP for every starter, level-ups with the rating change, injuries.
    const hero = `<div class="final-hero ${won ? 'won' : 'lost'} ${champ ? 'champ' : playoff ? 'playoff' : ''}"><div class="final-feel">${feel}</div><div class="final-score"><span style="color:${teamInk(s[me].name, s[me].color)}">${esc(s[me].abbr)}</span> ${s.score[me]} <span class="dim">–</span> ${s.score[them]} <span style="color:${teamInk(s[them].name, s[them].color)}">${esc(s[them].abbr)}</span></div><div class="dim">${esc(tag || `${$t('match.week', { week: f.season.week })}`)}${otTag}${G.event === 'rival' ? $t('match.rivalry') : ''}</div></div>`;
    const xpRows = ev.filter((e) => e.kind === 'xp').sort((a, b) => b.amount - a.amount);
    const lvl = ev.filter((e) => e.kind === 'levelup' || e.kind === 'evolve'); const inj = ev.filter((e) => e.kind === 'injury');
    const after = `${lvl.length ? `<h3>${$t('match.level_ups')}</h3><div class="list">${lvl.map((e) => e.kind === 'evolve' ? `<div class="item static good"><div class="grow"><div class="name">${$t('match.evolution', { from: esc(e.from), to: esc(e.to) })}</div></div></div>` : `<div class="item static"><div class="grow"><div class="name">${$t('match.level', { name: esc(e.name), level: e.level })}</div><div class="sub">${e.from} → <b style="color:var(--good)">${$t('match.b_ovr', { to: e.to })}</div></div></div>`).join('')}</div>` : ''}
      ${inj.length ? `<h3>${$t('match.injuries')}</h3><div class="list">${inj.map((e) => `<div class="item static" style="border-color:var(--bad)"><div class="grow"><div class="name" style="color:var(--bad)">🩹 ${esc(e.name)}</div><div class="sub">${$t('match.out_weeks', { severity: esc(e.severity), weeks: e.weeks, n: e.weeks })}</div></div></div>`).join('')}</div>` : ''}
      ${xpRows.length ? `<h3>${$t('match.experience')}</h3><div class="xp-grid">${xpRows.map((x) => `<div class="xp-row"><span class="xp-name">${esc(x.name)} <span class="dim">${esc(x.position)}</span></span><span class="xp-amt">${x.max ? $t('match.max') : `+${Math.round(x.amount * 10) / 10}`}${x.training ? `<span class="dim" title="${$t('match.training_bar_progress_shared_by_football')}"> ${$t('match.training_2', { training: Math.round(x.training * 1000) / 10 })}</span>` : ''}${x.masteryCredits ? `<span class="dim" data-reward="mastery" title="${$t('match.football_ability_mastery_valid_uses_this')}"> ${$t('match.mastery', { masteryCredits: x.masteryCredits })}</span>` : ''}${x.gradeAdj ? `<span class="dim" data-reward="grade" title="${$t('match.performance_grade_the_adjustment_to_this')}"> ${$t('match.grade', { gradeAdj: x.gradeAdj > 0 ? '+' : '', n: Math.round(x.gradeAdj * 100) })}</span>` : ''}</span><div class="bar"><i style="width:${x.max ? 100 : Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div><span class="dim mono xp-lv">Lv ${x.level}</span></div>`).join('')}</div>` : ''}
      ${(() => { const pr = ev.filter((e) => e.kind === 'practice'); return pr.length ? `<h3>${$t('match.development_slots')}</h3><div class="xp-grid">${pr.map((x) => `<div class="xp-row"><span class="xp-name">${esc(x.name)} <span class="dim">${esc(x.position)}</span></span><span class="xp-amt">${x.max ? $t('match.max') : `+${Math.round(x.amount * 10) / 10}`}${x.training ? `<span class="dim" title="${$t('match.training_bar_progress_shared_by_football')}"> ${$t('match.training_2', { training: Math.round(x.training * 1000) / 10 })}</span>` : ''}${x.masteryCredits ? `<span class="dim" data-reward="mastery" title="${$t('match.football_ability_mastery_valid_uses_this')}"> ${$t('match.mastery', { masteryCredits: x.masteryCredits })}</span>` : ''}${x.gradeAdj ? `<span class="dim" data-reward="grade" title="${$t('match.performance_grade_the_adjustment_to_this')}"> ${$t('match.grade', { gradeAdj: x.gradeAdj > 0 ? '+' : '', n: Math.round(x.gradeAdj * 100) })}</span>` : ''}</span><div class="bar"><i style="width:${x.max ? 100 : Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div><span class="dim mono xp-lv">Lv ${x.level}</span></div>`).join('')}<p class="dim">${$t('match.practice_xp_for_reserves_in_development')}</p></div>` : ''; })()}
      ${!lvl.length && !inj.length ? `<p class="dim">${$t('match.no_injuries_fatigue_builds_with_every')}</p>` : ''}`;
    // A held badge lost back to its Gym Leader (reclaimable badges): said plainly on the result, not only in the news.
    const lostGym = r.lostBadge ? GYM_BY_CLUB[r.lostBadge] : null;
    const surrendered = lostGym ? `<div class="panel tight badge-lost" style="border-color:#8a3b3b;margin-bottom:var(--s3)"><b>${$t('match.badge_surrendered', { badge: esc(lostGym.badge) })}</b><div class="muted">${$t('match.badge_surrendered_text', { name: esc(lostGym.coach.name), club: esc(r.lostBadge), n: Object.keys(f.campaign.badges || {}).length, total: Object.keys(GYM_BY_CLUB).length })}</div></div>` : '';
    const fullTitle = gym ? $t('match.final_badge_game') : lostGym ? $t('match.final_badge_lost') : champ ? $t('match.beast_bowl') : playoff ? $t('match.final_playoffs') : $t('match.final_3');
    onSettledClose = handshake;
    if (closeWanted || !pending.el.isConnected) { handshake(); return; } // closed while the week was settling: carry the close out now
    const head = pending.el.querySelector('.sheet-head strong'); if (head) head.textContent = fullTitle;
    pending.el.setAttribute('aria-label', fullTitle);
    const body = pending.el.querySelector('.sheet-body'); if (body) body.innerHTML = `${hero}${surrendered}${box}${postGameHtml(f, r.partnerships, r.captainNote)}${after}`;
    };
  }

  function startPlayClock(f, root) {
    clearInterval(playClockTimer); playClockTimer = null;
    if (!f.settings.liveClock) return;
    let left = 40; let last = performance.now();
    playClockTimer = setInterval(() => {
      const G = f.game; if (activityPaused() || !G || G.state.finished || G.state.phase !== 'scrimmage' || anim || G.lastEvent?.needsContinue || document.querySelector('.sheet')) { last = performance.now(); return; }
      const now = performance.now(); left -= (now - last) / 1000; last = now;
      const pc = root.querySelector('#pc'), bar = root.querySelector('#pcbar');
      if (pc) pc.textContent = Math.max(0, Math.ceil(left)); if (bar) bar.style.width = `${Math.max(0, left / 40 * 100)}%`;
      // Advisory only: expiry resets the display and never changes yards, downs, clocks or possession.
      if (left <= 0) left = 40;
    }, 250);
  }
}

/** The other coach's words before the lineups (GDD §15.5): portrait, lines, and one reply the player may give. */
function talkHtml(f) {
  const t = F.pregameTalk(f); if (!t) return '';
  const hue = t.speaker.element ? (TYPES[t.speaker.element]?.hue ?? 120) : null;
  const chosen = t.replies.find((r) => r.id === t.reply);
  return `<div class="talk ${t.kind}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">${portraitSprite(t.speaker.portrait, 48, { hue })}<div class="grow" style="min-width:0"><div class="muted" style="font-size:11px;letter-spacing:.06em">${esc(t.speaker.name).toUpperCase()} · ${esc(t.title)}</div>${t.lines.map((l) => `<p class="talk-line">“${esc(l)}”</p>`).join('')}</div></div>
    ${t.replies && t.replies.length && t.kind !== 'ordinary' ? (chosen ? `<div class="talk-reply"><span class="dim">${$t('match.you')}</span> “${esc(chosen.label)}” <span class="dim">· ${esc(chosen.text)}</span></div>` : `<div class="talk-replies">${t.replies.map((r) => `<button class="btn small" data-action="reply" data-v="${r.id}" title="${esc(r.text)}">${esc(r.label)}</button>`).join('')}</div>`) : ''}</div>`;
}
