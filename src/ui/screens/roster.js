// Roster: depth chart, reserves, monster details, slot assignment,
// contracts and the coaching staff room.

import { esc, delegate, toast, sheet, confirmSheet, fmtMoney } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import * as F from '../../franchise/franchise.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS, PACKAGE_SLOT_USE, ATTRIBUTES, positionOf, canPlay } from '../../data/personnel.js';
import { monsterOverall, effectiveAttributes, NATURES, TYPES, ABILITIES, xpForLevel, HEADLINE, headlineAttributes, resolveSpecies, POINTS_PER_LEVEL, schemePreferences, evolutionReady, nextEvolution, pointCost } from '../../data/monsters.js';
import { TRAITS } from '../../data/species.js';
import { speciesSheet, silhouette } from './dex.js';
import { buildDepthChart, depthOrder, GROUP_SLOTS, OFFENSE_GROUPS, DEFENSE_GROUPS, borrowedSlots } from '../../franchise/roster.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { ROLE_LABEL, STAFF_ROLES, PLAYBOOKS, TRAINING_FOCI, STAFF, staffById } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { ensureStats, POSITION_COLUMNS, STAT_GROUPS, GROUP_LABEL, groupsWithData, withDerived, statLine, monsterLine, monsterSeasons } from '../../franchise/stats.js';
import { attributeHelps, statMeaning, POSITION_NAME } from '../../data/stat-guide.js';
import { openStatGuide, openStatMeaning } from '../stat-guide.js';
import { playCardSvg } from '../play-art.js';
import { openTypeChart } from '../type-chart.js';
import { careerSectionHtml, careerActions, fullProfile } from '../career-ui.js';
import { honoursCount } from '../../franchise/career-profile.js';
import { typeProfile } from '../../data/type-chart.js';
import { captainBadge, partnershipStripHtml, captainWarning, benchNote } from '../captains-ui.js';
import { evolutionSnapshot, evolutionReport } from '../../franchise/evolution-report.js';
import { openEvolutionScene } from '../evolution-scene.js';

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };

