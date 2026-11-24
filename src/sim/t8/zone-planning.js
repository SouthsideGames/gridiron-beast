// Shared football zone policy. UI previews, reviewer scenarios, AI and the snap all
// use these legal options; no opponent assignments or random simulation draws.
import { placeRect, RECIPES, effectsCore, contains, BUFF_TYPES } from './fields.js';
import { createRng } from '../../core/rng.js';
import { ABILITIES } from '../../data/beast-dex.js';

export const ZONE_IDS = Object.freeze(ABILITIES.filter((a) => a.mode === 'football' && a.category === 'Zone').map((a) => a.id));
// Every football zone supports a coach choice, including action-earned zones.
export const FIXED_ZONES = Object.freeze([]);
export const canPlaceZone = (id) => ZONE_IDS.includes(id) && !FIXED_ZONES.includes(id);
export const zoneKey = (p) => `${p.owner}|${p.ability}|${p.placementIndex ?? 0}`;
export const snapKey = (state) => `${state.playCount || 0}|${state.possession}|${state.quarter}`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const intersect = (a, b) => ({ yard: [Math.max(a.yard[0], b.yard[0]), Math.min(a.yard[1], b.yard[1])], lat: [Math.max(a.lat[0], b.lat[0]), Math.min(a.lat[1], b.lat[1])] });
const area = (r) => Math.max(0, r.yard[1] - r.yard[0]) * Math.max(0, r.lat[1] - r.lat[0]);
export function zoneOverlaps(rect, type, fields, lifetime = 3, clock = null, ownerTeam = null) {
  const out = [];
  for (const f of fields || []) {
    const recipe = RECIPES.find((r) => type !== f.type && r.parents.includes(type) && r.parents.includes(f.type));
    if (!recipe) continue;
    const overlap = intersect(rect, f); if (!area(overlap)) continue;
    // Ignore completely removed footprints. Partial holes remain visible in the field art.
    if ((f.holes || []).some((h) => area(intersect(overlap, h)) >= area(overlap) - 1e-6)) continue;
    const relevant = (c, owner) => /Offense$/.test(c || '') || c === 'teamOffense' ? owner : /Defense$/.test(c || '') || c === 'teamDefense' ? (owner === 'home' ? 'away' : 'home') : 'any';
    const a = relevant(clock, ownerTeam), b = relevant(f.clock, f.ownerTeam);
    // cross: the other club's zone, so the combination would hit both clubs (owner 2026-11-24)
    const theirs = f.team ?? f.ownerTeam ?? null; const cross = !!(ownerTeam && theirs && ownerTeam !== theirs);
    out.push({ name: recipe.hybrid, parents: [...recipe.parents], field: f.id, rect: overlap, cross,
      remaining: a === b || a === 'any' || b === 'any' ? Math.min(lifetime, f.remaining ?? lifetime) : null, area: area(overlap) });
  }
  return out;
}

