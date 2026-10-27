#!/usr/bin/env python3
"""Connects recorded chants to the mantra library.

Put recordings in vedic-pandit-client/public/audio/ named after the mantra's slug, e.g.
    public/audio/gayatri.mp3, public/audio/hanuman-chalisa.mp3, public/audio/durga-chalisa.m4a
then run
    python3 tools/link_audio.py "Voice: Pt. <Guru ji's name> (recorded with his permission)"
and   python3 tools/build_client_data.py

Every mantra with a matching file gets audioUrl "audio/<file>" and the credit line; the player then plays the
recording instead of the phone's voice and lights up each word as it goes. Slugs are listed on the Mantra page URLs
(…/#/mantra/<slug>) and in SeedData/mantras*.json.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'vedic-pandit-client' / 'public' / 'audio'
SEED = ROOT / 'src' / 'VedicPandit.WebAPI' / 'SeedData'

credit = sys.argv[1] if len(sys.argv) > 1 else ''
files = {p.stem: p.name for p in AUDIO.glob('*') if p.suffix.lower() in ('.mp3', '.m4a', '.ogg', '.opus', '.wav')} if AUDIO.exists() else {}
linked = 0
for f in [SEED / 'mantras.json', *sorted((SEED / 'mantras').glob('*.json'))]:
    data = json.loads(f.read_text(encoding='utf-8'))
    for m in data:
        if m['slug'] in files:
            m['audioUrl'] = 'audio/' + files[m['slug']]
            if credit: m['audioCredit'] = credit
            linked += 1
    f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{linked} mantras linked to recordings in {AUDIO}')
unknown = sorted(set(files) - {m['slug'] for f in [SEED / 'mantras.json', *(SEED / 'mantras').glob('*.json')] for m in json.loads(f.read_text(encoding='utf-8'))})
if unknown: print('No mantra with these names (check the slug):', ', '.join(unknown))
