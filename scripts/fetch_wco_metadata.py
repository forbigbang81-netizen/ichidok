#!/usr/bin/env python3
"""Fetch real posters and episode counts from Jikan (MAL API) for WCO anime."""
import json
import re
import time
import urllib.request
import urllib.error
import urllib.parse

# Load the selected anime
selected = json.load(open('/tmp/selected_anime.json'))
print(f"Total anime to fetch: {len(selected)}")

# Load already-fetched data if exists
try:
    fetched = json.load(open('/tmp/wco_anime_metadata.json'))
    print(f"Already fetched: {len(fetched)}")
except:
    fetched = {}

def search_jikan(title, retries=3):
    """Search Jikan for an anime by title, return first result."""
    for attempt in range(retries):
        try:
            url = f"https://api.jikan.moe/v4/anime?q={urllib.parse.quote(title)}&limit=1&sfw=true"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                if data.get('data'):
                    anime = data['data'][0]
                    return {
                        'malId': anime.get('mal_id'),
                        'title': anime.get('title'),
                        'poster': anime.get('images', {}).get('jpg', {}).get('large_image_url', ''),
                        'episodeCount': anime.get('episodes', 0) or 0,
                        'score': anime.get('score', 0) or 0,
                        'year': anime.get('year') or anime.get('aired', {}).get('from', '')[:4] or 2020,
                        'season': anime.get('season', ''),
                        'genres': ','.join(g['name'] for g in anime.get('genres', [])),
                        'studios': ','.join(s['name'] for s in anime.get('studios', [])),
                        'synopsis': (anime.get('synopsis') or '')[:300],
                        'type': anime.get('type', 'TV'),
                        'status': anime.get('status', 'Finished Airing'),
                        'rating': anime.get('rating', 'PG-13'),
                    }
                return None
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                print(f" (rate limited, waiting 5s)", end='')
                time.sleep(5)
            elif e.code == 504:  # Gateway timeout
                print(f" (504, retry {attempt+1})", end='')
                time.sleep(3)
            else:
                return None
        except Exception as e:
            print(f" (error: {str(e)[:30]})", end='')
            time.sleep(2)
    return None

# Fetch with slower rate (1 req per 1.5 seconds)
for i, (name, slugs) in enumerate(selected):
    if name in fetched and fetched[name] is not None:
        continue
    
    print(f"[{i+1}/{len(selected)}] {name[:40]}...", end=' ')
    metadata = search_jikan(name)
    
    if metadata:
        fetched[name] = metadata
        print(f"✓ ID:{metadata['malId']} eps:{metadata['episodeCount']}")
    else:
        fetched[name] = None
        print("✗")
    
    # Save progress every 5 anime
    if (i + 1) % 5 == 0:
        with open('/tmp/wco_anime_metadata.json', 'w') as f:
            json.dump(fetched, f, indent=2)
    
    # Slower rate: 1.5 seconds between requests
    time.sleep(1.5)

# Final save
with open('/tmp/wco_anime_metadata.json', 'w') as f:
    json.dump(fetched, f, indent=2)

found = sum(1 for v in fetched.values() if v is not None)
print(f"\nDone! Found metadata for {found}/{len(selected)} anime")