/** Legal options from the owner's own selected play, stored zones and ordinary field geometry. */
export function zoneOptions({ state, spec, base, ownPlay = null, fields = state.t8?.fields?.list || [] }) {
  const original = placeRect({ ...base, type: spec.type });
  if (!canPlaceZone(spec.ability)) return [];
  const home = state.possession === 'home', dir = home ? 1 : -1;
  const ballLat = (state.ballLat || 0) * dir, width = Math.min(spec.width || original.lat[1] - original.lat[0], 160 / 3), length = original.yard[1] - original.yard[0];
  const ballYard = home ? state.ballOn : 100 - state.ballOn;
  // Preserve the ability's longitudinal role: backfield pulls remain in the
  // backfield; a front strip, LB field or safety band keeps its intended depth.
  // The coach chooses a useful lane within that role, not an arbitrary field teleport.
  let depth = ((base.yardFrom + base.yardTo) / 2 - ballYard) * dir;
  if (spec.place === 'randomDefense') depth = Math.min(spec.maxDepth || 12, 12) / 2;
  // Find actual crossing lanes in the owner's chosen play. Vertical receivers
  // stay on their real lateral alignment; running paths use the hole they cross.
  const atDepth = (job) => {
    const pts = job.points || job.path || (job.at ? [job.at] : []);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (depth >= Math.min(a[0], b[0]) && depth <= Math.max(a[0], b[0]) && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * ((depth - a[0]) / (b[0] - a[0]));
    }
    return pts.length ? pts.reduce((a, b) => Math.abs(a[0] - depth) < Math.abs(b[0] - depth) ? a : b)[1] : null;
  };
  const jobs = Object.entries(ownPlay?.assignments || {}).filter(([slot]) => slot !== 'QB');
  const lanes = jobs.map(([, j]) => atDepth(j)).filter(Number.isFinite);
  const chooseLane = (kind, fallback) => {
    const candidates = lanes.filter((y) => kind === 'left' ? y < -7 : kind === 'right' ? y > 7 : Math.abs(y) <= 7);
    if (!candidates.length) return fallback;
    const nearest = candidates.reduce((a, b) => Math.abs(a - fallback) <= Math.abs(b - fallback) ? a : b);
    return Math.abs(nearest - fallback) <= width / 2 ? fallback : nearest;
  };
  const make = (id, label, lat, dep) => {
    // Parts have independent choices. Keep a small separation when both use the
    // same lane, while clamping each part within the sidelines.
    if (Number.isFinite(spec.placementOffset)) { const half = width / 2 + Math.abs(spec.placementOffset); lat = clamp(lat, -80 / 3 + half, 80 / 3 - half) + spec.placementOffset; }

    const cy = clamp(ballYard + dir * dep, length / 2, 100 - length / 2);
    const rect = placeRect({ type: spec.type, width, centerLat: lat, yardFrom: cy - length / 2, yardTo: cy + length / 2 });
    return { id, label, rect: { yard: [...rect.yard], lat: [...rect.lat] }, placement: { centerLat: (rect.lat[0] + rect.lat[1]) / 2, yardFrom: rect.yard[0], yardTo: rect.yard[1], width },
      overlaps: zoneOverlaps(rect, spec.type, fields, spec.lifetime, spec.clock, spec.ownerTeam) };
  };
  // Full-width zones offer depth bands; narrower parts each offer lateral lanes.
  let out = width >= 160 / 3 - 0.01
    ? [make('left', 'Short band', ballLat, depth - 6), make('middle', 'Middle band', ballLat, depth), make('right', 'Deep band', ballLat, depth + 6)]
    : [make('left', 'Left', ballLat + dir * chooseLane('left', -18), depth), make('middle', 'Middle', ballLat + dir * chooseLane('middle', 0), depth), make('right', 'Right', ballLat + dir * chooseLane('right', 18), depth)];
  const seen = new Set(); out = out.filter((o) => { const k = JSON.stringify(o.rect); if (seen.has(k)) return false; seen.add(k); return true; });
  for (const f of fields) {
    if (!RECIPES.some((r) => spec.type !== f.type && r.parents.includes(spec.type) && r.parents.includes(f.type))) continue;
    const dep = ((f.yard[0] + f.yard[1]) / 2 - ballYard) * dir;
    // A zone left far behind the live play is not a useful placement suggestion.
    if (dep < -8 || dep > 30) continue;
    const o = make(`overlap:${f.id}`, `Mix with ${f.type}`, (f.lat[0] + f.lat[1]) / 2, dep);
    if (o.overlaps.length && !out.some((p) => JSON.stringify(p.rect) === JSON.stringify(o.rect))) out.push(o);
  }
  return out;
}
/** A deterministic coach choice, using only the same public/legal options. */
export function autoZoneOption(options, spec, ownPlay = null, state = null) {
  if (!options.length) return null;
  const jobs = Object.values(ownPlay?.assignments || {});
  const points = jobs.flatMap((j) => j.points?.length ? j.points.slice(1) : j.at ? [j.at] : []);
  // Own play only; damaging terrain is put where it meets opponents (the ability's
  // role/depth); a buff (Wind, Light, Earth: it helps only the placing club) follows the owner's intended routes.
  let preferred = 'middle';
  if (BUFF_TYPES.includes(spec.type) && points.length) {
    const lane = points.reduce((n, p) => n + p[1], 0) / points.length;
    preferred = lane < -4 ? 'left' : lane > 4 ? 'right' : 'middle';
  }
  // Stable for this snap/save, varied across snaps, games and creators. This
  // private stream never advances the game dice; previews cannot reroll it.
  let seed = 2166136261;
  for (const ch of `${state?.seed || 0}|${state ? snapKey(state) : 0}|${zoneKey(spec)}|${ownPlay?.id || ''}`) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619); }
  // A combination with the club's own zone works for it; one with the other club's hits both sides, so it earns no preference.
  return createRng(seed >>> 0).weighted(options.map((o) => [o, 1 + (o.id === preferred ? 1 : 0) + (o.overlaps?.some((m) => !m.cross) ? 1.5 : 0)]));
}
export function selectedZoneOption(state, spec, options, ownPlay = null) {
  const saved = state.t8?.zoneChoices;
  const id = saved?.key === snapKey(state) ? saved.picks?.[zoneKey(spec)] : null;
  return options.find((o) => o.id === id) || autoZoneOption(options, spec, ownPlay, state);
}
export function setZoneChoice(state, key, choice) {
  const t8 = (state.t8 ||= { status: {} });
  if (t8.zoneChoices?.key !== snapKey(state)) t8.zoneChoices = { key: snapKey(state), picks: {} };
  if (choice === 'auto') delete t8.zoneChoices.picks[key]; else t8.zoneChoices.picks[key] = choice;
}

