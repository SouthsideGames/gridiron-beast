#!/usr/bin/env python3
"""Release check: a franchise made and played by the exact v39.0 build, then opened by this build on the same origin
(GDD §47). Headless Chromium with the browser's real localStorage and IndexedDB, and a simulated claude.ai cloud whose
documents live in this process, so they survive reloads and can be shared with a second device.

  1. v39.0 (served from --v39=DIR: the published files, or `git archive ec106e9`) creates a franchise with its own functions,
     plays a full season, settles the offseason and the draft, starts season 2 and plays into it, saving through its own
     app.save() to localStorage and its own cloud layout (save_meta + save_c<n>); a reload in v39.0 restores it.
  2. This build opens the same origin: the save migrates to IndexedDB slot 1, the league registry is built, a 'pre-league'
     backup is kept, every original field is unchanged, the v39.0 localStorage save and cloud documents are untouched.
  3. Reopened twice more: no second migration, no duplicated career events, the same registry.
  4. Played on in this build: the rest of season 2, playoffs, contracts, the draft, AI moves and trades, the season transition,
     weeks of season 3, an owner trade when one is offered; after each major step the page is reloaded (browser closed and
     reopened on the same profile) and the franchise must read back exactly as it was in memory.
  5. Backup: the franchise is exported to the .gbfranchise text, validated, imported on a fresh device and compared.
  6. A second device with empty storage and the shared cloud: the franchise reaches it.
  7. The migrated franchise's screens at 320/360/390/412 px: menu, HQ, League Hub tabs, a club, a career, Records, Roster,
     Settings → Save data; no page errors, no horizontal overflow.
Emulated browser, not a real device.
  python3 tools/release-check.py --v39=DIR [--seed=7] [--json=OUT] [--shots=DIR]
"""
import sys, threading, socketserver, http.server, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = dict(a.lstrip('-').split('=', 1) if '=' in a else (a.lstrip('-'), '1') for a in sys.argv[1:])
V39 = args.get('v39'); SEED = int(args.get('seed', 7)); OUTJSON = args.get('json'); SHOTS = args.get('shots')
if not V39 or not os.path.isfile(os.path.join(V39, 'src/main.js')): print('--v39=DIR (the v39.0 files) is required'); sys.exit(2)
serve = {'root': V39}
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=serve['root'], **k)
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
problems, errors, report = [], [], {}
def check(cond, msg):
    if not cond: problems.append(msg)
    return cond

# ---- the simulated claude.ai cloud: documents held here, shared by every page and context
CLOUD = {}
def c_get(p): return CLOUD.get(p)
def c_set(p, v): CLOUD[p] = v; return True
def c_del(p): CLOUD.pop(p, None); return True
def c_list(c): return [[k[len(c) + 1:], v] for k, v in sorted(CLOUD.items()) if k.startswith(c + '/') and '/' not in k[len(c) + 1:]]
FAKE = """(() => {
  const doc = (p) => ({ id: p.split('/').pop(), get: async () => { const v = await window.__cg(p); return { exists: v != null, data: () => JSON.parse(v) }; }, set: async (v) => { await window.__cs(p, JSON.stringify(v)); }, delete: async () => { await window.__cd(p); } });
  const coll = (c, filters = [], lim = 0) => ({ doc: (id) => doc(c + '/' + id), where: (f, op, v) => coll(c, [...filters, [f, op, v]], lim), limit: (n) => coll(c, filters, n),
    get: async () => { let rows = await window.__cl(c); rows = rows.filter(([, v]) => filters.every(([f, op, x]) => { const y = JSON.parse(v)[f]; return op === 'not-in' ? !x.includes(y) : op === '==' ? y === x : true; }));
      if (lim) rows = rows.slice(0, lim); return { docs: rows.map(([id, v]) => ({ id, data: () => JSON.parse(v) })) }; } });
  window.claude = { use: async (n) => (n === 'db' ? { collection: (c) => coll(c), doc } : n === 'user' ? { id: async () => 'viewer-1' } : null) };
})()"""

