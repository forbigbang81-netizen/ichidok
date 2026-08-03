#!/usr/bin/env python3
"""
Remove ALL WCO-related references from src/lib/seed.ts.

Operations:
1. Delete the single wcoflix source line for Black Clover (line ~990)
2. Delete the wcoflix handler line in buildResult (line ~18169)
3. Sanitize all WCO-mentioning comments into neutral comments
4. Verify no other source uses collection: "wcoflix" or "wcoanime..."
"""

import re
import sys
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
text = SEED.read_text(encoding="utf-8")
orig_lines = text.splitlines(keepends=True)
orig_count = len(orig_lines)

# 1. Remove the Black Clover wcoflix source line (the only actual wco source)
# Pattern: matches the entire source line including trailing comma + newline
patterns_to_remove = [
    # The Black Clover wcoflix source line
    r'      // DUB E1-170 from wcoflix \(all episodes, English dubbed\)\n',
    r'      \{ startEp: 1, endEp: 170, collection: "wcoflix", audio: "dub", fileTemplate: "https://www\.wcoflix\.tv/black-clover-episode-\{ep\}-english-dubbed" \},\n',
    # The wcoflix handler in buildResult
    r'    if \(collectionName === "wcoflix"\) \{ return \{ url: file, source: "wcoflix", needsProxy: false, dualAudio: false, audio: src\.audio \?\? "sub" as const \}; \}\n',
]

removed = 0
for pat in patterns_to_remove:
    new_text, n = re.subn(pat, "", text)
    if n > 0:
        text = new_text
        removed += n
        print(f"  Removed pattern (x{n}): {pat[:80]}...")

# 2. Sanitize WCO comments -> neutral comments (don't delete, just reword)
# Replace any comment line that mentions WCO/wcoflix/wcoanime with a neutral comment
comment_replacements = [
    # Old: "      //      NEXT_PUBLIC_WCO_RESOLVER_URL env var to be set. If the resolver"
    # New: remove this stale comment entirely (it's part of a multi-line block)
    (r'    //      NEXT_PUBLIC_WCO_RESOLVER_URL env var to be set\. If the resolver\n', ''),
    (r'    //      is down or not configured, falls back to archive\.org sources below\.\n', ''),
    (r'    // Video sources:\n', '    // Video sources:\n'),
    (r'    //      English dub\. Resolved at playback time by an external VPS running\n', ''),
    (r'    //      Playwright \+ stealth to bypass Cloudflare Turnstile\. Requires\n', ''),
    # Old: "      // 1155 episodes (E1-1155) available on wcoanimedub.tv in 1080p."
    # New: Drop the entire WCO-resolver explanation block for One Piece
    (r'      // 1155 episodes \(E1-1155\) available on wcoanimedub\.tv in 1080p\.\n', ''),
    (r'      // The resolver \(deployed separately on Railway/Render\) runs Playwright\n', ''),
    (r'      // to bypass Cloudflare Turnstile and returns a short-lived direct\n', ''),
    (r'      // video URL \(~60s TTL\)\. VideoPlayer calls the resolver client-side\.\n', ''),
    (r'      // Uses /resolve-by-ep endpoint so the resolver looks up the correct\n', ''),
    (r'      // slug from its internal map \(E1-421 have non-standard slugs like\n', ''),
    (r'      // "one-piece-episode-1-english-dubbed-2-2", E1029-1030 use\n', ''),
    (r'      // "one-piece-specials-episode-N-english-dubbed" prefix\)\.\n', ''),
    (r'      // 1168 episodes \(E1-1171\) available on wcoanimesub\.tv in 1080p\.\n', ''),
    (r'      // Used as SUB source for episodes not covered by archive\.org, AND\n', '      // SUB source for episodes not covered by archive.org.\n'),
    (r'      // as the primary source for Elbaf arc \(E1156-1171\) which has no dub yet\.\n', ''),
    # Black Clover
    (r'    // DUB: E1-170 from wcoflix\.tv \(English dub, HD quality\)\n', '    // DUB: GDrivePlayer embed (full series).\n'),
    # Code Geass
    (r'    // DUB: 25 episodes from wcoanimedub\.tv in HD \(1080p\)\. Slugs have -2 suffix\.\n', '    // DUB: GDrivePlayer embed (full series).\n'),
    (r'    // SUB: Not available on WCO sites \(Code Geass only has dubbed on WCO\)\.\n', '    // SUB: GDrivePlayer embed (full series).\n'),
    (r'    // DUB: 25 episodes from wcoanimedub\.tv in HD \(1080p\)\. Slugs use -r2 prefix\.\n', '    // DUB: GDrivePlayer embed (full series).\n'),
    (r'    // SUB: Not available on WCO sites\.\n', '    // SUB: GDrivePlayer embed (full series).\n'),
    (r'    // Uses /resolve\?slug=\.\.\. endpoint \(direct slug lookup\) since slugs follow\n', ''),
    (r'    // a consistent pattern: code-geass-episode-\{ep\}-english-dubbed-2\n', ''),
    (r'    // a consistent pattern: code-geass-r2-episode-\{ep\}-english-dubbed\n', ''),
]

replaced = 0
for pat, repl in comment_replacements:
    new_text, n = re.subn(pat, repl, text)
    if n > 0:
        text = new_text
        replaced += n

print(f"\nRemoved {removed} WCO source line(s) / handler(s).")
print(f"Sanitized {replaced} WCO-mentioning comment line(s).")

# 3. Final scan: any remaining wco references that aren't benign?
remaining = []
for i, line in enumerate(text.splitlines(), 1):
    if re.search(r'wco', line, re.IGNORECASE):
        # Skip the "works WITHOUT resolver!" comments — those are accurate descriptions of GDrivePlayer
        if "WITHOUT resolver" in line:
            continue
        remaining.append((i, line.strip()))

if remaining:
    print(f"\n⚠️  Remaining WCO references ({len(remaining)}):")
    for ln, content in remaining[:20]:
        print(f"  L{ln}: {content}")
else:
    print("\n✅ No non-benign WCO references remain.")

# Write back
SEED.write_text(text, encoding="utf-8")
new_count = len(text.splitlines())
print(f"\nFile: {orig_count} -> {new_count} lines (delta {new_count - orig_count:+d})")
