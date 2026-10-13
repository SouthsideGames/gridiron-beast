// Commissioner's office: owner creation, club choice, rival reveal,
// cornerstone monsters, then the five staff hires.

import { esc, delegate, toast, sheet } from '../dom.js';
import { STARTER_CLUBS, DIVISIONS, RIVAL_GMS, divisionOf, conferenceFor, TEAM_META } from '../../data/league.js';
import { CORNERSTONES, NATURES, ABILITIES, TYPES } from '../../data/monsters.js';
import { STAFF, ROLE_LABEL, STAFF_ROLES } from '../../data/staff.js';
import { createFranchise, hireStaff, nextStaffRole, salarySummary, staffMember, schemeAlignment } from '../../franchise/franchise.js';
import { portraitSprite, monsterSprite } from '../pixel-monster.js';
import { playCardSvg } from '../play-art.js';
import { PLAYBOOKS } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { fmtMoney } from '../dom.js';

const STEPS = ['name', 'look', 'home', 'club', 'rival', 'offense', 'defense', 'confirm'];
const LINES = {
  name: 'Ah, there you are! I knew our new franchise owner would be here soon. What should I call you?',
  look: 'Good. Now let me get a good look at you.',
  home: 'And where are you from?',
  club: 'The top franchises aren’t for sale. These four clubs finished at the bottom of the Challenger League and need an owner willing to rebuild. Pick your opportunity.',
  rival: 'One more thing. There’s another new GM in your division. I wonder which of you builds a champion first.',
  offense: 'Before you hire coaches, choose the offensive monster who will lead your rebuild.',
  defense: 'Now choose your defensive cornerstone.',
  confirm: 'Welcome to the league. Your front office is empty — go hire a staff.',
};

