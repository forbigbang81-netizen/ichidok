#!/usr/bin/env python3
"""
Download all 25 Berserk 1997 English subtitles (haiku BluRay release) from
OpenSubtitles, convert SRT to VTT, and save to /public/subtitles/33_e{ep}.vtt.

These are high-quality English dialogue subs for the Japanese audio track.
The haiku release uses the format: berserk.eNN.1080p.bluray.x264-haiku.eng.srt
"""

import gzip
import json
import os
import re
import time
import urllib.request

MAL_ID = 33
OUT_DIR = "/home/z/my-project/public/subtitles"
USER_AGENT = "TemporaryUserAgent"


def fetch_gz(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    return gzip.decompress(data).decode("utf-8", errors="replace")


def srt_to_vtt(srt_text):
    """Convert SRT to WebVTT format."""
    text = srt_text.replace("\r\n", "\n").replace("\r", "\n")
    vtt = "WEBVTT\n\n"
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
        # Skip SRT index number
        if lines[0].strip().isdigit():
            lines = lines[1:]
        if len(lines) < 2:
            continue
        # Convert timestamp: 00:00:01,000 --> 00:00:05,000
        # to: 00:00:01.000 --> 00:00:05.000
        timing = lines[0].replace(",", ".")
        if "-->" not in timing:
            continue
        vtt += timing + "\n"
        vtt += "\n".join(lines[1:]) + "\n\n"
    return vtt


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Load the haiku search results
    with open("/tmp/os_haiku2.json") as f:
        results = json.load(f)

    # Parse episode -> subtitle mapping
    eps = {}
    for r in results:
        fname = r.get("SubFileName", "")
        m = re.search(r"berserk\.e(\d+)", fname, re.I)
        if m:
            ep = int(m.group(1))
            eps[ep] = r

    print(f"Found subtitles for {len(eps)} episodes")
    print(f"Missing: {[ep for ep in range(1, 26) if ep not in eps]}")

    success = 0
    failed = []
    for ep in range(1, 26):
        if ep not in eps:
            failed.append(ep)
            continue
        r = eps[ep]
        fname = r.get("SubFileName", "")
        dl_url = r.get("SubDownloadLink", "")
        print(f"\nEp{ep}: {fname}")
        try:
            content = fetch_gz(dl_url)
            vtt = srt_to_vtt(content)
            out_path = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep}.vtt")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(vtt)
            print(f"  Saved: {out_path} ({len(vtt)} bytes)")
            success += 1
        except Exception as e:
            print(f"  FAILED: {e}")
            failed.append(ep)
        time.sleep(2)  # Rate limit

    print(f"\n=== DONE: {success}/25 succeeded ===")
    if failed:
        print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
