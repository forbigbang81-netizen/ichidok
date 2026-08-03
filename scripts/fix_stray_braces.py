#!/usr/bin/env python3
"""
Fix syntax errors introduced by the archive removal script.
Specifically: stray `},` lines that were left behind when multi-line
source blocks were removed but their closing brace wasn't caught.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

# Pattern: a line that is ONLY `      },` (6 spaces + },) appearing
# immediately after another source line. This is a stray closing brace
# from a removed multi-line block.
#
# Strategy: find sequences where we have:
#   { startEp: ... gdriveplayer ... },      <- legit source line ending with },
#   },                                        <- STRAY - remove this
# And remove the stray }, line.

stray_brace_re = re.compile(r'^\s+\}\s*,?\s*$')

lines_to_remove = set()
for i in range(1, len(lines)):
    # Check if current line is a stray `    },`
    if not stray_brace_re.match(lines[i]):
        continue
    # Check if previous line is also a closing (source line ending with `},` or `} },`)
    prev = lines[i - 1].rstrip()
    if not prev:
        continue
    # If previous line ends with `},` or `} },` AND contains `startEp` or `fileTemplate`
    # then this is likely a stray closing brace from a removed multi-line block
    if ('startEp' in prev or 'fileTemplate' in prev) and (prev.endswith('},') or prev.endswith('} },')):
        # But only if the previous line's source is a SINGLE-line source (ends with `},`)
        # Multi-line sources would end with `} },` for episodeFiles
        # Check indentation: stray braces from removed blocks are at 6-space indent
        if re.match(r'^      \},\s*$', lines[i]):
            lines_to_remove.add(i)
            print(f"  L{i+1}: removing stray `      }},` after: {prev[:80]}")

print(f"\nRemoving {len(lines_to_remove)} stray closing braces.")

new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
new_text = "".join(new_lines)
SEED.write_text(new_text, encoding="utf-8")
print(f"File: {len(lines)} -> {len(new_lines)} lines")