export function registerOnboardingScreens(Router, app) {
  let draft = null;
  const fresh = () => ({ step: 0, first: '', last: '', gender: 'Female', portrait: 0, hometown: '', club: null, rival: null, offense: null, defense: null });

  Router.registerScreen('onboarding', {
    title: "Commissioner's Office", back: false, tabs: false,
    render({ params }) {
      if (!draft || params.fresh) { draft = fresh(); params.fresh = false; }
      const step = STEPS[draft.step];
      let body = '';
      if (step === 'name') body = `<label class="field">First name<input id="first" maxlength="18" value="${esc(draft.first)}" autocomplete="given-name"></label><label class="field">Last name<input id="last" maxlength="18" value="${esc(draft.last)}" autocomplete="family-name"></label>`;
      if (step === 'look') body = `<div class="row" style="margin-bottom:8px"><button class="btn ${draft.gender === 'Female' ? 'primary' : ''}" data-action="gender" data-v="Female">Female</button><button class="btn ${draft.gender === 'Male' ? 'primary' : ''}" data-action="gender" data-v="Male">Male</button><button class="btn ${draft.gender === 'Nonbinary' ? 'primary' : ''}" data-action="gender" data-v="Nonbinary">Non-binary</button></div><div class="grid3">${[0, 1, 2, 3, 4, 5].map((i) => `<button class="choice center ${draft.portrait === i ? 'selected' : ''}" data-action="portrait" data-v="${i}">${portraitSprite(`${draft.gender}|${i}`, 56)}</button>`).join('')}</div>`;
      if (step === 'home') body = `<label class="field">Hometown<input id="home" maxlength="28" value="${esc(draft.hometown)}" placeholder="City you are from"></label>`;
      if (step === 'club') body = `<div class="stack">${STARTER_CLUBS.map((c) => `<button class="choice ${draft.club === c.name ? 'selected' : ''}" data-action="club" data-v="${esc(c.name)}"><span class="name" style="color:${TEAM_META[c.name].color}">${esc(c.name)}</span><span class="muted">${esc(divisionOf(c.name))} Division · ${esc(conferenceFor(divisionOf(c.name)))} Conference · last season ${c.record}</span></button>`).join('')}</div>`;
      if (step === 'rival') { const r = draft.rival; body = `<div class="panel center" style="border-color:#a855f7"><div style="font-size:32px">⚔️</div><h2>YOUR RIVAL HAS ARRIVED</h2><div style="font-size:18px;font-weight:800;color:${TEAM_META[r].color}">${esc(r)}</div><div class="muted">New General Manager: <b>${esc(RIVAL_GMS[r])}</b></div><p class="muted" style="margin-top:8px">You meet twice a season, home and away. Rivalry results are tracked for your whole career.</p></div>`; }
      if (step === 'offense' || step === 'defense') body = cornerstoneGrid(step);
      if (step === 'confirm') body = `<div class="panel"><div class="row">${portraitSprite(`${draft.gender}|${draft.portrait}`, 48)}<div><b>${esc(draft.first)} ${esc(draft.last)}</b><div class="muted">${esc(draft.hometown || 'Hometown unknown')}</div></div></div><hr><div class="kv"><b>Club</b><span>${esc(draft.club)}</span><b>Rival</b><span>${esc(draft.rival)}</span><b>Offense</b><span>${esc(draft.offense)}</span><b>Defense</b><span>${esc(draft.defense)}</span></div></div>`;
      return `<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">LEAGUE COMMISSIONER · ${draft.step + 1} / ${STEPS.length}</div>${esc(LINES[step])}</div></div>
        <div style="margin:12px 0">${body}</div>
        <div class="row between"><button class="btn" data-action="back">‹ Back</button><button class="btn primary" data-action="next" id="next">${step === 'confirm' ? 'Enter the league →' : 'Continue →'}</button></div>
        <p id="err" class="muted" style="color:var(--bad);min-height:18px"></p>`;
    },
    mount(root, ctx) {
      const err = (t) => { root.querySelector('#err').textContent = t; };
      const collect = () => {
        const step = STEPS[draft.step];
        if (step === 'name') { draft.first = root.querySelector('#first').value.trim(); draft.last = root.querySelector('#last').value.trim(); if (!draft.first || !draft.last) return 'Please enter your first and last name.'; }
        if (step === 'home') { draft.hometown = root.querySelector('#home').value.trim(); if (!draft.hometown) return 'Where are you from?'; }
        if (step === 'club' && !draft.club) return 'Choose a club.';
        if (step === 'offense' && !draft.offense) return 'Choose a cornerstone.';
        if (step === 'defense' && !draft.defense) return 'Choose a cornerstone.';
        return null;
      };
      delegate(root, {
        gender: (el) => { draft.gender = el.dataset.v; Router.render(); },
        portrait: (el) => { draft.portrait = Number(el.dataset.v); Router.render(); },
        club: (el) => { draft.club = el.dataset.v; const others = DIVISIONS[divisionOf(draft.club)].filter((t) => t !== draft.club); draft.rival = others[Math.floor(Math.random() * others.length)]; Router.render(); },
        pick: (el) => { draft[el.dataset.side] = el.dataset.v; Router.render(); },
        details: (el) => { const c = [...CORNERSTONES.offense, ...CORNERSTONES.defense].find((x) => x.name === el.dataset.v); const ab = ABILITIES[c.ability]; sheet(`<div class="row">${monsterSprite({ id: c.name, name: c.name, type: c.type }, 64)}<div><b>${esc(c.name)}</b><div class="muted">${c.position} · ${c.type} · ${c.quality} OVR · ${c.archetype}</div></div></div><h3>Nature</h3><p>${esc(NATURES[c.nature].name)} — ${esc(NATURES[c.nature].behavior)}</p><h3>Signature ability</h3><p><b>${esc(ab.name)}</b>: ${esc(ab.text)}</p><h3>Type</h3><p>${esc(TYPES[c.type].blurb)}.</p>`, { title: c.name }); },
        back: () => { if (draft.step > 0) { draft.step -= 1; Router.render(); } else Router.go('menu', {}, { reset: true }); },
        next: () => {
          const e = collect(); if (e) { err(e); return; }
          if (STEPS[draft.step] === 'confirm') {
            const f = createFranchise({ owner: { first: draft.first, last: draft.last, gender: draft.gender, portrait: draft.portrait, hometown: draft.hometown }, club: draft.club, rival: draft.rival, cornerstoneOffense: draft.offense, cornerstoneDefense: draft.defense, settings: { ...app.defaultSettings } });
            app.setFranchise(f); draft = null; Router.go('hire', {}, { reset: true }); return;
          }
          draft.step += 1; Router.render();
        },
      });
    },
  });

  function cornerstoneGrid(side) {
    return `<div class="stack">${CORNERSTONES[side].map((c) => `<div class="choice ${draft[side] === c.name ? 'selected' : ''}"><div class="row" data-action="pick" data-side="${side}" data-v="${esc(c.name)}" style="cursor:pointer">${monsterSprite({ id: c.name, name: c.name, type: c.type }, 48)}<div class="grow"><span class="name">${esc(c.name)}</span><div class="muted">${c.position} · ${c.type} · ${c.quality} OVR · ${esc(c.archetype)}</div><div class="muted">Ability: ${esc(ABILITIES[c.ability].name)}</div></div><span class="ovr ${draft[side] === c.name ? 'hi' : ''}">${draft[side] === c.name ? '✓' : ''}</span></div><div class="row"><button class="btn small" data-action="details" data-v="${esc(c.name)}">Details</button><button class="btn small ${draft[side] === c.name ? 'primary' : ''}" data-action="pick" data-side="${side}" data-v="${esc(c.name)}">${draft[side] === c.name ? 'Selected' : 'Select'}</button></div></div>`).join('')}</div>`;
  }

  Router.registerScreen('hire', {
    title: 'Build Your Front Office', back: false, tabs: false,
    render({ f }) {
      const role = nextStaffRole(f);
      if (!role) return `<div class="panel center"><h2>Staff complete</h2><p class="muted">Your front office is ready.</p><button class="btn primary big block" data-action="hq">Go to Headquarters →</button></div>`;
      const cap = salarySummary(f);
      const idx = STAFF_ROLES.indexOf(role);
      return `<p class="muted">Hire ${idx + 1} of 5 — <b>${esc(ROLE_LABEL[role])}</b>. Cap room: <b>${fmtMoney(cap.remaining)}</b>.</p>
        <div class="stack">${STAFF.filter((c) => c.role === role).map((c) => candidateCard(f, c)).join('')}</div>`;
    },
    mount(root, ctx) {
      delegate(root, {
        hire: (el) => { const r = hireStaff(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${esc(el.dataset.name)} hired.`, 'good'); Router.render(); },
        plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<p class="muted">${ids.length} plays in this catalog.</p><div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name + ' — playbook' }); },
        hq: () => Router.go('hq', {}, { reset: true }),
      });
    },
  });

  function candidateCard(f, c) {
    const after = salarySummary(f, c.salary);
    const hc = staffMember(f, 'head_coach');
    const extra = c.role === 'head_coach' ? `<div class="muted">Offense: ${esc(c.identity.offense)} · Defense: ${esc(c.identity.defense)} · Aggression ${Math.round(c.identity.aggression * 100)}</div>`
      : c.role.includes('coordinator') ? `<div class="muted">${(PLAYBOOKS[c.id] || []).length} plays · scheme fit with ${hc ? esc(hc.name) : 'head coach'}: <b>${hc ? alignmentFor(hc, c) : '—'}</b></div><button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">View playbook</button>`
      : c.role === 'head_scout' ? `<div class="muted">Volcanic ${c.biomes.fire} · Coastal ${c.biomes.water} · Forest ${c.biomes.forest} · Frost ${c.biomes.ice}</div>`
      : `<div class="muted">Focus strength — Passing ${c.bonus.passing} · Rushing ${c.bonus.rushing} · Coverage ${c.bonus.coverage} · Pass rush ${c.bonus.pass_rush}</div>`;
    return `<div class="panel"><div class="row">${portraitSprite(c.id, 44)}<div class="grow"><b>${esc(c.name)}</b> <span class="chip">${esc(c.style)}</span><div class="muted">${esc(c.strength)} · OVR ${c.overall}</div></div></div>
      <div style="margin:8px 0">${extra}</div>
      <div class="row between"><span class="muted">${fmtMoney(c.salary)}/yr · room after: <b style="color:${after.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(after.remaining)}</b></span><button class="btn primary" data-action="hire" data-id="${c.id}" data-name="${esc(c.name)}" ${after.over ? 'disabled' : ''}>Hire</button></div></div>`;
  }
  function alignmentFor(hc, c) { const h = c.role === 'offensive_coordinator' ? hc.identity.offense : hc.identity.defense; const s = c.scheme; return h === s ? 'excellent' : h === 'balanced' || s === 'balanced' ? 'good' : 'poor'; }
}
