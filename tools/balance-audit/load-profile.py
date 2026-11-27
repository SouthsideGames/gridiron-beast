"""Where does a season-15 reload spend its time? CPU profile (CDP Profiler) of one reload until the franchise is back, desktop, unthrottled."""
import sys, os, json, threading, socketserver, http.server, collections
from playwright.sync_api import sync_playwright
ROOT='/home/claude/gb-impl'; SAVE=sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{srv.server_address[1]}/'
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':844}); p=ctx.new_page(); p.goto(URL)
    p.wait_for_function("() => window.__gb && window.__gb.storage && window.__gb.storage.mode !== 'starting'", timeout=120000)
    p.evaluate("""async (t) => { const Save = await import('./src/franchise/save.js'); const f = Save.importJson(t); await window.__gb.importInto(2, f); }""", open(SAVE).read())
    p.reload(wait_until='commit'); cdp=ctx.new_cdp_session(p); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval',{'interval':200}); cdp.send('Profiler.start')
    p.wait_for_function("() => window.__gb && window.__gb.f && window.__gb.f.season", timeout=180000, polling=50)
    prof=cdp.send('Profiler.stop')['profile']
    nodes={n['id']:n for n in prof['nodes']}; self_t=collections.Counter(); dt=prof['timeDeltas']
    for sid,d in zip(prof['samples'],dt): self_t[sid]+=d
    by=collections.Counter()
    for nid,t in self_t.items():
        cf=nodes[nid]['callFrame']; key=f"{cf['functionName'] or '(anon)'} {cf['url'].split('/src/')[-1]}:{cf['lineNumber']+1}"; by[key]+=t
    tot=sum(by.values())/1000
    # inclusive time by function: walk parents
    parent={}
    for n in prof['nodes']:
        for c in n.get('children',[]): parent[c]=n['id']
    inc=collections.Counter()
    for nid,t in self_t.items():
        seen=set(); x=nid
        while x is not None:
            cf=nodes[x]['callFrame']; key=f"{cf['functionName'] or '(anon)'} {cf['url'].split('/src/')[-1]}:{cf['lineNumber']+1}"
            if key not in seen: inc[key]+=t; seen.add(key)
            x=parent.get(x)
    print('sampled ms', round(tot))
    print('TOP SELF'); [print(round(v/1000), k) for k,v in by.most_common(12)]
    print('TOP INCLUSIVE (src only)'); [print(round(v/1000), k) for k,v in inc.most_common(60) if '.js' in k and 'src' not in k.split()[1][:0]][:25]
