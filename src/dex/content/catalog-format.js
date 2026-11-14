// Compact authoring format: every row is individually written, with explicit
// biography paragraphs, personality, two facts, three lore beats, and a reaction.
// The loader supplies only authoritative names/regions and the fixed milestones.
import { familyById, formsOf } from '../../data/beast-dex.js';
import { SPECIES_DEX, ELEMENT_REGIONS } from '../../data/species.js';
const species = new Map(SPECIES_DEX.map(s => [s.id, s]));
export function editorialRows(rows) {
  const output = {};
  for (const row of rows) {
    const [id, first, second, personality, facts, lore, reaction] = row;
    const split = id.split(':'); const familyId = split[0], stage = Number(split[1] || 0);
    const family = familyById(familyId), form = formsOf(familyId).find(f => f.stage === stage);
    if (!family || !form) throw new Error(`Unknown editorial form: ${id}`);
    if (!first || !second || !personality || facts.length !== 2 || lore.length !== 3 || !reaction) throw new Error(`Incomplete authored row: ${id}`);
    const regions = species.get(familyId)?.regions || ELEMENT_REGIONS[family.type] || [];
    const record = {
      biography: [(stage === 0 ? family.description + ' ' : '') + first, second], personality,
      habitat: `${form.name} is found in ${regions.join(' and ')}.`, // the first fun fact was appended here too, so it appeared twice on the Profile tab
      funFacts: facts,
      development: formsOf(familyId).length === 1 ? `This species has no further evolution. Growing familiarity reveals its established character: ${personality}` : `At this stage of the family’s development, ${form.name} shows this outlook: ${personality}`,
      lore: lore.map((text, i) => ({ games: [5,15,30][i], title: [`Getting to know ${form.name}`, 'Behind the routine', 'A closer bond'][i], text })),
      reactions: { normal: [`{name} ${reaction}`], rare: [`{name} ${facts[1].charAt(0).toLowerCase() + facts[1].slice(1)}`] },
    };
    output[familyId] ||= [];
    if (output[familyId][stage]) throw new Error(`Duplicate editorial form: ${id}`);
    output[familyId][stage] = record;
  }
  return output;
}
