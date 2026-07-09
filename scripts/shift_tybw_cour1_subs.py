#!/usr/bin/env python3
"""Shift Bleach TYBW Cour 1 subtitle timestamps by -14 seconds to sync
with the Japanese TV broadcast video source.

The subtitles were timed for Disney+ streaming which has ~14 seconds of
intro/warning before the cold open. The Japanese TV broadcast starts
with the cold open immediately at 0s.
"""
import re, os, glob

OFFSET = -14.0  # seconds to shift (negative = earlier)
COUR1_DIR = "/home/z/my-project/public/subtitles"

def time_to_seconds(t):
    """Convert VTT timestamp 'HH:MM:SS.mmm' to seconds."""
    m = re.match(r'(\d+):(\d+):(\d+)\.(\d+)', t)
    if not m:
        return 0.0
    h, mn, s, ms = m.groups()
    return int(h) * 3600 + int(mn) * 60 + int(s) + int(ms) / 1000.0

def seconds_to_time(sec):
    """Convert seconds to VTT timestamp 'HH:MM:SS.mmm'."""
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    mn = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{mn:02d}:{s:02d}.{ms:03d}"

def shift_vtt(filepath, offset):
    """Shift all timestamps in a VTT file by offset seconds."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    out = []
    skip_next_cue = False
    current_cue_lines = []
    
    for line in lines:
        # Check if this line is a timestamp line
        m = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})', line.strip())
        if m:
            start_sec = time_to_seconds(m.group(1)) + offset
            end_sec = time_to_seconds(m.group(2)) + offset
            
            # Skip cues that end before 0
            if end_sec <= 0:
                # Mark to skip this cue's text
                skip_next_cue = True
                out.append(None)  # placeholder
                continue
            
            # Clamp start to 0
            if start_sec < 0:
                start_sec = 0
            
            skip_next_cue = False
            new_ts = f"{seconds_to_time(start_sec)} --> {seconds_to_time(end_sec)}"
            out.append(new_ts)
        else:
            out.append(line)
    
    # Remove None placeholders and their following text lines
    result = []
    i = 0
    while i < len(out):
        if out[i] is None:
            # Skip the timestamp placeholder and the following text line(s) until blank
            i += 1
            while i < len(out) and out[i].strip() != '':
                i += 1
            continue
        result.append(out[i])
        i += 1
    
    new_content = '\n'.join(result)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return new_content

# Process all Cour 1 subtitle files (41467_e1 through 41467_e13)
files = sorted(glob.glob(f"{COUR1_DIR}/41467_e*.vtt"))
print(f"Found {len(files)} Cour 1 subtitle files")

for filepath in files:
    fname = os.path.basename(filepath)
    # Get original first cue time
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find first timestamp
    first_ts = re.search(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->', content)
    first_time = first_ts.group(1) if first_ts else "N/A"
    
    new_content = shift_vtt(filepath, OFFSET)
    
    # Get new first cue time
    new_first_ts = re.search(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->', new_content)
    new_first_time = new_first_ts.group(1) if new_first_ts else "N/A"
    
    print(f"  {fname}: first cue {first_time} -> {new_first_time}")

print("\nDone! All Cour 1 subtitles shifted by -14 seconds.")
