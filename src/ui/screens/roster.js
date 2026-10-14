// Roster: depth chart, reserves, monster details, slot assignment,
// contracts and the coaching staff room.

import { esc, delegate, toast, sheet, confirmSheet, fmtMoney } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, OFFENSE_PACKAGE_SLOTS, DEFENSE_PACKAGE_SLOTS, PACKAGE_SLOT_USE, ATTRIBUTES, positionOf, canPlay } from '../../data/personnel.js';
import { monsterOverall, effectiveAttributes, NATURES, TYPES, ABILITIES, xpForLevel, HEADLINE, headlineAttributes } from '../../data/monsters.js';
import { buildDepthChart, depthOrder, GROUP_SLOTS, OFFENSE_GROUPS, DEFENSE_GROUPS } from '../../franchise/roster.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { ROLE_LABEL, STAFF_ROLES, PLAYBOOKS, TRAINING_FOCI, STAFF, staffById } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { playCardSvg } from '../play-art.js';

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };
const ATTR_HELP = { speed: 'Top speed, pursuit, separation', agility: 'Acceleration, cuts, jukes, catch radius', strength: 'Blocking, shedding, tackling, breaking tackles', awareness: 'Reads, lane choice, reaction, angles', catching: 'Catches, contested balls, ball security', arm: 'Throw velocity and range', accuracy: 'Throw precision', blocking: 'Engagement strength', tackling: 'Finishing tackles and sacks', coverage: 'Staying with receivers, breaking on the ball', durability: 'Injury and fatigue resistance', kicking: 'Kick distance and accuracy' };

