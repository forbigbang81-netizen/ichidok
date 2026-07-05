#!/usr/bin/env python3
"""
Extract embedded English subtitles from the Smoking Behind the Supermarket
archive.org MP4 files and save them as VTT files in public/subtitles/.

Each episode's MP4 has 9 embedded ASS subtitle streams. Stream 2 is typically
the Crunchyroll English dialogue track. This script:
  1. Downloads each MP4's subtitle stream 2 via ffmpeg (extract only, no transcode)
  2. Converts the ASS to VTT using scripts/ass_to_vtt.py
  3. Writes to public/subtitles/62076_e{ep}.vtt
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUB_DIR = ROOT / "public" / "subtitles"
SUB_DIR.mkdir(parents=True, exist_ok=True)

EPISODES = [
    (1, "smoking-behind-the-supermarket-with-you-e1-ae27fe", "smoking behind the supermarket with you E1.mp4"),
    (2, "smoking-behind-the-supermarket-with-you-e2-0b8faa", "smoking behind the supermarket with you E2.mp4"),
    (3, "smoking-behind-the-supermarket-with-you-e3-53f07a", "smoking behind the supermarket with you E3.mp4"),
    (4, "smoking-behind-the-supermarket-with-you-e4-9cbc99", "smoking behind the supermarket with you E4.mp4"),
    (5, "smoking-behind-the-supermarket-with-you-e5-8f67e4", "smoking behind the supermarket with you E5.mp4"),
    (6, "smoking-behind-the-supermarket-with-you-e6-7488be", "smoking behind the supermarket with you E6.mp4"),
    (7, "smoking-behind-the-supermarket-with-you-e7-7dd743", "smoking behind the supermarket with you E7.mp4"),
    (8, "smoking-behind-the-supermarket-with-you-e8-79ae59", "smoking behind the supermarket with you E8.mp4"),
    (9, "smoking-behind-the-supermarket-with-you-e9-6c187a", "smoking behind the supermarket with you E9.mp4"),
    (10, "smoking-behind-the-supermarket-with-you-e10-50fe59", "smoking behind the supermarket with you E10.mp4"),
    (11, "smoking-behind-the-supermarket-with-you-e11-ff90a6", "smoking behind the supermarket with you E11.mp4"),
    (12, "smoking-behind-the-supermarket-with-you-e12-3874fb", "smoking behind the supermarket with you E12.mp4"),
]

def extract_subtitle_stream(url: str, stream_index: int, out_path: Path, timeout: int = 90) -> bool:
    """Extract a subtitle stream from a remote MP4 to a local ASS file."""
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-i", url,
        "-map", f"0:{stream_index}",
        "-c", "copy",
        str(out_path),
    ]
    try:
        result = subprocess.run(cmd, timeout=timeout, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  ffmpeg stderr: {result.stderr[:300]}", file=sys.stderr)
            return False
        return out_path.exists() and out_path.stat().st_size > 0
    except subprocess.TimeoutExpired:
        print(f"  ffmpeg timed out after {timeout}s", file=sys.stderr)
        return False

def find_english_dialogue_stream(url: str) -> int:
    """Probe streams and return the index of the English dialogue subtitle stream.
    Defaults to stream 2 (typically Crunchyroll English in these releases)."""
    # For the Smoking collection, stream 2 is consistently the English Crunchyroll track.
    # We could probe each stream's content, but that's slow. Just return 2.
    return 2

def main():
    print(f"Extracting subtitles for Smoking Behind the Supermarket ({len(EPISODES)} episodes)...")
    print(f"Output: {SUB_DIR}/")
    print()

    success = 0
    failed = []
    for ep_num, collection, filename in EPISODES:
        url = f"https://archive.org/download/{collection}/{filename.replace(' ', '%20')}"
        ass_path = SUB_DIR / f"62076_e{ep_num}.ass"
        vtt_path = SUB_DIR / f"62076_e{ep_num}.vtt"

        if vtt_path.exists() and vtt_path.stat().st_size > 200:
            print(f"  Episode {ep_num}: VTT already exists ({vtt_path.stat().st_size} bytes), skipping")
            success += 1
            continue

        print(f"  Episode {ep_num}: extracting from {collection}...")

        # Find the English dialogue stream
        stream_idx = find_english_dialogue_stream(url)

        # Extract ASS
        if not extract_subtitle_stream(url, stream_idx, ass_path):
            print(f"  Episode {ep_num}: FAILED to extract stream {stream_idx}")
            failed.append(ep_num)
            if ass_path.exists():
                ass_path.unlink()
            continue

        # Convert to VTT
        conv = subprocess.run(
            ["python3", str(ROOT / "scripts" / "ass_to_vtt.py"), str(ass_path), str(vtt_path)],
            capture_output=True, text=True,
        )
        if conv.returncode != 0:
            print(f"  Episode {ep_num}: ASS→VTT conversion failed: {conv.stderr[:200]}")
            failed.append(ep_num)
            continue

        # Clean up ASS file
        ass_path.unlink(missing_ok=True)

        size = vtt_path.stat().st_size
        if size < 200:
            print(f"  Episode {ep_num}: VTT too small ({size} bytes), may be empty")
            failed.append(ep_num)
            continue

        print(f"  Episode {ep_num}: OK ({size} bytes)")
        success += 1

    print()
    print(f"Done. Success: {success}/{len(EPISODES)}")
    if failed:
        print(f"Failed episodes: {failed}")
    return 0 if not failed else 1

if __name__ == "__main__":
    sys.exit(main())
