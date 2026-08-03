#!/usr/bin/env python3
"""
Find anime blocks with unbalanced braces.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')
anime_end_re = re.compile(r'^  \},\s*$')

# Find all anime blocks and check brace balance within each
current = None
current_start = None
current_open = 0
current_close = 0

unbalanced = []

for i, line in enumerate(lines):
    m = anime_start_re.match(line)
    if m:
        current = {"malId": int(m.group(1)), "title": m.group(2)}
        current_start = i
        current_open = 0
        current_close = 0
    
    if current:
        current_open += line.count('{')
        current_close += line.count('}')
    
    if anime_end_re.match(line) and current:
        diff = current_open - current_close
        if diff != 0:
            unbalanced.append({
                "line": current_start + 1,
                "end_line": i + 1,
                "malId": current["malId"],
                "title": current["title"],
                "open": current_open,
                "close": current_close,
                "diff": diff,
            })
        current = None

print(f"Found {len(unbalanced)} anime blocks with unbalanced braces:")
for u in unbalanced:
    print(f"  L{u['line']}-{u['end_line']}: malId={u['malId']}  {u['title'][:50]}")
    print(f"    opens={u['open']}  closes={u['close']}  diff={u['diff']:+d}")
