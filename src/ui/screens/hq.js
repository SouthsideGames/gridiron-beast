// Franchise Headquarters and the weekly action screens, plus playbook
// browsing and the league screens.

import { esc, delegate, toast, sheet, fmtMoney, confirmSheet } from '../dom.js';
import { ROUTE_LABELS } from '../../data/routes.js';
import { yearOf } from '../../data/calendar.js';

import * as F from '../../franchise/franchise.js';
import { REGIONS, TRAINING_FOCI, ROLE_LABEL, trainingBonus } from '../../data/staff.js';
import { PLAYS, LESSONS, counterPlays } from '../../data/playbook.js';
import { tierById, TEAM_META, DIVISIONS, conferenceFor, divisionOf } from '../../data/league.js';
import { salaryFor, monsterOverall, NATURES, TYPES, effectiveAttributes, HEADLINE, headlineAttributes, resolveSpecies, ABILITIES } from '../../data/monsters.js';
import { TRAITS } from '../../data/species.js';
import { headlineHtml } from './roster.js';
import { ATTRIBUTES, OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { GYMS, GYM_BY_CLUB } from '../../data/gyms.js';
import { addHofCard } from '../../franchise/hall-of-fame.js';
import { SPECIES_BY_ID } from '../../data/monsters.js';
import { sprite16 } from '../sprite16.js';
import { playCardSvg, legendHtml } from '../play-art.js';
import { teamOverall, buildDepthChart } from '../../franchise/roster.js';
import { AWARD_RULES } from '../../franchise/awards.js';
import { RIVAL_WEEKLY } from '../../data/dialogue.js';
import { LEADER_CATEGORIES, leaders, statLine, RECORD_CATEGORIES, TEAM_RECORDS, ensureRecords, careerLeaders } from '../../franchise/stats.js';
import { HELP_HTML as CLASH_HELP } from './clash-battle.js';
import { warningsHtml, noteHtml } from '../tutorial.js';
import { suggestProspect, suggestDraftPick, suggestContract, consequence } from '../../franchise/assist-advice.js';

const STARTERS_BY_POS = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 2, DL: 2, LB: 2, CB: 2, S: 1, K: 1 };

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };

export function weekStrip(f) {
  return `<div class="week" aria-label="Week ${f.season.week}">${F.DAYS.map((d, i) => `<div class="day ${i < f.season.day ? 'done' : i === f.season.day ? 'today' : ''}" title="${esc(F.DAY_ACTIONS[i])}">${d.slice(0, 3)}</div>`).join('')}</div>`;
}

/**
 * A club on the line (GDD §19.6, second pass): who, which player, for which picks, and the answer buttons.
 * Shown on HQ and the offseason screen while the offer stands.
 */
