// Crowd speech bubbles (owner 2026-11-24): after a big moment, a fan or two in the stands says something, in a small bubble over
// the seats. Home fans react to the home club, visiting fans (when the visitors brought any) to theirs: a score, a takeaway, a sack,
// a big play, now and then a first down, and the other side's fans groan. Presentation only: nothing here is read by the game.
// Every line is in src/text/en.js under crowd.*: one key per mood, the lines separated by |, so more can be added there.
import { t as $t } from '../text/index.js';
import { esc } from './dom.js';

// One $t call per mood (so the text checks see every key in use).
const MOODS = {
  td_ours: () => $t('crowd.td_ours'), td_theirs: () => $t('crowd.td_theirs'),
  kick_ours: () => $t('crowd.kick_ours'), kick_theirs: () => $t('crowd.kick_theirs'),
  big_ours: () => $t('crowd.big_ours'), big_theirs: () => $t('crowd.big_theirs'),
  first_down_ours: () => $t('crowd.first_down_ours'), first_down_theirs: () => $t('crowd.first_down_theirs'),
  takeaway_ours: () => $t('crowd.takeaway_ours'), giveaway: () => $t('crowd.giveaway'),
  sack_ours: () => $t('crowd.sack_ours'), sack_theirs: () => $t('crowd.sack_theirs'),
};
/** The things a fan in this mood can say (the | separated line in en.js). */
export const moodLines = (mood) => String(MOODS[mood]?.() || '').split('|').map((x) => x.trim()).filter(Boolean);

const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const pick = (list, seed) => (list.length ? list[seed % list.length] : '');
const other = (side) => (side === 'home' ? 'away' : 'home');
export const BIG_PLAY_YARDS = 20;

/**
 * What the crowd says after one finished play: [{ side: 'home' | 'away' (whose fans), mood, text }], at most two, or [].
 * `ev` is the match screen's event (ev.sim.result, ev.sim.yards, ev.kind, ev.scored, ev.kicking, ev.good, ev.tryTeam, ev.offenseSide,
 * ev.firstDown); `away` is the visitors' share of the crowd (0 when they brought nobody); `seed` keeps it the same on a redraw.
 */
export function crowdTalk(ev, { away = 0.2, seed = 0 } = {}) {
  if (!ev) return [];
  const r = ev.sim?.result || null; const off = ev.offenseSide || null; const def = off ? other(off) : null; const h = hash(`${seed}|${ev.text || ''}|${ev.kind || ''}`);
  let team = null, good = null, bad = null, chance = 1;
  if (r === 'touchdown' || (ev.kind === 'kickoff' && ev.scored)) { team = ev.scored?.team || off; good = 'td_ours'; bad = 'td_theirs'; }
  else if (ev.kind === 'field_goal') { if (!ev.scored) return []; team = ev.kicking || off; good = 'kick_ours'; bad = 'kick_theirs'; }
  else if (ev.kind === 'try') { if (!ev.good) return []; team = ev.tryTeam || ev.kicking || off; good = 'kick_ours'; bad = 'kick_theirs'; chance = 0.6; }
  else if (r === 'interception' || r === 'fumble') { team = def; good = 'takeaway_ours'; bad = 'giveaway'; }
  else if (r === 'sack') { team = def; good = 'sack_ours'; bad = 'sack_theirs'; chance = 0.7; }
  else if ((ev.sim?.yards ?? 0) >= BIG_PLAY_YARDS && off) { team = off; good = 'big_ours'; bad = 'big_theirs'; }
  else if (ev.firstDown && off) { team = off; good = 'first_down_ours'; bad = 'first_down_theirs'; chance = 0.35; }
  if (!team || !good) return [];
  if ((h % 1000) / 1000 >= chance) return [];
  const here = (side) => side === 'home' || away >= 0.08; // the visitors speak only when they brought a real following
  const out = [];
  if (here(team)) out.push({ side: team, mood: good, text: pick(moodLines(good), h >>> 3) });
  if (here(other(team)) && ((h >>> 11) % 100) < 55) out.push({ side: other(team), mood: bad, text: pick(moodLines(bad), h >>> 5) });
  return out.filter((x) => x.text).slice(0, 2);
}

