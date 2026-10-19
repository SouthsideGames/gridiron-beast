// Commissioner's office: owner creation, club choice, rival reveal,
// cornerstone monsters, then the five staff hires.

import { esc, delegate, toast, sheet } from '../dom.js';
import { STARTER_CLUBS, DIVISIONS, RIVAL_GMS, divisionOf, conferenceFor, TEAM_META } from '../../data/league.js';
import { cornerstoneOffers, NATURES, TYPES, resolveSpecies } from '../../data/monsters.js';
import { TRAITS } from '../../data/species.js';
import { STAFF, ROLE_LABEL, STAFF_ROLES } from '../../data/staff.js';
import { createFranchise, hireStaff, nextStaffRole, salarySummary, staffMember, schemeAlignment, hireDefaultStaff, firstWeekWelcome, DIFFICULTY, commissionerWelcome } from '../../franchise/franchise.js';
import { portraitSprite, monsterSprite, portraitSpec, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, ACCESSORIES } from '../pixel-monster.js';
import { BACKGROUNDS } from '../../data/staff.js';
import { playCardSvg } from '../play-art.js';
import { PLAYBOOKS } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { fmtMoney } from '../dom.js';

const STEPS = ['name', 'look', 'background', 'club', 'difficulty', 'offense'];
const LINES = {
  name: 'Ah, there you are! I knew our new franchise owner would be here soon. What should I call you?',
  look: 'Let’s get your picture for the league programme. Make it look like you.',
  background: 'Every owner comes from somewhere. Where are you from, and what did you do before this?',
  club: 'The top franchises aren’t for sale. These four clubs finished at the bottom of the league and need an owner willing to rebuild. Pick your opportunity.',
  difficulty: 'How hard do you want this league to be? Choose carefully: it is set for the life of your franchise, and the Hall of Fame judges you by it.',
  offense: 'Last thing: three monsters have agreed to lead a rebuild. Any position, any element, pick the one you want to build around. Your first week starts Monday.',
};

