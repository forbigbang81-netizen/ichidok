#!/usr/bin/env python3
"""
Extract embedded English subtitles from all anime that have them in their
archive.org MKV/MP4 files. Saves VTT files to public/subtitles/{malId}_e{ep}.vtt.

Anime with extractable subtitles:
  - Frieren (52991): MKV has English Dialogue ASS (stream 4)
  - NGE (30): MKV has English Subtitles ASS (stream 5)
  - Eva 1.0 (2759): MKV has English ASS (stream 0)
  - A Silent Voice (28851): MKV has English Full Subtitles ASS (stream 6)
  - Smoking (62076): MP4 has English Crunchyroll ASS (stream 2) — already done

Note: PGS subtitles (EoE, A Silent Voice PGS tracks) are image-based and
require OCR (not supported here). We only extract text-based ASS/SRT tracks.
"""
import subprocess
import sys
import re
import os
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUB_DIR = ROOT / "public" / "subtitles"
SUB_DIR.mkdir(parents=True, exist_ok=True)

# Each entry: (malId, title, episodes, url_template, stream_index)
# url_template uses {ep} for episode number
# stream_index is the ASS subtitle stream to extract
EXTRACT_TARGETS = [
    {
        "malId": 52991,
        "title": "Frieren: Beyond Journey's End",
        "episodes": 28,
        "url_template": "https://archive.org/download/frieren-beyond-journeys-end_1080p_2024/Frieren-Beyond-Journey's-End_S01E{ep:02}.mkv",
        "stream_index": 4,  # Dialogue track
    },
    {
        "malId": 30,
        "title": "Neon Genesis Evangelion",
        "episodes": 26,
        "url_template": "https://archive.org/download/neon-genesis-evangelion-dual-audio/Neon%20Genesis%20Evangelion%20-%20{ep:02}%20-%20{title}.mkv",
        "stream_index": 5,  # English Subtitles
        # NGE episodes have title-based filenames, so we need a mapping
        "episode_titles": {
            1: "Angel Attacks",
            2: "Unfamiliar Ceiling",
            3: "The Phone That Never Rings",
            4: "Rain, After Running Away",
            5: "Rei, Beyond the Heart",
            6: "Rei II",
            7: "A Human Work",
            8: "Asuka Strikes!",
            9: "Justified Imbalance",
            10: "Magma Diver",
            11: "The Day Tokyo-3 Stood Still",
            12: "She Said, Don't Make Others Suffer For Your Personal Hatred",
            13: "Lilliputian Hitcher",
            14: "Weaving a Story",
            15: "Those women longed for the touch of others' lips, and thus invited their kisses.",
            16: "Splitting of the Breast",
            17: "Fourth Children",
            18: "Ambivalence",
            19: "Introjection",
            20: "Weaving a Story 2: Oral Stage",
            21: "He was aware that he was still a child.",
            22: "Don't Be.",
            23: "Rei III",
            24: "The Beginning and the End, or Knockin' on Heaven's Door",
            25: "Do you love me?",
            26: "Take care of yourself.",
        },
    },
    {
        "malId": 2759,
        "title": "Evangelion: 1.0 You Are (Not) Alone",
        "episodes": 1,
        "url_template": "https://archive.org/download/eva-complete-series-movies-bd-1080p/Evangelion_1.11_You_Are_(Not)_Alone_(2009)_[1080p,BluRay,x264,DTS-ES]_-_THORA/Evangelion_1.11_You_Are_(Not)_Alone_(2009)_[1080p,BluRay,x264,DTS-ES]_-_THORA.mkv",
        "stream_index": 0,
    },
    {
        "malId": 28851,
        "title": "A Silent Voice",
        "episodes": 1,
        "url_template": "https://archive.org/download/db-a-silent-voice-dual-audio-10bit-bd-1080p-x-265/%5BDB%5DA%20Silent%20Voice_-_%28Dual%20Audio_10bit_BD1080p_x265%29.mkv",
        "stream_index": 6,  # [visiccitude] Full Subtitles
    },
]

def extract_subtitle_stream(url: str, stream_index: int, out_path: Path, timeout: int = 120) -> bool:
    """Extract a subtitle stream from a remote file to a local ASS file."""
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

def build_url(template: str, ep: int, episode_titles: dict = None) -> str:
    """Build URL, substituting {ep}, {ep:02}, and {title}."""
    url = template
    # Substitute {ep:02} and {ep}
    url = re.sub(r'\{ep(?::(\d+))?\}', lambda m: str(ep).zfill(int(m.group(1))) if m.group(1) else str(ep), url)
    # Substitute {title}
    if '{title}' in url and episode_titles:
        title = episode_titles.get(ep, '')
        url = url.replace('{title}', title.replace(' ', '%20'))
    return url

def main():
    print(f"Extracting subtitles for {len(EXTRACT_TARGETS)} anime")
    print(f"Output: {SUB_DIR}/")
    print()

    total_success = 0
    total_failed = 0
    total_skipped = 0

    for target in EXTRACT_TARGETS:
        mal_id = target['malId']
        title = target['title']
        episodes = target['episodes']
        url_template = target['url_template']
        stream_index = target['stream_index']
        episode_titles = target.get('episode_titles')

        print(f"=== {title} (malId={mal_id}) — {episodes} episodes ===")

        for ep in range(1, episodes + 1):
            vtt_path = SUB_DIR / f"{mal_id}_e{ep}.vtt"

            # Skip if already extracted
            if vtt_path.exists() and vtt_path.stat().st_size > 200:
                print(f"  ep {ep}: already exists ({vtt_path.stat().st_size} bytes), skipping")
                total_skipped += 1
                continue

            url = build_url(url_template, ep, episode_titles)
            ass_path = SUB_DIR / f"{mal_id}_e{ep}.ass"

            print(f"  ep {ep}: extracting stream {stream_index} from {url[:80]}...")

            if not extract_subtitle_stream(url, stream_index, ass_path):
                print(f"  ep {ep}: FAILED to extract")
                total_failed += 1
                if ass_path.exists():
                    ass_path.unlink()
                continue

            # Convert ASS to VTT
            conv = subprocess.run(
                ["python3", str(ROOT / "scripts" / "ass_to_vtt.py"), str(ass_path), str(vtt_path)],
                capture_output=True, text=True,
            )
            if conv.returncode != 0:
                print(f"  ep {ep}: ASS→VTT conversion failed: {conv.stderr[:200]}")
                total_failed += 1
                ass_path.unlink(missing_ok=True)
                continue

            # Clean up ASS file
            ass_path.unlink(missing_ok=True)

            size = vtt_path.stat().st_size
            if size < 200:
                print(f"  ep {ep}: VTT too small ({size} bytes), may be empty")
                total_failed += 1
                vtt_path.unlink(missing_ok=True)
                continue

            print(f"  ep {ep}: OK ({size} bytes)")
            total_success += 1

        print()

    print(f"=== Summary ===")
    print(f"Success: {total_success}")
    print(f"Skipped (already existed): {total_skipped}")
    print(f"Failed: {total_failed}")
    return 0 if total_failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