/** Four headline bars for a monster. */
export function headlineHtml(m, opts) {
  const h = headlineAttributes(m, opts);
  return `<div class="headline">${HEADLINE.map((x) => `<div class="hl" title="${esc(x.help)}"><span class="hl-v ${h[x.key] >= 70 ? 'hi' : h[x.key] < 50 ? 'lo' : ''}">${h[x.key]}</span><span class="hl-l">${x.label}</span><div class="bar ${h[x.key] < 45 ? 'bad' : h[x.key] < 60 ? 'warn' : ''}"><i style="width:${h[x.key]}%"></i></div></div>`).join('')}</div>`;
}
/** Captain Partnerships (GDD §27.4B): starters now, and a gentle note when a captain just left the starting lineup. */
const starters = (f) => new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
function benchToast(f, before) { const now = starters(f); const out = [...before].find((id) => !now.has(id) && benchNote(f, id)); if (out) toast(benchNote(f, out), 'info', 3600); return !!out; }
export function registerRosterScreens(Router, app) {
  let side = 'offense';
  let noticesOpen = true;
  let depthDetails = false; // depth chart: show contract end and nature on every line // the roster's notice strip: tap the header to fold it
  let view = 'field';
  const GROUP_LABEL = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', OL: 'Offensive line', DL: 'Defensive line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };
  /** "More details" on the depth chart (GDD §21.5): the year the contract ends (amber in its final year) and the nature. */
  function detailHtml(f, m) {
    const ends = m.contract?.ends; const last = ends != null && ends <= f.season.year; const nat = NATURES[m.nature]?.name || m.nature;
    return `<span class="dc-more"><span class="${last ? 'dc-expiring' : ''}">${ends != null ? `${last ? '⏳' : '📄'} ${yearOf(ends)}` : 'no contract'}</span> · ${esc(nat)}</span>`;
  }
  /** With details on: who is in a final year, by position, and the natures on the roster (for scouting). */
  function depthSummary(f) {
    const expiring = f.roster.filter((m) => m.contract && m.contract.ends <= f.season.year);
    const byPos = {}; for (const m of expiring) (byPos[m.position] ||= []).push(m.name);
    const nat = {}; for (const m of f.roster) nat[m.nature] = (nat[m.nature] || 0) + 1;
    const natList = Object.entries(nat).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(NATURES[k]?.name || k)} ${n}`).join(' · ');
    return `<div class="panel tight" style="margin-bottom:8px"><div><b>⏳ Final year (${yearOf(f.season.year)}):</b> ${expiring.length ? Object.entries(byPos).map(([p, ns]) => `<b>${p}</b> ${ns.map(esc).join(', ')}`).join(' · ') : '<span class="dim">nobody</span>'}</div><div class="dim" style="margin-top:4px"><b>Natures:</b> ${natList}</div><div class="dim" style="margin-top:4px;font-size:12px">Each line: 📄 contract runs through that year · ⏳ final year · nature.</div></div>`;
  }
  /** Depth chart: every position in order, starters first, with the slot each monster fills and thin spots flagged. */
  function depthHtml(f) {
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
    const slotOf = Object.fromEntries(Object.entries(chart).filter(([, id]) => id).map(([s, id]) => [id, s]));
    const borrowed = borrowedSlots(f.roster, chart);
    const group = (g) => {
      const order = depthOrder(f.roster, f.depth, g); const slots = GROUP_SLOTS[g];
      const healthy = order.filter((m) => !m.injury).length;
      const thin = healthy < slots.length ? 'bad' : healthy === slots.length ? 'warn' : '';
      const rows = order.map((m, i) => { const sl = slotOf[m.id]; const sec = m.position !== g; const fit = F.fitFor(f, m)?.fits; return `<div class="dc-row ${m.injury ? 'out' : ''} ${fit ? 'fit' : ''}"><span class="dc-n">${i + 1}</span>${monsterSprite(m, 26)}<div class="dc-mid"><button class="dc-name" data-action="monster" data-id="${m.id}">${F.monsterNotices(f, m.id).length ? '<span class="notice-dot"></span>' : ''}${m.cornerstone ? '<span class="cs-star" title="Cornerstone">★</span> ' : ''}${esc(m.name)}${sec ? ' <span class="dim">(' + m.position + ')</span>' : ''}</button>${captainBadge(f, m.id)}${depthDetails ? detailHtml(f, m) : ''}</div><span class="dc-tag">${m.fatigue >= 30 && !m.injury ? `<span class="fat-pip ${m.fatigue >= 60 ? 'bad' : 'warn'}" title="Fatigue ${m.fatigue}%" aria-label="Fatigue ${m.fatigue}%">${m.fatigue}%</span>` : ''}${m.injury ? `<span class="chip bad">OUT ${m.injury.weeks}w</span>` : sl ? `<span class="chip ${OFFENSE_PACKAGE_SLOTS.includes(sl) || DEFENSE_PACKAGE_SLOTS.includes(sl) ? '' : 'accent'}">${sl}</span>` : '<span class="dim dc-backup">backup</span>'}</span><span class="ovr">${monsterOverall(m, { slotPosition: g })}</span><span class="dc-move"><button class="btn small" data-action="up" data-g="${g}" data-id="${m.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} up">▲</button><button class="btn small" data-action="down" data-g="${g}" data-id="${m.id}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} down">▼</button></span></div>`; }).join('');
      return `<div class="dc-group ${thin}"><div class="dc-head"><b>${g}</b> <span class="dim">${GROUP_LABEL[g]} · ${slots.length} slot${slots.length === 1 ? '' : 's'}</span>${thin === 'bad' ? '<span class="chip bad">Short-handed</span>' : thin === 'warn' ? '<span class="chip warn">No backup</span>' : ''}</div>${rows || '<p class="dim" style="margin:6px 0">Nobody at this position.</p>'}${borrowed.filter((b) => GROUP_SLOTS[g].includes(b.slot)).map((b) => `<p class="dim" style="margin:4px 0 0;${b.legal ? '' : 'color:var(--bad)'}">${b.legal ? `↪ ${b.slot} has no monster of its own: <b>${esc(b.name)}</b> (${esc(b.position)}${b.outOfPosition ? ', secondary position, 1.75× injury risk' : ''}) fills in when that package is called.` : `⚠️ ${b.slot} has no monster of its own and nobody with ${positionOf(b.slot)} as a primary or secondary position to fill it: plays using that package are unavailable.`} Sign a ${g} on Tuesday.</p>`).join('')}</div>`;
    };
    return `<p class="dim">Order each position. The top healthy monsters start; if one is hurt, the next in line steps in. ▲▼ to reorder.</p>
      <h3>Offense</h3>${OFFENSE_GROUPS.map(group).join('')}<h3>Defense</h3>${DEFENSE_GROUPS.map(group).join('')}<h3>Special teams</h3>${group('K')}`;
  }

  Router.registerScreen('roster', {
    title: 'Roster', back: false,
    render({ f }) {
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
      const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
      const rows = side === 'offense' ? [['WR1', 'LG', 'RG', 'TE', 'WR2'], ['QB'], ['RB']] : [['DL1', 'DL2'], ['LB1', 'LB2'], ['CB1', 'FS', 'CB2']];
      const pkgRow = side === 'offense' ? OFFENSE_PACKAGE_SLOTS : DEFENSE_PACKAGE_SLOTS;
      const slot = (s) => { const m = byId[chart[s]]; const sec = m && positionOf(s) !== m.position; const fit = m && F.fitFor(f, m)?.fits; return `<button class="slot ${m?.injury ? 'injured' : ''} ${sec ? 'secondary' : ''} ${fit ? 'fit' : ''}" data-action="slot" data-slot="${s}" aria-label="${s}: ${m ? esc(m.name) : 'empty'}"><span class="pos">${s}</span>${m ? captainBadge(f, m.id) : ''}${m ? monsterSprite(m, 30) : '<span style="height:30px"></span>'}<span class="nm">${m && F.monsterNotices(f, m.id).length ? '<span class="notice-dot"></span>' : ''}${m?.cornerstone ? '<span class="cs-star" title="Cornerstone">★</span> ' : ''}${m ? esc(m.name) : 'EMPTY'}</span><span class="ov">${m ? monsterOverall(m, { slotPosition: positionOf(s) }) : '·'}${sec ? '*' : ''}</span></button>`; };
      const starters = new Set(Object.values(chart));
      const reserves = f.roster.filter((m) => !starters.has(m.id)).sort((a, b) => monsterOverall(b) - monsterOverall(a));
      const cap = F.salarySummary(f);
      const room = Math.abs(cap.remaining) >= 10000 ? `${Math.round(cap.remaining / 1000)}k` : fmtMoney(cap.remaining);
      const viewBar = `<div class="seg roster-bar" role="tablist"><button class="btn small ${view === 'field' ? 'primary' : ''}" data-action="view" data-v="field" role="tab">Lineup</button><button class="btn small ${view === 'depth' ? 'primary' : ''}" data-action="view" data-v="depth" role="tab">Depth</button><span class="chip roster-room ${cap.remaining < 0 ? 'bad' : ''}" title="Roster size and cap room">${f.roster.length}/${F.ROSTER_MAX} · ${room} room</span></div>`;
      const notes = F.noticesFor(f, 'roster');
      const noticeStrip = notes.length ? `<div class="notices ${noticesOpen ? 'open' : ''}"><button class="notices-head row between" data-action="notices" aria-expanded="${noticesOpen}"><b>🔔 ${notes.length} thing${notes.length === 1 ? '' : 's'} need${notes.length === 1 ? 's' : ''} you</b><span class="dim">${noticesOpen ? '▾ hide' : '▸ show'}</span></button>${noticesOpen ? `<div class="stack" style="gap:4px;margin-top:6px">${notes.map((n) => `<button class="notice-row" data-action="monster" data-id="${n.id}"><span class="notice-dot"></span><span class="grow">${esc(n.text)}</span><span class="dim">${n.kind === 'evolve' ? 'evolve →' : 'spend →'}</span></button>`).join('')}</div>${notes.some((n) => n.kind === 'points') ? '<button class="btn small block" data-action="autospend" style="margin-top:6px">Trainer: spend all points</button>' : ''}` : ''}</div>` : '';
      const bestBtn = `<button class="btn small" data-action="bestlineup" title="Order every position by overall, best first">⚡ Best lineup</button>`;
      const detailBtn = `<button class="btn small ${depthDetails ? 'on' : ''}" data-action="depthdetails" title="Contract end year and nature on every line" aria-pressed="${depthDetails}">${depthDetails ? '▾ Details' : '▸ Details'}</button>`;
      const tools = (...b) => `<div class="row roster-tools">${b.join('')}</div>`;
      if (view === 'depth') return viewBar + noticeStrip + tools(bestBtn, detailBtn) + (depthDetails ? depthSummary(f) : '') + depthHtml(f) + `<div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">💰 Contracts</button><button class="btn block" data-action="go" data-screen="staff">👥 Staff</button></div>`;
      return `${viewBar}${noticeStrip}<div class="row between" style="margin-bottom:8px;gap:6px"><div class="row"><button class="btn small ${side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">Offense</button><button class="btn small ${side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">Defense</button></div>${bestBtn}</div>
        <div class="depth" style="margin-bottom:12px">${rows.map((r) => `<div class="depth-row" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(slot).join('')}</div>`).join('')}</div>
        ${schemeLockHtml(f, side)}
        ${partnershipStripHtml(f, side, F.captainStatus(f, side))}
        <p class="dim">Your seven starters. Tap a slot to change the starter. ★ = your cornerstone. * = playing out of position (−10%). <span class="fit-key">Gold outline</span> = fits your coordinators' schemes.</p>
        <h3>Package slots</h3><div class="depth" style="margin-bottom:4px"><div class="depth-row" style="grid-template-columns:repeat(${pkgRow.length},1fr)">${pkgRow.map(slot).join('')}</div></div>
        <p class="dim">${pkgRow.map((s) => `<b>${s}</b> comes in for ${PACKAGE_SLOT_USE[s]} plays`).join(' · ')}, replacing a starter for that snap.</p>
        <h3>Reserves & specialists (${reserves.length})</h3><div class="list">${reserves.map((m) => monsterRow(m, chart)).join('') || '<p class="dim">No reserves.</p>'}</div>
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">💰 Contracts</button><button class="btn block" data-action="go" data-screen="staff">👥 Staff</button></div>`;
    },
    mount(root) { delegate(root, { depthdetails: () => { depthDetails = !depthDetails; Router.render(); }, bestlineup: async () => { if (!(await confirmSheet('Reorder every position by overall rating, best first? Your manual depth-chart changes are replaced.', { title: 'Best lineup', okLabel: 'Reorder' }))) return; F.autoDepth(app.f); app.save(); toast('Depth chart set: best overall first at every position.', 'good'); Router.render(); }, notices: () => { noticesOpen = !noticesOpen; Router.render(); }, autospend: () => { const r = F.autoSpendAllPoints(app.f); app.save(); toast(r.spent ? `Spent ${r.spent} points on ${r.monsters} monsters.` : 'No points to spend.', 'good'); Router.render(); }, view: (el) => { view = el.dataset.v; Router.render(); }, up: (el) => { F.moveDepth(app.f, el.dataset.g, el.dataset.id, -1); app.save(); Router.render(); }, down: (el) => { const before = starters(app.f); F.moveDepth(app.f, el.dataset.g, el.dataset.id, 1); app.save(); benchToast(app.f, before); Router.render(); }, side: (el) => { side = el.dataset.v; Router.render(); }, slot: (el) => Router.go('assign', { slot: el.dataset.slot }), monster: (el) => Router.go('monster', { id: el.dataset.id }), go: (el) => Router.go(el.dataset.screen) }); },
  });
  function monsterRow(m, chart = {}) {
    const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
    const fit = F.fitFor(app.f, m)?.fits;
    return `<button class="item ${fit ? 'fit' : ''}" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${typeGlyph(m.type)} ${F.monsterNotices(app.f, m.id).length ? '<span class="notice-dot" title="Needs your attention"></span>' : ''}${m.cornerstone ? '<span class="chip cornerstone" title="Your cornerstone: the monster you built this club around">★ CORNERSTONE</span>' : ''}${fit ? ' <span class="chip fitchip">Fits scheme</span>' : ''}${(m.points || 0) > 0 ? ` <span class="chip warn">✨ ${m.points} pts</span>` : ''}${evolutionReady(m) ? ' <span class="chip good">⬆ ready to evolve</span>' : ''}${(() => { const n = honoursCount(m); return n ? ` <span class="chip honours" title="${n} honour${n === 1 ? '' : 's'} in his trophy case">🏆${n > 1 ? ` ${n}` : ''}</span>` : ''; })()}</div><div class="sub">${m.position}${slot ? ' · ' + slot : ''} · L${m.level} · ${m.injury ? `<span style="color:var(--bad)">${m.injury.severity} injury, ${m.injury.weeks} wk</span>` : m.fatigue >= 60 ? '<span style="color:var(--warn)">fatigued</span>' : 'healthy'}</div></div><span class="mini-hl mono">${(() => { const h = headlineAttributes(m); return `${h.speed}·${h.power}·${h.hands}·${h.smarts}`; })()}</span><span class="ovr ${monsterOverall(m) >= 65 ? 'hi' : ''}">${monsterOverall(m)}</span></button>`;
  }

  Router.registerScreen('assign', {
    title: ({ params }) => `Assign ${params.slot}`,
    render({ f, params }) {
      const slot = params.slot; const need = positionOf(slot);
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
      const eligible = f.roster.filter((m) => canPlay(m.position, slot)).sort((a, b) => monsterOverall(b, { slotPosition: need }) - monsterOverall(a, { slotPosition: need }));
      return `<p class="muted">Eligible monsters for <b>${slot}</b> (${need}). Secondary positions play at −10% and carry <b>1.75×</b> the injury risk, only primary or secondary positions may fill a slot.</p><div class="list">${eligible.map((m) => `<div class="item static"><div class="row" style="flex:1" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)}${chart[slot] === m.id ? ' <span class="chip accent">current</span>' : ''}</div><div class="sub">${m.position}${m.position !== need ? ' (secondary)' : ''} · ${m.injury ? `<span style="color:var(--bad)">injured ${m.injury.weeks} wk</span>` : `fatigue ${m.fatigue}%`}</div></div><span class="ovr">${monsterOverall(m, { slotPosition: need })}</span></div><button class="btn small primary" data-action="assign" data-id="${m.id}" ${m.injury || chart[slot] === m.id ? 'disabled' : ''}>Start</button></div>`).join('')}</div>
        ${f.depth?.[positionOf(slot)] ? '<button class="btn block" data-action="auto" style="margin-top:8px">Let the coach order this position</button>' : ''}`;
    },
    mount(root, ctx) { delegate(root, { assign: (el) => { const before = starters(app.f); const r = F.assignSlot(app.f, ctx.params.slot, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); if (!benchToast(app.f, before)) toast('Lineup updated.', 'good'); Router.back(); }, auto: () => { F.assignSlot(app.f, ctx.params.slot, null); app.save(); Router.back(); }, monster: (el) => Router.go('monster', { id: el.dataset.id }) }); },
  });

  /** Browse order for Previous / Next on a monster page (v42.4.1): the depth chart's order, offense then defense then the kicker,
   * each monster once at its own position, so Next walks the roster the way the Depth view lists it. */
  const browseOrder = (f) => { const seen = new Set(); const out = [];
    for (const g of [...OFFENSE_GROUPS, ...DEFENSE_GROUPS, 'K']) for (const m of depthOrder(f.roster, f.depth, g)) if (m.position === g && !seen.has(m.id)) { seen.add(m.id); out.push(m); }
    for (const m of f.roster) if (!seen.has(m.id)) out.push(m);
    return out; };
  const browseNav = (f, id) => { const list = browseOrder(f); const i = list.findIndex((m) => m.id === id); if (i < 0 || list.length < 2) return '';
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    return `<nav class="mon-nav" aria-label="Browse the roster"><button class="mon-nav-btn" data-action="mon-go" data-id="${prev.id}" aria-label="Previous: ${esc(prev.name)}"><span aria-hidden="true">‹</span><span class="nm">${esc(prev.name)}</span></button><span class="mon-nav-pos">${i + 1} / ${list.length}<span class="dim"> · ${esc(list[i].position)}</span></span><button class="mon-nav-btn next" data-action="mon-go" data-id="${next.id}" aria-label="Next: ${esc(next.name)}"><span class="nm">${esc(next.name)}</span><span aria-hidden="true">›</span></button></nav>`; };
  /** Career stage and retirement outlook (GDD §52.6): observable estimates only; legendary monsters never age. */
  const outlookHtml = (f, m) => { const o = F.monsterOutlook(f, m); if (!o) return '<div class="muted">Ageless: never declines or retires</div>'; const [a, b, c] = o.window;
    return `<div class="muted">Career stage: <span class="chip stage-${o.key}">${esc(o.label)}</span> · retirement outlook <b class="${o.outlook === 'high' ? 'bad' : o.outlook === 'moderate' ? 'warn' : ''}">${esc(o.outlookLabel)}</b> <span class="dim" title="An estimate from age, position, durability, visible decline and injury history: careers vary.">(likely ${a}–${c}, around ${b})</span></div>`; };
  Router.registerScreen('monster', {
    title: ({ f, params }) => f.roster.find((m) => m.id === params.id)?.name || 'Monster',
    render({ f, params }) {
      const m = f.roster.find((x) => x.id === params.id); if (!m) return '<p>Not found.</p>';
      const base = m.attributes, eff = effectiveAttributes(m); const nature = NATURES[m.nature]; const ab = m.ability ? ABILITIES[m.ability] : null;
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
      return `${browseNav(f, m.id)}<div class="panel"><div class="row">${monsterSprite(m, 72)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)}${m.cornerstone ? ' <span class="chip cornerstone">★ CORNERSTONE</span>' : ''}</div><div class="muted">${m.position}${slot ? ' · starts at ' + slot : ' · reserve'} · ${esc(m.type)} type · age ${m.age}</div><div class="muted">Level ${m.level} · XP ${m.xp}/${xpForLevel(m.level)} · potential ${m.potential}</div>${outlookHtml(f, m)}</div><span class="ovr hi" style="font-size:26px">${monsterOverall(m)}</span></div>
        <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.round(m.xp / xpForLevel(m.level) * 100)}%"></i></div>
        <div class="row between muted"><span>Fatigue ${m.fatigue}%</span><span>${m.injury ? `<b style="color:var(--bad)">${esc(m.injury.severity)} ${esc(m.injury.type)} · ${m.injury.weeks} wk</b>` : 'Healthy'}</span><span>${fmtMoney(m.salary)}/yr${m.contract ? ` · through ${yearOf(m.contract.ends)}` : ''}</span></div>
        ${m.contract && m.contract.ends <= f.season.year ? `<p class="dim" style="margin:4px 0 0">Contract year: renewal in the offseason. Today's ask would be about ${fmtMoney(F.renewalAsk(m).ask)}/yr.</p>` : ''}
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn small" data-action="career-jump">🏆 Career</button><button class="btn small ghost" data-action="release">Release ${esc(m.name)}</button><span class="dim" style="font-size:12px">frees ${fmtMoney(m.salary)}/yr · back to the ${esc(F.homeRegion(m))} pool</span></div></div>
        ${bioHtml(f, m)}
        ${(() => { F.monsterTimeline(f, m); return careerSectionHtml(f, fullProfile(f, m, 'roster'), { domId: 'timeline' }); })()}
        <button class="btn block cp-open" data-career="${esc(m.id)}">📖 Full career profile ›</button>
        <div class="panel"><b>Nature: ${esc(nature.name)}</b><p class="muted" style="margin:2px 0">${esc(nature.behavior)}${nature.up ? ` <span class="chip good">+10% ${ATTR_LABEL[nature.up]}</span> <span class="chip bad">−10% ${ATTR_LABEL[nature.down]}</span>` : ''}</p>
          <div class="row between" style="gap:6px"><b>Type: ${esc(m.type)}</b><button class="btn small" data-action="typechart" data-type="${esc(m.type)}">🔺 Type Chart</button></div><p class="muted" style="margin:2px 0">${esc(TYPES[m.type].blurb)}. ${(() => { const p = typeProfile(m.type); return `Strong against ${p.strong.join(' and ')}; weak against ${p.weak.join(' and ')}.`; })()}</p>
          ${ab ? `<b>Signature ability: ${esc(ab.name)}</b><p class="muted" style="margin:2px 0">${esc(ab.text)}</p><button class="btn small see-it" data-see-it="${resolveSpecies(m).id}">▶ See it</button>` : (() => { const sp = resolveSpecies(m); return sp.ability ? `<b>Signature ability: ${esc(sp.ability.name)}</b><p class="muted" style="margin:2px 0">${esc(sp.ability.text)}</p><button class="btn small see-it" data-see-it="${sp.id}">▶ See it</button>` : `<b>Species trait: ${esc(TRAITS[sp.trait]?.name)}</b><p class="muted" style="margin:2px 0">${esc(TRAITS[sp.trait]?.text)}</p>`; })()}
          ${evolutionHtml(m)}
          <button class="btn small" data-action="species" style="margin-top:6px">📖 ${esc(resolveSpecies(m).name)} in the Beast Dex</button></div>
        <h3>Ratings</h3>${headlineHtml(m)}${schemeHtml(f, m)}
        ${(m.points || 0) > 0 && F.pointsLocked(f) ? `<div class="panel points"><b>🔒 ${m.points} attribute point${m.points === 1 ? '' : 's'} banked, frozen</b><div class="dim">Points are frozen until every contract decision is made. Banked points already count toward what a monster asks for.</div></div>` : ''}${(m.points || 0) > 0 && !F.pointsLocked(f) ? `<div class="panel points"><b>✨ ${m.points} attribute point${m.points === 1 ? '' : 's'} to spend</b><div class="dim">Level-ups bank ${POINTS_PER_LEVEL} points. Tap + next to an attribute that helps this position (capped at potential ${m.potential}).${ATTRIBUTES.some((k) => pointCost(m, k) > 1) ? ' Past his peak, a + can cost more than one point (shown on the button): physical attributes first, then technique.' : ''}</div><button class="btn small" data-action="autospendone" style="margin-top:6px">Let the trainer spend them</button></div>` : ''}
        <details style="margin-top:8px" ${(m.points || 0) > 0 && !F.pointsLocked(f) ? 'open' : ''}><summary class="muted" style="cursor:pointer">All twelve attributes</summary><div class="attr-grid" style="margin-top:8px">${ATTRIBUTES.map((k) => `<div class="attr ${attributeHelps(m.position, k) ? '' : 'no-help'}" title="${esc(statMeaning(m.position, k))}" style="${attributeHelps(m.position, k) ? '' : 'opacity:.45'}"><button class="linkish" data-action="statinfo" data-attr="${k}" style="all:unset;cursor:pointer;text-decoration:underline dotted">${ATTR_LABEL[k]}</button><div class="bar ${eff[k] < 45 ? 'bad' : eff[k] < 60 ? 'warn' : ''}"><i style="width:${eff[k]}%"></i></div><span class="v" style="color:${eff[k] > base[k] ? 'var(--good)' : eff[k] < base[k] ? 'var(--bad)' : 'inherit'}">${eff[k]}</span>${(m.points || 0) > 0 && !F.pointsLocked(f) ? (attributeHelps(m.position, k) ? (() => { const c = pointCost(m, k); return `<button class="btn small plus" data-action="spend" data-attr="${k}" ${base[k] >= m.potential ? 'disabled title="At potential"' : c > (m.points || 0) ? `disabled title="Costs ${c} points at age ${m.age}"` : c > 1 ? `title="Costs ${c} points at age ${m.age}: an ageing body is harder to build"` : ''} aria-label="Add 1 to ${ATTR_LABEL[k]}${c > 1 ? ` for ${c} points` : ''}">+${c > 1 ? `<small class="cost">${c}</small>` : ''}</button>`; })() : '<span class="btn small plus" style="visibility:hidden">+</span>') : ''}</div>`).join('')}</div>
        <p class="dim" style="margin-top:8px">Green/red values include nature, fatigue and position penalties. Faded attributes do nothing for a ${esc(POSITION_NAME[m.position]?.toLowerCase() || m.position)}, so points cannot go there. Tap a name to see what it does.</p>
        <button class="btn small" data-action="statguide" style="margin-top:4px">📊 What the stats mean for a ${esc(POSITION_NAME[m.position]?.toLowerCase() || m.position)}</button></details>
        ${monsterStatsHtml(m, f)}`;
    },
    mount(root, ctx) {
      delegate(root, {
        ...careerActions({ f: () => app.f, profile: () => fullProfile(app.f, app.f.roster.find((x) => x.id === ctx.params.id), 'roster'), monster: () => app.f.roster.find((x) => x.id === ctx.params.id), domId: 'timeline', go: (s, prm) => Router.go(s, prm) }),
        'mon-go': (el) => Router.go('monster', { id: el.dataset.id }, { replace: true }), // replace: Back still returns to where you came from
        'career-jump': () => root.querySelector('#timeline')?.scrollIntoView({ block: 'start', behavior: app.f?.settings?.reducedMotion ? 'auto' : 'smooth' }),
        typechart: (el) => openTypeChart(el.dataset.type),
        species: () => { const m = ctx.f.roster.find((x) => x.id === ctx.params.id); if (!m) return; const sp = resolveSpecies(m); sheet(speciesSheet(sp, ctx.f), { title: sp.name }); },
        autospendone: () => { F.autoSpendAllPoints(app.f, { only: ctx.params.id }); app.save(); Router.render(); },
        release: async () => { const m = app.f.roster.find((x) => x.id === ctx.params.id); if (!m) return; if (!(await confirmSheet(`Release ${m.name}? They go back to the ${F.homeRegion(m)} free-agent pool, where any club can sign them. This cannot be undone.${captainWarning(app.f, m.id)}`, { title: 'Release monster', okLabel: 'Release', danger: true }))) return; const r = F.releaseMonster(app.f, m.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${m.name} released.`, 'info'); Router.go('roster', {}, { reset: true }); },
        evolve: async (el) => { // GDD §51: commit the evolution once and save, then present it full-screen (the scene only shows the report)
          const m = app.f.roster.find((x) => x.id === ctx.params.id); if (!m || document.querySelector('.evo-scene')) return; if (el) el.disabled = true;
          const before = evolutionSnapshot(m); const beforeMon = { ...m, stage: before.stage };
          const r = F.evolveMonster(app.f, m.id); if (!r.ok) { if (el) el.disabled = false; toast(r.reason, 'bad'); return; }
          app.save();
          const report = evolutionReport(before, evolutionSnapshot(m), { year: app.f.season.year, week: app.f.season.week, club: app.f.club });
          const s = app.f.settings || {};
          openEvolutionScene({ report, beforeMon, afterMon: m, settings: { reducedMotion: s.reducedMotion || app.settings?.reducedMotion, screenShake: s.screenShake, evoSound: s.evoSound }, onSound: (on) => { app.f.settings.evoSound = on; app.save(); }, onClose: () => Router.render() });
        },
        statinfo: (el) => { const m = app.f.roster.find((x) => x.id === ctx.params.id); if (m) openStatMeaning(m.position, el.dataset.attr, m.name); },
        statguide: () => { const m = app.f.roster.find((x) => x.id === ctx.params.id); openStatGuide(m?.position || 'QB'); },
        spend: (el) => { const r = F.spendAttributePoint(app.f, ctx.params.id, el.dataset.attr); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
        'stat-scope': (el) => { const v = el.dataset.v; statView.scope = /^\d+$/.test(v) ? Number(v) : v; Router.render(); }, 'stat-bucket': (el) => { statView.bucket = el.dataset.v; Router.render(); }, 'stat-group': (el) => { statView.group = el.dataset.v; Router.render(); },
      });
    },
  });

  let contractSort = 'salary';
  const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  function sortedForContracts(f) {
    const r = f.roster.slice();
    if (contractSort === 'position') return r.sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || monsterOverall(b) - monsterOverall(a));
    if (contractSort === 'ovr') return r.sort((a, b) => monsterOverall(b) - monsterOverall(a));
    if (contractSort === 'ends') return r.sort((a, b) => (a.contract?.ends || 0) - (b.contract?.ends || 0) || b.salary - a.salary);
    if (contractSort === 'value') return r.sort((a, b) => (b.salary / Math.max(1, monsterOverall(b))) - (a.salary / Math.max(1, monsterOverall(a)))); // most overpaid first
    return r.sort((a, b) => b.salary - a.salary);
  }
  Router.registerScreen('contracts', {
    title: 'Salary & Contracts',
    render({ f }) {
      const c = F.salarySummary(f);
      const usage = Math.min(100, Math.round(c.total / c.cap * 100));
      return `<div class="panel"><div class="muted" style="font-size:12px">TOTAL ANNUAL SALARY · MONSTERS + STAFF</div><div style="font-size:24px;font-weight:900">${fmtMoney(c.total)}</div><div class="bar ${c.over ? 'bad' : usage > 90 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${usage}%"></i></div><div class="row between muted"><span>Cap ${fmtMoney(c.cap)}</span><span>Monsters ${fmtMoney(c.monsters)} · Staff ${fmtMoney(c.staff)}</span></div><p style="color:${c.over ? 'var(--bad)' : 'var(--good)'};margin:6px 0 0"><b>${c.over ? 'Over by ' + fmtMoney(-c.remaining) + ', games locked' : 'Room: ' + fmtMoney(c.remaining)}</b></p></div>
        <p class="muted">Released monsters go back to their home region's free-agent pool, where any club can sign them. Keep at least ${F.ROSTER_MIN} and one of every position.</p>
        <div class="seg" style="margin-bottom:8px">${[['salary', 'Salary'], ['position', 'Position'], ['ovr', 'OVR'], ['ends', 'Contract end'], ['value', 'Cost per OVR']].map(([k, l]) => `<button class="btn small ${contractSort === k ? 'primary' : ''}" data-action="csort" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="list">${sortedForContracts(f).map((m) => `<div class="item static">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="sub">${m.position} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr${m.contract ? ` · through ${yearOf(m.contract.ends)}` : ''}</div></div><button class="btn small danger" data-action="release" data-id="${m.id}" data-name="${esc(m.name)}">Release</button></div>`).join('')}</div>`;
    },
    mount(root) { delegate(root, { csort: (el) => { contractSort = el.dataset.v; Router.render(); }, release: async (el) => { if (!(await confirmSheet(`Release ${el.dataset.name}? This cannot be undone.${captainWarning(app.f, el.dataset.id)}`, { title: 'Release monster', okLabel: 'Release', danger: true }))) return; const r = F.releaseMonster(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${el.dataset.name} released.`); Router.render(); } }); },
  });

  Router.registerScreen('staff', {
    title: 'Coaching Staff',
    render({ f }) {
      const al = F.schemeAlignment(f); const rf = F.rosterFit(f);
      const fitLine = (x, label) => `<div class="row between"><span>${label}: <b>${x.fit} of ${x.total}</b> starters fit ${esc(x.scheme)}</span><span class="${x.total && x.fit / x.total < 0.5 ? 'chip bad' : 'chip good'}">${x.total ? Math.round(100 * x.fit / x.total) : 0}%</span></div>`;
      return `<div class="panel"><b>Team identity</b><div class="muted">OC scheme fit <b>${al.offense}</b>/100 · DC scheme fit <b>${al.defense}</b>/100, alignment adds (or costs) a little awareness for every starter.</div>
        <div style="margin-top:8px"><b>Roster fit</b>${fitLine(rf.offense, 'Offense')}${fitLine(rf.defense, 'Defense')}<div class="dim" style="font-size:12px;margin-top:4px">Under half fitting is a problem: change the roster, or change the coordinator to one whose scheme fits the roster. Firing mid-season leaves the rest of their salary on this season's books.</div></div></div>
        <div class="list">${STAFF_ROLES.map((r) => { const c = F.staffMember(f, r); if (!c) return `<div class="item static"><div class="grow"><div class="name">${ROLE_LABEL[r]}</div><div class="sub">Vacant</div></div></div>`; return `<div class="item static">${portraitSprite(c.id, 40)}<div class="grow"><div class="name">${esc(c.name)} <span class="chip">${esc(c.style)}</span></div><div class="sub">${ROLE_LABEL[r]} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div><div class="sub">${esc(c.strength)}</div></div>${c.role.includes('coordinator') ? `<button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">Plays</button>` : ''}<button class="btn small" data-action="interview" data-role="${r}">Replace</button></div>`; }).join('')}</div>
        <p class="dim" style="margin-top:8px">Replacing a staff member is immediate; the new salary must fit under the cap${f.deadCap ? ` (dead money this season: ${fmtMoney(f.deadCap)})` : ''}.</p>`;
    },
    mount(root) { delegate(root, {
      plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name }); },
      interview: (el) => {
        const role = el.dataset.role; const current = app.f.staff[role];
        const { el: sh, close } = sheet(`<div class="stack">${STAFF.filter((c) => c.role === role).map((c) => { const after = F.salarySummary(app.f, c.salary - (staffById(current)?.salary || 0)); return `<div class="panel"><div class="row">${portraitSprite(c.id, 40)}<div class="grow"><b>${esc(c.name)}</b> <span class="chip">${esc(c.style)}</span>${c.id === current ? ' <span class="chip accent">current</span>' : ''}<div class="muted">${esc(c.strength)} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div></div></div><div class="row between" style="margin-top:6px"><span class="muted">Room after: <b style="color:${after.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(after.remaining)}</b></span><button class="btn small primary" data-hire="${c.id}" ${c.id === current || after.over ? 'disabled' : ''}>Hire</button></div></div>`; }).join('')}</div>`, { title: 'Candidates · ' + ROLE_LABEL[role] });
        sh.addEventListener('click', (e) => { const id = e.target.closest('[data-hire]')?.dataset.hire; if (!id) return; const r = F.replaceStaff(app.f, id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); close(); toast('Staff updated.', 'good'); Router.render(); });
      },
    }); },
  });
}

