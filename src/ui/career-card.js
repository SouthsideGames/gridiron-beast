// Shareable Monster Career Cards (GDD §40.4): a real PNG, drawn on a canvas from the game's own 16×16 sprites, in two
// layouts (portrait 1080×1350 and square 1080×1080). The look follows the career's presentation tier (rookie through Hall of
// Famer); nothing here changes the game or the save. No network, no account, no image service: the browser draws it, then
// shares it (the system share sheet, where the device offers one) or saves it as a download.

import { spritePixels } from './pixel-monster.js';
import { TEAM_META } from '../data/league.js';
import { TYPES } from '../data/monsters.js';
import { yearOf } from '../data/calendar.js';
import { TIER_LABEL, TROPHY_META } from '../franchise/career-profile.js';
import { sheet, toast, esc } from './dom.js';

export const CARD_FORMATS = Object.freeze({ portrait: { w: 1080, h: 1350, label: 'Portrait' }, square: { w: 1080, h: 1080, label: 'Square' } });
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const TIER_STYLE = Object.freeze({
  prospect: { frame: '#6f8a80', glow: '#6f8a80', ribbon: '#2a3a34', ink: '#d9e7df' },
  rookie: { frame: '#6fae8f', glow: '#6fae8f', ribbon: '#21473a', ink: '#dff5ea' },
  established: { frame: '#4fa3c7', glow: '#4fa3c7', ribbon: '#173b4c', ink: '#e1f3fb' },
  veteran: { frame: '#8ea7cf', glow: '#8ea7cf', ribbon: '#25324a', ink: '#e8eefa' },
  decorated: { frame: '#b48cff', glow: '#b48cff', ribbon: '#3a2a5c', ink: '#f1e9ff' },
  champion: { frame: '#f5c542', glow: '#ffcf4d', ribbon: '#5a4410', ink: '#fff4d0' },
  dynasty: { frame: '#f5c542', glow: '#ffd96b', ribbon: '#6a4c08', ink: '#fff4d0', double: true, stars: true },
  hof: { frame: '#fff0c4', glow: '#ffe7a3', ribbon: '#4a4030', ink: '#fffaf0', double: true, laurel: true },
});

/** The honours as short pills, most prestigious first (repeats counted). */
export function honourPills(p) {
  const out = [];
  for (const t of p.trophies || []) {
    if (t.kind === 'hof') out.push({ text: 'HALL OF FAME', kind: 'hof' });
    else if (t.kind === 'champion') out.push({ text: `${t.count > 1 ? `${t.count}× ` : ''}CHAMPION`, kind: 'champion' });
    else if (t.kind === 'record') out.push({ text: `${t.count} LEAGUE RECORD${t.count === 1 ? '' : 'S'}`, kind: 'record' });
    else out.push({ text: `${t.count > 1 ? `${t.count}× ` : ''}${TROPHY_META[t.kind]?.short || t.kind.toUpperCase()}`, kind: 'award' });
  }
  return out;
}
/** Three numbers for the card: the position's career statistics, or (before a first game) where he stands today. */
export function cardStats(p) {
  if ((p.stats?.games || 0) > 0 && p.stats.focus?.length) return p.stats.focus.slice(0, 3).map((s) => ({ value: s.text, label: s.label }));
  return [{ value: p.level != null ? String(p.level) : '—', label: 'Level' }, { value: p.ovr != null ? String(p.ovr) : '—', label: 'Overall' }, { value: p.seasons ? String(p.seasons) : '1', label: p.seasons > 1 ? 'Seasons' : 'Season' }];
}
/** "Lumen · Light · QB", without repeating the species when the name already is it (numerals aside). */
const idLine = (p) => [String(p.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '') === p.speciesName ? null : p.speciesName, p.type, p.position].filter(Boolean).join(' · ');
const footLine = (p) => ((p.stats?.games || 0) > 0 ? `${p.level != null ? `Lv ${p.level}` : ''}${p.ovr != null ? ` · ${p.ovr} OVR` : ''}`.replace(/^ · /, '') : 'Awaiting his first game');
const seasonsLine = (p) => { const c = p.clubs || []; const from = c.find((x) => x.from != null)?.from; const last = c[c.length - 1]; const to = last?.to; return `${from != null ? `${yearOf(from)}${to == null ? '–now' : to !== from ? `–${yearOf(to)}` : ''} · ` : ''}${p.seasons <= 1 ? 'Rookie season' : `${p.seasons} seasons`}`; };

