// Franchise Headquarters and the weekly action screens, plus playbook
// browsing and the league screens.

import { esc, delegate, toast, sheet, fmtMoney, confirmSheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { REGIONS, TRAINING_FOCI, ROLE_LABEL, trainingBonus } from '../../data/staff.js';
import { PLAYS, LESSONS, counterPlays } from '../../data/playbook.js';
import { TEMPERAMENTS, temperamentOf } from '../../data/media.js';
import { tierById, TEAM_META, DIVISIONS, conferenceFor, divisionOf } from '../../data/league.js';
import { monsterOverall, NATURES, TYPES, effectiveAttributes, HEADLINE, headlineAttributes } from '../../data/monsters.js';
import { headlineHtml } from './roster.js';
import { ATTRIBUTES, OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { GYMS, GYM_BY_CLUB } from '../../data/gyms.js';
import { SPECIES_BY_ID } from '../../data/monsters.js';
import { sprite16 } from '../sprite16.js';
import { playCardSvg, legendHtml } from '../play-art.js';
import { teamOverall, buildDepthChart } from '../../franchise/roster.js';

const STARTERS_BY_POS = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 2, DL: 2, LB: 2, CB: 2, S: 1, K: 1 };

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };

export function weekStrip(f) {
  return `<div class="week" aria-label="Week ${f.season.week}">${F.DAYS.map((d, i) => `<div class="day ${i < f.season.day ? 'done' : i === f.season.day ? 'today' : ''}" title="${esc(F.DAY_ACTIONS[i])}">${d.slice(0, 3)}</div>`).join('')}</div>`;
}

