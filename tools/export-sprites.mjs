// Exports every species sprite as PNG files for use outside the browser
// (Unity, Godot, marketing). Zero dependencies: PNGs are written by hand.
//   node tools/export-sprites.mjs [outDir] [scale]
// Produces: <outDir>/<id>.png (base form, scale× pixels), <outDir>/<id>_e1.png / _e2.png
// (evolved forms), a 12-column sprite sheet sheet.png, and atlas.json with each
// sprite's name, element, rarity and cell position (for a Unity sprite-sheet import).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { SPECIES_DEX } from '../src/data/species.js';
import { spriteGrid, palette } from '../src/ui/sprite16.js';
import { evolvedSpec } from '../src/ui/screens/dex.js';

const out = process.argv[2] || 'export/sprites';
const scale = Math.max(1, parseInt(process.argv[3] || '1', 10));
fs.mkdirSync(out, { recursive: true });

function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
/** rgba: Uint8Array of w*h*4 */
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hslToRgb = (css) => { const m = css.match(/hsl\((\d+) (\d+)% (\d+)%\)/); if (!m) return [0, 0, 0]; const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100; const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
const toRgb = (c) => (c.startsWith('#') ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : hslToRgb(c));

function paint(spec, rgba, w, ox, oy) {
  const grid = spriteGrid(spec), pal = palette(spec.colors);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const v = grid[y][x]; if (!v) continue; const [r, g, b] = toRgb(pal[v] || pal.M);
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) { const i = ((oy + y * scale + sy) * w + ox + x * scale + sx) * 4; rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; }
  }
}

const forms = SPECIES_DEX.flatMap((s) => [{ ...s, form: 'base', file: s.id }, ...s.evolution.map((e, i) => ({ ...evolvedSpec(s, i + 1), name: e.name, form: `evolved ${i + 1}`, file: `${s.id}_e${i + 1}`, level: e.level }))]);
const cell = 16 * scale, cols = 12, rows = Math.ceil(forms.length / cols);
const sheet = Buffer.alloc(cols * cell * rows * cell * 4);
const atlas = [];
forms.forEach((f, i) => {
  const single = Buffer.alloc(cell * cell * 4); paint(f, single, cell, 0, 0);
  fs.writeFileSync(path.join(out, f.file + '.png'), png(cell, cell, single));
  const col = i % cols, row = Math.floor(i / cols); paint(f, sheet, cols * cell, col * cell, row * cell);
  atlas.push({ file: f.file + '.png', name: f.name, species: f.id.replace(/_e\d$/, ''), form: f.form, level: f.level ?? null, element: f.element, rarity: f.rarity, position: f.position, sheet: { x: col * cell, y: row * cell, w: cell, h: cell } });
});
fs.writeFileSync(path.join(out, 'sheet.png'), png(cols * cell, rows * cell, sheet));
fs.writeFileSync(path.join(out, 'atlas.json'), JSON.stringify({ cell, cols, rows, sprites: atlas }, null, 1));
console.log(`wrote ${forms.length} sprites at ${cell}px to ${out} (sheet ${cols * cell}×${rows * cell})`);
