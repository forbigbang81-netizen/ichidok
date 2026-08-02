#!/usr/bin/env python3
"""Fetch actual episode counts from WCO sites for each anime."""
import json
import re
import time
import urllib.request
import urllib.error

# Load the selected anime
selected = json.load(open('/tmp/selected_anime.json'))
print(f"Total anime: {len(selected)}")

# Load already-fetched counts
try:
    counts = json.load(open('/tmp/wco_episode_counts.json'))
    print(f"Already fetched: {len(counts)}")
except:
    counts = {}

def fetch_episode_count(slug, audio='dub'):
    """Fetch the episode count from wcoforever.net for this anime."""
    sites = [
        f"https://www.wcoforever.net/anime/{slug}?season=all",
        f"https://www.wcoanimedub.tv/anime/{slug}?season=all",
    ]
    
    for url in sites:
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                
                # Count episode links
                # Pattern: /slug-episode-N-english-dubbed or /slug-episode-N-english-subbed
                audio_word = 'dubbed' if audio == 'dub' else 'subbed'
                episodes = set()
                for m in re.finditer(r'episode-(\d+)-english-' + audio_word, html, re.IGNORECASE):
                    episodes.add(int(m.group(1)))
                
                if episodes:
                    return max(episodes)
        except Exception as e:
            pass
    
    return None

# Fetch episode counts
for i, (name, slugs) in enumerate(selected):
    if name in counts and counts[name] is not None:
        continue
    
    slug = slugs.get('dub') or slugs.get('sub')
    audio = 'dub' if 'dub' in slugs else 'sub'
    
    print(f"[{i+1}/{len(selected)}] {name[:40]}...", end=' ')
    
    count = fetch_episode_count(slug, audio)
    
    if count:
        counts[name] = count
        print(f"✓ {count} episodes")
    else:
        counts[name] = None
        print("✗")
    
    # Save progress every 5 anime
    if (i + 1) % 5 == 0:
        with open('/tmp/wco_episode_counts.json', 'w') as f:
            json.dump(counts, f, indent=2)
    
    # Rate limit: 0.5s between requests
    time.sleep(0.5)

# Final save
with open('/tmp/wco_episode_counts.json', 'w') as f:
    json.dump(counts, f, indent=2)

found = sum(1 for v in counts.values() if v is not None)
print(f"\nDone! Found episode counts for {found}/{len(selected)} anime")
