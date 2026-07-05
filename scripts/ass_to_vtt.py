#!/usr/bin/env python3
"""Extract real dialogue from an ASS subtitle file, skipping OP/ED/signs."""
import re
import sys

DIALOGUE_STYLES = {
    "Default", "DefaultItalics", "DefaultOverlap", "Top-Alt", "Btm-Alt", "Italics",
    # Common dialogue style names from Crunchyroll/Funimation/HorribleSubs releases
    "Subtitles", "Subtitle", "Dialogue", "Main",
}

def ass_time_to_vtt(t: str) -> str:
    """Convert ASS time '0:01:23.45' to VTT time '00:01:23.450'"""
    m = re.match(r"(\d+):(\d+):(\d+)\.(\d+)", t)
    if not m:
        m = re.match(r"(\d+):(\d+):(\d+):(\d+)", t)
        if not m: return "00:00:00.000"
    h, mn, s, cs = m.groups()
    # ASS centiseconds are 2 digits, pad to 3 for VTT milliseconds
    return f"{int(h):02d}:{int(mn):02d}:{int(s):02d}.{cs.ljust(3, '0')[:3]}"

def ass_to_vtt(ass_path: str) -> str:
    with open(ass_path, encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    cues = []
    for line in lines:
        if not line.startswith("Dialogue:"):
            continue
        parts = line.split(",", 9)
        if len(parts) < 10:
            continue
        start, end, style, text = parts[1], parts[2], parts[3], parts[9]
        if style not in DIALOGUE_STYLES:
            continue
        # Strip ASS override tags
        text = re.sub(r"\{[^}]*\}", "", text)
        # Convert ASS newline to VTT newline
        text = text.replace("\\N", "\n").replace("\\n", "\n").strip()
        if not text:
            continue
        cues.append((ass_time_to_vtt(start), ass_time_to_vtt(end), text))
    
    # Build VTT
    out = ["WEBVTT", ""]
    for i, (s, e, t) in enumerate(cues, 1):
        out.append(str(i))
        out.append(f"{s} --> {e}")
        out.append(t)
        out.append("")
    return "\n".join(out)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ass_to_vtt.py <input.ass> [output.vtt]", file=sys.stderr)
        sys.exit(1)
    vtt = ass_to_vtt(sys.argv[1])
    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(vtt)
        print(f"Wrote {len(vtt)} bytes to {sys.argv[2]}", file=sys.stderr)
    else:
        print(vtt)
