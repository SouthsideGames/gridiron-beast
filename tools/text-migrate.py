#!/usr/bin/env python3
"""Central text migration (stage tool). Moves the wording of interface files out of the code and into src/text/en.js.

  python3 tools/text-migrate.py AREA FILE [FILE...] [--dry]

AREA is the key prefix for these files (menu, onboarding, ...). For each file the tool finds every piece of wording in its
template and string literals, gives it a key in src/text/en.js, and replaces it in the code with $t('key', { values }). ($t is the central text reader, imported under that name so it can
never clash with a local `t`.)
A sentence that has values inside it (a name, a number) becomes ONE line with {placeholders}, so a translator sees the
whole sentence. Markup, CSS classes, ids, data attributes and comparisons are left alone.
What it will not touch is listed at the end (single words used as values, plural suffixes) for a person to look at.
Nothing here changes what the game shows in English: tests/central-text.test.js and the render comparison check that.
"""
import os, re, sys, json, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ JS literal parser (strings, templates, nesting)
def skip_string(s, i):
    q = s[i]; j = i + 1; n = len(s)
    while j < n and s[j] != q:
        if s[j] == '\\': j += 1
        elif s[j] == '\n': break
        j += 1
    return j
def parse_template(s, i):
    n = len(s); parts = []; a = i; j = i
    while j < n:
        c = s[j]
        if c == '\\': j += 2; continue
        if c == '`': parts.append(('text', a, j)); return {'a': i, 'b': j, 'parts': parts}, j + 1
        if c == '$' and j + 1 < n and s[j + 1] == '{':
            parts.append(('text', a, j)); kids, e = parse_code(s, j + 2, True); parts.append(('expr', j + 2, e, kids)); j = e + 1; a = j; continue
        j += 1
    parts.append(('text', a, n)); return {'a': i, 'b': n, 'parts': parts}, n
def parse_code(s, i, stop_brace=False):
    n = len(s); kids = []; depth = 0; j = i
    while j < n:
        c = s[j]
        if c == '/' and j + 1 < n and s[j + 1] == '/': e = s.find('\n', j); j = n if e < 0 else e; continue
        if c == '/' and j + 1 < n and s[j + 1] == '*': e = s.find('*/', j + 2); j = n if e < 0 else e + 2; continue
        if c in '\'"': e = skip_string(s, j); kids.append(('str', j, e + 1)); j = e + 1; continue
        if c == '`': node, e = parse_template(s, j + 1); kids.append(('tpl', j, e, node)); j = e; continue
        if c == '{': depth += 1
        elif c == '}':
            if depth == 0 and stop_brace: return kids, j
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
    return kids, n

# ------------------------------------------------------------------ what counts as wording
WORD = re.compile(r"[A-Za-z][A-Za-z'’]+")
def is_wording(t):
    core = re.sub(r'\{\w+\}', ' ', re.sub(r'</?(?:b|i|em|strong|u)>|<br ?/?>', ' ', t)).strip()
    if len(core) < 2: return False
    words = WORD.findall(core)
    if not words: return False
    if re.search(r'=>|===|!==|&&|\|\||\$\{|</?\w|^\s*[.#][\w-]+\b|rgba?\(|hsl\(|\burl\(|^https?:|\.js\b|\.css\b|\w="', core): return False
    if re.fullmatch(r'[a-z0-9_\-]+( [a-z0-9_\-]+)*', core) and not re.search(r'\b(the|a|an|to|of|and|is|are|in|on|for|with|you|your|his|her|no|not|this|that|it|by|at|from)\b', core): return False
    if len(words) == 1 and not core[:1].isupper() and ' ' not in core: return False
    letters = sum(c.isalpha() for c in core)
    return letters >= 3 and letters / max(1, len(core)) > 0.4

