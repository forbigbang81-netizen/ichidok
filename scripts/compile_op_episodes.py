#!/usr/bin/env python3
"""
Combine all One Piece season episode data and generate video-sources.ts code.
"""

import json
import os
from pathlib import Path

# Load all season files
all_episodes = {}

for f in sorted(Path("/tmp").glob("op_s*.txt")):
    if f.name == "op_s1.txt" or f.name.startswith("op_s") and not "p2" in f.name:
        try:
            raw = f.read_text().strip().strip('"').replace('\\"', '"')
            if raw == "null" or not raw:
                continue
            episodes = json.loads(raw)
            for ep in episodes:
                ep_num = ep["ep"]
                file_id = ep["fileId"]
                # Google Drive direct streaming URL
                url = f"https://drive.google.com/uc?export=download&id={file_id}"
                all_episodes[ep_num] = url
        except Exception as e:
            print(f"Error reading {f}: {e}")

# Also check the missing episodes file
try:
    raw = Path("/tmp/op_missing.txt").read_text().strip().strip('"').replace('\\"', '"')
    if raw and raw != "null":
        episodes = json.loads(raw)
        for ep in episodes:
            all_episodes[ep["ep"]] = f"https://drive.google.com/uc?export=download&id={ep['fileId']}"
except:
    pass

print(f"Total unique episodes: {len(all_episodes)}")
print(f"Episode range: {min(all_episodes.keys()) if all_episodes else 0} - {max(all_episodes.keys()) if all_episodes else 0}")

# Show summary by range
for start in range(1, max(all_episodes.keys()) + 1 if all_episodes else 1, 100):
    end = min(start + 99, max(all_episodes.keys()) if all_episodes else 0)
    count = sum(1 for ep in all_episodes if start <= ep <= end)
    if count > 0:
        print(f"  Eps {start}-{end}: {count} episodes")

# Generate TypeScript code
lines = []
lines.append("// One Piece episodes from AnimeToki Drive (1080p Dual Audio HEVC MKV)")
lines.append("// Source: drive.animetoki.com - Google Drive file IDs")
lines.append("// Files are MKV with HEVC codec - works in Safari/Edge, may not work in Chrome/Firefox")
lines.append("const ONE_PIECE_EPISODES: Record<number, string> = {")

for ep_num in sorted(all_episodes.keys()):
    url = all_episodes[ep_num]
    lines.append(f"  {ep_num}: \"{url}\",")

lines.append("};")
lines.append("")

# Save the TypeScript code
out = Path("/home/z/my-project/scripts/one_piece_episodes_ts.txt")
out.write_text("\n".join(lines))
print(f"\nTypeScript code saved to {out}")

# Also save as JSON for reference
json_out = Path("/home/z/my-project/scripts/one_piece_all_episodes.json")
json_out.write_text(json.dumps(all_episodes, indent=2))
print(f"JSON saved to {json_out}")
