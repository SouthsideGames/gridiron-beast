import { SPECIES_DEX } from '../../data/species.js';
import { formsOf } from '../../data/beast-dex.js';
import { dexContent, templateDevelopment } from '../../dex/content.js';
import { auditDexContent } from '../../dex/content-audit.js';
import { speciesSheet, bindDexProfile, showPortraitReaction, releaseDexProfiles } from './dex.js';
import { dexMotion } from '../dex-motion.js';
import { REVIEW_COMPONENTS, dexReviews, dexReviewStatus, saveDexReview } from '../../dex/reviews.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
import { esc, delegate, sheet, toast } from '../dom.js';

export const DEX_REVIEW_CATALOG = Object.freeze(SPECIES_DEX.flatMap(species => formsOf(species.id).map(form => ({ species, form }))));
const coverage = auditDexContent();
const LABEL = { visuals: 'Visuals and motion', audio: 'Cry', lore: 'Writing and lore', football: 'Football', clash: 'Beast Clash', progression: 'Progression' };
const SHORT = { visuals: 'Visuals', audio: 'Cry', lore: 'Lore', football: 'Football', clash: 'Clash', progression: 'Progress' };
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', revision: 'Needs revision' };
export function registerBeastDexReviewer(Router) {
  let selected = DEX_REVIEW_CATALOG[0].form.id, games = 0, view = 'species', filter = 'all', component = 'lore';
  let search = '', element = 'All', contentFilter = 'all', activeTab = 'Profile', activeRoot = null, saveTimer = null, storageFailed = false, filtersOpen = false;
  const rows = (snapshot = dexReviews()) => DEX_REVIEW_CATALOG.filter(row =>
    (filter === 'all' || dexReviewStatus(row.form.id, component, snapshot) === filter) &&
    (element === 'All' || row.species.element === element) &&
    `${row.form.name} ${row.species.name} ${row.form.id}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (contentFilter === 'all' || dexContent(row.species.id, row.form.stage).expanded === (contentFilter === 'expanded')));
  function saveDraft(root) {
    if (!root) return true;
    clearTimeout(saveTimer);
    activeTab = root.querySelector('[data-dex-tab][aria-selected="true"]')?.dataset.dexTab || activeTab;
    let saved = true;
    const snapshot = dexReviews();
    for (const row of root.querySelectorAll('[data-review-component]')) {
      const c = row.dataset.reviewComponent, id = row.dataset.reviewId;
      const status = row.querySelector('[data-review-status]:checked')?.value || 'pending', notes = row.querySelector('[data-review-notes]').value;
      const previous = snapshot[id]?.[c];
      if (status !== dexReviewStatus(id, c, snapshot) || notes !== (previous?.notes || '')) saved = saveDexReview(id, c, status, notes) && saved;
    }
    if (!saved) { storageFailed = true; root.querySelector('[data-storage-warning]')?.removeAttribute('hidden'); }
    return saved;
  }
  const saveAndWarn = root => { if (!saveDraft(root)) toast('Device storage unavailable. Your notes are kept for this session only: export feedback before leaving.'); };
  Router.registerScreen('beast-dex-reviewer', {
    title: 'Beast Dex Reviewer', tabs: false,
    render({ f }) {
      const snapshot = dexReviews(), available = rows(snapshot);
      if (!available.some(row => row.form.id === selected)) selected = available[0]?.form.id || '';
      const row = DEX_REVIEW_CATALOG.find(row => row.form.id === selected);
      const counts = { pending: 0, approved: 0, revision: 0 };
      for (const item of DEX_REVIEW_CATALOG) counts[dexReviewStatus(item.form.id, component, snapshot)]++;
      const selection = `<label class="dexp-field">Search forms<input data-change="search" value="${esc(search)}" placeholder="Name or family ID" enterkeyhint="search"></label><label class="dexp-field">Element<select data-change="element">${['All', ...new Set(SPECIES_DEX.map(s => s.element))].map(v => `<option ${v === element ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><label class="dexp-field">Review component<select data-change="component">${REVIEW_COMPONENTS.map(c => `<option value="${c}" ${c === component ? 'selected' : ''}>${esc(LABEL[c])}</option>`).join('')}</select></label><label class="dexp-field">Status<select data-change="filter">${['all','pending','approved','revision'].map(v => `<option value="${v}" ${v === filter ? 'selected' : ''}>${v === 'all' ? 'Any status' : STATUS_LABEL[v]}</option>`).join('')}</select></label><label class="dexp-field">Content<select data-change="content">${[['all','All content'],['expanded','Expanded drafts'],['remaining','Writing backlog']].map(([v,label]) => `<option value="${v}" ${v === contentFilter ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
      const active = [search && `“${search}”`, element !== 'All' && element, filter !== 'all' && `${LABEL[component]}: ${STATUS_LABEL[filter]}`, contentFilter !== 'all' && (contentFilter === 'expanded' ? 'expanded drafts' : 'writing backlog')].filter(Boolean);
      const warning = `<p class="dexr-warn" data-storage-warning role="alert" ${storageFailed ? '' : 'hidden'}>Device storage is unavailable. Your notes and verdicts are kept for this session only. Export feedback before leaving.</p>`;
      const header = `<div class="dexr-intro"><p class="muted">Review drafts without changing franchise unlocks, saves or progression. Feedback stays on this device; export to share it. Changed content returns to pending. The sample My Beast uses preview attributes and has no career.</p>
        <div class="dexr-summary"><span><b>${coverage.expanded}/${coverage.forms}</b> forms drafted${coverage.remaining ? ` · ${coverage.remaining} awaiting writing` : ''}</span><span>${esc(LABEL[component])}: <b class="st-approved">${counts.approved}</b> approved · <b class="st-revision">${counts.revision}</b> revision · <b>${counts.pending}</b> pending</span></div>
        ${warning}
        <details class="dexr-filters" data-filters ${filtersOpen ? 'open' : ''}><summary>Filters and search${active.length ? ` · ${esc(active.join(' · '))}` : ''} <span class="dim">(${available.length} of ${DEX_REVIEW_CATALOG.length})</span></summary><div class="dexr-filter-grid">${selection}</div></details>
        <button data-action="report" class="btn small">Export Feedback</button></div>`;
      if (!row) return `<div class="dexr">${header}<p class="panel">No forms match these filters.</p></div>`;
      const { species: s, form } = row;
      const reviews = snapshot[form.id] || {}, content = dexContent(s.id, form.stage);
      const monster = view === 'individual' ? f?.roster?.find(m => m.species === s.id && (m.stage || 0) === form.stage) || {
        id: `dex-preview:${form.id}`, species: s.id, stage: form.stage, name: `${form.name} (sample)`, position: s.position,
        attributes: Object.fromEntries(Object.entries(form.starting).map(([key, band]) => [key, Math.round((band[0] + band[1]) / 2)])),
      } : null;
      const realMonster = monster && !String(monster.id).startsWith('dex-preview:');
      const index = available.findIndex(x => x.form.id === selected) + 1;
      const strip = REVIEW_COMPONENTS.map(c => { const st = dexReviewStatus(form.id, c, snapshot); return `<button type="button" class="dexr-dot st-${st}" data-action="jump" data-id="${c}" title="${esc(LABEL[c])}: ${STATUS_LABEL[st]}"><span>${SHORT[c]}</span></button>`; }).join('');
      const nav = `<div class="dexr-nav"><button data-action="previous" class="btn small" aria-label="Previous form">‹ Prev</button><div class="dexr-where"><b>${esc(form.name)}</b><span class="dim">${index} of ${available.length}${available.length !== DEX_REVIEW_CATALOG.length ? ` · ${DEX_REVIEW_CATALOG.length} total` : ''}</span></div><button data-action="next" class="btn small" aria-label="Next form">Next ›</button><div class="dexr-strip" aria-label="Review status of this form">${strip}</div></div>`;
      const siblings = formsOf(s.id).map(x => `<button class="btn small dexr-sib st-${dexReviewStatus(x.id, component, snapshot)}" data-action="family-form" data-id="${esc(x.id)}" ${x.id === selected ? 'aria-current="true"' : ''}>${esc(x.name)}</button>`).join('');
      const seg = (name, value, options) => `<div class="dexr-seg" role="group" aria-label="${esc(name)}">${options.map(([v, label]) => `<button type="button" class="${String(v) === String(value) ? 'on' : ''}" aria-pressed="${String(v) === String(value)}" data-action="set-${name.toLowerCase().replace(/\W+/g, '-')}" data-id="${v}">${esc(label)}</button>`).join('')}</div>`;
      const motion = dexMotion(s.id, form.stage);
      const controls = `<div class="dexr-controls">
        <label class="dexp-field dexr-form">Form<select data-change="form">${available.map(x => `<option value="${esc(x.form.id)}" ${x.form.id === selected ? 'selected' : ''}>${esc(x.form.name)} · ${esc(x.species.element)}</option>`).join('')}</select></label>
        <div class="dexr-row" aria-label="Evolution family">${siblings}</div>
        <div class="dexr-row"><span class="dexr-k">View</span>${seg('View', view, [['species', 'Species'], ['individual', realMonster || !f ? 'My Beast' : 'My Beast (sample)']])}</div>
        <div class="dexr-row"><span class="dexr-k">Lore games</span>${seg('Lore games', games, [0, 4, 5, 14, 15, 29, 30].map(n => [n, String(n)]))}</div>
        <div class="dexr-row"><button data-action="cry" class="btn small">▶ Play Cry</button><button class="btn small" data-action="reaction">Normal Reaction</button><button class="btn small" data-action="rare-reaction">Rare Reaction</button></div>
        <p class="dim dexr-meta">Motion: ${esc(motion?.label || 'none')}<br>Content: ${esc(content.status)} · ${content.lore.length}/3 lore entries · ${content.relationships.length}/3 relationships${templateDevelopment(content) ? ' · development line is the template that repeats Personality (hidden in the Dex; needs writing)' : ''}${view === 'individual' ? ` · ${realMonster ? `real beast from your roster (${esc(monster.name)})` : 'sample beast (no career)'}` : ''}</p></div>`;
      const cards = REVIEW_COMPONENTS.map(c => {
        const st = dexReviewStatus(form.id, c, snapshot); const stored = reviews[c];
        const changed = stored && stored.status !== 'pending' && st === 'pending' ? `<p class="dexr-changed">Content changed since your “${esc(STATUS_LABEL[stored.status] || stored.status)}” verdict, so it is pending again. Your notes are kept.</p>` : '';
        return `<section class="dexr-card st-${st}" id="dexr-${c}" data-review-component="${c}" data-review-id="${esc(form.id)}"><h3>${esc(LABEL[c])}</h3>${changed}<fieldset class="dexr-status"><legend class="dexr-k">Verdict</legend>${['pending', 'approved', 'revision'].map(v => `<label class="v-${v}"><input type="radio" name="st-${esc(form.id)}-${c}" value="${v}" data-review-status ${v === st ? 'checked' : ''}><span>${STATUS_LABEL[v]}</span></label>`).join('')}</fieldset><label class="dexp-field">Feedback<textarea data-review-notes maxlength="4000" rows="3" placeholder="What should change? (saved as you type)">${esc(reviews[c]?.notes || '')}</textarea></label><div class="dexr-card-foot"><span class="dim" data-saved></span><button class="btn small" data-action="save">Save Review</button></div></section>`;
      }).join('');
      return `<div class="dexr">${header}${nav}${controls}<div class="dexr-preview">${speciesSheet(s, realMonster ? f : null, { monster, previewStage: form.stage, previewGames: games, revealAll: true, stagePicker: false, viewPicker: false })}</div><h2 class="dexr-h">Review ${esc(form.name)}</h2>${cards}</div>`;
    },
    mount(root, { f } = {}) {
      activeRoot = root;
      bindDexProfile(root, { f });
      root.querySelector(`[data-dex-tab="${activeTab}"]`)?.click();
      const changeSelection = update => { saveAndWarn(root); update(); stopCry(); Router.render(); };
      const mark = (el, text) => { const tag = el.closest('[data-review-component]')?.querySelector('[data-saved]'); if (tag) tag.textContent = text; };
      root.querySelectorAll('[data-review-notes], [data-review-status]').forEach(el => {
        el.addEventListener('change', () => { saveAndWarn(root); mark(el, storageFailed ? 'Kept for this session' : 'Saved'); if (el.matches('[data-review-status]')) { const card = el.closest('.dexr-card'); card.className = card.className.replace(/st-\w+/, `st-${el.value}`); } });
        el.addEventListener('input', () => { mark(el, 'Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveAndWarn(root); mark(el, storageFailed ? 'Kept for this session' : 'Saved'); }, 400); });
      });
      root.querySelector('[data-filters]')?.addEventListener('toggle', (e) => { filtersOpen = e.target.open; });
      const step = delta => {
        saveAndWarn(root);
        const candidates = new Set(rows().map(row => row.form.id));
        const index = DEX_REVIEW_CATALOG.findIndex(row => row.form.id === selected);
        for (let n = 1; n <= DEX_REVIEW_CATALOG.length; n++) {
          const next = DEX_REVIEW_CATALOG[(index + delta * n + DEX_REVIEW_CATALOG.length) % DEX_REVIEW_CATALOG.length];
          if (candidates.has(next.form.id)) { selected = next.form.id; break; }
        }
        stopCry(); Router.render();
      };
      const react = rare => { const button = root.querySelector('[data-dex-react]'); if (button) showPortraitReaction(button, rare); };
      delegate(root, {
        form: el => changeSelection(() => { selected = el.value; }),
        'family-form': el => changeSelection(() => { selected = el.dataset.id; filter = 'all'; contentFilter = 'all'; search = ''; }),
        component: el => changeSelection(() => { component = el.value; }),
        filter: el => changeSelection(() => { filter = el.value; }),
        element: el => changeSelection(() => { element = el.value; }),
        content: el => changeSelection(() => { contentFilter = el.value; }),
        search: el => changeSelection(() => { search = el.value; }),
        'set-view': el => changeSelection(() => { view = el.dataset.id; }),
        'set-lore-games': el => changeSelection(() => { games = Number(el.dataset.id); }),
        jump: el => { const card = root.querySelector(`#dexr-${el.dataset.id}`); const nav = root.querySelector('.dexr-nav'); if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - (document.querySelector('.topbar')?.offsetHeight || 48) - (nav?.offsetHeight || 92) - 8, behavior: 'smooth' }); card?.querySelector('[data-review-status]:checked')?.focus({ preventScroll: true }); },
        previous: () => step(-1), next: () => step(1), reaction: () => react(false), 'rare-reaction': () => react(true),
        cry: () => { const row = DEX_REVIEW_CATALOG.find(x => x.form.id === selected); if (row) playMonsterCry({ species: row.species.id, stage: row.form.stage }); },
        save: () => toast(saveDraft(root) ? 'Review saved.' : 'Device storage unavailable. Your notes are kept for this session only: export feedback before leaving.'),
        report: () => { saveDraft(root); sheet(`<textarea readonly rows="15" style="width:100%">${esc(JSON.stringify({ version: 2, coverage, reviews: dexReviews() }, null, 2))}</textarea>`, { title: 'Beast Dex Feedback — Copy to Share' }); },
      });
    },
    unmount() { saveAndWarn(activeRoot); activeRoot = null; clearTimeout(saveTimer); stopCry(); releaseDexProfiles(); },
  });
}
