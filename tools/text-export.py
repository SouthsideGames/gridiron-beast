#!/usr/bin/env python3
"""Game text export: every piece of wording in the game's source, in one table, for proofreading (and later, translation).

  python3 tools/text-export.py [--out docs/text/GAME_TEXT.csv] [--check]

Reads every string and template literal under src/, keeps the ones that are wording a person can read (not ids, CSS classes,
colours, SVG paths or code), splits HTML into its separate pieces of text, and writes one row per distinct line:
  id, key, area, kind, text, file, line, correction
`key` is the line's permanent name in the central text file (src/text/en.js); it is empty for wording not yet moved there.
`text` shows inserted values as {…}. `correction` is left empty for the reader to fill in. `kind` is button, title, attribute
(tooltips and labels read by screen readers) or text. Generated Beast Dex data is read from its source of truth as shipped
(src/data/beast-dex.generated.js). The retired 250-question media library (src/data/media.js) is skipped: nothing shows it.
--check exits 1 when the committed file is out of date.
This is a listing, not the place the game reads its text from: edit the source (or send corrections), then re-run.
"""
import argparse, csv, io, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- a small scanner for JS source: string literals and template literals (text parts, with ${...} as placeholders)
def skip_string(s, i):
    q = s[i]; j = i + 1; n = len(s)
    while j < n and s[j] != q:
        if s[j] == '\\': j += 1
        elif s[j] == '\n': break
        j += 1
    return j
def parse_template(s, i, out):
    n = len(s); j = i; buf = []; a = i
    while j < n:
        c = s[j]
        if c == '\\': j += 2; continue
        if c == '`': buf.append(s[a:j]); out.append(('tpl', i, '{…}'.join(buf))); return j + 1
        if c == '$' and j + 1 < n and s[j + 1] == '{':
            buf.append(s[a:j]); e = parse_code(s, j + 2, out, True); j = e + 1; a = j; continue
        j += 1
    return n
def parse_code(s, i, out, stop_brace=False):
    n = len(s); depth = 0; j = i
    while j < n:
        c = s[j]
        if c == '/' and j + 1 < n and s[j + 1] == '/': e = s.find('\n', j); j = n if e < 0 else e; continue
        if c == '/' and j + 1 < n and s[j + 1] == '*': e = s.find('*/', j + 2); j = n if e < 0 else e + 2; continue
        if c in '\'"': e = skip_string(s, j); out.append(('str', j + 1, s[j + 1:e])); j = e + 1; continue
        if c == '`': j = parse_template(s, j + 1, out); continue
        if c == '{': depth += 1
        elif c == '}':
            if depth == 0 and stop_brace: return j
            depth -= 1
        elif c == '/':
            k = j - 1
            while k >= 0 and s[k] in ' \t\r\n': k -= 1
            p = s[k] if k >= 0 else ''; b = k
            while b >= 0 and (s[b].isalnum() or s[b] in '_$'): b -= 1
            w = s[b + 1:k + 1]
            if p == '' or p in '(,=:[!&|?{};+-*%<>~^' or w in ('return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw', 'new', 'else', 'do'):
                m = j + 1; cls = False; ok = False
                while m < n:
                    if s[m] == '\\': m += 2; continue
                    if s[m] == '\n': break
                    if s[m] == '[': cls = True
                    elif s[m] == ']': cls = False
                    elif s[m] == '/' and not cls: ok = True; break
                    m += 1
                if ok: j = m + 1; continue
        j += 1
    return n

UNESC = [(r"\\'", "'"), (r'\\"', '"'), (r'\\n', ' '), (r'\\`', '`'), (r'\\\\', '\\')]
def unescape(t):
    t = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), t)
    for a, b in UNESC: t = re.sub(a, lambda _m, b=b: b, t)
    return t
