#!/usr/bin/env python3
"""
Builds the Granth library (Vedas, Upanishads, Upavedas, Itihasa, Puranas, Darshana) for the website.

Sources (public digital editions, cloned by the "Deploy website" workflow):
  --dharmic  https://github.com/bhavykhatri/DharmicData   (ODbL)  Mahabharata (BORI critical edition), Valmiki
             Ramayana, Ramcharitmanas, Rigveda, Shukla Yajurveda, Atharvaveda
  --etexts   https://github.com/sanskrit/raw_etexts      GRETIL (Göttingen Register of Electronic Texts in Indian
             Languages) in Devanagari, plus Ayurveda, Dhanurveda, Gandharvaveda and Arthashastra files

Output (--out, normally vedic-pandit-client/public/granth):
  catalog.json                      every text with its category, description, source and counts
  <code>/index.json                 books and chapters of one text
  <code>/<chapter>.json             the verses of one chapter: {"v": [["1", "text"], ...]}

Only the original Sanskrit (Awadhi for Ramcharitmanas) is published; nothing is generated. Readers can ask
AI PanditJi to explain any verse, and he is given the exact text.

Usage: python3 tools/build_library.py --dharmic DIR --etexts DIR --out DIR
"""
import argparse
import glob
import json
import os
import re
import sys
from collections import OrderedDict

DEV = str.maketrans('०१२३४५६७८९', '0123456789')
OUT = ''
SOURCES = {}
STATS = []


def num(s):
    return s.translate(DEV)


# Lines that are GRETIL's English notes run through a Devanagari converter, apparatus, or markup
JUNK = re.compile(r'[A-Za-zÑñ#*@$%^=<>{}\[\]\\|~`]|\u093C|_{3,}|^\s*\+\+\+|^\s*title\s*=')
# GRETIL notes converted to Devanagari ('chapter' → छप्तेर्, 'ins.' → इन्स्।), apparatus lines starting with ':' or '§'
JUNK2 = re.compile(r'^[:§]|छप्तेर्|इन्स्।|स्त्।|^[०-९]+[ ]*$|्०')