// ------------------------------------------------------------ drawing helpers
/** Set the largest font (from `size` down to `min`) whose text fits `max` px. Returns { size, width, fits }. */
export function fitFont(ctx, text, max, size, min, weight = 800) {
  let s = size; ctx.font = `${weight} ${s}px ${FONT}`; let w = ctx.measureText(text).width;
  while (w > max && s > min) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; w = ctx.measureText(text).width; }
  return { size: s, width: w, fits: w <= max + 0.5 };
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawSprite(ctx, p, cx, cy, px) {
  const { grid, pal } = spritePixels({ id: p.id, name: p.name, species: p.species, stage: p.stage });
  const x0 = Math.round(cx - px * 8), y0 = Math.round(cy - px * 8);
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx, y0 + px * 16 - px * 0.6, px * 6.5, px * 1.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = grid[y][x]; if (!v) continue; ctx.fillStyle = pal[v] || pal.M; ctx.fillRect(x0 + x * px, y0 + y * px, px, px); }
}
function trophyIcon(ctx, x, y, s, color) {
  ctx.save(); ctx.fillStyle = color; ctx.translate(x, y); ctx.scale(s / 24, s / 24);
  ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(18, 2); ctx.lineTo(18, 9); ctx.quadraticCurveTo(18, 15, 12, 15); ctx.quadraticCurveTo(6, 15, 6, 9); ctx.closePath(); ctx.fill();
  ctx.fillRect(10.5, 15, 3, 4); ctx.fillRect(7, 19, 10, 3);
  ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(5, 7, 3, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(19, 7, 3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.restore();
}
function medalIcon(ctx, x, y, s, color) { ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(7, 1); ctx.lineTo(11, 9); ctx.lineTo(9, 10); ctx.lineTo(5, 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(17, 1); ctx.lineTo(13, 9); ctx.lineTo(15, 10); ctx.lineTo(19, 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(12, 15, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(12, 15, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function scrollIcon(ctx, x, y, s, color) { ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = color; rr(ctx, 4, 3, 16, 18, 3); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 3; i++) ctx.fillRect(7, 8 + i * 4, 10, 1.6); ctx.restore(); }
function laurel(ctx, cx, cy, r, color) {
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 0.8;
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + side * (0.35 + i * 0.16); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92; ctx.save(); ctx.translate(x, y); ctx.rotate(a + side * 0.9); ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function star(ctx, x, y, r, color) { ctx.save(); ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); ctx.restore(); }

/**
 * Draw the card on `canvas` (sized here). Returns a report of every text drawn and whether it fitted, so the export can be
 * checked for clipping without eyeballing it.
 */
export function drawCareerCard(canvas, p, format = 'portrait') {
  const F = CARD_FORMATS[format] || CARD_FORMATS.portrait; const W = F.w, H = F.h; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.textBaseline = 'alphabetic';
  const st = TIER_STYLE[p.tier] || TIER_STYLE.established; const club = TEAM_META[p.club] || null; const clubCol = club?.color || '#4f8f78';
  const typeHue = TYPES[p.type]?.hue ?? 140; const texts = [];
  const text = (t, x, y, max, size, min, { weight = 800, color = '#fff', align = 'left', spacing = 0 } = {}) => { ctx.textAlign = align; const r = fitFont(ctx, t, max, size, min, weight); ctx.fillStyle = color; if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`; ctx.fillText(t, x, y); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; texts.push({ t, size: r.size, width: r.width, max, fits: r.fits, min: r.size <= min }); return r; };
  // Background: night field, club tint, the type's glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1712'); bg.addColorStop(1, '#050b08'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.22; const cg = ctx.createLinearGradient(0, 0, W, H); cg.addColorStop(0, clubCol); cg.addColorStop(0.6, 'transparent'); ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (let y = 120; y < H; y += 90) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke(); } ctx.restore();
  // Frame.
  ctx.lineWidth = 14; ctx.strokeStyle = st.frame; rr(ctx, 22, 22, W - 44, H - 44, 36); ctx.stroke();
  if (st.double) { ctx.lineWidth = 4; rr(ctx, 46, 46, W - 92, H - 92, 26); ctx.stroke(); }
  // Ribbon and wordmark.
  const tierText = p.tier === 'dynasty' ? `DYNASTY · ${p.honours?.titles || 2}× CHAMPION` : (TIER_LABEL[p.tier] || '').toUpperCase();
  ctx.fillStyle = st.ribbon; rr(ctx, W / 2 - 300, 64, 600, 64, 32); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = st.frame; ctx.stroke();
  text(tierText, W / 2, 108, 560, 34, 22, { color: st.ink, align: 'center', spacing: 4 });
  text('GRIDIRON BEAST', 70, H - 64, 420, 30, 20, { weight: 900, color: 'rgba(255,255,255,.75)', spacing: 6 });
  const nameMax = W - 140;
  if (format === 'square') {
    // Left: the monster. Right: who, club, honours. Bottom: three numbers.
    const cx = 290, cy = 430; const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 300); glow.addColorStop(0, `hsla(${typeHue}, 80%, 60%, .55)`); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(cx - 300, cy - 300, 600, 600);
    if (st.laurel) laurel(ctx, cx, cy + 20, 230, st.frame); if (st.stars) for (let i = 0; i < Math.min(5, p.honours?.titles || 2); i++) star(ctx, cx - 100 + i * 50, 190, 16, st.frame);
    drawSprite(ctx, p, cx, cy, 24);
    const x = 560, max = W - 70 - x;
    // A long name wraps to two lines rather than shrinking past readable.
    ctx.font = `900 48px ${FONT}`; const words = String(p.name).split(' ');
    if (ctx.measureText(p.name).width > max && words.length > 1) { let cut = 1; for (let i = 1; i < words.length; i++) { ctx.font = `900 58px ${FONT}`; if (ctx.measureText(words.slice(0, i).join(' ')).width <= max) cut = i; } text(words.slice(0, cut).join(' '), x, 228, max, 58, 34, { weight: 900 }); text(words.slice(cut).join(' '), x, 290, max, 58, 34, { weight: 900 }); }
    else text(p.name, x, 270, max, 76, 40, { weight: 900 });
    text(idLine(p), x, 340, max, 34, 22, { weight: 700, color: `hsl(${typeHue} 70% 72%)` });
    ctx.fillStyle = clubCol; rr(ctx, x, 398, max, 70, 16); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x, 398, max, 70, 16); ctx.fill();
    ctx.fillStyle = clubCol; ctx.fillRect(x, 398, 14, 70);
    text(p.club || 'Free agent', x + 32, 446, max - 48, 34, 20, { weight: 800 });
    text(seasonsLine(p), x, 516, max, 28, 18, { weight: 700, color: 'rgba(255,255,255,.75)' });
    pills(ctx, honourPills(p), x, 548, max, 2, st, texts);
    statsRow(ctx, cardStats(p), 70, 720, W - 140, 200, st, texts);
    text(footLine(p), W - 70, H - 64, 440, 30, 20, { weight: 800, color: 'rgba(255,255,255,.75)', align: 'right' });
  } else {
    const cx = W / 2, cy = 420; const glow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 340); glow.addColorStop(0, `hsla(${typeHue}, 80%, 60%, .55)`); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(cx - 340, cy - 340, 680, 680);
    if (st.laurel) laurel(ctx, cx, cy + 20, 270, st.frame); if (st.stars) { const n = Math.min(5, p.honours?.titles || 2); for (let i = 0; i < n; i++) star(ctx, cx - (n - 1) * 30 + i * 60, 180, 18, st.frame); }
    drawSprite(ctx, p, cx, cy, 26);
    text(p.name, W / 2, 720, nameMax, 96, 44, { weight: 900, align: 'center' });
    text(idLine(p), W / 2, 776, nameMax, 38, 24, { weight: 700, color: `hsl(${typeHue} 70% 74%)`, align: 'center' });
    ctx.fillStyle = clubCol; rr(ctx, 90, 808, W - 180, 76, 18); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, 90, 808, W - 180, 76, 18); ctx.fill(); ctx.fillStyle = clubCol; ctx.fillRect(90, 808, 16, 76);
    text(p.club || 'Free agent', W / 2, 860, W - 240, 38, 22, { weight: 800, align: 'center' });
    text(seasonsLine(p), W / 2, 926, nameMax, 30, 20, { weight: 700, color: 'rgba(255,255,255,.75)', align: 'center' });
    const pl = honourPills(p); pills(ctx, pl, 90, 952, W - 180, 2, st, texts, true);
    statsRow(ctx, cardStats(p), 90, pl.length ? (pl.length > 3 ? 1086 : 1040) : 980, W - 180, 170, st, texts);
    text(footLine(p), W - 70, H - 64, 440, 30, 20, { weight: 800, color: 'rgba(255,255,255,.75)', align: 'right' });
  }
  return { w: W, h: H, format, tier: p.tier, texts, clipped: texts.filter((t) => !t.fits) };
}
/** Honour pills in up to `rows` rows (centred when asked); extra honours fold into "+n more". */
function pills(ctx, list, x, y, max, rows, st, texts, center = false) {
  if (!list.length) return;
  const h = 54, gap = 14, pad = 24; let row = 0; let line = []; const lines = [];
  ctx.font = `800 26px ${FONT}`;
  const width = (t) => ctx.measureText(t).width + pad * 2 + 36;
  let rest = list.slice();
  while (rest.length && row < rows) { line = []; let used = 0; while (rest.length) { const w = width(rest[0].text); if (used + w > max && line.length) break; line.push({ ...rest.shift(), w: Math.min(w, max) }); used += w + gap; } lines.push(line); row++; }
  if (rest.length) { const last = lines[lines.length - 1]; const more = { text: `+${rest.length} MORE`, kind: 'more' }; more.w = width(more.text); while (last.length && last.reduce((a, b) => a + b.w + gap, 0) + more.w > max) rest.unshift(last.pop()); more.text = `+${rest.length} MORE`; last.push(more); }
  lines.forEach((ln, i) => {
    const total = ln.reduce((a, b) => a + b.w, 0) + gap * (ln.length - 1); let cx = center ? x + (max - total) / 2 : x; const cy = y + i * (h + 12);
    for (const pl of ln) {
      const gold = pl.kind === 'champion' || pl.kind === 'hof'; ctx.fillStyle = gold ? 'rgba(245,197,66,.22)' : 'rgba(255,255,255,.1)'; rr(ctx, cx, cy, pl.w, h, h / 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = gold ? st.frame : 'rgba(255,255,255,.35)'; ctx.stroke();
      const ic = gold ? '#ffd34d' : pl.kind === 'record' ? '#e9e2c8' : '#c9b6ff'; if (pl.kind === 'champion' || pl.kind === 'hof') trophyIcon(ctx, cx + 16, cy + 13, 28, ic); else if (pl.kind === 'record') scrollIcon(ctx, cx + 16, cy + 13, 28, ic); else if (pl.kind !== 'more') medalIcon(ctx, cx + 16, cy + 13, 28, ic);
      ctx.textAlign = 'left'; const r = fitFont(ctx, pl.text, pl.w - pad - 52, 26, 16); ctx.fillStyle = '#fff'; ctx.fillText(pl.text, cx + (pl.kind === 'more' ? pad : 52), cy + 37); texts.push({ t: pl.text, size: r.size, width: r.width, max: pl.w - pad - 52, fits: r.fits });
      cx += pl.w + gap;
    }
  });
}
function statsRow(ctx, stats, x, y, w, h, st, texts) {
  const gap = 18; const bw = (w - gap * (stats.length - 1)) / stats.length;
  stats.forEach((s, i) => {
    const bx = x + i * (bw + gap); ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(ctx, bx, y, bw, h, 22); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.stroke();
    ctx.fillStyle = st.frame; ctx.fillRect(bx + 26, y + 18, 46, 6);
    ctx.textAlign = 'center'; let r = fitFont(ctx, s.value, bw - 36, Math.round(h * 0.42), 30, 900); ctx.fillStyle = '#fff'; ctx.fillText(s.value, bx + bw / 2, y + h * 0.6); texts.push({ t: s.value, size: r.size, width: r.width, max: bw - 36, fits: r.fits });
    r = fitFont(ctx, s.label.toUpperCase(), bw - 30, 24, 16, 800); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(s.label.toUpperCase(), bx + bw / 2, y + h - 26); texts.push({ t: s.label, size: r.size, width: r.width, max: bw - 30, fits: r.fits });
  });
}

/** Render to a PNG blob. Resolves { blob, report }. */
export function careerCardBlob(p, format = 'portrait') {
  const canvas = document.createElement('canvas'); const report = drawCareerCard(canvas, p, format);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => { canvas.width = canvas.height = 0; blob ? resolve({ blob, report }) : reject(new Error('The card could not be drawn.')); }, 'image/png'));
}
export const cardFileName = (p, format) => `${String(p.name || 'monster').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-career-${format}.png`;

/** The card sheet: a preview of the real PNG, the two layouts, Share (where the device offers it) and Save image. */
export function openCareerCard(p, { reduced = false } = {}) {
  let format = 'portrait'; let url = null; let blob = null; let busy = false;
  const { el } = sheet(`<div class="cc"><div class="seg cc-formats" role="group" aria-label="Layout">${Object.entries(CARD_FORMATS).map(([k, v]) => `<button class="btn small ${k === format ? 'primary' : ''}" data-cc-format="${k}" aria-pressed="${k === format}">${v.label}</button>`).join('')}</div>
    <div class="cc-preview ${reduced ? '' : 'anim'}"><div class="cc-loading dim">Drawing the card…</div></div>
    <div class="cc-actions"><button class="btn primary block" data-cc="share" disabled>Share</button><button class="btn block" data-cc="save" disabled>Save image</button></div>
    <p class="dim cc-note">A PNG made on this device from the game's own art. Viewing or saving it changes nothing in your franchise.</p></div>`, { title: `${p.name} · career card`, onClose: () => { if (url) URL.revokeObjectURL(url); url = null; blob = null; } });
  const shareBtn = el.querySelector('[data-cc="share"]'); const saveBtn = el.querySelector('[data-cc="save"]'); const box = el.querySelector('.cc-preview');
  const canShareFiles = () => { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] })); } catch { return false; } };
  if (!canShareFiles()) shareBtn.remove();
  const draw = async () => {
    busy = true; shareBtn.disabled = saveBtn.disabled = true;
    try {
      const r = await careerCardBlob(p, format); if (url) URL.revokeObjectURL(url); blob = r.blob; url = URL.createObjectURL(blob);
      box.innerHTML = `<img class="cc-img ${format}" src="${url}" alt="${esc(`${p.name}'s ${CARD_FORMATS[format].label.toLowerCase()} career card`)}" width="${CARD_FORMATS[format].w}" height="${CARD_FORMATS[format].h}">`;
      box.dataset.clipped = String(r.report.clipped.length); box.dataset.format = format; box.dataset.bytes = String(blob.size);
    } catch (e) { box.innerHTML = `<p class="bad">${esc(e.message || 'The card could not be drawn.')}</p>`; }
    busy = false; shareBtn.disabled = saveBtn.disabled = !blob;
  };
  el.addEventListener('click', async (e) => {
    const fb = e.target.closest('[data-cc-format]'); if (fb && !busy) { format = fb.dataset.ccFormat; el.querySelectorAll('[data-cc-format]').forEach((b) => { const on = b.dataset.ccFormat === format; b.classList.toggle('primary', on); b.setAttribute('aria-pressed', on); }); draw(); return; }
    const act = e.target.closest('[data-cc]')?.dataset.cc; if (!act || !blob) return;
    const name = cardFileName(p, format);
    if (act === 'share') { try { await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: `${p.name} · Gridiron Beast` }); toast('Career card shared.', 'good'); } catch (err) { if (err?.name !== 'AbortError') toast('Sharing is not available here: use Save image.', 'info'); } return; }
    if (act === 'save') { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast(`Saved ${name}`, 'good'); }
  });
  draw();
  return el;
}