// ---------------------------------------------------------------- monster stats (GDD §16)
const statView = { scope: 'season', bucket: 'reg', group: null };
const GROUP_OF_POSITION = { QB: 'passing', RB: 'rushing', WR: 'receiving', TE: 'receiving', OL: 'blocking', DL: 'pass_rush', LB: 'pass_rush', CB: 'coverage', S: 'coverage', K: 'kicking' };
function statTable(line, position, group) {
  const colPos = group ? STAT_GROUPS[group][0] : position;
  const cols = POSITION_COLUMNS[group && group === GROUP_OF_POSITION[position] ? position : colPos] || POSITION_COLUMNS[colPos] || POSITION_COLUMNS.WR;
  const d = withDerived(line);
  const cell = (k) => { const v = d[k]; return v == null ? '<span class="dim">·</span>' : v; };
  return `<div class="stat-table"><table><thead><tr>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody><tr>${cols.map(([k]) => `<td>${cell(k)}</td>`).join('')}</tr></tbody></table></div>`;
}
/**
 * Statistics for one monster (revised 2026-10-22): two filters that work together, Season (this season, each past season,
 * career) × Game type (regular season, playoffs, both), plus the game log; a group switch when it has stats in several roles.
 * Every empty combination says why it is empty.
 */
export function monsterStatsHtml(m, f) {
  const s = ensureStats(m, f.season.year); const pos = m.position; const curYear = s.season.year ?? f.season.year;
  const seasons = monsterSeasons(m, f.season.year); const years = seasons.filter((y) => y !== curYear);
  const scope = statView.scope === 'log' ? 'log' : statView.scope === 'career' ? 'career' : (years.includes(statView.scope) ? statView.scope : 'season');
  const bucket = ['reg', 'post', 'all'].includes(statView.bucket) ? statView.bucket : 'reg';
  const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const seasonBar = seg([['season', 'This season'], ...years.map((y) => [y, yearOf(y)]), ['career', 'Career'], ['log', 'Game log']], 'stat-scope', scope);
  const groupBar = (line) => { const gs = groupsWithData(line); const def = GROUP_OF_POSITION[pos]; const all = [...new Set([def, ...gs])].filter(Boolean); if (all.length <= 1) { statView.group = null; return ''; } const cur = statView.group && all.includes(statView.group) ? statView.group : def; statView.group = cur; return `<div class="seg wrap" style="margin:6px 0">${all.map((g) => `<button class="btn small ${cur === g ? 'primary' : ''}" data-action="stat-group" data-v="${g}">${esc(GROUP_LABEL[g] || g)}</button>`).join('')}</div>`; };
  let body = '';
  if (scope === 'log') {
    const log = s.log.slice().reverse();
    body = log.length ? `<div class="list">${log.map((g) => `<div class="item static"><div class="grow"><div class="name">${yearOf(g.year)} wk ${g.week}${g.playoff ? ' <span class="chip">playoffs</span>' : ''} ${g.home ? 'vs' : '@'} ${esc(g.opp)} <span class="${g.won ? 'good' : 'bad'}">${g.won ? 'W' : 'L'} ${g.score}</span></div><div class="sub">${esc(statLine(g.line)) || 'no stats'}</div></div></div>`).join('')}</div><p class="dim">The last ${Math.min(20, log.length)} games played.</p>` : '<p class="dim empty">No games played yet.</p>';
  } else {
    const typeBar = seg([['reg', 'Regular season'], ['post', 'Playoffs'], ['all', 'Both']], 'stat-bucket', bucket);
    const line = monsterLine(m, scope === 'season' ? curYear : scope, bucket);
    const label = scope === 'career' ? `Career · ${seasons.length} season${seasons.length === 1 ? '' : 's'}` : scope === 'season' ? `${yearOf(curYear)} (this season)` : yearOf(scope);
    const typeLabel = bucket === 'reg' ? 'regular season' : bucket === 'post' ? 'playoffs' : 'regular season + playoffs';
    const why = scope === 'career' ? (bucket === 'post' ? 'No playoff games in this career yet.' : 'No games in this career yet.') : scope === 'season' ? (bucket === 'post' ? (f.season.playoffs ? 'No playoff games for this monster this season.' : 'The playoffs have not started this season.') : `No games yet in ${yearOf(curYear)}.`) : (bucket === 'post' ? `No playoff games in ${yearOf(scope)}.` : `No games in ${yearOf(scope)}.`);
    body = `${typeBar}${Object.keys(line).length ? `${groupBar(line)}<div class="dim stat-caption">${esc(label)} · ${typeLabel} · ${line.games || 0} game${line.games === 1 ? '' : 's'}</div>${statTable(line, pos, statView.group)}` : `<p class="dim empty">${why}</p>`}`;
  }
  return `<h3>Statistics</h3>${seasonBar}${body}
    <p class="dim" style="margin-top:6px">${m.yearsPro === 0 ? 'Rookie season' : `${m.yearsPro ?? '?'} season${m.yearsPro === 1 ? '' : 's'} pro`} · rates come from the totals shown.</p>`;
}