// Exact effective hybrid footprints for presentation. Partition at every field /
// removal edge, use the engine's recipe resolver, then merge adjacent equal cells.
// The immutable play-frame list is cached; no per-animation-frame geometry work.
const hybridCache = new WeakMap();
export function hybridRegions(fields) {
  if (!fields?.length || fields.length < 2) return [];
  if (hybridCache.has(fields)) return hybridCache.get(fields);
  const ys = [...new Set(fields.flatMap((f) => [...f.yard, ...(f.holes || []).flatMap((h) => h.yard)]))].sort((a,b)=>a-b);
  const ls = [...new Set(fields.flatMap((f) => [...f.lat, ...(f.holes || []).flatMap((h) => h.lat)]))].sort((a,b)=>a-b);
  const cells=[];
  for (let i=0;i<ys.length-1;i++) for(let j=0;j<ls.length-1;j++) {
    const core=effectsCore(fields,(ys[i]+ys[i+1])/2,(ls[j]+ls[j+1])/2), pick=core.pick;
    if(!pick)continue;
    const parents=fields.filter((f)=>pick.r.parents.includes(f.type) && contains(f,(ys[i]+ys[i+1])/2,(ls[j]+ls[j+1])/2));
    const clocks = parents.map((f) => /Offense$/.test(f.clock || '') ? f.ownerTeam : /Defense$/.test(f.clock || '') ? (f.ownerTeam === 'home' ? 'away' : 'home') : f.clock);
    const remaining=parents.every((f)=>Number.isFinite(f.remaining)) && new Set(clocks).size === 1 ? Math.min(...parents.map((f)=>f.remaining)):null;
    const last=cells.at(-1), name=pick.r.hybrid;
    if(last && last.name===name && last.remaining===remaining && last.yard[0]===ys[i] && last.yard[1]===ys[i+1] && last.lat[1]===ls[j])last.lat[1]=ls[j+1];
    else cells.push({name,parents:[...pick.r.parents],remaining,yard:[ys[i],ys[i+1]],lat:[ls[j],ls[j+1]]});
  }
  const out=[];
  for(const c of cells) { const prev=out.find((p)=>p.name===c.name && p.remaining===c.remaining && p.lat[0]===c.lat[0] && p.lat[1]===c.lat[1] && p.yard[1]===c.yard[0]);if(prev)prev.yard[1]=c.yard[1];else out.push(c); }
  hybridCache.set(fields,out);return out;
}
