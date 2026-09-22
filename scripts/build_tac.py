"""Turn the scraped SOS TAC rule pages (28 TAC ch.34 subchapter F) into one study JSON source."""
import json, os, re, sys, glob
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tac')
OUT = sys.argv[1]
RETRIEVED = '2026-09-22'
sections = []
for f in sorted(glob.glob(os.path.join(SRC, '34-*.json'))):
    d = json.load(open(f, encoding='utf-8'))
    num = d['rule'].replace('§', '')
    body = max(d['frames'], key=lambda x: len(x['text']))['text'] if d['frames'] else ''
    note = next((x['text'] for x in d['frames'] if x['text'].startswith('Source Note')), '')
    if body.startswith('Source Note'): body = ''
    paras = [re.sub(r'[ \t ]+', ' ', x).strip() for x in re.split(r'\n\s*\n|\n', body) if x.strip()]
    blocks = [{'type': 'p', 'text': x} for x in paras]
    if note: blocks.append({'type': 'note', 'text': re.sub(r'\s+', ' ', note).strip()})
    m = re.search(r'Chapter Review Date\s+(\d{2}/\d{2}/\d{4})', d['summary'])
    sections.append({'id': f'tac-34-600:{num}', 'heading': f'§{num}. {d["title"]}', 'level': 3, 'sourceUrl': d['href'],
                     'reviewDate': m.group(1) if m else None, 'blocks': blocks})
    print(num, d['title'], len(paras), 'paragraphs')
out = {'id': 'tac-34-600', 'title': '28 TAC Chapter 34, Subchapter F (§34.600) – Fire Alarm Rules',
       'sourceUrl': 'https://texas-sos.appianportalsgov.com/rules-and-meetings?chapter=34&interface=VIEW_TAC&part=1&subchapter=F&title=28',
       'retrievedOn': RETRIEVED,
       'license': 'Public Texas Administrative Code text (Texas Secretary of State). Each rule links to its official record page.',
       'sections': sections}
json.dump(out, open(os.path.join(OUT, 'tac-34-600.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('total', len(sections))
