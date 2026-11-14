// Editorial validation and coverage, independent of player saves or review verdicts.
import { FAMILIES, FORMS, familyById, formsOf } from '../data/beast-dex.js';
import { dexContent, EDITORIAL_DRAFTS } from './content.js';
const text = value => typeof value === 'string' && value.trim().length > 0;
const KINDS = ['friendship', 'rivalry', 'legendary folklore'];
export function auditDexContent() {
  const errors = [], missing = [], expanded = [];
  for (const [id, stages] of Object.entries(EDITORIAL_DRAFTS)) {
    if (!familyById(id)) errors.push(`${id}: unknown editorial family`);
    if (stages.length !== formsOf(id).length) errors.push(`${id}: editorial stages do not match evolution family`);
  }
  for (const form of FORMS) {
    const c = dexContent(form.familyId, form.stage);
    if (!c.expanded) { missing.push(form.id); continue; }
    expanded.push(form.id);
    if (!Array.isArray(c.biography) || c.biography.length < 2 || !c.biography.every(text)) errors.push(`${form.id}: needs at least two biography paragraphs`);
    for (const field of ['personality', 'habitat', 'development']) if (!text(c[field])) errors.push(`${form.id}: missing ${field}`);
    if (c.funFacts.length < 2 || !c.funFacts.every(text)) errors.push(`${form.id}: needs two fun facts`);
    if (JSON.stringify(c.lore.map(x => x.games).sort((a,b) => a-b)) !== '[5,15,30]' || c.lore.some(x => !text(x.title) || !text(x.text))) errors.push(`${form.id}: needs one complete lore entry at each threshold`);
    for (const reaction of ['normal', 'rare']) if (!c.reactions?.[reaction]?.length || !c.reactions[reaction].every(text)) errors.push(`${form.id}: missing ${reaction} reaction`);
    if (c.relationships.length > 3) errors.push(`${form.id}: more than three relationships`);
    const targets = new Set();
    for (const relation of c.relationships) {
      const target = familyById(relation.familyId);
      if (!target || relation.familyId === form.familyId || targets.has(relation.familyId)) errors.push(`${form.id}: invalid or duplicate relationship target ${relation.familyId}`);
      targets.add(relation.familyId);
      if (!KINDS.includes(relation.kind) || ![5,15,30].includes(relation.games) || !text(relation.text)) errors.push(`${form.id}: malformed relationship`);
      const reciprocal = dexContent(relation.familyId)?.relationships.some(x => x.familyId === form.familyId && x.kind === relation.kind);
      if (!reciprocal) errors.push(`${form.id}: relationship lacks reciprocal entry`);
      if (relation.kind === 'legendary folklore' && target?.rarity !== 'legendary' && familyById(form.familyId)?.rarity !== 'legendary') errors.push(`${form.id}: folklore connection has no legendary species`);
    }
  }
  return { families: FAMILIES.length, forms: FORMS.length, expanded: expanded.length, remaining: missing.length, expandedIds: expanded, missing, errors };
}
