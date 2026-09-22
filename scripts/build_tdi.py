"""Convert fetched TDI/SFMO pages (public Texas government text) into study JSON sections.
Output: one JSON per source with {id,title,sourceUrl,retrievedOn,sections:[{id,heading,blocks:[{type,text|items}]}]}"""
import re, json, html, sys, os
from html.parser import HTMLParser

RETRIEVED = '2026-09-22'
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

class Walker(HTMLParser):
    """Linear walk of <main>: headings start sections; p/li/table rows become blocks."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []; self.cur = None; self.stack = []; self.buf = ''; self.list = None
        self.in_table = False; self.row = []; self.cell = None; self.table = None; self.skip = 0
    def flush_text(self, kind='p'):
        t = re.sub(r'\s+', ' ', self.buf).strip(); self.buf = ''
        if not t or self.cur is None: return
        if self.list is not None: self.list.append(t)
        else: self.cur['blocks'].append({'type': kind, 'text': t})
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('nav', 'script', 'style', 'header', 'footer', 'aside', 'form'): self.skip += 1; return
        if self.skip: return
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.flush_text(); self.stack.append(tag); self.buf = ''
        elif tag in ('ul', 'ol'):
            self.flush_text(); self.list = []
        elif tag == 'li': self.flush_text()
        elif tag == 'p': self.flush_text()
        elif tag == 'table': self.flush_text(); self.table = []
        elif tag == 'tr': self.row = []
        elif tag in ('td', 'th'): self.cell = ''
        elif tag == 'br': self.buf += ' '
    def handle_endtag(self, tag):
        if tag in ('nav', 'script', 'style', 'header', 'footer', 'aside', 'form'): self.skip = max(0, self.skip - 1); return
        if self.skip: return
        if tag in ('h1', 'h2', 'h3', 'h4'):
            title = re.sub(r'\s+', ' ', self.buf).strip(); self.buf = ''
            if self.stack: self.stack.pop()
            if title and title.lower() not in ('on this page:', 'state fire marshal menu'):
                self.cur = {'level': int(tag[1]), 'heading': title, 'blocks': []}; self.sections.append(self.cur)
        elif tag in ('ul', 'ol'):
            self.flush_text()
            if self.list and self.cur is not None: self.cur['blocks'].append({'type': 'list', 'items': self.list})
            self.list = None
        elif tag == 'li': self.flush_text()
        elif tag == 'p': self.flush_text()
        elif tag in ('td', 'th'):
            if self.cell is not None: self.row.append(re.sub(r'\s+', ' ', self.cell).strip()); self.cell = None
        elif tag == 'tr':
            if self.table is not None and any(self.row): self.table.append(self.row)
        elif tag == 'table':
            if self.table and self.cur is not None: self.cur['blocks'].append({'type': 'table', 'rows': self.table})
            self.table = None
    def handle_data(self, data):
        if self.skip: return
        if self.cell is not None: self.cell += data
        else: self.buf += data

def parse(name):
    s = open(os.path.join(SRC, name + '.html'), encoding='utf-8', errors='ignore').read()
    m = re.search(r'<main[^>]*>(.*?)</main>', s, re.S)
    w = Walker(); w.feed(m.group(1)); w.flush_text()
    return w.sections

def slug(t): return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')[:60]

def emit(doc_id, title, url, name, section_filter=None):
    secs = parse(name)
    if section_filter: secs = section_filter(secs)
    secs = [x for x in secs if x['blocks']]
    out = {'id': doc_id, 'title': title, 'sourceUrl': url, 'retrievedOn': RETRIEVED,
           'license': 'Public Texas government text (TDI / State Fire Marshal). Verify against the live page before relying on fees or dates.',
           'sections': [{'id': f'{doc_id}:{i+1:02d}-{slug(s["heading"])}', 'heading': s['heading'], 'level': s['level'], 'blocks': s['blocks']} for i, s in enumerate(secs)]}
    json.dump(out, open(os.path.join(OUT, doc_id + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(doc_id, len(out['sections']), 'sections', sum(len(s['blocks']) for s in out['sections']), 'blocks')

emit('tdi-test-info', 'Fire alarm registration, license, and test information (SFMO)', 'https://www.tdi.texas.gov/fire/information-fire-alarm-registration-license-test.html', 'tdi-test-info')
def alarms_only(secs):
    out = []; keep = False
    for s in secs:
        if s['level'] <= 2: keep = s['heading'].lower().startswith('alarms')
        if keep or s['level'] == 1: out.append(s)
    return out
emit('tdi-faq', 'SFMO frequently asked questions – Alarms', 'https://www.tdi.texas.gov/fire/fmfaq.html', 'tdi-faq', alarms_only)
emit('tdi-smoke-alarm-notice', 'SFMO notice: licensing for smoke alarms and DIY suppliers (Sept 2018)', 'https://tdi.texas.gov/Fire/fmnseptember2018.html', 'tdi-smoke')
emit('tdi-insurance', 'Certificate of liability insurance requirements', 'https://www.tdi.texas.gov/fire/certificate-liability-insurance.html', 'tdi-insurance')
emit('tdi-fingerprints', 'Fingerprint requirements and instructions for SFMO licenses', 'https://www.tdi.texas.gov/fire/fingerprint-instructions-sfmo.html', 'tdi-fingerprints')
emit('tdi-alarm-licensing', 'Fire alarm licensing (SFMO overview)', 'https://www.tdi.texas.gov/fire/fmlialarm.html', 'tdi-alarm')

# ---- TIC 6002 from the rendered statutes page ----
t = open(os.path.join(SRC, 'tic6002.txt'), encoding='utf-8').read()
t = t[t.find('INSURANCE CODE\n'):]
parts = re.split(r'\n(?=(?:SUBCHAPTER [A-Z]\.|Sec\. 6002\.\d+\.))', t)
sections = []; sub = ''
for p in parts:
    p = p.strip()
    if not p: continue
    if p.startswith('SUBCHAPTER'):
        sub = re.sub(r'\s+', ' ', p.split('\n')[0]).strip(); continue
    m = re.match(r'Sec\. (6002\.\d+)\.\s+([A-Z0-9 ,;:\'\-\(\)/&]+?)\.\s+(.*)', p, re.S)
    if not m: continue
    num, title, body = m.group(1), m.group(2).strip().title(), m.group(3)
    body = body.replace(' ', ' ')
    paras = [re.sub(r'[ \t]+', ' ', x).strip() for x in re.split(r'\n\s*\n', body) if x.strip()]
    blocks = []; history = []
    for x in paras:
        if re.match(r'^(Added by|Amended by|Redesignated|Transferred|Acts \d{4}|Text of section)', x): history.append(x)
        else: blocks.append({'type': 'p', 'text': x})
    if history: blocks.append({'type': 'note', 'text': ' '.join(history)})
    sections.append({'id': f'tic-6002:{num}', 'heading': f'Sec. {num}. {title}', 'level': 3, 'subchapter': sub, 'blocks': blocks})
out = {'id': 'tic-6002', 'title': 'Texas Insurance Code Chapter 6002 – Fire Detection and Alarm Device Installation',
       'sourceUrl': 'https://statutes.capitol.texas.gov/Docs/IN/htm/IN.6002.htm', 'retrievedOn': RETRIEVED,
       'license': 'Public Texas statute text (Texas Legislature Online). Current through the 89th Legislature, 2nd Called Session (2025) as of the retrieval date.',
       'sections': sections}
json.dump(out, open(os.path.join(OUT, 'tic-6002.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('tic-6002', len(sections), 'sections;', [s['heading'][:40] for s in sections[:3]], '...', sections[-1]['heading'])