export function registerOnboardingScreens(Router, app) {
  let draft = null;
  const fresh = () => ({ step: 0, first: '', last: '', gender: 'Female', portrait: 0, skin: 1, hair: 1, style: 'short', accessory: 'none', hue: 210, background: 'player', hometown: '', club: null, rival: null, difficulty: 'pro', offense: null, defense: null, offerSeed: (Math.random() * 1e9) >>> 0, rerolls: 0 });
  const spec = () => portraitSpec({ skin: draft.skin, hair: draft.hair, style: draft.style, accessory: draft.accessory, hue: draft.hue });

  Router.registerScreen('onboarding', {
    title: "Commissioner's Office", back: false, tabs: false,
    render({ params }) {
      if (!draft || params.fresh) { draft = fresh(); params.fresh = false; }
      const step = STEPS[draft.step];
      let body = '';
      if (step === 'name') body = `<div class="grid2"><label class="field">First name<input id="first" maxlength="18" value="${esc(draft.first)}" autocomplete="given-name"></label><label class="field">Last name<input id="last" maxlength="18" value="${esc(draft.last)}" autocomplete="family-name"></label></div>`;
      if (step === 'look') {
        const opt = (key, list, render) => `<div class="row" style="flex-wrap:wrap;gap:4px">${list.map((v, i) => `<button class="choice center ${String(draft[key]) === String(v) ? 'selected' : ''}" data-action="opt" data-k="${key}" data-v="${esc(String(v))}" style="padding:4px 6px;min-width:40px">${render(v, i)}</button>`).join('')}</div>`;
        body = `<div class="row" style="align-items:flex-start;gap:12px"><div class="center">${portraitSprite(spec(), 96)}<div class="dim" style="font-size:11px">preview</div></div><div class="grow">
          <div class="row" style="margin-bottom:8px">${['Female', 'Male', 'Nonbinary'].map((g) => `<button class="btn small ${draft.gender === g ? 'primary' : ''}" data-action="gender" data-v="${g}">${g === 'Nonbinary' ? 'Non-binary' : g}</button>`).join('')}</div>
          <div class="muted" style="font-size:12px">SKIN</div>${opt('skin', SKIN_TONES.map((_, i) => i), (i) => `<span style="display:block;width:22px;height:22px;border-radius:50%;background:${SKIN_TONES[i]}"></span>`)}
          <div class="muted" style="font-size:12px;margin-top:6px">HAIR</div>${opt('hair', HAIR_COLORS.map((_, i) => i), (i) => `<span style="display:block;width:22px;height:22px;border-radius:50%;background:${HAIR_COLORS[i]}"></span>`)}
          <div class="muted" style="font-size:12px;margin-top:6px">STYLE</div>${opt('style', HAIR_STYLES, (v) => esc(v))}
          <div class="muted" style="font-size:12px;margin-top:6px">EXTRA</div>${opt('accessory', ACCESSORIES, (v) => esc(v))}
          <div class="muted" style="font-size:12px;margin-top:6px">SHIRT</div>${opt('hue', [210, 0, 15, 30, 52, 90, 120, 160, 190, 240, 270, 300, 330], (h) => `<span style="display:block;width:22px;height:22px;border-radius:4px;background:hsl(${h} 55% 45%)"></span>`)}
        </div></div>`;
      }
      if (step === 'background') body = `<div class="stack" style="margin-top:8px">${Object.entries(BACKGROUNDS).map(([id, b]) => `<button class="choice ${draft.background === id ? 'selected' : ''}" data-action="background" data-v="${id}"><span class="name">${esc(b.label)}</span><div class="muted">${esc(b.text)}</div></button>`).join('')}</div>`;
      if (step === 'club') body = `<div class="stack">${STARTER_CLUBS.map((c) => `<button class="choice ${draft.club === c.name ? 'selected' : ''}" data-action="club" data-v="${esc(c.name)}"><span class="name" style="color:${TEAM_META[c.name].color}">${esc(c.name)}</span><span class="muted">${esc(divisionOf(c.name))} Division · ${esc(conferenceFor(divisionOf(c.name)))} Conference · last season ${c.record}</span></button>`).join('')}</div>${draft.rival ? `<div class="panel tight" style="border-color:#a855f7;margin-top:8px">⚔️ Your division rival: <b>${esc(draft.rival)}</b> · new GM ${esc(RIVAL_GMS[draft.rival])}. You meet twice a season.</div>` : ''}`;
      if (step === 'rival') { const r = draft.rival; body = `<div class="panel center" style="border-color:#a855f7"><div style="font-size:32px">⚔️</div><h2>YOUR RIVAL HAS ARRIVED</h2><div style="font-size:18px;font-weight:800;color:${TEAM_META[r].color}">${esc(r)}</div><div class="muted">New General Manager: <b>${esc(RIVAL_GMS[r])}</b></div><p class="muted" style="margin-top:8px">You meet twice a season, home and away. Rivalry results are tracked for your whole career.</p></div>`; }
      if (step === 'difficulty') body = `<div class="stack">${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="choice ${draft.difficulty === id ? 'selected' : ''}" data-action="difficulty" data-v="${id}"><span class="name">${esc(d.label)}</span><div class="muted">${esc(d.text)}</div><div class="muted">${esc(d.hof)}</div></button>`).join('')}</div><p class="dim" style="margin-top:8px">Locked once the franchise starts. Game length and coaching mode can still be changed in Settings.</p>`;
      if (step === 'offense') body = cornerstoneGrid('offense') + `<div class="row between" style="margin-top:8px"><span class="dim">Not what you had in mind?</span><button class="btn small" data-action="reroll" ${draft.rerolls >= 2 ? 'disabled' : ''}>Show three others (${2 - draft.rerolls} left)</button></div><p class="dim" style="margin-top:8px">A balanced coaching staff is hired for you. You can replace anyone later from the Staff screen.</p>`;
      return `<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">LEAGUE COMMISSIONER · ${draft.step + 1} / ${STEPS.length}</div>${esc(LINES[step])}</div></div>
        <div style="margin:12px 0">${body}</div>
        <div class="row between"><button class="btn" data-action="back">‹ Back</button><button class="btn primary" data-action="next" id="next">${step === 'offense' ? 'Enter the league →' : 'Continue →'}</button></div>
        <p id="err" class="muted" style="color:var(--bad);min-height:18px"></p>`;
    },
    mount(root, ctx) {
      const err = (t) => { root.querySelector('#err').textContent = t; };
      const collect = () => {
        const step = STEPS[draft.step];
        if (step === 'name') { draft.first = root.querySelector('#first').value.trim(); draft.last = root.querySelector('#last').value.trim(); if (!draft.first || !draft.last) return 'Please enter your first and last name.'; }
        if (step === 'background') { const h = root.querySelector('#home'); if (h) draft.hometown = h.value.trim(); }
        if (step === 'club' && !draft.club) return 'Choose a club.';
        if (step === 'offense' && !draft.offense) return 'Choose a cornerstone.';
        return null;
      };
      delegate(root, {
        gender: (el) => { draft.gender = el.dataset.v; Router.render(); },
        opt: (el) => { const k = el.dataset.k; draft[k] = ['skin', 'hair', 'hue'].includes(k) ? Number(el.dataset.v) : el.dataset.v; Router.render(); },
        background: (el) => { const h = root.querySelector('#home'); if (h) draft.hometown = h.value.trim(); draft.background = el.dataset.v; Router.render(); },
        portrait: (el) => { const fi = root.querySelector('#first'), la = root.querySelector('#last'); if (fi) { draft.first = fi.value.trim(); draft.last = la.value.trim(); } draft.portrait = Number(el.dataset.v); Router.render(); },
        club: (el) => { draft.club = el.dataset.v; const others = DIVISIONS[divisionOf(draft.club)].filter((t) => t !== draft.club); draft.rival = others[Math.floor(Math.random() * others.length)]; Router.render(); },
        pick: (el) => { draft[el.dataset.side] = el.dataset.v; Router.render(); },
        difficulty: (el) => { draft.difficulty = el.dataset.v; Router.render(); },
        reroll: () => { if (draft.rerolls >= 2) return; draft.rerolls += 1; draft.offerSeed = (draft.offerSeed * 31 + 7) >>> 0; draft.offense = null; Router.render(); },
        details: (el) => { const c = cornerstoneOffers(draft.offerSeed).find((x) => x.name === el.dataset.v); const sp = resolveSpecies(c.species); const ab = sp.ability || { name: TRAITS[sp.trait]?.name, text: TRAITS[sp.trait]?.text }; sheet(`<div class="row">${monsterSprite({ id: c.name, name: c.name, species: c.species }, 64)}<div><b>${esc(c.name)}</b><div class="muted">${c.position} · ${c.type} · ${c.rarity} · ${c.quality} OVR · ${c.archetype}</div></div></div><p style="font-style:italic">“${esc(sp.personality)}”</p><h3>Nature</h3><p>${esc(NATURES[c.nature].name)} · ${esc(NATURES[c.nature].behavior)}</p><h3>Signature ability</h3><p><b>${esc(ab.name)}</b>: ${esc(ab.text)}</p><h3>Type</h3><p>${esc(TYPES[c.type].blurb)}.</p>`, { title: c.name }); },
        back: () => { if (draft.step > 0) { draft.step -= 1; Router.render(); } else Router.go('menu', {}, { reset: true }); },
        next: () => {
          const e = collect(); if (e) { err(e); return; }
          if (STEPS[draft.step] === 'offense') {
            const offer = cornerstoneOffers(draft.offerSeed).find((x) => x.name === draft.offense);
            const f = createFranchise({ owner: { first: draft.first, last: draft.last, gender: draft.gender, portrait: spec(), hometown: draft.hometown, background: draft.background }, club: draft.club, rival: draft.rival, cornerstone: offer, settings: { ...app.defaultSettings, difficulty: draft.difficulty } });
            hireDefaultStaff(f); firstWeekWelcome(f);
            app.setFranchise(f); draft = null; Router.go('welcome', {}, { reset: true }); return;
          }
          draft.step += 1; Router.render();
        },
      });
    },
  });

  function cornerstoneGrid(side) {
    const offers = cornerstoneOffers(draft.offerSeed);
    return `<div class="stack">${offers.map((c) => `<div class="choice ${draft[side] === c.name ? 'selected' : ''}"><div class="row" data-action="pick" data-side="${side}" data-v="${esc(c.name)}" style="cursor:pointer">${monsterSprite({ id: c.name, name: c.name, species: c.species }, 48)}<div class="grow"><span class="name">${esc(c.name)}</span> <span class="chip">${c.rarity}</span><div class="muted">${c.position} · ${c.type} · ${c.quality} OVR · ${esc(c.archetype)}</div><div class="muted">Ability: ${esc(c.abilityName || '')}</div></div><span class="ovr ${draft[side] === c.name ? 'hi' : ''}">${draft[side] === c.name ? '✓' : ''}</span></div><div class="row"><button class="btn small" data-action="details" data-v="${esc(c.name)}">Details</button><button class="btn small ${draft[side] === c.name ? 'primary' : ''}" data-action="pick" data-side="${side}" data-v="${esc(c.name)}">${draft[side] === c.name ? 'Selected' : 'Select'}</button></div></div>`).join('')}</div>`;
  }

  // The commissioner's welcome (GDD §19.3): one screen between the cornerstone pick and headquarters. Beats appear one at a
  // time; the last one is the warning. Shown once per franchise (f.welcomed).
  let beat = 0;
  Router.registerScreen('welcome', {
    title: 'Welcome to the league', tabs: false,
    render({ f }) {
      const beats = commissionerWelcome(f); const shown = beats.slice(0, beat + 1); const last = beat >= beats.length - 1;
      return `<div class="welcome">
        <div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 72, { hue: 40 })}<div class="grow"><div class="talk-name">The Commissioner</div><div class="dim">League office · ${esc(f.club)}</div></div></div>
        <div class="stack" style="margin-top:12px">${shown.map((b, i) => `<div class="talk ${i === beat ? 'fresh' : ''} ${b.ominous ? 'ominous' : ''}"><p class="talk-line">${b.text}</p></div>`).join('')}</div>
        <button class="btn primary big block" data-action="${last ? 'enter' : 'more'}" style="margin-top:12px">${last ? 'Enter headquarters →' : 'Continue'}</button>
        ${last ? '' : '<p class="dim center" style="margin-top:6px">Tap to let him finish.</p>'}</div>`;
    },
    mount(root, ctx) {
      delegate(root, {
        more: () => { beat += 1; Router.render(); const fresh = root.querySelector('.talk.fresh'); fresh?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); },
        enter: () => { ctx.f.welcomed = true; beat = 0; app.save(); Router.go('hq', {}, { reset: true }); },
      });
    },
  });

  Router.registerScreen('hire', {
    title: 'Build Your Front Office', back: false, tabs: false,
    render({ f }) {
      const role = nextStaffRole(f);
      if (!role) return `<div class="panel center"><h2>Staff complete</h2><p class="muted">Your front office is ready.</p><button class="btn primary big block" data-action="hq">Go to Headquarters →</button></div>`;
      const cap = salarySummary(f);
      const idx = STAFF_ROLES.indexOf(role);
      return `<p class="muted">Hire ${idx + 1} of 5 · <b>${esc(ROLE_LABEL[role])}</b>. Cap room: <b>${fmtMoney(cap.remaining)}</b>.</p>
        <div class="stack">${STAFF.filter((c) => c.role === role).map((c) => candidateCard(f, c)).join('')}</div>`;
    },
    mount(root, ctx) {
      delegate(root, {
        hire: (el) => { const r = hireStaff(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${esc(el.dataset.name)} hired.`, 'good'); Router.render(); },
        plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<p class="muted">${ids.length} plays in this catalog.</p><div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name + ', playbook' }); },
        hq: () => Router.go('hq', {}, { reset: true }),
      });
    },
  });

  function candidateCard(f, c) {
    const after = salarySummary(f, c.salary);
    const hc = staffMember(f, 'head_coach');
    const extra = c.role === 'head_coach' ? `<div class="muted">Offense: ${esc(c.identity.offense)} · Defense: ${esc(c.identity.defense)} · Aggression ${Math.round(c.identity.aggression * 100)}</div>`
      : c.role.includes('coordinator') ? `<div class="muted">${(PLAYBOOKS[c.id] || []).length} plays · scheme fit with ${hc ? esc(hc.name) : 'head coach'}: <b>${hc ? alignmentFor(hc, c) : '·'}</b></div><button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">View playbook</button>`
      : c.role === 'head_scout' ? `<div class="muted">Volcanic ${c.biomes.fire} · Coastal ${c.biomes.water} · Forest ${c.biomes.forest} · Frost ${c.biomes.ice}</div>`
      : `<div class="muted">Focus strength. Passing ${c.bonus.passing} · Rushing ${c.bonus.rushing} · Coverage ${c.bonus.coverage} · Pass rush ${c.bonus.pass_rush}</div>`;
    return `<div class="panel"><div class="row">${portraitSprite(c.id, 44)}<div class="grow"><b>${esc(c.name)}</b> <span class="chip">${esc(c.style)}</span><div class="muted">${esc(c.strength)} · OVR ${c.overall}</div></div></div>
      <div style="margin:8px 0">${extra}</div>
      <div class="row between"><span class="muted">${fmtMoney(c.salary)}/yr · room after: <b style="color:${after.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(after.remaining)}</b></span><button class="btn primary" data-action="hire" data-id="${c.id}" data-name="${esc(c.name)}" ${after.over ? 'disabled' : ''}>Hire</button></div></div>`;
  }
  function alignmentFor(hc, c) { const h = c.role === 'offensive_coordinator' ? hc.identity.offense : hc.identity.defense; const s = c.scheme; return h === s ? 'excellent' : h === 'balanced' || s === 'balanced' ? 'good' : 'poor'; }
}