# ------------------------------------------------------------------ keys
class Keys:
    def __init__(self, area, existing):
        self.area = area; self.table = dict(existing); self.by_text = {}
        for k, v in existing.items():
            if isinstance(v, str) and k.startswith(area + '.'): self.by_text.setdefault(v, k)
        self.added = []
    def key_for(self, text):
        if isinstance(text, dict):
            sig = json.dumps(text, sort_keys=True)
            if sig in self.by_text: return self.by_text[sig]
            k = self.key_for('\x01' + text['other']); self.table[k] = text; self.by_text[sig] = k; return k
        if text in self.by_text: return self.by_text[text]
        plural = text.startswith('\x01'); text = text.lstrip('\x01')
        words = re.findall(r"[A-Za-z0-9]+", re.sub(r'\{\w+\}', '', text.replace("'", '').replace('’', '')))
        slug = '_'.join(w.lower() for w in words[:6])[:48] or 'text'
        key = f'{self.area}.{slug}'; n = 2
        while key in self.table: key = f'{self.area}.{slug}_{n}'; n += 1
        self.table[key] = text; self.added.append(key)
        if not plural: self.by_text[text] = key
        return key

# ------------------------------------------------------------------ expressions inside a sentence
INLINE_FN = {'esc': None, 'yearOf': 'year', 'fmtMoney': 'amount', 'fmt': 'amount', 'ord': 'ordinal', 'pct': 'percent', 'labelOf': 'label', 'fmtClock': 'clock', 'Math.round': 'n', 'Math.max': 'n', 'Math.min': 'n', 'Math.abs': 'n', 'Math.floor': 'n', 'Math.ceil': 'n', 'String': 'value', 'Number': 'n'}
def is_inline(src):
    """Can this ${...} sit inside a sentence as a {value}? Anything that is not markup-building. (Getting this wrong never changes
    what the game shows: the value is inserted either way. It only decides how much of a sentence a translator sees at once.)"""
    e = src.strip()
    if not e or '`' in e or re.search(r'<[a-zA-Z/]', e): return False
    if re.search(r'\.map\(|\.join\(|\.filter\(|=>|\bawait\b|Html\b|Sprite\b|Svg\b|Badge\b|Chip\b|Link\b|Card\b|Glyph\b|Swatch\b|Portrait\b|Icon\b|\b(tile|seg|chip|row|line|col|side|option|opts)\(', e): return False
    return len(e) <= 220
def balanced(x):
    d = 0
    for i, c in enumerate(x):
        if c == '(': d += 1
        elif c == ')':
            d -= 1
            if d == 0: return i == len(x) - 1
    return False
def param_name(src, used):
    e = src.strip(); name = None
    m = re.match(r'([\w$.]+)\(', e)
    if m and e.endswith(')') and balanced(e[len(m.group(0)) - 1:]):
        fn = m.group(1)
        if fn in INLINE_FN:
            name = INLINE_FN[fn]
            if name is None: return param_name(e[len(m.group(0)):-1], used)       # esc(x): name it after x
        else:
            short = fn.split('.')[-1]; mm = re.match(r'(?:get|fmt)?([A-Za-z]+?)(?:Of|For|Text|Label|Name)?$', short); name = mm.group(1) if mm else short
    if name is None:
        if re.search(r'\?[^?:]*:', e): cond = re.split(r'\?', e)[0]; e2 = cond        # a ? b : c  -> named after the condition
        else: e2 = re.split(r'\|\||\?\?', e)[0]
        e2 = re.sub(r"'[^']*'|\"[^\"]*\"", '', e2)
        if re.search(r'\.length\b', e2) and not re.search(r'\.length\s*[=!<>]', e2): name = 'n'
        else:
            e2 = re.sub(r'\[[^\]]*\]', '', e2); ids = re.findall(r'[A-Za-z_$][\w$]*', e2)
            ids = [i for i in ids if i not in ('f', 'app', 'm', 'p', 'c', 'x', 's', 'r', 'd', 'g', 'i', 'k', 'length', 'Math', 'round', 'toFixed', 'Number', 'String', 'esc', 'settings', 'season', 'week', 'data', 'F', 'R')] or ids
            name = ids[-1] if ids else ('n' if re.search(r'\d', e) else 'value')
    name = re.sub(r'[^A-Za-z0-9_]', '', name) or 'value'
    if name.upper() == name and re.search(r'[A-Z]', name): name = re.sub(r'_(\w)', lambda x: x.group(1).upper(), name.lower())
    name = name.replace('_', ''); name = (name[0].lower() + name[1:]) if name else 'value'
    if name[0].isdigit(): name = 'n'
    base = name; n = 2
    while name in used: name = f'{base}{n}'; n += 1
    used.add(name); return name