/** Scheme section (GDD §20.6): which schemes this monster suits, best first, with the club's own scheme marked. */
function schemeHtml(f, m) {
  const pref = schemePreferences(m); if (!pref) return '';
  const mine = F.fitFor(f, m); const club = F.clubSchemes ? F.clubSchemes(f) : null; const ours = club ? club[pref.side] : null;
  const rows = pref.schemes.map((x) => `<div class="scheme-row ${x.fits ? 'fits' : ''} ${x.scheme === ours ? 'ours' : ''}"><span class="scheme-name">${x.fits ? '✦' : '·'} ${esc(x.label)}${x.scheme === ours ? ' <span class="chip accent">your scheme</span>' : ''}</span><span class="dim">${x.fits ? `fits (+${x.margin})` : `${x.margin} short`} · wants ${x.keys.join(' & ')}</span></div>`).join('');
  const head = mine?.fits ? `<p class="fit-key" style="margin:2px 0 6px">✦ Fits your ${esc(pref.side)} scheme.</p>` : pref.best?.fits ? `<p class="muted" style="margin:2px 0 6px">Prefers <b>${esc(pref.best.label)}</b>; not a fit for your ${esc(pref.side)} scheme.</p>` : `<p class="muted" style="margin:2px 0 6px">No scheme fits yet, closest is <b>${esc(pref.best.label)}</b>.</p>`;
  return `<div class="panel scheme"><b>Scheme</b>${head}<div class="stack" style="gap:2px">${rows}</div></div>`;
}
/** Evolution block: stage, the next form as a silhouette until it happens, and the Evolve button once the level is reached. */
function evolutionHtml(m) {
  const sp = resolveSpecies(m); if (!sp.evolution.length) return '';
  const st = m.stage || 0; const next = nextEvolution(m); const ready = evolutionReady(m);
  const stageText = st ? `Stage ${st + 1} of ${sp.evolution.length + 1} (evolved from ${esc(sp.name)}).` : 'Base form.';
  if (!next) return `<b>Evolution</b><p class="muted" style="margin:2px 0">${stageText} Fully evolved.</p>`;
  return `<b>Evolution</b><div class="row evo-row" style="margin:4px 0 2px;align-items:center;gap:10px">${monsterSprite(m, 40)}<span class="dim">→</span><span class="evo-next ${ready ? 'evo-ready' : ''}">${silhouette(next.spec, 48)}</span><div class="grow"><div class="muted">${stageText}</div><div class="${ready ? 'good' : 'dim'}">${ready ? `<b>Ready to evolve!</b> Level ${next.level} reached.` : `Next form at level ${next.level}${m.level >= next.level - 2 ? ', soon' : ''}. ???`}</div></div></div>${ready ? `<button class="btn primary block evolve-btn" data-action="evolve" style="margin-top:6px"><span class="evo-spark" aria-hidden="true">✨</span> Evolve ${esc(m.name)} <span class="evo-spark" aria-hidden="true">✨</span></button>` : ''}`;
}

