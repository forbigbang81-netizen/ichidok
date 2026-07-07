#!/usr/bin/env python3
"""
Download Berserk 1997 English subtitles from OpenSubtitles for all 25 episodes,
convert SRT to VTT, and save to /home/z/my-project/public/subtitles/33_e{ep}.vtt.

Strategy:
  1. Search OpenSubtitles REST API for each episode by season/episode number.
  2. Prefer SRT files with "S01E{ep}" in the name that match the TV series
     (not the movie trilogy). Prefer .srt over .ass.
  3. Download the .gz file, decompress, convert SRT -> VTT.
  4. Save as 33_e{ep}.vtt in the public/subtitles directory.
"""

import gzip
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse

OUT_DIR = "/home/z/my-project/public/subtitles"
MAL_ID = 33
NUM_EPISODES = 25
USER_AGENT = "TemporaryUserAgent"
OS_BASE = "https://rest.opensubtitles.org/search"

# Episode titles for matching (from berserk-1997-complete filenames)
EPISODE_TITLES = {
    1: "The Black Swordsman",
    2: "The Band of the Hawk",
    3: "First Battle",
    4: "The Hand of God",
    5: "Sword and the Wind",
    6: "Zodd the Immortal",
    7: "The Sword Master",
    8: "Conspiracy",
    9: "Assassination",
    10: "Nobleman",
    11: "Battle Engagement",
    12: "Two People",
    13: "Suicidal Act",
    14: "Campfire of Dreams",
    15: "The Decisive Battle",
    16: "The Conqueror",
    17: "Moment of Glory",
    18: "Tombstone of Flames",
    19: "Parting",
    20: "The Spark",
    21: "Confession",
    22: "The Infiltration",
    23: "Eve of the Feast",
    24: "Eclipse",
    25: "Perpetual Time",
}


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_gz(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    return gzip.decompress(data).decode("utf-8", errors="replace")


def srt_to_vtt(srt_text):
    """Convert SRT subtitle format to WebVTT format."""
    # Replace Windows line endings
    text = srt_text.replace("\r\n", "\n").replace("\r", "\n")
    # VTT header
    vtt = "WEBVTT\n\n"
    # Split into blocks
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
        # Skip the index number line (SRT has "1", "2", etc.)
        if lines[0].strip().isdigit():
            lines = lines[1:]
        if len(lines) < 2:
            continue
        # Convert timestamp format: 00:00:01,000 --> 00:00:05,000
        # to: 00:00:01.000 --> 00:00:05.000
        timing = lines[0].replace(",", ".")
        if "-->" not in timing:
            continue
        vtt += timing + "\n"
        vtt += "\n".join(lines[1:]) + "\n\n"
    return vtt


def search_episode(ep_num):
    """Search OpenSubtitles for a specific Berserk episode."""
    # Search by query (more reliable than season/episode params)
    query = f"berserk+season+1+episode+{ep_num}"
    url = f"{OS_BASE}/query-{query}/sublanguageid-eng"
    try:
        results = fetch_json(url)
    except Exception as e:
        print(f"  Search failed for ep{ep_num}: {e}")
        return []

    # Filter: must be the TV series (not the movie trilogy), prefer .srt
    candidates = []
    for r in results:
        fname = r.get("SubFileName", "")
        mname = r.get("MovieName", "")
        # Skip the movie trilogy (Golden Age Arc)
        if "Golden Age" in mname or "Advent" in mname or "Egg of" in mname or "Battle for Doldrey" in mname:
            continue
        # Must contain S01E{ep} or similar episode pattern
        ep_padded = f"{ep_num:02d}"
        patterns = [f"S01E{ep_padded}", f"1x{ep_padded}", f"01x{ep_padded}",
                    f"Berserk - {ep_padded}", f"Berserk - {ep_num} -",
                    f"Berserk - {ep_num}."]
        if not any(p in fname for p in patterns):
            continue
        # Prefer .srt, then .ass
        ext = os.path.splitext(fname)[1].lower()
        score = 0
        if ext == ".srt":
            score += 10
        if "eng" in fname.lower():
            score += 5
        # Prefer the original "Berserk - S01E{ep}" naming
        if f"S01E{ep_padded}" in fname:
            score += 3
        candidates.append((score, r))
    candidates.sort(key=lambda x: -x[0])
    return [c[1] for c in candidates]


def download_and_convert(ep_num, sub):
    """Download subtitle, convert to VTT, save to disk."""
    dl_url = sub.get("SubDownloadLink", "")
    if not dl_url:
        return False
    fname = sub.get("SubFileName", "unknown")
    try:
        content = fetch_gz(dl_url)
    except Exception as e:
        print(f"  Download failed for ep{ep_num} ({fname}): {e}")
        return False
    ext = os.path.splitext(fname)[1].lower()
    if ext == ".srt":
        vtt = srt_to_vtt(content)
    elif ext == ".ass":
        # Basic ASS -> VTT: strip formatting, extract dialogue lines
        vtt = "WEBVTT\n\n"
        in_events = False
        for line in content.split("\n"):
            if line.strip() == "[Events]":
                in_events = True
                continue
            if not in_events:
                continue
            if line.startswith("Format:"):
                continue
            if line.startswith("Dialogue:"):
                # Parse: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
                parts = line.split(",", 9)
                if len(parts) < 10:
                    continue
                start = parts[1].strip()
                end = parts[2].strip()
                text = parts[9].strip()
                # Clean ASS formatting tags
                text = re.sub(r"\{[^}]*\}", "", text)
                text = text.replace("\\N", "\n").replace("\\n", "\n")
                if not text:
                    continue
                # Convert time: 0:00:01.00 -> 00:00:01.000
                def fmt(t):
                    m = re.match(r"(\d+):(\d+):(\d+)\.(\d+)", t)
                    if not m:
                        return t
                    h, mi, s, ms = m.groups()
                    return f"{int(h):02d}:{int(mi):02d}:{int(s):02d}.{ms.ljust(3,'0')[:3]}"
                vtt += f"{fmt(start)} --> {fmt(end)}\n{text}\n\n"
    else:
        print(f"  Unsupported format {ext} for ep{ep_num}")
        return False
    out_path = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep_num}.vtt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(vtt)
    print(f"  Saved ep{ep_num}: {out_path} ({len(vtt)} bytes)")
    return True


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    success = 0
    failed = []
    for ep in range(1, NUM_EPISODES + 1):
        print(f"\n=== Episode {ep} ({EPISODE_TITLES.get(ep, '?')}) ===")
        candidates = search_episode(ep)
        if not candidates:
            print(f"  No candidates found for ep{ep}")
            failed.append(ep)
            continue
        print(f"  Found {len(candidates)} candidates, best: {candidates[0].get('SubFileName','')}")
        if download_and_convert(ep, candidates[0]):
            success += 1
        else:
            failed.append(ep)
        time.sleep(2)  # Rate limit
    print(f"\n=== DONE: {success}/{NUM_EPISODES} succeeded ===")
    if failed:
        print(f"Failed episodes: {failed}")


if __name__ == "__main__":
    main()