ENT = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&middot;': '·', '&rarr;': '→', '&times;': '×'}
WORD = re.compile(r"[A-Za-z][A-Za-z'’]+")
def is_wording(t):
    """Is this a line a person reads? Not an id, class list, colour, path, selector or code."""
    core = t.replace('{…}', ' ').strip()
    if len(core) < 2: return False
    words = WORD.findall(core)
    if not words: return False
    if re.search(r'\w="|^[\w-]+:\{…\}|^\{…\}[:|]\{…\}|' + r'=>|\bfunction\b|\breturn\b|===|!==|&&|\|\||\$\{|</?\w|^\s*[.#][\w-]+|^\w+\(|;\s*\w+:|rgba?\(|hsl\(|\burl\(|^https?:|^\./|\.js\b|\.css\b|^[MLQCTZHVAmlqctzhva][\d\s.,\-]+', core): return False
    if re.fullmatch(r'[\w$.:#/\-\[\]|,@%+*]+', core): return ' ' in t and False or bool(re.fullmatch(r"[A-Z][a-z]+[A-Za-z'’\-]*", core)) and len(core) >= 3   # one word: only a Capitalised label
    if re.fullmatch(r'[a-z0-9_\-]+( [a-z0-9_\-]+)+', core) and not re.search(r'\b(the|a|an|to|of|and|is|are|in|on|for|with|you|your|his|her|no|not|this|that|it|by|at|from)\b', core): return False  # class lists, key lists
    if len(words) == 1 and not re.search(r'[A-Z]', core[:1]) and ' ' not in core: return False
    letters = sum(c.isalpha() for c in core)
    return letters >= 3 and letters / max(1, len(core)) > 0.45
ATTR = re.compile(r'\b(title|aria-label|placeholder|alt)="([^"<>]*)"')
def pieces(raw):
    """Split a literal into readable pieces: [(kind, text)]. HTML tags are removed; buttons, headings and attributes are named."""
    t = unescape(raw); out = []
    if '<' not in t or not re.search(r'</?[a-zA-Z]', t):
        return [('text', re.sub(r'\s+', ' ', t).strip())]
    for m in ATTR.finditer(t): out.append(('attribute', m.group(2)))
    pos = 0; kind = 'text'
    for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)([^<>]*)>', t):
        txt = t[pos:m.start()]
        if txt.strip(): out.append((kind, txt))
        pos = m.end(); tag = m.group(2).lower(); closing = m.group(1) == '/'
        if tag in ('button', 'h1', 'h2', 'h3', 'h4', 'summary', 'option', 'label', 'th'):
            kind = 'text' if closing else ('button' if tag == 'button' else 'title' if tag in ('h1', 'h2', 'h3', 'h4') else 'text')
        elif tag in ('div', 'p', 'li', 'td') : kind = 'text' if closing else kind
    tail = t[pos:]
    # a trailing fragment after the last complete tag; drop a dangling half tag
    tail = re.sub(r'<[^>]*$', '', tail)
    if tail.strip(): out.append((kind, tail))
    clean = []
    for k, x in out:
        for a, b in ENT.items(): x = x.replace(a, b)
        x = re.sub(r'^[^<]*>', '', x) if re.match(r'^[^<>"]*"[^<>]*>', x) else x   # the end of a tag opened in an earlier piece
        x = re.sub(r'\s+', ' ', x).strip()
        if x: clean.append((k, x))
    return clean

AREAS = [
    ('src/data/press.js', 'Media Day'), ('src/franchise/press.js', 'Media Day'), ('src/data/dialogue.js', 'Rival and commissioner dialogue'),
    ('src/data/achievements.js', 'Achievements'), ('src/data/playbook', 'Playbook'), ('src/data/reserve/', 'Playbook (reserve plays)'),
    ('src/data/beast-dex.generated.js', 'Beast Dex (species and abilities)'), ('src/data/species-legacy.js', 'Species (original 72)'), ('src/data/stadiums.js', 'Stadiums'),
    ('src/data/staff.js', 'Staff'), ('src/data/stat-guide.js', 'Stat guide'), ('src/data/league.js', 'League and clubs'), ('src/data/gyms.js', 'Gyms'),
    ('src/data/', 'Game data'), ('src/sim/abilities/review', 'Developer: Ability Reviewer'), ('src/sim/abilities/', 'Football abilities'), ('src/sim/', 'Football game (play-by-play)'),
    ('src/clash/t8/review', 'Developer: Clash Ability Reviewer'), ('src/clash/abilities/', 'Beast Clash abilities (log and reviewer)'), ('src/clash/', 'Beast Clash (battle log)'),
    ('src/franchise/', 'Franchise (news, notices, rules text)'), ('src/lab/', 'Developer: labs'),
    ('src/ui/screens/hq.js', 'Screens: headquarters and week'), ('src/ui/screens/match.js', 'Screens: match day'), ('src/ui/screens/roster.js', 'Screens: roster'),
    ('src/ui/screens/menu.js', 'Screens: menus, settings, office'), ('src/ui/screens/onboarding.js', 'Screens: new franchise'), ('src/ui/screens/clash-battle.js', 'Screens: Beast Clash'),
    ('src/ui/screens/ability-reviewer.js', 'Developer: Ability Reviewer'), ('src/ui/screens/clash-ability-reviewer.js', 'Developer: Clash Ability Reviewer'), ('src/ui/screens/ability-audit.js', 'Developer: ability tools'),
    ('src/ui/screens/ai-lab.js', 'Developer: labs'), ('src/ui/screens/attr-lab.js', 'Developer: labs'), ('src/ui/screens/clash-lab.js', 'Developer: labs'), ('src/ui/screens/practice.js', 'Screens: practice and Playbook Audit'),
    ('src/ui/dev-review.js', 'Developer: review notices'), ('src/ui/screens/', 'Screens: other'), ('src/ui/clash/', 'Beast Clash (arena)'), ('src/ui/', 'Shared interface (cards, sheets, tips)'), ('src/', 'Other'),
]
def area_of(rel):
    for pre, name in AREAS:
        if rel.startswith(pre): return name
    return 'Other'