function callPanelHtml(f) {
  const c = F.tradeCall(f); if (!c) return '';
  const pk = c.give.map((p) => `${yearOf(p.year)} round ${p.round}${p.original !== f.club ? ` (from the ${esc(p.original)})` : ''}`).join(' + ');
  const mine = f.roster.filter((m) => m.position === c.player.position).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
  return `<div class="panel call-panel"><div class="row" style="gap:10px;align-items:flex-start">${monsterSprite({ species: c.player.species, name: c.player.name, id: c.playerId }, 44)}<div class="grow" style="min-width:0">
    <div class="muted" style="font-size:12px">📞 THE ${esc(c.team.toUpperCase())} ARE ON THE LINE</div>
    <div style="margin:2px 0"><b>${esc(c.player.name)}</b> · ${esc(c.player.position)} · ${c.player.ovr} OVR · age ${c.player.age}</div>
    <div class="muted" style="font-size:13px">“We hear you are thin at ${esc(c.player.position)}${mine ? ` (your best is ${esc(mine.name)}, ${monsterOverall(mine)})` : ''}. He is yours for your ${pk}.”</div>
    <div class="dim" style="font-size:11px;margin-top:2px">Good until ${f.offseason ? 'the new season' : 'the end of the week'} · he joins on a two-season deal at ${(c.player.salary || 0).toLocaleString('en-US')}/yr</div>
    <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn small primary" data-call="yes">Accept</button><button class="btn small" data-call="no">No thanks</button>${c.player.species ? `<button class="btn small see-it" data-see-it="${resolveSpecies({ species: c.player.species }).id}" ${resolveSpecies({ species: c.player.species }).ability ? '' : 'hidden'}>▶ His ability</button>` : ''}</div></div></div></div>`;
}
export function registerHqScreens(Router, app) {
  // Answering a call works wherever the panel shows.
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-call]'); if (!b || !app.f) return; e.preventDefault();
    const yes = b.dataset.call === 'yes'; const c = F.tradeCall(app.f); if (!c) return;
    if (yes && !(await confirmSheet(`Send your ${c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} to the ${c.team} for ${c.player.name}?`, { title: 'Accept the trade', okLabel: 'Trade' }))) return;
    const r = F.answerTradeCall(app.f, yes); if (!r.ok) { toast(r.reason, 'bad'); Router.render(); return; }
    app.save(); toast(yes ? `${c.player.name} is yours.` : 'Offer declined.', yes ? 'good' : 'info'); Router.render();
  });
  const need = () => app.f;

  Router.registerScreen('hq', {
    title: ({ f }) => f ? f.club : 'Headquarters', back: false,
    render({ f }) {
      if (!f) return '<p>No franchise.</p>';
      if (F.nextStaffRole(f) && !f.season.finished) return `<div class="panel"><p>Your front office is not complete.</p><button class="btn primary block" data-action="go" data-screen="hire">Hire staff</button></div>`;
      const s = F.summary(f); const cap = s.cap; const tier = tierById(f.tier);
      const fx = F.currentFixture(f); const po = F.playoffFixture(f);
      const opp = F.opponentName(f);
      const rival = f.rivals[f.tier];
      const day = f.season.day;
      const offPending = f.season.finished && (!F.offseasonReady(f) || !F.draftDone(f) || f.roster.length < F.ROSTER_MIN || F.nextStaffRole(f));
      const next = F.isFired(f) && f.season.finished ? { label: 'The board has let you go', action: 'fired', icon: '🚪' } : f.season.finished ? (F.postseasonEvent(f) ? { label: `Postseason · ${F.postseasonEvent(f).title}`, action: 'postseason', icon: '📞' } : f.legendPick && !f.legendPick.resolved ? { label: 'Choose your Legend Track', action: 'legend', icon: '🌟' } : { label: offPending ? `Offseason · ${F.offseasonPending(f).length ? F.offseasonPending(f).length + ' contract decision' + (F.offseasonPending(f).length === 1 ? '' : 's') : !F.draftDone(f) ? 'the draft' : f.roster.length < F.ROSTER_MIN ? 'sign to ' + F.ROSTER_MIN + ' monsters' : 'hire staff'}` : 'Continue to the offseason', action: 'offseason', icon: '📋' }) : nextAction(f);
      const race = f.season.week >= 5 && !f.season.finished && !F.inPlayoffs(f) ? `<div class="muted" style="margin-top:4px">Playoff race: <b>${esc(F.playoffPicture(f).text)}</b></div>` : '';
      const gameLine = f.season.finished ? `<b>${yearOf(f.season.year)} season complete.</b> ${f.season.champion === f.club ? '🏆 Beast Bowl champions!' : f.season.champion ? esc(f.season.champion) + ' won the Beast Bowl.' : ''} <button class="btn small" data-action="awards">How we finished</button>`
        : po ? `<b>${esc(po.tag)}</b> · ${po.home === f.club ? 'vs' : '@'} ${esc(opp)}`
        : fx?.bye ? '<b>Bye week</b>: rest and recover.' : fx ? `<b>Week ${fx.week}</b> · ${fx.home ? 'vs' : '@'} ${esc(opp)} · ${esc(fx.category)}${rival?.team === opp ? ' · ⚔️ RIVAL' : ''}` : '';
      const lb = f.campaign?.lastBadge; const lbGym = lb && lb.year === f.season.year && f.season.week - lb.week <= 1 ? GYM_BY_CLUB[lb.club] : null;
      const badgeBanner = lbGym ? `<div class="badge-banner" style="--hue:${TYPES[lbGym.element]?.hue ?? 120}"><span class="badge-banner-star">★</span><div><b>${esc(lbGym.badge)} earned</b> · badge ${lb.n} of 8<div class="dim">${esc(lbGym.coach.name)}'s ${esc(lb.club)} beaten in week ${lb.week}. ${lb.n === 8 ? 'All eight. The gyms are yours.' : `${8 - lb.n} to go.`}</div></div></div>` : '';
      return `${badgeBanner}${callPanelHtml(f)}
        <div class="panel tight"><div class="row between"><div><b>${yearOf(F.displayYear(f))}</b> · ${phaseLabel(f)}</div><div class="chip accent">Team OVR ${s.overall}</div></div>
          <div class="row between" style="margin-top:4px"><span>${f.season.playoffs ? playoffStatus(f) : `Record <b class="mono">${s.record}</b>${rival ? ` · <span class="dim">⚔️ rival ${esc(rival.team)}</span>` : ''}`}</span><span class="muted">Cap room <b style="color:${cap.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(cap.remaining)}</b></span></div>${race}</div>
        ${weekStrip(f)}
        <div class="panel"><div class="muted" style="font-size:12px">THIS WEEK</div><div style="margin:4px 0 8px">${gameLine}${(() => { const g = opp && GYM_BY_CLUB[opp]; if (!g || f.season.finished) return ''; const b = F.badgeOf(f, opp); return `<div class="muted" style="margin-top:4px">${b ? `🏅 You hold the ${esc(g.badge)} (${yearOf(b.year)})` : `<b>Badge game</b> · beat ${esc(g.coach.name)}'s ${esc(opp)} for the ${esc(g.badge)}`}</div>`; })()}</div>
          ${next ? `<button class="btn primary big block ${next.action === 'forfeit' ? 'danger' : ''}" data-action="${next.action}">${next.icon} ${esc(next.label)}</button>${next.note ? `<p class="dim" style="margin:4px 0 0;color:var(--bad)">${esc(next.note)}. Fix the depth chart or sign a monster; out-of-position bodies must match a primary or secondary position.</p>` : ''}${next.skip ? `<button class="btn block" data-action="skipplayoffs" style="margin-top:8px">⏩ Skip to the offseason</button>` : ''}` : ''}
          ${!f.season.finished && day < 6 && !f.week.commissioner && !(F.inPlayoffs(f) && !F.playoffFixture(f)) && !F.needsGoal(f) ? `<button class="btn block" data-action="autorun" style="margin-top:8px">⏩ Let the staff run the week → Sunday</button>` : ''}
          ${cap.over && !f.week.commissioner ? `<p class="muted" style="color:var(--warn);margin-top:8px">⚠️ Over the cap by ${fmtMoney(-cap.remaining)}. The commissioner reviews the books on Saturday: get under it by then or he picks who goes. <button class="btn small" data-action="releasemon">Release a monster</button></p>` : ''}
          ${f.week.commissioner ? `<p class="muted" style="color:var(--bad);margin-top:8px">🏛️ The commissioner is waiting. Over the cap by ${fmtMoney(f.week.commissioner.over)}.</p>` : ''}${warningsHtml(f, { max: 2, only: ['min', 'depth', 'hurt', 'tight', 'points'] })}</div>
        ${rivalCard(f)}
        ${boardPanel(f)}
        ${campaignPanel(f)}
        ${f.week.gameResult && !f.week.gameResult.bye && day === 0 ? '' : ''}
        <div class="grid2">
          <button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button>
          <button class="btn block" data-action="go" data-screen="staff">👥 Coaching staff</button><button class="btn block" data-action="go" data-screen="practice">🎯 Practice</button></div>
        <h3>News</h3><ul class="news" style="padding-left:18px;margin:0">${f.news.slice(0, 8).map((n) => `<li class="${esc(n.kind)}">${newsText(f, n.text)}</li>`).join('') || '<li class="dim">Nothing yet.</li>'}</ul>`;
    },
    mount(root) {
      if (app.f && !app.f.achievementsBackfilled && F.backfillAchievements(app.f).length) app.save();
      if (app.f && !app.f.game && F.nextScene(app.f)) { setTimeout(() => Router.go('scene', {}, { reset: true }), 0); return; } // an achievement cutscene plays before anything else (GDD §21)
      if (F.hallOfFameNotice(app.f)) { app.save(); sheet(`<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">LEAGUE COMMISSIONER</div>Eight badges. The titles. The wins. The awards. I've been doing this a long time and I don't say this often: you're eligible for the Hall of Fame. Retire whenever you like. Or keep going. The league isn't done with you either way.</div></div>`, { title: 'Hall of Fame' }); }
      const f0 = app.f;
      if (f0?.season.playoffs && !f0.season.recapShown && !f0.game) { f0.season.recapShown = true; app.save(); sheet(seasonRecapHtml(f0), { title: `${yearOf(f0.season.year)} · regular season over` }); }
      else if (f0?.season.finished && f0.season.awards && !f0.season.awardsShown) { f0.season.awardsShown = true; app.save(); sheet(seasonFinalHtml(f0), { title: `${yearOf(f0.season.year)} · how we finished` }); }
      delegate(root, {
        go: (el) => Router.go(el.dataset.screen),
        scout: () => Router.go('scout'), recruit: () => Router.go('recruit'), training: () => Router.go('training'), scoutopp: () => Router.go('scoutopp'), gameplan: () => Router.go('gameplan'), lineup: () => Router.go('lineup'),
        bye: () => { F.takeBye(app.f); app.save(); toast('Bye week taken. Fatigue recovered.'); Router.render(); },
        game: () => { if (!F.canPlayGames(app.f)) { Router.go('commissioner'); return; } Router.go('pregame'); },
        forfeit: async () => { const m = F.sundayMatchup(app.f); if (!(await confirmSheet(`${m?.forfeitReason || 'No legal lineup'}. Forfeit to ${m?.opponent}? It is recorded as a 0-21 loss with no stats. Sign or heal a monster first if you can.`, { title: 'Forfeit', okLabel: 'Forfeit', danger: true }))) return; F.forfeitSunday(app.f); app.save(); Router.go('hq', {}, { reset: true }); },
        commissioner: () => Router.go('commissioner'),
        restbye: () => { F.skipToByeIfIdle(app.f); app.save(); Router.render(); },
        postseason: () => Router.go('postseason'),
        legend: () => Router.go('legend'),
        retire: async () => {
          const r = F.retire(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; }
          if (!(await confirmSheet(`Retire ${r.card.owner}? Your career (${r.card.seasons} seasons, ${r.card.record.w}-${r.card.record.l}, ${r.card.titles} title${r.card.titles === 1 ? '' : 's'}) is written to the Hall of Fame, this franchise ends, and your Beast Dex carries on. Export the save first if you want to keep playing it elsewhere.`, { title: 'Hall of Fame', okLabel: 'Retire', danger: true }))) return;
          addHofCard(r.card); app.reset(); toast('Welcome to the Hall of Fame.', 'good', 4000); Router.go('hof', {}, { reset: true });
        },
        resume: () => Router.go('match'),
        goals: () => Router.go('goals'),
        offseason: () => Router.go('offseason'),
        scoutdraft: () => Router.go('draftclass'),
        recovery: () => { const r = F.recoveryDay(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(`<p>Everyone rests: fatigue −15%.${r.healed.length ? ` <b>${esc(r.healed.join(', '))}</b> cleared to play.` : ' Injured monsters are a week closer to returning.'}</p><p class="dim">The final week and the playoffs have no recruiting: Mondays go to the draft class, Tuesdays to recovery.</p>`, { title: 'Recovery day', onClose: () => Router.go('hq', {}, { reset: true }) }); },
        draft: () => Router.go('draft'), releasemon: () => Router.go('contracts'),
        recap: () => sheet(seasonRecapHtml(app.f), { title: `${yearOf(app.f.season.year)} · regular season` }),
        watchround: () => { const r = F.advancePlayoffs(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(roundResultsHtml(app.f, r), { title: F.ROUND_NAMES[r.round] || `Round ${r.round}`, onClose: () => Router.go('hq', {}, { reset: true }) }); },
        skipplayoffs: async () => { if (!(await confirmSheet('Simulate the rest of the playoffs and go to the offseason?', { title: 'Skip the playoffs', okLabel: 'Skip' }))) return; F.skipPlayoffs(app.f); app.save(); Router.go('hq', {}, { reset: true }); },
        fired: async () => {
          const r = F.retire(app.f);
          if (r.ok) { if (!(await confirmSheet(`The board has ended your time at ${app.f.club}. You qualified for the Hall of Fame before they did, so your career (${r.card.seasons} seasons, ${r.card.record.w}-${r.card.record.l}) is written there. Leave the club?`, { title: 'Let go', okLabel: 'Leave', danger: true }))) return; addHofCard(r.card); app.reset(); Router.go('hof', {}, { reset: true }); return; }
          if (!(await confirmSheet(`The board has ended your time at ${app.f.club}. You did not reach the Hall of Fame; this franchise ends and your Beast Dex carries on. Export the save first if you want to keep it.`, { title: 'Let go', okLabel: 'Leave the club', danger: true }))) return;
          app.reset(); toast('A new club will call.', 'info', 3000); Router.go('menu', {}, { reset: true });
        },
        autorun: async () => { if (!(await confirmSheet('Your staff will scout, recruit (only a clear upgrade), train, scout the opponent, keep the game plan and handle the press. You can still open the depth chart before kickoff.', { title: 'Run the week', okLabel: 'Run it' }))) return; const r = F.autoRunToSunday(app.f); app.save(); sheet(`<ul style="padding-left:18px">${r.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`, { title: 'Week handled', onClose: () => Router.go('hq', {}, { reset: true }) }); },
        awards: () => sheet(app.f.season.finished ? seasonFinalHtml(app.f) : seasonRecapHtml(app.f), { title: `${yearOf(app.f.season.year)} season` }),
        gym: (el) => { const g = GYM_BY_CLUB[el.dataset.club]; if (!g) return; const b = F.badgeOf(app.f, g.club); const sp = SPECIES_BY_ID[g.legendary]; sheet(`<div class="row">${portraitSprite(g.coach.portrait, 56, { hue: TYPES[g.element]?.hue })}<div><b>${esc(g.coach.name)}</b><div class="muted">Head coach, ${esc(g.club)} · ${esc(g.coach.style)}</div><div class="muted">${esc(g.element)} gym · ${g.tier} tier</div></div></div><p>${b ? `<b>${esc(g.badge)}</b> earned in ${yearOf(b.year)}, week ${b.week} (${esc(b.score)}).` : `Beat ${esc(g.club)} in any game that counts to earn the <b>${esc(g.badge)}</b>. No replays: if you lose, the next chance is their next game on your schedule.`}</p><h3>Signature monster</h3><div class="row">${sprite16(sp, 48)}<div><b>${esc(sp.name)}</b><div class="muted">${esc(sp.element)} legendary · ${sp.position}</div><div class="muted">${esc(sp.ability.name)}: ${esc(sp.ability.text)}</div></div></div><p class="dim">Gym clubs grow stronger every season, and study tape after you beat them.</p>`, { title: g.badge }); },
        nextseason: async () => { if (await confirmSheet(`Start the ${yearOf(app.f.season.year + 1)} season? Your roster ages one year and the record resets.`, { title: 'New season', okLabel: 'Start' })) { F.startNextSeason(app.f); app.save(); Router.render(); } },
      });
    },
  });
  function nextAction(f) {
    const d = f.season.day;
    if (f.game) return { label: f.game.state?.finished ? (f.game.state.needsTiebreak && !f.game.state.winner ? 'Overtime Beast Clash decides the game' : 'Finish the game') : 'Resume game', action: 'resume', icon: f.game.state?.finished && f.game.state.needsTiebreak && !f.game.state.winner ? '⚔️' : '▶' };
    if (F.creationDraftPending(f)) return { label: `Draft day · you hold the #${f.draft.lotterySlot} pick`, action: 'draft', icon: '🎓' };
    if (F.needsGoal(f)) return { label: "Meet the commissioner · this season's goal", action: 'goals', icon: '🎯' };
    if (F.draftWindow(f) && d === 0) return { label: `Monday · Scout the draft class`, action: 'scoutdraft', icon: '🎓' };
    if (F.draftWindow(f) && d === 1) return { label: 'Tuesday · Recovery day', action: 'recovery', icon: '🩹' };
    if (F.inPlayoffs(f) && !F.playoffFixture(f) && !f.season.finished) return { label: `Playoffs · play the ${F.ROUND_NAMES[f.season.playoffs?.round] || 'next round'}`, action: 'watchround', icon: '🏆', skip: true };
    if (f.week.commissioner) return { label: "The commissioner's office", action: 'commissioner', icon: '🏛️' };
    if (F.isBye(f) && d >= 3 && d < 6) return { label: 'Bye week · rest until Sunday', action: 'restbye', icon: '😴' };
    if (d === 6) { if (F.isBye(f)) return { label: 'Take the bye week', action: 'bye', icon: '😴' }; const m = F.sundayMatchup(f); if (m?.forfeit) return { label: 'Forfeit the game (no legal lineup)', action: 'forfeit', icon: '🏳️', note: m.forfeitReason }; return { label: 'Play Sunday game', action: 'game', icon: '🏈' }; }
    return [{ label: 'Monday · Scout a region', action: 'scout', icon: '🧭' }, { label: 'Tuesday · Monster encounter', action: 'recruit', icon: '⚔️' }, { label: 'Wednesday · Training focus', action: 'training', icon: '💪' }, { label: 'Thursday · Scout opponent', action: 'scoutopp', icon: '🔍' }, { label: 'Friday · Set game plan', action: 'gameplan', icon: '📋' }, { label: 'Saturday · Media day', action: 'lineup', icon: '🎤' }][d];
  }

  // ---------------------------------------------------------------- the commissioner's office (GDD §15.6)
  // ---------------------------------------------------------------- Offseason (GDD §18.1)
  const yrs = {}; // contract length chosen per row (1 or 2 seasons), default 2
  Router.registerScreen('offseason', {
    title: ({ f }) => `${yearOf(f ? F.displayYear(f) : 1)} · Offseason`,
    render({ f }) {
      const items = f.offseason?.items || []; const pending = F.offseasonPending(f);
      const cap = F.salarySummary(f); const usage = Math.min(100, Math.round(cap.total / cap.cap * 100));
      const fmt = (n) => n.toLocaleString('en-US');
      const monsters = items.filter((i) => i.kind === 'monster'), staff = items.filter((i) => i.kind === 'staff');
      const row = (i) => { const m = f.roster.find((x) => x.id === i.id); return `<div class="item static ${i.status ? 'done' : ''}" style="align-items:flex-start">${m ? monsterSprite(m, 36) : ''}<div class="grow"><div class="name">${esc(i.name)} <span class="dim">${esc(i.position)} · ${i.ovr} OVR</span></div><div class="sub">${fmt(i.current)} → asks <b>${fmt(i.ask)}</b>/yr for 2 seasons${i.big ? ' · big season +10%' : ''}${i.award ? ' · league award +15%' : ''}</div>${i.status ? '' : noteHtml(suggestContract(f, i)?.text, 'suggest')}
        ${i.status ? `<div class="sub">${i.status === 'signed' ? `✅ re-signed at ${fmt(i.final)} for ${i.years === 1 ? '1 season' : '2 seasons'}${i.countered === 'accepted' ? ' (took the counter)' : ''}` : i.status === 'walked' ? `🚪 walked${i.countered === 'refused' ? ', refused the counter' : ''}` : esc(i.status)}</div>` : `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="seg"><button class="btn small ${(yrs[i.id] || 2) === 1 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="1">1 yr</button><button class="btn small ${(yrs[i.id] || 2) === 2 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="2">2 yr</button></span><button class="btn small primary" data-action="c" data-id="${i.id}" data-v="sign">Sign ${fmt(i.ask)}</button><button class="btn small" data-action="c" data-id="${i.id}" data-v="counter">Counter ${fmt(Math.round(i.ask * 0.85 / 100) * 100)}</button><button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">Let walk</button></div>${m && m.age >= 29 ? `<div class="dim">Age ${m.age}: a one-year deal keeps the exit open.</div>` : ''}`}</div></div>`; };
      const srow = (i) => `<div class="item static ${i.status ? 'done' : ''}"><div class="grow"><div class="name">${esc(i.name)} <span class="dim">${esc(i.role.replace(/_/g, ' '))}</span></div><div class="sub">${fmt(i.current)} → asks <b>${fmt(i.ask)}</b>/yr (+10%)</div>${i.status ? `<div class="sub">${i.status === 'signed' ? `✅ re-signed for ${i.years === 1 ? '1 season' : '2 seasons'}` : '🚪 left'}</div>` : `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="seg"><button class="btn small ${(yrs[i.id] || 2) === 1 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="1">1 yr</button><button class="btn small ${(yrs[i.id] || 2) === 2 ? 'primary' : ''}" data-action="yrs" data-id="${i.id}" data-v="2">2 yr</button></span><button class="btn small primary" data-action="c" data-id="${i.id}" data-v="sign">Re-sign</button><button class="btn small danger" data-action="c" data-id="${i.id}" data-v="walk">Let walk</button></div>`}</div></div>`;
      const market = F.offseasonMarket(f);
      const canStart = F.offseasonReady(f) && F.draftDone(f) && f.roster.length >= F.ROSTER_MIN && !F.nextStaffRole(f);
      return `${callPanelHtml(f)}${warningsHtml(f, { max: 2, only: ['min', 'expiring'] })}<div class="panel"><div class="row between"><b>Roster ${f.roster.length} / ${F.ROSTER_MAX}</b><span class="chip ${f.roster.length < F.ROSTER_MIN ? 'bad' : ''}">minimum ${F.ROSTER_MIN}</span></div>
        <div class="bar ${cap.over ? 'bad' : usage > 90 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${usage}%"></i></div><div class="row between muted"><span>Cap ${fmt(cap.cap)}</span><span style="color:${cap.over ? 'var(--bad)' : 'var(--good)'}">${cap.over ? 'Over by ' + fmt(-cap.remaining) : 'Room ' + fmt(cap.remaining)}</span></div>
        ${cap.over ? `<div class="panel tight hotseat" style="margin:6px 0"><b>⚠️ Over the cap by ${fmt(-cap.remaining)}.</b><div class="dim">You can start the season over the cap, but the commissioner reviews the books in week 1 and picks who goes. Better to choose yourself: release a monster (they return to the free-agent pool), let a contract walk, or replace a coach.</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn small primary" data-action="releasemon">Release a monster</button><button class="btn small" data-action="staffroom">Staff</button></div></div>` : ''}
        <p class="dim">New signings are two seasons; at renewal you choose one season or two (two is the maximum). Salary is fixed for the deal. Asks follow a monster's ratings today, the ones you built up cost more. Counter at 85%: calm natures and a winning season say yes more often; a refusal means they walk to the free-agent pool, where any club can sign them.</p></div>
        ${monsters.length ? `<h3>Contracts up · monsters (${monsters.filter((i) => !i.status).length} to decide)</h3>${monsters.some((i) => !i.status) ? `<div class="row" style="gap:6px;margin-bottom:6px"><button class="btn small" data-action="signall">Sign everyone left at their ask</button><span class="dim">total ${fmt(monsters.filter((i) => !i.status).reduce((a, i) => a + i.ask, 0))}/yr</span></div>` : ''}<div class="list">${monsters.map(row).join('')}</div>` : '<h3>Contracts</h3><p class="dim">No monster deals expire this offseason.</p>'}
        ${staff.length ? `<h3>Contracts up · staff</h3><div class="list">${staff.map(srow).join('')}</div>` : ''}
        ${F.nextStaffRole(f) ? `<div class="panel tight" style="border-color:var(--bad)"><b>Front office incomplete</b> · <button class="btn small" data-action="hire">Hire staff</button></div>` : ''}
        <h3>The draft</h3><div class="panel tight">${F.draftDone(f) ? `<b>✅ Draft held.</b> ${f.draft ? `${f.draft.picks.filter((p) => p.mine && !p.passed).length} rookies drafted.` : ''}` : `<b>${f.draft?.started ? 'Draft in progress' : 'Three rounds, worst record first.'}</b> <div class="dim">Rookies sign two seasons at ${Math.round(F.ROOKIE_SCALE * 100)}% of market. ${pending.length ? 'Settle the contracts to open it.' : ''}</div><button class="btn primary block" data-action="draft" ${pending.length ? 'disabled' : ''} style="margin-top:6px">${f.draft?.started ? 'Back to the draft room' : '🎓 Open the draft'}</button>${f.draft?.started ? '' : `<button class="btn block" data-action="shop" style="margin-top:6px">☎️ Shop your picks before the draft</button>`}<div class="dim" style="margin-top:6px">${picksLine(f)}</div>`}</div>
        <h3>Free-agent market (${market.length})</h3><p class="dim">Pool monsters keep their stats and history. Signing over the cap is allowed; the commissioner reviews the books in week 1.</p>
        <div class="list">${market.map((e) => { const m = e.monster; const v = F.freeAgentView(f, m); return `<div class="item tappable" data-action="fa" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)} <span class="dim">${esc(m.position)} · ${v.ovr != null ? `${v.ovr} OVR` : '?? OVR'} · age ${m.age}</span>${e.fromPool ? ' <span class="chip warn">free agent</span>' : ''}${v.formerOwn ? ' <span class="chip accent">played for you</span>' : ''}</div><div class="sub">${esc(m.origin || '')} · ${(() => { const a = F.freeAgentAsk(f, m); return a.estimate ? `asks about ${fmt(a.shown)}/yr` : `asks ${fmt(a.shown)}/yr`; })()}${(m.history || []).length ? ' · ' + esc(m.history.map((h) => h.club).join(', ')) : ''}</div><div class="dim" style="font-size:11px">${v.full ? 'Full report · tap for details' : `Scout report ${v.level}/6 · tap for details`}</div></div><button class="btn small" data-action="sign" data-id="${m.id}" ${f.roster.length >= F.ROSTER_MAX ? 'disabled' : ''}>Sign</button></div>`; }).join('') || '<p class="dim">Nobody on the market.</p>'}</div>
        <button class="btn primary big block ${canStart ? '' : 'disabled'}" data-action="start" ${canStart ? '' : 'disabled'} style="margin-top:12px">🔁 Start the ${yearOf(f.season.year + 1)} season</button>${canStart ? '' : `<p class="dim center">${pending.length ? `${pending.length} contract decision${pending.length === 1 ? '' : 's'} first.` : !F.draftDone(f) ? 'Hold the draft first.' : f.roster.length < F.ROSTER_MIN ? `Sign ${F.ROSTER_MIN - f.roster.length} more to reach the minimum.` : 'Hire a full staff first.'}</p>`}`;
    },
    mount(root) {
      delegate(root, {
        yrs: (el) => { yrs[el.dataset.id] = Number(el.dataset.v); Router.render(); },
        c: async (el) => { const v = el.dataset.v; const item = (app.f.offseason?.items || []).find((i) => i.id === el.dataset.id); if (v === 'walk' && !(await confirmSheet(`Let ${item?.name} walk? ${item?.kind === 'staff' ? 'You will need to hire a replacement.' : 'They go to the free-agent pool; any club can sign them.'}`, { title: 'Let walk', okLabel: 'Let walk', danger: true }))) return; const r = F.resolveContract(app.f, el.dataset.id, v, { years: yrs[el.dataset.id] || 2 }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (v === 'counter') toast(r.countered === 'accepted' ? 'They took the counter.' : 'They refused and walked.', r.countered === 'accepted' ? 'good' : 'bad'); Router.render(); },
        sign: (el, ev) => { ev?.stopPropagation?.(); const r = F.signFreeAgent(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? 'Signed, over the cap.' : 'Signed.', r.overCap ? 'bad' : 'good'); Router.render(); },
        fa: (el) => freeAgentSheet(app.f, el.dataset.id, () => Router.render()),
        hire: () => Router.go('hire'),
        draft: () => Router.go('draft'),
        shop: () => tradeSheet(app.f, { onDone: () => Router.render() }),
        releasemon: () => Router.go('contracts'), staffroom: () => Router.go('staff'),
        signall: async () => { const left = (app.f.offseason?.items || []).filter((i) => i.kind === 'monster' && !i.status); if (!(await confirmSheet(`Re-sign all ${left.length} remaining monsters at their asks?`, { title: 'Sign everyone', okLabel: 'Sign all' }))) return; for (const i of left) F.resolveContract(app.f, i.id, 'sign'); app.save(); Router.render(); },
        start: async () => { if (!(await confirmSheet(`Start the ${yearOf(app.f.season.year + 1)} season? Your roster ages one year and the record resets.`, { title: 'New season', okLabel: 'Start' }))) return; const r = F.startNextSeason(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.go('hq', {}, { reset: true }); },
      });
    },
  });
  // ---------------------------------------------------------------- Draft class (GDD §19)
  let draftFocus = '', draftSort = 'board';
  function prospectRow(f, m, { pickable = false, taken = false } = {}) {
    const v = F.prospectView(f, m); const h = headlineAttributes(m);
    const bars = v.headline ? HEADLINE.slice(0, 4).map((x, i) => `<span class="dim" style="font-size:11px">${i < v.headline ? `${x.label.slice(0, 3)} ${h[x.key]}` : `${x.label.slice(0, 3)} ??`}</span>`).join(' · ') : '<span class="dim" style="font-size:11px">unscouted</span>';
    const scouted = v.level >= 6; const fit = scouted ? F.fitFor(f, m) : null; // scheme fit shows only once the scout has the full picture (GDD §19.4)
    return `<div class="item ${scouted ? 'tappable' : 'static'} ${taken ? 'done' : ''} ${fit?.fits ? 'fit' : ''}" style="align-items:flex-start" ${scouted ? `data-action="prospect" data-id="${m.id}" role="button" tabindex="0"` : ''}>${monsterSprite(m, 36)}<div class="grow"><div class="name">#${m.boardRank} ${esc(m.name)}${fit?.fits ? ' <span class="fit-star" title="Fits your scheme">✦</span>' : ''} <span class="dim">${esc(m.position)} · age ${m.age} · ${esc(m.origin || '')}</span>${scouted ? ' <span class="chip good">scouted · tap for the report</span>' : v.level > 0 ? ' <span class="chip">glanced</span>' : ''}</div>
      <div class="sub">${v.ovr != null ? `<b>${v.ovr} OVR</b>` : '<b>?? OVR</b>'}${v.potential != null ? ` · potential ${v.potential}` : ''}${v.natureKnown ? ` · ${esc(NATURES[m.nature]?.name || m.nature)}` : ''} · rookie deal ≈ ${(Math.round((18000 + 280 * (v.ovr ?? 52)) * F.ROOKIE_SCALE / 100) * 100).toLocaleString('en-US')}/yr</div><div>${bars}</div></div>${pickable ? `<button class="btn small primary" data-action="pick" data-id="${m.id}">Pick</button>` : ''}</div>`;
  }
  /** The scout's full report on a fully scouted prospect (GDD §19.4): bio, nature, ability, all twelve attributes, and how they compare with the owner's best at the position. */
  function prospectSheet(f, m) {
    const v = F.prospectView(f, m); if (v.level < 6) return;
    const sp = resolveSpecies(m); const nature = NATURES[m.nature]; const attrs = m.attributes;
    const ab = m.ability ? ABILITIES[m.ability] : sp.ability || null; const trait = !ab && sp.trait ? TRAITS[sp.trait] : null;
    const mine = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const best = mine[0]; const depth = F.depthNeeds(f).find((n) => n.position === m.position);
    const pk = f.draft?.picks?.find((p) => p.id === m.id);
    const salary = Math.round((18000 + 280 * monsterOverall(m)) * F.ROOKIE_SCALE / 100) * 100;
    sheet(`<div class="row" style="gap:12px">${monsterSprite(m, 64)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}</div><div class="muted">${esc(m.position)}${sp.secondary && sp.secondary !== m.position ? ` / ${esc(sp.secondary)}` : sp.position !== m.position ? ` / ${esc(sp.position)}` : ''} · ${esc(m.type)} type · age ${m.age} · board #${m.boardRank}</div><div class="muted">Born in ${esc(m.origin || '·')} · ${esc(sp.name)}${sp.rarity ? ` (${esc(sp.rarity)})` : ''}</div></div></div>
      ${pk ? `<p class="chip ${pk.team === f.club ? 'accent' : ''}">Drafted R${pk.round} #${pk.overall} by ${esc(pk.team)}</p>` : ''}
      <div class="panel tight"><div class="row between"><b>${monsterOverall(m)} OVR</b><span>potential <b>${m.potential}</b></span><span class="dim">rookie deal ≈ ${salary.toLocaleString('en-US')}/yr · 2 seasons</span></div></div>
      <div class="panel tight"><b>Nature: ${esc(nature?.name || m.nature)}</b><div class="muted">${esc(nature?.behavior || '')}${nature?.up ? ` <span class="chip good">+10% ${ATTR_LABEL[nature.up]}</span> <span class="chip bad">−10% ${ATTR_LABEL[nature.down]}</span>` : ''}</div>
        ${ab ? `<b>Signature ability: ${esc(ab.name)}</b><div class="muted">${esc(ab.text)}</div><button class="btn small see-it" data-see-it="${sp.id}">▶ See it</button>` : trait ? `<b>Species trait: ${esc(trait.name)}</b><div class="muted">${esc(trait.text)}</div>` : ''}
        ${sp.evolution?.length ? `<div class="dim">Evolves at level ${sp.evolution[0].level}.</div>` : ''}</div>
      ${headlineHtml(m)}${(() => { const fit = F.fitFor(f, m); return fit ? `<p class="${fit.fits ? 'fit-key' : 'dim'}" style="margin:6px 0 0">${fit.fits ? '✦ Fits your scheme' : 'Not a scheme fit'} · ${esc(fit.why)}</p>` : ''; })()}
      <div class="attr-grid" style="margin-top:8px">${ATTRIBUTES.map((k) => `<div class="attr"><span>${ATTR_LABEL[k]}</span><div class="bar ${attrs[k] < 45 ? 'bad' : attrs[k] < 60 ? 'warn' : ''}"><i style="width:${attrs[k]}%"></i></div><b>${attrs[k]}</b></div>`).join('')}</div>
      <div class="panel tight" style="margin-top:8px"><b>On your roster</b><div class="muted">${best ? `Your best ${esc(m.position)} is ${esc(best.name)} at ${monsterOverall(best)} OVR (${mine.length} at the position${depth && depth.status !== 'ok' ? `, ${esc(depth.status)}` : ''}). ${monsterOverall(m) >= monsterOverall(best) ? 'This prospect would start on day one.' : monsterOverall(m) >= monsterOverall(best) - 6 ? 'A real backup with room to pass the starter.' : 'A development pick behind the starter.'}` : `You have nobody at ${esc(m.position)}: this prospect would start.`}</div></div>`, { title: 'Scouting report' });
  }
  /**
   * A free agent's card (polish 2.0). What is public: bio, clubs, ability, the ask. What the scout has
   * to find: ratings (some or all), overall, potential, nature. Same rules as a recruit's report.
   */
  function freeAgentSheet(f, id, onSigned) {
    const entry = F.offseasonMarket(f).find((e) => e.monster.id === id); if (!entry) return; const fmt = (n) => n.toLocaleString('en-US');
    const m = entry.monster; const v = F.freeAgentView(f, m); const sp = resolveSpecies(m); const nature = NATURES[m.nature];
    const ab = m.ability ? ABILITIES[m.ability] : sp.ability || null; const trait = !ab && sp.trait ? TRAITS[sp.trait] : null;
    const bio = F.monsterBio({ ...f, club: '__nobody__' }, m); const clubs = (m.history || []).map((h) => `${esc(h.club)}${h.from ? ` (${yearOf(h.from)}${h.to && h.to !== h.from ? `-${yearOf(h.to)}` : ''})` : ''}`).join(', ');
    const askV = F.freeAgentAsk(f, m); const ask = askV.exact; const askText = askV.estimate ? `asks about ${fmt(askV.shown)}/yr (an estimate until scouted)` : `asks ${fmt(ask)}/yr`; const h = headlineAttributes(m);
    const mine = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a)); const best = mine[0];
    const verdict = v.ovr == null ? `Overall is hidden: your scout${v.scoutName ? `, ${esc(v.scoutName)},` : ''} has only a partial read on ${esc(v.region)}.` : !best ? `You have nobody at ${esc(m.position)}: he would start.` : v.ovr >= monsterOverall(best) ? `<b>Would start</b> over ${esc(best.name)} (${monsterOverall(best)} OVR).` : v.ovr >= monsterOverall(best) - 6 ? `A real backup behind ${esc(best.name)} (${monsterOverall(best)} OVR).` : `Depth behind ${esc(best.name)} (${monsterOverall(best)} OVR).`;
    const { close } = sheet(`<div class="row" style="gap:12px">${monsterSprite(m, 64)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}</div><div class="muted">${esc(m.position)}${sp.secondary && sp.secondary !== m.position ? ` / ${esc(sp.secondary)}` : ''} · ${esc(m.type)} type · age ${m.age} · ${bio.yearsPro ? `${bio.yearsPro} season${bio.yearsPro === 1 ? '' : 's'} pro` : 'no pro seasons'}</div><div class="muted">From ${esc(v.region)} · ${esc(sp.name)}${sp.rarity ? ` (${esc(sp.rarity)})` : ''}</div></div></div>
      ${v.formerOwn ? '<p class="chip accent">Played for you: you know everything about him</p>' : `<p class="dim" style="margin:6px 0">Scout report ${v.level}/6 · ${v.full ? 'complete' : 'a better scout in this region reveals more'}</p>`}
      <div class="panel tight"><div class="row between"><b>${v.ovr != null ? `${v.ovr} OVR` : '?? OVR'}</b><span>potential <b>${v.potential ?? '??'}</b></span><span class="dim">${askText} · 2 seasons</span></div></div>
      <div class="panel tight"><b>Nature: ${v.natureKnown ? esc(nature?.name || m.nature) : '??'}</b>${v.natureKnown ? `<div class="muted">${esc(nature?.behavior || '')}</div>` : '<div class="dim">Not scouted yet.</div>'}
        ${ab ? `<b>Signature ability: ${esc(ab.name)}</b><div class="muted">${esc(ab.text)}</div><button class="btn small see-it" data-see-it="${sp.id}">▶ See it</button>` : trait ? `<b>Species trait: ${esc(trait.name)}</b><div class="muted">${esc(trait.text)}</div>` : ''}</div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < v.headlineKnown ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < v.headlineKnown ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>
      ${v.full ? `<div class="attr-grid">${ATTRIBUTES.map((k) => `<div class="attr"><span>${ATTR_LABEL[k]}</span><div class="bar ${m.attributes[k] < 45 ? 'bad' : m.attributes[k] < 60 ? 'warn' : ''}"><i style="width:${m.attributes[k]}%"></i></div><b>${m.attributes[k]}</b></div>`).join('')}</div>` : `<p class="dim">${4 - v.headlineKnown ? `${4 - v.headlineKnown} headline rating${4 - v.headlineKnown === 1 ? '' : 's'} and the` : 'The'} full attribute sheet need a complete scout report.</p>`}
      <div class="panel tight" style="margin-top:8px"><b>Career</b><div class="muted">${clubs ? `Clubs: ${clubs}` : 'No pro club yet: a regional-league monster.'}</div></div>
      <div class="panel tight"><b>On your roster</b><div class="muted">${verdict}</div></div>
      <button class="btn primary block" data-action="fasign" ${f.roster.length >= F.ROSTER_MAX ? 'disabled' : ''} style="margin-top:8px">${askV.estimate ? `Sign (about ${fmt(askV.shown)}/yr)` : `Sign for ${fmt(ask)}/yr`}</button>`, { title: 'Free agent' });
    document.querySelector('.sheet [data-action="fasign"]')?.addEventListener('click', () => { const r = F.signFreeAgent(app.f, id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); close(); toast(r.overCap ? 'Signed, over the cap.' : 'Signed.', r.overCap ? 'bad' : 'good'); onSigned?.(); });
  }
  Router.registerScreen('draftclass', {
    title: 'Draft class',
    render({ f }) {
      const d = F.ensureDraftClass(f); if (!d) return '<p class="dim">The draft class arrives in the final week of the regular season.</p>';
      const monday = f.season.day === 0 && F.draftWindow(f) && !f.season.finished;
      const scout = F.staffMember(f, 'head_scout');
      let list = d.class.filter((m) => !draftFocus || m.position === draftFocus);
      if (draftSort === 'known') list = list.slice().sort((a, b) => (F.prospectView(f, b).level - F.prospectView(f, a).level) || (a.boardRank - b.boardRank));
      const last = f.week.draftScouted;
      return `<p class="muted">${d.class.length} first-year monsters, ${Object.values(d.revealed).filter((l) => l >= 6).length} fully scouted. Board rank is the public consensus; your scout's reads are what you draft on. ${esc(scout?.name || 'Your scout')} studies ${scout?.overall >= 80 ? 3 : scout?.overall >= 45 ? 2 : 1} prospects a Monday and glances at three more.</p>
        ${monday ? `<div class="panel tight"><label class="field">Focus position <select class="input" id="draft-focus">${[['', 'Best available'], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><button class="btn primary block" data-action="study">🎓 Send the scout (Monday)</button></div>` : last ? `<div class="panel tight"><b>This week</b>: studied ${last.studied.map((id) => esc(d.class.find((m) => m.id === id)?.name || '')).join(', ') || 'nobody'}; glanced at ${last.glanced.length}.</div>` : ''}
        <div class="row between" style="margin:8px 0"><div class="seg"><button class="btn small ${draftSort === 'board' ? 'primary' : ''}" data-action="sort" data-v="board">Board</button><button class="btn small ${draftSort === 'known' ? 'primary' : ''}" data-action="sort" data-v="known">Scouted first</button></div><select class="input" id="draft-filter" style="width:auto">${[['', 'All positions'], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <div class="list">${list.map((m) => prospectRow(f, m)).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        study: () => { const focus = root.querySelector('#draft-focus')?.value || null; const r = F.scoutDraft(app.f, { focus }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(`<p><b>${esc(r.scout)}</b> studied <b>${r.studied.map((m) => esc(m.name) + ' (' + m.position + ')').join(', ') || 'nobody new'}</b> and glanced at ${r.glanced.length} more.</p>`, { title: 'Draft scouting', onClose: () => Router.go('hq', {}, { reset: true }) }); },
        sort: (el) => { draftSort = el.dataset.v; Router.render(); },
        prospect: (el) => { const m = app.f.draft?.class.find((x) => x.id === el.dataset.id); if (m) prospectSheet(app.f, m); },
      });
      root.querySelector('#draft-filter')?.addEventListener('change', (e) => { draftFocus = e.target.value; Router.render(); });
      root.querySelector('#draft-focus')?.addEventListener('change', (e) => { draftFocus = e.target.value; });
    },
  });
  // ---------------------------------------------------------------- Trading picks (GDD §19.6)
  const pickLabel = (p, f) => `${yearOf(p.year)} R${p.round}${p.overall ? ` (#${p.overall})` : ''}${p.original && p.original !== f.club ? ` via ${esc(p.original.split(' ').pop())}` : ''}`;
  function picksLine(f) {
    const mine = F.myTradablePicks(f); const led = F.pickLedger(f);
    const byYear = {}; for (const p of mine) (byYear[p.year] ||= []).push(p);
    return `${Object.entries(byYear).map(([y, ps]) => `<b>${yearOf(y)}</b> ${ps.map((p) => `R${p.round}${p.overall ? `#${p.overall}` : ''}${p.original !== f.club ? '*' : ''}`).join(' ')}`).join(' · ')}${led.gone.length ? ` · <span class="dim">sent away: ${led.gone.map((p) => `${yearOf(p.year)} R${p.round} → ${esc(p.owner.split(' ').pop())}`).join(', ')}</span>` : ''}${led.acquired.length ? ' <span class="dim">(* acquired)</span>' : ''}`;
  }
  /** The phone: choose what to give, ask for a player or for picks, see up to three offers. */
  function tradeSheet(f, { lead = null, onDone = null } = {}) {
    const state = { give: lead ? [lead] : [], tab: 'player', position: F.depthNeeds(f).find((n) => n.status !== 'ok')?.position || 'S', year: F.tradableYears(f)[1] || F.tradableYears(f)[0], round: 2, count: 1, result: null, busy: false };
    const { el, close } = sheet('', { title: '☎️ Shop a pick', onClose: () => onDone?.() });
    const body = el.querySelector('.sheet-body');
    const render = () => {
      const mine = F.myTradablePicks(f); const years = F.tradableYears(f);
      const leadPick = state.give[0]; const asksLeft = leadPick ? mine.find((p) => F.pickKey(p) === F.pickKey(leadPick))?.asksLeft ?? 0 : null;
      const byYear = {}; for (const p of mine) (byYear[p.year] ||= []).push(p);
      const giveHtml = `<div class="panel tight"><div class="row between"><b>You give</b><span class="dim" style="font-size:12px">tap picks to add them · each pick takes ${F.ASKS_PER_PICK} calls</span></div>
        ${Object.entries(byYear).map(([y, ps]) => `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center"><span class="dim" style="width:40px">${yearOf(y)}</span>${ps.map((p) => { const on = state.give.some((g) => F.pickKey(g) === F.pickKey(p)); const dead = p.asksLeft <= 0 && !on; return `<button class="btn small ${on ? 'primary' : ''}" data-give="${F.pickKey(p)}" ${dead ? 'disabled' : ''} title="${p.asksLeft} asks left">R${p.round}${p.overall ? ` #${p.overall}` : ''}${p.original !== f.club ? '*' : ''}${p.onClock ? ' ⏱' : ''}${dead ? ' ✕' : ''}</button>`; }).join('')}</div>`).join('') || '<p class="dim">You hold no tradable picks.</p>'}
        ${leadPick ? `<div class="dim" style="margin-top:6px">Offering <b>${state.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}</b> · lead pick has ${asksLeft} call${asksLeft === 1 ? '' : 's'} left${mine.some((p) => p.original !== f.club) ? ' · * acquired' : ''}</div>` : '<div class="dim" style="margin-top:6px">Choose at least one pick.</div>'}</div>`;
      const positions = Object.keys(F.GROUP_SLOTS);
      const askHtml = `<div class="seg" style="margin:8px 0"><button class="btn small ${state.tab === 'player' ? 'primary' : ''}" data-tab="player">For a player</button><button class="btn small ${state.tab === 'picks' ? 'primary' : ''}" data-tab="picks">For future picks</button></div>
        ${state.tab === 'player' ? `<div class="panel tight"><label class="field">A veteran at <select class="input" data-field="position">${positions.map((g) => `<option value="${g}" ${state.position === g ? 'selected' : ''}>${g}${(() => { const n = F.depthNeeds(f).find((x) => x.position === g); return n && n.status !== 'ok' ? ` (${n.status})` : ''; })()}</option>`).join('')}</select></label><div class="dim">Clubs answer from their own depth: a first-round pick can pry a starter loose if a replacement is ready; a third buys a backup. Legendaries, rival signatures, cornerstones and just-drafted rookies are never for sale.${F.canTakePlayer(f) ? '' : ` <b>Your roster is full (${F.ROSTER_MAX}).</b>`}</div></div>`
        : `<div class="panel tight"><div class="row" style="gap:8px;flex-wrap:wrap"><label class="field">Class <select class="input" data-field="year">${years.map((y) => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${yearOf(y)}</option>`).join('')}</select></label><label class="field">Round <select class="input" data-field="round">${[1, 2, 3].map((r) => `<option value="${r}" ${state.round === r ? 'selected' : ''}>R${r}</option>`).join('')}</select></label><label class="field">How many <select class="input" data-field="count">${[1, 2].map((n) => `<option value="${n}" ${state.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><div class="dim">A pick this year is worth about a round better next year. A club that will not meet the ask counters with the nearest package it would take.</div></div>`}`;
      const canCall = state.give.length && asksLeft > 0 && (state.tab === 'picks' || F.canTakePlayer(f));
      const callHtml = `${noteHtml(consequence(f, 'trade'))}<button class="btn primary big block" data-call="1" ${canCall ? '' : 'disabled'} style="margin-top:8px">📞 Make the call${leadPick ? ` (${asksLeft} left on ${yearOf(leadPick.year)} R${leadPick.round})` : ''}</button>`;
      let resultHtml = '';
      if (state.result) {
        const r = state.result;
        if (!r.ok) resultHtml = `<p class="bad">${esc(r.reason)}</p>`;
        else if (!r.offers.length) resultHtml = `<div class="panel tight"><b>No takers.</b><div class="dim">Nobody in the league wants that deal this week. ${r.asksLeft > 0 ? 'Change the ask or add a pick and call again.' : 'That pick has been shopped out.'}</div></div>`;
        else resultHtml = `<h3>${r.offers.length} offer${r.offers.length === 1 ? '' : 's'}</h3><div class="list">${r.offers.map((o, i) => o.get.player ? `<div class="item static" style="align-items:flex-start">${monsterSprite(o.get.player, 40)}<div class="grow"><div class="name">${esc(o.get.player.name)} <span class="dim">${esc(o.get.player.position)} · ${monsterOverall(o.get.player)} OVR · age ${o.get.player.age}</span>${o.starter ? ' <span class="chip">their starter</span>' : ''}</div><div class="sub">from ${esc(o.team)} · ${fmtMoney(o.get.player.salary)}/yr, two seasons · for ${o.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}</div></div><button class="btn small primary" data-accept="${i}">Accept</button></div>`
          : `<div class="item static"><div class="grow"><div class="name">${o.get.picks.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} <span class="chip ${o.exact ? 'good' : ''}">${o.exact ? 'yes' : 'counter'}</span></div><div class="sub">from ${esc(o.team)} · for ${o.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}</div></div><button class="btn small primary" data-accept="${i}">Accept</button></div>`).join('')}</div>`;
      }
      body.innerHTML = `${giveHtml}${askHtml}${callHtml}${resultHtml}`;
    };
    body.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.field) { const v = t.value; state[t.dataset.field] = t.dataset.field === 'position' ? v : Number(v); state.result = null; }
    });
    body.addEventListener('click', (e) => {
      const gv = e.target.closest('[data-give]'); if (gv) { const mine = F.myTradablePicks(f); const p = mine.find((x) => F.pickKey(x) === gv.dataset.give); if (state.give.some((g) => F.pickKey(g) === gv.dataset.give)) state.give = state.give.filter((g) => F.pickKey(g) !== gv.dataset.give); else state.give.push(p); state.result = null; render(); return; }
      const tab = e.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; state.result = null; render(); return; }
      if (e.target.closest('[data-call]')) { state.result = state.tab === 'player' ? F.tradeAskPlayer(f, { give: state.give, position: state.position }) : F.tradeAskPicks(f, { give: state.give, year: state.year, round: state.round, count: state.count }); app.save(); render(); return; }
      const acc = e.target.closest('[data-accept]'); if (acc) { const o = state.result.offers[Number(acc.dataset.accept)]; const r = F.acceptTrade(f, o); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(o.get.player ? `${o.get.player.name} is yours.` : 'Picks swapped.', 'good'); close(); Router.render(); }
    });
    render();
  }
  // ---------------------------------------------------------------- Draft room (GDD §19)
  Router.registerScreen('draft', {
    title: ({ f }) => `Draft · ${yearOf(f?.draft?.creation ? f.season.year : (f?.season.year || 0) + 1)} class`,
    render({ f }) {
      const d = f.draft; if (!d?.started) return `<div class="panel"><p>Contracts first, then the draft.</p><button class="btn primary block" data-action="begin" ${F.offseasonReady(f) ? '' : 'disabled'}>Open the draft</button></div>`;
      const intro = d.creation && !d.done ? `<div class="talk" style="margin-bottom:8px"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 48, { hue: 40 })}<div class="grow"><div class="talk-name">The Commissioner</div><p class="talk-line">“Fast, I know. Welcome to ${esc(f.club)}. The draft is today and the lottery gave you the <b>#${d.lotterySlot}</b> pick. The staff you replaced left notes on a dozen prospects, the rest is on you. Go look at your roster first if you like; the clock waits for nobody.”</p></div></div></div>` : '';
      const clock = F.onTheClock(f); const mine = clock === f.club;
      const myPicks = d.picks.filter((p) => p.mine);
      const recent = d.picks.slice(-6).reverse();
      const avail = d.class.filter((m) => d.available.includes(m.id)).filter((m) => !draftFocus || m.position === draftFocus);
      const sorted = draftSort === 'known' ? avail.slice().sort((a, b) => (F.prospectView(f, b).level - F.prospectView(f, a).level) || (a.boardRank - b.boardRank)) : avail;
      const mySlots = d.order.map((o, i) => ({ ...o, i })).filter((o) => o.team === f.club);
      const lastPick = d.picks[d.picks.length - 1];
      return `${intro}<div class="panel tight"><div class="row between"><b>${d.done ? 'Draft complete' : `Round ${d.round} · pick ${d.index + 1} of ${d.order.length}`}</b><span class="chip ${mine ? 'accent' : ''}">${d.done ? '' : mine ? 'YOU ARE ON THE CLOCK' : esc(clock || '')}</span></div>
        <div class="dim">Your picks: ${mySlots.map((o) => `R${o.round} #${o.i + 1}`).join(', ') || 'none left'} · worst record picks first, snake order · roster ${f.roster.length}/${F.ROSTER_MAX}</div><div class="dim" style="margin-top:2px">${picksLine(f)}</div>
        <div class="row between" style="margin-top:6px"><span class="dim">${lastPick ? `Last pick: <b>${esc(lastPick.name)}</b>${lastPick.position ? ` (${esc(lastPick.position)}, ${lastPick.ovr} OVR)` : ''} → ${esc(lastPick.team)}` : 'No picks yet.'}</span><button class="btn small" data-action="picks">📋 All picks (${d.picks.length})</button></div></div>
        ${myPicks.length ? `<h3>Your draft</h3><div class="list">${myPicks.map((p) => `<div class="item static"><div class="grow"><div class="name">R${p.round} #${p.overall} · ${esc(p.name)}</div><div class="sub">${p.passed ? 'passed' : `${esc(p.position)} · ${p.ovr} OVR · rookie deal, two seasons`}</div></div></div>`).join('')}</div>` : ''}
        ${!d.done && mine ? noteHtml(suggestDraftPick(f)?.text, 'suggest') : ''}
        ${d.done ? `<button class="btn primary big block" data-action="back">${d.creation ? 'To headquarters' : 'Back to the offseason'}</button>` : mine ? `<div class="row between" style="margin:8px 0"><div class="seg"><button class="btn small ${draftSort === 'board' ? 'primary' : ''}" data-action="sort" data-v="board">Board</button><button class="btn small ${draftSort === 'known' ? 'primary' : ''}" data-action="sort" data-v="known">Scouted first</button></div><select class="input" id="draft-filter" style="width:auto">${[['', 'All positions'], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, g])].map(([v, l]) => `<option value="${v}" ${draftFocus === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div><button class="btn block" data-action="trade" style="margin-bottom:8px">☎️ Shop this pick (trade)</button><div class="list">${sorted.slice(0, 30).map((m) => prospectRow(f, m, { pickable: true })).join('')}</div><p class="center" style="margin-top:10px"><button class="btn small ghost" data-action="pass">Forfeit this pick</button></p>` : ''}
        <h3>Recent picks</h3><div class="list">${recent.map((p) => `<div class="item static ${p.mine ? 'mine' : ''}"><div class="grow"><div class="name">R${p.round} #${p.overall} · ${esc(p.team)}</div><div class="sub">${esc(p.name)}${p.position ? ` · ${esc(p.position)} · ${p.ovr} OVR` : ''}</div></div></div>`).join('') || '<p class="dim">No picks yet.</p>'}</div>`;
    },
    mount(root) {
      delegate(root, {
        begin: () => { const r = F.beginDraft(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        pick: async (el) => { const m = app.f.draft.class.find((x) => x.id === el.dataset.id); if (!(await confirmSheet(`Draft ${m.name} (${m.position})?${(() => { const c = consequence(app.f, 'draft', { salary: Math.round(salaryFor(m) * F.ROOKIE_SCALE / 100) * 100 }); return c ? ' ' + c : ''; })()}`, { title: 'Your pick', okLabel: 'Draft' }))) return; const r = F.myDraftPick(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${r.monster.name} joins the ${app.f.club}.`, 'good'); Router.render(); },
        pass: async () => { if (!(await confirmSheet('Forfeit this pick? Nobody is drafted and nothing comes back. Shop it first if you can.', { title: 'Forfeit pick', okLabel: 'Forfeit', danger: true }))) return; F.passDraftPick(app.f); app.save(); Router.render(); },
        trade: () => { const lead = F.myTradablePicks(app.f).find((p) => p.onClock) || null; tradeSheet(app.f, { lead, onDone: () => Router.render() }); },
        sort: (el) => { draftSort = el.dataset.v; Router.render(); },
        back: () => Router.go(app.f.draft?.creation ? 'hq' : 'offseason', {}, { reset: true }),
        prospect: (el) => { const m = app.f.draft?.class.find((x) => x.id === el.dataset.id); if (m) prospectSheet(app.f, m); },
        picks: () => { const d = app.f.draft; const rows = d.picks.slice().reverse().map((p) => `<div class="item ${p.id && F.prospectView(app.f, d.class.find((x) => x.id === p.id) || {}).level >= 6 ? 'tappable' : 'static'} ${p.mine ? 'mine' : ''}" ${p.id ? `data-action="prospect" data-id="${p.id}"` : ''}><div class="grow"><div class="name">R${p.round} #${p.overall} · ${esc(p.team)}</div><div class="sub">${esc(p.name)}${p.position ? ` · ${esc(p.position)} · ${p.ovr} OVR` : ''}</div></div></div>`).join('');
          const { el: el2 } = sheet(`<p class="dim">${d.picks.length} of ${d.order.length} picks made · newest first.</p><div class="list">${rows || '<p class="dim">No picks yet.</p>'}</div>`, { title: 'Draft board · picks so far' }); el2.addEventListener('click', (e) => { const b = e.target.closest('[data-action="prospect"]'); if (!b) return; const m = d.class.find((x) => x.id === b.dataset.id); if (m) prospectSheet(app.f, m); }); },
      });
      root.querySelector('#draft-filter')?.addEventListener('change', (e) => { draftFocus = e.target.value; Router.render(); });
    },
  });
  // ---------------------------------------------------------------- The commissioner's goals (GDD §17.4)
  Router.registerScreen('goals', {
    title: "Commissioner's office",
    render({ f }) {
      const offers = F.commissionerGoals(f); const b = f.board || { confidence: 0, history: [] };
      const ex = f.season.expectations?.[f.club];
      return `<div class="talk"><div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 56, { hue: 40 })}<div class="grow"><div class="talk-name">The Commissioner</div>
        <p class="talk-line">“${yearOf(f.season.year)}. The forecast has ${esc(f.club)} at ${ex ? (ex.expectedWinPct * 9).toFixed(1) : '?'} wins${b.history.length ? `; last year you ${b.history[b.history.length - 1].met ? 'delivered' : 'fell short'}` : ''}. Tell me what you are promising the board this year.”</p>
        <p class="talk-line">“Hit it and the board trusts you, and funds a bigger scouting department next season. Miss it and they start counting. Miss twice and I will be meeting your replacement.”</p></div></div></div>
        <div class="panel tight"><div class="row between"><span>Board confidence</span><b>${F.confidenceLabel(b.confidence)} (${b.confidence >= 0 ? '+' : ''}${b.confidence})</b></div><div class="dim">+1 for a goal met (+2 for the title), −1 for a miss. Hot seat at −1, out at −2.</div></div>
        <div class="stack">${offers.map((o) => `<button class="item" data-action="goal" data-id="${o.id}"><div class="grow"><div class="name">${esc(o.label)} <span class="chip ${o.tier === 'stretch' ? 'accent' : o.tier === 'medium' ? 'warn' : ''}">${o.tier}</span></div><div class="sub">${esc(o.text)}${o.weight > 1 ? ` · worth +${o.weight}` : ''}</div></div></button>`).join('')}</div>
        ${b.history.length ? `<h3>Past goals</h3><div class="list">${b.history.slice().reverse().map((h) => `<div class="item static"><div class="grow"><div class="name">${yearOf(h.year)} · ${esc(h.label)}</div><div class="sub">${h.met ? '✅ met' : '❌ missed'} · confidence ${h.confidence}</div></div></div>`).join('')}</div>` : ''}`;
    },
    mount(root) { delegate(root, { goal: async (el) => { const o = F.commissionerGoals(app.f).find((x) => x.id === el.dataset.id); if (!(await confirmSheet(`Commit to "${o.label}" for season ${app.f.season.year}? The board holds you to it.`, { title: 'Your word', okLabel: 'Commit' }))) return; const r = F.chooseGoal(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Goal set. The board is watching.', 'good'); Router.go('hq', {}, { reset: true }); } }); },
  });
  Router.registerScreen('commissioner', {
    title: "Commissioner's Office", back: true,
    render({ f }) {
      const c = f.week.commissioner; if (!c) return `<div class="panel"><p>Nothing to discuss. You're under the cap.</p><button class="btn primary block" data-action="back">Back to HQ</button></div>`;
      const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
      const line = c.visits === 1 ? `You're over budget. I'm guessing you didn't read the league rules. ${fmtMoney(c.over)} over, to be exact.` : `Still over by ${fmtMoney(c.over)}. We're not done.`;
      const rule = c.enough ? `I've picked ${c.names.length}. Any one of them gets you under. Choose who goes. Nothing comes back for it.` : `None of your monsters alone covers it, so I've picked your ${c.names.length} most expensive. Keep choosing until you're under.`;
      return `<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">LEAGUE COMMISSIONER</div>${esc(line)}<p style="margin:8px 0 0">${esc(rule)}</p></div></div>
        <div class="list" style="margin-top:12px">${c.names.map((id) => byId[id]).filter(Boolean).map((m) => `<div class="item static">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${m.cornerstone ? '★' : ''}${m.legendary ? ' <span class="chip accent">legendary</span>' : ''}</div><div class="sub">${m.position} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr${(m.salary || 0) >= c.over ? ' · gets you under' : ''}</div></div><button class="btn small danger" data-action="release" data-id="${m.id}" data-name="${esc(m.name)}">Release</button></div>`).join('')}</div>
        <p class="dim" style="margin-top:8px">Rule: the commissioner names the cheapest monsters that would each bring you under the cap (${F.difficultyOf(f).commissionerPicks} on ${esc(F.difficultyOf(f).label)}). Cornerstones and legendaries are not protected.</p>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.go('hq', {}, { reset: true }),
        release: async (el) => {
          if (!(await confirmSheet(`Release ${el.dataset.name}? Nothing comes back for them.`, { title: 'The commissioner is waiting', okLabel: 'Release', danger: true }))) return;
          const r = F.commissionerRelease(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; }
          app.save();
          if (r.done) { toast(`${r.released.name} released. You're under the cap.`, 'info'); Router.go('hq', {}, { reset: true }); } else { toast(`${r.released.name} released. Still over.`, 'bad'); Router.render(); }
        },
      });
    },
  });

  // ---------------------------------------------------------------- postseason story event (GDD §15.7)
  Router.registerScreen('postseason', {
    title: 'Postseason', back: true,
    render({ f }) {
      const ev = F.postseasonEvent(f); if (!ev) return `<div class="panel"><p>Nothing waiting. The offseason is quiet.</p><button class="btn primary block" data-action="back">Back to HQ</button></div>`;
      const who = ev.speaker === 'agent' ? { seed: `agent|${f.club}`, label: 'AGENT' } : { seed: f.staff[f.postseason.coordRole] || 'coach', label: 'YOUR COORDINATOR' };
      return `<p class="muted">A ${esc(f.history[f.history.length - 1]?.record.w)}-${esc(f.history[f.history.length - 1]?.record.l)} season has consequences. This one has to be settled before next season starts.</p>
        <div class="commissioner">${portraitSprite(who.seed, 56)}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${who.label}</div>${ev.lines.map((l) => esc(l)).join('<br>')}</div></div>
        <div class="stack" style="margin-top:12px">${ev.options.map((o) => `<button class="choice" data-action="choose" data-v="${o.id}"><span class="name">${esc(o.label)}</span><div class="muted">${esc(o.text)}</div></button>`).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.go('hq', {}, { reset: true }),
        choose: (el) => { const r = F.resolvePostseason(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.text, 'info', 4000); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Legend Tracks (GDD §15.8)
  Router.registerScreen('legend', {
    title: 'Legend Track', back: true,
    render({ f }) {
      const choices = F.legendChoices(f); const pending = f.legendPick && !f.legendPick.resolved;
      return `<div class="panel"><b>🏆 Beast Bowl champions choose a Legend Track.</b><div class="muted">Three tracks on the same legendary put it in your recruiting pool in its home region. You still have to sign it, and it costs real cap space. Gym legendaries open up once you hold their badge.</div></div>
        <div class="stack">${choices.map((c) => `<div class="choice"><div class="row" style="align-items:flex-start">${sprite16(c.species, 56)}<div class="grow"><div class="name">${esc(c.species.name)} <span class="dim">${c.species.position}</span></div><div class="muted">${esc(c.species.element)} legendary · home: ${esc((c.species.regions || [])[0] || '')}</div><div class="muted">${esc(c.species.ability.name)}: ${esc(c.species.ability.text)}</div><div class="mono" style="margin-top:4px">Tracks ${'●'.repeat(c.tracks)}${'○'.repeat(Math.max(0, 3 - c.tracks))} ${c.tracks}/3</div></div></div>${pending ? `<button class="btn primary small" data-action="pick" data-v="${c.id}" style="margin-top:6px">Add a track toward ${esc(c.species.name)}</button>` : ''}</div>`).join('') || '<p class="dim">Every legendary you can track is already unlocked or on your roster.</p>'}</div>
        ${pending ? '' : '<p class="dim" style="margin-top:8px">Win the Beast Bowl to earn a track.</p>'}`;
    },
    mount(root) {
      delegate(root, {
        pick: (el) => { const r = F.chooseLegendTrack(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.unlocked ? `${r.species.name} unlocked! Scout ${(r.species.regions || [])[0]} to find it.` : `Track ${r.tracks} of 3 toward ${r.species.name}.`, 'good', 4000); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Monday
  Router.registerScreen('scout', {
    title: 'Monday · Scouting',
    render({ f }) {
      const scout = F.staffMember(f, 'head_scout');
      const needs = F.depthNeeds(f); const gaps = needs.filter((n) => n.status !== 'ok');
      return `<p class="muted">${esc(scout?.name || 'Your scout')} searches one region for prospects. Better biome knowledge finds more monsters and reveals more about them.</p>
        <div class="panel tight"><div class="row between"><b>Depth check</b><span class="dim">${gaps.length ? `${needs.filter((n) => n.status === 'short').length} short · ${needs.filter((n) => n.status === 'thin').length} without a backup` : 'every position has a backup'}</span></div>
          <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${needs.map((n) => `<span class="chip ${n.status === 'short' ? 'bad' : n.status === 'thin' ? 'warn' : ''}">${n.position} ${n.healthy}/${n.slots}</span>`).join('')}</div>
          <label class="field" style="margin-top:6px">Ask the scout to look for <select class="input" id="scout-focus">${[['', gaps.length ? `${gaps[0].position} (${gaps[0].status === 'short' ? 'short-handed' : 'no backup'}), automatic` : 'nothing in particular'], ...Object.keys(F.GROUP_SLOTS).map((g) => [g, `${g}${needs.find((n) => n.position === g)?.status === 'short' ? ' · short-handed' : needs.find((n) => n.position === g)?.status === 'thin' ? ' · no backup' : ''}`])].map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label></div>
        <div class="stack">${Object.entries(REGIONS).map(([name, r]) => { const skill = scout?.biomes?.[r.biome] ?? 50; return `<button class="item" data-action="region" data-v="${esc(name)}"><div class="grow"><div class="name">${esc(name)}</div><div class="sub">${r.types.join(' · ')}</div></div><span class="chip ${skill >= 80 ? 'good' : skill < 40 ? 'bad' : ''}">${skill}/100</span></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { region: (el) => { const focus = root.querySelector('#scout-focus')?.value || null; const r = F.scoutRegion(app.f, el.dataset.v, { focus }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${r.scout} found ${r.prospects.length} prospect${r.prospects.length === 1 ? '' : 's'}.`, 'good'); Router.go('recruit', {}, { replace: true }); } }); },
  });

  // ---------------------------------------------------------------- Tuesday: Monster Encounters (Beast Clash, GDD §26.1)
  Router.registerScreen('recruit', {
    title: 'Tuesday · Monster Encounter',
    render({ f }) {
      const e = f.week.encounter;
      if (f.season.day !== 1) return `<div class="panel"><p>Tuesday is done for this week.</p>${f.week.recruited ? `<p class="muted">Signed: ${esc(f.roster.find((m) => m.id === f.week.recruited)?.name || '')}</p>` : e?.status === 'skipped' ? '<p class="muted">You skipped the encounter.</p>' : ''}<button class="btn block" data-action="back">Back</button></div>`;
      if (e && e.status !== 'ready') { setTimeout(() => Router.go('clash-battle', { kind: 'encounter', i: e.prospectIndex }, { replace: true }), 0); return '<p class="muted">Opening the battle…</p>'; }
      if (!f.week.prospects.length) return `<div class="panel"><p>No monsters were found this week.</p><button class="btn primary block" data-action="skip">Continue to Wednesday</button></div>`;
      const cap = F.salarySummary(f); const healthy = f.roster.filter((m) => !m.injury).length;
      return `<p class="muted">Your scout found these monsters. Pick <b>one</b> to meet in a Beast Clash: win and it will want to sign; lose and you still get one pitch. Or skip the encounter and move on. <button class="btn small ghost" data-action="clashhelp">Help</button></p>
        <p class="dim">Roster ${f.roster.length}/${F.ROSTER_MAX} · cap room ${fmtMoney(cap.remaining)} · ${healthy} monster${healthy === 1 ? '' : 's'} fit to battle</p>
        ${noteHtml(suggestProspect(f)?.text, 'suggest')}
        <div class="stack">${f.week.prospects.map((p, i) => prospectCard(p, i)).join('')}</div>
        <button class="btn block" data-action="skip" style="margin-top:8px">Skip the encounter</button>
        <p class="dim">Skipping means no battle and no signing this week. Nothing else is lost: no morale, no board confidence, no progress.</p>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.back(),
        clashhelp: () => sheet(CLASH_HELP, { title: 'How Beast Clash works' }),
        skip: () => { F.skipEncounter(app.f); app.save(); toast('Encounter skipped. On to Wednesday.'); Router.go('hq', {}, { reset: true }); },
        compare: (el) => { const p = app.f.week.prospects[Number(el.dataset.i)]; if (p) sheet(compareHtml(app.f, p), { title: `${p.monster.name} vs your ${p.monster.position}s` }); },
        enter: (el) => { const i = Number(el.dataset.i); const pv = F.encounterPreview(app.f, i); if (!pv.ok) { toast(pv.reason, 'bad'); return; } Router.go('clash-battle', { kind: 'encounter', i }); },
      });
    },
  });
  /** Prospect vs the club's monsters at the same position: headline ratings, OVR, age, salary, and where they'd slot in. */
  function compareHtml(f, p) {
    const m = p.monster; const known = Math.min(4, Math.ceil(p.revealed / 3)); const ovrKnown = p.revealed >= 4;
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const starters = new Set([...OFFENSE_BASE, ...DEFENSE_BASE, 'K'].map((s) => chart[s])); const pkg = new Set([...OFFENSE_PACKAGE_SLOTS, ...DEFENSE_PACKAGE_SLOTS].map((s) => chart[s]));
    const mates = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const startSlots = STARTERS_BY_POS[m.position] || 1;
    const hp = headlineAttributes(m);
    const cell = (v, best, show = true) => `<td class="mono ${show && v >= best ? 'best' : ''}">${show ? v : '??'}</td>`;
    const rows = [{ m, prospect: true }, ...mates.map((x) => ({ m: x }))];
    const best = Object.fromEntries(HEADLINE.map((x) => [x.key, Math.max(...rows.map((r, i) => (i === 0 && HEADLINE.findIndex((y) => y.key === x.key) >= known) ? 0 : headlineAttributes(r.m)[x.key]))]));
    const table = `<table class="compare"><thead><tr><th></th>${HEADLINE.map((x) => `<th>${x.label.slice(0, 3)}</th>`).join('')}<th>OVR</th><th>Age</th></tr></thead><tbody>${rows.map((r, idx) => { const h = headlineAttributes(r.m); return `<tr class="${r.prospect ? 'prospect' : ''}"><td><div class="row" style="gap:4px">${monsterSprite(r.m, 22)}<span>${esc(r.m.name)}${(!r.prospect || ovrKnown) && F.fitFor(f, r.m)?.fits ? ' <span class="fit-star" title="Fits scheme">✦</span>' : ''}${r.prospect ? ' <span class="chip accent">new</span>' : starters.has(r.m.id) ? ' <span class="chip">starter</span>' : pkg.has(r.m.id) ? ' <span class="chip">package</span>' : ''}</span></div></td>${HEADLINE.map((x, i) => cell(h[x.key], best[x.key], !r.prospect || i < known)).join('')}<td class="mono"><b>${r.prospect && !ovrKnown ? '??' : monsterOverall(r.m)}</b></td><td class="mono">${r.m.age}</td></tr>`; }).join('')}</tbody></table>`;
    let verdict;
    if (!ovrKnown) verdict = `Overall is hidden, a better scout would show where ${esc(m.name)} ranks.`;
    else {
      const rank = mates.filter((x) => monsterOverall(x) > monsterOverall(m)).length;
      verdict = !mates.length ? `You have no ${m.position} · ${esc(m.name)} would start immediately.` : rank < startSlots ? `<b>Would start</b> at ${m.position} (${rank + 1}${['st', 'nd', 'rd'][rank] || 'th'} best of ${mates.length + 1}).` : rank === startSlots ? `<b>First backup</b> at ${m.position}.` : `<b>Depth</b> · ${rank} ${m.position}${rank === 1 ? ' is' : 's are'} better.`;
    }
    const cap = F.salarySummary(f, m.salary);
    return `${table}<p style="margin-top:10px">${verdict}</p><p class="muted">${startSlots} starting ${m.position} slot${startSlots === 1 ? '' : 's'} · Salary ${fmtMoney(m.salary)}/yr · cap room after signing ${cap.over ? `<span style="color:var(--bad)">over by ${fmtMoney(-cap.remaining)}</span>` : fmtMoney(cap.remaining)} · roster ${f.roster.length + 1}/${F.ROSTER_MAX}</p>${known < 4 ? `<p class="dim">?? = not yet scouted.</p>` : ''}`;
  }
  function prospectCard(p, i) {
    const m = p.monster; const attrs = effectiveAttributes(m);
    const h = headlineAttributes(m); const known = Math.min(4, Math.ceil(p.revealed / 3));
    const fit = p.revealed >= 4 ? F.fitFor(app.f, m) : null;
    const depth = p.depth || (p.need ? 'short' : 'ok');
    return `<div class="panel ${fit?.fits ? 'fit' : ''} ${depth === 'short' ? 'need-short' : depth === 'thin' ? 'need-thin' : ''}">${depth !== 'ok' ? `<div class="fitchip-row"><span class="chip ${depth === 'short' ? 'bad' : 'warn'}">${depth === 'short' ? `Short-handed at ${esc(m.position)}` : `No backup at ${esc(m.position)}`}</span> <span class="dim">${p.need ? 'The scout went looking for this one.' : depth === 'short' ? 'One injury from an empty slot.' : 'One injury from a hole.'}</span></div>` : ''}${fit?.fits ? `<div class="fitchip-row"><span class="chip fitchip">✦ Fits your scheme</span> <span class="dim">${esc(fit.why)}</span></div>` : ''}<div class="row" style="flex-wrap:nowrap;align-items:flex-start">${monsterSprite(m, 52)}<div class="grow" style="flex:1;min-width:0"><b>${esc(m.name)}</b> ${typeGlyph(m.type)}<div class="muted">${m.position} · age ${m.age} · ${p.potentialKnown ? 'potential ' + m.potential : 'potential unknown'} · ${fmtMoney(m.salary)}/yr</div><div class="muted">Nature: ${p.natureKnown ? esc(NATURES[m.nature].name) : '???'}</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:none"><span class="ovr">${p.revealed >= 4 ? monsterOverall(m) : '??'}</span><button class="info-btn" data-action="compare" data-i="${i}" aria-label="Compare ${esc(m.name)} with your roster">i</button></div></div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < known ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < known ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>${known < 4 ? `<div class="dim">${4 - known} rating${4 - known === 1 ? '' : 's'} hidden, a better scout reveals more</div>` : ''}
      <button class="btn primary block" data-action="enter" data-i="${i}">⚔️ Enter Beast Clash with ${esc(m.name)}</button></div>`;
  }

  // ---------------------------------------------------------------- Wednesday
  let intensity = 'normal';
  Router.registerScreen('training', {
    title: 'Wednesday · Training',
    render({ f }) {
      const tr = F.staffMember(f, 'monster_trainer');
      if (f.season.day !== 2 && f.week.training) { const t = f.week.training; return `<div class="panel">${trainingResultHtml(t)}</div><button class="btn block" data-action="back">Back</button>`; }
      const pct = (x) => `${Math.round(x * 100)}%`;
      return `<p class="muted">${esc(tr?.name || 'Your trainer')} runs one practice. If it goes well, the boost applies on Sunday. Practices can go badly, and monsters can get hurt.</p>
        <div class="seg" style="margin-bottom:6px">${Object.entries(F.INTENSITIES).map(([id, I]) => `<button class="btn small ${intensity === id ? 'primary' : ''}" data-action="intensity" data-v="${id}">${I.label}</button>`).join('')}</div>
        <p class="dim" style="margin-top:0">${esc(F.INTENSITIES[intensity].text)}</p>
        <div class="stack">${Object.entries(TRAINING_FOCI).map(([id, t]) => { const o = F.trainingOdds(f, id, intensity); return `<button class="item" data-action="focus" data-v="${id}"><div class="grow"><div class="name">${esc(t.label)} <span class="chip accent">+${o.amount}</span></div><div class="sub">${esc(t.attrs.map((a) => ATTR_LABEL[a]).join(', '))}</div><div class="sub"><b style="color:${o.success >= 0.7 ? 'var(--good)' : o.success >= 0.45 ? 'var(--warn, #e0a33b)' : 'var(--bad)'}">${pct(o.success)} success</b> · ${pct(o.risk)} injury risk${o.streak >= 2 ? ` · <span style="color:var(--bad)">${o.streak} weeks in a row, monsters are tuning it out</span>` : o.streak === 1 ? ' · same as last week' : ''}</div></div></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { back: () => Router.back(), intensity: (el) => { intensity = el.dataset.v; Router.render(); }, focus: (el) => { const r = F.setTraining(app.f, el.dataset.v, intensity); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(trainingResultHtml(app.f.week.training), { title: 'Practice report', onClose: () => Router.go('hq', {}, { reset: true }) }); } }); },
  });
  function trainingResultHtml(t) {
    const label = TRAINING_FOCI[t.focus]?.label || t.focus;
    return `<h2 style="margin-top:0">${t.success ? '✅ Good practice' : '❌ Sloppy practice'}</h2><p>${t.success ? `${esc(label)} work paid off: <b>+${t.amount}</b> to ${esc(TRAINING_FOCI[t.focus].attrs.map((a) => ATTR_LABEL[a]).join(', '))} on Sunday.` : `${esc(label)} work didn't stick this week. No boost on Sunday.`}</p>${t.injury ? `<p style="color:var(--bad)">🚑 ${esc(t.injury.name)} was hurt: ${esc(t.injury.severity)}, out ${t.injury.weeks} week${t.injury.weeks === 1 ? '' : 's'}. The next monster on the depth chart steps in.</p>` : '<p class="muted">Everyone came out healthy.</p>'}${t.fatigue ? `<p class="dim">Practice added ${t.fatigue}% fatigue. Fatigue comes off at Saturday’s lineup check.</p>` : ''}`;
  }

  // ---------------------------------------------------------------- Thursday
  Router.registerScreen('scoutopp', {
    title: 'Thursday · Opponent',
    render({ f }) {
      const opp = F.opponentName(f);
      if (!opp) return `<div class="panel"><p>No opponent this week (bye).</p><button class="btn primary block" data-action="skip">Continue</button></div>`;
      if (f.week.scoutReport) return `<div class="panel">${reportHtml(f.week.scoutReport, opp)}</div><button class="btn block" data-action="back">Back</button>`;
      return `<p class="muted">Scout <b>${esc(opp)}</b>'s offense or defense. You get one report.</p><div class="grid2"><button class="btn big" data-action="side" data-v="offense">Their offense</button><button class="btn big" data-action="side" data-v="defense">Their defense</button></div>`;
    },
    mount(root) { delegate(root, { back: () => Router.back(), skip: () => { F.scoutOpponent(app.f, 'offense'); app.save(); Router.go('hq', {}, { reset: true }); }, side: (el) => { const r = F.scoutOpponent(app.f, el.dataset.v); app.save(); sheet(reportHtml(r.report, F.opponentName(app.f) || ''), { title: 'Scouting report', onClose: () => Router.go('hq', {}, { reset: true }) }); } }); },
  });
  function reportHtml(r, opp) {
    if (!r) return '<p>No report.</p>';
    const ids = r.plays || r.favourite || [];
    const cards = `<h3 style="margin-bottom:4px">Their ${ids.length} ${r.side === 'offense' ? 'offensive' : 'defensive'} plays</h3><p class="dim" style="margin-top:0">They'll only call these on Sunday. You won't know when. Tap a card for details.</p><div class="play-grid">${ids.map((id) => `<button class="card" data-scout-play="${id}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id]?.name || id)}</span></button>`).join('')}</div>${legendHtml(r.side)}`;
    const star = r.star ? `<b>Star</b><span>${esc(r.star.name)} (${r.star.slot}, ${r.star.ovr} OVR)</span>` : '';
    const bonus = r.bonus && PLAYS[r.bonus.play] ? `<div class="panel tight" style="margin-top:8px"><b>${r.bonus.analyst ? 'Analyst’s eye' : 'Rematch scouting'}</b><div class="muted">${r.bonus.analyst ? 'Your background in the tape room shows' : `You've faced them ${r.bonus.games} time${r.bonus.games === 1 ? '' : 's'}:`} one of their ${r.bonus.side === 'offense' ? 'offensive' : 'defensive'} plays is known too.</div><div class="play-grid" style="margin-top:6px"><button class="card" data-action="play" data-id="${r.bonus.play}"><div>${playCardSvg(r.bonus.play)}</div><span class="card-label">${esc(PLAYS[r.bonus.play].name)}</span></button></div></div>` : '';
    return bonus + (r.side === 'offense'
      ? `<h2>${esc(opp)} offense</h2><div class="kv"><b>Pass / run split</b><span>${r.passBias}% pass</span><b>Passing strength</b><span>${r.pass}</span><b>Running strength</b><span>${r.run}</span><b>Aggression</b><span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.passBias >= 60 ? 'They throw a lot, coverage-heavy calls and pass rush.' : r.passBias <= 48 ? 'Run-first, stack the box and make them throw.' : 'Balanced, mix your calls.'}</p>${cards}`
      : `<h2>${esc(opp)} defense</h2><div class="kv"><b>Pass defense</b><span>${r.passD}</span><b>Run defense</b><span>${r.runD}</span><b>Aggression</b><span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.aggression >= 60 ? 'Blitz-happy, screens and quick throws punish them.' : r.passD > r.runD + 6 ? 'Strong secondary, lean on the run.' : r.runD > r.passD + 6 ? 'Soft against the pass, take your shots.' : 'No obvious weakness, stay balanced.'}</p>${cards}`);
  }
  /** Tapping a scouted play card opens its full diagram. */
  document.addEventListener('click', (e) => { const id = e.target.closest?.('[data-scout-play]')?.dataset.scoutPlay; if (id && PLAYS[id]) sheet(playDetailHtml(id).replace(/<div style="margin-top:12px"><button[^]*?<\/div>$/, ''), { title: PLAYS[id].name }); });


  // ---------------------------------------------------------------- Friday
  Router.registerScreen('gameplan', {
    title: 'Friday · Game Plan',
    render({ f }) {
      if (f.season.day !== 4) return `<div class="panel"><p>The game plan is set on <b>Friday</b>. This week's plan: ${f.week.plan.offense.length ? f.week.plan.offense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'} · ${f.week.plan.defense.length ? f.week.plan.defense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'}.</p><button class="btn block" data-action="back">Back</button></div>`;
      const sel = { offense: new Set(F.startingPlan(f, 'offense')), defense: new Set(F.startingPlan(f, 'defense')) };
      const rep = f.week.scoutReport; const hintsOn = f.settings.hints !== false;
      const hintSide = rep?.side === 'defense' ? 'offense' : rep?.side === 'offense' ? 'defense' : null;
      const hints = hintsOn && hintSide ? counterPlays(F.catalog(f, hintSide), rep.plays || []) : [];
      const hintMap = Object.fromEntries(hints.map((h) => [h.id, h]));
      const hintNote = hintsOn && hintSide ? `<div class="panel tight hint-note"><b>💡 Coach's hints</b> · ${hints.length ? `outlined ${hintSide} plays counter what ${esc(F.opponentName(f) || 'they')} showed in scouting. A hint is a lean, not a guarantee.` : `nothing in your ${hintSide} playbook clearly counters their scouted calls.`} <span class="dim">(Settings → Coaching hints)</span></div>` : hintsOn ? '<p class="dim">Scout the opponent on Thursday to get coach\'s hints here.</p>' : '';
      const avail = F.playAvailability(f);
      const availNote = avail.slots.length ? `<div class="panel tight" style="border-color:var(--bad)"><b>⚠️ No legal monster for ${avail.slots.join(', ')}</b>. Plays using ${avail.slots.map((sl) => ({ SS: 'Nickel', DL3: 'Heavy / Pressure', WR3: 'Spread', C: 'Tight' })[sl] || sl).join(' / ')} are greyed out and will not be called. Only a monster whose primary or secondary position fits can fill a slot.</div>` : '';
      const side = (s) => `<h3>${s === 'offense' ? 'Offense' : 'Defense'} · <span id="count-${s}">${sel[s].size}</span>/${F.PLAN_SIZE} equipped</h3><div class="play-grid" data-side="${s}">${F.catalog(f, s).map((id) => `<button class="card ${sel[s].has(id) ? 'selected' : ''} ${hintMap[id] ? 'hint' : ''} ${avail.blocked[id] ? 'blocked' : ''}" title="${avail.blocked[id] ? esc('Needs ' + avail.blocked[id] + ': nobody legal to fill it') : hintMap[id] ? esc('Counters ' + hintMap[id].beats.join(', ')) : ''}" data-action="toggle" data-side="${s}" data-id="${id}" aria-pressed="${sel[s].has(id)}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}</div>`;
      return `<p class="muted">Equip ${F.PLAN_SIZE} offensive and ${F.PLAN_SIZE} defensive plays for Sunday. Your coordinators' picks are pre-selected; tap a card to swap, or use Details for the full diagram.</p>${availNote}${hintNote}
        ${side('offense')}${legendHtml('offense')}${side('defense')}${legendHtml('defense')}
        <div class="row between" style="margin-top:12px"><button class="btn" data-action="details">Play details</button><button class="btn primary" data-action="save">Save game plan</button></div>`;
    },
    mount(root) {
      const f0 = app.f; const sel = { offense: new Set(F.startingPlan(f0, 'offense')), defense: new Set(F.startingPlan(f0, 'defense')) };
      delegate(root, {
        back: () => Router.back(),
        toggle: (el) => { const s = el.dataset.side, id = el.dataset.id; if (sel[s].has(id)) sel[s].delete(id); else if (sel[s].size >= F.PLAN_SIZE) { toast(`Only ${F.PLAN_SIZE} ${s} plays. Remove one first.`); return; } else sel[s].add(id); el.classList.toggle('selected', sel[s].has(id)); el.setAttribute('aria-pressed', sel[s].has(id)); root.querySelector(`#count-${s}`).textContent = sel[s].size; },
        details: () => Router.go('playbook'),
        save: () => { const r = F.setGamePlan(app.f, [...sel.offense], [...sel.defense]); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Game plan saved.', 'good'); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Saturday
  let mediaPicks = [];
  Router.registerScreen('lineup', {
    title: 'Saturday · Media Day',
    render({ f }) {
      const r = F.lineupCheck(f, { advance: false });
      const borrowed = r.borrowed?.length ? `<p class="muted" style="color:var(--warn)">${r.borrowed.map((b) => b.legal ? `↪ ${b.slot}: ${esc(b.name)} (${esc(b.position)}${b.outOfPosition ? ', 1.75× injury risk' : ''}) fills in` : `⚠️ ${b.slot}: nobody legal. Plays using it are unavailable`).join(' · ')}.</p>` : '';
      const lineup = r.ok ? `<p class="muted">✅ Lineup set: every starting position has a healthy monster.${r.tired.length ? ` <span style="color:var(--warn)">Tired: ${esc(r.tired.join(', '))}.</span>` : ''}</p>${borrowed}` : `<p style="color:var(--bad)">⚠️ No legal monster for ${r.problems.join(', ')}. Unless you fix the depth chart, Sunday is a forfeit (0-21).</p>${borrowed}`;
      if (f.week.media) {
        const md = f.week.media; const groups = Object.entries(md.boosts).map(([t, v]) => { const reach = F.natureReach(f, t); return `<span class="chip ${reach.total ? 'accent' : ''}">${NATURES[t].name} +${v}${reach.total ? ` · ${reach.names.slice(0, 3).map(esc).join(', ')}${reach.total > 3 ? ` +${reach.total - 3}` : ''}` : ' · nobody'}</span>`; }).join(' ');
        return `<div class="panel"><h3 style="margin-top:0">Press conference done</h3><p>${groups || 'No boosts.'}${md.hype ? ' <span class="chip bad">Trash talk: +2 all, risky</span>' : ''}</p><p class="dim">Those monsters heard themselves in your answers: +${F.MEDIA_BOOST} to their nature’s strength on Sunday.</p>${lineup}</div><div class="grid2"><button class="btn block" data-action="roster">Depth chart</button><button class="btn primary block" data-action="done">Ready for Sunday →</button></div>`;
      }
      const qs = F.mediaQuestions(f); app.save();
      return `<p class="muted">The press wants answers. Every answer is spoken in the voice of one nature; the monsters who share it hear themselves and play Sunday with +${F.MEDIA_BOOST} to their nature’s strength. Know your monsters: nobody here will tell you who is listening.</p>
        ${qs.map((q, k) => `<div class="panel"><b>🎤 “${esc(q.q)}”</b><div class="stack" style="margin-top:8px">${q.a.map((a, ai) => `<button class="choice ${mediaPicks[k] === ai ? 'selected' : ''}" data-action="answer" data-q="${k}" data-a="${ai}"><span>${esc(a.text)}</span><span class="dim" style="font-size:12px">${NATURES[a.t].name}${a.hype ? ' · trash talk' : ''}${a.star ? ' · your star' : ''}</span></button>`).join('')}</div></div>`).join('')}
        ${lineup}<button class="btn primary big block" data-action="submit" ${mediaPicks.filter((x) => x != null).length === qs.length ? '' : 'disabled'}>Finish press conference</button>`;
    },
    mount(root) { delegate(root, {
      roster: () => Router.go('roster'), done: () => Router.go('hq', {}, { reset: true }),
      answer: (el) => { mediaPicks[Number(el.dataset.q)] = Number(el.dataset.a); Router.render(); },
      submit: () => { F.answerMedia(app.f, mediaPicks); mediaPicks = []; app.save(); Router.render(); },
    }); },
  });

  // ---------------------------------------------------------------- Playbook browsing
  Router.registerScreen('playbook', {
    title: 'Playbook', back: false,
    render({ f }) {
      const oc = F.staffMember(f, 'offensive_coordinator'), dc = F.staffMember(f, 'defensive_coordinator');
      const grid = (s) => `<div class="play-grid">${F.catalog(f, s).map((id) => { const st = F.playStat(f, id); return `<button class="card ${f.week.plan[s].includes(id) ? 'selected' : ''}" data-action="open" data-id="${id}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span><span class="card-stat">${st.used ? `${st.used}× · ${st.avg.toFixed(1)} yd` : 'not used yet'}</span></button>`; }).join('')}</div>`;
      return `<div class="row between"><h3 style="margin:0">Offense · ${esc(oc?.style || '')}</h3>${f.season.day === 4 ? '<button class="btn small" data-action="plan">Set game plan</button>' : '<span class="dim">Game plan is set on Fridays</span>'}</div>${grid('offense')}${legendHtml('offense')}
        <h3>Defense · ${esc(dc?.style || '')}</h3>${grid('defense')}${legendHtml('defense')}<p class="dim">Highlighted cards are in this week's game plan. Under each card: times called this season and average yards (gained on offense, allowed on defense).</p>`;
    },
    mount(root) { delegate(root, { open: (el) => Router.go('playdetail', { id: el.dataset.id }), plan: () => Router.go('gameplan') }); },
  });
  Router.registerScreen('playdetail', {
    title: ({ params }) => PLAYS[params.id]?.name || 'Play',
    render({ params, f }) { return playDetailHtml(params.id, f); },
    mount(root) { delegate(root, { practice: (el) => Router.go('practice', { play: el.dataset.id }) }); },
  });

  // ---------------------------------------------------------------- League
  Router.registerScreen('league', {
    title: 'League', back: false,
    render({ f }) {
      const rival = f.rivals[f.tier]; const titles = Object.values(f.badges).reduce((a, b) => a + b, 0);
      const races = F.awardRaces(f); const anyRace = Object.values(races).some((v) => v.length);
      const watch = `<h3>🏅 Award watch</h3>${anyRace ? '' : '<p class="dim">Races start after the first Sunday. Stats from every club in the league count.</p>'}<div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const top = races[k]; return `<button class="item" style="display:block" data-action="award" data-k="${k}"><div class="row between"><div class="name">${esc(a.label)} <span class="dim">${a.short}</span></div><span class="dim">top 5 ›</span></div>${top.length ? top.map((r, i) => { const me = r.team === f.club; return k === 'coy' ? `<div class="row between sub ${me ? 'mine' : ''}"><span>${i + 1}. ${esc(r.coach)} <span class="dim">${esc(r.team)}</span></span><span class="mono">${r.w}-${r.l}</span></div>` : `<div class="row sub ${me ? 'mine' : ''}" style="gap:6px"><span class="dim">${i + 1}.</span>${monsterSprite(r, 20)}<span class="grow">${esc(r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)}</span></span><span class="mono">${raceLine(r)}</span></div>`; }).join('') : '<div class="sub dim">No contenders yet.</div>'}</button>`; }).join('')}</div>`;
      return `<div class="panel"><b>Beast League</b> · 16 clubs · ${yearOf(f.season.year)}<div class="muted">Beast Bowl titles: ${titles}${f.season.week >= 5 && !f.season.finished ? ` · ${esc(F.playoffPicture(f).text)}` : ''}</div>
        ${rival ? `<div class="muted">⚔️ Rival: <b>${esc(rival.team)}</b> (GM ${esc(rival.gm)}) · all-time ${rival.headToHead.w}-${rival.headToHead.l}</div>` : ''}</div>
        <div class="grid2"><button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button><button class="btn block" data-action="go" data-screen="history">📜 History</button><button class="btn block" data-action="go" data-screen="playoffs">🏆 Playoffs</button><button class="btn block" data-action="go" data-screen="leaders">📈 Stats</button><button class="btn block" data-action="go" data-screen="awardhistory">🏅 Award history</button><button class="btn block" data-action="go" data-screen="records">📕 Records book</button></div>${watch}`;
    },
    mount(root) { delegate(root, {
        award: (el) => sheet(awardRaceHtml(app.f, el.dataset.k), { title: F.AWARDS[el.dataset.k].label }), go: (el) => Router.go(el.dataset.screen) }); },
  });
  Router.registerScreen('schedule', {
    title: 'Schedule',
    render({ f }) {
      const rival = f.rivals[f.tier]?.team;
      return `<p class="muted">${yearOf(f.season.year)} · 9 games, 1 bye · playoffs weeks 11-13</p><div class="list">${f.season.schedule.map((g) => { const res = g.result; return `<div class="item static ${g.week === f.season.week ? 'me' : ''}"><div class="grow"><div class="name">Week ${g.week} ${g.bye ? '· BYE' : `· ${g.home ? 'vs' : '@'} ${esc(g.opponent)}`}${g.opponent === rival ? ' ⚔️' : ''}</div><div class="sub">${g.bye ? 'Rest and recover' : esc(g.category)}${!g.bye && GYM_BY_CLUB[g.opponent] ? ` · 🏅 ${esc(GYM_BY_CLUB[g.opponent].badge)}${F.badgeOf(f, g.opponent) ? ' (held)' : ''}` : ''}</div></div>${res ? `<span class="chip ${res.won ? 'good' : 'bad'}">${res.won ? 'W' : 'L'} ${res.playerScore}-${res.oppScore}</span>` : g.week === f.season.week ? '<span class="chip accent">This week</span>' : ''}</div>`; }).join('')}</div>`;
    },
  });
  Router.registerScreen('standings', {
    title: 'Standings',
    render({ f }) {
      const st = F.leagueStandings(f);
      const rec = (t) => f.season.records[t];
      const table = (teams) => `<table class="standings"><thead><tr><th>Team</th><th class="num">W</th><th class="num">L</th><th class="num">PF</th><th class="num">PA</th></tr></thead><tbody>${teams.map((t) => `<tr class="${t === f.club ? 'me' : ''}"><td>${esc(t)}</td><td class="num">${rec(t).w}</td><td class="num">${rec(t).l}</td><td class="num">${rec(t).pf}</td><td class="num">${rec(t).pa}</td></tr>`).join('')}</tbody></table>`;
      return ['Aurora', 'Titan'].map((conf) => `<h3>${conf} Conference</h3>${Object.keys(DIVISIONS).filter((d) => conferenceFor(d) === conf).map((d) => `<div class="panel tight"><b>${d}</b>${table(st.divisions[d])}</div>`).join('')}`).join('') + `<p class="dim">Tiebreakers: head-to-head, division record, conference record, point differential.</p>`;
    },
  });
  // ---------------------------------------------------------------- Achievement cutscenes (GDD §21)
  let sceneBeat = 0;
  Router.registerScreen('scene', {
    title: 'Achievement', tabs: false,
    render({ f }) {
      const sc = F.nextScene(f); if (!sc) return '<p class="dim">Nothing to show.</p><button class="btn primary block" data-action="done">Back to headquarters</button>';
      const shown = sc.beats.slice(0, sceneBeat + 1); const last = sceneBeat >= sc.beats.length - 1;
      const who = sc.speaker === 'board' ? '' : sc.speaker === 'rival' ? `<div class="row" style="gap:12px;align-items:flex-start">${portraitSprite(`gm|${sc.rivalTeam}`, 72, { hue: 280 })}<div class="grow"><div class="talk-name">${esc(sc.rivalGm || 'The rival GM')}</div><div class="dim">GM, ${esc(sc.rivalTeam || '')} · on the phone</div></div></div>` : `<div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 72, { hue: 40 })}<div class="grow"><div class="talk-name">The Commissioner</div><div class="dim">League office</div></div></div>`;
      const body = sc.speaker === 'board' ? `<div class="board-letter">${shown.map((b, i) => `<p class="${i === sceneBeat ? 'fresh' : ''}">${esc(b)}</p>`).join('')}</div>` : `<div class="stack" style="margin-top:12px">${shown.map((b, i) => `<div class="talk ${i === sceneBeat ? 'fresh' : ''} ${sc.speaker === 'rival' ? 'rival' : ''}"><p class="talk-line">${esc(b)}</p></div>`).join('')}</div>`;
      const left = (f.scenes?.length || 1) - 1;
      return `<div class="scene scene-${sc.speaker}"><div class="scene-badge">🏅 ACHIEVEMENT · ${esc(sc.title.toUpperCase())}</div>${who}${body}
        <button class="btn primary big block" data-action="${last ? 'next' : 'more'}" style="margin-top:14px">${last ? (left ? `Continue (${left} more)` : 'Back to headquarters →') : 'Continue'}</button></div>`;
    },
    mount(root) {
      delegate(root, {
        more: () => { sceneBeat += 1; Router.render(); root.querySelector('.fresh')?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); },
        next: () => { F.dismissScene(app.f); sceneBeat = 0; app.save(); if (F.nextScene(app.f)) Router.render(); else Router.go('hq', {}, { reset: true }); },
        done: () => Router.go('hq', {}, { reset: true }),
      });
    },
  });
  /** The bracket (GDD §20.8): Aurora on the left, Titan on the right, the Beast Bowl in the middle, semifinals → championship → final. */
  function bracketHtml(f, p) {
    const abbr = (t) => TEAM_META[t]?.abbr || (t || '').slice(0, 3).toUpperCase();
    const seedOf = (t) => { for (const c of ['Aurora', 'Titan']) { const i = p.seeds[c].indexOf(t); if (i >= 0) return i + 1; } return ''; };
    const winnerOf = (g) => g?.result ? (g.result.winner || (g.result.homeScore > g.result.awayScore ? g.home : g.away)) : null;
    const scoreOf = (g, t) => !g?.result ? '' : t === g.home ? g.result.homeScore : g.result.awayScore;
    const light = (hex) => { const h = String(hex || '').replace('#', ''); if (h.length < 6) return false; const [r, g2, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g2 + 0.0722 * b > 0.55; };
    const cell = (t, g) => { if (!t) return '<div class="bk-team tbd"><span class="bk-seed"></span><span class="bk-abbr">TBD</span></div>'; const w = winnerOf(g); const col = TEAM_META[t]?.color || '#345'; return `<div class="bk-team ${t === f.club ? 'me' : ''} ${w && w !== t ? 'out' : ''} ${w === t ? 'won' : ''} ${light(col) ? 'lighttc' : ''}" style="--tc:${col}"><span class="bk-seed">${seedOf(t)}</span><span class="bk-abbr">${esc(abbr(t))}</span>${g?.result ? `<span class="bk-score">${scoreOf(g, t)}</span>` : ''}</div>`; };
    const pair = (g, top, bottom) => `<div class="bk-pair">${cell(top, g)}${cell(bottom, g)}</div>`;
    const conf = (c) => {
      const seeds = p.seeds[c]; const semis = p.fixtures.filter((g) => g.round === 1 && g.conf === c);
      const s1 = semis.find((g) => g.home === seeds[0]) || null, s2 = semis.find((g) => g.home === seeds[1]) || null;
      const champ = p.fixtures.find((g) => g.round === 2 && g.conf === c) || null;
      const semiCol = `<div class="bk-col">${pair(s1, seeds[0], seeds[3])}${pair(s2, seeds[1], seeds[2])}</div>`;
      const champCol = `<div class="bk-col">${pair(champ, champ?.home || winnerOf(s1), champ?.away || winnerOf(s2))}</div>`;
      return { semiCol, champCol };
    };
    const A = conf('Aurora'), T = conf('Titan');
    const final = p.fixtures.find((g) => g.round === 3) || null;
    const aChamp = winnerOf(p.fixtures.find((g) => g.round === 2 && g.conf === 'Aurora')), tChamp = winnerOf(p.fixtures.find((g) => g.round === 2 && g.conf === 'Titan'));
    const champ = p.champion || winnerOf(final);
    const head = (l, cls = '') => `<div class="bk-h ${cls}">${l}</div>`;
    return `<div class="bracket">
      <div class="bk-heads">${head('Semis')}${head('Aurora')}${head('Beast Bowl', 'final')}${head('Titan')}${head('Semis')}</div>
      <div class="bk-grid">${A.semiCol}${A.champCol}<div class="bk-col bk-center"><div class="bk-ball">🏈</div><div class="bk-pair final">${cell(final ? (final.home === tChamp ? final.away : final.home) : aChamp, final)}${cell(final ? (final.home === tChamp ? final.home : final.away) : tChamp, final)}</div></div>${T.champCol}${T.semiCol}</div>
      <div class="bk-champ"><span class="bk-champ-label">CHAMPION</span><span class="bk-champ-name">${champ ? `🏆 ${esc(champ)}${champ === f.club ? ', that’s you!' : ''}` : ''}</span></div>
    </div>`;
  }
  /** HQ header (GDD §21.1): the week in the regular season; the playoff round once the bracket is drawn; the offseason after. */
  function phaseLabel(f) {
    if (f.season.finished) return F.displayYear(f) > f.season.year ? 'Offseason · draft & free agency' : 'Offseason · contracts';
    const p = f.season.playoffs; if (!p) return `Week ${f.season.week}`;
    return F.ROUND_NAMES?.[p.round] ? ({ 1: 'Playoffs · Conference semifinals', 2: 'Playoffs · Conference championships', 3: 'Playoffs · Beast Bowl' })[p.round] : 'Playoffs';
  }
  function playoffStatus(f) {
    const p = f.season.playoffs; const rec = f.season.records[f.club] || { w: 0, l: 0 };
    if (f.season.finished) return f.season.champion === f.club ? '<b>🏆 Beast Bowl champions</b>' : `Final record <b class="mono">${rec.w}-${rec.l}</b>`;
    const fx = F.playoffFixture(f); const inIt = Object.values(p.seeds).flat().includes(f.club);
    if (!inIt) return `<span class="dim">Missed the playoffs (${rec.w}-${rec.l}) · watching the bracket</span>`;
    if (fx) return `<b>${esc(fx.tag)}</b> · ${fx.home === f.club ? 'vs' : '@'} ${esc(fx.home === f.club ? fx.away : fx.home)}`;
    const lost = p.results?.find((r) => r.loser === f.club || ((r.home === f.club || r.away === f.club) && r.winner !== f.club));
    return lost ? `<span class="dim">Eliminated in the ${esc(({ 1: 'conference semifinals', 2: 'conference championship', 3: 'Beast Bowl' })[lost.round] || 'playoffs')}</span>` : '<b>Advanced</b> · waiting on the next round';
  }
  Router.registerScreen('playoffs', {
    title: 'Playoffs',
    render({ f }) {
      const p = f.season.playoffs; const rec = (t) => f.season.records[t] || { w: 0, l: 0, t: 0 };
      const recText = (t) => { const r = rec(t); return `${r.w}-${r.l}${r.t ? '-' + r.t : ''}`; };
      const dot = (t) => `<span class="team-dot" style="background:${TEAM_META[t]?.color || '#888'}"></span>`;
      const teamRow = (t, seed, tag) => `<div class="po-row ${t === f.club ? 'me' : ''}"><span class="seed">${seed}</span>${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ' <span class="chip accent">YOU</span>' : ''}</span>${tag ? `<span class="chip">${tag}</span>` : ''}<span class="mono po-rec">${recText(t)}</span></div>`;
      if (!p) {
        const st = F.leagueStandings(f); const wk = f.season.week;
        const conf = (c) => { const C = st.conferences[c]; const hunt = C.order.filter((t) => !C.seeds.includes(t)).slice(0, 2); const lastIn = C.seeds[3];
          const back = (t) => { const a = rec(t), b = rec(lastIn); const gb = ((b.w - a.w) + (a.l - b.l)) / 2; return gb <= 0 ? 'tiebreak' : `${gb} GB`; };
          return `<div class="panel tight po-conf"><div class="po-head"><b>${c} Conference</b><span class="dim">4 qualify</span></div>${C.seeds.map((t, i) => teamRow(t, i + 1, C.champions.includes(t) ? 'Div' : 'WC')).join('')}<div class="po-cut"><span>playoff line</span></div>${hunt.map((t) => teamRow(t, '·', back(t))).join('')}</div>`; };
        return `<div class="panel tight"><b>Playoff picture</b> · Week ${wk}<div class="muted">Eight clubs make it: two division winners and two wild cards per conference. ${wk < 5 ? 'Early days, standings will move.' : F.playoffPicture(f).text}</div></div>${conf('Aurora')}${conf('Titan')}<p class="dim">Div = division leader · WC = wild card · GB = games back of the last spot.</p>`;
      }
      const rounds = [[1, 'Conference semifinals · Week 11'], [2, 'Conference championships · Week 12'], [3, 'Beast Bowl · Week 13']];
      const game = (g) => { const w = g.result ? (g.result.winner || (g.result.homeScore > g.result.awayScore ? g.home : g.away)) : null; const side = (t, score) => `<div class="po-row ${t === f.club ? 'me' : ''} ${w && w !== t ? 'lost' : ''}">${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ' <span class="chip accent">YOU</span>' : ''}</span><span class="mono po-rec">${score ?? ''}</span></div>`;
        return `<div class="panel tight po-game"><div class="dim" style="font-size:12px">${esc(g.tag)}${g.result ? '' : ' · upcoming'}</div>${side(g.away, g.result?.awayScore)}${side(g.home, g.result?.homeScore)}</div>`; };
      return `${bracketHtml(f, p)}<h3>Games</h3>${rounds.map(([r, label]) => { const gs = p.fixtures.filter((g) => g.round === r); return gs.length ? `<h3>${label}</h3>${gs.map(game).join('')}` : ''; }).join('')}
        <h3>Seeds</h3>${['Aurora', 'Titan'].map((c) => `<div class="panel tight po-conf"><div class="po-head"><b>${c}</b></div>${p.seeds[c].map((t, i) => teamRow(t, i + 1)).join('')}</div>`).join('')}`;
    },
  });
  // ---------------------------------------------------------------- League stats
  let leaderCat = 'passYds', leaderBucket = 'reg', leaderScope = 'league';
  const MIN_LABEL = (k) => ({ att: 'attempts', rush: 'carries', covTargets: 'targets in coverage', pbSnaps: 'pass-blocking snaps', fga: 'field-goal attempts' })[k] || k;
  Router.registerScreen('leaders', {
    title: 'League leaders',
    render({ f }) {
      const table = leaderBucket === 'post' ? f.season.playoffStats : f.season.leagueStats;
      const cat = LEADER_CATEGORIES.find((c) => c.id === leaderCat) || LEADER_CATEGORIES[0];
      const myConf = conferenceFor(f.club), myDiv = divisionOf(f.club);
      const teams = leaderScope === 'conference' ? Object.values(DIVISIONS).flat().filter((t) => conferenceFor(t) === myConf) : leaderScope === 'division' ? DIVISIONS[myDiv] : null;
      const rows = leaders(table, cat.id, { n: 15, teams });
      return `<div class="seg" style="margin-bottom:6px"><button class="btn small ${leaderBucket === 'reg' ? 'primary' : ''}" data-action="bucket" data-v="reg">Regular season</button><button class="btn small ${leaderBucket === 'post' ? 'primary' : ''}" data-action="bucket" data-v="post">Playoffs</button></div>
        <div class="seg" style="margin-bottom:6px"><button class="btn small ${leaderScope === 'league' ? 'primary' : ''}" data-action="scope" data-v="league">Whole league</button><button class="btn small ${leaderScope === 'conference' ? 'primary' : ''}" data-action="scope" data-v="conference">${esc(myConf)}</button><button class="btn small ${leaderScope === 'division' ? 'primary' : ''}" data-action="scope" data-v="division">${esc(myDiv)}</button></div>
        <select class="input" data-action="cat" style="margin-bottom:8px">${LEADER_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === cat.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
        ${cat.min ? `<p class="dim" style="margin-top:0">Minimum ${cat.min[1]} ${esc(MIN_LABEL(cat.min[0]))}.</p>` : ''}
        <div class="list">${rows.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}">${monsterSprite(r, 32)}<div class="grow"><div class="name">${i + 1}. ${esc(r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)}</span></div><div class="sub">${esc(statLine(r))}</div></div><span class="chip accent">${r[cat.key]}</span></div>`).join('') || `<p class="dim">${leaderBucket === 'post' ? 'No playoff games yet.' : 'No games yet.'}</p>`}</div>`;
    },
    mount(root) {
      delegate(root, { bucket: (el) => { leaderBucket = el.dataset.v; Router.render(); }, scope: (el) => { leaderScope = el.dataset.v; Router.render(); } });
      root.querySelector('[data-action="cat"]')?.addEventListener('change', (e) => { leaderCat = e.target.value; Router.render(); });
    },
  });
  let recordsTab = 'game';
  Router.registerScreen('records', {
    title: 'Records book',
    render({ f }) {
      const R = ensureRecords(f); const tab = recordsTab;
      const tabs = [['game', 'Single game'], ['season', 'Season'], ['career', 'Your careers'], ['team', 'Team']];
      let body = '';
      const row = (label, r, sub) => `<div class="item static ${r?.team === f.club ? 'mine' : ''}">${r?.species ? monsterSprite(r, 30) : ''}<div class="grow"><div class="name">${esc(label)}</div><div class="sub">${r ? `<b>${esc(r.name || r.team)}</b>${r.position ? ` (${esc(r.position)})` : ''} · ${esc(sub(r))}` : 'no record yet'}</div></div><span class="chip accent">${r ? r.value : '·'}</span></div>`;
      if (tab === 'game') body = RECORD_CATEGORIES.map((c) => row(c.label, R.game[c.id], (r) => `${r.team} vs ${r.opp} · ${yearOf(r.year)} wk ${r.week}${r.playoff ? ' (playoffs)' : ''}`)).join('');
      else if (tab === 'season') body = RECORD_CATEGORIES.map((c) => row(c.label, R.season[c.id], (r) => `${r.team} · ${yearOf(r.year)}`)).join('') + '<p class="dim">Season records are written when a season ends.</p>';
      else if (tab === 'career') { const L = careerLeaders(f.roster); body = RECORD_CATEGORIES.map((c) => row(c.label, L[c.id]?.[0], () => 'regular season, current roster')).join('') + '<p class="dim">League-wide careers need persistent AI rosters (later); these are your monsters.</p>'; }
      else body = TEAM_RECORDS.map((c) => row(c.label, R.team[c.id], (r) => `${r.score} vs ${r.opp} · ${yearOf(r.year)} wk ${r.week}${r.playoff ? ' (playoffs)' : ''}`)).join('');
      return `<div class="seg" style="margin-bottom:8px">${tabs.map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" data-action="rtab" data-v="${k}">${l}</button>`).join('')}</div><div class="list">${body}</div>`;
    },
    mount(root) { delegate(root, { rtab: (el) => { recordsTab = el.dataset.v; Router.render(); } }); },
  });
  Router.registerScreen('awardhistory', {
    title: 'Award history',
    render({ f }) {
      const seasons = [...f.history.filter((h) => h.awards?.league).map((h) => ({ year: h.year, league: h.awards.league })), ...(f.season.awardsFinal && !f.season.finished ? [{ year: f.season.year, league: f.season.awardsFinal.winners, live: true }] : [])].sort((a, b) => b.year - a.year);
      if (!seasons.length) return '<p class="dim">Award winners are named when the regular season ends. Past seasons collect here.</p>';
      return seasons.map((s) => `<h3>${yearOf(s.year)}${s.live ? ' <span class="chip">this season</span>' : ''}</h3><div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const w = s.league[k]; if (!w) return ''; return `<div class="item static ${w.team === f.club ? 'mine' : ''}">${k === 'coy' ? '' : monsterSprite(w, 32)}<div class="grow"><div class="name">${esc(a.short)} · ${esc(k === 'coy' ? w.coach : w.name)}</div><div class="sub">${esc(w.team)}${w.record ? ' · ' + w.record : ''}${w.why ? ' · ' + esc(w.why) : ''}</div></div></div>`; }).join('')}</div>`).join('');
    },
  });
  Router.registerScreen('history', {
    title: 'Franchise History',
    render({ f }) {
      return `<div class="panel"><div class="kv"><b>Owner</b><span>${esc(f.owner.first)} ${esc(f.owner.last)}${f.owner.hometown ? ' · ' + esc(f.owner.hometown) : ''}</span><b>Titles</b><span>Challenger ${f.badges.challenger} · Vanguard ${f.badges.vanguard} · Sovereign ${f.badges.sovereign}</span></div></div>
        ${f.history.length ? `<div class="list">${f.history.slice().reverse().map((h) => `<div class="item static"><div class="grow"><div class="name">${yearOf(h.year)} · ${esc(h.club)}</div><div class="sub">${h.record.w}-${h.record.l}${h.place ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'} overall` : ''}${h.playoffs ? ' · playoffs' : ''}${h.champion === h.club ? ' · 🏆 CHAMPIONS' : h.champion ? ` · champion: ${esc(h.champion)}` : ''}${h.legacy ? ' · imported' : ''}</div>${h.awards ? `<div class="sub">${h.awards.mvp ? `MVP ${esc(h.awards.mvp.name)}` : ''}${h.awards.rivalry ? ` · ⚔️ ${h.awards.rivalry.swept ? 'swept' : h.awards.rivalry.wins + '-' + (h.awards.rivalry.games - h.awards.rivalry.wins) + ' vs'} ${esc(h.awards.rivalry.team)}` : ''}</div>` : ''}</div>${h.awards ? `<button class="btn small" data-action="awards" data-year="${h.year}">Awards</button>` : ''}</div>`).join('')}</div>` : '<p class="muted">No completed seasons yet.</p>'}`;
    },
    mount(root) { delegate(root, { awards: (el) => { const h = app.f.history.find((x) => x.year === Number(el.dataset.year)); if (h?.awards) sheet(awardsHtml(h.awards), { title: `${yearOf(h.year)} awards` }); } }); },
  });
}

export function playDetailHtml(id, f = null, { practiceButton = true } = {}) {
  const p = PLAYS[id]; if (!p) return '<p>Unknown play.</p>';
  const usage = f ? (() => { const s = F.playStat(f, id), c = F.playStat(f, id, { career: true }); const what = p.side === 'offense' ? 'gained' : 'allowed'; return `<div class="panel tight"><b>Your results</b><div class="kv"><b>This season</b><span>${s.used ? `${s.used} call${s.used === 1 ? '' : 's'} · ${s.avg.toFixed(1)} yd ${what} · ${s.big} of 15+${s.turnovers ? ` · ${s.turnovers} turnover${s.turnovers === 1 ? '' : 's'}` : ''}` : 'not called yet'}</span><b>Career</b><span>${c.used ? `${c.used} calls · ${c.avg.toFixed(1)} yd ${what}` : '·'}</span></div></div>`; })() : '';
  const rows = p.onField.map((slot) => { const a = p.assignments[slot]; const what = a.a === 'route' ? `Route: ${ROUTE_LABELS[a.r] || a.r}` : a.a === 'zone' ? `Zone: ${a.zone.replace(/_/g, ' ')}` : a.a === 'man' ? `Man: ${a.key === 'wideL' ? 'widest left receiver' : a.key === 'wideR' ? 'widest right receiver' : 'inside receiver'}` : a.a === 'rush' || a.a === 'contain' ? `${a.a === 'rush' ? 'Rush' : 'Contain'}: ${a.gap.replace('_', ' ')} gap` : a.a === 'block' ? (p.type === 'run' ? 'Run block' : 'Pass protection') : a.a.replace(/_/g, ' '); return `<tr><td class="mono"><b>${slot}</b>${slot === p.primary ? ' ★' : ''}</td><td>${esc(what)}</td></tr>`; }).join('');
  return `<div class="play-preview">${playCardSvg(id, { width: 54, depthUp: 26, depthBack: 9 })}</div>${legendHtml(p.side)}${usage}
    <div class="panel"><div class="kv"><b>Type</b><span>${p.side === 'offense' ? (p.type === 'run' ? 'Run' : 'Pass') : 'Defense'}</span><b>Personnel</b><span>${esc(p.pkg)}${p.side === 'offense' ? ` · ${esc(p.formation.replace(/_/g, ' '))}` : ''}</span>${p.primary ? `<b>Primary read</b><span>${p.primary} (★)</span>` : ''}${p.progression?.length ? `<b>Progression</b><span>${p.progression.join(' → ')}</span>` : ''}<b>Best for</b><span>${p.tags.map((t) => t.replace(/_/g, ' ')).join(', ')}</span></div>${p.desc ? `<p style="margin-top:8px">${esc(p.desc)}</p>` : ''}</div>${lessonHtml(id)}
    <table><thead><tr><th>Player</th><th>Assignment</th></tr></thead><tbody>${rows}</tbody></table>
    ${practiceButton ? `<div style="margin-top:12px"><button class="btn block" data-action="practice" data-id="${id}">Run it in practice</button></div>` : ''}`;
}

/** News line with the rival club's name in bold. */
function newsText(f, text) {
  const rival = f.rivals?.[f.tier]?.team; const safe = esc(text);
  return rival ? safe.split(esc(rival)).join(`<b class="rival-name">${esc(rival)}</b>`) : safe;
}
export function lessonHtml(id) {
  const L = LESSONS[id]; if (!L) return '';
  return `<div class="panel lesson"><h3 style="margin-top:0">📖 Lesson</h3><div class="kv"><b>When</b><span>${esc(L.when)}</span><b>Watch</b><span>${esc(L.watch)}</span><b>Beats</b><span>${esc(L.beats)}</span><b>Loses to</b><span>${esc(L.loses)}</span></div></div>`;
}

function raceLine(r) { const b = []; if (r.passYds) b.push(`${r.passYds} pass`); if (r.passTd) b.push(`${r.passTd} TD`); if (r.rushYds) b.push(`${r.rushYds} rush`); if (r.recYds) b.push(`${r.recYds} rec`); if (r.td) b.push(`${r.td} TD`); if (r.tackles) b.push(`${r.tackles} tkl`); if (r.sacks) b.push(`${r.sacks} sk`); if (r.int) b.push(`${r.int} INT`); return b.slice(0, 2).join(' · '); }
export function awardsHtml(a) {
  if (!a) return '<p>No awards yet.</p>';
  const line = (label, x) => x ? `<div class="item static"><div class="grow"><div class="name">${esc(label)}</div><div class="sub">${esc(x.name)} (${esc(x.position)})${x.value != null ? ` · ${x.value} ${esc(x.label)}` : ''}</div></div></div>` : '';
  return `<div class="panel center"><div style="font-size:12px" class="muted">${yearOf(a.year)} SEASON</div><div style="font-size:20px;font-weight:900">${a.record.w}-${a.record.l}${a.record.t ? '-' + a.record.t : ''} · ${a.place}${['st', 'nd', 'rd'][a.place - 1] || 'th'} overall</div><div class="muted">${a.champion === undefined ? '' : a.playoffs ? 'Made the playoffs' : 'Missed the playoffs'}${a.champion ? ` · Beast Bowl: ${esc(a.champion)}` : ''}</div></div>
    ${a.rivalry ? `<div class="panel tight" style="border-color:#a855f7">⚔️ Rivalry vs ${esc(a.rivalry.team)}: <b>${a.rivalry.swept ? 'SWEPT. GM ' + esc(a.rivalry.gm) + ' is not happy' : a.rivalry.games ? a.rivalry.wins + '-' + (a.rivalry.games - a.rivalry.wins) : 'not played'}</b></div>` : ''}
    ${a.league ? `<h3>League awards</h3><div class="list">${Object.entries(F.AWARDS).map(([k, aw]) => { const w = a.league[k]; if (!w) return ''; return `<div class="item static" style="${w.team === a.club ? 'border-color:var(--accent)' : ''}"><div class="grow"><div class="name">🏅 ${esc(aw.label)}</div><div class="sub">${k === 'coy' ? `${esc(w.coach)} · ${esc(w.team)} (${w.w}-${w.l})` : `${esc(w.name)} (${esc(w.position)}, ${esc(w.team)}) · ${esc(w.why || raceLine(w))}`}</div></div></div>`; }).join('')}</div>` : ''}
    <h3>Club awards</h3><div class="list">${a.mvp ? `<div class="item static" style="border-color:var(--accent)"><div class="grow"><div class="name">★ Team MVP</div><div class="sub">${esc(a.mvp.name)} (${esc(a.mvp.position)})</div></div></div>` : ''}${line('Rushing leader', a.rusher)}${line('Receiving leader', a.receiver)}${line('Passing leader', a.passer)}${line('Tackling leader', a.tackler)}${line('Sack leader', a.rusherD)}${line('Ball hawk', a.ballhawk)}</div>`;
}

/** Campaign panel on HQ: the eight gym badges and the Hall of Fame checklist (GDD §15.4, §15.9). */
function campaignPanel(f) {
  const hof = F.hallOfFameProgress(f);
  const LABEL = { badges: 'Gym badges', titles: 'Beast Bowl titles', wins: 'Career wins', awards: 'League awards' };
  const badges = GYMS.map((g) => { const b = F.badgeOf(f, g.club); const hue = TYPES[g.element]?.hue ?? 120; return `<button class="badge ${b ? 'won' : ''}" data-action="gym" data-club="${esc(g.club)}" style="--hue:${hue}" aria-label="${esc(g.badge)}${b ? ', earned' : ', not yet earned'}"><span class="badge-ico">${b ? '★' : '·'}</span><span class="badge-nm">${esc(g.element)}</span></button>`; }).join('');
  return `<div class="panel"><div class="row between"><b>Campaign</b><span class="dim">${hof.eligible ? '🏛️ Hall of Fame eligible' : `${hof.rows.filter((r) => r.done).length} / ${hof.rows.length} on track`}</span></div>
    ${hof.eligible ? `<button class="btn block" data-action="retire" style="margin:8px 0">🏛️ Retire to the Hall of Fame</button>` : ''}
    <div class="badge-row">${badges}</div>
    <div class="hof">${hof.rows.map((r) => `<div class="row between ${r.done ? 'done' : ''}"><span>${r.done ? '✓' : '○'} ${LABEL[r.key]}</span><span class="mono">${r.have} / ${r.goal}</span></div>`).join('')}</div>
    <div class="row between" style="margin-top:8px"><span class="muted">Legend Tracks: ${Object.entries(f.campaign?.tracks || {}).map(([id, n]) => `${esc(SPECIES_BY_ID[id]?.name || id)} ${n}/3`).join(' · ') || 'none yet'}</span><button class="btn small" data-action="legend">🌟 Tracks</button></div></div>`;
}

/** One award race in full: the finalists with record, the stat line that drives it, the explanation and the rule (GDD §16.4). */
function awardRaceHtml(f, k) {
  const top = F.awardRaces(f, { n: 5 })[k] || [];
  const minGames = top[0]?.minGames; const frozen = !!f.season.awardsFinal;
  const head = `<p class="muted">${esc(AWARD_RULES[k])}${minGames ? ` Needs ${minGames}+ games and a starter’s share of snaps.` : ''}</p>${frozen ? '<p class="dim">Regular season over: this result is final. Playoff games do not count.</p>' : ''}`;
  if (k === 'coy') return `${head}<div class="list">${top.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}" style="align-items:flex-start"><div class="grow"><div class="name">${i + 1}. ${esc(r.coach)} <span class="dim">${esc(r.team)} · ${r.record}</span></div><div class="sub">${esc(r.why)}</div></div><span class="chip">${r.score}</span></div>`).join('') || '<p class="dim">No contenders yet.</p>'}</div><p class="dim">Points are game-generated evaluation points, not votes.</p>`;
  return `${head}<div class="list">${top.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}" style="align-items:flex-start">${monsterSprite(r, 36)}<div class="grow"><div class="name">${i + 1}. ${esc(r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)} ${r.record}${r.rookie ? ' · rookie' : ''}</span></div><div class="sub">${r.games} game${r.games === 1 ? '' : 's'} · ${esc(r.why)}</div></div><span class="chip">${r.score}</span></div>`).join('') || '<p class="dim">No contenders yet.</p>'}</div><p class="dim">Points are game-generated evaluation points, not votes.</p>`;
}

/** Board panel on HQ: the season's goal, its progress and the owner's standing (GDD §17.4). */
function boardPanel(f) {
  const b = f.board; if (!b) return '';
  const g = b.goal; const p = g ? F.goalProgress(f) : null; const hot = F.onHotSeat(f);
  return `<div class="panel tight ${hot ? 'hotseat' : ''}"><div class="row between"><b>🎯 ${g ? esc(g.label) : 'No goal set'}</b><span class="chip ${hot ? 'bad' : b.confidence > 0 ? 'good' : ''}">${F.confidenceLabel(b.confidence)}</span></div>
    ${p ? `<div class="bar" style="margin:6px 0 2px"><i style="width:${Math.round(p.pct * 100)}%"></i></div><div class="dim">${esc(p.text)}${hot ? ' · miss this and the board lets you go' : ''}</div>` : hot ? '<div class="dim" style="color:var(--bad)">On the hot seat: the next missed goal ends your time here.</div>' : ''}</div>`;
}

/** Regular season over: record, standing, club leaders, badges, the goal, the league awards and the playoff announcement (GDD §17.5). */
function seasonRecapHtml(f) {
  const rec = F.record(f); const st = F.leagueStandings(f); const place = st.overall.indexOf(f.club) + 1;
  const seeds = f.season.playoffs?.seeds || {}; const conf = Object.entries(seeds).find(([, s]) => s.includes(f.club)); const seed = conf ? conf[1].indexOf(f.club) + 1 : null;
  const po = F.playoffFixture(f); const opp = po ? (po.home === f.club ? po.away : po.home) : null;
  const T = f.season.leagueStats?.[f.club] || {}; const rows = Object.values(T);
  const lead = (key, label, fmt = (v) => v) => { const r = rows.filter((x) => (x[key] || 0) > 0).sort((a, b) => b[key] - a[key])[0]; return r ? `<div class="item static">${monsterSprite(r, 28)}<div class="grow"><div class="name">${esc(r.name)} <span class="dim">${esc(r.position)}</span></div><div class="sub">${esc(label)}: <b>${fmt(r[key])}</b></div></div></div>` : ''; };
  const badges = Object.entries(f.campaign?.badges || {}).filter(([, b]) => b.year === f.season.year).map(([club]) => GYM_BY_CLUB[club]?.badge).filter(Boolean);
  const goal = f.board?.goal; const prog = goal ? F.goalProgress(f) : null;
  const winners = f.season.awardsFinal?.winners || {};
  const mine = Object.entries(winners).filter(([, w]) => w && w.team === f.club);
  const announce = seed ? `<div class="panel center" style="border-color:#f5c542;background:linear-gradient(135deg,#4a3a0a,#2a2008)"><div style="font-size:12px" class="muted">PLAYOFF BOUND</div><div style="font-size:20px;font-weight:900">${esc(conf[0])} #${seed} seed</div><div class="muted">${opp ? `${F.ROUND_NAMES[1]}: ${po.home === f.club ? 'vs' : '@'} ${esc(opp)}` : ''}</div></div>`
    : `<div class="panel center"><div style="font-size:12px" class="muted">SEASON OVER</div><div style="font-size:18px;font-weight:900">Missed the playoffs</div><div class="muted">${esc(F.playoffPicture(f).text || '')}. You can watch the bracket play out or skip to the offseason.</div></div>`;
  return `<div class="panel center"><div style="font-size:12px" class="muted">${yearOf(f.season.year)} REGULAR SEASON</div><div style="font-size:24px;font-weight:900">${rec.w}-${rec.l}${rec.t ? '-' + rec.t : ''}</div><div class="muted">${place}${['st', 'nd', 'rd'][place - 1] || 'th'} of 16 · ${rec.pf || 0} points scored · ${rec.pa || 0} allowed</div></div>
    ${announce}
    <h3>Season leaders · ${esc(f.club)}</h3><div class="list">${lead('passYds', 'Passing yards')}${lead('rushYds', 'Rushing yards')}${lead('recYds', 'Receiving yards')}${lead('tackles', 'Solo tackles')}${lead('sacks', 'Sacks')}${lead('int', 'Interceptions')}</div>
    <h3>Campaign</h3><div class="panel tight">${badges.length ? `🏅 Badges this season: <b>${badges.map(esc).join(', ')}</b>` : 'No badges this season.'}${goal ? `<div style="margin-top:4px">🎯 ${esc(goal.label)}: <b>${esc(prog?.text || '')}</b> <span class="dim">(settled after the playoffs)</span></div>` : ''}</div>
    ${Object.keys(winners).length ? `<h3>League awards</h3>${mine.length ? `<p class="muted">🏅 ${mine.map(([k, w]) => `<b>${esc(w.name)}</b> is the ${esc(F.AWARDS[k].short)}`).join(' · ')}!</p>` : ''}<div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const w = winners[k]; if (!w) return ''; return `<div class="item static ${w.team === f.club ? 'mine' : ''}"><div class="grow"><div class="name">${esc(a.short)} · ${esc(k === 'coy' ? w.coach : w.name)}</div><div class="sub">${esc(w.team)}${w.record ? ' · ' + w.record : ''}</div></div></div>`; }).join('')}</div>` : ''}`;
}
/** One playoff round's results, for the owner watching from the stands. */
function roundResultsHtml(f, r) {
  return `<div class="list">${r.results.map((g) => `<div class="item static"><div class="grow"><div class="name">${esc(g.away)} ${g.awayScore} @ ${esc(g.home)} ${g.homeScore}${g.clash ? ` (OT · ${g.clash.size}v${g.clash.size} Clash)` : g.ot ? ' (OT)' : ''}</div><div class="sub">${esc(g.winner)} advance${g.winner === f.club ? '' : ''}</div></div></div>`).join('')}</div>
    ${r.champion ? `<div class="panel center" style="margin-top:8px"><div style="font-size:12px" class="muted">BEAST BOWL CHAMPIONS</div><div style="font-size:20px;font-weight:900">${esc(r.champion)}</div></div>` : `<p class="dim">Next: ${F.ROUND_NAMES[f.season.playoffs?.round] || ''}.</p>`}`;
}
/** Season done: how it ended, the board's verdict, campaign progress and the awards book (GDD §17.5). */
function seasonFinalHtml(f) {
  const a = f.season.awards; const rec = F.record(f); const p = f.season.playoffs;
  const myGames = (p?.results || []).filter((g) => g.home === f.club || g.away === f.club);
  const lost = myGames.find((g) => g.winner !== f.club); const won = myGames.filter((g) => g.winner === f.club).length;
  const how = f.season.champion === f.club ? '🏆 BEAST BOWL CHAMPIONS' : lost ? `Eliminated in the ${F.ROUND_NAMES[lost.round] || 'playoffs'} by ${lost.winner}` : 'Missed the playoffs';
  const v = f.season.boardVerdict;
  const hof = F.hallOfFameProgress(f);
  return `<div class="panel center"><div style="font-size:12px" class="muted">${yearOf(f.season.year)} · FINAL</div><div style="font-size:20px;font-weight:900">${esc(how)}</div><div class="muted">${rec.w}-${rec.l} regular season${myGames.length ? ` · ${won}-${myGames.length - won} in the playoffs` : ''} · ${a?.place || '?'}${['st', 'nd', 'rd'][(a?.place || 0) - 1] || 'th'} overall${f.season.champion && f.season.champion !== f.club ? ` · ${esc(f.season.champion)} won the Beast Bowl` : ''}</div></div>
    ${v ? `<div class="panel tight ${v.met ? '' : 'hotseat'}"><b>🎯 Board: ${esc(v.goal.label)} · ${v.met ? 'MET' : 'MISSED'}</b><div class="dim">Confidence ${v.confidence >= 0 ? '+' : ''}${v.confidence} · ${F.confidenceLabel(v.confidence)}${v.met ? ' · expanded scouting next season' : v.status === 'fired' ? ' · the board has let you go' : v.status === 'hot_seat' ? ' · one more miss and you are out' : ''}</div></div>` : ''}
    <div class="panel tight"><b>Hall of Fame progress</b><div class="dim">${hof.rows.map((r) => `${r.done ? '✓' : '○'} ${r.key}: ${r.have}/${r.goal}`).join(' · ')}</div></div>
    ${a ? awardsHtml(a) : ''}`;
}

/** Rival card on HQ, every week: standings gap, head-to-head, next meeting and the GM's weekly needle (GDD §17.7). */
function rivalCard(f) {
  const rv = f.rivals?.[f.tier]; if (!rv || f.season.finished) return '';
  const mine = f.season.records[f.club] || { w: 0, l: 0 }, theirs = f.season.records[rv.team] || { w: 0, l: 0 };
  const next = f.season.schedule.find((g) => g.opponent === rv.team && !g.result && !g.bye);
  const thisWeek = next && next.week === f.season.week;
  const gb = ((theirs.w - mine.w) + (mine.l - theirs.l)) / 2;
  const state = thisWeek ? 'gameWeek' : gb < 0 ? 'ahead' : gb > 0 ? 'behind' : 'level';
  const pool = RIVAL_WEEKLY[state]; const line = pool[(f.season.week + f.season.year * 3) % pool.length];
  const played = f.season.schedule.filter((g) => g.opponent === rv.team && g.result);
  const seasonH2h = played.length ? ` · this season ${played.filter((g) => g.result.won).length}-${played.filter((g) => !g.result.won).length}` : '';
  return `<div class="panel tight rival-card ${thisWeek ? 'hot' : ''}"><div class="row" style="gap:10px;align-items:flex-start">${portraitSprite(`gm|${rv.team}`, 40, { hue: 280 })}<div class="grow"><div class="row between"><b>⚔️ ${esc(rv.team)}</b><span class="chip ${gb < 0 ? 'good' : gb > 0 ? 'bad' : ''}">${gb === 0 ? 'level' : gb < 0 ? `you lead by ${Math.abs(gb)}` : `${gb} back`}</span></div>
    <div class="dim">GM ${esc(rv.gm)} · they are ${theirs.w}-${theirs.l}, you are ${mine.w}-${mine.l} · all-time ${rv.headToHead.w}-${rv.headToHead.l}${seasonH2h}${next ? ` · ${thisWeek ? '<b>GAME THIS SUNDAY</b>' : `next meeting week ${next.week}`}` : ' · no more meetings this season'}</div>
    <p class="talk-line" style="margin:4px 0 0">“${esc(line)}”</p></div></div></div>`;
}