# ------------------------------------------------------------------ the rewrite
class Rewriter:
    def __init__(self, s, keys, data=False): self.s = s; self.keys = keys; self.left = []; self.count = 0; self.data = data; self.also = set(next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--also=')), '').split('|')) - {''}
    def call(self, text, params=None):
        key = self.keys.key_for(text); self.count += 1
        if params: return f"$t('{key}', {{ {', '.join(f'{n}: {src}' if n != src.strip() else n for n, src in params)} }})"
        return f"$t('{key}')"
    def split_ws(self, text):
        m = re.match(r'^(\s*)(.*?)(\s*)$', text, re.S); return m.group(1), m.group(2), m.group(3)
    # -- code regions: copy, rewriting the literals inside
    def code(self, a, b, kids, in_text=False, attr=False):
        if attr: return self.s[a:b]
        out = []; pos = a
        for k in kids:
            out.append(self.s[pos:k[1]])
            out.append(self.string(k, in_text) if k[0] == 'str' else self.template(k))
            pos = k[2]
        out.append(self.s[pos:b]); return ''.join(out)
    def context(self, a, b):
        s = self.s; i = a - 1
        while i >= 0 and s[i] in ' \t\n': i -= 1
        j = b
        while j < len(s) and s[j] in ' \t\n': j += 1
        before = s[max(0, i - 24):i + 1]; after = s[j:j + 12]
        return before, after
    def string(self, k, in_text):
        a, b = k[1], k[2]; raw = self.s[a:b]; q = raw[0]; body = raw[1:-1]
        before, after = self.context(a, b)
        if re.search(r'(===?|!==?|\bcase|startsWith\(|endsWith\(|includes\(|indexOf\(|\.has\(|\.get\(|\.test\(|\bfrom|\bimport|typeof [\w.]+ ===?)\s*$', before): return raw
        if re.search(r'[\w$)\]]\s*\[\s*$', before): return raw                       # x['key']: an index, not an array of lines
        if re.match(r'(===?|!==?|\]|\s*:(?!:))', after) and not re.search(r'[?]\s*$', before): return raw   # compared, indexed or an object key
        if re.search(r"\b(data-[\w-]+|class|className|action|screen|kind|id|key|type|role|icon|ns|side|mode|status)\s*[:=]\s*$", before): return raw
        text = unescape(body, q)
        if '<' in text and re.search(r'<[a-zA-Z/][^<>]*>', text):
            new, n = self.markup(text)
            if n == 0: return raw
            return '`' + new + '`'
        if not is_wording(text): return raw
        multi = ' ' in text.strip()
        branch = bool(re.search(r'(\?|:|\|\||\?\?)\s*$', before))
        arg = bool(re.search(r"(toast|confirmSheet|sheet|err|alert|news)\(\s*$|\b(title|okLabel|cancelLabel|label|text|note|placeholder|blurb|help|why|reason|desc|tip)\s*:\s*$|return\s*$|=\s*$|,\s*$|\(\s*$|\+\s*$|\[\s*$", before))
        if multi and (branch or arg or in_text): return self.call(text)
        if not multi and in_text and branch: return self.call(text)
        if not multi and re.search(r"\b(title|okLabel|cancelLabel)\s*:\s*$", before): return self.call(text)
        if self.data and (multi or re.search(r"\b(name|short|label|role|outlet|blurb|title)\s*:\s*$", before)): return self.call(text)
        if text in self.also: return self.call(text)
        self.left.append(text); return raw
    def markup(self, text):
        """Plain markup held in a string literal: wording between tags becomes ${t('key')}. Returns (template body, count)."""
        out = []; pos = 0; n = 0
        for m in re.finditer(r'<[^<>]*>', text):
            n += self.run_text(text[pos:m.start()], out)
            out.append(self.attrs(esc_tpl(m.group(0)))); pos = m.end()
        n += self.run_text(text[pos:], out); return ''.join(out), n + self._attr_n
    _attr_n = 0
    def attrs(self, tag):
        def rep(m):
            v = m.group(2)
            if '${' in v or not is_wording(v): return m.group(0)
            self._attr_n += 1; return f'{m.group(1)}="${{{self.call(v)}}}"'
        return re.sub(r'\b(title|aria-label|placeholder|alt)="([^"]*)"', rep, tag)
    def run_text(self, text, out):
        pre, core, post = self.split_ws(text)
        if core and is_wording(core): out.append(esc_tpl(pre) + '${' + self.call(core) + '}' + esc_tpl(post)); return 1
        out.append(esc_tpl(text)); return 0
    # -- templates
    def template(self, k):
        node = k[3]; s = self.s; items = []   # ('tag', src) ('text', src) ('inline', src, a, b, kids) ('struct', new src)
        in_tag = False
        for p in node['parts']:
            if p[0] == 'text':
                txt = s[p[1]:p[2]]; i = 0
                while i < len(txt):
                    if in_tag:
                        j = txt.find('>', i)
                        if j < 0: items.append(('tag', txt[i:])); i = len(txt)
                        else: items.append(('tag', txt[i:j + 1])); in_tag = False; i = j + 1
                    else:
                        m = re.search(r'<(?!/?(?:b|i|em|strong|u)>|br ?/?>)(?=[a-zA-Z/!])', txt[i:])
                        if not m: items.append(('text', txt[i:])); i = len(txt)
                        else:
                            if m.start(): items.append(('text', txt[i:i + m.start()]))
                            in_tag = True; i += m.start()
            else:
                a, b, kids = p[1], p[2], p[3]; src = s[a:b]
                if in_tag: items.append(('tag', '${' + self.code(a, b, kids, False, attr=True) + '}'))
                elif is_inline(src): items.append(('inline', src, a, b, kids))
                else: items.append(('struct', '${' + self.code(a, b, kids, True) + '}'))
        # merge adjacent tag pieces, then rewrite runs of text + inline values
        out = []; run = []
        def flush():
            if not run: return
            # trim inline values and blank text off both ends
            lead = []; tail = []
            while run and run[0][0] == 'text' and not run[0][1].strip(): lead.append(run.pop(0))
            while run and run[-1][0] == 'text' and not run[-1][1].strip(): tail.insert(0, run.pop())
            emit = lambda it: it[1] if it[0] == 'text' else '${' + self.code(it[2], it[3], it[4], True) + '}'
            out.extend(emit(it) for it in lead)
            if run:
                pre = re.match(r'^\s*', run[0][1]).group(0) if run[0][0] == 'text' else ''; post = re.search(r'\s*$', run[-1][1]).group(0) if run[-1][0] == 'text' else ''
                used = set(); params = []; pieces = []
                for idx, it in enumerate(run):
                    if it[0] == 'text':
                        tx = it[1]
                        if idx == 0: tx = tx[len(pre):]
                        if idx == len(run) - 1 and post: tx = tx[:len(tx) - len(post)]
                        pieces.append(unescape(tx, '`'))
                    else:
                        name = param_name(it[1], used); params.append((name, self.code(it[2], it[3], it[4], True).strip())); pieces.append('{' + name + '}')
                text = ''.join(pieces)
                # "{n} season{s}" where s is (count === 1 ? '' : 's'): a real plural, one line per form
                for name, src in list(params):
                    pm = re.fullmatch(r"(.+?)\s*===?\s*1\s*\?\s*''\s*:\s*'s'", src.strip())
                    if pm and not isinstance(text, dict) and re.search(r'[A-Za-z]\{' + name + r'\}', text):
                        params = [(n2, s2) for n2, s2 in params if n2 != name]
                        if not any(n2 == 'n' for n2, _ in params): params.append(('n', pm.group(1)))
                        text = {'one': text.replace('{' + name + '}', ''), 'other': text.replace('{' + name + '}', 's')}
                if isinstance(text, dict):
                    out.append(pre + '${' + self.call(text, params) + '}' + post); out.extend(emit(it) for it in tail); run.clear(); return
                if is_wording(text) and len(WORD.findall(re.sub(r'\{\w+\}|<[^>]*>', ' ', text))) >= 1 and '{' not in re.sub(r'\{\w+\}', '', text) and '}' not in re.sub(r'\{\w+\}', '', text):
                    out.append(pre + '${' + self.call(text, params) + '}' + post)
                else: out.extend(emit(it) for it in run)
            out.extend(emit(it) for it in tail); run.clear()
        for it in items:
            if it[0] in ('text', 'inline'): run.append(it)
            else:
                flush(); out.append(self.attrs(it[1]) if it[0] == 'tag' else it[1])
        flush()
        return '`' + ''.join(out) + '`'

def unescape(body, q):
    t = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), body)
    t = t.replace('\\' + q, q).replace("\\'", "'") if q != '`' else t.replace('\\`', '`').replace('\\$', '$')
    return t.replace('\\n', '\n').replace('\\\\', '\\')