/** Four headline bars for a monster. */
export function headlineHtml(m, opts) {
  const h = headlineAttributes(m, opts);
  return `<div class="headline">${HEADLINE.map((x) => `<div class="hl" title="${esc(x.help)}"><span class="hl-v ${h[x.key] >= 70 ? 'hi' : h[x.key] < 50 ? 'lo' : ''}">${h[x.key]}</span><span class="hl-l">${x.label}</span><div class="bar ${h[x.key] < 45 ? 'bad' : h[x.key] < 60 ? 'warn' : ''}"><i style="width:${h[x.key]}%"></i></div></div>`).join('')}</div>`;
}
export function registerRosterScreens(Router, app) {
  let side = 'offense';
  let view = 'field';
  const GROUP_LABEL = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', OL: 'Offensive line', DL: 'Defensive line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };
  /** Depth chart: every position in order, starters first, with the slot each monster fills and thin spots flagged. */
  function depthHtml(f) {
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
    const slotOf = Object.fromEntries(Object.entries(chart).filter(([, id]) => id).map(([s, id]) => [id, s]));
    const group = (g) => {
      const order = depthOrder(f.roster, f.depth, g); const slots = GROUP_SLOTS[g];
      const healthy = order.filter((m) => !m.injury).length;
      const thin = healthy < slots.length ? 'bad' : healthy === slots.length ? 'warn' : '';
      const rows = order.map((m, i) => { const sl = slotOf[m.id]; const sec = m.position !== g; const fit = F.fitFor(f, m)?.fits; return `<div class="dc-row ${m.injury ? 'out' : ''} ${fit ? 'fit' : ''}"><span class="dc-n">${i + 1}</span>${monsterSprite(m, 26)}<button class="dc-name" data-action="monster" data-id="${m.id}">${esc(m.name)}${sec ? ' <span class="dim">(' + m.position + ')</span>' : ''}</button><span class="dc-tag">${m.injury ? `<span class="chip bad">OUT ${m.injury.weeks}w</span>` : sl ? `<span class="chip ${OFFENSE_PACKAGE_SLOTS.includes(sl) || DEFENSE_PACKAGE_SLOTS.includes(sl) ? '' : 'accent'}">${sl}</span>` : '<span class="dim">backup</span>'}</span><span class="ovr">${monsterOverall(m, { slotPosition: g })}</span><span class="dc-move"><button class="btn small" data-action="up" data-g="${g}" data-id="${m.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} up">▲</button><button class="btn small" data-action="down" data-g="${g}" data-id="${m.id}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} down">▼</button></span></div>`; }).join('');
      return `<div class="dc-group ${thin}"><div class="dc-head"><b>${g}</b> <span class="dim">${GROUP_LABEL[g]} · ${slots.length} slot${slots.length === 1 ? '' : 's'}</span>${thin === 'bad' ? '<span class="chip bad">Short-handed</span>' : thin === 'warn' ? '<span class="chip warn">No backup</span>' : ''}</div>${rows || '<p class="dim" style="margin:6px 0">Nobody at this position.</p>'}</div>`;
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
      const slot = (s) => { const m = byId[chart[s]]; const sec = m && positionOf(s) !== m.position; const fit = m && F.fitFor(f, m)?.fits; return `<button class="slot ${m?.injury ? 'injured' : ''} ${sec ? 'secondary' : ''} ${fit ? 'fit' : ''}" data-action="slot" data-slot="${s}" aria-label="${s}: ${m ? esc(m.name) : 'empty'}"><span class="pos">${s}</span>${m ? monsterSprite(m, 30) : '<span style="height:30px"></span>'}<span class="nm">${m ? esc(m.name) : 'EMPTY'}</span><span class="ov">${m ? monsterOverall(m, { slotPosition: positionOf(s) }) : '—'}${sec ? '*' : ''}</span></button>`; };
      const starters = new Set(Object.values(chart));
      const reserves = f.roster.filter((m) => !starters.has(m.id)).sort((a, b) => monsterOverall(b) - monsterOverall(a));
      const cap = F.salarySummary(f);
      const viewBar = `<div class="seg" role="tablist" style="margin-bottom:8px"><button class="btn small ${view === 'field' ? 'primary' : ''}" data-action="view" data-v="field" role="tab">Lineup</button><button class="btn small ${view === 'depth' ? 'primary' : ''}" data-action="view" data-v="depth" role="tab">Depth chart</button><span class="chip" style="margin-left:auto">${f.roster.length}/26 · ${fmtMoney(cap.remaining)} room</span></div>`;
      if (view === 'depth') return viewBar + depthHtml(f) + `<div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">💰 Contracts</button><button class="btn block" data-action="go" data-screen="staff">👥 Staff</button></div>`;
      return `${viewBar}<div class="row between" style="margin-bottom:8px"><div class="row"><button class="btn small ${side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">Offense</button><button class="btn small ${side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">Defense</button></div></div>
        <div class="depth" style="margin-bottom:12px">${rows.map((r) => `<div class="depth-row" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(slot).join('')}</div>`).join('')}</div>
        <p class="dim">Your seven starters. Tap a slot to change the starter. * = playing out of position (−10%). <span class="fit-key">Gold outline</span> = fits your coordinators' schemes.</p>
        <h3>Package slots</h3><div class="depth" style="margin-bottom:4px"><div class="depth-row" style="grid-template-columns:repeat(${pkgRow.length},1fr)">${pkgRow.map(slot).join('')}</div></div>
        <p class="dim">${pkgRow.map((s) => `<b>${s}</b> comes in for ${PACKAGE_SLOT_USE[s]} plays`).join(' · ')}, replacing a starter for that snap.</p>
        <h3>Reserves & specialists (${reserves.length})</h3><div class="list">${reserves.map((m) => monsterRow(m, chart)).join('') || '<p class="dim">No reserves.</p>'}</div>
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">💰 Contracts</button><button class="btn block" data-action="go" data-screen="staff">👥 Staff</button></div>`;
    },
    mount(root) { delegate(root, { view: (el) => { view = el.dataset.v; Router.render(); }, up: (el) => { F.moveDepth(app.f, el.dataset.g, el.dataset.id, -1); app.save(); Router.render(); }, down: (el) => { F.moveDepth(app.f, el.dataset.g, el.dataset.id, 1); app.save(); Router.render(); }, side: (el) => { side = el.dataset.v; Router.render(); }, slot: (el) => Router.go('assign', { slot: el.dataset.slot }), monster: (el) => Router.go('monster', { id: el.dataset.id }), go: (el) => Router.go(el.dataset.screen) }); },
  });
  function monsterRow(m, chart = {}) {
    const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
    const fit = F.fitFor(app.f, m)?.fits;
    return `<button class="item ${fit ? 'fit' : ''}" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${typeGlyph(m.type)} ${m.cornerstone ? '<span class="chip accent">★</span>' : ''}${fit ? ' <span class="chip fitchip">Fits scheme</span>' : ''}</div><div class="sub">${m.position}${slot ? ' · ' + slot : ''} · L${m.level} · ${m.injury ? `<span style="color:var(--bad)">${m.injury.severity} injury, ${m.injury.weeks} wk</span>` : m.fatigue >= 60 ? '<span style="color:var(--warn)">fatigued</span>' : 'healthy'}</div></div><span class="mini-hl mono">${(() => { const h = headlineAttributes(m); return `${h.speed}·${h.power}·${h.hands}·${h.smarts}`; })()}</span><span class="ovr ${monsterOverall(m) >= 65 ? 'hi' : ''}">${monsterOverall(m)}</span></button>`;
  }

  Router.registerScreen('assign', {
    title: ({ params }) => `Assign ${params.slot}`,
    render({ f, params }) {
      const slot = params.slot; const need = positionOf(slot);
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
      const eligible = f.roster.filter((m) => canPlay(m.position, slot)).sort((a, b) => monsterOverall(b, { slotPosition: need }) - monsterOverall(a, { slotPosition: need }));
      return `<p class="muted">Eligible monsters for <b>${slot}</b> (${need}). Secondary positions play at −10%.</p><div class="list">${eligible.map((m) => `<div class="item static"><div class="row" style="flex:1" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)}${chart[slot] === m.id ? ' <span class="chip accent">current</span>' : ''}</div><div class="sub">${m.position}${m.position !== need ? ' (secondary)' : ''} · ${m.injury ? `<span style="color:var(--bad)">injured ${m.injury.weeks} wk</span>` : `fatigue ${m.fatigue}%`}</div></div><span class="ovr">${monsterOverall(m, { slotPosition: need })}</span></div><button class="btn small primary" data-action="assign" data-id="${m.id}" ${m.injury || chart[slot] === m.id ? 'disabled' : ''}>Start</button></div>`).join('')}</div>
        ${f.depth?.[positionOf(slot)] ? '<button class="btn block" data-action="auto" style="margin-top:8px">Let the coach order this position</button>' : ''}`;
    },
    mount(root, ctx) { delegate(root, { assign: (el) => { const r = F.assignSlot(app.f, ctx.params.slot, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Lineup updated.', 'good'); Router.back(); }, auto: () => { F.assignSlot(app.f, ctx.params.slot, null); app.save(); Router.back(); }, monster: (el) => Router.go('monster', { id: el.dataset.id }) }); },
  });

  Router.registerScreen('monster', {
    title: ({ f, params }) => f.roster.find((m) => m.id === params.id)?.name || 'Monster',
    render({ f, params }) {
      const m = f.roster.find((x) => x.id === params.id); if (!m) return '<p>Not found.</p>';
      const base = m.attributes, eff = effectiveAttributes(m); const nature = NATURES[m.nature]; const ab = m.ability ? ABILITIES[m.ability] : null;
      const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
      return `<div class="panel"><div class="row">${monsterSprite(m, 72)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)} ${m.cornerstone ? '★' : ''}</div><div class="muted">${m.position}${slot ? ' · starts at ' + slot : ' · reserve'} · ${esc(m.type)} type · age ${m.age}</div><div class="muted">Level ${m.level} · XP ${m.xp}/${xpForLevel(m.level)} · potential ${m.potential}</div></div><span class="ovr hi" style="font-size:26px">${monsterOverall(m)}</span></div>
        <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.round(m.xp / xpForLevel(m.level) * 100)}%"></i></div>
        <div class="row between muted"><span>Fatigue ${m.fatigue}%</span><span>${m.injury ? `<b style="color:var(--bad)">${esc(m.injury.severity)} ${esc(m.injury.type)} — ${m.injury.weeks} wk</b>` : 'Healthy'}</span><span>${fmtMoney(m.salary)}/yr</span></div></div>
        <div class="panel"><b>Nature: ${esc(nature.name)}</b><p class="muted" style="margin:2px 0">${esc(nature.behavior)}${nature.up ? ` <span class="chip good">+10% ${ATTR_LABEL[nature.up]}</span> <span class="chip bad">−10% ${ATTR_LABEL[nature.down]}</span>` : ''}</p>
          <b>Type: ${esc(m.type)}</b><p class="muted" style="margin:2px 0">${esc(TYPES[m.type].blurb)}.</p>
          ${ab ? `<b>Signature ability: ${esc(ab.name)}</b><p class="muted" style="margin:2px 0">${esc(ab.text)}</p>` : '<p class="dim">No signature ability.</p>'}</div>
        <h3>Ratings</h3>${headlineHtml(m)}${(() => { const fit = F.fitFor(f, m); return fit ? `<p class="${fit.fits ? 'fit-key' : 'dim'}" style="margin:6px 0 0">${fit.fits ? '✦ Fits your scheme' : 'Not a scheme fit'} · ${esc(fit.why)}</p>` : ''; })()}
        <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">All twelve attributes</summary><div class="attr-grid" style="margin-top:8px">${ATTRIBUTES.map((k) => `<div class="attr" title="${esc(ATTR_HELP[k])}"><span>${ATTR_LABEL[k]}</span><div class="bar ${eff[k] < 45 ? 'bad' : eff[k] < 60 ? 'warn' : ''}"><i style="width:${eff[k]}%"></i></div><span class="v" style="color:${eff[k] > base[k] ? 'var(--good)' : eff[k] < base[k] ? 'var(--bad)' : 'inherit'}">${eff[k]}</span></div>`).join('')}</div>
        <p class="dim" style="margin-top:8px">Green/red values include nature, fatigue and position penalties. Every attribute affects the simulation.</p></details>
        <h3>Career</h3><div class="kv"><b>Games</b><span>${m.stats.games}</span><b>Yards</b><span>${m.stats.yards}</span><b>TD</b><span>${m.stats.td}</span><b>Catches</b><span>${m.stats.catches}</span><b>Tackles</b><span>${m.stats.tackles}</span><b>Sacks</b><span>${m.stats.sacks}</span><b>INT</b><span>${m.stats.int}</span></div>`;
    },
  });

  Router.registerScreen('contracts', {
    title: 'Salary & Contracts',
    render({ f }) {
      const c = F.salarySummary(f);
      const usage = Math.min(100, Math.round(c.total / c.cap * 100));
      return `<div class="panel"><div class="muted" style="font-size:12px">TOTAL ANNUAL SALARY · MONSTERS + STAFF</div><div style="font-size:24px;font-weight:900">${fmtMoney(c.total)}</div><div class="bar ${c.over ? 'bad' : usage > 90 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${usage}%"></i></div><div class="row between muted"><span>Cap ${fmtMoney(c.cap)}</span><span>Monsters ${fmtMoney(c.monsters)} · Staff ${fmtMoney(c.staff)}</span></div><p style="color:${c.over ? 'var(--bad)' : 'var(--good)'};margin:6px 0 0"><b>${c.over ? 'Over by ' + fmtMoney(-c.remaining) + ' — games locked' : 'Room: ' + fmtMoney(c.remaining)}</b></p></div>
        <p class="muted">Releasing a monster is permanent. Keep at least 16 and one of every position.</p>
        <div class="list">${f.roster.slice().sort((a, b) => b.salary - a.salary).map((m) => `<div class="item static">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)}</div><div class="sub">${m.position} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr</div></div><button class="btn small danger" data-action="release" data-id="${m.id}" data-name="${esc(m.name)}">Release</button></div>`).join('')}</div>`;
    },
    mount(root) { delegate(root, { release: async (el) => { if (!(await confirmSheet(`Release ${el.dataset.name}? This cannot be undone.`, { title: 'Release monster', okLabel: 'Release', danger: true }))) return; const r = F.releaseMonster(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${el.dataset.name} released.`); Router.render(); } }); },
  });

  Router.registerScreen('staff', {
    title: 'Coaching Staff',
    render({ f }) {
      const al = F.schemeAlignment(f);
      return `<div class="panel"><b>Team identity</b><div class="muted">OC scheme fit <b>${al.offense}</b>/100 · DC scheme fit <b>${al.defense}</b>/100 — alignment adds (or costs) a little awareness for every starter.</div></div>
        <div class="list">${STAFF_ROLES.map((r) => { const c = F.staffMember(f, r); if (!c) return `<div class="item static"><div class="grow"><div class="name">${ROLE_LABEL[r]}</div><div class="sub">Vacant</div></div></div>`; return `<div class="item static">${portraitSprite(c.id, 40)}<div class="grow"><div class="name">${esc(c.name)} <span class="chip">${esc(c.style)}</span></div><div class="sub">${ROLE_LABEL[r]} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div><div class="sub">${esc(c.strength)}</div></div>${c.role.includes('coordinator') ? `<button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">Plays</button>` : ''}<button class="btn small" data-action="interview" data-role="${r}">Replace</button></div>`; }).join('')}</div>
        <p class="dim" style="margin-top:8px">Replacing a staff member is immediate; the new salary must fit under the cap.</p>`;
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
