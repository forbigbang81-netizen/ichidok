#!/usr/bin/env python3
"""
Fix the seed.ts file properly.

The archive removal script broke many anime blocks by removing:
1. The archive.org source lines (correct)
2. The `],` closing of episodeSources (incorrect — got caught up in removal)
3. The `},` closing of the anime block (incorrect — got caught up in removal)

This script:
1. Reverts the broken state by reading the current file
2. For each anime block that has `episodeSources: [` but no matching `],`,
   inserts `    ], hasSub: true, hasDub: true,` before the block ends
3. For each anime block missing its closing `  },`, inserts it

Strategy: walk through the file tracking the structure.
When we see `episodeSources: [`, we're inside the array.
When we see the NEXT `// Comment` or `{ malId:` that starts a new block,
we know the previous block wasn't properly closed.

We need to insert:
  `    ], hasSub: true, hasDub: true,\n  },\n` before the new block starts.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

# First, undo the bad `],` insertions from the previous script.
# Those insertions put `    ], hasSub: true, hasDub: true,` on its own line
# right before a `// Comment` line or `{ malId:` line, but they're in the
# wrong position (after the comment instead of before it, and missing `},`).
#
# Strategy: find lines that are EXACTLY `    ], hasSub: true, hasDub: true,\n`
# and check if the next line is a comment or `{ malId:`. If so, this is a
# bad insertion — remove it and we'll re-insert properly later.

bad_insertion_re = re.compile(r'^    \], hasSub: true, hasDub: true,\s*$')
anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),')
comment_re = re.compile(r'^  //')

# Remove bad insertions
removed = 0
new_lines = []
for i, line in enumerate(lines):
    if bad_insertion_re.match(line):
        # Check if next line is a comment or anime start
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            if comment_re.match(next_line) or anime_start_re.match(next_line):
                # This is a bad insertion — skip it
                removed += 1
                continue
    new_lines.append(line)

print(f"Removed {removed} bad `],` insertions.")
lines = new_lines

# Now walk through and find blocks that need `],` + `},` inserted.
# A block needs fixing if:
#   - It has `episodeSources: [` (opened the array)
#   - The next thing is a comment or `{ malId:` (new block) WITHOUT a `],` and `},`

fixes = []
in_ep_sources = False
ep_open_line = None
last_source_line = None

for i, line in enumerate(lines):
    # Detect episodeSources opening
    if 'episodeSources:' in line and '[' in line:
        # Check if it's opened and closed on the same line
        after = line.split('episodeSources')[1]
        if '[' in after and ']' in after:
            in_ep_sources = False
        else:
            in_ep_sources = True
            ep_open_line = i
        continue
    
    if in_ep_sources:
        # Check if this line closes the array
        if re.match(r'^\s{4}\],', line) or '], hasSub' in line or '], hasDub' in line:
            in_ep_sources = False
            continue
        
        # Track the last source line (a line with startEp)
        if 'startEp' in line:
            last_source_line = i
        
        # Check if this line starts a new anime block or comment for a new block
        # WITHOUT closing episodeSources first
        if anime_start_re.match(line) or (comment_re.match(line) and i + 1 < len(lines) and anime_start_re.match(lines[i + 1])):
            # The episodeSources array wasn't closed!
            # We need to insert `    ], hasSub: true, hasDub: true,` and `  },`
            # before this line (or before the comment, if it's a comment)
            insert_before = i
            # If this is a comment, insert before the comment
            if comment_re.match(line):
                # Walk back to find the start of comments
                while insert_before > 0 and comment_re.match(lines[insert_before - 1]):
                    insert_before -= 1
            
            fixes.append({
                "insert_before": insert_before,
                "ep_open_line": ep_open_line,
                "last_source_line": last_source_line,
            })
            in_ep_sources = False

print(f"Found {len(fixes)} blocks needing `],` + `}},` insertion:")
for f in fixes:
    print(f"  Insert before L{f['insert_before']+1} (ep_sources opened at L{f['ep_open_line']+1})")

# Insert in reverse order
for f in reversed(fixes):
    lines.insert(f["insert_before"], "  },\n")
    lines.insert(f["insert_before"], "    ], hasSub: true, hasDub: true,\n")

new_text = "".join(lines)
SEED.write_text(new_text, encoding="utf-8")
print(f"\nFile: {len(text.splitlines())} -> {len(new_text.splitlines())} lines")
