#!/usr/bin/env python3
"""Generate seed entries for all WCO anime not already in the seed."""
import json
import re

# Load WCO lists
dub = json.load(open('/tmp/wco_all_anime.json'))
sub = json.load(open('/tmp/wco_all_sub.json'))

# Load existing seed to find already-added titles
with open('/home/z/my-project/src/lib/seed.ts', 'r') as f:
    seed_content = f.read()

# Extract existing titles
existing_titles = set()
for m in re.finditer(r'title:\s*"([^"]+)"', seed_content):
    existing_titles.add(m.group(1).lower())

# Hentai keywords to filter out
hentai_keywords = [
    'hentai', 'ecchi', 'porn', 'sex', 'nude', 'naked', 'xxx',
    'breast', 'boob', 'panty', 'pantie', 'lingerie', 'nudity',
    'uncensored'  # Keep this for now - Prison School is uncensored but not hentai
]
# Actually "uncensored" alone isn't hentai - let me be more specific
hentai_keywords = [
    'hentai', 'porn', 'sex ', 'sexual', 'nude anime', 'xxx anime',
    'breast ', 'boob ', 'panty ', 'pantie ', 'lingerie '
]

# Build combined list: name -> {dub_slug, sub_slug}
all_anime = {}
for name, slug in dub.items():
    if name not in all_anime:
        all_anime[name] = {}
    all_anime[name]['dub'] = slug
for name, slug in sub.items():
    if name not in all_anime:
        all_anime[name] = {}
    all_anime[name]['sub'] = slug

# Filter out already-added and hentai
new_anime = []
for name, slugs in sorted(all_anime.items()):
    name_lower = name.lower()
    # Skip if already in seed
    if name_lower in existing_titles:
        continue
    # Skip hentai
    if any(kw in name_lower for kw in hentai_keywords):
        continue
    # Skip if name is too short or just numbers
    if len(name) < 2:
        continue
    new_anime.append((name, slugs))

print(f"Total WCO anime: {len(all_anime)}")
print(f"Already in seed: {len(all_anime) - len(new_anime)}")
print(f"New anime to add: {len(new_anime)}")

# Generate seed entries
# Use negative MAL IDs starting from -100 to avoid conflicts
mal_id = -100
entries = []
for name, slugs in new_anime:
    # Determine the slug to use for fileTemplate
    # Use dub slug if available, otherwise sub slug
    primary_slug = slugs.get('dub') or slugs.get('sub')
    has_dub = 'dub' in slugs
    has_sub = 'sub' in slugs
    
    # Generate the episode source
    sources = []
    if has_dub:
        sources.append(f'      {{ startEp: 1, endEp: 999, collection: "wco-resolver", audio: "dub", sourceType: "wco_resolver", fileTemplate: "{primary_slug}-episode-{{ep}}-english-dubbed" }},')
    if has_sub:
        sub_slug = slugs.get('sub', primary_slug)
        sources.append(f'      {{ startEp: 1, endEp: 999, collection: "wco-resolver", audio: "sub", sourceType: "wco_resolver", fileTemplate: "{sub_slug}-episode-{{ep}}-english-subbed" }},')
    
    has_flags = []
    if has_dub:
        has_flags.append("hasDub: true")
    if has_sub:
        has_flags.append("hasSub: true")
    has_str = ", ".join(has_flags)
    
    # Escape quotes in name
    safe_name = name.replace('"', '\\"')
    
    entry = f'''  // {safe_name}
  {{ malId: {mal_id}, title: "{safe_name}", titleEnglish: "{safe_name}", titleJapanese: "",
    synopsis: "Watch {safe_name} online in HD.",
    poster: "", banner: "",
    type: "TV", status: "Finished Airing", score: 0, scoredBy: 0, rank: 0, popularity: 9999, members: 0,
    year: 2020, season: "unknown", genres: [], studios: [],
    episodeCount: 999, duration: "24 min per ep", rating: "PG-13", source: "Unknown",
    episodeSources: [
{chr(10).join(sources)}
    ], {has_str},
  }},'''
    entries.append(entry)
    mal_id -= 1

# Write to file
with open('/tmp/new_anime_entries.txt', 'w') as f:
    f.write("\n".join(entries))

print(f"\nGenerated {len(entries)} seed entries")
print(f"MAL ID range: -100 to {mal_id + 1}")
print(f"Written to /tmp/new_anime_entries.txt")