def context(pw, w=390, user_dir=None, cloud=True):
    b = pw.chromium.launch() if not user_dir else None
    if user_dir: ctx = pw.chromium.launch_persistent_context(user_dir, viewport={'width': w, 'height': 820}, device_scale_factor=2, is_mobile=True, has_touch=True)
    else: ctx = b.new_context(viewport={'width': w, 'height': 820}, device_scale_factor=2, is_mobile=True, has_touch=True)
    if cloud: ctx.expose_function('__cg', c_get); ctx.expose_function('__cs', c_set); ctx.expose_function('__cd', c_del); ctx.expose_function('__cl', c_list); ctx.add_init_script(FAKE)
    return b, ctx
def page_of(ctx, tag):
    pg = ctx.pages[0] if ctx.pages else ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'{tag}: {e}'))
    pg.on('console', lambda m: errors.append(f'{tag} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
    return pg
def boot(pg, v42=True):
    pg.goto(URL)
    if v42: pg.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting' && document.querySelector('main.screen .hero, main.screen-recovery, main.screen')", timeout=90000)
    else: pg.wait_for_function("() => window.__gb && document.querySelector('main.screen')", timeout=90000)
    pg.wait_for_timeout(600)
def overflow(pg, where):
    d = pg.evaluate("() => Math.max(document.documentElement.scrollWidth - window.innerWidth, ...[...document.querySelectorAll('.sheet')].map(s => s.scrollWidth - s.clientWidth))")
    check(d <= 1, f'horizontal overflow on {where} ({d}px)')
def shot(pg, name, w):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'{name}-{w}.png'), full_page=True)