export function registerHqScreens(Router, app) {
  const need = () => app.f;

  Router.registerScreen('hq', {
    title: ({ f }) => f ? f.club : 'Headquarters', back: false,
    render({ f }) {
      if (!f) return '<p>No franchise.</p>';
      if (F.nextStaffRole(f)) return `<div class="panel"><p>Your front office is not complete.</p><button class="btn primary block" data-action="go" data-screen="hire">Hire staff</button></div>`;
      const s = F.summary(f); const cap = s.cap; const tier = tierById(f.tier);
      const fx = F.currentFixture(f); const po = F.playoffFixture(f);
      const opp = F.opponentName(f);
      const rival = f.rivals[f.tier];
      const day = f.season.day;
      const next = f.season.finished ? { label: 'Start next season', action: 'nextseason', icon: '🔁' } : nextAction(f);
      const race = f.season.week >= 5 && !f.season.finished && !F.inPlayoffs(f) ? `<div class="muted" style="margin-top:4px">Playoff race: <b>${esc(F.playoffPicture(f).text)}</b></div>` : '';
      const gameLine = f.season.finished ? `<b>Season ${f.season.year} complete.</b> ${f.season.champion === f.club ? '🏆 Beast Bowl champions!' : f.season.champion ? esc(f.season.champion) + ' won the Beast Bowl.' : ''} <button class="btn small" data-action="awards">Season awards</button>`
        : po ? `<b>${esc(po.tag)}</b> · ${po.home === f.club ? 'vs' : '@'} ${esc(opp)}`
        : fx?.bye ? '<b>Bye week</b> — rest and recover.' : fx ? `<b>Week ${fx.week}</b> · ${fx.home ? 'vs' : '@'} ${esc(opp)} · ${esc(fx.category)}${rival?.team === opp ? ' · ⚔️ RIVAL' : ''}` : '';
      return `
        <div class="panel tight"><div class="row between"><div><b>Season ${s.year}</b> · Week ${f.season.week}${rival ? ` · ⚔️ ${esc(rival.team)}` : ''}</div><div class="chip accent">Team OVR ${s.overall}</div></div>
          <div class="row between" style="margin-top:4px"><span>Record <b class="mono">${s.record}</b></span><span class="muted">Cap room <b style="color:${cap.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(cap.remaining)}</b></span></div>${race}</div>
        ${weekStrip(f)}
        <div class="panel"><div class="muted" style="font-size:12px">THIS WEEK</div><div style="margin:4px 0 8px">${gameLine}${(() => { const g = opp && GYM_BY_CLUB[opp]; if (!g || f.season.finished) return ''; const b = F.badgeOf(f, opp); return `<div class="muted" style="margin-top:4px">${b ? `🏅 You hold the ${esc(g.badge)} (S${b.year})` : `<b>Badge game</b> · beat ${esc(g.coach.name)}'s ${esc(opp)} for the ${esc(g.badge)}`}</div>`; })()}</div>
          ${next ? `<button class="btn primary big block" data-action="${next.action}">${next.icon} ${esc(next.label)}</button>` : ''}
          ${!f.season.finished && day < 6 && !cap.over ? `<button class="btn block" data-action="autorun" style="margin-top:8px">⏩ Let the staff run the week → Sunday</button>` : ''}
          ${cap.over ? `<p class="muted" style="color:var(--bad);margin-top:8px">Over the cap by ${fmtMoney(-cap.remaining)} — games are locked until you release a monster.</p>` : ''}</div>
        ${campaignPanel(f)}
        ${f.week.gameResult && !f.week.gameResult.bye && day === 0 ? '' : ''}
        <div class="grid2">
          <button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button>
          <button class="btn block" data-action="go" data-screen="staff">👥 Coaching staff</button><button class="btn block" data-action="go" data-screen="practice">🎯 Practice</button></div>
        <h3>News</h3><ul class="news" style="padding-left:18px;margin:0">${f.news.slice(0, 8).map((n) => `<li class="${esc(n.kind)}">${newsText(f, n.text)}</li>`).join('') || '<li class="dim">Nothing yet.</li>'}</ul>`;
    },
    mount(root) {
      const f0 = app.f;
      if (f0?.season.finished && f0.season.awards && !f0.season.awardsShown) { f0.season.awardsShown = true; app.save(); sheet(awardsHtml(f0.season.awards), { title: `Season ${f0.season.year} awards` }); }
      delegate(root, {
        go: (el) => Router.go(el.dataset.screen),
        scout: () => Router.go('scout'), recruit: () => Router.go('recruit'), training: () => Router.go('training'), scoutopp: () => Router.go('scoutopp'), gameplan: () => Router.go('gameplan'), lineup: () => Router.go('lineup'),
        bye: () => { F.takeBye(app.f); app.save(); toast('Bye week taken. Fatigue recovered.'); Router.render(); },
        game: () => { if (!F.canPlayGames(app.f)) { toast('Over the salary cap — release a monster first.', 'bad'); return; } Router.go('pregame'); },
        resume: () => Router.go('match'),
        autorun: async () => { if (!(await confirmSheet('Your staff will scout, recruit (only a clear upgrade), train, scout the opponent, keep the game plan and handle the press. You can still open the depth chart before kickoff.', { title: 'Run the week', okLabel: 'Run it' }))) return; const r = F.autoRunToSunday(app.f); app.save(); sheet(`<ul style="padding-left:18px">${r.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`, { title: 'Week handled', onClose: () => Router.go('hq', {}, { reset: true }) }); },
        awards: () => sheet(awardsHtml(app.f.season.awards || F.seasonAwards(app.f)), { title: `Season ${app.f.season.year} awards` }),
        gym: (el) => { const g = GYM_BY_CLUB[el.dataset.club]; if (!g) return; const b = F.badgeOf(app.f, g.club); const sp = SPECIES_BY_ID[g.legendary]; sheet(`<div class="row">${portraitSprite(g.coach.portrait, 56, { hue: TYPES[g.element]?.hue })}<div><b>${esc(g.coach.name)}</b><div class="muted">Head coach, ${esc(g.club)} · ${esc(g.coach.style)}</div><div class="muted">${esc(g.element)} gym · ${g.tier} tier</div></div></div><p>${b ? `<b>${esc(g.badge)}</b> earned in Season ${b.year}, week ${b.week} (${esc(b.score)}).` : `Beat ${esc(g.club)} in any game that counts to earn the <b>${esc(g.badge)}</b>. No replays: if you lose, the next chance is their next game on your schedule.`}</p><h3>Signature monster</h3><div class="row">${sprite16(sp, 48)}<div><b>${esc(sp.name)}</b><div class="muted">${esc(sp.element)} legendary · ${sp.position}</div><div class="muted">${esc(sp.ability.name)}: ${esc(sp.ability.text)}</div></div></div><p class="dim">Gym clubs grow stronger every season, and study tape after you beat them.</p>`, { title: g.badge }); },
        nextseason: async () => { if (await confirmSheet(`Start season ${app.f.season.year + 1}? Your roster ages one year and the record resets.`, { title: 'New season', okLabel: 'Start' })) { F.startNextSeason(app.f); app.save(); Router.render(); } },
      });
    },
  });
  function nextAction(f) {
    const d = f.season.day;
    if (f.game && !f.game.state?.finished) return { label: 'Resume game', action: 'resume', icon: '▶' };
    if (d === 6) return F.isBye(f) ? { label: 'Take the bye week', action: 'bye', icon: '😴' } : { label: 'Play Sunday game', action: 'game', icon: '🏈' };
    return [{ label: 'Monday · Scout a region', action: 'scout', icon: '🧭' }, { label: 'Tuesday · Recruit', action: 'recruit', icon: '🤝' }, { label: 'Wednesday · Training focus', action: 'training', icon: '💪' }, { label: 'Thursday · Scout opponent', action: 'scoutopp', icon: '🔍' }, { label: 'Friday · Set game plan', action: 'gameplan', icon: '📋' }, { label: 'Saturday · Media day', action: 'lineup', icon: '🎤' }][d];
  }

  // ---------------------------------------------------------------- Monday
  Router.registerScreen('scout', {
    title: 'Monday · Scouting',
    render({ f }) {
      const scout = F.staffMember(f, 'head_scout');
      return `<p class="muted">${esc(scout?.name || 'Your scout')} searches one region for prospects. Better biome knowledge finds more monsters and reveals more about them.</p>
        <div class="stack">${Object.entries(REGIONS).map(([name, r]) => { const skill = scout?.biomes?.[r.biome] ?? 50; return `<button class="item" data-action="region" data-v="${esc(name)}"><div class="grow"><div class="name">${esc(name)}</div><div class="sub">${r.types.join(' · ')}</div></div><span class="chip ${skill >= 80 ? 'good' : skill < 40 ? 'bad' : ''}">${skill}/100</span></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { region: (el) => { const r = F.scoutRegion(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${r.scout} found ${r.prospects.length} prospect${r.prospects.length === 1 ? '' : 's'}.`, 'good'); Router.go('recruit', {}, { replace: true }); } }); },
  });

  // ---------------------------------------------------------------- Tuesday
  Router.registerScreen('recruit', {
    title: 'Tuesday · Recruiting',
    render({ f }) {
      if (f.season.day !== 1) return `<div class="panel"><p>Recruiting is done for this week.</p>${f.week.recruited ? `<p class="muted">Signed: ${esc(f.roster.find((m) => m.id === f.week.recruited)?.name || '')}</p>` : ''}<button class="btn block" data-action="back">Back</button></div>`;
      if (!f.week.prospects.length) return `<div class="panel"><p>No prospects were found this week.</p><button class="btn primary block" data-action="skip">Continue to Wednesday</button></div>`;
      const cap = F.salarySummary(f);
      return `<p class="muted">Attempts left: <b>${3 - f.week.recruitAttempts}</b> · Roster ${f.roster.length}/26 · Cap room ${fmtMoney(cap.remaining)}</p>
        <div class="stack">${f.week.prospects.map((p, i) => prospectCard(p, i)).join('')}</div>
        <button class="btn block" data-action="skip" style="margin-top:8px">Pass on all prospects</button>`;
    },
    mount(root) {
      delegate(root, {
        back: () => Router.back(),
        skip: () => { F.skipRecruit(app.f); app.save(); Router.go('hq', {}, { reset: true }); },
        compare: (el) => { const p = app.f.week.prospects[Number(el.dataset.i)]; if (p) sheet(compareHtml(app.f, p), { title: `${p.monster.name} vs your ${p.monster.position}s` }); },
        approach: (el) => {
          const i = Number(el.dataset.i), v = el.dataset.v; const p = app.f.week.prospects[i]; const rc = p ? F.releaseCandidates(app.f, p) : { needed: false };
          if (rc.needed) {
            const { el: sh, close } = sheet(`<p>${esc(rc.reason)} Choose who leaves if <b>${esc(p.monster.name)}</b> signs (nothing happens if they turn you down).</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}" ${c.capOk ? '' : 'disabled'}><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr${c.capOk ? '' : ' · still over the cap'}</div></div><span class="chip ${c.position === p.monster.position ? 'accent' : ''}">${c.position === p.monster.position ? 'same position' : 'release'}</span></button>`).join('') || '<p class="dim">Nobody can be released.</p>'}</div>`, { title: 'Make room' });
            sh.addEventListener('click', (e) => { const id = e.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); doApproach(i, v, id); });
            return;
          }
          doApproach(i, v, null);
        },
      });
      function doApproach(i, v, releaseId) {
        { const r = F.recruit(app.f, i, v, { releaseId }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (r.success) { toast(`${r.monster.name} signed!`, 'good'); Router.go('hq', {}, { reset: true }); } else { toast(r.final ? 'They declined. No attempts left this week.' : 'Not convinced yet. Try another approach.', r.final ? 'bad' : 'info'); if (r.final) Router.go('hq', {}, { reset: true }); else Router.render(); } }
      }
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
    if (!ovrKnown) verdict = `Overall is hidden — a better scout would show where ${esc(m.name)} ranks.`;
    else {
      const rank = mates.filter((x) => monsterOverall(x) > monsterOverall(m)).length;
      verdict = !mates.length ? `You have no ${m.position} — ${esc(m.name)} would start immediately.` : rank < startSlots ? `<b>Would start</b> at ${m.position} (${rank + 1}${['st', 'nd', 'rd'][rank] || 'th'} best of ${mates.length + 1}).` : rank === startSlots ? `<b>First backup</b> at ${m.position}.` : `<b>Depth</b> — ${rank} ${m.position}${rank === 1 ? ' is' : 's are'} better.`;
    }
    const cap = F.salarySummary(f, m.salary);
    return `${table}<p style="margin-top:10px">${verdict}</p><p class="muted">${startSlots} starting ${m.position} slot${startSlots === 1 ? '' : 's'} · Salary ${fmtMoney(m.salary)}/yr · cap room after signing ${cap.over ? `<span style="color:var(--bad)">over by ${fmtMoney(-cap.remaining)}</span>` : fmtMoney(cap.remaining)} · roster ${f.roster.length + 1}/26</p>${known < 4 ? `<p class="dim">?? = not yet scouted.</p>` : ''}`;
  }
  function prospectCard(p, i) {
    const m = p.monster; const attrs = effectiveAttributes(m);
    const h = headlineAttributes(m); const known = Math.min(4, Math.ceil(p.revealed / 3));
    const fit = p.revealed >= 4 ? F.fitFor(app.f, m) : null;
    return `<div class="panel ${fit?.fits ? 'fit' : ''}">${fit?.fits ? `<div class="fitchip-row"><span class="chip fitchip">✦ Fits your scheme</span> <span class="dim">${esc(fit.why)}</span></div>` : ''}<div class="row" style="flex-wrap:nowrap;align-items:flex-start">${monsterSprite(m, 52)}<div class="grow" style="flex:1;min-width:0"><b>${esc(m.name)}</b> ${typeGlyph(m.type)}<div class="muted">${m.position} · age ${m.age} · ${p.potentialKnown ? 'potential ' + m.potential : 'potential unknown'} · ${fmtMoney(m.salary)}/yr</div><div class="muted">Nature: ${p.natureKnown ? esc(NATURES[m.nature].name) : '???'}</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:none"><span class="ovr">${p.revealed >= 4 ? monsterOverall(m) : '??'}</span><button class="info-btn" data-action="compare" data-i="${i}" aria-label="Compare ${esc(m.name)} with your roster">i</button></div></div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < known ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < known ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>${known < 4 ? `<div class="dim">${4 - known} rating${4 - known === 1 ? '' : 's'} hidden — a better scout reveals more</div>` : ''}
      <div class="grid3">${F.RECRUIT_APPROACHES.map((a) => `<button class="btn small" data-action="approach" data-i="${i}" data-v="${a.id}" title="${esc(a.text)}">${esc(a.label)}</button>`).join('')}</div></div>`;
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
        <div class="stack">${Object.entries(TRAINING_FOCI).map(([id, t]) => { const o = F.trainingOdds(f, id, intensity); return `<button class="item" data-action="focus" data-v="${id}"><div class="grow"><div class="name">${esc(t.label)} <span class="chip accent">+${o.amount}</span></div><div class="sub">${esc(t.attrs.map((a) => ATTR_LABEL[a]).join(', '))}</div><div class="sub"><b style="color:${o.success >= 0.7 ? 'var(--good)' : o.success >= 0.45 ? 'var(--warn, #e0a33b)' : 'var(--bad)'}">${pct(o.success)} success</b> · ${pct(o.risk)} injury risk${o.streak >= 2 ? ` · <span style="color:var(--bad)">${o.streak} weeks in a row — monsters are tuning it out</span>` : o.streak === 1 ? ' · same as last week' : ''}</div></div></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { back: () => Router.back(), intensity: (el) => { intensity = el.dataset.v; Router.render(); }, focus: (el) => { const r = F.setTraining(app.f, el.dataset.v, intensity); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); sheet(trainingResultHtml(app.f.week.training), { title: 'Practice report', onClose: () => Router.go('hq', {}, { reset: true }) }); } }); },
  });
  function trainingResultHtml(t) {
    const label = TRAINING_FOCI[t.focus]?.label || t.focus;
    return `<h2 style="margin-top:0">${t.success ? '✅ Good practice' : '❌ Sloppy practice'}</h2><p>${t.success ? `${esc(label)} work paid off: <b>+${t.amount}</b> to ${esc(TRAINING_FOCI[t.focus].attrs.map((a) => ATTR_LABEL[a]).join(', '))} on Sunday.` : `${esc(label)} work didn't stick this week. No boost on Sunday.`}</p>${t.injury ? `<p style="color:var(--bad)">🚑 ${esc(t.injury.name)} was hurt: ${esc(t.injury.severity)}, out ${t.injury.weeks} week${t.injury.weeks === 1 ? '' : 's'}. The next monster on the depth chart steps in.</p>` : '<p class="muted">Everyone came out healthy.</p>'}`;
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
    return r.side === 'offense'
      ? `<h2>${esc(opp)} offense</h2><div class="kv"><b>Pass / run split</b><span>${r.passBias}% pass</span><b>Passing strength</b><span>${r.pass}</span><b>Running strength</b><span>${r.run}</span><b>Aggression</b><span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.passBias >= 60 ? 'They throw a lot — coverage-heavy calls and pass rush.' : r.passBias <= 48 ? 'Run-first — stack the box and make them throw.' : 'Balanced — mix your calls.'}</p>${cards}`
      : `<h2>${esc(opp)} defense</h2><div class="kv"><b>Pass defense</b><span>${r.passD}</span><b>Run defense</b><span>${r.runD}</span><b>Aggression</b><span>${r.aggression}/100</span>${star}</div><p class="muted" style="margin-top:8px">${r.aggression >= 60 ? 'Blitz-happy — screens and quick throws punish them.' : r.passD > r.runD + 6 ? 'Strong secondary — lean on the run.' : r.runD > r.passD + 6 ? 'Soft against the pass — take your shots.' : 'No obvious weakness — stay balanced.'}</p>${cards}`;
  }
  /** Tapping a scouted play card opens its full diagram. */
  document.addEventListener('click', (e) => { const id = e.target.closest?.('[data-scout-play]')?.dataset.scoutPlay; if (id && PLAYS[id]) sheet(playDetailHtml(id).replace(/<div style="margin-top:12px"><button[^]*?<\/div>$/, ''), { title: PLAYS[id].name }); });


  // ---------------------------------------------------------------- Friday
  Router.registerScreen('gameplan', {
    title: 'Friday · Game Plan',
    render({ f }) {
      if (f.season.day !== 4) return `<div class="panel"><p>The game plan is set on <b>Friday</b>. This week's plan: ${f.week.plan.offense.length ? f.week.plan.offense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'} · ${f.week.plan.defense.length ? f.week.plan.defense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'}.</p><button class="btn block" data-action="back">Back</button></div>`;
      const sel = { offense: new Set(f.week.plan.offense.length ? f.week.plan.offense : (f.lastPlan?.offense || F.defaultPlan(f, 'offense'))), defense: new Set(f.week.plan.defense.length ? f.week.plan.defense : (f.lastPlan?.defense || F.defaultPlan(f, 'defense'))) };
      const rep = f.week.scoutReport; const hintsOn = f.settings.hints !== false;
      const hintSide = rep?.side === 'defense' ? 'offense' : rep?.side === 'offense' ? 'defense' : null;
      const hints = hintsOn && hintSide ? counterPlays(F.catalog(f, hintSide), rep.plays || []) : [];
      const hintMap = Object.fromEntries(hints.map((h) => [h.id, h]));
      const hintNote = hintsOn && hintSide ? `<div class="panel tight hint-note"><b>💡 Coach's hints</b> — ${hints.length ? `outlined ${hintSide} plays counter what ${esc(F.opponentName(f) || 'they')} showed in scouting. A hint is a lean, not a guarantee.` : `nothing in your ${hintSide} playbook clearly counters their scouted calls.`} <span class="dim">(Settings → Coaching hints)</span></div>` : hintsOn ? '<p class="dim">Scout the opponent on Thursday to get coach\'s hints here.</p>' : '';
      const side = (s) => `<h3>${s === 'offense' ? 'Offense' : 'Defense'} · <span id="count-${s}">${sel[s].size}</span>/${F.PLAN_SIZE} equipped</h3><div class="play-grid" data-side="${s}">${F.catalog(f, s).map((id) => `<button class="card ${sel[s].has(id) ? 'selected' : ''} ${hintMap[id] ? 'hint' : ''}" title="${hintMap[id] ? esc('Counters ' + hintMap[id].beats.join(', ')) : ''}" data-action="toggle" data-side="${s}" data-id="${id}" aria-pressed="${sel[s].has(id)}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}</div>`;
      return `<p class="muted">Equip ${F.PLAN_SIZE} offensive and ${F.PLAN_SIZE} defensive plays for Sunday. Your coordinators' picks are pre-selected; tap a card to swap, or use Details for the full diagram.</p>${hintNote}
        ${side('offense')}${legendHtml('offense')}${side('defense')}${legendHtml('defense')}
        <div class="row between" style="margin-top:12px"><button class="btn" data-action="details">Play details</button><button class="btn primary" data-action="save">Save game plan</button></div>`;
    },
    mount(root) {
      const f0 = app.f; const sel = { offense: new Set(f0.week.plan.offense.length ? f0.week.plan.offense : (f0.lastPlan?.offense || F.defaultPlan(f0, 'offense'))), defense: new Set(f0.week.plan.defense.length ? f0.week.plan.defense : (f0.lastPlan?.defense || F.defaultPlan(f0, 'defense'))) };
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
      const lineup = r.ok ? `<p class="muted">✅ Lineup set: every position has a healthy monster.${r.tired.length ? ` <span style="color:var(--warn)">Tired: ${esc(r.tired.join(', '))}.</span>` : ''}</p>` : `<p style="color:var(--bad)">⚠️ Can't fill: ${r.problems.join(', ')}. Fix it on the depth chart.</p>`;
      if (f.week.media) {
        const md = f.week.media; const groups = Object.entries(md.boosts).map(([t, v]) => `<span class="chip accent">${TEMPERAMENTS[t].label} +${v}</span>`).join(' ');
        return `<div class="panel"><h3 style="margin-top:0">Press conference done</h3><p>${groups || 'No boosts.'}${md.hype ? ' <span class="chip bad">Trash talk: +2 all, risky</span>' : ''}</p><p class="dim">Monsters with matching natures get the boost on Sunday.</p>${lineup}</div><div class="grid2"><button class="btn block" data-action="roster">Depth chart</button><button class="btn primary block" data-action="done">Ready for Sunday →</button></div>`;
      }
      const qs = F.mediaQuestions(f); app.save();
      const count = Object.fromEntries(Object.keys(TEMPERAMENTS).map((t) => [t, 0])); for (const m of f.roster) count[temperamentOf(m.nature)]++;
      return `<p class="muted">The press wants answers. How you talk changes how your monsters feel: each answer fires up monsters of one temperament for Sunday.</p>
        <p class="dim">Your roster: ${Object.entries(count).map(([t, n]) => `${TEMPERAMENTS[t].label} ${n}`).join(' · ')}</p>
        ${qs.map((q, k) => `<div class="panel"><b>🎤 “${esc(q.q)}”</b><div class="stack" style="margin-top:8px">${q.a.map((a, ai) => `<button class="choice ${mediaPicks[k] === ai ? 'selected' : ''}" data-action="answer" data-q="${k}" data-a="${ai}"><span>${esc(a.text)}</span><span class="dim" style="font-size:12px">${TEMPERAMENTS[a.t].label} monsters${a.hype ? ' · trash talk' : ''}${a.star ? ' · your star' : ''}</span></button>`).join('')}</div></div>`).join('')}
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
      const grid = (s) => `<div class="play-grid">${F.catalog(f, s).map((id) => `<button class="card ${f.week.plan[s].includes(id) ? 'selected' : ''}" data-action="open" data-id="${id}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}</div>`;
      return `<div class="row between"><h3 style="margin:0">Offense · ${esc(oc?.style || '')}</h3>${f.season.day === 4 ? '<button class="btn small" data-action="plan">Set game plan</button>' : '<span class="dim">Game plan is set on Fridays</span>'}</div>${grid('offense')}${legendHtml('offense')}
        <h3>Defense · ${esc(dc?.style || '')}</h3>${grid('defense')}${legendHtml('defense')}<p class="dim">Highlighted cards are in this week's game plan. Custom play creation is a future feature.</p>`;
    },
    mount(root) { delegate(root, { open: (el) => Router.go('playdetail', { id: el.dataset.id }), plan: () => Router.go('gameplan') }); },
  });
  Router.registerScreen('playdetail', {
    title: ({ params }) => PLAYS[params.id]?.name || 'Play',
    render({ params }) { return playDetailHtml(params.id); },
    mount(root) { delegate(root, { practice: (el) => Router.go('practice', { play: el.dataset.id }) }); },
  });

  // ---------------------------------------------------------------- League
  Router.registerScreen('league', {
    title: 'League', back: false,
    render({ f }) {
      const rival = f.rivals[f.tier]; const titles = Object.values(f.badges).reduce((a, b) => a + b, 0);
      const races = F.awardRaces(f); const anyRace = Object.values(races).some((v) => v.length);
      const watch = `<h3>🏅 Award watch</h3>${anyRace ? '' : '<p class="dim">Races start after the first Sunday. Stats from every club in the league count.</p>'}<div class="list">${Object.entries(F.AWARDS).map(([k, a]) => { const top = races[k]; return `<div class="item static" style="display:block"><div class="name">${esc(a.label)} <span class="dim">${a.short}</span></div>${top.length ? top.map((r, i) => { const me = r.team === f.club; return k === 'coy' ? `<div class="row between sub ${me ? 'mine' : ''}"><span>${i + 1}. ${esc(r.coach)} <span class="dim">${esc(r.team)}</span></span><span class="mono">${r.w}–${r.l}</span></div>` : `<div class="row sub ${me ? 'mine' : ''}" style="gap:6px"><span class="dim">${i + 1}.</span>${monsterSprite(r, 20)}<span class="grow">${esc(r.name)} <span class="dim">${esc(r.position)} · ${esc(r.team)}</span></span><span class="mono">${raceLine(r)}</span></div>`; }).join('') : '<div class="sub dim">No contenders yet.</div>'}</div>`; }).join('')}</div>`;
      return `<div class="panel"><b>Beast League</b> · 16 clubs · Season ${f.season.year}<div class="muted">Beast Bowl titles: ${titles}${f.season.week >= 5 && !f.season.finished ? ` · ${esc(F.playoffPicture(f).text)}` : ''}</div>
        ${rival ? `<div class="muted">⚔️ Rival: <b>${esc(rival.team)}</b> (GM ${esc(rival.gm)}) · all-time ${rival.headToHead.w}–${rival.headToHead.l}</div>` : ''}</div>
        <div class="grid2"><button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button><button class="btn block" data-action="go" data-screen="history">📜 History</button><button class="btn block" data-action="go" data-screen="playoffs">🏆 Playoffs</button></div>${watch}`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
  Router.registerScreen('schedule', {
    title: 'Schedule',
    render({ f }) {
      const rival = f.rivals[f.tier]?.team;
      return `<p class="muted">Season ${f.season.year} · 9 games, 1 bye · playoffs weeks 11–13</p><div class="list">${f.season.schedule.map((g) => { const res = g.result; return `<div class="item static ${g.week === f.season.week ? 'me' : ''}"><div class="grow"><div class="name">Week ${g.week} ${g.bye ? '· BYE' : `· ${g.home ? 'vs' : '@'} ${esc(g.opponent)}`}${g.opponent === rival ? ' ⚔️' : ''}</div><div class="sub">${g.bye ? 'Rest and recover' : esc(g.category)}${!g.bye && GYM_BY_CLUB[g.opponent] ? ` · 🏅 ${esc(GYM_BY_CLUB[g.opponent].badge)}${F.badgeOf(f, g.opponent) ? ' (held)' : ''}` : ''}</div></div>${res ? `<span class="chip ${res.won ? 'good' : 'bad'}">${res.won ? 'W' : 'L'} ${res.playerScore}–${res.oppScore}</span>` : g.week === f.season.week ? '<span class="chip accent">This week</span>' : ''}</div>`; }).join('')}</div>`;
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
  Router.registerScreen('playoffs', {
    title: 'Playoffs',
    render({ f }) {
      const p = f.season.playoffs; const rec = (t) => f.season.records[t] || { w: 0, l: 0, t: 0 };
      const recText = (t) => { const r = rec(t); return `${r.w}–${r.l}${r.t ? '–' + r.t : ''}`; };
      const dot = (t) => `<span class="team-dot" style="background:${TEAM_META[t]?.color || '#888'}"></span>`;
      const teamRow = (t, seed, tag) => `<div class="po-row ${t === f.club ? 'me' : ''}"><span class="seed">${seed}</span>${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ' <span class="chip accent">YOU</span>' : ''}</span>${tag ? `<span class="chip">${tag}</span>` : ''}<span class="mono po-rec">${recText(t)}</span></div>`;
      if (!p) {
        const st = F.leagueStandings(f); const wk = f.season.week;
        const conf = (c) => { const C = st.conferences[c]; const hunt = C.order.filter((t) => !C.seeds.includes(t)).slice(0, 2); const lastIn = C.seeds[3];
          const back = (t) => { const a = rec(t), b = rec(lastIn); const gb = ((b.w - a.w) + (a.l - b.l)) / 2; return gb <= 0 ? 'tiebreak' : `${gb} GB`; };
          return `<div class="panel tight po-conf"><div class="po-head"><b>${c} Conference</b><span class="dim">4 qualify</span></div>${C.seeds.map((t, i) => teamRow(t, i + 1, C.champions.includes(t) ? 'Div' : 'WC')).join('')}<div class="po-cut"><span>playoff line</span></div>${hunt.map((t) => teamRow(t, '·', back(t))).join('')}</div>`; };
        return `<div class="panel tight"><b>Playoff picture</b> · Week ${wk}<div class="muted">Eight clubs make it: two division winners and two wild cards per conference. ${wk < 5 ? 'Early days — standings will move.' : F.playoffPicture(f).text}</div></div>${conf('Aurora')}${conf('Titan')}<p class="dim">Div = division leader · WC = wild card · GB = games back of the last spot.</p>`;
      }
      const rounds = [[1, 'Conference semifinals · Week 11'], [2, 'Conference championships · Week 12'], [3, 'Beast Bowl · Week 13']];
      const game = (g) => { const w = g.result ? (g.result.homeScore > g.result.awayScore ? g.home : g.away) : null; const side = (t, score) => `<div class="po-row ${t === f.club ? 'me' : ''} ${w && w !== t ? 'lost' : ''}">${dot(t)}<span class="grow po-name">${esc(t)}${t === f.club ? ' <span class="chip accent">YOU</span>' : ''}</span><span class="mono po-rec">${score ?? ''}</span></div>`;
        return `<div class="panel tight po-game"><div class="dim" style="font-size:12px">${esc(g.tag)}${g.result ? '' : ' · upcoming'}</div>${side(g.away, g.result?.awayScore)}${side(g.home, g.result?.homeScore)}</div>`; };
      return `${p.champion ? `<div class="panel center" style="border-color:#f5c542"><h2 style="margin:0">🏆 ${esc(p.champion)}</h2><div class="muted">Beast Bowl champions</div></div>` : ''}${rounds.map(([r, label]) => { const gs = p.fixtures.filter((g) => g.round === r); return gs.length ? `<h3>${label}</h3>${gs.map(game).join('')}` : ''; }).join('')}
        <h3>Seeds</h3>${['Aurora', 'Titan'].map((c) => `<div class="panel tight po-conf"><div class="po-head"><b>${c}</b></div>${p.seeds[c].map((t, i) => teamRow(t, i + 1)).join('')}</div>`).join('')}`;
    },
  });
  Router.registerScreen('history', {
    title: 'Franchise History',
    render({ f }) {
      return `<div class="panel"><div class="kv"><b>Owner</b><span>${esc(f.owner.first)} ${esc(f.owner.last)} · ${esc(f.owner.hometown)}</span><b>Titles</b><span>Challenger ${f.badges.challenger} · Vanguard ${f.badges.vanguard} · Sovereign ${f.badges.sovereign}</span></div></div>
        ${f.history.length ? `<div class="list">${f.history.slice().reverse().map((h) => `<div class="item static"><div class="grow"><div class="name">Season ${h.year} · ${esc(h.club)}</div><div class="sub">${h.record.w}–${h.record.l}${h.place ? ` · ${h.place}${['st', 'nd', 'rd'][h.place - 1] || 'th'} overall` : ''}${h.playoffs ? ' · playoffs' : ''}${h.champion === h.club ? ' · 🏆 CHAMPIONS' : h.champion ? ` · champion: ${esc(h.champion)}` : ''}${h.legacy ? ' · imported' : ''}</div>${h.awards ? `<div class="sub">${h.awards.mvp ? `MVP ${esc(h.awards.mvp.name)}` : ''}${h.awards.rivalry ? ` · ⚔️ ${h.awards.rivalry.swept ? 'swept' : h.awards.rivalry.wins + '–' + (h.awards.rivalry.games - h.awards.rivalry.wins) + ' vs'} ${esc(h.awards.rivalry.team)}` : ''}</div>` : ''}</div>${h.awards ? `<button class="btn small" data-action="awards" data-year="${h.year}">Awards</button>` : ''}</div>`).join('')}</div>` : '<p class="muted">No completed seasons yet.</p>'}`;
    },
    mount(root) { delegate(root, { awards: (el) => { const h = app.f.history.find((x) => x.year === Number(el.dataset.year)); if (h?.awards) sheet(awardsHtml(h.awards), { title: `Season ${h.year} awards` }); } }); },
  });
}

export function playDetailHtml(id) {
  const p = PLAYS[id]; if (!p) return '<p>Unknown play.</p>';
  const rows = p.onField.map((slot) => { const a = p.assignments[slot]; const what = a.a === 'route' ? `Route: ${a.r}` : a.a === 'zone' ? `Zone: ${a.zone.replace(/_/g, ' ')}` : a.a === 'man' ? `Man: ${a.key === 'wideL' ? 'widest left receiver' : a.key === 'wideR' ? 'widest right receiver' : 'inside receiver'}` : a.a === 'rush' || a.a === 'contain' ? `${a.a === 'rush' ? 'Rush' : 'Contain'}: ${a.gap.replace('_', ' ')} gap` : a.a === 'block' ? (p.type === 'run' ? 'Run block' : 'Pass protection') : a.a.replace(/_/g, ' '); return `<tr><td class="mono"><b>${slot}</b>${slot === p.primary ? ' ★' : ''}</td><td>${esc(what)}</td></tr>`; }).join('');
  return `<div class="play-preview">${playCardSvg(id, { width: 54, depthUp: 26, depthBack: 9 })}</div>${legendHtml(p.side)}
    <div class="panel"><div class="kv"><b>Type</b><span>${p.side === 'offense' ? (p.type === 'run' ? 'Run' : 'Pass') : 'Defense'}</span><b>Personnel</b><span>${esc(p.pkg)}${p.side === 'offense' ? ` · ${esc(p.formation.replace(/_/g, ' '))}` : ''}</span>${p.primary ? `<b>Primary read</b><span>${p.primary} (★)</span>` : ''}${p.progression?.length ? `<b>Progression</b><span>${p.progression.join(' → ')}</span>` : ''}<b>Best for</b><span>${p.tags.map((t) => t.replace(/_/g, ' ')).join(', ')}</span></div>${p.desc ? `<p style="margin-top:8px">${esc(p.desc)}</p>` : ''}</div>${lessonHtml(id)}
    <table><thead><tr><th>Player</th><th>Assignment</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:12px"><button class="btn block" data-action="practice" data-id="${id}">Run it in practice</button></div>`;
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
  return `<div class="panel center"><div style="font-size:12px" class="muted">SEASON ${a.year}</div><div style="font-size:20px;font-weight:900">${a.record.w}–${a.record.l}${a.record.t ? '–' + a.record.t : ''} · ${a.place}${['st', 'nd', 'rd'][a.place - 1] || 'th'} overall</div><div class="muted">${a.champion === undefined ? '' : a.playoffs ? 'Made the playoffs' : 'Missed the playoffs'}${a.champion ? ` · Beast Bowl: ${esc(a.champion)}` : ''}</div></div>
    ${a.rivalry ? `<div class="panel tight" style="border-color:#a855f7">⚔️ Rivalry vs ${esc(a.rivalry.team)}: <b>${a.rivalry.swept ? 'SWEPT — GM ' + esc(a.rivalry.gm) + ' is not happy' : a.rivalry.games ? a.rivalry.wins + '–' + (a.rivalry.games - a.rivalry.wins) : 'not played'}</b></div>` : ''}
    ${a.league ? `<h3>League awards</h3><div class="list">${Object.entries(F.AWARDS).map(([k, aw]) => { const w = a.league[k]; if (!w) return ''; return `<div class="item static" style="${w.team === a.club ? 'border-color:var(--accent)' : ''}"><div class="grow"><div class="name">🏅 ${esc(aw.label)}</div><div class="sub">${k === 'coy' ? `${esc(w.coach)} · ${esc(w.team)} (${w.w}–${w.l})` : `${esc(w.name)} (${esc(w.position)}, ${esc(w.team)}) · ${esc(raceLine(w))}`}</div></div></div>`; }).join('')}</div>` : ''}
    <h3>Club awards</h3><div class="list">${a.mvp ? `<div class="item static" style="border-color:var(--accent)"><div class="grow"><div class="name">★ Team MVP</div><div class="sub">${esc(a.mvp.name)} (${esc(a.mvp.position)})</div></div></div>` : ''}${line('Rushing leader', a.rusher)}${line('Receiving leader', a.receiver)}${line('Passing leader', a.passer)}${line('Tackling leader', a.tackler)}${line('Sack leader', a.rusherD)}${line('Ball hawk', a.ballhawk)}</div>`;
}

/** Campaign panel on HQ: the eight gym badges and the Hall of Fame checklist (GDD §15.4, §15.9). */
function campaignPanel(f) {
  const hof = F.hallOfFameProgress(f);
  const LABEL = { badges: 'Gym badges', titles: 'Beast Bowl titles', wins: 'Career wins', awards: 'League awards' };
  const badges = GYMS.map((g) => { const b = F.badgeOf(f, g.club); const hue = TYPES[g.element]?.hue ?? 120; return `<button class="badge ${b ? 'won' : ''}" data-action="gym" data-club="${esc(g.club)}" style="--hue:${hue}" aria-label="${esc(g.badge)}${b ? ', earned' : ', not yet earned'}"><span class="badge-ico">${b ? '★' : '·'}</span><span class="badge-nm">${esc(g.element)}</span></button>`; }).join('');
  return `<div class="panel"><div class="row between"><b>Campaign</b><span class="dim">${hof.eligible ? '🏛️ Hall of Fame eligible' : `${hof.rows.filter((r) => r.done).length} / ${hof.rows.length} on track`}</span></div>
    <div class="badge-row">${badges}</div>
    <div class="hof">${hof.rows.map((r) => `<div class="row between ${r.done ? 'done' : ''}"><span>${r.done ? '✓' : '○'} ${LABEL[r.key]}</span><span class="mono">${r.have} / ${r.goal}</span></div>`).join('')}</div></div>`;
}
