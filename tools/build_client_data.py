#!/usr/bin/env python3
"""
Copies the server's content into the web app so the website and Android app work offline:
  src/VedicPandit.WebAPI/SeedData/mantras.json          -> vedic-pandit-client/src/app/core/data/mantras.json
  src/VedicPandit.WebAPI/SeedData/scriptures/*.json     -> vedic-pandit-client/src/app/core/data/scriptures.json (merged)
Merging follows the server's rule (JsonContentStore): files in name order, same scripture code is merged verse by verse,
non-empty fields from later files win, keywords are combined.
Run after changing SeedData:  python3 tools/build_client_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "src/VedicPandit.WebAPI/SeedData"
OUT = ROOT / "vedic-pandit-client/src/app/core/data"

by_code = {}
for f in sorted((SEED / "scriptures").glob("*.json")):
    for s in json.loads(f.read_text(encoding="utf-8")):
        cur = by_code.get(s["code"])
        if cur is None:
            by_code[s["code"]] = s
            continue
        for k in ("name", "nameDevanagari", "category", "description", "translationCredit"):
            if s.get(k): cur[k] = s[k]
        idx = {(v["chapter"], v["verse"]): v for v in cur["verses"]}
        for v in s["verses"]:
            ev = idx.get((v["chapter"], v["verse"]))
            if ev is None:
                cur["verses"].append(v); idx[(v["chapter"], v["verse"])] = v; continue
            for k in ("sanskrit", "translationEn", "translationHi"):
                if v.get(k): ev[k] = v[k]
            ev["keywords"] = " ".join(x for x in dict.fromkeys([ev.get("keywords", ""), v.get("keywords", "")]) if x)

def vkey(v):
    d = "".join(c for c in v["verse"] if c.isdigit())
    return (v["chapter"], int(d) if d and v["verse"][:1].isdigit() else 10**6, v["verse"])

out = []
for s in by_code.values():
    s["verses"] = sorted(s["verses"], key=vkey)
    out.append(s)
(OUT / "scriptures.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(OUT / "mantras.json").write_text((SEED / "mantras.json").read_text(encoding="utf-8"), encoding="utf-8")
print("Wrote", OUT / "scriptures.json", [(s["code"], len(s["verses"])) for s in out])
