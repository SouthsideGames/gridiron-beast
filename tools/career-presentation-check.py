#!/usr/bin/env python3
"""Career Presentation check (GDD §40): headless Chromium at phone sizes. Plays three seasons headless in the page (seed 1
wins a Beast Bowl), then checks:
  - the monster card: summary header, trophy case, interactive timeline (a detail opens over the card; closing it leaves the
    scroll position, the filter and the fold as they were), trophy shelves and their entries;
  - career cards: both layouts drawn from the card sheet, then real PNG files exported for a range of careers (rookie through
    Hall of Famer, long names), written to --out and checked here (signature, size, no clipped text);
  - career links: League News, award history, league leaders, the records book, the free-agent sheet, the draft room, the Hall
    of Fame (a card written with career snapshots), two monsters with the same name (each link opens its own id);
  - back navigation restores the roster's scroll position; no page errors; no horizontal overflow.
Emulated browser, not a real device.
  python3 tools/career-presentation-check.py [--width=390 --height=844] [--shots=DIR] [--out=DIR]
"""
import sys, threading, socketserver, http.server, os, json, base64, struct, zlib
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
W, H = int(args.get('width', 390)), int(args.get('height', 844)); SHOTS = args.get('shots'); OUT = args.get('out')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: Quiet(*a, directory=ROOT, **k)); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
problems, errors, notes = [], [], []
def shot(page, name, full=False):
    if SHOTS: page.screenshot(path=os.path.join(SHOTS, f'{W}-{name}.png'), full_page=full)
def overflow(page, where):
    d = page.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    if d > 1: problems.append(f'horizontal overflow on {where} ({d}px)')
def tap(page, sel):
    page.evaluate("(s) => document.querySelector(s)?.scrollIntoView({ block: 'center' })", sel.split(' >> ')[0]); page.wait_for_timeout(80); page.click(sel)
