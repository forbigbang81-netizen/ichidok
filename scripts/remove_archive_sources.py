#!/usr/bin/env python3
"""
Remove all non-GDrivePlayer episode sources from seed.ts, keeping ONLY:
  - gdriveplayer_embed sources (primary 1080p Google Drive source)
  - youtube sources (for trailers)
  - dropbox / external sources (user-provided high-quality rips)

Removes:
  - archive.org sources (collection names that aren't gdriveplayer/youtube/dropbox/external)
  - Their associated episodeFiles maps
  - Their associated comments

This simplifies the source tree and ensures all playback goes through
GDrivePlayer's 1080p Google Drive embeds.
"""

import re
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
orig_lines = text.splitlines(keepends=True)
orig_count = len(orig_lines)

# Collection names that we KEEP (not archive.org)
KEEP_COLLECTIONS = {"gdriveplayer", "youtube", "dropbox", "external"}

# Walk through the file line by line.
# When we see a source line (starts with `      { startEp:`), check if its
# collection is in KEEP_COLLECTIONS. If not, mark it for removal.
# Also mark the preceding comment line(s) and any trailing continuation lines
# (for multi-line source definitions where sourceType is on the next line).

lines = orig_lines[:]
lines_to_remove = set()

# Pattern to identify a source line and extract its collection
source_start_re = re.compile(r'^\s*\{\s*startEp:\s*(\d+),\s*endEp:\s*(\d+),\s*collection:\s*"([^"]+)"')
# Continuation line (e.g., `        sourceType: "gdriveplayer_embed",`)
continuation_re = re.compile(r'^\s+(sourceType|fileTemplate|episodeFiles|needsProxy|dualAudio|audio|seasonMap|fileName)\s*[:{]')
# Comment line
comment_re = re.compile(r'^\s*//')
# Closing of a source line: `},` or `},`
source_end_re = re.compile(r'^\s*\}\s*,?\s*$')

i = 0
removed_count = 0
while i < len(lines):
    line = lines[i]
    m = source_start_re.match(line)
    if m:
        collection = m.group(3)
        # Check if the collection name contains {ep:NN} (archive.org per-episode pattern)
        # or is a known archive.org collection
        is_archive = collection not in KEEP_COLLECTIONS
        
        if is_archive:
            # Mark this line and all continuation lines for removal
            block_start = i
            # Find the preceding comment line
            if block_start > 0 and comment_re.match(lines[block_start - 1]):
                lines_to_remove.add(block_start - 1)
            
            # Mark the source line itself
            lines_to_remove.add(i)
            
            # If the source definition spans multiple lines (e.g., sourceType
            # on the next line), mark those too
            j = i + 1
            # Check if this line ends with `},` (single-line source) or not
            if not re.search(r'\}\s*,?\s*$', line):
                # Multi-line source — keep marking until we hit the closing }
                while j < len(lines):
                    lines_to_remove.add(j)
                    if source_end_re.match(lines[j]):
                        break
                    j += 1
            # Also handle episodeFiles maps which span many lines
            elif 'episodeFiles' in line and '}' not in line.split('episodeFiles')[1]:
                # The episodeFiles map continues on subsequent lines
                while j < len(lines):
                    lines_to_remove.add(j)
                    # Look for the closing `} },` of the episodeFiles map
                    if re.search(r'\}\s*\}\s*,?\s*$', lines[j]):
                        break
                    j += 1
            
            removed_count += 1
    i += 1

print(f"Marked {len(lines_to_remove)} lines for removal ({removed_count} source blocks).")

# Rebuild the file
new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
new_text = "".join(new_lines)
SEED.write_text(new_text, encoding="utf-8")

new_count = len(new_text.splitlines())
print(f"File: {orig_count} -> {new_count} lines (removed {orig_count - new_count} lines)")

# Verify: count remaining sources by collection
remaining_gdrive = new_text.count('collection: "gdriveplayer"')
remaining_archive = 0
for m in re.finditer(r'collection:\s*"([^"]+)"', new_text):
    if m.group(1) not in KEEP_COLLECTIONS:
        remaining_archive += 1

print(f"\nRemaining sources:")
print(f"  gdriveplayer: {remaining_gdrive}")
print(f"  archive/other: {remaining_archive}")