# The in-page driver: the game's own functions, the same for both builds (their exports did not change). It plays like a
# player who lets the staff run the week: goal, auto-run, Sunday game, byes, playoffs, then the offseason steps.
DRIVER = """
window.__drive = {
  async F() { return await import('./src/franchise/franchise.js'); },
  async week(f) { const F = await this.F();
    if (F.needsGoal(f)) { const g = F.commissionerGoals(f); F.chooseGoal(f, g[0]?.id); }
    if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); return 'skip'; }
    if (f.week.commissioner) { const id = f.week.commissioner.names?.[0]; if (id) F.commissionerRelease(f, id); return 'commissioner'; }
    const ar = F.autoRunToSunday(f); if (!ar.ok && f.season.day < 6) return 'stuck:' + ar.reason;
    if (F.isBye(f)) { F.takeBye(f); return 'bye'; }
    const m = F.sundayMatchup(f); if (!m) return 'nomatch'; if (m.forfeit) { F.forfeitSunday(f); return 'forfeit'; }
    const g = F.simulatePlayerGame(f); if (!g?.finished) return 'unfinished'; F.finishSunday(f, g); return 'game';
  },
  async weeks(f, n) { const out = []; for (let i = 0; i < n && !f.season.finished; i++) out.push(await this.week(f)); return out; },
  async season(f) { const out = []; let g = 0; while (!f.season.finished && g++ < 40) out.push(await this.week(f)); return out; },
  async offseason(f) { const F = await this.F(); const out = {};
    while (f.scenes?.length) F.dismissScene(f);
    if (f.postseason && !f.postseason.resolved) { const ev = F.postseasonEvent(f); F.resolvePostseason(f, ev.options[0].id); }
    if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
    for (const i of F.offseasonPending(f)) { const r = F.resolveContract(f, i.id, 'sign'); if (!r.ok) F.resolveContract(f, i.id, 'walk'); }
    const b = F.beginDraft(f); out.draft = b.ok; let dg = 0;
    while (f.draft && !f.draft.done && dg++ < 80) { if (F.onTheClock(f) === f.club) { const d = f.draft; const best = d.class.filter((m) => d.available.includes(m.id)).sort((a, x) => x.potential - a.potential)[0]; const r = best && f.roster.length < F.ROSTER_MAX ? F.myDraftPick(f, best.id) : F.passDraftPick(f); if (!r.ok) F.passDraftPick(f); } else break; }
    let fa = 0; while (f.roster.length < F.ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f); const pick = mk.map((x) => x.monster).sort((a, x) => a.salary - x.salary)[0]; if (!pick || !F.signFreeAgent(f, pick.id).ok) break; }
    F.hireDefaultStaff(f); return out;
  },
  async next(f) { const F = await this.F(); while (f.scenes?.length) F.dismissScene(f); const r = F.startNextSeason(f); return r.ok ? 'ok' : r.reason; },
  async tryTrade(f) { const F = await this.F(); const picks = F.myTradablePicks(f); if (!picks.length) return 'no picks';
    if (f.roster.length >= F.ROSTER_MAX) { const M = await import('./src/data/monsters.js'); const spare = f.roster.filter((m) => !m.cornerstone && f.roster.filter((x) => x.position === m.position).length > 2).sort((a, x) => M.monsterOverall(a) - M.monsterOverall(x))[0]; if (spare) F.releaseMonster(f, spare.id); } const positions = ['S', 'LB', 'CB', 'OL', 'DL', 'WR', 'RB', 'TE']; let asked = 0;
    for (const pick of picks.slice().reverse()) for (const pos of positions.splice(0, 2)) { const a = F.tradeAskPlayer(f, { give: [pick], position: pos }); asked++; if (!a.ok) continue; if (a.offers.length) { const o = a.offers[0]; const from = o.team; const id = o.get.player.id; const r = F.acceptTrade(f, o); const R = await import('./src/franchise/league-registry.js'); return r.ok ? { traded: r.got.player.name, from, onMyRoster: f.roster.some((m) => m.id === id), stillOnTheirs: R.clubRoster(f, from).some((m) => m.id === id) } : 'refused:' + r.reason; } }
    return 'no offers after ' + asked + ' asks'; },
};
"""
STRIP = "(f) => JSON.stringify(f, (k, v) => (k === 'savedAt' ? undefined : v))"
SNAP = f"() => ({STRIP})(window.__gb.f)"
def snap(pg): return pg.evaluate(SNAP)
def fingerprint(pg):
    return pg.evaluate("""() => { const f = window.__gb.f; const all = [...f.roster, ...Object.values(f.league?.monsters || {})]; const ev = all.flatMap((m) => (m.career?.ev || []).map((e) => m.id + '|' + e.k));
      return { year: f.season.year, week: f.season.week, day: f.season.day, finished: !!f.season.finished, schema: f.schemaVersion, league: !!f.league, ids: f.league ? f.league.ids.length : 0, events: ev.length, uniqueEvents: new Set(ev).size, news: (f.leagueNews || []).length, roster: f.roster.length, record: f.season.records[f.club] }; }""")