def close_sheets(page): page.evaluate("() => document.querySelectorAll('.sheet-backdrop').forEach(e => e.remove())")
def png_info(b):
    if b[:8] != b'\x89PNG\r\n\x1a\n': return None
    w, h = struct.unpack('>II', b[16:24]); return {'w': w, 'h': h, 'bytes': len(b)}

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True); page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    page.goto(f'http://127.0.0.1:{port}/'); page.wait_for_selector('#app'); page.evaluate('() => localStorage.clear()'); page.reload(); page.wait_for_selector('main.screen')
    info = page.evaluate("""async () => {
      const S = await import('/tools/franchise-soak.mjs'); const { f } = S.runFranchise(1, { difficulty: 'rookie', seasons: 3 });
      Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: false }); f.scenes = []; f.achievementsBackfilled = true; __gb.f = f; __gb.save();
      const P = await import('/src/franchise/career-profile.js');
      const rows = f.roster.map((m) => ({ m, p: P.fullProfile(f, m, 'roster') }));
      const score = (r) => r.p.trophies.reduce((a, t) => a + t.count * (t.kind === 'champion' ? 3 : 1), 0) * 100 + r.p.timeline.filter((e) => e.ref).length;
      rows.sort((a, b) => score(b) - score(a)); const best = rows[0];
      const rookie = rows.slice().sort((a, b) => (a.m.yearsPro || 0) - (b.m.yearsPro || 0) || a.p.timeline.length - b.p.timeline.length)[0];
      return { id: best.m.id, name: best.m.name, tier: best.p.tier, trophies: best.p.trophies.map((t) => t.kind + '×' + t.count), links: best.p.timeline.filter((e) => e.ref).length, rookie: rookie.m.id, rookieName: rookie.m.name, titles: f.history.filter((h) => h.champion === h.club).length };
    }""")
    notes.append(f"franchise: {info['titles']} title(s); best career {info['name']} ({info['tier']}, {info['trophies']}, {info['links']} linked events)")
    go = lambda name, params='{}': page.evaluate(f"async () => (await import('/src/ui/router.js')).go('{name}', {params})")
    # ---------------------------------------------------------------- the monster card
    go('monster', json.dumps({'id': info['id']})); page.wait_for_timeout(600); close_sheets(page)
    s = page.evaluate("() => { const t = document.querySelector('#timeline'); return t ? { head: !!t.querySelector('.cs-head'), stats: t.querySelectorAll('.cs-stat').length, tiles: t.querySelectorAll('.tc-tile').length, links: t.querySelectorAll('[data-action=tl-open]').length, card: !!t.querySelector('[data-action=cc-open]'), afterBio: !!(document.querySelector('.panel.bio') && (document.querySelector('.panel.bio').compareDocumentPosition(t) & 4)) } : null }")
    if not s: problems.append('no career section on the monster card')
    else:
        notes.append(f'monster card: {s}')
        if not s['head']: problems.append('no summary header')
        if s['stats'] < 4: problems.append(f"summary shows {s['stats']} statistics")
        if s['tiles'] < 1: problems.append('no trophies for the most decorated monster')
        if s['links'] < 1: problems.append('no interactive timeline entries')
        if not s['afterBio']: problems.append('career section is not after the bio')
    page.evaluate("() => document.querySelector('#timeline').scrollIntoView({ block: 'start' })"); page.wait_for_timeout(700); shot(page, 'cp-1-summary')
    page.evaluate("() => document.querySelector('#timeline .tc').scrollIntoView({ block: 'start' })"); page.wait_for_timeout(500); shot(page, 'cp-2-trophies')
    overflow(page, 'the monster card')
    # timeline detail: open, close, nothing moved
    tap(page, '#timeline [data-action=tl-filter][data-v=highlights]'); page.wait_for_timeout(200)
    page.evaluate("() => document.querySelector('#timeline [data-action=tl-open]').scrollIntoView({ block: 'center' })"); page.wait_for_timeout(200)
    y0 = page.evaluate('() => Math.round(window.scrollY)')
    page.click('#timeline [data-action=tl-open] >> nth=0'); page.wait_for_timeout(300)
    d = page.evaluate("() => { const s = document.querySelector('.sheet'); return s ? { hero: !!s.querySelector('.dt-hero, .dt-evo'), text: s.innerText.slice(0, 160) } : null }")
    if not d or not d['hero']: problems.append(f'timeline detail did not open a record: {d}')
    else: notes.append('detail: ' + d['text'].replace('\n', ' | ')[:140])
    shot(page, 'cp-3-detail'); overflow(page, 'a timeline detail')
    page.click('.sheet [data-action=sheet-close]'); page.wait_for_timeout(200)
    after = page.evaluate("() => ({ y: Math.round(window.scrollY), filter: document.querySelector('#timeline [data-v=highlights]').classList.contains('on'), sheets: document.querySelectorAll('.sheet').length })")
    if abs(after['y'] - y0) > 2: problems.append(f"closing a detail moved the card {y0} -> {after['y']}")
    if not after['filter']: problems.append('closing a detail lost the Highlights filter')
    if after['sheets']: problems.append('a sheet stayed open')
    # every linked event opens something
    nlinks = page.evaluate("() => document.querySelectorAll('#timeline [data-action=tl-open]').length"); bad = 0
    for i in range(min(nlinks, 12)):
        page.evaluate(f"() => document.querySelectorAll('#timeline [data-action=tl-open]')[{i}].scrollIntoView({{ block: 'center' }})"); page.click(f'#timeline [data-action=tl-open] >> nth={i}'); page.wait_for_timeout(120)
        if not page.query_selector('.sheet .dt-hero, .sheet .dt-evo'): bad += 1
        close_sheets(page)
    if bad: problems.append(f'{bad} linked timeline entries opened nothing')
    tap(page, '#timeline [data-action=tl-filter][data-v=all]'); page.wait_for_timeout(150)
    # trophy shelf
    tap(page, '#timeline [data-action=tc-open] >> nth=0'); page.wait_for_timeout(250)
    entries = page.evaluate("() => document.querySelectorAll('.sheet [data-action=tc-entry]').length")
    shot(page, 'cp-4-shelf')
    if entries:
        page.click('.sheet [data-action=tc-entry] >> nth=0'); page.wait_for_timeout(250)
        if page.evaluate("() => document.querySelectorAll('.sheet').length") < 2: problems.append('a trophy entry opened nothing')
        shot(page, 'cp-5-trophy-detail')
    close_sheets(page)
    # career card sheet: both layouts
    tap(page, '#timeline [data-action=cc-open]'); page.wait_for_selector('.cc-img', timeout=8000); page.wait_for_timeout(500)
    for fmt in ['portrait', 'square']:
        page.click(f'[data-cc-format={fmt}]'); page.wait_for_function(f"() => document.querySelector('.cc-preview')?.dataset.format === '{fmt}' && document.querySelector('.cc-img')?.complete", timeout=8000); page.wait_for_timeout(400)
        c = page.evaluate("() => { const p = document.querySelector('.cc-preview'); const i = document.querySelector('.cc-img'); return { clipped: Number(p.dataset.clipped), bytes: Number(p.dataset.bytes), nw: i.naturalWidth, nh: i.naturalHeight } }")
        notes.append(f'card sheet {fmt}: {c}')
        if c['clipped']: problems.append(f'{fmt} card: {c["clipped"]} clipped text(s)')
        if c['nw'] != 1080 or c['nh'] != (1350 if fmt == 'portrait' else 1080): problems.append(f'{fmt} card is {c["nw"]}×{c["nh"]}')
        shot(page, f'cp-6-card-{fmt}'); overflow(page, f'the {fmt} card sheet')
    with page.expect_download(timeout=8000) as dl:
        page.click('[data-cc=save]')
    path = dl.value.path(); raw = open(path, 'rb').read(); pi = png_info(raw)
    notes.append(f'saved file {dl.value.suggested_filename}: {pi}')
    if not pi or pi['w'] != 1080: problems.append(f'the saved file is not a 1080-wide PNG: {pi}')
    close_sheets(page)
    # exported PNGs for a range of careers (the real game profiles plus tier fixtures for titles the seed does not reach)
    cards = page.evaluate("""async () => {
      const P = await import('/src/franchise/career-profile.js'); const C = await import('/src/ui/career-card.js'); const f = __gb.f;
      const real = f.roster.map((m) => P.fullProfile(f, m, 'roster'));
      const pick = (t) => real.find((p) => p.tier === t);
      const base = real.slice().sort((a, b) => b.stats.games - a.stats.games)[0];
      const fx = (tier, extra) => ({ ...base, ...extra, tier });
      const list = [
        ['rookie', pick('rookie') || fx('rookie', { seasons: 1, trophies: [], honours: { titles: 0, awards: 0, records: 0, hof: false }, stats: { ...base.stats, games: 0, focus: [] } })],
        ['real-best', real.slice().sort((a, b) => b.trophies.length - a.trophies.length)[0]],
        ['veteran', pick('veteran') || pick('established') || base],
        ['dynasty-longname', fx('dynasty', { name: 'Thunderhorn Maximus VI', club: 'Ember City Beasts', honours: { titles: 3, awards: 4, records: 2, hof: false }, trophies: [{ kind: 'champion', count: 3, entries: [] }, { kind: 'mvp', count: 2, entries: [] }, { kind: 'opoy', count: 1, entries: [] }, { kind: 'dpoy', count: 1, entries: [] }, { kind: 'record', count: 2, entries: [] }] })],
        ['hof', fx('hof', { honours: { titles: 2, awards: 3, records: 1, hof: true }, trophies: [{ kind: 'hof', count: 1, entries: [] }, { kind: 'champion', count: 2, entries: [] }, { kind: 'mvp', count: 3, entries: [] }, { kind: 'record', count: 1, entries: [] }] })],
      ];
      const out = [];
      for (const [label, p] of list) for (const format of ['portrait', 'square']) {
        const { blob, report } = await C.careerCardBlob(p, format);
        const b64 = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
        out.push({ label, format, tier: p.tier, name: p.name, b64, clipped: report.clipped.map((t) => t.t), smallest: Math.min(...report.texts.map((t) => t.size)) });
      }
      const before = JSON.stringify(__gb.f); return { out, unchanged: before === JSON.stringify(__gb.f) };
    }""")
    if not cards['unchanged']: problems.append('drawing cards changed the franchise state')
    for c in cards['out']:
        raw = base64.b64decode(c['b64']); pi = png_info(raw)
        if OUT: open(os.path.join(OUT, f"card-{c['label']}-{c['format']}.png"), 'wb').write(raw)
        exp = (1080, 1350) if c['format'] == 'portrait' else (1080, 1080)
        if not pi or (pi['w'], pi['h']) != exp: problems.append(f"{c['label']} {c['format']}: not a {exp} PNG ({pi})")
        if c['clipped']: problems.append(f"{c['label']} {c['format']}: clipped {c['clipped']}")
        if c['smallest'] < 16: problems.append(f"{c['label']} {c['format']}: text down to {c['smallest']}px")
    notes.append('exported: ' + ', '.join(f"{c['label']}/{c['format']} {len(base64.b64decode(c['b64']))//1024}KB min {c['smallest']}px" for c in cards['out']))
    # ---------------------------------------------------------------- career links
    def link_check(where, selector, expect_kind=None):
        el = page.query_selector(selector)
        if not el: problems.append(f'no career link on {where}'); return
        mid = el.get_attribute('data-career'); el.scroll_into_view_if_needed(); el.click(); page.wait_for_timeout(300)
        got = page.evaluate("() => { const s = [...document.querySelectorAll('.sheet')].pop(); const t = s?.querySelector('[data-mid]'); return t ? { mid: t.dataset.mid, title: s.querySelector('.sheet-head strong')?.textContent } : null }")
        if not got or got['mid'] != mid: problems.append(f'{where}: the link opened {got} instead of {mid}')
        else: notes.append(f"{where}: {got['title']}")
        return got
    go('hq', '{}', ); page.wait_for_timeout(500); close_sheets(page)
    page.click('.league-news [data-action=leaguenews]'); page.wait_for_timeout(300)
    link_check('League News', '.sheet .ln-week [data-career]'); shot(page, 'cp-7-news-link'); close_sheets(page)
    go('awardhistory'); page.wait_for_timeout(300); link_check('award history', '#screen [data-career]'); shot(page, 'cp-8-award-link'); overflow(page, 'a league-profile sheet'); close_sheets(page)
    go('leaders'); page.wait_for_timeout(300); link_check('league leaders', '#screen [data-career]'); close_sheets(page)
    go('records'); page.wait_for_timeout(300)
    if page.query_selector('#screen [data-career]'): link_check('records book', '#screen [data-career]'); close_sheets(page)
    else: notes.append('records book: no record holder with an id yet (records set before this build keep names only)')
    # free agency (the soak ends in the offseason) and the draft
    has_off = page.evaluate("() => !!__gb.f.offseason")
    if has_off:
        go('offseason'); page.wait_for_timeout(400); close_sheets(page)
        fa = page.query_selector('#screen [data-action=fa]')
        if fa:
            fa.scroll_into_view_if_needed(); fa.click(); page.wait_for_timeout(300)
            blk = page.evaluate("() => { const s = document.querySelector('.sheet'); return s ? { block: !!s.querySelector('.career-block .cs-head'), link: !!s.querySelector('.career-block [data-career]'), ovr: s.querySelector('.cs-meta')?.textContent || '' } : null }")
            notes.append(f'free agent sheet: {blk}')
            if not blk or not blk['block']: problems.append('free-agent sheet has no career block')
            shot(page, 'cp-9-free-agent')
            if blk and blk['link']: link_check('free agent', '.sheet .career-block [data-career]')
            close_sheets(page)
        else: notes.append('free agency: market empty')
    dr = page.evaluate("() => { const d = __gb.f.draft; return d ? { picks: d.picks.filter((p) => p.id && !p.passed).length } : null }")
    if dr and dr['picks']:
        go('draft'); page.wait_for_timeout(400); close_sheets(page)
        link_check('draft room', '#screen [data-career]'); close_sheets(page)
    # identical names: two roster monsters share a name; each link opens its own id
    ids = page.evaluate("() => { const r = __gb.f.roster; r[1].name = r[0].name; return [r[0].id, r[1].id, r[0].name] }")
    for mid in ids[:2]:
        page.evaluate(f"() => {{ const b = document.createElement('button'); b.id = 'probe'; b.dataset.career = '{mid}'; b.textContent = 'x'; document.body.appendChild(b); }}")
        page.evaluate("() => document.getElementById('probe').click()"); page.wait_for_timeout(200)
        got = page.evaluate("() => [...document.querySelectorAll('.sheet [data-mid]')].pop()?.dataset.mid")
        if got != mid: problems.append(f'same-name link for {mid} opened {got}')
        close_sheets(page); page.evaluate("() => document.getElementById('probe')?.remove()")
    notes.append(f'identical names ({ids[2]}): each link opened its own monster')
    # Hall of Fame: a card written with career snapshots
    page.evaluate("""async () => { const P = await import('/src/franchise/career-profile.js'); const H = await import('/src/franchise/hall-of-fame.js'); const f = __gb.f;
      const best = f.roster.slice().sort((a, b) => P.honoursCount(b) - P.honoursCount(a)).slice(0, 3);
      H.addHofCard({ id: 'hof_check', owner: 'Check Owner', portrait: 1, club: f.club, difficulty: 'rookie', seasons: 3, record: { w: 20, l: 7 }, titles: 1, badges: [], awards: 2, bestMonsters: best.map((m) => ({ name: m.name, species: m.species, position: m.position, ovr: 70, level: m.level })), dexSeen: 10, retiredAt: Date.now(), seasonsList: [], careers: best.map((m) => P.careerSnapshot(f, m)) }); }""")
    go('hof'); page.wait_for_timeout(400)
    hb = page.query_selector('#screen [data-hof]')
    if not hb: problems.append('Hall of Fame monsters are not tappable')
    else:
        hb.click(); page.wait_for_timeout(400)
        hs = page.evaluate("() => { const s = document.querySelector('.sheet'); return s ? { head: !!s.querySelector('.cs-head'), links: s.querySelectorAll('[data-action=tl-open]').length, items: s.querySelectorAll('.tl-item').length } : null }")
        notes.append(f'Hall of Fame sheet: {hs}')
        if not hs or not hs['head']: problems.append('Hall of Fame career sheet missing')
        elif hs['links']: problems.append('Hall of Fame snapshot shows links it cannot follow')
        shot(page, 'cp-10-hof'); close_sheets(page)
    page.evaluate("async () => (await import('/src/franchise/hall-of-fame.js')).resetHof()")
    # back navigation keeps the roster where it was
    go('roster', '{}'); page.wait_for_timeout(300); close_sheets(page)
    page.evaluate("() => window.scrollTo(0, 600)"); page.wait_for_timeout(150); y1 = page.evaluate('() => Math.round(window.scrollY)')
    btn = page.query_selector('#screen [data-action=monster]')
    if btn:
        # a reserve row on screen at this scroll position (taller lists put one there on every size)
        page.evaluate("() => { const all = [...document.querySelectorAll('#screen [data-action=monster]')]; const b = all[Math.min(3, all.length - 1)]; if (b) { b.scrollIntoView({ block: 'center' }); window.__y = window.scrollY; b.click(); } }"); page.wait_for_timeout(400)
        opened = page.evaluate("async () => (await import('/src/ui/router.js')).currentScreen()?.name")
        if opened != 'monster': notes.append('back navigation: no reserve row on screen at this size; skipped')
        else:
            y1 = page.evaluate('() => Math.round(window.__y)')
            page.evaluate("async () => (await import('/src/ui/router.js')).back()"); page.wait_for_timeout(400)
            y2 = page.evaluate('() => Math.round(window.scrollY)')
            if abs(y2 - y1) > 4: problems.append(f'back to the roster lost its place {y1} -> {y2}')
            else: notes.append(f'back to the roster: scroll kept at {y2}')
    b.close()
srv.shutdown()
print(json.dumps({'width': W, 'height': H, 'problems': problems, 'errors': errors[:8], 'notes': notes}, indent=1))
sys.exit(1 if problems or errors else 0)