/**
 * Where fans can be seen in the field's box right now: rectangles (box pixels) of the stands in view and of the seats around the
 * field (the bowl, wherever the field's picture leaves room). Each is { x, y, w, h }.
 */
function seatAreas(wrap) {
  const box = wrap.getBoundingClientRect(); if (!box.width || !box.height) return [];
  const out = []; const clip = (r) => { const x0 = Math.max(r.left, box.left), x1 = Math.min(r.right, box.right), y0 = Math.max(r.top, box.top), y1 = Math.min(r.bottom, box.bottom); if (x1 - x0 > 30 && y1 - y0 > 16) out.push({ x: x0 - box.left, y: y0 - box.top, w: x1 - x0, h: y1 - y0 }); };
  for (const g of wrap.querySelectorAll('.sfx-stand:not(.sfx-bowl)')) clip(g.getBoundingClientRect());
  const svg = wrap.querySelector('#field'); const vb = svg?.viewBox?.baseVal;
  if (svg && vb?.width && wrap.querySelector('.sfx-bowl')) { // the bowl shows around the field's picture: left/right or above/below it
    const s = svg.getBoundingClientRect(); const k = Math.min(s.width / vb.width, s.height / vb.height); const w = vb.width * k, hgt = vb.height * k; const l = s.left + (s.width - w) / 2, t = s.top + (s.height - hgt) / 2;
    clip({ left: box.left, right: l, top: box.top, bottom: box.bottom }); clip({ left: l + w, right: box.right, top: box.top, bottom: box.bottom });
    clip({ left: box.left, right: box.right, top: box.top, bottom: t }); clip({ left: box.left, right: box.right, top: t + hgt, bottom: box.bottom });
  }
  return out;
}

const BUBBLE_MS = 2600;
/** Show the bubbles over the seats in view, one after the other; nothing when no fans are in view. Returns how many were placed. */
export function showCrowdTalk(wrap, talk, { seed = 0, colors = {} } = {}) {
  if (!wrap || !talk?.length) return 0;
  for (const b of wrap.querySelectorAll('.crowd-bubble')) b.remove();
  const box = wrap.getBoundingClientRect(); let n = 0;
  // Never over the play's banner or anything else laid over the field: bubbles start below the lowest overlay in the top half.
  let floor = 0; for (const el of wrap.children) { if (el.tagName === 'svg' || el.classList.contains('crowd-bubble') || el.classList.contains('stadium-surround')) continue; const r = el.getBoundingClientRect(); if (r.width && r.height && r.top - box.top < box.height / 2) floor = Math.max(floor, r.bottom - box.top); }
  const areas = seatAreas(wrap).map((a) => { const y0 = Math.max(a.y, floor + 54); return { ...a, y: y0, h: a.y + a.h - y0 }; }).filter((a) => a.h > 24); if (!areas.length) return 0;
  talk.forEach((x, i) => {
    const a = areas[(hash(`${seed}|${i}`) + i) % areas.length]; const u = (hash(`${seed}|x${i}`) % 1000) / 1000, v = (hash(`${seed}|y${i}`) % 1000) / 1000;
    const left = Math.max(72, Math.min(box.width - 72, a.x + a.w * (0.15 + 0.7 * u))), top = Math.max(floor + 54, Math.min(box.height - 8, a.y + a.h * (0.2 + 0.7 * v))); // its bottom edge (the tail) sits on the seats
    const el = globalThis.document.createElement('div');
    el.className = `crowd-bubble crowd-${x.side}`; el.setAttribute('aria-hidden', 'true');
    el.style.left = `${left.toFixed(0)}px`; el.style.top = `${top.toFixed(0)}px`; el.style.animationDelay = `${i * 450}ms`;
    if (colors[x.side]) el.style.setProperty('--crowd-c', colors[x.side]);
    el.innerHTML = esc(x.text);
    wrap.appendChild(el); n++;
    setTimeout(() => el.remove(), BUBBLE_MS + i * 450 + 100);
  });
  return n;
}
