#!/usr/bin/env python3
"""
Fetch poster images and metadata from Jikan API (unofficial MAL API)
for all anime in seed.ts that are missing posters.

Rate limit: 60 requests per minute (3 per second).
We process in batches with delays.

Output:
  - /home/z/my-project/scripts/poster_cache.json — cached API responses
  - Updates src/lib/seed.ts with poster URLs
"""

import json
import re
import time
import urllib.request
import urllib.parse
import os
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
CACHE_FILE = Path("/home/z/my-project/scripts/poster_cache.json")

# Load cache
if CACHE_FILE.exists():
    cache = json.loads(CACHE_FILE.read_text())
    print(f"Loaded cache with {len(cache)} entries")
else:
    cache = {}


def jikan_search(title: str) -> dict | None:
    """Search Jikan API for an anime by title. Returns the first match."""
    # Check cache first
    cache_key = title.lower().strip()
    if cache_key in cache:
        return cache[cache_key]
    
    # Rate limit: 3 req/sec, but we'll be conservative with 1 req per 1.2s
    url = f"https://api.jikan.moe/v4/anime?q={urllib.parse.quote(title)}&limit=1&sfw=true"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Ichidoki/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            if data.get("data") and len(data["data"]) > 0:
                anime = data["data"][0]
                result = {
                    "malId": anime.get("mal_id"),
                    "title": anime.get("title"),
                    "poster": anime.get("images", {}).get("jpg", {}).get("large_image_url", ""),
                    "synopsis": anime.get("synopsis", ""),
                    "score": anime.get("score", 0),
                    "scoredBy": anime.get("scored_by", 0),
                    "rank": anime.get("rank", 0),
                    "popularity": anime.get("popularity", 0),
                    "members": anime.get("members", 0),
                    "year": anime.get("year"),
                    "season": anime.get("season"),
                    "genres": [g.get("name", "") for g in anime.get("genres", [])],
                    "studios": [s.get("name", "") for s in anime.get("studios", [])],
                    "type": anime.get("type", "TV"),
                    "status": anime.get("status", ""),
                    "episodeCount": anime.get("episodes", 12),
                    "duration": anime.get("duration", ""),
                    "rating": anime.get("rating", ""),
                }
                cache[cache_key] = result
                return result
            else:
                cache[cache_key] = None
                return None
    except Exception as e:
        print(f"  ERROR for '{title}': {e}")
        return None


def save_cache():
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


# Parse seed.ts to find all anime blocks with empty posters
text = SEED.read_text(encoding="utf-8")
lines = text.splitlines()

anime_start_re = re.compile(r'^  \{\s*malId:\s*(-?\d+),\s*title:\s*"([^"]+)"')
anime_end_re = re.compile(r'^  \},\s*$')
poster_re = re.compile(r'poster:\s*"([^"]*)"')

current = None
needs_poster = []

for i, line in enumerate(lines):
    m = anime_start_re.match(line)
    if m:
        current = {
            "malId": int(m.group(1)),
            "title": m.group(2),
            "line": i,
            "poster": "",
        }
        pm = poster_re.search(line)
        if pm:
            current["poster"] = pm.group(1)
        continue
    if current:
        pm = poster_re.search(line)
        if pm and not current["poster"]:
            current["poster"] = pm.group(1)
        if anime_end_re.match(line):
            if not current["poster"]:
                needs_poster.append(current)
            current = None

print(f"Found {len(needs_poster)} anime without posters.")

# Check how many are already cached
uncached = [a for a in needs_poster if a["title"].lower().strip() not in cache]
cached = [a for a in needs_poster if a["title"].lower().strip() in cache]
print(f"  Already cached: {len(cached)}")
print(f"  Need to fetch: {len(uncached)}")

# Fetch posters for uncached anime
# Process in batches of 50, then save cache
BATCH_SIZE = 50
fetched = 0
for i, anime in enumerate(uncached):
    title = anime["title"]
    print(f"  [{i+1}/{len(uncached)}] Fetching: {title[:50]}...", end=" ", flush=True)
    result = jikan_search(title)
    if result:
        print(f"OK (poster: {result['poster'][:60]}...)")
        fetched += 1
    else:
        print("NOT FOUND")
    
    # Rate limit: 1.2s between requests (50 req/min)
    time.sleep(1.2)
    
    # Save cache every BATCH_SIZE requests
    if (i + 1) % BATCH_SIZE == 0:
        save_cache()
        print(f"  --- Saved cache ({len(cache)} entries) ---")

# Final cache save
save_cache()
print(f"\nFetched {fetched}/{len(uncached)} posters.")
print(f"Cache now has {len(cache)} entries.")

# Print summary
found = sum(1 for a in needs_poster if cache.get(a["title"].lower().strip()))
print(f"\nTotal anime with poster now available: {found}/{len(needs_poster)}")