with sync_playwright() as pw:
    prof = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'gb-release-profile-{os.getpid()}')
    # ---------------------------------------------------------------- 1. v39.0 makes and plays a franchise
    serve['root'] = V39
    _, ctx = context(pw, user_dir=prof); pg = page_of(ctx, 'v39'); boot(pg, v42=False); pg.evaluate(DRIVER)
    v39 = pg.evaluate("""async (seed) => { const F = await window.__drive.F(); const app = window.__gb;
      const f = F.createFranchise({ owner: { first: 'Kareem', last: 'Release', gender: 'Male', portrait: 1, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed, settings: { difficulty: 'pro' } });
      F.hireDefaultStaff(f); let g = 0; while (f.draft && !f.draft.done && g++ < 40) { if (F.onTheClock(f) === f.club) { const d = f.draft; const best = d.class.filter((m) => d.available.includes(m.id)).sort((a, x) => x.potential - a.potential)[0]; if (best) F.myDraftPick(f, best.id); else F.passDraftPick(f); } else break; }
      f.settings.tutorial = false; f.welcomed = true; f.settings.autoPoints = true;
      app.setFranchise(f);
      const s1 = await window.__drive.season(f); app.save(); const off = await window.__drive.offseason(f); app.save(); const nx = await window.__drive.next(f); app.save();
      const s2 = await window.__drive.weeks(f, 4); app.save(); await new Promise((r) => setTimeout(r, 1500));
      return { build: (await import('./src/version.js')).BUILD.version, s1: s1.length, off, next: nx, s2, year: f.season.year, week: f.season.week, history: f.history.length, roster: f.roster.length, hasLeague: !!f.league, schema: f.schemaVersion, records: f.season.records[f.club], lsBytes: (localStorage.getItem('gridiron-beast-v6') || '').length }; }""", SEED)
    report['v39'] = v39
    check(v39['build'].startswith('v39.0'), f"the v39.0 build ran: {v39['build']}"); check(v39['next'] == 'ok' and v39['year'] == 2, f'v39.0 played into season 2: {v39}')
    before = snap(pg)
    check(any(k.endswith('/save_meta') for k in CLOUD), 'v39.0 wrote its cloud copy (save_meta)')
    boot(pg, v42=False); pg.wait_for_function("() => window.__gb.f", timeout=30000); pg.wait_for_timeout(1500)
    check(snap(pg) == before, 'v39.0 itself restores its franchise after a reload (baseline)')
    report['v39Fingerprint'] = fingerprint(pg)
    # what v39.0 left on the device, captured last (v39.0 re-saves when it starts): this build must never change it
    legacy_ls = pg.evaluate("() => localStorage.getItem('gridiron-beast-v6')"); legacy_bk = pg.evaluate("() => localStorage.getItem('gridiron-beast-v6-backup')"); cloud_before = {k: v for k, v in CLOUD.items()}
    ctx.close()

    # ---------------------------------------------------------------- 2. this build opens the same profile
    serve['root'] = ROOT
    _, ctx = context(pw, user_dir=prof); pg = page_of(ctx, 'v42'); t0 = time.time(); boot(pg); pg.wait_for_function("() => window.__gb.f", timeout=60000); pg.wait_for_timeout(1500)
    mig = pg.evaluate("""async (orig) => { const app = window.__gb; const f = app.f; const o = JSON.parse(orig); const R = await import('./src/franchise/league-registry.js');
      const { uid, lifecycle, league, schemaVersion, savedAt, ...rest } = JSON.parse(JSON.stringify(f)); delete o.savedAt; delete o.schemaVersion; delete o.uid; delete o.lifecycle;
      const differing = [...new Set([...Object.keys(rest), ...Object.keys(o)])].filter((k) => JSON.stringify(rest[k]) !== JSON.stringify(o[k]));
      const tables = differing.includes('season') ? Object.keys(rest.season).filter((k) => JSON.stringify(rest.season[k]) !== JSON.stringify(o.season[k])) : [];
      const st = app.storage.store; const backups = await st.listBackups(); const usage = await st.usage();
      return { build: (await import('./src/version.js')).BUILD.version, mode: app.storage.mode, source: app.bootInfo.source, notes: app.bootInfo.notes, schemaVersion, league: !!league, verify: R.verifyLeague(f), uid: !!uid, lifecycle, differing, seasonDiffering: tables, backups: backups.map((b) => b.kind), usage, legacyKept: localStorage.getItem('gridiron-beast-v6'), legacyBackupKept: localStorage.getItem('gridiron-beast-v6-backup') }; }""", before)
    report['migration'] = {k: v for k, v in mig.items() if k not in ('legacyKept', 'legacyBackupKept')}; report['migration']['bootSeconds'] = round(time.time() - t0, 1)
    check(mig['build'].startswith('v42.'), f"this build ran: {mig['build']}")
    check(mig['mode'] == 'indexeddb' and mig['source'] == 'migrated', f"first start migrated into IndexedDB: {mig['mode']} / {mig['source']}")
    check(mig['schemaVersion'] == 8 and mig['league'] and not mig['verify'], f"the league registry was built: schema {mig['schemaVersion']}, {mig['verify'][:2]}")
    check(any('league registry built' in n for n in mig['notes']), f"boot notes record the registry: {mig['notes']}")
    check(mig['differing'] == [] or (mig['differing'] == ['season'] and set(mig['seasonDiffering']) <= {'leagueStats', 'playoffStats'}), f"every original field unchanged (a re-keyed AI id may touch only the current tables): {mig['differing']} {mig['seasonDiffering']}")
    check('pre-league' in mig['backups'], f"a 'pre-league' backup of the v39.0 franchise was kept: {mig['backups']}")
    check(mig['legacyKept'] == legacy_ls, 'the v39.0 localStorage save is untouched'); check(mig['legacyBackupKept'] == legacy_bk, 'the v39.0 weekly backup key is untouched')
    check(all(CLOUD.get(k) == v for k, v in cloud_before.items()), 'the v39.0 cloud documents are untouched')
    pre = pg.evaluate("""async () => { const st = window.__gb.storage.store; const b = (await st.listBackups()).find((x) => x.kind === 'pre-league'); const f = await st.readBackup(b.id); return JSON.stringify(f, (k, v) => (k === 'savedAt' ? undefined : v)); }""")
    po = json.loads(pre); bo = json.loads(before)
    for k in ('uid', 'lifecycle', 'schemaVersion'): po.pop(k, None); bo.pop(k, None)
    check(po == bo, "the 'pre-league' backup restores the v39.0 franchise exactly")
    fp1 = fingerprint(pg); report['afterMigration'] = fp1
    check(fp1['events'] == fp1['uniqueEvents'], f"no duplicated career events after migration: {fp1['events']} vs {fp1['uniqueEvents']}")
    ctx.close()

    # ---------------------------------------------------------------- 3. retry safety: reopen twice
    for i in range(2):
        _, ctx = context(pw, user_dir=prof); pg = page_of(ctx, f'v42-reopen{i}'); boot(pg); pg.wait_for_function("() => window.__gb.f", timeout=60000); pg.wait_for_timeout(800)
        fp = fingerprint(pg); src = pg.evaluate("() => [window.__gb.bootInfo.source, window.__gb.bootInfo.notes]")
        check(src[0] == 'indexeddb' and not any('league registry built' in n for n in src[1]), f'reopen {i}: loaded from IndexedDB with no second migration: {src}')
        check(fp == fp1, f'reopen {i}: the same franchise, the same registry, the same events: {fp} vs {fp1}')
        ctx.close()

    # ---------------------------------------------------------------- 4. play on in this build, reloading after each major step
    steps = []
    def step(name, js):
        _, c = context(pw, user_dir=prof); p = page_of(c, f'v42-{name}'); boot(p); p.wait_for_function("() => window.__gb.f", timeout=60000); p.evaluate(DRIVER)
        res = p.evaluate(f"async () => {{ const f = window.__gb.f; const r = await ({js})(f); await window.__gb.save({{ immediate: true }}); return {{ r, mem: ({STRIP})(f) }}; }}")
        c.close()
        _, c = context(pw, user_dir=prof); p = page_of(c, f'v42-{name}-reopened'); boot(p); p.wait_for_function("() => window.__gb.f", timeout=60000)
        same = snap(p) == res['mem']; fp = fingerprint(p); c.close()
        steps.append({'step': name, 'result': res['r'], 'readBackExactly': same, **fp})
        check(same, f'{name}: after closing and reopening the browser the franchise reads back exactly as it was')
        check(fp['events'] == fp['uniqueEvents'], f'{name}: duplicated career events ({fp["events"]} vs {fp["uniqueEvents"]})')
        return res['r']
    step('rest of season 2', "(f) => window.__drive.season(f)")
    step('offseason and draft', "(f) => window.__drive.offseason(f)")
    tr = step('owner trade', "(f) => window.__drive.tryTrade(f)")
    if isinstance(tr, dict): check(tr.get('onMyRoster') and not tr.get('stillOnTheirs'), f'the traded monster moved from the AI roster to yours: {tr}')
    step('season transition', "(f) => window.__drive.next(f)")
    step('season 3, six weeks', "(f) => window.__drive.weeks(f, 6)")
    report['steps'] = steps
    _, c = context(pw, user_dir=prof); p = page_of(c, 'v42-legacy-after'); boot(p)
    check(p.evaluate("() => localStorage.getItem('gridiron-beast-v6')") == legacy_ls, 'after a season and a half in this build, the v39.0 localStorage save is still untouched')
    check(all(CLOUD.get(k) == v for k, v in cloud_before.items() if k.endswith('save_meta') or '/save_c' in k), 'after a season and a half in this build, the v39.0 cloud documents are still untouched')
    report['cloudDocs'] = {'legacy': sorted(k.split('/', 3)[-1] for k in CLOUD if '/save_' in k)[:6], 'snapshots': len([k for k in CLOUD if '/cloud/snaps/' in k])}
    c.close()
    _, ctx = context(pw, user_dir=prof); pg = page_of(ctx, 'v42-league'); boot(pg); pg.wait_for_function("() => window.__gb.f", timeout=60000)
    league = pg.evaluate("""async () => { const f = window.__gb.f; const R = await import('./src/franchise/league-registry.js'); const S = await import('./src/franchise/league-season.js'); const D = await import('./src/data/league.js');
      const kinds = {}; for (const it of f.leagueNews) kinds[it.kind] = (kinds[it.kind] || 0) + 1;
      const usage = await window.__gb.storage.store.usage(); const P = await import('./src/franchise/pack.js'); const packed = JSON.stringify(P.pack(f)).length;
      return { verify: R.verifyLeague(f), validate: S.validateClubs(f, { cap: D.tierById(f.tier).cap }), aiTrades: (f.league.trades || []).length, legends: Object.keys(f.league.legends).length, pool: Object.values(f.pool || {}).flat().length, news: kinds, usage, rawBytes: JSON.stringify(f).length, packedBytes: packed,
        oneObjectPerId: (() => { const seen = new Set(); for (const c of R.leagueClubs(f)) for (const m of R.clubRoster(f, c)) { if (seen.has(m.id)) return false; seen.add(m.id); } for (const m of f.roster) { if (seen.has(m.id)) return false; seen.add(m.id); } return true; })() }; }""")
    report['league'] = league
    check(not league['verify'] and not league['validate'], f"league sound in season 3: {league['verify'][:2]} {league['validate'][:2]}")
    check(league['oneObjectPerId'], 'no monster on two rosters')
    check(any(k in league['news'] for k in ('moves', 'draft')), f"League News carries the offseason and draft digests: {league['news']}")

    # ---------------------------------------------------------------- 5. backup: export, then restore on a fresh device
    text = pg.evaluate("async () => { const S = await import('./src/franchise/store.js'); return S.exportFranchise(window.__gb.f); }")
    exported = snap(pg); ctx.close()
    report['export'] = {'bytes': len(text), 'format': json.loads(text).get('format'), 'schemaVersion': json.loads(text).get('schemaVersion')}
    serve['root'] = ROOT; b3, c3 = context(pw, cloud=False); p3 = page_of(c3, 'v42-restore'); boot(p3)  # a device that has never seen this franchise and has no cloud copy
    imp = p3.evaluate("""async (text) => { const S = await import('./src/franchise/store.js'); const v = S.validateImport(text); if (!v.ok) return { ok: false, problems: v.problems }; const r = await window.__gb.importInto(1, v.franchise); return { ok: r.ok, err: r.error && r.error.message }; }""", text)
    check(imp.get('ok'), f'the export imports on a fresh device: {imp}')
    boot(p3); p3.wait_for_function("() => window.__gb.f", timeout=60000); restored = snap(p3)
    a, b = json.loads(restored), json.loads(exported)
    check(a == b, 'the restored franchise equals the exported one exactly' + ('' if a == b else f": {[k for k in set(a) | set(b) if a.get(k) != b.get(k)][:6]}"))
    p3.evaluate(DRIVER); cont = p3.evaluate("async () => { const r = await window.__drive.weeks(window.__gb.f, 1); await window.__gb.save({ immediate: true }); return r; }")
    check(cont and cont[0] in ('game', 'bye'), f'the restored franchise plays on: {cont}'); report['restore'] = {'import': imp, 'playedOn': cont}
    c3.close(); b3.close()

    # ---------------------------------------------------------------- 6. a second device with empty storage and the shared cloud
    b4, c4 = context(pw); p4 = page_of(c4, 'v42-device2'); boot(p4); p4.wait_for_timeout(3000)
    d2 = p4.evaluate("""async () => { const app = window.__gb; const list = await app.slotSummaries(); return { has: !!app.f, club: app.f && app.f.club, year: app.f && app.f.season.year, week: app.f && app.f.season.week, candidate: !!app.cloudCandidate, slots: list.map((s) => s.state), league: !!(app.f && app.f.league) }; }""")
    report['device2'] = d2
    check(d2['has'] and d2['club'] == 'Ember City Beasts' and d2['league'], f'the franchise reached a second device through the cloud: {d2}')
    c4.close(); b4.close()

    # ---------------------------------------------------------------- 7. the migrated franchise's screens at phone widths
    for w in [320, 360, 390, 412]:
        _, ctx = context(pw, w=w, user_dir=prof); pg = page_of(ctx, f'v42-ui{w}'); pg.set_viewport_size({'width': w, 'height': 820}); boot(pg); pg.wait_for_function("() => window.__gb.f", timeout=60000)
        seen = {}
        try:
            overflow(pg, f'menu at {w}px'); shot(pg, 'menu', w)
            pg.click('[data-action="continue"]'); pg.wait_for_selector('main.screen', timeout=15000); pg.wait_for_timeout(300); overflow(pg, f'HQ at {w}px'); shot(pg, 'hq', w)
            for screen in ['league', 'records', 'leaders', 'roster', 'settings', 'standings', 'history', 'awardhistory']:
                pg.evaluate("(s) => import('./src/ui/router.js').then((R) => R.go(s))", screen); pg.wait_for_timeout(350); overflow(pg, f'{screen} at {w}px'); seen[screen] = pg.locator('main [data-career]').count()
                if screen == 'league':
                    for t in ['clubs', 'leaders', 'moves', 'races', 'rivals']: pg.click(f'[data-action="tab"][data-tab="{t}"]'); pg.wait_for_timeout(200); overflow(pg, f'League Hub {t} at {w}px')
                    shot(pg, 'hub-rivals', w)
                    pg.click('[data-action="tab"][data-tab="clubs"]'); pg.locator('[data-action="club"]').nth(2).click(); pg.wait_for_selector('main [data-career]', timeout=15000); overflow(pg, f'club at {w}px')
                    pg.locator('main [data-career]').nth(3).click(); pg.wait_for_selector('.career-page .cp-head', timeout=15000); overflow(pg, f'career profile at {w}px'); shot(pg, 'career', w)  # the full-screen career (GDD §48)
                    pg.click('[data-action="router-back"]'); pg.wait_for_timeout(250)
            check(seen.get('leaders', 0) >= 5 and seen.get('records', 0) >= 5, f'{w}px: names link to careers on leaders and records: {seen}')
            sd = pg.evaluate("() => { const t = document.body.innerText; return /v42\\.0/.test(t) || !!document.querySelector('#save-data'); }")
        except Exception as e:
            problems.append(f'{w}px UI walk: {str(e)[:160]}')
        report.setdefault('ui', {})[w] = seen; ctx.close()

report['problems'] = problems; report['errors'] = errors
print(json.dumps(report, indent=1, default=str)[:20000])
if OUTJSON: open(OUTJSON, 'w').write(json.dumps(report, indent=1, default=str))
print(f'RELEASE CHECK {"PASSED" if not problems and not errors else "FAILED"} ({len(problems)} problems, {len(errors)} page errors)')
sys.exit(1 if problems or errors else 0)
