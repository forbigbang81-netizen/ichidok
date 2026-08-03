#!/usr/bin/env python3
"""
Audit all GDrivePlayer slugs in seed.ts — v2 with proper block tracking.

Strategy:
  - Walk through seed.ts line by line.
  - When we see a top-level `{ malId: N, title: "..."` (indented with 2 spaces),
    start a new anime context.
  - When we see `], hasSub` or `], hasDub` or just `],` at 4-space indent,
    we're at the end of episodeSources.
  - When we see `  },` at 2-space indent, the anime block has ended.
  - Record gdriveplayer sources only within the current anime block.
"""

import json
import re
from pathlib import Path
from collections import Counter

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")

# Top-level anime definition: starts with "  { malId:"
anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')
# Anime block end: "  }," at 2-space indent
anime_end_re = re.compile(r'^  \},\s*$')
# GDrivePlayer source line
gdrive_re = re.compile(
    r'collection:\s*"gdriveplayer",\s*'
    r'audio:\s*"(sub|dub)",\s*'
    r'sourceType:\s*"gdriveplayer_embed",\s*'
    r'fileTemplate:\s*"([^"]+)"'
)

records = []
current = None

for line in text.splitlines():
    # Check for anime block start
    m = anime_start_re.match(line)
    if m:
        current = {"malId": int(m.group(1)), "title": m.group(2)}
        continue
    # Check for anime block end
    if anime_end_re.match(line):
        current = None
        continue
    # If we're inside an anime block, look for gdriveplayer sources
    if current:
        for m in gdrive_re.finditer(line):
            records.append({
                "malId": current["malId"],
                "title": current["title"],
                "audio": m.group(1),
                "slug": m.group(2),
            })

print(f"Found {len(records)} GDrivePlayer sources across {len(set(r['malId'] for r in records))} anime.")

# Now check slug patterns
def title_to_slug(title: str) -> str:
    """Convert a title to its expected slug form."""
    # Strip punctuation that wouldn't be in a URL slug
    # Common transformations:
    #   - Apostrophes are REMOVED (not replaced with hyphen)
    #   - Semicolons are REMOVED
    #   - Colons become hyphens
    #   - Other non-alphanumeric become hyphens
    #   - Multiple hyphens collapsed
    s = title.lower()
    # Remove apostrophes and semicolons entirely
    s = s.replace("'", "").replace(";", "").replace("!", "").replace("?", "")
    s = s.replace(":", "-").replace("/", "-")
    # Replace any remaining non-alphanumeric with hyphen
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    # Collapse multiple hyphens
    s = re.sub(r'-+', '-', s)
    return s

audit = []
for r in records:
    expected_base = title_to_slug(r["title"])
    expected_dub = expected_base + "-dub"
    expected_sub = expected_base
    
    actual = r["slug"]
    
    if r["audio"] == "dub":
        expected = expected_dub
    else:
        expected = expected_sub
    
    # Check various match qualities
    if actual == expected:
        status = "ok_exact"
    elif actual == expected.replace("--", "-"):
        # Double-hyphen variant (e.g., from "Title: Subtitle" → "title--subtitle" vs "title-subtitle")
        status = "ok_double_hyphen"
    elif actual == expected_base + ("-dub" if r["audio"] == "dub" else ""):
        status = "ok_exact"
    else:
        # Loose match: does the slug contain the title slug?
        if expected_base in actual:
            status = "ok_loose"
        else:
            status = "manual_review"
    
    audit.append({
        **r,
        "expected": expected,
        "expected_base": expected_base,
        "status": status,
    })

status_counts = Counter(a["status"] for a in audit)
print(f"\nSlug pattern audit:")
for s, n in status_counts.most_common():
    print(f"  {s}: {n}")

# Show manual_review cases
manual = [a for a in audit if a["status"] == "manual_review"]
print(f"\n{'='*60}")
print(f"Manual review needed: {len(manual)} slugs")
print(f"{'='*60}")
for a in manual[:40]:
    print(f"  malId={a['malId']:>6}  audio={a['audio']}  title={a['title'][:50]!r}")
    print(f"    expected: {a['expected']}")
    print(f"    actual:   {a['slug']}")

# Save full report
out = Path("/home/z/my-project/download/gdriveplayer_slug_audit.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({
    "total_sources": len(records),
    "total_anime": len(set(r["malId"] for r in records)),
    "status_counts": dict(status_counts),
    "manual_review_count": len(manual),
    "manual_review": manual,
    "all_records": audit,
}, indent=2))
print(f"\nFull report: {out}")
