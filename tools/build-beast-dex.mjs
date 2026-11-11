#!/usr/bin/env node
// Task 8 WP1: build the game-side Beast Dex module from the authoritative GitHub Beast Dex (docs/beast-dex/data).
// Writes src/data/beast-dex.generated.js: frozen families (192), forms (222), mode abilities (144) and the approved rules,
// plus SHA-256 hashes of the source files so drift between the Dex and the game data is detectable.
//   node tools/build-beast-dex.mjs           write the module
//   node tools/build-beast-dex.mjs --check   exit 1 if the module is out of date with the Dex
// The module is data only. Nothing in the running game imports it yet (Task 8 wiring is a later work package).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'docs/beast-dex/data');
const OUT = path.join(ROOT, 'src/data/beast-dex.generated.js');
const SOURCES = ['families.json', 'forms.json', 'abilities.json', 'rules.json', 'task8-overrides.json'];

// Appendix C (approved attribute roles by position): "Active" / "Not used" per attribute, parsed from the specification appendix.
function parseAttributeRoles(md) {
  const sec = md.slice(md.indexOf('# Appendix C')); const roles = {}; let pos = null;
  for (const line of sec.split('\n')) {
    const h = line.match(/^## (\w+)/); if (h) { pos = h[1]; roles[pos] = {}; continue; }
    const r = line.match(/^\|\s*(Speed|Agility|Strength|Awareness|Catching|Arm|Accuracy|Blocking|Tackling|Coverage|Durability|Kicking)\s*\|\s*(Active|Not used)\s*\|/);
    if (pos && r) roles[pos][r[1].toLowerCase()] = r[2] === 'Active';
  }
  for (const [p, m] of Object.entries(roles)) if (Object.keys(m).length !== 12) throw new Error(`Appendix C: ${p} has ${Object.keys(m).length} attributes`);
  if (Object.keys(roles).length !== 10) throw new Error('Appendix C: expected 10 positions');
  return roles;
}

export function buildModule() {
  const raw = Object.fromEntries(SOURCES.map((f) => [f, fs.readFileSync(path.join(DATA, f), 'utf8')]));
  const appendix = fs.readFileSync(path.join(ROOT, 'docs/beast-dex/SPECIFICATION_APPENDICES.md'), 'utf8');
  const hashes = Object.fromEntries(SOURCES.map((f) => [f, crypto.createHash('sha256').update(raw[f]).digest('hex')]));
  hashes['SPECIFICATION_APPENDICES.md'] = crypto.createHash('sha256').update(appendix).digest('hex');
  const families = JSON.parse(raw['families.json']);
  const forms = JSON.parse(raw['forms.json']);
  const abilities = JSON.parse(raw['abilities.json']);
  const rules = JSON.parse(raw['rules.json']);
  const split = (v) => (Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean));
  // Game-side family record: the Dex fields the game needs, with list fields normalized to arrays. Nothing is renamed away from the
  // Dex vocabulary here; mapping onto legacy species fields (element, personality, regions…) belongs to the wiring package.
  const fam = families.map((f) => ({
    id: f.id, name: f.name, type: f.type, rarity: f.rarity, position: f.position, clashArchetype: f.clashArchetype,
    abilities: { football: f.abilities.Football, clash: f.abilities['Beast Clash'] },
    standalone: !!f.standalone || f.rarity === 'basic',
    appearance: f.art?.spec ? { ...f.art.spec } : { body: f.appearance.body, size: f.appearance.size, look: f.appearance.look, features: split(f.appearance.features), colors: split(f.appearance.colors), ...(f.appearance.pattern ? { pattern: f.appearance.pattern } : {}) },
    description: f.description,
    ...(f.positionalStrength ? { positionalStrength: f.positionalStrength, weaknesses: f.weaknesses } : {}),
    ...(f.buildIdentity ? { buildIdentity: f.buildIdentity } : {}),
  }));
  const frm = forms.map((x) => ({ id: x.id, familyId: x.familyId, name: x.name, stage: x.stage, evolutionLevel: x.evolutionLevel, rarity: x.rarity, position: x.position, starting: x.starting, potential: x.potential, belowBandWeaknesses: x.belowBandWeaknesses || [] }));
  // Owner-approved Task 8 rulings replace named source sections (task8-overrides.json). The v18 text stays visible as supersededRule.
  const overrides = JSON.parse(raw['task8-overrides.json']);
  const byId = new Set(abilities.map((a) => a.id));
  for (const [id, o] of Object.entries(overrides.abilities)) {
    if (!byId.has(id)) throw new Error(`task8-overrides.json: unknown ability ${id}`);
    const src = abilities.find((a) => a.id === id);
    for (const sec of Object.keys(o.sections)) if (!src.details.some((d) => d.section === sec)) throw new Error(`task8-overrides.json: ${id} has no section "${sec}"`);
  }
  const abl = abilities.map((a) => {
    const o = overrides.abilities[a.id];
    const details = a.details.map((d) => (o?.sections[d.section] ? { section: d.section, rule: o.sections[d.section], ruling: o.ruling, supersededRule: d.rule } : { section: d.section, rule: d.rule }));
    return { id: a.id, familyId: a.familyId, mode: a.mode === 'Football' ? 'football' : 'clash', name: a.name, category: a.category, activation: a.activation, mechanic: o?.mechanic || a.mechanic, ...(o?.mechanic ? { supersededMechanic: a.mechanic } : {}), designStatus: a.sourceDesignStatus, details, ...(o ? { ruling: o.ruling, ...(o.values ? { values: o.values } : {}) } : {}) };
  });
  const rul = { attributeOrder: rules.attributeOrder, bands: rules.bands, rarityPotentialBands: rules.rarityPotentialBands, primaryAttributesByPosition: rules.primaryAttributesByPosition, rarityRules: rules.rarityRules, generation: rules.generation, evolution: rules.evolution, temper: rules.temper, apex: rules.apex, basic: rules.basic, attributeRoles: parseAttributeRoles(appendix) };
  const body = [
    '// GENERATED by tools/build-beast-dex.mjs from docs/beast-dex/data — do not edit by hand.',
    '// Task 8 Beast Dex data for the game: 192 families, 222 forms, 144 mode abilities. Not yet wired into gameplay.',
    `export const SOURCE = ${JSON.stringify({ path: 'docs/beast-dex/data', sha256: hashes })};`,
    `export const FAMILIES = ${JSON.stringify(fam)};`,
    `export const FORMS = ${JSON.stringify(frm)};`,
    `export const ABILITIES = ${JSON.stringify(abl)};`,
    `export const RULES = ${JSON.stringify(rul)};`,
    `export const APPROVED_RULINGS = ${JSON.stringify({ version: overrides.version, sources: overrides.rulingSources, rules: overrides.rules, openGaps: overrides.openGaps || [] })};`,
    '',
  ].join('\n');
  return { body, counts: { families: fam.length, forms: frm.length, abilities: abl.length } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { body, counts } = buildModule();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== body) { console.error('src/data/beast-dex.generated.js is out of date: run node tools/build-beast-dex.mjs'); process.exit(1); }
    console.log('beast-dex.generated.js is up to date', counts);
  } else { fs.writeFileSync(OUT, body); console.log('wrote src/data/beast-dex.generated.js', counts, `${Math.round(body.length / 1024)} KB`); }
}
