// Commissioner's office: owner creation, club choice, rival reveal,
// cornerstone monsters, then the five staff hires.

import { abilitiesHtml } from '../ability-info.js';
import { ASSIST_MODES, ASSIST_MODE_TEXT, assistSettings, setAssist } from '../../franchise/assist.js';
import { esc, delegate, toast, sheet } from '../dom.js';
import { STARTER_CLUBS, DIVISIONS, RIVAL_GMS, divisionOf, conferenceFor, TEAM_META } from '../../data/league.js';
import { cornerstoneOffers, TYPES, resolveSpecies } from '../../data/monsters.js';
import { TRAITS } from '../../data/species.js';
import { STAFF, ROLE_LABEL, STAFF_ROLES } from '../../data/staff.js';
import { createFranchise, hireStaff, nextStaffRole, salarySummary, staffMember, schemeAlignment, hireDefaultStaff, firstWeekWelcome, DIFFICULTY, commissionerWelcome } from '../../franchise/franchise.js';
import { portraitSprite, monsterSprite } from '../pixel-monster.js';
import { coachEditorHtml, coachEditorActions, specOf } from '../coach-editor.js';
import { DEFAULT_LOOK } from '../coach-portrait.js';
import { BACKGROUNDS } from '../../data/staff.js';
import { playCardSvg } from '../play-art.js';
import { PLAYBOOKS } from '../../data/staff.js';
import { PLAYS } from '../../data/playbook.js';
import { fmtMoney } from '../dom.js';
import { t } from '../../text/index.js';
import { t as $t } from '../../text/index.js';

const STEPS = ['name', 'look', 'background', 'club', 'difficulty', 'offense'];
const LINES = {
  name: t('onboarding.ah_there_you_are_i_knew'),
  look: t('onboarding.lets_get_your_picture_for_the'),
  background: t('onboarding.every_owner_comes_from_somewhere_where'),
  club: t('onboarding.the_top_franchises_arent_for_sale'),
  difficulty: t('onboarding.how_hard_do_you_want_this'),
  offense: t('onboarding.last_thing_three_monsters_have_agreed'),
};

