#!/usr/bin/env python3
"""
Find and fix anime blocks where the episodeSources array closing `],`
was accidentally removed by the archive removal script.

Pattern to find:
  episodeSources: [
    { ... gdriveplayer source ... },
    { ... gdriveplayer source ... },
  // Next anime block starts here WITHOUT a `],` closing

Fix: Insert `    ], hasSub: ..., hasDub: ...,` before the next anime block start.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')

# Find all anime block starts
anime_starts = []
for i, line in enumerate(lines):
    m = anime_start_re.match(line)
    if m:
        anime_starts.append({"line": i, "malId": int(m.group(1)), "title": m.group(2)})

print(f"Found {len(anime_starts)} anime blocks.")

# For each anime block, check if the PREVIOUS line is a proper closing
# (either `],` for episodeSources, or `},` for the anime block itself)
# If the previous anime block has `episodeSources: [` but no matching `],`,
# we need to insert one.

# Walk through and find where episodeSources opens but doesn't close before
# the next anime block starts.

fixes = []
in_ep_sources = False
ep_sources_line = None
current_anime = None

for i, line in enumerate(lines):
    m = anime_start_re.match(line)
    if m:
        # Check if previous block had unclosed episodeSources
        if in_ep_sources:
            fixes.append({
                "insert_before": i,
                "anime_before": current_anime,
                "ep_sources_line": ep_sources_line,
            })
            in_ep_sources = False
        current_anime = {"malId": int(m.group(1)), "title": m.group(2), "line": i}
    
    if 'episodeSources:' in line and '[' in line and ']' not in line.split('episodeSources')[1]:
        in_ep_sources = True
        ep_sources_line = i
    elif in_ep_sources:
        # Check if this line closes the episodeSources array
        if re.match(r'^\s{4}\],', line) or '], hasSub' in line or '], hasDub' in line:
            in_ep_sources = False

print(f"Found {len(fixes)} blocks with missing `],` closing for episodeSources:")
for f in fixes:
    print(f"  Insert ], before L{f['insert_before']+1} (after anime malId={f['anime_before']['malId']} at L{f['anime_before']['line']+1})")

# Insert the missing `],` closings
# Process in reverse order so line numbers don't shift
for f in reversed(fixes):
    # Determine what to insert: `    ], hasSub: true, hasDub: true,` or just `    ],`
    # Look at the source lines to see if hasSub/hasDub were mentioned
    insert_line = "    ], hasSub: true, hasDub: true,\n"
    lines.insert(f["insert_before"], insert_line)

new_text = "".join(lines)
SEED.write_text(new_text, encoding="utf-8")
print(f"\nInserted {len(fixes)} missing `],` closings.")
print(f"File: {len(text.splitlines())} -> {len(new_text.splitlines())} lines")