def esc_tpl(t): return t.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# ------------------------------------------------------------------ en.js
EN = os.path.join(ROOT, 'src/text/en.js')
def read_en():
    if not os.path.exists(EN): return {}, []
    out = subprocess.run(['node', '-e', f"import('{EN}').then(m => console.log(JSON.stringify(m.default)))"], capture_output=True, text=True, check=True).stdout
    table = json.loads(out); heads = re.findall(r'^  // ── (.*?) \[(\w+)\]$', open(EN, encoding='utf8').read(), re.M)
    return table, heads
def js_str(v): return "'" + v.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"
def js_val(v):
    if isinstance(v, dict): return '{ ' + ', '.join(f'{k}: {js_str(x)}' for k, x in v.items()) + ' }'
    return js_str(v)
def write_en(table, heads):
    lines = ["// Gridiron Beast: every line of wording the game shows, in English. This is the one file to edit to change a line,",
             "// and the file a translator works from (python3 tools/text-export.py turns it into a spreadsheet and back).",
             "//   'key': 'The line.'            {name} and {n} are values the game fills in; keep them in the line.",
             "//   'key': { one: '…', other: '…' } a plural: the game picks the form from {n}.",
             "// Keys are permanent names: change the wording freely, never the key. Sections follow the game's areas.",
             "// Style (docs/text/README.md): American spelling; Title Case for buttons and titles; sentence case elsewhere.",
             "export default {"]
    for title, area in heads:
        rows = [(k, v) for k, v in table.items() if k.split('.', 1)[0] == area]
        if not rows: continue
        lines.append(f'  // ── {title} [{area}]')
        for k, v in rows: lines.append(f"  '{k}': {js_val(v)},")
    lines.append('};'); open(EN, 'w', encoding='utf8').write('\n'.join(lines) + '\n')

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; dry = '--dry' in sys.argv
    title = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--title=')), None)
    area, files = args[0], args[1:]
    table, heads = read_en(); keys = Keys(area, table)
    if area not in [h[1] for h in heads]: heads.append((title or area, area))
    report = []
    for rel in files:
        p = os.path.join(ROOT, rel); s = open(p, encoding='utf8').read(); kids, _ = parse_code(s, 0)
        rw = Rewriter(s, keys, data='--data' in sys.argv); new = rw.code(0, len(s), kids)
        if rw.count and not re.search(r"import \{ t as \$t \} from '[./]*text/index\.js'", new):
            # the reader is imported as $t: plain `t` is a common local name (time, team, tab), and $t cannot collide
            depth = rel.count('/') - 1; imp = f"import {{ t as $t }} from '{'../' * depth if depth else './'}text/index.js';\n"
            ims = [m for m in re.finditer(r'^import [^\n]*\n', new, re.M)]
            if ims: new = new[:ims[-1].end()] + imp + new[ims[-1].end():]
            else: mm = re.match(r'(?:\s*//[^\n]*\n)*', new); new = new[:mm.end()] + imp + new[mm.end():]
        if not dry: open(p, 'w', encoding='utf8').write(new)
        report.append(f'{rel}: {rw.count} lines of wording moved; {len(rw.left)} single words left for review')
        if rw.left: report.append('   left: ' + ' | '.join(sorted(set(x for x in rw.left if not re.fullmatch(r'[a-z]+\.[a-z0-9_]+', x)))[:60]))
    if not dry: write_en(keys.table, heads)
    report.append(f'{len(keys.added)} new keys; {len(keys.table)} in src/text/en.js')
    try: print('\n'.join(report))
    except BrokenPipeError: pass
if __name__ == '__main__': main()
