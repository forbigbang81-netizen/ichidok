#!/usr/bin/env python3
"""
Remove remaining archive.org sources that span multiple lines.
These have the pattern:
  {
    startEp: N, endEp: M, collection: "archive-name", ...
    episodeFiles: { ... }
  },
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)
orig_count = len(lines)

KEEP_COLLECTIONS = {"gdriveplayer", "youtube", "dropbox", "external"}

# Find blocks that start with `{` alone on a line (multi-line source definitions)
# and check if their collection is archive.org
block_start_re = re.compile(r'^\s*\{\s*$')
collection_re = re.compile(r'collection:\s*"([^"]+)"')
block_end_re = re.compile(r'^\s*\}\s*,?\s*$')
comment_re = re.compile(r'^\s*//')

lines_to_remove = set()
i = 0
removed_blocks = 0

while i < len(lines):
    # Check for multi-line block start: `{` alone on a line
    if block_start_re.match(lines[i]):
        # Look ahead to find the collection name within this block
        block_end = None
        collection_name = None
        for j in range(i + 1, min(i + 50, len(lines))):
            m = collection_re.search(lines[j])
            if m:
                collection_name = m.group(1)
            if block_end_re.match(lines[j]):
                block_end = j
                break
        
        if collection_name and collection_name not in KEEP_COLLECTIONS and block_end:
            # This is an archive.org multi-line block — mark for removal
            # Also mark preceding comment lines
            start = i
            while start > 0 and comment_re.match(lines[start - 1]):
                start -= 1
            for k in range(start, block_end + 1):
                lines_to_remove.add(k)
            removed_blocks += 1
            i = block_end + 1
            continue
    i += 1

print(f"Removing {removed_blocks} multi-line archive.org blocks ({len(lines_to_remove)} lines).")

# Also check for single-line sources that were missed
# (where collection is on the same line but the regex in the previous script didn't match)
source_re = re.compile(r'\{\s*startEp:\s*\d+,\s*endEp:\s*\d+,\s*collection:\s*"([^"]+)"')
for i, line in enumerate(lines):
    if i in lines_to_remove:
        continue
    m = source_re.search(line)
    if m and m.group(1) not in KEEP_COLLECTIONS:
        # Mark this line and preceding comment
        lines_to_remove.add(i)
        if i > 0 and comment_re.match(lines[i - 1]):
            lines_to_remove.add(i - 1)
        # Check if episodeFiles spans multiple lines
        if 'episodeFiles' in line and '}}' not in line:
            j = i + 1
            while j < len(lines):
                lines_to_remove.add(j)
                if re.search(r'\}\s*\}\s*,?\s*$', lines[j]):
                    break
                j += 1

new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
new_text = "".join(new_lines)
SEED.write_text(new_text, encoding="utf-8")

new_count = len(new_text.splitlines())
print(f"File: {orig_count} -> {new_count} lines (removed {orig_count - new_count} lines)")

# Verify
remaining_archive = 0
for m in re.finditer(r'collection:\s*"([^"]+)"', new_text):
    if m.group(1) not in KEEP_COLLECTIONS:
        remaining_archive += 1
        print(f"  Still remaining: {m.group(1)}")

print(f"\nRemaining archive.org sources: {remaining_archive}")
