import { SPECIES_DEX } from '../../data/species.js';
import { speciesSheet, bindDexProfile } from './dex.js';
import { REVIEW_COMPONENTS, dexReviews, saveDexReview } from '../../dex/reviews.js';
import { playMonsterCry } from '../../audio/detail-audio.js';
import { stopCry } from '../../audio/monster-cries.js';
import { esc, delegate, sheet, toast } from '../dom.js';
export function registerBeastDexReviewer(Router) {
  let index = 0, games = 0;
  Router.registerScreen('beast-dex-reviewer', {
    title: 'Beast Dex Reviewer', tabs: false,
    render({ f }) {
      const s = SPECIES_DEX[index];
      const reviews = dexReviews()[s.id] || {};
      return `<p>Review drafts without changing franchise unlocks. Feedback is saved on this device; export it before sharing. Expanded biographies and animations are still pending.</p><label>Species <select data-change="species">${SPECIES_DEX.map((x,i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label><p>${index + 1} of ${SPECIES_DEX.length} families</p><button data-action="cry" class="btn">Play cry</button><button data-action="report" class="btn">Export feedback</button><label>Lore preview <select data-change="games">${[0,5,15,30].map(n => `<option ${n === games ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${speciesSheet(s, f, { previewGames: games, revealAll: true })}${REVIEW_COMPONENTS.map(c => `<section data-review-component="${c}"><h3>${esc(c)}</h3><label>Status<select data-review-status>${['pending','approved','revision'].map(v => `<option ${v === (reviews[c]?.status || 'pending') ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Feedback<textarea data-review-notes maxlength="4000">${esc(reviews[c]?.notes || '')}</textarea></label><button class="btn" data-action="save" data-component="${c}">Save review</button></section>`).join('')}`;
    },
    mount(root) {
      bindDexProfile(root);
      delegate(root, {
        species: el => { stopCry(); index = Number(el.value); Router.render(); },
        games: el => { games = Number(el.value); Router.render(); },
        cry: () => playMonsterCry(SPECIES_DEX[index].id),
        save: el => { const row = el.closest('[data-review-component]'); toast(saveDexReview(SPECIES_DEX[index].id, el.dataset.component, row.querySelector('[data-review-status]').value, row.querySelector('[data-review-notes]').value) ? 'Review saved.' : 'Device storage unavailable. Export feedback before leaving.'); },
        report: () => { sheet(`<textarea readonly rows="15" style="width:100%">${esc(JSON.stringify({ version: 1, reviews: dexReviews() }, null, 2))}</textarea>`, { title: 'Beast Dex feedback — copy to share' }); },
      });
    },
    unmount: stopCry,
  });
}
