import { SPECIES_DEX } from '../../data/species.js';
import { formsOf } from '../../data/beast-dex.js';
import { dexContent } from '../../dex/content.js';
import { auditDexContent } from '../../dex/content-audit.js';
import { speciesSheet, bindDexProfile, showPortraitReaction } from './dex.js';
import { REVIEW_COMPONENTS, dexReviews, dexReviewStatus, saveDexReview } from '../../dex/reviews.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
import { esc, delegate, sheet, toast } from '../dom.js';

export const DEX_REVIEW_CATALOG = Object.freeze(SPECIES_DEX.flatMap(species => formsOf(species.id).map(form => ({ species, form }))));
const coverage = auditDexContent();
export function registerBeastDexReviewer(Router) {
  let selected = DEX_REVIEW_CATALOG[0].form.id, games = 0, view = 'species', filter = 'all', component = 'lore';
  let search = '', element = 'All', contentFilter = 'all', activeTab = 'Profile', activeRoot = null, saveTimer = null;
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
      const status = row.querySelector('[data-review-status]').value, notes = row.querySelector('[data-review-notes]').value;
      const previous = snapshot[id]?.[c];
      if (status !== dexReviewStatus(id, c, snapshot) || notes !== (previous?.notes || '')) saved = saveDexReview(id, c, status, notes) && saved;
    }
    return saved;
  }
  const saveAndWarn = root => { if (!saveDraft(root)) toast('Device storage unavailable. Export feedback before leaving.'); };
  Router.registerScreen('beast-dex-reviewer', {
    title: 'Beast Dex Reviewer', tabs: false,
    render({ f }) {
      const snapshot = dexReviews(), available = rows(snapshot);
      if (!available.some(row => row.form.id === selected)) selected = available[0]?.form.id || '';
      const row = DEX_REVIEW_CATALOG.find(row => row.form.id === selected);
      const counts = { pending: 0, approved: 0, revision: 0 };
      for (const item of DEX_REVIEW_CATALOG) counts[dexReviewStatus(item.form.id, component, snapshot)]++;
      const selection = `<label>Search forms<input data-change="search" value="${esc(search)}" placeholder="Name or family ID"></label><label>Element<select data-change="element">${['All', ...new Set(SPECIES_DEX.map(s => s.element))].map(v => `<option ${v === element ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><label>Content<select data-change="content">${[['all','All content'],['expanded','Expanded drafts'],['remaining','Writing backlog']].map(([v,label]) => `<option value="${v}" ${v === contentFilter ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Review component<select data-change="component">${REVIEW_COMPONENTS.map(c => `<option ${c === component ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>Status filter<select data-change="filter">${['all','pending','approved','revision'].map(v => `<option ${v === filter ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
      const header = `<p>Review drafts without changing franchise unlocks. Feedback stays on this device; export to share. Changed content returns to pending. Sample My Beast uses preview attributes and has no fabricated career.</p><p class="panel">${coverage.expanded}/${coverage.forms} expanded form drafts · ${coverage.remaining} awaiting writing</p><p>${esc(component)}: ${counts.pending} pending · ${counts.approved} approved · ${counts.revision} need revision</p>${selection}<button data-action="report" class="btn">Export feedback</button>`;
      if (!row) return `${header}<p>No forms match these filters.</p>`;
      const { species: s, form } = row;
      const reviews = snapshot[form.id] || {}, content = dexContent(s.id, form.stage);
      const monster = view === 'individual' ? f?.roster?.find(m => m.species === s.id && (m.stage || 0) === form.stage) || {
        id: `dex-preview:${form.id}`, species: s.id, stage: form.stage, name: `${form.name} (sample)`, position: s.position,
        attributes: Object.fromEntries(Object.entries(form.starting).map(([key, band]) => [key, Math.round((band[0] + band[1]) / 2)])),
      } : null;
      const realMonster = monster && !String(monster.id).startsWith('dex-preview:');
      const siblings = formsOf(s.id).map(x => `<button class="btn small" data-action="family-form" data-id="${esc(x.id)}" ${x.id === selected ? 'aria-current="true"' : ''}>${esc(x.name)} · ${dexReviewStatus(x.id, component, snapshot)}</button>`).join('');
      return `${header}<label>Form<select data-change="form">${available.map(x => `<option value="${esc(x.form.id)}" ${x.form.id === selected ? 'selected' : ''}>${esc(x.form.name)} · ${esc(x.species.element)}</option>`).join('')}</select></label><p>${available.findIndex(x => x.form.id === selected) + 1} of ${available.length} matching forms · ${DEX_REVIEW_CATALOG.length} total</p><div class="row"><button data-action="previous" class="btn">Previous</button><button data-action="next" class="btn">Next</button><button data-action="cry" class="btn">Play cry</button></div><div class="row" aria-label="Evolution family">${siblings}</div><label>View<select data-change="view"><option value="species" ${view === 'species' ? 'selected' : ''}>Species View</option><option value="individual" ${view === 'individual' ? 'selected' : ''}>My Beast View</option></select></label><label>Lore preview<select data-change="games">${[0,4,5,14,15,29,30].map(n => `<option ${n === games ? 'selected' : ''}>${n}</option>`).join('')}</select></label><p class="dim">Content: ${esc(content.status)} · ${content.lore.length}/3 lore entries · ${content.relationships.length}/3 relationships</p><div class="row"><button class="btn small" data-action="reaction">Preview normal reaction</button><button class="btn small" data-action="rare-reaction">Preview rare reaction</button></div>${speciesSheet(s, realMonster ? f : null, { monster, previewStage: form.stage, previewGames: games, revealAll: true, stagePicker: false, viewPicker: false })}${REVIEW_COMPONENTS.map(c => `<section data-review-component="${c}" data-review-id="${esc(form.id)}"><h3>${esc(c)}</h3><label>Status<select data-review-status>${['pending','approved','revision'].map(v => `<option ${v === dexReviewStatus(form.id, c, snapshot) ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Feedback<textarea data-review-notes maxlength="4000">${esc(reviews[c]?.notes || '')}</textarea></label><button class="btn" data-action="save">Save review</button></section>`).join('')}`;
    },
    mount(root, { f } = {}) {
      activeRoot = root;
      bindDexProfile(root, { f });
      root.querySelector(`[data-dex-tab="${activeTab}"]`)?.click();
      const changeSelection = update => { saveAndWarn(root); update(); stopCry(); Router.render(); };
      root.querySelectorAll('[data-review-notes], [data-review-status]').forEach(el => {
        el.addEventListener('change', () => saveAndWarn(root));
        el.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveAndWarn(root), 250); });
      });
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
        view: el => changeSelection(() => { view = el.value; }),
        games: el => changeSelection(() => { games = Number(el.value); }),
        previous: () => step(-1), next: () => step(1), reaction: () => react(false), 'rare-reaction': () => react(true),
        cry: () => { const row = DEX_REVIEW_CATALOG.find(x => x.form.id === selected); if (row) playMonsterCry({ species: row.species.id, stage: row.form.stage }); },
        save: () => toast(saveDraft(root) ? 'Review saved.' : 'Device storage unavailable. Export feedback before leaving.'),
        report: () => { saveDraft(root); sheet(`<textarea readonly rows="15" style="width:100%">${esc(JSON.stringify({ version: 2, coverage, reviews: dexReviews() }, null, 2))}</textarea>`, { title: 'Beast Dex feedback — copy to share' }); },
      });
    },
    unmount() { saveAndWarn(activeRoot); activeRoot = null; clearTimeout(saveTimer); stopCry(); },
  });
}
