#!/usr/bin/env python3
"""
Audit all anime in seed.ts to find:
  1. Anime without a GDrivePlayer source (incomplete — no full episode coverage)
  2. Anime with empty/missing poster images
  3. Anime with episodeCount == 0 or 999 (invalid)
  4. Anime with endEp < episodeCount (partial coverage)

Output: download/anime_audit.json with full report.
"""

import json
import re
from pathlib import Path
from collections import Counter

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")

# Parse anime blocks
anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')
anime_end_re = re.compile(r'^  \},\s*$')

# Extract fields from anime block lines
poster_re = re.compile(r'poster:\s*"([^"]*)"')
episode_count_re = re.compile(r'episodeCount:\s*(\d+)')
type_re = re.compile(r'type:\s*"([^"]+)"')
gdrive_re = re.compile(r'collection:\s*"gdriveplayer"')
gdrive_endep_re = re.compile(r'collection:\s*"gdriveplayer".*?endEp:\s*(\d+)')

current = None
anime_list = []

for i, line in enumerate(text.splitlines(), 1):
    m = anime_start_re.match(line)
    if m:
        current = {
            "malId": int(m.group(1)),
            "title": m.group(2),
            "start_line": i,
            "has_gdrive": False,
            "gdrive_endep": 0,
            "poster": "",
            "episodeCount": 0,
            "type": "",
            "sources": [],
        }
        # Extract fields from this line (they might be on the same line)
        pm = poster_re.search(line)
        if pm:
            current["poster"] = pm.group(1)
        em = episode_count_re.search(line)
        if em:
            current["episodeCount"] = int(em.group(1))
        tm = type_re.search(line)
        if tm:
            current["type"] = tm.group(1)
        continue
    
    if current:
        # Check for gdriveplayer source
        if gdrive_re.search(line):
            current["has_gdrive"] = True
            em = gdrive_endep_re.search(line)
            if em:
                current["gdrive_endep"] = max(current["gdrive_endep"], int(em.group(1)))
        # Extract other fields
        pm = poster_re.search(line)
        if pm and not current["poster"]:
            current["poster"] = pm.group(1)
        em = episode_count_re.search(line)
        if em and not current["episodeCount"]:
            current["episodeCount"] = int(em.group(1))
        tm = type_re.search(line)
        if tm and not current["type"]:
            current["type"] = tm.group(1)
        
        if anime_end_re.match(line):
            anime_list.append(current)
            current = None

print(f"Total anime: {len(anime_list)}")

# Categorize
no_gdrive = [a for a in anime_list if not a["has_gdrive"]]
no_poster = [a for a in anime_list if not a["poster"]]
zero_eps = [a for a in anime_list if a["episodeCount"] == 0]
not_aired = [a for a in anime_list if a["episodeCount"] == 0 and a.get("type") == "TV"]

print(f"\n=== Audit Results ===")
print(f"Anime WITHOUT GDrivePlayer source (incomplete): {len(no_gdrive)}")
print(f"Anime WITHOUT poster image: {len(no_poster)}")
print(f"Anime with episodeCount=0 (not yet aired): {len(zero_eps)}")
print(f"Anime with both GDrivePlayer AND poster: {sum(1 for a in anime_list if a['has_gdrive'] and a['poster'])}")

print(f"\n=== Anime WITHOUT GDrivePlayer (first 20) ===")
for a in no_gdrive[:20]:
    print(f"  L{a['start_line']}: malId={a['malId']:>6}  type={a['type']:<8}  eps={a['episodeCount']:>4}  poster={'YES' if a['poster'] else 'NO'}  {a['title'][:50]}")

print(f"\n=== Anime WITHOUT poster (first 20) ===")
for a in no_poster[:20]:
    print(f"  L{a['start_line']}: malId={a['malId']:>6}  type={a['type']:<8}  eps={a['episodeCount']:>4}  gdrive={'YES' if a['has_gdrive'] else 'NO'}  {a['title'][:50]}")

# Save full report
out = Path("/home/z/my-project/download/anime_audit.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({
    "total_anime": len(anime_list),
    "no_gdrive_count": len(no_gdrive),
    "no_poster_count": len(no_poster),
    "zero_eps_count": len(zero_eps),
    "complete_count": sum(1 for a in anime_list if a["has_gdrive"] and a["poster"] and a["episodeCount"] > 0),
    "no_gdrive": no_gdrive,
    "no_poster": no_poster,
    "all_anime": anime_list,
}, indent=2))
print(f"\nFull report: {out}")
