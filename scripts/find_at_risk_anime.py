#!/usr/bin/env python3
"""
Find anime that have ONLY archive.org sources (no GDrivePlayer).
These are at risk of having no playback if we remove archive.org sources.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")

# Parse anime blocks properly
anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')
anime_end_re = re.compile(r'^  \},\s*$')

# Find all source collections within each anime block
source_re = re.compile(r'collection:\s*"([^"]+)"')

KEEP_COLLECTIONS = {"gdriveplayer", "youtube", "dropbox", "external"}

current = None
current_sources = []

at_risk = []
all_anime = []

for i, line in enumerate(text.splitlines(), 1):
    m = anime_start_re.match(line)
    if m:
        current = {"malId": int(m.group(1)), "title": m.group(2), "start_line": i}
        current_sources = []
        continue
    if anime_end_re.match(line) and current:
        # End of anime block
        has_gdrive = any(c == "gdriveplayer" for c in current_sources)
        has_archive = any(c not in KEEP_COLLECTIONS for c in current_sources)
        all_anime.append({**current, "sources": current_sources, "has_gdrive": has_gdrive, "has_archive": has_archive})
        if not has_gdrive and has_archive:
            at_risk.append({**current, "sources": current_sources})
        current = None
        current_sources = []
        continue
    if current:
        for m in source_re.finditer(line):
            current_sources.append(m.group(1))

print(f"Total anime with episode sources: {len(all_anime)}")
print(f"Anime with GDrivePlayer: {sum(1 for a in all_anime if a['has_gdrive'])}")
print(f"Anime with archive.org: {sum(1 for a in all_anime if a['has_archive'])}")
print(f"Anime with ONLY archive (no GDrivePlayer): {len(at_risk)}")
print()

if at_risk:
    print("=== At-risk anime (would lose ALL sources if archive removed) ===")
    for a in at_risk[:30]:
        print(f"  L{a['start_line']}: malId={a['malId']}  {a['title'][:50]}")
        print(f"    sources: {a['sources'][:5]}")
