// Roster: depth chart, reserves, monster details, slot assignment,
// contracts and the coaching staff room.

import { esc, delegate, toast, sheet, confirmSheet, fmtMoney } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, ATTRIBUTES, positionOf, canPlay } from '../../data/personnel.js';
import { monsterOverall, effectiveAttributes, NATURES, TYPES, ABILITIES, xpForLevel } from '../../data/monsters.js';
import { buildDepthChart } from '../../franchise/roster.js';
import { monsterSprite, typeGlyph, portraitSprite } from '../pixel-monster.js';
import { ROLE_LABEL, STAFF_ROLES, PLAYBOOKS, TRAINING_FOCI } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { playCardSvg } from '../play-art.js';

const ATTR_LABEL = { speed: 'Speed', agility: 'Agility', strength: 'Strength', awareness: 'Awareness', catching: 'Catching', arm: 'Arm', accuracy: 'Accuracy', blocking: 'Blocking', tackling: 'Tackling', coverage: 'Coverage', durability: 'Durability', kicking: 'Kicking' };
const ATTR_HELP = { speed: 'Top speed, pursuit, separation', agility: 'Acceleration, cuts, jukes, catch radius', strength: 'Blocking, shedding, tackling, breaking tackles', awareness: 'Reads, lane choice, reaction, angles', catching: 'Catches, contested balls, ball security', arm: 'Throw velocity and range', accuracy: 'Throw precision', blocking: 'Engagement strength', tackling: 'Finishing tackles and sacks', coverage: 'Staying with receivers, breaking on the ball', durability: 'Injury and fatigue resistance', kicking: 'Kick distance and accuracy' };

