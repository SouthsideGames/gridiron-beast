#!/usr/bin/env python3
"""Full-screen career profile check (GDD §48): headless Chromium at 320/360/390/412 px over a played schema-8 franchise.
  1. Every kind of monster opens a full-screen profile with all five sections: the owner's monster, a former owner monster
     (released here), an AI club's player, the rival's signature, a gym legendary, a retired legend, a league-table-only
     player and a Hall of Fame card (added to browser storage only). Each section at each width: no horizontal overflow,
     no overlapping controls, no clipped text, no page errors.
  2. Navigation: League Hub club roster -> career -> Back (same club, same scroll); League Hub Leaders tab -> career -> Back
     (Leaders tab kept); Records -> career -> Back; the monster card's "Full career profile" -> Back; a career link inside a
     sheet (an HQ award race) closes the sheet and opens the page; the section chosen on a page survives a detour and Back.
  3. Viewing never changes the saved franchise: the franchise JSON before and after is identical.
  python3 tools/career-profile-check.py --save=EXPORT.json [--shots=DIR] [--json=OUT]
Emulated browser, not a real device."""
import sys, os, json, threading, socketserver, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
if not args.get('save'): print('--save=EXPORT.json is required (a played schema-8 franchise)'); sys.exit(2)
TEXT = open(args['save']).read(); SHOTS = args.get('shots'); OUTJSON = args.get('json')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {'kinds': {}, 'nav': {}}
def check(c, m):
    if not c: problems.append(m)
    return c
LAYOUT = r"""() => { const W = innerWidth; const main = document.querySelector('main'); const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('details:not([open]) > :not(summary)'); };
  const scrollable = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const out = { overflow: [], overlap: [], clipped: [] }; const all = [...main.querySelectorAll('*')].filter(vis);
  if (document.documentElement.scrollWidth - W > 1) out.overflow.push('page +' + (document.documentElement.scrollWidth - W));
  for (const e of all) { const r = e.getBoundingClientRect(); if (r.right > W + 1 && !scrollable(e)) out.overflow.push((e.className || e.tagName) + ''); }
  const ctl = all.filter((e) => e.matches('button, a, select, [data-action]'));
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) { const a = ctl[i], b = ctl[j]; if (a.contains(b) || b.contains(a)) continue; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 2 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 2) out.overlap.push((a.innerText || '').slice(0, 20) + ' / ' + (b.innerText || '').slice(0, 20)); }
  for (const e of all.filter((e) => e.matches('.btn, .chip, .cp-tab'))) { const cs = getComputedStyle(e); if (e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.overflow !== 'visible') out.clipped.push((e.innerText || '').slice(0, 20)); }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 5); return out; }"""
PICK = r"""async () => { const f = window.__gb.f; const P = await import('./src/franchise/career-profile.js'); const F = await import('./src/franchise/franchise.js'); const M = await import('./src/data/monsters.js');
  const mons = Object.values(f.league.monsters);
  const out = { own: f.roster.find((m) => (m.stats?.seasons?.length || 0) >= 1)?.id || f.roster[0].id, ai: mons.find((m) => !m.legendary && !m.signature && (m.stats?.seasons?.length || 0) >= 2)?.id, signature: mons.find((m) => m.signature)?.id, gym: mons.find((m) => m.legendary)?.id, legend: Object.keys(f.league.legends || {})[0] || null, former: null, table: null };
  for (const h of f.history) for (const T of Object.values(h.leagueStats || {})) for (const id of Object.keys(T)) if (!out.table && !P.findMonster(f, id)) out.table = id;
  const spare = f.roster.filter((m) => !m.cornerstone && m.id !== out.own && (m.stats?.seasons?.length || 0) >= 1).sort((a, b) => M.monsterOverall(a) - M.monsterOverall(b))[0];
  if (spare) { const r = F.releaseMonster(f, spare.id); if (r?.ok !== false) out.former = spare.id; await window.__gb.save({ immediate: true }); }
  const H = await import('./src/franchise/hall-of-fame.js'); const snap = P.careerSnapshot(f, f.roster.find((m) => m.id === out.own)); H.addHofCard({ id: 'hof_check_1', club: f.club, owner: 'Check', retiredAt: 1, seasons: 3, record: { w: 20, l: 7 }, bestMonsters: [{ name: snap.name, species: snap.species, position: snap.position, ovr: snap.ovr, level: snap.level }], careers: [snap] });
  return out; }"""
