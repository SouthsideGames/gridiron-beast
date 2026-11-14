import { SPECIES_DEX } from '../../data/species.js';
import { formsOf } from '../../data/beast-dex.js';
import { dexContent } from '../../dex/content.js';
import { speciesSheet, bindDexProfile } from './dex.js';
import { REVIEW_COMPONENTS, dexReviews, dexReviewStatus, saveDexReview } from '../../dex/reviews.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
import { esc, delegate, sheet, toast } from '../dom.js';

export const DEX_REVIEW_CATALOG = Object.freeze(SPECIES_DEX.flatMap(species => formsOf(species.id).map(form => ({ species, form }))));
export function registerBeastDexReviewer(Router) {
  let selected = DEX_REVIEW_CATALOG[0].form.id, games = 0, view = 'species', filter = 'all', component = 'lore';
  const rows = () => DEX_REVIEW_CATALOG.filter(row => filter === 'all' || dexReviewStatus(row.form.id, component) === filter);
  function saveDraft(root) {
    let saved = true;
    for (const row of root.querySelectorAll('[data-review-component]')) {
      const c = row.dataset.reviewComponent, id = row.dataset.reviewId;
      const status = row.querySelector('[data-review-status]').value, notes = row.querySelector('[data-review-notes]').value;
      const previous = dexReviews()[id]?.[c];
      if (status !== dexReviewStatus(id, c) || notes !== (previous?.notes || '')) saved = saveDexReview(id, c, status, notes) && saved;
    }
    return saved;
  }
  Router.registerScreen('beast-dex-reviewer', {
    title: 'Beast Dex Reviewer', tabs: false,
    render({ f }) {
      const available = rows();
      if (!available.some(row => row.form.id === selected)) selected = available[0]?.form.id || '';
      const row = DEX_REVIEW_CATALOG.find(row => row.form.id === selected);
      const selection = `<label>Review component <select data-change="component">${REVIEW_COMPONENTS.map(c => `<option ${c === component ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label>Status filter <select data-change="filter">${['all','pending','approved','revision'].map(v => `<option ${v === filter ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
      const header = `<p>Review drafts without changing franchise unlocks. Feedback stays on this device; export to share. Changed content returns to pending. Sample My Beast uses preview attributes and has no fabricated career.</p>${selection}<button data-action="report" class="btn">Export feedback</button>`;
      if (!row) return `${header}<p>No forms match this filter.</p>`;
      const { species: s, form } = row;
      const reviews = dexReviews()[form.id] || {}, content = dexContent(s.id, form.stage);
      const monster = view === 'individual' ? f?.roster?.find(m => m.species === s.id && (m.stage || 0) === form.stage) || {
        id: `dex-preview:${form.id}`, species: s.id, stage: form.stage, name: `${form.name} (sample)`, position: s.position,
        attributes: Object.fromEntries(Object.entries(form.starting).map(([key, band]) => [key, Math.round((band[0] + band[1]) / 2)])),
      } : null;
      const realMonster = monster && !String(monster.id).startsWith('dex-preview:');
      return `${header}<label>Form <select data-change="form">${available.map(x => `<option value="${esc(x.form.id)}" ${x.form.id === selected ? 'selected' : ''}>${esc(x.form.name)} · ${esc(x.species.element)}</option>`).join('')}</select></label><p>${available.findIndex(x => x.form.id === selected) + 1} of ${available.length} matching forms · ${DEX_REVIEW_CATALOG.length} total</p><div class="row"><button data-action="previous" class="btn">Previous</button><button data-action="next" class="btn">Next</button><button data-action="cry" class="btn">Play cry</button></div><label>View <select data-change="view"><option value="species" ${view === 'species' ? 'selected' : ''}>Species View</option><option value="individual" ${view === 'individual' ? 'selected' : ''}>My Beast View</option></select></label><label>Lore preview <select data-change="games">${[0,5,15,30].map(n => `<option ${n === games ? 'selected' : ''}>${n}</option>`).join('')}</select></label><p class="dim">Content: ${esc(content.status)} · ${content.lore.length}/3 lore entries · ${content.relationships.length}/3 relationships</p>${speciesSheet(s, realMonster ? f : null, { monster, previewStage: form.stage, previewGames: games, revealAll: true, stagePicker: false })}${REVIEW_COMPONENTS.map(c => `<section data-review-component="${c}" data-review-id="${esc(form.id)}"><h3>${esc(c)}</h3><label>Status<select data-review-status>${['pending','approved','revision'].map(v => `<option ${v === dexReviewStatus(form.id, c) ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Feedback<textarea data-review-notes maxlength="4000">${esc(reviews[c]?.notes || '')}</textarea></label><button class="btn" data-action="save">Save review</button></section>`).join('')}`;
    },
    mount(root, { f } = {}) {
      bindDexProfile(root, { f });
      const change = () => { if (!saveDraft(root)) toast('Device storage unavailable. Export feedback before leaving.'); stopCry(); Router.render(); };
      root.querySelectorAll('[data-review-notes], [data-review-status]').forEach(el => el.addEventListener('change', () => { if (!saveDraft(root)) toast('Feedback retained for this session. Export before leaving.'); }));
      const step = delta => { const available = rows(); const index = available.findIndex(row => row.form.id === selected); selected = available[(index + delta + available.length) % available.length]?.form.id || ''; change(); };
      delegate(root, {
        form: el => { const id = el.value; changeSelection(() => { selected = id; }); },
        component: el => changeSelection(() => { component = el.value; }),
        filter: el => changeSelection(() => { filter = el.value; }),
        view: el => changeSelection(() => { view = el.value; }),
        games: el => changeSelection(() => { games = Number(el.value); }),
        previous: () => step(-1), next: () => step(1),
        cry: () => { const row = DEX_REVIEW_CATALOG.find(x => x.form.id === selected); if (row) playMonsterCry({ species: row.species.id, stage: row.form.stage }); },
        save: () => toast(saveDraft(root) ? 'Review saved.' : 'Device storage unavailable. Export feedback before leaving.'),
        report: () => { saveDraft(root); sheet(`<textarea readonly rows="15" style="width:100%">${esc(JSON.stringify({ version: 2, reviews: dexReviews() }, null, 2))}</textarea>`, { title: 'Beast Dex feedback — copy to share' }); },
      });
      function changeSelection(update) { saveDraft(root); update(); change(); }
    },
    unmount: stopCry,
  });
}
