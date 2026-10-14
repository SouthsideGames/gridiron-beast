// Franchise Headquarters and the weekly action screens, plus playbook
// browsing and the league screens.

import { esc, delegate, toast, sheet, fmtMoney, confirmSheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { REGIONS, TRAINING_FOCI, ROLE_LABEL, trainingBonus } from '../../data/staff.js';
import { PLAYS, LESSONS } from '../../data/playbook.js';
import { tierById, TEAM_META, DIVISIONS, conferenceFor, divisionOf } from '../../data/league.js';
import { monsterOverall, NATURES, TYPES, effectiveAttributes, HEADLINE, headlineAttributes } from '../../data/monsters.js';
import { headlineHtml } from './roster.js';
import { ATTRIBUTES, OFFENSE_BASE, DEFENSE_BASE, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS } from '../../data/personnel.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
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
        <div class="panel"><div class="muted" style="font-size:12px">THIS WEEK</div><div style="margin:4px 0 8px">${gameLine}</div>
          ${next ? `<button class="btn primary big block" data-action="${next.action}">${next.icon} ${esc(next.label)}</button>` : ''}
          ${cap.over ? `<p class="muted" style="color:var(--bad);margin-top:8px">Over the cap by ${fmtMoney(-cap.remaining)} — games are locked until you release a monster.</p>` : ''}</div>
        ${f.week.gameResult && !f.week.gameResult.bye && day === 0 ? '' : ''}
        <div class="grid2">
          <button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button>
          <button class="btn block" data-action="go" data-screen="staff">👥 Coaching staff</button><button class="btn block" data-action="go" data-screen="practice">🎯 Practice</button></div>
        <h3>News</h3><ul class="news" style="padding-left:18px;margin:0">${f.news.slice(0, 8).map((n) => `<li class="${esc(n.kind)}">${esc(n.text)}</li>`).join('') || '<li class="dim">Nothing yet.</li>'}</ul>`;
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
        awards: () => sheet(awardsHtml(app.f.season.awards || F.seasonAwards(app.f)), { title: `Season ${app.f.season.year} awards` }),
        nextseason: async () => { if (await confirmSheet(`Start season ${app.f.season.year + 1}? Your roster ages one year and the record resets.`, { title: 'New season', okLabel: 'Start' })) { F.startNextSeason(app.f); app.save(); Router.render(); } },
      });
    },
  });
  function nextAction(f) {
    const d = f.season.day;
    if (f.game && !f.game.state?.finished) return { label: 'Resume game', action: 'resume', icon: '▶' };
    if (d === 6) return F.isBye(f) ? { label: 'Take the bye week', action: 'bye', icon: '😴' } : { label: 'Play Sunday game', action: 'game', icon: '🏈' };
    return [{ label: 'Monday · Scout a region', action: 'scout', icon: '🧭' }, { label: 'Tuesday · Recruit', action: 'recruit', icon: '🤝' }, { label: 'Wednesday · Training focus', action: 'training', icon: '💪' }, { label: 'Thursday · Scout opponent', action: 'scoutopp', icon: '🔍' }, { label: 'Friday · Set game plan', action: 'gameplan', icon: '📋' }, { label: 'Saturday · Lineup check', action: 'lineup', icon: '✅' }][d];
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
        approach: (el) => { const r = F.recruit(app.f, Number(el.dataset.i), el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (r.success) { toast(`${r.monster.name} signed!`, 'good'); Router.go('hq', {}, { reset: true }); } else { toast(r.final ? 'They declined. No attempts left this week.' : 'Not convinced yet. Try another approach.', r.final ? 'bad' : 'info'); if (r.final) Router.go('hq', {}, { reset: true }); else Router.render(); } },
      });
    },
  });
  /** Prospect vs the club's monsters at the same position: headline ratings, OVR, age, salary, and where they'd slot in. */
  function compareHtml(f, p) {
    const m = p.monster; const known = Math.min(4, Math.ceil(p.revealed / 3)); const ovrKnown = p.revealed >= 4;
    const chart = buildDepthChart(f.roster, f.lineupManual); const starters = new Set([...OFFENSE_BASE, ...DEFENSE_BASE, 'K'].map((s) => chart[s])); const pkg = new Set([...OFFENSE_PACKAGE_SLOTS, ...DEFENSE_PACKAGE_SLOTS].map((s) => chart[s]));
    const mates = f.roster.filter((x) => x.position === m.position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const startSlots = STARTERS_BY_POS[m.position] || 1;
    const hp = headlineAttributes(m);
    const cell = (v, best, show = true) => `<td class="mono ${show && v >= best ? 'best' : ''}">${show ? v : '??'}</td>`;
    const rows = [{ m, prospect: true }, ...mates.map((x) => ({ m: x }))];
    const best = Object.fromEntries(HEADLINE.map((x) => [x.key, Math.max(...rows.map((r, i) => (i === 0 && HEADLINE.findIndex((y) => y.key === x.key) >= known) ? 0 : headlineAttributes(r.m)[x.key]))]));
    const table = `<table class="compare"><thead><tr><th></th>${HEADLINE.map((x) => `<th>${x.label.slice(0, 3)}</th>`).join('')}<th>OVR</th><th>Age</th></tr></thead><tbody>${rows.map((r, idx) => { const h = headlineAttributes(r.m); return `<tr class="${r.prospect ? 'prospect' : ''}"><td><div class="row" style="gap:4px">${monsterSprite(r.m, 22)}<span>${esc(r.m.name)}${r.prospect ? ' <span class="chip accent">new</span>' : starters.has(r.m.id) ? ' <span class="chip">starter</span>' : pkg.has(r.m.id) ? ' <span class="chip">package</span>' : ''}</span></div></td>${HEADLINE.map((x, i) => cell(h[x.key], best[x.key], !r.prospect || i < known)).join('')}<td class="mono"><b>${r.prospect && !ovrKnown ? '??' : monsterOverall(r.m)}</b></td><td class="mono">${r.m.age}</td></tr>`; }).join('')}</tbody></table>`;
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
    return `<div class="panel"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${monsterSprite(m, 52)}<div class="grow" style="flex:1;min-width:0"><b>${esc(m.name)}</b> ${typeGlyph(m.type)}<div class="muted">${m.position} · age ${m.age} · ${p.potentialKnown ? 'potential ' + m.potential : 'potential unknown'} · ${fmtMoney(m.salary)}/yr</div><div class="muted">Nature: ${p.natureKnown ? esc(NATURES[m.nature].name) : '???'}</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:none"><span class="ovr">${p.revealed >= 4 ? monsterOverall(m) : '??'}</span><button class="info-btn" data-action="compare" data-i="${i}" aria-label="Compare ${esc(m.name)} with your roster">i</button></div></div>
      <div class="headline" style="margin:8px 0">${HEADLINE.map((x, i) => `<div class="hl"><span class="hl-v">${i < known ? h[x.key] : '??'}</span><span class="hl-l">${x.label}</span><div class="bar"><i style="width:${i < known ? h[x.key] : 0}%"></i></div></div>`).join('')}</div>${known < 4 ? `<div class="dim">${4 - known} rating${4 - known === 1 ? '' : 's'} hidden — a better scout reveals more</div>` : ''}
      <div class="grid3">${F.RECRUIT_APPROACHES.map((a) => `<button class="btn small" data-action="approach" data-i="${i}" data-v="${a.id}" title="${esc(a.text)}">${esc(a.label)}</button>`).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------- Wednesday
  Router.registerScreen('training', {
    title: 'Wednesday · Training',
    render({ f }) {
      const tr = F.staffMember(f, 'monster_trainer');
      return `<p class="muted">${esc(tr?.name || 'Your trainer')} runs one focus. The bonus applies on Sunday only — permanent growth comes from games.</p>
        <div class="stack">${Object.entries(TRAINING_FOCI).map(([id, t]) => { const b = trainingBonus(tr, id); const amt = Object.values(b)[0]; return `<button class="item" data-action="focus" data-v="${id}"><div class="grow"><div class="name">${esc(t.label)}</div><div class="sub">${esc(t.text)}</div></div><span class="chip accent">+${amt} ${t.attrs.map((a) => ATTR_LABEL[a]).join(', ')}</span></button>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { focus: (el) => { const r = F.setTraining(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Training focus set.', 'good'); Router.go('hq', {}, { reset: true }); } }); },
  });

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
    const fav = (ids) => ids.map((id) => esc(PLAYS[id]?.name || id)).join(', ');
    return r.side === 'offense'
      ? `<h2>${esc(opp)} offense</h2><div class="kv"><b>Pass / run split</b><span>${r.passBias}% pass</span><b>Passing strength</b><span>${r.pass}</span><b>Running strength</b><span>${r.run}</span><b>Aggression</b><span>${r.aggression}/100</span><b>Star</b><span>${esc(r.star.name)} (${r.star.slot}, ~${r.star.ovr})</span><b>Favourite plays</b><span>${fav(r.favourite)}</span></div><p class="muted" style="margin-top:8px">${r.passBias >= 60 ? 'They throw a lot — coverage-heavy calls and pass rush pay off.' : r.passBias <= 45 ? 'Run-first team — heavy fronts and run fits matter.' : 'Balanced attack — mix your calls.'}</p>`
      : `<h2>${esc(opp)} defense</h2><div class="kv"><b>Pass defense</b><span>${r.passD}</span><b>Run defense</b><span>${r.runD}</span><b>Aggression</b><span>${r.aggression}/100</span><b>Star</b><span>${esc(r.star.name)} (${r.star.slot}, ~${r.star.ovr})</span><b>Favourite calls</b><span>${fav(r.favourite)}</span></div><p class="muted" style="margin-top:8px">${r.aggression >= 60 ? 'Blitz-happy — screens and quick throws punish them.' : r.passD > r.runD + 6 ? 'Strong secondary — lean on the run game.' : 'Soft against the pass — take your shots.'}</p>`;
  }

  // ---------------------------------------------------------------- Friday
  Router.registerScreen('gameplan', {
    title: 'Friday · Game Plan',
    render({ f }) {
      if (f.season.day !== 4) return `<div class="panel"><p>The game plan is set on <b>Friday</b>. This week's plan: ${f.week.plan.offense.length ? f.week.plan.offense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'} · ${f.week.plan.defense.length ? f.week.plan.defense.map((id) => esc(PLAYS[id].name)).join(', ') : 'coach’s default'}.</p><button class="btn block" data-action="back">Back</button></div>`;
      const sel = { offense: new Set(f.week.plan.offense), defense: new Set(f.week.plan.defense) };
      const side = (s) => `<h3>${s === 'offense' ? 'Offense' : 'Defense'} · <span id="count-${s}">${sel[s].size}</span>/${F.PLAN_SIZE} equipped</h3><div class="play-grid" data-side="${s}">${F.catalog(f, s).map((id) => `<button class="card ${sel[s].has(id) ? 'selected' : ''}" data-action="toggle" data-side="${s}" data-id="${id}" aria-pressed="${sel[s].has(id)}"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></button>`).join('')}</div>`;
      return `<p class="muted">Equip ${F.PLAN_SIZE} offensive and ${F.PLAN_SIZE} defensive plays for Sunday. Tap a card to equip, long-press or use Details for the full diagram.</p>
        ${side('offense')}${legendHtml('offense')}${side('defense')}${legendHtml('defense')}
        <div class="row between" style="margin-top:12px"><button class="btn" data-action="details">Play details</button><button class="btn primary" data-action="save">Save game plan</button></div>`;
    },
    mount(root) {
      const sel = { offense: new Set(app.f.week.plan.offense), defense: new Set(app.f.week.plan.defense) };
      delegate(root, {
        back: () => Router.back(),
        toggle: (el) => { const s = el.dataset.side, id = el.dataset.id; if (sel[s].has(id)) sel[s].delete(id); else if (sel[s].size >= F.PLAN_SIZE) { toast(`Only ${F.PLAN_SIZE} ${s} plays. Remove one first.`); return; } else sel[s].add(id); el.classList.toggle('selected', sel[s].has(id)); el.setAttribute('aria-pressed', sel[s].has(id)); root.querySelector(`#count-${s}`).textContent = sel[s].size; },
        details: () => Router.go('playbook'),
        save: () => { const r = F.setGamePlan(app.f, [...sel.offense], [...sel.defense]); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Game plan saved.', 'good'); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  // ---------------------------------------------------------------- Saturday
  Router.registerScreen('lineup', {
    title: 'Saturday · Lineup Check',
    render({ f }) {
      const r = F.lineupCheck(f); app.save();
      return `<div class="panel">${r.ok ? '<p>✅ Every position is filled with a healthy monster.</p>' : `<p style="color:var(--bad)">⚠️ Cannot fill: ${r.problems.join(', ')}. Recruit or move a monster.</p>`}
        ${r.injured.length ? `<p class="muted">Injured: ${esc(r.injured.join(', '))}</p>` : ''}${r.tired.length ? `<p class="muted" style="color:var(--warn)">Fatigued starters: ${esc(r.tired.join(', '))}</p>` : '<p class="muted">Fatigue is under control.</p>'}
        ${f.week.trainingFocus ? `<p class="muted">Training bonus active: ${esc(TRAINING_FOCI[f.week.trainingFocus].label)}.</p>` : ''}</div>
        <div class="grid2"><button class="btn block" data-action="roster">Open depth chart</button><button class="btn primary block" data-action="done">Ready for Sunday →</button></div>`;
    },
    mount(root) { delegate(root, { roster: () => Router.go('roster'), done: () => Router.go('hq', {}, { reset: true }) }); },
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
      return `<div class="panel"><b>Beast League</b> · 16 clubs · Season ${f.season.year}<div class="muted">Beast Bowl titles: ${titles}${f.season.week >= 5 && !f.season.finished ? ` · ${esc(F.playoffPicture(f).text)}` : ''}</div>
        ${rival ? `<div class="muted">⚔️ Rival: <b>${esc(rival.team)}</b> (GM ${esc(rival.gm)}) · all-time ${rival.headToHead.w}–${rival.headToHead.l}</div>` : ''}</div>
        <div class="grid2"><button class="btn block" data-action="go" data-screen="schedule">🗓️ Schedule</button><button class="btn block" data-action="go" data-screen="standings">📊 Standings</button><button class="btn block" data-action="go" data-screen="history">📜 History</button><button class="btn block" data-action="go" data-screen="playoffs">🏆 Playoffs</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
  Router.registerScreen('schedule', {
    title: 'Schedule',
    render({ f }) {
      const rival = f.rivals[f.tier]?.team;
      return `<p class="muted">Season ${f.season.year} · 9 games, 1 bye · playoffs weeks 11–13</p><div class="list">${f.season.schedule.map((g) => { const res = g.result; return `<div class="item static ${g.week === f.season.week ? 'me' : ''}"><div class="grow"><div class="name">Week ${g.week} ${g.bye ? '· BYE' : `· ${g.home ? 'vs' : '@'} ${esc(g.opponent)}`}${g.opponent === rival ? ' ⚔️' : ''}</div><div class="sub">${g.bye ? 'Rest and recover' : esc(g.category)}</div></div>${res ? `<span class="chip ${res.won ? 'good' : 'bad'}">${res.won ? 'W' : 'L'} ${res.playerScore}–${res.oppScore}</span>` : g.week === f.season.week ? '<span class="chip accent">This week</span>' : ''}</div>`; }).join('')}</div>`;
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
      const p = f.season.playoffs;
      if (!p) { const st = F.leagueStandings(f); return `<p class="muted">If the season ended today:</p>${['Aurora', 'Titan'].map((c) => `<div class="panel tight"><b>${c}</b><ol style="margin:4px 0 0 18px;padding:0">${st.conferences[c].seeds.map((t) => `<li class="${t === f.club ? 'mono' : ''}">${esc(t)}${t === f.club ? ' ★' : ''}</li>`).join('')}</ol></div>`).join('')}`; }
      return `${p.fixtures.map((g) => `<div class="item static"><div class="grow"><div class="name">${esc(g.tag)}</div><div class="sub">${esc(g.home)} vs ${esc(g.away)}</div></div>${g.result ? `<span class="chip">${g.result.homeScore}–${g.result.awayScore}</span>` : '<span class="chip accent">Week ' + g.week + '</span>'}</div>`).join('')}${p.champion ? `<div class="panel center"><h2>🏆 ${esc(p.champion)}</h2><div class="muted">Beast Bowl champions</div></div>` : ''}`;
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

export function lessonHtml(id) {
  const L = LESSONS[id]; if (!L) return '';
  return `<div class="panel lesson"><h3 style="margin-top:0">📖 Lesson</h3><div class="kv"><b>When</b><span>${esc(L.when)}</span><b>Watch</b><span>${esc(L.watch)}</span><b>Beats</b><span>${esc(L.beats)}</span><b>Loses to</b><span>${esc(L.loses)}</span></div></div>`;
}

export function awardsHtml(a) {
  if (!a) return '<p>No awards yet.</p>';
  const line = (label, x) => x ? `<div class="item static"><div class="grow"><div class="name">${esc(label)}</div><div class="sub">${esc(x.name)} (${esc(x.position)})${x.value != null ? ` · ${x.value} ${esc(x.label)}` : ''}</div></div></div>` : '';
  return `<div class="panel center"><div style="font-size:12px" class="muted">SEASON ${a.year}</div><div style="font-size:20px;font-weight:900">${a.record.w}–${a.record.l}${a.record.t ? '–' + a.record.t : ''} · ${a.place}${['st', 'nd', 'rd'][a.place - 1] || 'th'} overall</div><div class="muted">${a.champion === undefined ? '' : a.playoffs ? 'Made the playoffs' : 'Missed the playoffs'}${a.champion ? ` · Beast Bowl: ${esc(a.champion)}` : ''}</div></div>
    ${a.rivalry ? `<div class="panel tight" style="border-color:#a855f7">⚔️ Rivalry vs ${esc(a.rivalry.team)}: <b>${a.rivalry.swept ? 'SWEPT — GM ' + esc(a.rivalry.gm) + ' is not happy' : a.rivalry.games ? a.rivalry.wins + '–' + (a.rivalry.games - a.rivalry.wins) : 'not played'}</b></div>` : ''}
    <div class="list">${a.mvp ? `<div class="item static" style="border-color:var(--accent)"><div class="grow"><div class="name">★ Team MVP</div><div class="sub">${esc(a.mvp.name)} (${esc(a.mvp.position)})</div></div></div>` : ''}${line('Rushing leader', a.rusher)}${line('Receiving leader', a.receiver)}${line('Passing leader', a.passer)}${line('Tackling leader', a.tackler)}${line('Sack leader', a.rusherD)}${line('Ball hawk', a.ballhawk)}</div>`;
}
