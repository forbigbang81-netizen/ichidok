#!/usr/bin/env python3
"""Add gdriveplayer embed sources to seed.ts for all found anime."""
import re

with open('/home/z/my-project/src/lib/seed.ts', 'r') as f:
    content = f.read()

# All gdriveplayer sources: (slug, audio, startEp, endEp)
gdrive_sources = [
    ("one-piece-dub", "dub", 1, 1048),
    ("one-piece", "sub", 1, 1171),
    ("naruto-dub", "dub", 1, 220),
    ("naruto", "sub", 1, 220),
    ("naruto-shippuden", "sub", 1, 500),
    ("shingeki-no-kyojin-dub", "dub", 1, 25),
    ("death-note-dub", "dub", 1, 37),
    ("death-note", "sub", 1, 37),
    ("fullmetal-alchemist-brotherhood-dub", "dub", 1, 64),
    ("fullmetal-alchemist-brotherhood", "sub", 1, 64),
    ("hunter-x-hunter-dub", "dub", 1, 62),
    ("hunter-x-hunter-2011", "sub", 1, 148),
    ("one-punch-man", "sub", 1, 12),
    ("spy-x-family", "sub", 1, 12),
    ("tokyo-ghoul-dub", "dub", 1, 12),
    ("tokyo-ghoul", "sub", 1, 12),
    ("vinland-saga-dub", "dub", 1, 24),
    ("vinland-saga", "sub", 1, 24),
    ("violet-evergarden-dub", "dub", 1, 14),
    ("violet-evergarden", "sub", 1, 14),
    ("chainsaw-man", "sub", 1, 12),
    ("code-geass-lelouch-of-the-rebellion-dub", "dub", 1, 25),
    ("code-geass-lelouch-of-the-rebellion", "sub", 1, 25),
    ("boku-no-hero-academia-dub", "dub", 1, 13),
    ("high-school-dxd-dub", "dub", 1, 12),
    ("bleach-dub", "dub", 1, 366),
    ("bleach", "sub", 1, 366),
    ("sword-art-online-dub", "dub", 1, 25),
    ("sword-art-online", "sub", 1, 25),
    ("cowboy-bebop-dub", "dub", 1, 26),
    ("cowboy-bebop", "sub", 1, 26),
    ("overlord", "sub", 1, 13),
    ("haikyuu", "sub", 1, 25),
    ("kimetsu-no-yaiba", "sub", 1, 26),
]

inserted = 0
for slug, audio, start, end in gdrive_sources:
    gdrive_line = "      // GDRIVEPLAYER embed (" + audio.upper() + ", works WITHOUT resolver!)\n      { startEp: " + str(start) + ", endEp: " + str(end) + ', collection: "gdriveplayer", audio: "' + audio + '", sourceType: "gdriveplayer_embed", fileTemplate: "' + slug + '" },\n'
    
    # Check if already exists
    check = 'fileTemplate: "' + slug + '"'
    if check in content:
        continue
    
    # Find the first wco-resolver occurrence
    wco_idx = content.find('collection: "wco-resolver"')
    if wco_idx < 0:
        continue
    
    # Find the start of this source block (go back to find // or {)
    # Find the line start
    line_start = content.rfind('\n', 0, wco_idx)
    if line_start < 0:
        continue
    
    # Check if there's a comment line before
    comment_line = content.rfind('\n', 0, line_start - 1)
    if comment_line > 0:
        between = content[comment_line:line_start].strip()
        if between.startswith('//'):
            line_start = comment_line
    
    # Insert before the wco-resolver source
    content = content[:line_start + 1] + gdrive_line + content[line_start + 1:]
    inserted += 1

with open('/home/z/my-project/src/lib/seed.ts', 'w') as f:
    f.write(content)

print("Inserted " + str(inserted) + " gdriveplayer sources!")