export function registerOnboardingScreens(Router, app) {
  let creating = false; // a new franchise is being saved (GDD §43.6)
  let draft = null;
  const fresh = () => ({ step: 0, first: '', last: '', gender: 'Female', portrait: 0, editor: { look: { ...DEFAULT_LOOK }, tab: 'face' }, background: 'player', hometown: '', club: null, rival: null, difficulty: 'pro', offense: null, defense: null, offerSeed: (Math.random() * 1e9) >>> 0, rerolls: 0 });
  const spec = () => specOf(draft.editor);

  Router.registerScreen('onboarding', {
    title: t('onboarding.commissioners_office'), back: false, tabs: false,
    render({ params }) {
      if (!draft || params.fresh) { draft = fresh(); params.fresh = false; }
      const step = STEPS[draft.step];
      let body = '';
      if (step === 'name') body = `<div class="grid2"><label class="field">${t('onboarding.first_name')}<input id="first" maxlength="18" value="${esc(draft.first)}" autocomplete="given-name"></label><label class="field">${t('onboarding.last_name')}<input id="last" maxlength="18" value="${esc(draft.last)}" autocomplete="family-name"></label></div>`;
      if (step === 'look') {
        body = `<div class="row" style="margin-bottom:8px">${['Female', 'Male', 'Nonbinary'].map((g) => `<button class="btn small ${draft.gender === g ? 'primary' : ''}" data-action="gender" data-v="${g}">${g === 'Nonbinary' ? t('onboarding.non_binary') : g}</button>`).join('')}</div>
          ${coachEditorHtml(draft.editor.look, { tab: draft.editor.tab, teamColor: draft.club ? TEAM_META[draft.club]?.color : null, teamNote: t('onboarding.team_colors_follow_the_club_you') })}`;
      }
      if (step === 'background') body = `<div class="stack" style="margin-top:8px">${Object.entries(BACKGROUNDS).map(([id, b]) => `<button class="choice ${draft.background === id ? 'selected' : ''}" data-action="background" data-v="${id}"><span class="name">${esc(b.label)}</span><div class="muted">${esc(b.text)}</div></button>`).join('')}</div>`;
      if (step === 'club') body = `<div class="stack">${STARTER_CLUBS.map((c) => `<button class="choice ${draft.club === c.name ? 'selected' : ''}" data-action="club" data-v="${esc(c.name)}"><span class="name" style="color:${TEAM_META[c.name].color}">${esc(c.name)}</span><span class="muted">${t('onboarding.division_conference_last_season', { division: esc(divisionOf(c.name)), conference: esc(conferenceFor(divisionOf(c.name))), record: c.record })}</span></button>`).join('')}</div>${draft.rival ? `<div class="panel tight" style="border-color:#a855f7;margin-top:8px">${t('onboarding.your_division_rival_b_b_new', { rival: esc(draft.rival), rivalGms: esc(RIVAL_GMS[draft.rival]) })}</div>` : ''}`;
      if (step === 'rival') { const r = draft.rival; body = `<div class="panel center" style="border-color:#a855f7"><div style="font-size:32px">⚔️</div><h2>${t('onboarding.your_rival_has_arrived')}</h2><div style="font-size:18px;font-weight:800;color:${TEAM_META[r].color}">${esc(r)}</div><div class="muted">${t('onboarding.new_general_manager_b_b', { rivalGms: esc(RIVAL_GMS[r]) })}</div><p class="muted" style="margin-top:8px">${t('onboarding.you_meet_twice_a_season_home')}</p></div>`; }
      if (step === 'difficulty') body = `<div class="stack">${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="choice ${draft.difficulty === id ? 'selected' : ''}" data-action="difficulty" data-v="${id}"><span class="name">${esc(d.label)}</span><div class="muted">${esc(d.text)}</div><div class="muted">${esc(d.hof)}</div></button>`).join('')}</div><p class="dim" style="margin-top:8px">${t('onboarding.locked_once_the_franchise_starts_game')}</p>`;
      if (step === 'offense') body = cornerstoneGrid('offense') + `<div class="row between" style="margin-top:8px"><span class="dim">${t('onboarding.not_what_you_had_in_mind')}</span><button class="btn small" data-action="reroll" ${draft.rerolls >= 2 ? 'disabled' : ''}>${t('onboarding.show_three_others_left', { rerolls: 2 - draft.rerolls })}</button></div><p class="dim" style="margin-top:8px">${t('onboarding.a_balanced_coaching_staff_is_hired')}</p>`;
      return `<div class="commissioner">${portraitSprite('commissioner', 56, { hue: 210 })}<div class="speech"><div class="muted" style="font-size:11px;margin-bottom:4px">${t('onboarding.league_commissioner', { step: draft.step + 1, n: STEPS.length })}</div>${esc(LINES[step])}</div></div>
        <div style="margin:12px 0">${body}</div>
        <div class="row between"><button class="btn" data-action="back">${t('onboarding.back')}</button><button class="btn primary" data-action="next" id="next">${step === 'offense' ? t('onboarding.enter_the_league') : t('onboarding.continue')}</button></div>
        <p id="err" class="muted" style="color:var(--bad);min-height:18px"></p>`;
    },
    mount(root, ctx) {
      const err = (t) => { root.querySelector('#err').textContent = t; };
      const collect = () => {
        const step = STEPS[draft.step];
        if (step === 'name') { draft.first = root.querySelector('#first').value.trim(); draft.last = root.querySelector('#last').value.trim(); if (!draft.first || !draft.last) return t('onboarding.please_enter_your_first_and_last'); }
        if (step === 'background') { const h = root.querySelector('#home'); if (h) draft.hometown = h.value.trim(); }
        if (step === 'club' && !draft.club) return t('onboarding.choose_a_club');
        if (step === 'offense' && !draft.offense) return t('onboarding.choose_a_cornerstone');
        return null;
      };
      delegate(root, {
        gender: (el) => { draft.gender = el.dataset.v; Router.render(); },
        ...coachEditorActions(draft.editor, () => Router.render()),
        background: (el) => { const h = root.querySelector('#home'); if (h) draft.hometown = h.value.trim(); draft.background = el.dataset.v; Router.render(); },
        portrait: (el) => { const fi = root.querySelector('#first'), la = root.querySelector('#last'); if (fi) { draft.first = fi.value.trim(); draft.last = la.value.trim(); } draft.portrait = Number(el.dataset.v); Router.render(); },
        club: (el) => { draft.club = el.dataset.v; const others = DIVISIONS[divisionOf(draft.club)].filter((t) => t !== draft.club); draft.rival = others[Math.floor(Math.random() * others.length)]; Router.render(); },
        pick: (el) => { draft[el.dataset.side] = el.dataset.v; Router.render(); },
        difficulty: (el) => { draft.difficulty = el.dataset.v; Router.render(); },
        reroll: () => { if (draft.rerolls >= 2) return; draft.rerolls += 1; draft.offerSeed = (draft.offerSeed * 31 + 7) >>> 0; draft.offense = null; Router.render(); },
        details: (el) => { const c = cornerstoneOffers(draft.offerSeed).find((x) => x.name === el.dataset.v); const sp = resolveSpecies(c.species); sheet(`<div class="row">${monsterSprite({ id: c.name, name: c.name, species: c.species }, 64)}<div><b>${esc(c.name)}</b><div class="muted">${c.position} · ${c.type} · ${c.rarity} · ${c.quality} OVR · ${c.archetype}</div></div></div><p style="font-style:italic">“${esc(sp.personality)}”</p><p class="dim">${t('onboarding.his_temper_how_efficiently_he_trains')}</p><h3>${t('onboarding.signature_abilities')}</h3>${abilitiesHtml(sp, { seeIt: true })}<h3>${t('onboarding.type')}</h3><p>${esc(TYPES[c.type].blurb)}.</p>`, { title: c.name }); },
        back: () => { if (draft.step > 0) { draft.step -= 1; Router.render(); } else Router.go('menu', {}, { reset: true }); },
        next: async () => {
          const e = collect(); if (e) { err(e); return; }
          if (STEPS[draft.step] === 'offense') {
            const offer = cornerstoneOffers(draft.offerSeed).find((x) => x.name === draft.offense);
            const f = createFranchise({ owner: { first: draft.first, last: draft.last, gender: draft.gender, portrait: spec(), hometown: draft.hometown, background: draft.background }, club: draft.club, rival: draft.rival, cornerstone: offer, settings: { ...app.defaultSettings, difficulty: draft.difficulty } });
            hireDefaultStaff(f); firstWeekWelcome(f);
            if (creating) return; creating = true; // one franchise per tap, however impatient the thumb
            const r = await app.setFranchise(f).finally(() => { creating = false; }); // committed before it becomes the active franchise
            if (!r.ok) { err(`${t('onboarding.your_new_franchise_could_not_be', { message: r.error?.message || 'unknown error', f: app.f ? t('onboarding.your_current_franchise_is_unchanged') : '' })}`); return; }
            draft = null; Router.go('welcome', {}, { reset: true }); return;
          }
          draft.step += 1; Router.render();
        },
      });
    },
  });

  function cornerstoneGrid(side) {
    const offers = cornerstoneOffers(draft.offerSeed);
    return `<div class="stack">${offers.map((c) => `<div class="choice ${draft[side] === c.name ? 'selected' : ''}"><div class="row" data-action="pick" data-side="${side}" data-v="${esc(c.name)}" style="cursor:pointer">${monsterSprite({ id: c.name, name: c.name, species: c.species }, 48)}<div class="grow"><span class="name">${esc(c.name)}</span> <span class="chip">${c.rarity}</span><div class="muted">${c.position} · ${c.type} · ${c.quality} OVR · ${esc(c.archetype)}</div><div class="muted">${t('onboarding.ability', { abilityName: esc(c.abilityName || '') })}</div></div><span class="ovr ${draft[side] === c.name ? 'hi' : ''}">${draft[side] === c.name ? '✓' : ''}</span></div><div class="row"><button class="btn small" data-action="details" data-v="${esc(c.name)}">${t('onboarding.details')}</button><button class="btn small ${draft[side] === c.name ? 'primary' : ''}" data-action="pick" data-side="${side}" data-v="${esc(c.name)}">${draft[side] === c.name ? t('onboarding.selected') : t('onboarding.select')}</button></div></div>`).join('')}</div>`;
  }

  // The commissioner's welcome (GDD §19.3): one screen between the cornerstone pick and headquarters. Beats appear one at a
  // time; the last one is the warning. Shown once per franchise (f.welcomed).
  let beat = 0;
  Router.registerScreen('welcome', {
    title: t('onboarding.welcome_to_the_league'), tabs: false,
    render({ f }) {
      const beats = commissionerWelcome(f); const shown = beats.slice(0, beat + 1); const last = beat >= beats.length - 1;
      const am = assistSettings(f).mode;
      return `<div class="panel tight" style="margin-bottom:8px"><div class="row between" style="flex-wrap:wrap;gap:6px">${t('onboarding.b_how_much_help_would_you')}<span class="chips" role="radiogroup" aria-label="${t('onboarding.coach_assist')}">${ASSIST_MODES.map((m) => `<button class="chip ${am === m ? 'on accent' : ''}" role="radio" aria-checked="${am === m}" data-action="assist-mode" data-v="${m}">${ASSIST_MODE_TEXT[m].label}</button>`).join('')}</span></div><div class="dim" style="margin-top:4px">${t('onboarding.change_it_any_time_in_settings', { text: esc(ASSIST_MODE_TEXT[am].text) })}</div></div><div class="welcome">
        <div class="row" style="gap:12px;align-items:flex-start">${portraitSprite('commissioner', 72, { hue: 40 })}<div class="grow"><div class="talk-name">${t('onboarding.the_commissioner')}</div><div class="dim">${t('onboarding.league_office', { club: esc(f.club) })}</div></div></div>
        <div class="stack" style="margin-top:12px">${shown.map((b, i) => `<div class="talk ${i === beat ? 'fresh' : ''} ${b.ominous ? 'ominous' : ''}"><p class="talk-line">${b.text}</p></div>`).join('')}</div>
        <button class="btn primary big block" data-action="${last ? 'enter' : 'more'}" style="margin-top:12px">${last ? t('onboarding.enter_headquarters') : t('onboarding.continue_2')}</button>
        ${last ? '' : `<p class="dim center" style="margin-top:6px">${t('onboarding.tap_to_let_him_finish')}</p>`}</div>`;
    },
    mount(root, ctx) {
      delegate(root, {
        more: () => { beat += 1; Router.render(); const fresh = root.querySelector('.talk.fresh'); fresh?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); },
        enter: () => { ctx.f.welcomed = true; beat = 0; app.save(); Router.go('hq', {}, { reset: true }); },
        'assist-mode': (el) => { setAssist(ctx.f, { mode: el.dataset.v }); app.save(); Router.render(); },
      });
    },
  });

  Router.registerScreen('hire', {
    title: t('onboarding.build_your_front_office'), back: false, tabs: false,
    render({ f }) {
      const role = nextStaffRole(f);
      if (!role) return `<div class="panel center"><h2>${t('onboarding.staff_complete')}</h2><p class="muted">${t('onboarding.your_front_office_is_ready')}</p><button class="btn primary big block" data-action="hq">${t('onboarding.go_to_headquarters')}</button></div>`;
      const cap = salarySummary(f);
      const idx = STAFF_ROLES.indexOf(role);
      return `<p class="muted">${$t('onboarding.hire_of_5_b_b_cap', { hire: idx + 1, role: esc(ROLE_LABEL[role]), room: fmtMoney(cap.remaining) })}</p>
        <div class="stack">${STAFF.filter((c) => c.role === role).map((c) => candidateCard(f, c)).join('')}</div>`;
    },
    mount(root, ctx) {
      delegate(root, {
        hire: (el) => { const r = hireStaff(app.f, el.dataset.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(`${esc(el.dataset.name)} hired.`, 'good'); Router.render(); },
        plays: (el) => { const ids = PLAYBOOKS[el.dataset.id] || []; sheet(`<p class="muted">${t('onboarding.plays_in_this_catalog', { n: ids.length })}</p><div class="play-grid">${ids.map((id) => `<div class="card"><div>${playCardSvg(id)}</div><span class="card-label">${esc(PLAYS[id].name)}</span></div>`).join('')}</div>`, { title: el.dataset.name + t('onboarding.playbook') }); },
        hq: () => Router.go('hq', {}, { reset: true }),
      });
    },
  });

  function candidateCard(f, c) {
    const after = salarySummary(f, c.salary);
    const hc = staffMember(f, 'head_coach');
    const extra = c.role === 'head_coach' ? `<div class="muted">${t('onboarding.offense_defense_aggression', { offense: esc(c.identity.offense), defense: esc(c.identity.defense), n: Math.round(c.identity.aggression * 100) })}</div>`
      : c.role.includes('coordinator') ? `<div class="muted">${t('onboarding.plays_scheme_fit_with_b_b', { playbooks: (PLAYBOOKS[c.id] || []).length, hc: hc ? esc(hc.name) : 'head coach', hc2: hc ? alignmentFor(hc, c) : '·' })}</div><button class="btn small" data-action="plays" data-id="${c.id}" data-name="${esc(c.name)}">${t('onboarding.view_playbook')}</button>`
      : c.role === 'head_scout' ? `<div class="muted">${t('onboarding.volcanic_coastal_forest_frost', { fire: c.biomes.fire, water: c.biomes.water, forest: c.biomes.forest, ice: c.biomes.ice })}</div>`
      : `<div class="muted">${t('onboarding.focus_strength_passing_rushing_coverage_pass', { passing: c.bonus.passing, rushing: c.bonus.rushing, coverage: c.bonus.coverage, passrush: c.bonus.pass_rush })}</div>`;
    return `<div class="panel"><div class="row">${portraitSprite(c.id, 44)}<div class="grow"><b>${esc(c.name)}</b> <span class="chip">${esc(c.style)}</span><div class="muted">${t('onboarding.ovr', { strength: esc(c.strength), overall: c.overall })}</div></div></div>
      <div style="margin:8px 0">${extra}</div>
      <div class="row between"><span class="muted">${t('onboarding.yr_room_after', { amount: fmtMoney(c.salary) })} <b style="color:${after.over ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(after.remaining)}</b></span><button class="btn primary" data-action="hire" data-id="${c.id}" data-name="${esc(c.name)}" ${after.over ? 'disabled' : ''}>${t('onboarding.hire')}</button></div></div>`;
  }
  function alignmentFor(hc, c) { const h = c.role === 'offensive_coordinator' ? hc.identity.offense : hc.identity.defense; const s = c.scheme; return h === s ? 'excellent' : h === 'balanced' || s === 'balanced' ? 'good' : 'poor'; }
}
