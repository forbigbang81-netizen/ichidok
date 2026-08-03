#!/usr/bin/env python3
"""
Remove spurious gdriveplayer sources that were accidentally pasted into
the Akame ga Kill anime block (lines 664-731 of seed.ts).

These sources point to OTHER anime (One Piece, Naruto, Death Note, etc.)
and would cause Akame ga Kill to play the wrong show.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
orig_len = len(text.splitlines())

# The spurious block starts after the legit akame-ga-kill-dub source (line 663)
# and ends before the archive.org sub source (line 732).
# We need to remove lines 664-731 (the "GDRIVEPLAYER embed" comments + their
# source lines for one-piece, naruto, death-note, etc.)
#
# Pattern to match: a comment line + source line for any slug that's NOT
# "akame-ga-kill" or "akame-ga-kill-dub", appearing INSIDE the Akame block.
#
# Safe approach: remove any gdriveplayer source line (and its preceding comment)
# where the slug is not "akame-ga-kill*" — but ONLY within the Akame block
# (between line 617 and line 735).

lines = text.splitlines(keepends=True)

# Find the Akame block boundaries
akame_start = None
akame_end = None
for i, line in enumerate(lines):
    if re.match(r'^  \{\s*malId:\s*22199,', line):
        akame_start = i
    elif akame_start is not None and re.match(r'^  \},\s*$', line):
        akame_end = i
        break

if akame_start is None or akame_end is None:
    print("ERROR: Could not find Akame ga Kill block boundaries.")
    exit(1)

print(f"Akame block: lines {akame_start+1} to {akame_end+1}")

# Within the Akame block, identify lines to remove.
# A spurious source is a line containing 'collection: "gdriveplayer"' with a
# fileTemplate that is NOT "akame-ga-kill" or "akame-ga-kill-dub".
# We also remove the comment line immediately preceding it.

lines_to_remove = set()
for i in range(akame_start, akame_end + 1):
    line = lines[i]
    m = re.search(r'collection:\s*"gdriveplayer".*fileTemplate:\s*"([^"]+)"', line)
    if m:
        slug = m.group(1)
        if slug not in ("akame-ga-kill", "akame-ga-kill-dub"):
            # Mark this line for removal
            lines_to_remove.add(i)
            # Also mark the preceding comment line (if it's a // comment)
            if i > 0 and lines[i - 1].strip().startswith("//"):
                lines_to_remove.add(i - 1)

print(f"Removing {len(lines_to_remove)} spurious lines from Akame block.")

# Show what we're removing
for i in sorted(lines_to_remove):
    print(f"  L{i+1}: {lines[i].rstrip()[:100]}")

# Rebuild the file without the spurious lines
new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
new_text = "".join(new_lines)
SEED.write_text(new_text, encoding="utf-8")

new_len = len(new_text.splitlines())
print(f"\nFile: {orig_len} -> {new_len} lines (removed {orig_len - new_len} lines)")
