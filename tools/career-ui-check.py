#!/usr/bin/env python3
"""Career Timeline UI check (GDD §38): headless Chromium at a phone size. Plays two seasons headless in the page, opens the
monster card with the longest timeline, checks the section renders under the bio, the Highlights filter and the fold work
without a full re-render, the empty state, no page errors and no horizontal overflow. Emulated browser, not a real device.
  python3 tools/career-ui-check.py [--width=390 --height=844] [--shots=DIR]
"""
import sys, threading, socketserver, http.server, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors, notes = [], [], []
def shot(page, name):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{W}-{name}.png'), full_page=False)
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    best = page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const { f } = S.runFranchise(6, { difficulty: 'rookie', seasons: 2 });
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: false }); if (__gb.settings) __gb.settings.devNotices = false;
      __gb.f = f; __gb.save();
      const m = f.roster.slice().sort((a, b) => (b.career?.ev?.length || 0) - (a.career?.ev?.length || 0))[0];
      return { id: m.id, name: m.name, n: m.career.ev.length };
    }""")
    notes.append(f"longest timeline: {best['name']} ({best['n']} stored events)")
    page.evaluate(f"async () => (await import('/src/ui/router.js')).go('monster', {{ id: '{best['id']}' }})"); page.wait_for_timeout(400)
    page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
    info = page.evaluate("() => { const t = document.querySelector('#timeline'); const bio = document.querySelector('.panel.bio'); return { has: !!t, afterBio: !!(t && bio && (bio.compareDocumentPosition(t) & 4)), items: t ? t.querySelectorAll('.tl-item').length : 0, seasons: t ? t.querySelectorAll('.tl-season').length : 0, more: !!t?.querySelector('[data-action=tl-more]'), majors: t ? t.querySelectorAll('.tl-item.major').length : 0 } }")
    if not info['has']: problems.append('no timeline section')
    if not info['afterBio']: problems.append('timeline is not after the bio')
    if info['items'] < 3: problems.append(f"only {info['items']} timeline items")
    page.evaluate("() => document.querySelector('#timeline').scrollIntoView({ block: 'start' })"); page.wait_for_timeout(600); shot(page, 'tl-1')
    marker = page.evaluate("() => { document.querySelector('main.screen').dataset.probe = 'x'; return true }")
    if info['more']:
        page.click('#timeline [data-action=tl-more]'); page.wait_for_timeout(300)
        n2 = page.evaluate("() => document.querySelectorAll('#timeline .tl-item').length")
        if n2 <= info['items']: problems.append('Show the whole career did not unfold')
        notes.append(f"folded {info['items']} -> unfolded {n2}"); shot(page, 'tl-2-open')
    top0 = page.evaluate("() => Math.round(document.querySelector('#timeline').getBoundingClientRect().top)")
    page.evaluate("() => document.querySelector('#timeline [data-action=tl-filter][data-v=highlights]').click()"); page.wait_for_timeout(250)
    top1 = page.evaluate("() => Math.round(document.querySelector('#timeline').getBoundingClientRect().top)")
    if abs(top1 - top0) > 4: problems.append(f'filtering moved the section {top0} -> {top1}')
    hl = page.evaluate("() => ({ career: document.querySelectorAll('#timeline .tl-item.career').length, any: document.querySelectorAll('#timeline .tl-item').length, on: document.querySelector('#timeline [data-v=highlights]').classList.contains('on') })")
    if hl['career'] or not hl['on']: problems.append(f'Highlights filter shows career entries {hl}')
    shot(page, 'tl-3-highlights')
    if page.evaluate("() => document.querySelector('main.screen').dataset.probe") != 'x': problems.append('filter re-rendered the whole screen')
    page.click('#timeline [data-action=tl-filter][data-v=all]')
    sizes = page.evaluate("() => [...document.querySelectorAll('#timeline button')].map(b => Math.round(b.getBoundingClientRect().height))")
    if any(h < 30 for h in sizes): problems.append(f'small touch targets {sizes}')
    if page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth") > 0: problems.append('horizontal overflow')
    # empty highlights: a monster who only just joined
    page.evaluate("async () => { const F = await import('/src/franchise/franchise.js'); const f = __gb.f; if (f.roster.length >= 38) { const out = f.roster.filter((m) => !m.cornerstone).sort((a, b) => (a.level || 1) - (b.level || 1))[0]; F.releaseMonster(f, out.id); } const r = F.devGrantLegendary(f, 'elderoot'); __gb.save(); window.__new = r.monster?.id; }")
    nid = page.evaluate("() => window.__new")
    if nid:
        page.evaluate(f"async () => (await import('/src/ui/router.js')).go('monster', {{ id: '{nid}' }})"); page.wait_for_timeout(300)
        page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
        page.click('#timeline [data-action=tl-filter][data-v=highlights]'); page.wait_for_timeout(200)
        if not page.query_selector('#timeline .tl-empty'): problems.append('no empty state for a monster without highlights')
        page.evaluate("() => document.querySelector('#timeline').scrollIntoView({ block: 'center' })"); shot(page, 'tl-4-empty')
        page.click('#timeline [data-action=tl-filter][data-v=all]')
    b.close()
srv.shutdown()
print(json.dumps({'width': W, 'height': H, 'problems': problems, 'errors': errors[:6], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
