#!/usr/bin/env python3
"""
Fetch poster images and full metadata from AniList GraphQL API
for all anime in seed.ts that are missing posters.
"""

import json
import re
import time
import urllib.request
from pathlib import Path

SEED = Path("/home/z/my-project/src/lib/seed.ts")
CACHE_FILE = Path("/home/z/my-project/scripts/anilist_cache.json")

# Load cache
if CACHE_FILE.exists():
    cache = json.loads(CACHE_FILE.read_text())
    print(f"Loaded cache with {len(cache)} entries")
else:
    cache = {}


def anilist_search(title: str) -> dict | None:
    """Search AniList for an anime by title."""
    cache_key = title.lower().strip()
    if cache_key in cache:
        return cache[cache_key]
    
    query = """
    query ($search: String) {
      Page(perPage: 1) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          idMal
          title { romaji english native }
          coverImage { large extraLarge medium color }
          bannerImage
          description(asHtml: false)
          averageScore
          meanScore
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
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
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
                    "title": m.get("title", {}).get("romaji") or m.get("title", {}).get("english") or title,
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
                    "year": m.get("seasonYear") or m.get("year"),
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
        print(f"  ERROR: {e}")
        return None


def save_cache():
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


# Parse seed.ts to find anime needing posters
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
        current = {"malId": int(m.group(1)), "title": m.group(2), "line": i, "poster": ""}
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
uncached = [a for a in needs_poster if a["title"].lower().strip() not in cache]
print(f"  Already cached: {len(needs_poster) - len(uncached)}")
print(f"  Need to fetch: {len(uncached)}")

# Fetch
DELAY = 0.8
fetched = 0
not_found = 0

for i, anime in enumerate(uncached):
    title = anime["title"].replace("&amp;", "&").replace("&quot;", '"').replace("&#039;", "'")
    
    result = anilist_search(title)
    if result:
        fetched += 1
        status = f"OK  malId={result.get('malId')}  poster={'Y' if result.get('poster') else 'N'}"
    else:
        not_found += 1
        status = "NOT FOUND"
    
    print(f"  [{i+1}/{len(uncached)}] {title[:45]:<45} -> {status}")
    time.sleep(DELAY)
    
    if (i + 1) % 30 == 0:
        save_cache()
        print(f"  --- Saved cache ({len(cache)} entries, fetched={fetched}, not_found={not_found}) ---")

save_cache()
print(f"\n=== Summary ===")
print(f"Fetched: {fetched}")
print(f"Not found: {not_found}")
print(f"Cache entries: {len(cache)}")