def clean_line(s):
    s = s.replace('‌', '').replace('‍', '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def write_text(meta, books):
    """books: list of (book_id, book_name, OrderedDict chapter_id -> list[(verse_label, text)])"""
    code = meta['code']
    d = os.path.join(OUT, code)
    os.makedirs(d, exist_ok=True)
    index = {'code': code, 'books': []}
    total = 0
    for bid, bname, chapters in books:
        chs = []
        for cid, verses in chapters.items():
            verses = [(v, t) for v, t in verses if t and t.strip()]
            if not verses:
                continue
            fid = cid.replace('/', '_')
            with open(os.path.join(d, fid + '.json'), 'w', encoding='utf-8') as f:
                json.dump({'v': verses}, f, ensure_ascii=False, separators=(',', ':'))
            chs.append({'id': cid, 'n': len(verses)})
            total += len(verses)
        if chs:
            index['books'].append({'id': bid, 'name': bname, 'chapters': chs})
    if total == 0:
        print(f'  !! {code}: nothing parsed, skipped', file=sys.stderr)
        return
    with open(os.path.join(d, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    meta = dict(meta)
    meta['verses'] = total
    meta['chapters'] = sum(len(b['chapters']) for b in index['books'])
    STATS.append(meta)
    print(f'  {code}: {meta["chapters"]} chapters, {total} verses')


# ---------------------------------------------------------------- DharmicData

def mahabharata(src):
    parvas = ['Adi', 'Sabha', 'Aranyaka (Vana)', 'Virata', 'Udyoga', 'Bhishma', 'Drona', 'Karna', 'Shalya', 'Sauptika',
              'Stri', 'Shanti', 'Anushasana', 'Ashvamedhika', 'Ashramavasika', 'Mausala', 'Mahaprasthanika', 'Svargarohana']
    parvas_hi = ['आदि', 'सभा', 'आरण्यक (वन)', 'विराट', 'उद्योग', 'भीष्म', 'द्रोण', 'कर्ण', 'शल्य', 'सौप्तिक', 'स्त्री', 'शान्ति',
                 'अनुशासन', 'आश्वमेधिक', 'आश्रमवासिक', 'मौसल', 'महाप्रास्थानिक', 'स्वर्गारोहण']
    books = []
    for b in range(1, 19):
        path = os.path.join(src, 'Mahabharata', 'Critical Edition', f'MBh{b:02d}.json')
        data = json.load(open(path, encoding='utf-8'))
        chapters = OrderedDict()
        last = None
        for key, val in data.items():
            m = re.match(r'(\d\d)(\d\d\d)(\d\d\d)([a-z]*)', key)
            if not m:
                continue
            ch, vs = str(int(m.group(2))), str(int(m.group(3)))
            line = clean_line((val.get('text') or {}).get('ud', ''))
            if not line:
                continue
            cid = f'{b}.{ch}'
            verses = chapters.setdefault(cid, [])
            if last == (cid, vs) and verses:
                verses[-1][1] += '\n' + line
            else:
                verses.append([vs, line])
            last = (cid, vs)
        books.append((str(b), f'{b}. {parvas[b - 1]} Parva · {parvas_hi[b - 1]} पर्व', chapters))
    write_text({'code': 'mahabharata', 'name': 'Mahabharata (Critical Edition)', 'nameDev': 'महाभारतम्', 'cat': 'itihasa',
                'desc': 'The complete Bhandarkar Oriental Research Institute (Pune) critical edition: 18 parvas, about 75,000 verses. Chapter numbers follow the critical edition.',
                'unit': 'adhyaya', 'src': 'BORI critical edition, via DharmicData (ODbL)', 'lang': 'sa'}, books)


def valmiki_critical(et):
    """Valmiki Ramayana, Baroda critical edition (GRETIL): lines like '१।००१।००१अ text'."""
    base = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/2_epic/ramayana')
    files = sorted(glob.glob(os.path.join(base, 'valmiki_ramayana_[1-7]_*.md')))
    if len(files) < 7:
        return False
    names = ['Bala Kanda · बालकाण्ड', 'Ayodhya Kanda · अयोध्याकाण्ड', 'Aranya Kanda · अरण्यकाण्ड', 'Kishkindha Kanda · किष्किन्धाकाण्ड',
             'Sundara Kanda · सुन्दरकाण्ड', 'Yuddha Kanda · युद्धकाण्ड', 'Uttara Kanda · उत्तरकाण्ड']
    books = []
    for path in files:
        chapters = OrderedDict()
        last = None
        k = None
        for raw in gretil_body(path).split('\n'):
            line = clean_line(raw)
            m = re.match(r'^([०-९]+)।([०-९]+)।([०-९]+)([^\s]*)\s+(.*)$', line)
            if not m or JUNK.search(m.group(5)):
                continue
            k = int(num(m.group(1)))
            cid, vs = f'{k}.{int(num(m.group(2)))}', str(int(num(m.group(3))))
            text = m.group(5).strip()
            verses = chapters.setdefault(cid, [])
            if last == (cid, vs) and verses:
                verses[-1][1] += '\n' + text
            else:
                verses.append([vs, text])
            last = (cid, vs)
        if k:
            books.append((str(k), f'{k}. {names[k - 1]}', chapters))
    write_text({'code': 'valmiki-ramayana', 'name': 'Valmiki Ramayana (Critical Edition)', 'nameDev': 'श्रीमद्वाल्मीकीयरामायणम्', 'cat': 'itihasa',
                'desc': 'Maharshi Valmiki\'s Adi Kavya, Baroda (Oriental Institute) critical edition: seven kandas, about 18,700 shlokas.',
                'unit': 'sarga', 'src': 'Oriental Institute Baroda critical edition, GRETIL (Göttingen) via sanskrit/raw_etexts', 'lang': 'sa'}, books)
    return True


def valmiki(src):
    names = [('balakanda', 'Bala Kanda · बालकाण्ड'), ('ayodhyakanda', 'Ayodhya Kanda · अयोध्याकाण्ड'), ('aranyakanda', 'Aranya Kanda · अरण्यकाण्ड'),
             ('kishkindhakanda', 'Kishkindha Kanda · किष्किन्धाकाण्ड'), ('sundarakanda', 'Sundara Kanda · सुन्दरकाण्ड'),
             ('yuddhakanda', 'Yuddha Kanda · युद्धकाण्ड'), ('uttarakanda', 'Uttara Kanda · उत्तरकाण्ड')]
    books = []
    for i, (slug, label) in enumerate(names, 1):
        files = glob.glob(os.path.join(src, 'ValmikiRamayana', f'{i}_*.json'))
        if not files:
            continue
        chapters = OrderedDict()
        for row in json.load(open(files[0], encoding='utf-8')):
            t = re.sub(r'॥\s*[\d०-९]+-[\d०-९]+-[\d०-९]+\s*॥', '', row.get('text', ''))
            t = t.replace('।', '।\n', 1) if '\n' not in t else t
            t = '\n'.join(clean_line(x) for x in t.split('\n') if clean_line(x))
            chapters.setdefault(f'{i}.{row["sarg"]}', []).append([str(row['shloka']), t])
        books.append((str(i), f'{i}. {label}', chapters))
    write_text({'code': 'valmiki-ramayana', 'name': 'Valmiki Ramayana', 'nameDev': 'वाल्मीकि रामायणम्', 'cat': 'itihasa',
                'desc': 'Maharshi Valmiki\'s Adi Kavya in seven kandas and about 24,000 shlokas.',
                'unit': 'sarga', 'src': 'DharmicData (ODbL), from the Ramayana_Book project', 'lang': 'sa'}, books)


def ramcharitmanas(src):
    books = []
    files = sorted(glob.glob(os.path.join(src, 'Ramcharitmanas', '*_data.json')), key=lambda p: int(os.path.basename(p).split('_')[0]))
    for path in files:
        i = int(os.path.basename(path).split('_')[0])
        kname = os.path.basename(path).split('_', 1)[1].replace('_data.json', '').replace('_', ' ')
        chapters = OrderedDict()
        group, n_doha, buf = 1, 0, []
        rows = json.load(open(path, encoding='utf-8'))
        for row in rows:
            typ = row.get('type', '')
            txt = '\n'.join(clean_line(x) for x in re.split(r'\n+', row.get('content', '')) if clean_line(x))
            if not txt:
                continue
            buf.append([typ, txt])
            if 'दोहा' in typ or 'सोरठा' in typ:
                n_doha += 1
                chapters[f'{i}.{n_doha}'] = buf
                buf = []
        if buf:
            chapters[f'{i}.{n_doha + 1}'] = buf
        books.append((str(i), f'{i}. {kname}', chapters))
    write_text({'code': 'ramcharitmanas', 'name': 'Shri Ramcharitmanas', 'nameDev': 'श्रीरामचरितमानस', 'cat': 'bhakti',
                'desc': 'Goswami Tulsidas\'s Awadhi Ramayana, seven kandas. Each section here ends with its doha or soratha.',
                'unit': 'doha', 'src': 'IIT Kanpur Ramcharitmanas project, via DharmicData (ODbL)', 'lang': 'awa'}, books)


def split_numbered(text):
    """Split a sukta/chapter body on ॥N॥ verse numbers. Returns (header, [(n, verse)])."""
    text = text.replace('।।', '॥').replace('|', '।')
    parts = re.split(r'॥\s*([०-९\d]+)\s*॥*', text)
    out, header = [], ''
    for k in range(0, len(parts) - 1, 2):
        body, n = parts[k], num(parts[k + 1])
        lines = [clean_line(x) for x in body.split('\n') if clean_line(x)]
        if k == 0 and not out:
            # title and rishi / devata / chhandas lines before the first verse carry no svara marks
            while len(lines) > 1 and not re.search('[\u0951\u0952]', lines[0]):
                header = (header + ' · ' + lines[0]).strip(' ·')
                lines = lines[1:]
        out.append([n, '\n'.join(lines)])
    return header, out


def vedas_dharmic(src):
    # Rigveda
    books = []
    for m in range(1, 11):
        chapters = OrderedDict()
        for row in json.load(open(os.path.join(src, 'Rigveda', f'rigveda_mandala_{m}.json'), encoding='utf-8')):
            header, verses = split_numbered(row['text'])
            if header:
                verses.insert(0, ['ऋषि', header])
            chapters[f'{m}.{row["sukta"]}'] = verses
        books.append((str(m), f'Mandala {m} · मण्डल {m}', chapters))
    write_text({'code': 'rigveda', 'name': 'Rigveda Samhita', 'nameDev': 'ऋग्वेदसंहिता', 'cat': 'veda',
                'desc': 'The oldest Veda: 10 mandalas, 1,028 suktas, about 10,500 mantras, with svara (accent) marks. The first line of each sukta names its rishi, devata and chhandas.',
                'unit': 'sukta', 'src': 'Vedic Heritage Portal (Govt. of India), via DharmicData (ODbL)', 'lang': 'sa'}, books)
    # Shukla Yajurveda, Madhyandina
    chapters = OrderedDict()
    for row in json.load(open(os.path.join(src, 'Yajurveda', 'vajasneyi_madhyadina_samhita.json'), encoding='utf-8')):
        _, verses = split_numbered(row['text'])
        chapters[str(row.get('adhyaya', row.get('chapter')))] = verses
    write_text({'code': 'shukla-yajurveda', 'name': 'Shukla Yajurveda (Vajasaneyi Madhyandina)', 'nameDev': 'शुक्लयजुर्वेद माध्यन्दिनसंहिता', 'cat': 'veda',
                'desc': 'The Veda of the yajna formulas, Madhyandina recension: 40 adhyayas. Adhyaya 40 is the Ishavasya Upanishad.',
                'unit': 'adhyaya', 'src': 'Vedic Heritage Portal, via DharmicData (ODbL)', 'lang': 'sa'}, [('1', 'Adhyayas · अध्याय', chapters)])
    # Atharvaveda, Shaunaka
    books = []
    for k in range(1, 21):
        p = os.path.join(src, 'AtharvaVeda', f'atharvaveda_kaanda_{k}.json')
        if not os.path.exists(p):
            continue
        chapters = OrderedDict()
        for row in json.load(open(p, encoding='utf-8')):
            header, verses = split_numbered(row['text'])
            if header:
                verses.insert(0, ['विषय', header])
            chapters[f'{k}.{row["sukta"]}'] = verses
        books.append((str(k), f'Kanda {k} · काण्ड {k}', chapters))
    write_text({'code': 'atharvaveda', 'name': 'Atharvaveda Samhita (Shaunaka)', 'nameDev': 'अथर्ववेदसंहिता', 'cat': 'veda',
                'desc': 'The Veda of daily life, healing, home and kingship: 20 kandas, about 730 suktas and 6,000 mantras.',
                'unit': 'sukta', 'src': 'Vedic Heritage Portal, via DharmicData (ODbL)', 'lang': 'sa'}, books)


# ---------------------------------------------------------------- GRETIL (Devanagari)

REF_END = re.compile(r'[॥।]\s*([^\s॥।_]{0,14})_([०-९][^॥\n]*?)\s*[॥।]?\s*$')
REF_START = re.compile(r'^\s*[।॥]?([^\s_।॥]{1,10})_([०-९][०-९।,.]*[^\s]*?)[।]?\s+(.*)$')
REF_BARE = re.compile(r'॥\s*([०-९]+(?:[।.,][०-९]+)*)\s*\*?\s*॥\s*$')


def parse_ref(ref):
    """'१,२।२८' -> ('1.2', '28'); '०१।०१।००१।१' (bhagavata, with pada) handled by caller; strips pada letters."""
    r = num(ref)
    r = re.sub(r'\s*=.*$', '', r)
    r = r.strip('।. ')
    r = re.sub(r'(?<=\d)[^\d,.।:*\-]+$', '', r)  # pada letters: अब्, च्द्, a, cd …
    parts = re.split(r'[।]', r)
    if len(parts) == 1:
        return None, parts[0]
    verse = parts[-1]
    chap = '.'.join(parts[:-1]).replace(',', '.')
    chap = '.'.join(str(int(x)) if x.isdigit() else x for x in chap.split('.'))
    verse = str(int(verse)) if verse.isdigit() else verse
    return chap, verse


def gretil_body(path):
    t = open(path, encoding='utf-8').read()
    return t.split('## पाठः', 1)[-1] if '## पाठः' in t else t


def gretil_markers(paths, default_chapter='1', prefix_mode=False, skip_dash=False, chapter_map=None):
    """Generic GRETIL parser: verses end with '॥ ABBR_ref ॥' (or lines start with 'ABBR_ref')."""
    chapters = OrderedDict()
    for path in paths:
        pending = []
        last_key = None
        for raw in gretil_body(path).split('\n'):
            line = clean_line(raw)
            line = re.sub(r'\s*=\s*[^\s॥_]+_[०-९][^॥]*', '', line)  # 'द्ग्_१।१ = द्भ्प्_७,३१।१' → first ref only
            line = re.sub(r'\s*\[[^\]]*\]\s*', ' ', line).strip()  # editorial readings in brackets
            line = line.replace('§', '').strip()
            if not line or JUNK.search(line) or JUNK2.search(line):
                continue
            ref = None
            m = REF_START.match(line) if prefix_mode else None
            if m:
                ref, text = m.group(2), m.group(3)
            else:
                m = REF_END.search(line)
                if m:
                    ref, text = m.group(2), line[:m.start()].strip()
                else:
                    mb = REF_BARE.search(line)
                    if mb:
                        ref, text = mb.group(1), line[:mb.start()].strip()
            if ref is None:
                pending.append(line)
                continue
            chap, verse = parse_ref(ref)
            if chap is None:
                chap = default_chapter
            if chapter_map:
                chap = chapter_map(chap)
            if skip_dash:
                text = text.replace('-', '')
            text = re.sub(r'\s*॥\s*$', ' ॥', text).strip()
            key = (chap, verse)
            if last_key and chap != last_key[0]:
                # the previous chapter's colophon ("iti … adhyayah") is not part of this chapter
                pending = [x for x in pending if not x.startswith('इति')]
            body = '\n'.join(pending + [text]).strip()
            pending = []
            verses = chapters.setdefault(chap, [])
            if key == last_key and verses:
                verses[-1][1] = (verses[-1][1] + '\n' + body).strip()
            else:
                verses.append([verse, body])
            last_key = key
    return chapters


def bhagavata(et):
    books = []
    base = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/3_purana/bhagp')
    for s in range(1, 13):
        p = os.path.join(base, f'bhagavata-purana_{s}.md')
        if not os.path.exists(p):
            continue
        chapters = OrderedDict()
        last = None
        for raw in gretil_body(p).split('\n'):
            line = clean_line(raw)
            m = re.match(r'^[^\s_]+_([०-९]+)।([०-९]+)।([०-९]+)।([०-९]+)\s*(.*)$', line)
            if not m or JUNK.search(m.group(5)):
                continue
            ch = f'{int(num(m.group(1)))}.{int(num(m.group(2)))}'
            vs = str(int(num(m.group(3))))
            text = m.group(5).replace('-', '').strip()
            if not text:
                continue
            verses = chapters.setdefault(ch, [])
            if last == (ch, vs) and verses:
                verses[-1][1] += '\n' + text
            else:
                verses.append([vs, text])
            last = (ch, vs)
        books.append((str(s), f'Skandha {s} · स्कन्ध {s}', chapters))
    return books


def by_book(chapters, label):
    """Group 'a.b' chapters into books by 'a'; single-level chapters stay in one book."""
    books = OrderedDict()
    for cid, verses in chapters.items():
        b = cid.split('.')[0] if '.' in cid else '1'
        books.setdefault(b, OrderedDict())[cid] = verses
    if len(books) == 1 and all('.' not in c for c in chapters):
        return [('1', label('') if callable(label) else label, chapters)]
    return [(b, label(b) if callable(label) else f'{label} {b}', chs) for b, chs in books.items()]


PURANAS = [
    # code, name, Devanagari, files (relative to 3_purana), description
    ('vishnu-purana', 'Vishnu Purana', 'विष्णुपुराणम्', ['visnu-purana_plain_text_version.md'],
     'Parashara tells Maitreya of creation, the avatars of Vishnu, Dhruva, Prahlada and the life of Krishna. Six amshas.', 'Amsha'),
    ('markandeya-purana', 'Markandeya Purana', 'मार्कण्डेयपुराणम्', ['markandeya-purana_adhyayas_1-93.md'],
     'Includes the Devi Mahatmya (Durga Saptashati, adhyayas 81–93).', None),
    ('shiva-purana', 'Shiva Purana (Vidyeshvara & Vayaviya Samhitas)', 'शिवमहापुराणम्', ['siva-purana_book_1_vidyesvara-samhita.md', 'siva-purana_book_7_vayaviya-samhita_parts_1_and_2.md'],
     'The glory of Shiva, the Linga, the Panchakshara mantra and Shaiva worship. Books 1 and 7 of the seven samhitas.', 'Samhita'),
    ('brahma-purana', 'Brahma Purana', 'ब्रह्मपुराणम्', ['brahmap/brahma-purana.md'], 'The first of the Mahapuranas: creation, tirthas such as Konark and Puri, and Krishna\'s life.', None),
    ('brahmanda-purana', 'Brahmanda Purana', 'ब्रह्माण्डपुराणम्', ['brahmanda-purana_part_1_38_adhyayas.md', 'brahmanda-purana_part_2.md', 'brahmanda-purana_part_3.md'],
     'The cosmic egg, geography, genealogies and the Lalita story. Three padas.', 'Part'),
    ('garuda-purana', 'Garuda Purana', 'गरुडपुराणम्', ['garuda-purana_part_1.md', 'garuda-purana_part_2.md', 'garuda-purana_part_3.md'],
     'Vishnu teaches Garuda: dharma, Ayurveda, gems, and (in the Preta Khanda) the journey after death.', 'Khanda'),
    ('kurma-purana', 'Kurma Purana', 'कूर्मपुराणम्', ['kurma-purana_part_1.md', 'kurma-purana_part_2.md'],
     'Told by Vishnu as the tortoise; includes the Ishvara Gita and Vyasa Gita.', 'Part'),
    ('linga-purana', 'Linga Purana (Part 1)', 'लिङ्गपुराणम्', ['linga-purana_part_1.md'], 'The Shiva Linga, its origin and worship.', 'Part'),
    ('matsya-purana', 'Matsya Purana (Adhyayas 1–176)', 'मत्स्यपुराणम्', ['matsyapurana_adhyayas_1-176.md'], 'Vishnu as the fish saves Manu; vratas, tirthas and royal dharma.', None),
    ('narada-purana', 'Narada Purana', 'नारदपुराणम्', ['narada-purana_or_naradiya-purana_part_1.md', 'narada-purana_part_2.md'],
     'Bhakti, vratas, the Vedangas and a summary of all eighteen Puranas.', 'Part'),
    ('vamana-purana', 'Vamana Purana', 'वामनपुराणम्', ['vamana-purana_adhyayas_1-69.md'], 'Vishnu\'s Vamana avatar and the Kurukshetra tirthas.', None),
    ('skanda-purana', 'Skanda Purana (Adhyayas 1–31)', 'स्कन्दपुराणम्', ['skandapurana_adhyayas_1_-_3114.md'], 'The oldest layer of the Skanda Purana: Shiva, Parvati and the birth of Skanda.', None),
    ('narasimha-purana', 'Narasimha Purana (Upapurana)', 'नरसिंहपुराणम्', ['narasimha-purana_plain_text_version.md'], 'Vishnu as Narasimha and the story of Prahlada.', None),
    ('devi-gita', 'Devi Gita (Devi Bhagavata 7.31–40)', 'देवीगीता', ['devigita.md'], 'The Goddess teaches Himalaya: the Shakta counterpart of the Bhagavad Gita.', None),
]


def puranas(et):
    base = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/3_purana')
    books = bhagavata(et)
    write_text({'code': 'bhagavata-purana', 'name': 'Shrimad Bhagavata Purana', 'nameDev': 'श्रीमद्भागवतपुराणम्', 'cat': 'purana',
                'desc': 'Shuka tells Parikshit the glory of Vishnu: 12 skandhas, about 18,000 verses. Skandha 10 is the life of Shri Krishna.',
                'unit': 'adhyaya', 'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'}, books)
    for code, name, dev, files, desc, part in PURANAS:
        paths = [os.path.join(base, f) for f in files if os.path.exists(os.path.join(base, f))]
        if not paths:
            continue
        ch = gretil_markers(paths)
        lab = (lambda b, part=part: f'{part} {b}') if part else 'Adhyayas · अध्याय'
        write_text({'code': code, 'name': name, 'nameDev': dev, 'cat': 'purana', 'desc': desc, 'unit': 'adhyaya',
                    'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'},
                   by_book(ch, lab) if part else [('1', 'Adhyayas · अध्याय', ch)])
    p = os.path.join(base, 'agni-purana.md')
    if os.path.exists(p):
        write_text({'code': 'agni-purana', 'name': 'Agni Purana', 'nameDev': 'अग्निपुराणम्', 'cat': 'purana',
                    'desc': 'Agni teaches Vasishtha: an encyclopaedia of avatars, temple building, rituals, medicine, poetics and grammar.',
                    'unit': 'adhyaya', 'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'},
                   [('1', 'Adhyayas · अध्याय', gretil_markers([p]))])


UPANISHADS = [
    ('katha-upanishad', 'Katha Upanishad', 'कठोपनिषत्', 'katha-upanisad.md', 'Nachiketa learns from Yama about death and the Self. Six vallis.'),
    ('prashna-upanishad', 'Prashna Upanishad', 'प्रश्नोपनिषत्', 'prasna-upanisad.md', 'Six seekers ask Pippalada six questions about prana and Om.'),
    ('shvetashvatara-upanishad', 'Shvetashvatara Upanishad', 'श्वेताश्वतरोपनिषत्', 'svetasvatara-upanisad.md', 'Brahman as the Lord Rudra-Shiva; yoga and devotion. Six adhyayas.'),
    ('aitareya-upanishad', 'Aitareya Upanishad', 'ऐतरेयोपनिषत्', 'aitareya-upanisad_aitareyopanisad_rv.md', 'Rigvedic Upanishad of creation; "prajnanam brahma".'),
    ('chandogya-upanishad', 'Chandogya Upanishad', 'छान्दोग्योपनिषत्', 'Chandogya-upanisad_Chandogyopanisad_mula-text.md', 'Samavedic Upanishad: Om, Uddalaka and Shvetaketu, "tat tvam asi". Eight prapathakas.'),
    ('brihadaranyaka-upanishad', 'Brihadaranyaka Upanishad', 'बृहदारण्यकोपनिषत्', 'brhadaranyaka-upanisad.md', 'The great forest Upanishad: Yajnavalkya, Maitreyi, Gargi, "aham brahmasmi". Six adhyayas.'),
    ('kaivalya-upanishad', 'Kaivalya Upanishad', 'कैवल्योपनिषत्', 'kaivalya-upanisad.md', 'Brahma teaches Ashvalayana the path to kaivalya (liberation).'),
    ('mandukya-karika', 'Mandukya Karika (Gaudapada)', 'माण्डूक्यकारिका', 'gaudapada_mandukya-upanisadkarika.md', 'Gaudapada\'s verses on the Mandukya Upanishad: the foundation of Advaita. Four prakaranas.'),
]


def upanishads(et):
    base = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/1_veda/4_upa')
    for code, name, dev, f, desc in UPANISHADS:
        p = os.path.join(base, f)
        if not os.path.exists(p):
            continue
        ch = gretil_markers([p])
        write_text({'code': code, 'name': name, 'nameDev': dev, 'cat': 'upanishad', 'desc': desc, 'unit': 'section',
                    'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'},
                   by_book(ch, lambda b: f'Part {b} · भाग {b}' if b else 'Text · पाठ'))


def samaveda(et):
    p = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/1_veda/1_sam/samaveda-samhita.md')
    if not os.path.exists(p):
        return
    chapters = OrderedDict()
    cur = None
    for raw in gretil_body(p).split('\n'):
        line = clean_line(raw)
        m = re.match(r'^([०-९]+) ([०-९]+) ([०-९]+) ([०-९]+)([^\s]*) (.*)$', line)
        if not m or JUNK.search(m.group(6)):
            continue
        part = 'Purvarchika' if num(m.group(1)) == '1' else 'Uttararchika'
        cid = f'{num(m.group(1))}.{num(m.group(2))}.{num(m.group(3))}'
        text = m.group(6)
        mv = re.search(r'॥\s*([०-९]+)\s*$', text)
        verses = chapters.setdefault(cid, [])
        if cur is None or cur[0] != cid:
            cur = [cid, []]
        t2 = re.sub(r'॥\s*[०-९]+\s*$', '॥', text).strip()
        if not re.match(r'^[०-९]+\s*[अ-ह]?\s*$', t2):
            cur[1].append(t2)
        if mv:
            verses.append([num(mv.group(1)), '\n'.join(cur[1])])
            cur = [cid, []]
    books = OrderedDict()
    for cid, vs in chapters.items():
        b = cid.split('.')[0]
        books.setdefault(b, OrderedDict())[cid] = vs
    write_text({'code': 'samaveda', 'name': 'Samaveda Samhita (Kauthuma)', 'nameDev': 'सामवेदसंहिता', 'cat': 'veda',
                'desc': 'The Veda of chants: about 1,875 verses, most also found in the Rigveda, arranged for singing. Purvarchika and Uttararchika.',
                'unit': 'section', 'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'},
               [(b, ('Purvarchika · पूर्वार्चिक' if b == '1' else 'Uttararchika · उत्तरार्चिक'), chs) for b, chs in books.items()])


def yoga_sutra(et):
    p = os.path.join(et, 'mixed/gretil_devanAgarI/1_sanskr/6_sastra/3_phil/yoga/patanjali_yogasutra.md')
    if not os.path.exists(p):
        return
    chapters = gretil_markers([p], skip_dash=True)
    names = {'1': 'Samadhi Pada · समाधिपाद', '2': 'Sadhana Pada · साधनपाद', '3': 'Vibhuti Pada · विभूतिपाद', '4': 'Kaivalya Pada · कैवल्यपाद'}
    write_text({'code': 'yoga-sutra', 'name': 'Yoga Sutra of Patanjali', 'nameDev': 'पातञ्जलयोगसूत्रम्', 'cat': 'darshana',
                'desc': 'The 195 sutras of Yoga Darshana in four padas: "yogash chitta-vritti-nirodhah".',
                'unit': 'pada', 'src': 'GRETIL (Göttingen), Devanagari via sanskrit/raw_etexts', 'lang': 'sa'},
               [(c, names.get(c, c), OrderedDict([(c, v)])) for c, v in chapters.items()])


# ---------------------------------------------------------------- Upavedas (numbered prose/verse, chapters by heading)

ORD = ['प्रथम', 'द्वितीय', 'तृतीय', 'चतुर्थ', 'पञ्चम', 'षष्ठ', 'सप्तम', 'अष्टम', 'नवम', 'दशम']


def numbered_by_heading(paths, heading=r'ध्यायः', reset=True):
    """Text with trailing verse numbers ('… text १२') and chapter headings containing 'अध्यायः'."""
    chapters = OrderedDict()
    for bi, path in enumerate(paths, 1):
        ch_no, pending, last_n = 0, [], 10 ** 9
        body = open(path, encoding='utf-8').read()
        body = re.sub(r'^\+\+\+.*?\+\+\+', '', body, flags=re.S)
        body = re.sub(r'^---.*?---', '', body, flags=re.S)
        for raw in body.split('\n'):
            line = clean_line(raw).strip('*').strip()
            if not line or JUNK.search(line):
                continue
            if re.search(heading, line) and len(line) < 140 and not re.search(r'इति', line[:4]) and re.match(r'^[^\d०-९]*(?:' + '|'.join(ORD) + r'|[०-९]+|एकादश|द्वादश|त्रयोदश|चतुर्दश|पञ्चदश|षोडश|सप्तदश|अष्टादश|नवदश|विंश|त्रिंश|चत्वारिंश|पञ्चाश)', line):
                ch_no += 1
                pending, last_n = [line], 10 ** 9
                continue
            m = re.search(r'(?:^|\s|॥|।)([०-९]+)(?:\s*[-–]\s*[०-९]+)?\s*[।॥]*\s*$', line)
            if m:
                n = int(num(m.group(1)))
                text = line[:m.start(1)].rstrip(' ॥').strip()
                if reset and n < last_n and n <= 2 and ch_no == 0:
                    ch_no = 1
                if ch_no == 0:
                    ch_no = 1
                last_n = n
                body_txt = '\n'.join(pending + ([text] if text else [])).strip()
                pending = []
                if body_txt:
                    cid = f'{bi}.{ch_no}' if len(paths) > 1 else str(ch_no)
                    chapters.setdefault(cid, []).append([str(n), body_txt])
            elif re.match(r'^इति', line):
                pending = []
            else:
                pending.append(line)
    return chapters


def upavedas(et):
    ch_files = sorted(glob.glob(os.path.join(et, 'AyurvedaH/charakaH/Charaka_*.md')))
    sthanas = ['Sutra', 'Nidana', 'Vimana', 'Sharira', 'Indriya', 'Chikitsa', 'Chikitsa', 'Chikitsa', 'Kalpa', 'Siddhi']
    if ch_files:
        ch = numbered_by_heading(ch_files)
        books = OrderedDict()
        for cid, vs in ch.items():
            books.setdefault(cid.split('.')[0], OrderedDict())[cid] = vs
        labels = [os.path.basename(f).replace('Charaka_', '').replace('.md', '').replace('_', ' ') for f in ch_files]
        write_text({'code': 'charaka-samhita', 'name': 'Charaka Samhita (Ayurveda)', 'nameDev': 'चरकसंहिता', 'cat': 'upaveda',
                    'desc': 'The foundational text of Ayurveda (Upaveda of the Rigveda): medicine, diet, daily routine and the healthy life. Eight sthanas.',
                    'unit': 'adhyaya', 'src': 'sanskrit/raw_etexts (AyurvedaH)', 'lang': 'sa'},
                   [(b, labels[int(b) - 1], chs) for b, chs in books.items()])
    su = sorted(glob.glob(os.path.join(et, 'AyurvedaH/sushruta/0*.md')))
    if su:
        ch = numbered_by_heading(su)
        books = OrderedDict()
        for cid, vs in ch.items():
            books.setdefault(cid.split('.')[0], OrderedDict())[cid] = vs
        names = ['Sutra Sthana · सूत्रस्थान', 'Nidana Sthana · निदानस्थान', 'Sharira Sthana · शारीरस्थान', 'Chikitsa Sthana · चिकित्सास्थान', 'Kalpa Sthana · कल्पस्थान', 'Uttara Tantra · उत्तरतन्त्र']
        write_text({'code': 'sushruta-samhita', 'name': 'Sushruta Samhita (Ayurveda)', 'nameDev': 'सुश्रुतसंहिता', 'cat': 'upaveda',
                    'desc': 'Dhanvantari teaches Sushruta: Ayurvedic surgery, anatomy and marma points. Five sthanas and the Uttara Tantra.',
                    'unit': 'adhyaya', 'src': 'sanskrit/raw_etexts (AyurvedaH)', 'lang': 'sa'},
                   [(b, names[int(b) - 1] if int(b) <= len(names) else b, chs) for b, chs in books.items()])
    p = os.path.join(et, 'kalAH/gandharvavedaH/natya_shastra.md')
    if os.path.exists(p):
        write_text({'code': 'natya-shastra', 'name': 'Natya Shastra of Bharata (Gandharvaveda)', 'nameDev': 'नाट्यशास्त्रम्', 'cat': 'upaveda',
                    'desc': 'The "fifth Veda" of drama, dance and music (Gandharvaveda, Upaveda of the Samaveda): rasa, abhinaya, the stage.',
                    'unit': 'adhyaya', 'src': 'Kavyamala edition, via sanskrit/raw_etexts', 'lang': 'sa'},
                   [('1', 'Adhyayas · अध्याय', numbered_by_heading([p]))])
    p = os.path.join(et, 'kalAH/dhanurvedaH/vasishtha_dhanur_veda.md')
    if os.path.exists(p):
        ch = numbered_by_heading([p], heading=r'^$')
        write_text({'code': 'dhanurveda', 'name': 'Dhanurveda Samhita of Vasishtha', 'nameDev': 'धनुर्वेदसंहिता', 'cat': 'upaveda',
                    'desc': 'Archery and the martial arts (Dhanurveda, Upaveda of the Yajurveda), as Vasishtha taught Vishvamitra.',
                    'unit': 'section', 'src': 'sanskrit/raw_etexts (kalAH)', 'lang': 'sa'}, [('1', 'Verses · श्लोक', ch)])
    p = os.path.join(et, 'mixed/ebhAratI-sampat/dharmashAstram/arthashAstram/kauTilyaH/arthashAstram.md')
    if os.path.exists(p):
        chapters = OrderedDict()
        last = None
        for raw in open(p, encoding='utf-8').read().split('\n'):
            m = re.match(r'^\s*\{[^z]*z(\d+)\.(\d+)\.(\d+)([a-z]*)/\}\s*(.*)$', raw)
            if not m:
                continue
            text = re.sub(r'(\s*॥)+\s*$', ' ॥', clean_line(m.group(5)).replace('..', '॥')).strip()
            if not text:
                continue
            cid, vs = f'{int(m.group(1))}.{int(m.group(2))}', str(int(m.group(3)))
            verses = chapters.setdefault(cid, [])
            if last == (cid, vs) and verses:
                verses[-1][1] += '\n' + text
            else:
                verses.append([vs, text])
            last = (cid, vs)
        books = OrderedDict()
        for cid, vs in chapters.items():
            books.setdefault(cid.split('.')[0], OrderedDict())[cid] = vs
        write_text({'code': 'arthashastra', 'name': 'Kautilya Arthashastra (Arthaveda)', 'nameDev': 'कौटिलीयम् अर्थशास्त्रम्', 'cat': 'upaveda',
                    'desc': 'Statecraft, economics, law and diplomacy (Arthaveda, the Upaveda of the Atharvaveda in some lists). 15 adhikaranas.',
                    'unit': 'adhyaya', 'src': 'Kangle edition, via sanskrit/raw_etexts', 'lang': 'sa'},
                   [(b, f'Adhikarana {int(b)} · अधिकरण {b}', chs) for b, chs in books.items()])


# ---------------------------------------------------------------- catalog

CATEGORIES = [
    ('veda', 'Vedas · वेद', 'The four Samhitas, the root of Sanatana Dharma (Shruti).'),
    ('upanishad', 'Upanishads · उपनिषद्', 'Vedanta, the knowledge portion of the Vedas.'),
    ('upaveda', 'Upavedas · उपवेद', 'Ayurveda, Dhanurveda, Gandharvaveda and Arthaveda: the applied sciences attached to the Vedas.'),
    ('itihasa', 'Itihasa · इतिहास', 'The two epics: Mahabharata and Ramayana.'),
    ('purana', 'Puranas · पुराण', 'Sacred histories of creation, the avatars, dynasties and dharma.'),
    ('darshana', 'Darshanas · दर्शन', 'The schools of Indian philosophy.'),
    ('bhakti', 'Bhakti · भक्ति साहित्य', 'Devotional classics.'),
]

# Listed in the catalog so readers see the whole tradition; marked as not yet in the library.
NOT_YET = [
    ('krishna-yajurveda', 'Krishna Yajurveda (Taittiriya Samhita)', 'कृष्णयजुर्वेद', 'veda'),
    ('kena-upanishad', 'Kena Upanishad', 'केनोपनिषत्', 'upanishad'), ('mundaka-upanishad', 'Mundaka Upanishad', 'मुण्डकोपनिषत्', 'upanishad'),
    ('taittiriya-upanishad', 'Taittiriya Upanishad', 'तैत्तिरीयोपनिषत्', 'upanishad'),
    ('sthapatya-veda', 'Sthapatya Veda (Vastu / architecture)', 'स्थापत्यवेद', 'upaveda'),
    ('padma-purana', 'Padma Purana', 'पद्मपुराणम्', 'purana'), ('vayu-purana', 'Vayu Purana', 'वायुपुराणम्', 'purana'),
    ('brahmavaivarta-purana', 'Brahmavaivarta Purana', 'ब्रह्मवैवर्तपुराणम्', 'purana'), ('varaha-purana', 'Varaha Purana', 'वराहपुराणम्', 'purana'),
    ('bhavishya-purana', 'Bhavishya Purana', 'भविष्यपुराणम्', 'purana'),
    ('brahma-sutra', 'Brahma Sutra (Vedanta)', 'ब्रह्मसूत्रम्', 'darshana'),
]


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--dharmic', required=True)
    ap.add_argument('--etexts', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    OUT = a.out
    os.makedirs(OUT, exist_ok=True)
    steps = [('Vedas', lambda: (vedas_dharmic(a.dharmic), samaveda(a.etexts))),
             ('Upanishads', lambda: upanishads(a.etexts)),
             ('Itihasa', lambda: (mahabharata(a.dharmic), valmiki_critical(a.etexts) or valmiki(a.dharmic))),
             ('Puranas', lambda: puranas(a.etexts)),
             ('Upavedas', lambda: upavedas(a.etexts)),
             ('Darshana & Bhakti', lambda: (yoga_sutra(a.etexts), ramcharitmanas(a.dharmic)))]
    for name, fn in steps:
        print(name)
        try:
            fn()
        except Exception as e:  # one broken source must not take the whole library down
            print(f'  !! {name} failed: {e!r}', file=sys.stderr)
    have = {s['code'] for s in STATS}
    catalog = {
        'categories': [{'id': c, 'name': n, 'desc': d} for c, n, d in CATEGORIES],
        'texts': STATS + [{'code': c, 'name': n, 'nameDev': dv, 'cat': cat, 'soon': True} for c, n, dv, cat in NOT_YET if c not in have],
    }
    with open(os.path.join(OUT, 'catalog.json'), 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
    print(f'Done: {len(STATS)} texts, {sum(s["verses"] for s in STATS)} verses -> {OUT}')


if __name__ == '__main__':
    main()