GO = "([n, prm]) => import('./src/ui/router.js').then((R) => R.go(n, prm))"
CUR = "() => import('./src/ui/router.js').then((R) => { const c = R.currentScreen(); return { name: c?.name, params: c?.params || {} }; })"
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in [320, 360, 390, 412]:
        ctx = b.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); p = ctx.new_page()
        p.on('pageerror', lambda e, w=w: errors.append(f'{w}: {e}'))
        p.goto(URL); p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=60000)
        r = p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(t); const r = await window.__gb.importInto(1, f); return { ok: r.ok, schema: window.__gb.f?.schemaVersion }; }""", TEXT)
        check(r['ok'] and r['schema'] == 8, f'{w}: the played franchise imports: {r}')
        ids = p.evaluate(PICK); report['ids'] = ids
        before = p.evaluate("() => JSON.stringify(window.__gb.f)")
        # 1. every kind, every section
        targets = [(k, {'id': v}) for k, v in ids.items() if v] + [('hof', {'hof': 'hof_check_1', 'i': 0})]
        for kind, prm in targets:
            for tab in ['overview', 'timeline', 'stats', 'awards', 'teams']:
                p.evaluate(GO, ['career', {**prm, 'tab': tab}]); p.wait_for_timeout(200)
                ok = p.evaluate("() => !!document.querySelector('.career-page .cp-head') && document.querySelectorAll('.cp-tab').length === 5 && !!document.querySelector('.cp-tab.on')")
                lay = p.evaluate(LAYOUT)
                check(ok, f'{w} {kind}/{tab}: the full-screen profile with five sections'); check(not lay['overflow'], f'{w} {kind}/{tab}: overflow {lay["overflow"]}'); check(not lay['overlap'], f'{w} {kind}/{tab}: overlapping controls {lay["overlap"]}'); check(not lay['clipped'], f'{w} {kind}/{tab}: clipped {lay["clipped"]}')
                if w == 390:
                    report['kinds'].setdefault(kind, {})[tab] = p.evaluate("() => ({ status: document.querySelector('.cp-status')?.innerText, desig: document.querySelector('.cp-desig')?.innerText || null, ovr: document.querySelector('.cp-ovr b')?.innerText || null })") if tab == 'overview' else True
                    if SHOTS: os.makedirs(SHOTS, exist_ok=True); p.screenshot(path=os.path.join(SHOTS, f'{kind}-{tab}.png'), full_page=True)
        # 2. navigation
        nav = {}
        p.evaluate("() => import('./src/ui/router.js').then((R) => R.go('hq', {}, { reset: true }))"); p.wait_for_timeout(300)
        club = p.evaluate("() => Object.keys(window.__gb.f.season.records).find((c) => c !== window.__gb.f.club)")
        p.evaluate(GO, ['club', {'club': club}]); p.wait_for_timeout(300); p.evaluate("() => scrollTo(0, 400)"); p.wait_for_timeout(100); y0 = p.evaluate("() => scrollY")
        link = p.locator('main [data-career]').nth(5); link.scroll_into_view_if_needed(); y0 = p.evaluate("() => scrollY"); link.click(); p.wait_for_timeout(300)
        c1 = p.evaluate(CUR); p.click('[data-action="router-back"]'); p.wait_for_timeout(300); c2 = p.evaluate(CUR); y1 = p.evaluate("() => scrollY")
        nav['club'] = check(c1['name'] == 'career' and c2['name'] == 'club' and c2['params'].get('club') == club and abs(y1 - y0) <= 2, f'{w}: club roster -> career -> Back returns to the same club and scroll ({c1["name"]}, {c2}, {y0}->{y1})')
        p.evaluate("() => import('./src/ui/router.js').then((R) => R.go('league', {}, { reset: true }))"); p.wait_for_timeout(300); p.click('[data-action="tab"][data-tab="leaders"]'); p.wait_for_timeout(300)
        p.locator('main [data-career]').nth(2).click(); p.wait_for_timeout(300); c1 = p.evaluate(CUR)
        p.click('[data-action="router-back"]'); p.wait_for_timeout(300); tab = p.evaluate("() => document.querySelector('[data-action=\"tab\"].primary')?.dataset.tab")
        nav['leaders'] = check(c1['name'] == 'career' and tab == 'leaders', f'{w}: League Hub Leaders -> career -> Back keeps the Leaders tab ({c1["name"]}, {tab})')
        p.evaluate(GO, ['records', {}]); p.wait_for_timeout(300); rl = p.locator('main [data-career]')
        if rl.count():
            rl.first.click(); p.wait_for_timeout(300); c1 = p.evaluate(CUR); p.click('[data-action="router-back"]'); p.wait_for_timeout(300); c2 = p.evaluate(CUR)
            nav['records'] = check(c1['name'] == 'career' and c2['name'] == 'records', f'{w}: Records -> career -> Back ({c1["name"]}, {c2["name"]})')
        p.evaluate(GO, ['monster', {'id': ids['own']}]); p.wait_for_timeout(400); p.locator('main .cp-open').click(); p.wait_for_timeout(300); c1 = p.evaluate(CUR)
        p.click('.cp-tab[data-v="stats"]'); p.wait_for_timeout(200); p.evaluate(GO, ['league', {}]); p.wait_for_timeout(200); p.click('[data-action="router-back"]'); p.wait_for_timeout(300)
        kept = p.evaluate("() => document.querySelector('.cp-tab.on')?.dataset.v")
        p.click('[data-action="router-back"]'); p.wait_for_timeout(300); c3 = p.evaluate(CUR)
        nav['monster'] = check(c1['name'] == 'career' and c1['params'].get('id') == ids['own'] and kept == 'stats' and c3['name'] == 'monster', f'{w}: monster card -> Full career profile -> section kept across a detour -> Back to the card ({c1}, {kept}, {c3["name"]})')
        p.evaluate("() => import('./src/ui/router.js').then((R) => R.go('hq', {}, { reset: true }))"); p.wait_for_timeout(400)
        if True:
            # open a sheet that holds a career link (as award, box-score and free-agent sheets do), then follow it
            p.evaluate("async () => { const { sheet } = await import('./src/ui/dom.js'); const id = window.__gb.f.roster[0].id; sheet(`<p>Sheet with a link</p><button class=\"career-link\" data-career=\"${id}\">open</button>`, { title: 'Test' }); }"); p.wait_for_timeout(200)
            p.click('.sheet [data-career]'); p.wait_for_timeout(300); c1 = p.evaluate(CUR); open_sheets = p.locator('.sheet').count(); locked = p.evaluate("() => document.documentElement.classList.contains('sheet-open')")
            nav['sheet'] = check(c1['name'] == 'career' and open_sheets == 0 and not locked, f'{w}: a career link inside a sheet closes it and opens the page ({c1["name"]}, sheets {open_sheets}, locked {locked})')
        report['nav'][w] = nav
        after = p.evaluate("() => JSON.stringify(window.__gb.f)")
        check(after == before, f'{w}: viewing careers and navigating changed nothing in the franchise')
        ctx.close()
report['problems'] = problems; report['errors'] = errors[:10]
print(json.dumps(report, indent=1, ensure_ascii=False)[:4000])
if OUTJSON: json.dump(report, open(OUTJSON, 'w'), indent=1)
ok = not problems and not errors
print(('CAREER PROFILE CHECK PASSED' if ok else 'CAREER PROFILE CHECK FAILED') + f' ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(0 if ok else 1)
