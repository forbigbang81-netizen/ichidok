#!/usr/bin/env python3
"""
Fetch file listings for MHA collections from archive.org and generate
episodeFiles maps for the seed.ts entry.
"""
import json
import re
import urllib.request

COLLECTIONS = {
    "s1_sub": "mha-s1-full",
    "s1_dub": "my-hero-episode-1-season-1-dub",
    "s2_sub": "mha-s2-full",
    "s2_dub": "myheroacademiaseasontwo",
    "s3_sub": "mha-s3-full",
    "s4_sub": "mha-s4-full",
    "s5_sub": "mha-s5-full",
    "s6_sub": "mha-s6-full",
    "s6_dub": "s-6.-e-8-league-of-villains-vs.-u.-a.-students",
    "s7_sub": "mha-s7-full",
}


def fetch_files(identifier):
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read())
    files = data.get("files", [])
    return [f["name"] for f in files if f.get("name", "").endswith(".mp4")]


def parse_s1_dub(files):
    """Parse my-hero-episode-1-season-1-dub filenames to episode numbers."""
    ep_map = {}
    for name in files:
        m = re.search(r"episode.?(\d+)", name, re.I)
        if m:
            ep = int(m.group(1))
            ep_map[ep] = name
    return ep_map


def parse_s2_dub(files):
    """Parse myheroacademiaseasontwo filenames to episode numbers."""
    ep_map = {}
    for name in files:
        m = re.match(r"^(\d+)", name)
        if m:
            ep = int(m.group(1))
            ep_map[ep] = name
    return ep_map


def parse_s6_dub(files):
    """Parse S6 dub filenames (S6.E1 ∙ Title.mp4) to episode numbers."""
    ep_map = {}
    for name in files:
        m = re.search(r"S6\.E(\d+)", name, re.I)
        if m:
            ep = int(m.group(1))
            ep_map[ep] = name
    return ep_map


def parse_sub_full(files):
    """Parse mha-sN-full filenames (AnimePahe_..._NNN_BD_..._.mp4) to episode numbers."""
    ep_map = {}
    for name in files:
        m = re.search(r"_-_(\d+)_", name)
        if m:
            ep = int(m.group(1))
            ep_map[ep] = name
    return ep_map


def to_ts_object(ep_map, collection):
    """Convert episode map to a TypeScript object literal string."""
    lines = []
    for ep in sorted(ep_map.keys()):
        fname = ep_map[ep]
        # Escape single quotes in filename
        safe_fname = fname.replace("'", "\\'")
        lines.append(f'          {ep}: "{safe_fname}",')
    return "\n".join(lines)


def main():
    results = {}
    for key, ident in COLLECTIONS.items():
        print(f"\n=== {key} ({ident}) ===")
        try:
            files = fetch_files(ident)
            print(f"  Total MP4 files: {len(files)}")
            if "s1_dub" in key:
                ep_map = parse_s1_dub(files)
            elif "s2_dub" in key:
                ep_map = parse_s2_dub(files)
            elif "s6_dub" in key:
                ep_map = parse_s6_dub(files)
            else:
                ep_map = parse_sub_full(files)
            print(f"  Parsed episodes: {len(ep_map)}")
            print(f"  Episodes: {sorted(ep_map.keys())}")
            results[key] = ep_map
        except Exception as e:
            print(f"  ERROR: {e}")
            results[key] = {}

    # Save results
    with open("/tmp/mha_episode_maps.json", "w") as f:
        json.dump(results, f, indent=2)

    # Print TypeScript snippets
    print("\n\n=== TypeScript episodeFiles maps ===\n")
    for key, ep_map in results.items():
        if not ep_map:
            continue
        print(f"\n--- {key} ---")
        print(to_ts_object(ep_map, COLLECTIONS[key]))


if __name__ == "__main__":
    main()
