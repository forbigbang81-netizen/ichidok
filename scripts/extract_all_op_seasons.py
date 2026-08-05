#!/usr/bin/env python3
"""
Extract all One Piece episodes from AnimeToki Drive.
Cycles through all 20 season folders and extracts Google Drive file IDs.
"""

import json
import re
import time
import subprocess
from pathlib import Path

# Season folder IDs (base64-encoded) extracted from the AnimeToki Drive page
SEASONS = [
    {"season": 1, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDEgLSBFYXN0IEJsdWU="},
    {"season": 2, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDIgLSBFbnRlcmluZyBpbnRvIHRoZSBHcmFuZCBMaW5l"},
    {"season": 3, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDMgLSBJbnRyb2R1Y2luZyBDaG9wcGVyIGF0IHRoZSBXaW50ZXIgSXNsYW5k"},
    {"season": 4, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDQgLSBBcnJpdmFsIGluIEFsYWJhc3RhLCBGaWVyY2UgRmlnaHRpbmcgaW4gQWxhYmFzdGE="},
    {"season": 5, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDUgLSBEcmVhbXMhLCBUaGUgWmVubnkgUGlyYXRlIENyZXcgU29ydGllISwgQmV5b25kIHRoZSBSYWluYm93"},
    {"season": 6, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDYgLSBTa3kgSXNsYW5kIH4gU2t5cGllYSwgVGhlIEdvbGRlbiBCZWxs"},
    {"season": 7, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDcgLSBFc2NhcGUhIFRoZSBNYXJpbmUgRm9ydHJlc3MgJiBUaGUgRm94eSBQaXJhdGUgQ3Jldw=="},
    {"season": 8, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDggLSBXYXRlciBTZXZlbg=="},
    {"season": 9, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMDkgLSBFbmllcyBMb2JieQ=="},
    {"season": 10, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTAgLSBUaHJpbGxlciBCYXJr"},
    {"season": 11, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTEgLSBTYWJhb2R5IEFyY2hpcGVsYWdv"},
    {"season": 12, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTIgLSBJc2xhbmQgb2YgV29tZW4="},
    {"season": 13, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTMgLSBJbXBlbCBEb3du"},
    {"season": 14, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTQgLSBNYXJpbmVmb3Jk"},
    {"season": 15, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTUgLUZpc2htYW4gSXNsYW5k"},
    {"season": 16, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTYgLSBQdW5rIEhhemFyZA=="},
    {"season": 17, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTcgLSBEcmVzc3Jvc2E="},
    {"season": 18, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTggLSBab3U="},
    {"season": 19, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMTkgLSBXaG9sZSBDYWtlIElzbGFuZA=="},
    {"season": 20, "folderId": "W0FuaW1lU2FrdXJhXSBTZWFzb24gMjAgLSBXYW5vIENvdW50cnk="},
]

# Episode number ranges per season (approximate — the script will extract actual numbers)
# Season 1: 1-61, Season 2: 62-131, etc. (these are One Piece episode numbers, not season-relative)

all_episodes = {}

for season_info in SEASONS:
    season = season_info["season"]
    folder_id = season_info["folderId"]

    print(f"\n=== Season {season} ===")

    # Use agent-browser to open the folder and extract file IDs
    js_code = f"""
    (() => {{
      return new Promise((resolve) => {{
        openFolder('{folder_id}');
        setTimeout(() => {{
          const checkboxes = document.querySelectorAll('.file-checkbox');
          const episodes = [];
          checkboxes.forEach(cb => {{
            const fileId = cb.value;
            const dataName = cb.getAttribute('data-name') || '';
            try {{
              const filename = atob(dataName);
              const epMatch = filename.match(/One Piece -\\s*(\\d+)/);
              const ep = epMatch ? parseInt(epMatch[1]) : 0;
              if (ep > 0) {{
                episodes.push({{ ep, fileId }});
              }}
            }} catch(e) {{}}
          }});
          // Deduplicate
          const seen = {{}};
          const unique = [];
          episodes.forEach(e => {{
            if (!seen[e.ep]) {{
              seen[e.ep] = true;
              unique.push(e);
            }}
          }});
          unique.sort((a, b) => a.ep - b.ep);
          resolve(JSON.stringify(unique));
        }}, 3000);
      }});
    }})()
    """

    result = subprocess.run(
        ["agent-browser", "eval", js_code, "--json"],
        capture_output=True, text=True, timeout=30
    )

    output = result.stdout.strip()
    # Try to parse the JSON output
    try:
        # agent-browser eval returns the result in quotes
        raw = output.strip().strip('"').replace('\\"', '"')
        episodes = json.loads(raw)
        print(f"  Found {len(episodes)} episodes")

        for ep in episodes:
            ep_num = ep["ep"]
            file_id = ep["fileId"]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
            all_episodes[ep_num] = url
            if ep_num <= 3 or ep_num % 50 == 0:
                print(f"  Ep {ep_num:4d}: {file_id}")

    except Exception as e:
        print(f"  Error parsing: {e}")
        print(f"  Raw output: {output[:200]}")

    # Go back to parent folder
    subprocess.run(["agent-browser", "eval", "goBack()"], capture_output=True, text=True, timeout=10)
    time.sleep(2)

# Save all episodes
print(f"\n=== Total: {len(all_episodes)} unique episodes ===")
out = Path("/home/z/my-project/scripts/one_piece_all_episodes.json")
out.write_text(json.dumps(all_episodes, indent=2))
print(f"Saved to {out}")

# Show summary
for ep_num in sorted(all_episodes.keys()):
    if ep_num <= 5 or ep_num % 100 == 0 or ep_num == max(all_episodes.keys()):
        print(f"  Ep {ep_num:4d}: {all_episodes[ep_num][:80]}")
