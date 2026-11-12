// Team captains (GDD §27.4B): pick two captains for offense and two for defense. The same screen serves the one-time initial
// selection (a franchise getting captains for the first time, mid-season), the offseason pick for next season, and — once a
// season's captains are named — a read-only view of both partnerships and why one might be inactive. Mobile-first: one column,
// big slots, a sheet to choose from, the suggested captains one tap away. No weekly upkeep: this is the only place to change them.
import { esc, delegate, toast, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import * as F from '../../franchise/franchise.js';
import * as CP from '../../franchise/partnerships.js';
import { monsterSprite } from '../pixel-monster.js';
import { chemMeterHtml, inactiveText, monsterOf } from '../captains-ui.js';
import { t as $t } from '../../text/index.js';

const SIDES = ['offense', 'defense'];
const SIDE_WORD = { offense: 'Offense', defense: 'Defense' };
const ROLE_WORD = { base: 'Starter', package: 'Package', bench: 'Bench' };
const rolesOf = (side) => [...new Set(Object.values(CP.PAIR_TYPES).filter((d) => d.side === side).flatMap((d) => [d.a, d.b]))];
const partnersOf = (pos, side) => [...new Set(Object.values(CP.PAIR_TYPES).filter((d) => d.side === side && (d.a === pos || d.b === pos)).map((d) => (d.a === pos ? d.b : d.a)))];

export function registerCaptainScreens(Router, app) {
  let draft = null; // { key, offense: [id|null, id|null], defense: [...] } while choosing

  const modeOf = (f) => (F.initialCaptainsDue(f) ? 'initial' : F.offseasonCaptainsOpen(f) ? 'offseason' : 'locked');
  const pairFromSuggestion = (s) => ({ offense: s.offense ? [s.offense.a, s.offense.b] : [null, null], defense: s.defense ? [s.defense.a, s.defense.b] : [null, null] });
  function ensureDraft(f, mode) {
    const key = `${f.uid || f.seed}|${f.season.year}|${mode}`;
    if (draft?.key === key) return draft;
    const pick = mode === 'offseason' && f.partnerships?.pick?.year === f.season.year + 1 ? f.partnerships.pick : null;
    draft = { key, ...(pick ? { offense: pick.offense.slice(), defense: pick.defense.slice() } : pairFromSuggestion(F.suggestedCaptains(f))) };
    return draft;
  }
  function slotHtml(f, cands, side, i, ids) {
    const c = cands.find((x) => x.id === ids[i]); const m = c ? monsterOf(f, c.id) : null;
    return `<button class="cap-slot ${c ? '' : 'empty'}" data-action="cap-slot" data-side="${side}" data-i="${i}" aria-label="${esc(`${SIDE_WORD[side]} captain ${i + 1}: ${c ? c.name : 'choose'}`)}">${m ? monsterSprite(m, 44) : '<span class="cap-plus">+</span>'}<span class="cap-slot-name">${c ? esc(c.name) : $t('roster.choose')}</span><span class="dim">${c ? `${$t('roster.ovr', { position: c.position, ovr: c.ovr })}` : `${$t('roster.captain', { i: i + 1 })}`}</span></button>`;
  }
  function sideHtml(f, cands, side, ids, sugg) {
    const [x, y] = ids.map((id) => cands.find((c) => c.id === id));
    const pair = x && y ? CP.orderPair(x, y) : null; const prog = pair ? CP.progressOf(pair.type, CP.chemistryCount(f, pair.a, pair.b)) : null;
    const isSugg = pair && sugg?.[side] && CP.pairKey(pair.a, pair.b) === CP.pairKey(sugg[side].a, sugg[side].b);
    return `<div class="panel cap-side"><div class="row between"><h3 style="margin:0">${SIDE_WORD[side]}</h3>${isSugg ? `<span class="chip accent">${$t('roster.suggested')}</span>` : ''}</div>
      <div class="cap-slots">${slotHtml(f, cands, side, 0, ids)}<span class="cap-amp" aria-hidden="true">&</span>${slotHtml(f, cands, side, 1, ids)}</div>
      ${pair ? `<div class="cap-pairline"><b>${esc(CP.PAIR_TYPES[pair.type].label)}</b>${CP.SLOW_TYPES.includes(pair.type) ? ` <span class="chip warn" title="${$t('roster.few_plays_qualify_each_season_so')}">${$t('roster.slow_to_build')}</span>` : ''}</div>${chemMeterHtml(prog)}` : `<p class="dim" style="margin:6px 0 0">${x && y ? $t('roster.those_two_cannot_be_a_partnership') : `${$t('roster.pairs')} ${Object.values(CP.PAIR_TYPES).filter((d) => d.side === side).map((d) => d.label).join(', ')}.`}</p>`}</div>`;
  }
  function lockedHtml(f) {
    const year = f.season.year;
    return SIDES.map((side) => { const st = F.captainStatus(f, side); if (!st) return '';
      if (!st.pair) return `<div class="panel cap-side"><h3 style="margin:0">${SIDE_WORD[side]}</h3><p class="dim">${esc(st.reason)}</p></div>`;
      const why = inactiveText(f, st); const [a, b] = [st.pair.a, st.pair.b].map((id) => monsterOf(f, id));
      return `<div class="panel cap-side"><div class="row between"><h3 style="margin:0">${SIDE_WORD[side]}</h3><span class="chip ${st.active ? 'good' : 'warn'}">${st.active ? $t('roster.active') : $t('roster.inactive')}</span></div>
        <div class="cap-slots static">${[a, b].map((m, i) => `<div class="cap-slot static">${m ? monsterSprite(m, 44) : ''}<span class="cap-slot-name">${esc(m?.name || $t('roster.former_captain'))}</span><span class="dim">${esc(m?.position || '')}</span></div>${i === 0 ? `<span class="cap-amp" aria-hidden="true">&</span>` : ''}`).join('')}</div>
        <div class="cap-pairline"><b>${esc(CP.PAIR_TYPES[st.pair.type].label)}</b></div>${chemMeterHtml(st.progress)}
        <p class="${st.active ? 'dim' : 'cap-off'}" style="margin:6px 0 0">${st.active ? (st.progress.bonus ? `${$t('roster.on_their_key_ratings_when_both', { bonus: st.progress.bonus })}` : $t('roster.no_bonus_yet_chemistry_builds_as')) : esc(why)}</p></div>`; }).join('')
      + `<p class="dim">${$t('roster.captains_for_are_locked_through_the', { year: yearOf(year) })}</p>`;
  }

  Router.registerScreen('captains', {
    title: $t('roster.team_captains'),
    render({ f }) {
      if (!f?.season) return `<p>${$t('roster.no_franchise')}</p>`;
      const mode = modeOf(f);
      const intro = `<div class="panel tight cap-intro"><p style="margin:0">${$t('roster.captains_who_make_plays_together_build')}</p></div>`;
      if (mode === 'locked') return intro + lockedHtml(f);
      const d = ensureDraft(f, mode); const cands = F.captainCandidates(f); const sugg = F.suggestedCaptains(f);
      const when = mode === 'initial' ? `<div class="panel tight cap-note">${$t('roster.b_one_time_pick_b_your', { year: yearOf(f.season.year) })}</div>`
        : `<div class="panel tight cap-note">${$t('roster.b_captains_for_b_you_can', { year: yearOf(f.season.year + 1) })}${f.partnerships?.pick?.year === f.season.year + 1 ? ` <span class="chip good">${$t('roster.saved')}</span>` : ''}</div>`;
      return `${intro}${when}
        <button class="btn block" data-action="cap-suggest" style="margin-bottom:var(--s3)">${$t('roster.use_suggested_captains')}</button>
        ${SIDES.map((side) => sideHtml(f, cands, side, d[side], sugg)).join('')}
        <p class="dim">${$t('roster.captains_stay_the_same_all_season')}</p>
        <button class="btn primary big block" data-action="cap-confirm">${mode === 'initial' ? $t('roster.confirm_captains') : $t('roster.save_captains_for_next_season')}</button>`;
    },
    mount(root) {
      delegate(root, {
        go: (el) => Router.go(el.dataset.screen),
        'cap-suggest': () => { const f = app.f; const mode = modeOf(f); ensureDraft(f, mode); Object.assign(draft, pairFromSuggestion(F.suggestedCaptains(f))); Router.render(); },
        'cap-slot': (el) => {
          const f = app.f; const side = el.dataset.side; const i = Number(el.dataset.i); const d = ensureDraft(f, modeOf(f));
          const cands = F.captainCandidates(f); const other = d[side][1 - i] ? cands.find((c) => c.id === d[side][1 - i]) : null;
          const otherSide = SIDES.find((s) => s !== side); const taken = new Set(d[otherSide].filter(Boolean));
          const allowed = other ? partnersOf(other.position, side) : rolesOf(side);
          const list = cands.filter((c) => allowed.includes(c.position) && c.id !== other?.id && !taken.has(c.id)).sort((p, q) => (q.role === 'base') - (p.role === 'base') || q.ovr - p.ovr);
          const row = (c) => { const pair = other ? CP.orderPair(other, c) : null; const prog = pair ? CP.progressOf(pair.type, CP.chemistryCount(f, pair.a, pair.b)) : null; const m = monsterOf(f, c.id);
            return `<button class="item cap-pick" data-id="${c.id}">${m ? monsterSprite(m, 32) : ''}<div class="grow"><div class="name">${esc(c.name)} <span class="dim">${c.position} · ${c.ovr} OVR · ${ROLE_WORD[c.role]}</span></div>${prog ? `<div class="sub">${chemMeterHtml(prog, { compact: true })}${CP.SLOW_TYPES.includes(pair.type) ? ` <span class="chip warn">${$t('roster.slow_to_build')}</span>` : ''}</div>` : ''}</div></button>`; };
          const { close } = sheet(`<p class="dim" style="margin-top:0">${other ? `${$t('roster.partners_for', { name: esc(other.name), position: other.position })}` : `${$t('roster.choose_a')} ${allowed.join(', ')}.`} ${$t('roster.starters_play_the_most_so_they')}</p><div class="list">${list.map(row).join('') || `<p class="dim">${$t('roster.nobody_eligible')}</p>`}</div>`, { title: `${$t('roster.captain_2', { sideWord: SIDE_WORD[side], i: i + 1 })}` });
          document.querySelectorAll('.sheet .cap-pick').forEach((b) => b.addEventListener('click', () => {
            const id = b.dataset.id; d[side][i] = id;
            const a = cands.find((c) => c.id === d[side][0]), z = cands.find((c) => c.id === d[side][1]);
            if (a && z && !CP.orderPair(a, z)) d[side][1 - i] = null; // the other slot no longer fits: choose again
            close(); Router.render();
          }));
        },
        'cap-confirm': () => {
          const f = app.f; const mode = modeOf(f); const d = ensureDraft(f, mode); const choice = { offense: d.offense, defense: d.defense };
          if ([...d.offense, ...d.defense].some((x) => !x)) { toast($t('roster.choose_all_four_captains_or_use'), 'bad'); return; }
          const r = mode === 'initial' ? F.chooseInitialCaptains(f, choice) : F.pickCaptains(f, choice);
          if (!r.ok) { toast(r.reason, 'bad'); return; }
          app.save(); draft = null; toast(mode === 'initial' ? $t('roster.captains_named_chemistry_starts_with_your') : $t('roster.captains_saved_for_next_season')); Router.go('hq', {}, { reset: true });
        },
      });
    },
  });
}
