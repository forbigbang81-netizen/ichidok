#!/usr/bin/env python3
"""
Fetch posters in batches. Run with: python3 fetch_batch.py <start> <count>
"""

import json
import re
import time
import urllib.request
import sys
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
CACHE_FILE = Path("/home/z/my-project/scripts/anilist_cache.json")

# Load cache
if CACHE_FILE.exists():
    cache = json.loads(CACHE_FILE.read_text())
else:
    cache = {}


def anilist_search(title: str) -> dict | None:
    cache_key = title.lower().strip()
    if cache_key in cache:
        return cache[cache_key]
    
    query = """
    query ($search: String) {
      Page(perPage: 1) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id idMal
          title { romaji english native }
          coverImage { large extraLarge }
          bannerImage
          description(asHtml: false)
          averageScore
          popularity
          favourites
          episodes
          format
          status
          season
          seasonYear
          genres
          duration
          studios(isMain: true) { nodes { name } }
          source
        }
      }
    }
    """
    
    payload = json.dumps({"query": query, "variables": {"search": title}}).encode("utf-8")
    req = urllib.request.Request(
        "https://graphql.anilist.co",
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0"},
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            media_list = data.get("data", {}).get("Page", {}).get("media", [])
            if media_list:
                m = media_list[0]
                formatted = {
                    "anilistId": m.get("id"),
                    "malId": m.get("idMal"),
                    "title": m.get("title", {}).get("romaji") or title,
                    "titleEnglish": m.get("title", {}).get("english"),
                    "titleJapanese": m.get("title", {}).get("native"),
                    "poster": m.get("coverImage", {}).get("extraLarge") or m.get("coverImage", {}).get("large", ""),
                    "banner": m.get("bannerImage", ""),
                    "synopsis": (m.get("description") or "")[:500],
                    "score": (m.get("averageScore") or 0) / 10.0,
                    "popularity": m.get("popularity", 0),
                    "members": m.get("favourites", 0),
                    "episodeCount": m.get("episodes", 12),
                    "type": "TV" if m.get("format") == "TV" else (m.get("format") or "TV"),
                    "status": (m.get("status") or "").replace("_", " ").title(),
                    "year": m.get("seasonYear"),
                    "season": (m.get("season") or "").lower(),
                    "genres": m.get("genres", []),
                    "studios": [s.get("name", "") for s in m.get("studios", {}).get("nodes", [])],
                    "duration": f"{m.get('duration')} min per ep" if m.get("duration") else None,
                    "source": (m.get("source") or "").replace("_", " ").title(),
                }
                cache[cache_key] = formatted
                return formatted
            else:
                cache[cache_key] = None
                return None
    except Exception as e:
        return None


# Parse seed.ts
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
        current = {"malId": int(m.group(1)), "title": m.group(2), "poster": ""}
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

uncached = [a for a in needs_poster if a["title"].lower().strip() not in cache]

# Process batch
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
batch = uncached[start:start + count]

print(f"Cache: {len(cache)} entries, {sum(1 for v in cache.values() if v)} found")
print(f"Uncached: {len(uncached)}")
print(f"Processing batch: [{start}:{start+count}] = {len(batch)} anime")

fetched = 0
for i, anime in enumerate(batch):
    title = anime["title"].replace("&amp;", "&").replace("&quot;", '"').replace("&#039;", "'")
    result = anilist_search(title)
    if result:
        fetched += 1
        status = f"OK  malId={result.get('malId')}"
    else:
        status = "NOT FOUND"
    print(f"  [{start+i+1}/{len(uncached)}] {title[:45]:<45} -> {status}")
    time.sleep(0.7)

# Save cache
cache_data = json.dumps(cache, indent=2)
CACHE_FILE.write_text(cache_data)
print(f"\nBatch done: {fetched}/{len(batch)} found. Cache: {len(cache)} entries.")