/** Bio card (GDD §20.2): where the monster is from, how long it has been pro, and every club on its record. */
function bioHtml(f, m) {
  const b = F.monsterBio(f, m);
  const span = (s) => s.regional ? `${s.to - s.from + 1} season${s.to - s.from ? 's' : ''}` : s.to == null ? (s.from >= (f.season?.year || 1) ? `${yearOf(s.from)}` : `${yearOf(s.from)}-now`) : s.from === s.to ? `${yearOf(s.from)}` : `${yearOf(s.from)}-${yearOf(s.to)}`;
  const why = (s) => s.regional ? 'before the league' : s.current ? '' : s.reason === 'walked' ? 'left as a free agent' : s.reason === 'commissioner' ? 'cut by the commissioner' : s.reason === 'released' ? 'released' : s.reason === 'signed' ? 'signed from the pool' : s.reason || '';
  return `<div class="panel bio"><div class="row between"><b>Bio</b><span class="dim">${b.rookie ? 'Rookie season' : `${b.yearsPro} season${b.yearsPro === 1 ? '' : 's'} pro`}</span></div>
    <div class="muted">Born in <b>${esc(b.birthplace)}</b>${m.drafted ? ` · drafted #${m.drafted.overall} (round ${m.drafted.round}) in the ${yearOf(m.drafted.year)} class${m.drafted.club !== f.club ? ` by ${esc(m.drafted.club)}` : ''}` : m.rookie != null ? ` · ${yearOf(m.rookie)} draft class` : ''}</div>
    <div class="stints">${b.stints.map((s) => `<div class="stint ${s.current ? 'current' : ''}"><span class="when">${span(s)}</span><span class="club">${esc(s.club)}</span><span class="dim">${esc(why(s))}</span></div>`).join('')}</div></div>`;
}

/** Scheme lock banner (GDD §17): all starters on this side fit the coordinator's scheme → the side plays with an edge on Sunday. */
function schemeLockHtml(f, side) {
  const lock = F.schemeLock(f); const x = lock.fit[side]; const on = side === 'offense' ? lock.offense : lock.defense;
  if (on) return `<div class="scheme-lock"><b>✦ SCHEME LOCKED · ${side}</b><div>All ${x.total} ${side === 'offense' ? 'offensive' : 'defensive'} starters fit <b>${esc(x.scheme)}</b>. Every ${side === 'offense' ? 'offensive' : 'defensive'} play has a better chance of succeeding on Sunday: +${F.SCHEME_LOCK_EDGE} to every starter's core ratings while the lock holds.</div></div>`;
  if (x.total && x.total - x.fit <= 2) return `<p class="dim" style="margin:4px 0">✦ ${x.fit} of ${x.total} starters fit ${esc(x.scheme)}. ${x.total - x.fit} more and the scheme locks for a Sunday edge.</p>`;
  return '';
}