SKIP = ('src/data/media.js', 'src/data/t8-history-reference.generated.js', 'src/fresh.js',
        # tuning records, test battles and art-generator notes: nothing here is shown in the game
        'src/clash/balance-manifest.js', 'src/clash/batch.js', 'src/clash/level1.js', 'src/clash/reference-teams.js', 'src/data/clash-moves-v1.0.0.js',
        'src/ui/sprite-gen.js', 'src/ui/sprite-features.js', 'src/ui/sprite16.js', 'src/data/ability-balance.js', 'src/data/approved-values.js', 'src/clash/t8/tolerances.js', 'src/clash/t8/flags.js')

def export():
    rows = []; seen = set()
    for dp, _, fs in os.walk(os.path.join(ROOT, 'src')):
        for f in sorted(fs):
            if not f.endswith('.js'): continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            if rel in SKIP: continue
            if rel == 'src/text/en.js':   # the central text file: one row per key, under its own section
                section = 'Central text'
                for n, line in enumerate(open(p, encoding='utf8').read().split('\n'), 1):
                    h = re.match(r"  // ── (.*?) \[\w+\]$", line)
                    if h: section = h.group(1); continue
                    m = re.match(r"  '([\w.]+)': (.*),$", line)
                    if not m: continue
                    val = m.group(2)
                    forms = re.findall(r"(\w+): '((?:[^'\\]|\\.)*)'", val) if val.startswith('{') else [('', val[1:-1])]
                    for form, v in forms:
                        rows.append({'area': section, 'kind': 'text', 'text': re.sub(r'\s+', ' ', unescape(v)).strip(), 'file': rel, 'line': n, 'key': m.group(1) + (f' ({form})' if form else '')})
                continue
            s = open(p, encoding='utf8').read(); lits = []; parse_code(s, 0, lits)
            lits.sort(key=lambda x: x[1])
            for kind, pos, raw in lits:
                if not re.search(r'[A-Za-z]{2}', raw): continue
                for k, text in pieces(raw):
                    if not is_wording(text): continue
                    key = (rel, text)
                    if key in seen: continue
                    seen.add(key)
                    rows.append({'area': area_of(rel), 'kind': k, 'text': text, 'file': rel, 'line': s.count('\n', 0, pos) + 1})
    order = {name: i for i, name in enumerate(dict.fromkeys(n for _, n in AREAS))}
    rows.sort(key=lambda r: (r['area'].startswith('Developer'), 'key' not in r, order.get(r['area'], 99), r['file'], r['line']))
    for i, r in enumerate(rows, 1): r['id'] = f'T{i:05d}'
    return rows
def to_csv(rows):
    buf = io.StringIO(); w = csv.writer(buf, lineterminator='\n'); w.writerow(['id', 'key', 'area', 'kind', 'text', 'file', 'line', 'correction'])
    for r in rows: w.writerow([r['id'], r.get('key', ''), r['area'], r['kind'], r['text'], r['file'], r['line'], ''])
    return buf.getvalue()
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join(ROOT, 'docs/text/GAME_TEXT.csv')); ap.add_argument('--check', action='store_true'); a = ap.parse_args()
    rows = export(); data = to_csv(rows)
    if a.check:
        old = open(a.out, encoding='utf8').read() if os.path.exists(a.out) else ''
        if old != data: print('GAME_TEXT.csv is out of date: run python3 tools/text-export.py'); sys.exit(1)
        print(f'GAME_TEXT.csv is current ({len(rows)} lines)'); sys.exit(0)
    os.makedirs(os.path.dirname(a.out), exist_ok=True); open(a.out, 'w', encoding='utf8').write(data)
    import collections; c = collections.Counter(r['area'] for r in rows)
    print(f'{len(rows)} lines of text -> {os.path.relpath(a.out, ROOT)}')
    for k, v in c.most_common(): print(f'  {v:5d}  {k}')