export function registerRosterScreens(Router, app) {
  let side = 'offense';

  Router.registerScreen('roster', {
    title: 'Roster', back: false,
    render({ f }) {
      const chart = buildDepthChart(f.roster, f.lineupManual);
      const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
      const rows = side === 'offense' ? [['WR1', 'LG', 'C', 'RG', 'WR2'], ['WR3', 'QB', 'TE'], ['RB']] : [['DL1', 'DL3', 'DL2'], ['LB1', 'LB2'], ['CB1', 'FS', 'SS', 'CB2']];
      const slot = (s) => { const m = byId[chart[s]]; const sec = m && positionOf(s) !== m.position; return `<button class="slot ${m?.injury ? 'injured' : ''} ${sec ? 'secondary' : ''}" data-action="slot" data-slot="${s}" aria-label="${s}: ${m ? esc(m.name) : 'empty'}"><span class="pos">${s}</span>${m ? monsterSprite(m, 30) : '<span style="height:30px"></span>'}<span class="nm">${m ? esc(m.name) : 'EMPTY'}</span><span class="ov">${m ? monsterOverall(m, { slotPosition: positionOf(s) }) : '—'}${sec ? '*' : ''}</span></button>`; };
      const starters = new Set(Object.values(chart));
      const reserves = f.roster.filter((m) => !starters.has(m.id)).sort((a, b) => monsterOverall(b) - monsterOverall(a));
      const cap = F.salarySummary(f);
      return `<div class="row between" style="margin-bottom:8px"><div class="row"><button class="btn small ${side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">Offense</button><button class="btn small ${side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">Defense</button></div><span class="chip">${f.roster.length}/26 · ${fmtMoney(cap.remaining)} room</span></div>
        <div class="depth" style="margin-bottom:12px">${rows.map((r) => `<div class="depth-row" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(slot).join('')}</div>`).join('')}</div>
        <p class="dim">Tap a slot to change the starter. * = playing out of position (−10%). Slots in the two-WR/RB packages rotate automatically by play.</p>
        <h3>Reserves & specialists (${reserves.length})</h3><div class="list">${reserves.map((m) => monsterRow(m, chart)).join('') || '<p class="dim">No reserves.</p>'}</div>
        <div class="grid2" style="margin-top:12px"><button class="btn block" data-action="go" data-screen="contracts">💰 Contracts</button><button class="btn block" data-action="go" data-screen="staff">👥 Staff</button></div>`;
    },
    mount(root) { delegate(root, { side: (el) => { side = el.dataset.v; Router.render(); }, slot: (el) => Router.go('assign', { slot: el.dataset.slot }), monster: (el) => Router.go('monster', { id: el.dataset.id }), go: (el) => Router.go(el.dataset.screen) }); },
  });
  function monsterRow(m, chart = {}) {
    const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
    return `<button class="item" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)} ${typeGlyph(m.type)} ${m.cornerstone ? '<span class="chip accent">★</span>' : ''}</div><div class="sub">${m.position}${slot ? ' · ' + slot : ''} · L${m.level} · ${m.injury ? `<span style="color:var(--bad)">${m.injury.severity} injury, ${m.injury.weeks} wk</span>` : m.fatigue >= 60 ? '<span style="color:var(--warn)">fatigued</span>' : 'healthy'}</div></div><span class="ovr ${monsterOverall(m) >= 65 ? 'hi' : ''}">${monsterOverall(m)}</span></button>`;
  }

  Router.registerScreen('assign', {
    title: ({ params }) => `Assign ${params.slot}`,
    render({ f, params }) {
      const slot = params.slot; const need = positionOf(slot);
      const chart = buildDepthChart(f.roster, f.lineupManual);
      const eligible = f.roster.filter((m) => canPlay(m.position, slot)).sort((a, b) => monsterOverall(b, { slotPosition: need }) - monsterOverall(a, { slotPosition: need }));
      return `<p class="muted">Eligible monsters for <b>${slot}</b> (${need}). Secondary positions play at −10%.</p><div class="list">${eligible.map((m) => `<div class="item static"><div class="row" style="flex:1" data-action="monster" data-id="${m.id}">${monsterSprite(m, 36)}<div class="grow"><div class="name">${esc(m.name)}${chart[slot] === m.id ? ' <span class="chip accent">current</span>' : ''}</div><div class="sub">${m.position}${m.position !== need ? ' (secondary)' : ''} · ${m.injury ? `<span style="color:var(--bad)">injured ${m.injury.weeks} wk</span>` : `fatigue ${m.fatigue}%`}</div></div><span class="ovr">${monsterOverall(m, { slotPosition: need })}</span></div><button class="btn small primary" data-action="assign" data-id="${m.id}" ${m.injury || chart[slot] === m.id ? 'disabled' : ''}>Start</button></div>`).join('')}</div>
        ${f.lineupManual[slot] ? '<button class="btn block" data-action="auto" style="margin-top:8px">Let the coach decide this slot</button>' : ''}`;
    },
    mount(root, ctx) { delegate(root, { assign: (el) => { const r = F.assignSlot(app.f, ctx.params.slot, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast('Lineup updated.', 'good'); Router.back(); }, auto: () => { F.assignSlot(app.f, ctx.params.slot, null); app.save(); Router.back(); }, monster: (el) => Router.go('monster', { id: el.dataset.id }) }); },
  });

  Router.registerScreen('monster', {
    title: ({ f, params }) => f.roster.find((m) => m.id === params.id)?.name || 'Monster',
    render({ f, params }) {
      const m = f.roster.find((x) => x.id === params.id); if (!m) return '<p>Not found.</p>';
      const base = m.attributes, eff = effectiveAttributes(m); const nature = NATURES[m.nature]; const ab = m.ability ? ABILITIES[m.ability] : null;
      const chart = buildDepthChart(f.roster, f.lineupManual); const slot = Object.entries(chart).find(([, id]) => id === m.id)?.[0];
      return `<div class="panel"><div class="row">${monsterSprite(m, 72)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(m.name)} ${m.cornerstone ? '★' : ''}</div><div class="muted">${m.position}${slot ? ' · starts at ' + slot : ' · reserve'} · ${esc(m.type)} type · age ${m.age}</div><div class="muted">Level ${m.level} · XP ${m.xp}/${xpForLevel(m.level)} · potential ${m.potential}</div></div><span class="ovr hi" style="font-size:26px">${monsterOverall(m)}</span></div>
        <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.round(m.xp / xpForLevel(m.level) * 100)}%"></i></div>
        <div class="row between muted"><span>Fatigue ${m.fatigue}%</span><span>${m.injury ? `<b style="color:var(--bad)">${esc(m.injury.severity)} ${esc(m.injury.type)} — ${m.injury.weeks} wk</b>` : 'Healthy'}</span><span>${fmtMoney(m.salary)}/yr</span></div></div>
        <div class="panel"><b>Nature: ${esc(nature.name)}</b><p class="muted" style="margin:2px 0">${esc(nature.behavior)}${nature.up ? ` <span class="chip good">+10% ${ATTR_LABEL[nature.up]}</span> <span class="chip bad">−10% ${ATTR_LABEL[nature.down]}</span>` : ''}</p>
          <b>Type: ${esc(m.type)}</b><p class="muted" style="margin:2px 0">${esc(TYPES[m.type].blurb)}.</p>
          ${ab ? `<b>Signature ability: ${esc(ab.name)}</b><p class="muted" style="margin:2px 0">${esc(ab.text)}</p>` : '<p class="dim">No signature ability.</p>'}</div>
        <h3>Attributes (effective)</h3><div class="attr-grid">${ATTRIBUTES.map((k) => `<div class="attr" title="${esc(ATTR_HELP[k])}"><span>${ATTR_LABEL[k]}</span><div class="bar ${eff[k] < 45 ? 'bad' : eff[k] < 60 ? 'warn' : ''}"><i style="width:${eff[k]}%"></i></div><span class="v" style="color:${eff[k] > base[k] ? 'var(--good)' : eff[k] < base[k] ? 'var(--bad)' : 'inherit'}">${eff[k]}</span></div>`).join('')}</div>
        <p class="dim" style="margin-top:8px">Green/red values include nature, fatigue and position penalties. Every attribute affects the simulation.</p>
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
        <div class="list">${STAFF_ROLES.map((r) => { const c = F.staffMember(f, r); if (!c) return `<div class="item static"><div class="grow"><div class="name">${ROLE_LABEL[r]}</div><div class="sub">Vacant</div></div></div>`; return `<div class="item static">${portraitSprite(c.id, 40)}<div class="grow"><div class="name">${esc(c.name)} <span class="chip">${esc(c.style)}</span></div><div class="sub">${ROLE_LABEL[r]} · OVR ${c.overall} · ${fmtMoney(c.salary)}/yr</div><div class="sub">${esc(c.strength)}</div></div>${c.role.includes('coordinator') ? `<button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">Plays</button>` : ''}</div>`; }).join('')}</div>`;
    },
    mount(root) { delegate(root, { plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name }); } }); },
  });
}
