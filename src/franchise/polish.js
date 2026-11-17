// Additive, franchise-scoped planning state. Reading never changes a save or RNG.
import { spendPoint, monsterOverall } from '../data/monsters.js';
import { buildDepthChart, lineupProblems, GROUP_SLOTS } from './roster.js';
import { canPlay, positionOf } from '../data/personnel.js';
import { t } from '../text/index.js';
export const polishState = f => f?.polish || {};
export function editPolish(f) { return f.polish ||= {}; }
export function toggleShortlist(f, scope, m) {
  const state = editPolish(f); const list = state.shortlist ||= [];
  const index = list.findIndex(x => x.scope === scope && x.id === m.id);
  if (index >= 0) { list.splice(index, 1); return false; }
  if (list.length >= 100) return null;
  // Store public identity only. All knowledge/rank data is looked up at display time.
  list.push({ scope, id: m.id, name: m.name, position: m.position }); return true;
}
export const shortlisted = (f, scope, id) => !!polishState(f).shortlist?.some(x => x.scope === scope && x.id === id);
export const draftScope = f => `draft:${f.draft?.year ?? f.season?.year}`;
export function browsePreferences(f, key) { return polishState(f).browse?.[key] || {}; }
export function setBrowsePreferences(f, key, value) { const p = editPolish(f); (p.browse ||= {})[key] = { ...browsePreferences(f,key), ...value }; }
export function matchesSearch(name, query) { return String(name || '').toLocaleLowerCase().includes(String(query || '').trim().toLocaleLowerCase()); }
const pointStamp = (f, m) => JSON.stringify([f.uid, f.club, f.season, f.game?.state?.playCount, m]);
export function previewInvestment(f, id, attrs) {
  const m = f.roster.find(x => x.id === id); if (!m || attrs.length > 1000) return { ok: false, reason: t('polish.unavailable') };
  const clone = structuredClone(m);
  for (const attr of attrs) { const result = spendPoint(clone, attr); if (!result.ok) return result; }
  return { ok: true, id, stamp: pointStamp(f,m), monster: clone, attrs: attrs.slice() };
}
export function commitInvestment(f, preview, { locked = false } = {}) {
  const m = f.roster.find(x => x.id === preview?.id);
  if (locked || !m || !preview?.ok || !preview.attrs.length || preview.stamp !== pointStamp(f,m)) return { ok: false, reason: t('polish.changed') };
  // Re-run the public spending path on a fresh copy, never trust mutable preview data.
  const checked = previewInvestment(f, m.id, preview.attrs); if (!checked.ok) return checked;
  Object.assign(m, checked.monster); return { ok: true };
}
export function savePreset(f, kind, name, data) {
  const clean = String(name || '').trim().slice(0,32); if (!clean) return false;
  const p = editPolish(f); const all = p.presets ||= { lineup: [], plan: [] };
  const list = all[kind] ||= []; const existing = list.find(x => x.name === clean && x.club === f.club);
  if (!existing && list.filter(x=>x.club===f.club).length >= 5) return false;
  const value = { name: clean, club: f.club, data: structuredClone(data) };
  if (existing) list.splice(list.indexOf(existing),1,value); else list.push(value); return true;
}
export function lineupPresetPreview(f, preset) {
  if (!preset || preset.club !== f.club) return { ok: false, reason: t('polish.unavailable') };
  const manual = preset.data.manual || {}, depth = preset.data.depth || {}, nextDepth = {};
  const gone = [];
  for (const [group, ids] of Object.entries(depth)) {
    if (!GROUP_SLOTS[group]) continue;
    nextDepth[group] = [...new Set(ids)].filter(id => {
      const m = f.roster.find(x => x.id === id);
      if (!m || m.position !== group || m.injury) { gone.push(id); return false; } return true;
    });
  }
  const nextManual = {};
  for (const [slot,id] of Object.entries(manual)) {
    const m = f.roster.find(x => x.id === id);
    if (m && !m.injury && canPlay(m.position,slot)) nextManual[slot] = id; else gone.push(id);
  }
  const chart = buildDepthChart(f.roster,nextManual,nextDepth);
  const before = buildDepthChart(f.roster,f.lineupManual,f.depth);
  const missing = lineupProblems(f.roster, chart);
  const changes = Object.entries(chart).filter(([slot,id])=>id!==before[slot]).map(([slot,id])=>({slot,id,before:before[slot]}));
  return { ok: !missing.length, gone:[...new Set(gone)], missing, changes, manual:nextManual, depth:nextDepth, chart };
}
export function replacementFor(f, candidate) {
  const chart=buildDepthChart(f.roster,f.lineupManual,f.depth);
  const starters=Object.entries(chart).filter(([slot,id])=>positionOf(slot)===candidate.position && id!==candidate.id)
    .map(([slot,id])=>({slot,m:f.roster.find(x=>x.id===id)})).filter(x=>x.m&&!x.m.injury);
  starters.sort((a,b)=>monsterOverall(a.m)-monsterOverall(b.m));
  return starters[0]?.m || f.roster.filter(x=>x.position===candidate.position&&x.id!==candidate.id&&!x.injury).sort((a,b)=>monsterOverall(b)-monsterOverall(a))[0] || null;
}
/**
 * Where a short-position warning's Review leads (QOL-02). A slot someone healthy can fill opens that slot's assignment list; a
 * position nobody healthy can play opens the free-agent market at that position, the club's signing route, rather than a list
 * with nothing to choose. `fallback` is the warning's own screen for clubs without the year-round market. Never decides anything.
 */
export function shortPositionRoute(f, need, fallback = 'roster') {
  if (!need) return { screen: fallback, params: {} };
  const slots = GROUP_SLOTS[need.position] || [need.position];
  const slot = slots.find((s) => f.roster.some((m) => !m.injury && canPlay(m.position, s))) || null;
  if (slot) return { screen: 'assign', params: { slot } };
  if (f.freeAgency?.v) return { screen: 'famarket', params: {}, browse: { position: need.position } };
  return { screen: fallback, params: {} };
}
