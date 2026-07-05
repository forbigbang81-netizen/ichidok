#!/usr/bin/env python3
"""Extract embedded English subtitles from Chainsaw Man S1 archive.org MKV files."""
import subprocess
import sys
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUB_DIR = ROOT / "public" / "subtitles"
SUB_DIR.mkdir(parents=True, exist_ok=True)

# Chainsaw Man S1 episodes 1-12 from the hi-10 collection
# Each MKV file has a unique hash in the filename
EPISODE_FILES = [
    (1, "(Hi10)_Chainsaw_Man_S1_-_01_(1080p)_(GJM)_(62A0D357).mkv"),
    (2, "(Hi10)_Chainsaw_Man_S1_-_02_(1080p)_(GJM)_(A25323AA).mkv"),
    (3, "(Hi10)_Chainsaw_Man_S1_-_03_(1080p)_(GJM)_(CB67CABE).mkv"),
    (4, "(Hi10)_Chainsaw_Man_S1_-_04_(1080p)_(GJM)_(84DC9A75).mkv"),
    (5, "(Hi10)_Chainsaw_Man_S1_-_05_(1080p)_(GJM)_(E3191D55).mkv"),
    (6, "(Hi10)_Chainsaw_Man_S1_-_06_(1080p)_(GJM)_(438635DA).mkv"),
    (7, "(Hi10)_Chainsaw_Man_S1_-_07_(1080p)_(GJM)_(C71C1C6B).mkv"),
    (8, "(Hi10)_Chainsaw_Man_S1_-_08_(1080p)_(GJM)_(AB46185D).mkv"),
    (9, "(Hi10)_Chainsaw_Man_S1_-_09_(1080p)_(GJM)_(AA9D08A7).mkv"),
    (10, "(Hi10)_Chainsaw_Man_S1_-_10_(1080p)_(GJM)_(17A6694C).mkv"),
    (11, "(Hi10)_Chainsaw_Man_S1_-_11_(1080p)_(GJM)_(85DC2EF6).mkv"),
    (12, "(Hi10)_Chainsaw_Man_S1_-_12_(1080p)_(GJM)_(805AD605).mkv"),
]

COLLECTION = "hi-10-chainsaw-man-s-1-1080p"
FOLDER = "[Hi10]_Chainsaw_Man_S1_[1080p]"
STREAM_INDEX = 2  # English ASS subtitle stream (GJM Subs)
MAL_ID = 44511

def main():
    print(f"Extracting subtitles for Chainsaw Man S1 ({len(EPISODE_FILES)} episodes)")
    print(f"Output: {SUB_DIR}/")
    print()

    success = 0
    failed = []

    for ep_num, filename in EPISODE_FILES:
        vtt_path = SUB_DIR / f"{MAL_ID}_e{ep_num}.vtt"

        if vtt_path.exists() and vtt_path.stat().st_size > 200:
            print(f"  ep {ep_num}: already exists ({vtt_path.stat().st_size} bytes), skipping")
            success += 1
            continue

        # Build URL
        url = f"https://archive.org/download/{COLLECTION}/{FOLDER}/{filename}"
        # URL-encode spaces and special chars
        url = url.replace(" ", "%20").replace("(", "%28").replace(")", "%29").replace("[", "%5B").replace("]", "%5D")

        ass_path = SUB_DIR / f"{MAL_ID}_e{ep_num}.ass"
        print(f"  ep {ep_num}: extracting...", end=" ", flush=True)

        # Extract ASS subtitle stream
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", url, "-map", f"0:{STREAM_INDEX}", "-c:s", "copy", str(ass_path)]
        try:
            result = subprocess.run(cmd, timeout=120, capture_output=True, text=True)
            if result.returncode != 0 or not ass_path.exists() or ass_path.stat().st_size < 100:
                print(f"FAILED (ffmpeg)")
                failed.append(ep_num)
                ass_path.unlink(missing_ok=True)
                continue
        except subprocess.TimeoutExpired:
            print(f"FAILED (timeout)")
            failed.append(ep_num)
            ass_path.unlink(missing_ok=True)
            continue

        # Convert ASS to VTT
        conv = subprocess.run(
            ["python3", str(ROOT / "scripts" / "ass_to_vtt.py"), str(ass_path), str(vtt_path)],
            capture_output=True, text=True,
        )
        if conv.returncode != 0:
            print(f"FAILED (conversion)")
            failed.append(ep_num)
            ass_path.unlink(missing_ok=True)
            vtt_path.unlink(missing_ok=True)
            continue

        ass_path.unlink(missing_ok=True)
        size = vtt_path.stat().st_size
        if size < 200:
            print(f"FAILED (too small: {size} bytes)")
            failed.append(ep_num)
            vtt_path.unlink(missing_ok=True)
            continue

        print(f"OK ({size} bytes)")
        success += 1

    print()
    print(f"Done. Success: {success}/{len(EPISODE_FILES)}")
    if failed:
        print(f"Failed: {failed}")
    return 0 if not failed else 1

if __name__ == "__main__":
    sys.exit(main())
