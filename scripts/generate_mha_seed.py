#!/usr/bin/env python3
"""
Generate TypeScript seed entries for MHA seasons 1-7 with episodeFiles maps.
Outputs TypeScript code that can be pasted into seed.ts.
"""
import json
import re

# Load the episode maps from the fetch script
with open("/tmp/mha_episode_maps.json") as f:
    data = json.load(f)

# MHA season metadata
SEASONS = [
    {
        "malId": 31964, "title": "My Hero Academia", "titleJp": "僕のヒーローアカデミア",
        "year": 2016, "season": "spring", "score": 7.82, "popularity": 50, "members": 2500000,
        "episodes": 13, "synopsis": "Izuku Midoriya dreams of becoming a hero in a world where almost everyone has superpowers called Quirks. Born without a Quirk, he is chosen by the legendary hero All Might to inherit his power.",
        "poster": "/posters/mha-s1.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s1_sub", "dub_key": "s1_dub",
        "sub_collection": "mha-s1-full", "dub_collection": "my-hero-episode-1-season-1-dub",
    },
    {
        "malId": 33458, "title": "My Hero Academia Season 2", "titleJp": "僕のヒーローアカデミア 2ndシーズン",
        "year": 2017, "season": "spring", "score": 8.00, "popularity": 80, "members": 2000000,
        "episodes": 25, "synopsis": "The U.A. High School students participate in the sports festival and begin their internships with pro heroes, facing new threats.",
        "poster": "/posters/mha-s2.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s2_sub", "dub_key": "s2_dub",
        "sub_collection": "mha-s2-full", "dub_collection": "myheroacademiaseasontwo",
    },
    {
        "malId": 36474, "title": "My Hero Academia Season 3", "titleJp": "僕のヒーローアカデミア 3rdシーズン",
        "year": 2018, "season": "spring", "score": 7.93, "popularity": 100, "members": 1800000,
        "episodes": 25, "synopsis": "Class 1-A goes to a summer training camp, but the League of Villains attacks. All Might faces All For One in a battle that changes everything.",
        "poster": "/posters/mha-s3.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s3_sub", "dub_key": None,
        "sub_collection": "mha-s3-full", "dub_collection": None,
    },
    {
        "malId": 38408, "title": "My Hero Academia Season 4", "titleJp": "僕のヒーローアカデミア 4thシーズン",
        "year": 2019, "season": "fall", "score": 7.50, "popularity": 120, "members": 1700000,
        "episodes": 25, "synopsis": "Deku works with Sir Nighteye to investigate the Shie Hassaikai yakuza group and rescue a young girl named Eri.",
        "poster": "/posters/mha-s4.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s4_sub", "dub_key": None,
        "sub_collection": "mha-s4-full", "dub_collection": None,
    },
    {
        "malId": 41587, "title": "My Hero Academia Season 5", "titleJp": "僕のヒーローアカデミア 5thシーズン",
        "year": 2021, "season": "spring", "score": 7.30, "popularity": 150, "members": 1500000,
        "episodes": 25, "synopsis": "Class 1-A and 1-B participate in joint training exercises, while the Meta Liberation Army and the League of Villains merge.",
        "poster": "/posters/mha-s5.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s5_sub", "dub_key": None,
        "sub_collection": "mha-s5-full", "dub_collection": None,
    },
    {
        "malId": 49992, "title": "My Hero Academia Season 6", "titleJp": "僕のヒーローアカデミア 6thシーズン",
        "year": 2022, "season": "fall", "score": 8.17, "popularity": 130, "members": 1600000,
        "episodes": 25, "synopsis": "The Paranormal Liberation War begins as heroes launch a massive raid on the villains' headquarters. Deku discovers the true power of One For All.",
        "poster": "/posters/mha-s6.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s6_sub", "dub_key": "s6_dub",
        "sub_collection": "mha-s6-full", "dub_collection": "s-6.-e-8-league-of-villains-vs.-u.-a.-students",
    },
    {
        "malId": 54945, "title": "My Hero Academia Season 7", "titleJp": "僕のヒーローアカデミア 7thシーズン",
        "year": 2024, "season": "spring", "score": 8.24, "popularity": 200, "members": 800000,
        "episodes": 21, "synopsis": "Star and Stripe arrives to fight Shigaraki, while the final war between heroes and villains reaches its climax.",
        "poster": "/posters/mha-s7.jpg", "genres": ["Action", "Comedy", "Fantasy"],
        "sub_key": "s7_sub", "dub_key": None,
        "sub_collection": "mha-s7-full", "dub_collection": None,
    },
]


def fix_s1_dub_map(ep_map):
    """Fix the S1 dub episode map where ep 10 was parsed as ep 0."""
    if "0" in ep_map or 0 in ep_map:
        # Move ep 0 to ep 10
        val = ep_map.pop(0, None) or ep_map.pop("0", None)
        if val:
            ep_map[10] = val
    return ep_map


def remap_sub_to_local(ep_map, offset):
    """Remap global episode numbers to local (1-based) episode numbers."""
    return {ep - offset: fname for ep, fname in ep_map.items() if ep - offset >= 1}


def to_ts_ep_files(ep_map):
    """Convert episode map to TypeScript object literal."""
    lines = []
    for ep in sorted(ep_map.keys()):
        fname = ep_map[ep]
        safe = fname.replace('"', '\\"')
        lines.append(f'          {ep}: "{safe}",')
    return "\n".join(lines)


def generate_season_entry(s):
    """Generate a TypeScript seed entry for one MHA season."""
    sub_map = data.get(s["sub_key"], {})
    dub_map = data.get(s["dub_key"], {}) if s["dub_key"] else {}

    # Fix S1 dub map
    if s["dub_key"] == "s1_dub":
        dub_map = fix_s1_dub_map(dict(dub_map))

    # Remap sub episodes from global to local
    # Determine offset from the first episode in the map
    if sub_map:
        min_ep = min(int(k) for k in sub_map.keys())
        offset = min_ep - 1
        sub_map_local = {int(k) - offset: v for k, v in sub_map.items()}
    else:
        sub_map_local = {}

    # Dub map should already be 1-based
    dub_map_local = {int(k): v for k, v in dub_map.items()}

    has_sub = len(sub_map_local) > 0
    has_dub = len(dub_map_local) > 0

    lines = []
    lines.append(f'  // My Hero Academia S{s["malId"] % 10 if s["malId"] != 31964 else 1}')
    lines.append(f'  {{ malId: {s["malId"]}, title: "{s["title"]}", titleEnglish: "{s["title"]}", titleJapanese: "{s["titleJp"]}",')
    lines.append(f'    synopsis: "{s["synopsis"]}",')
    lines.append(f'    poster: "{s["poster"]}", banner: "{s["poster"]}",')
    lines.append(f'    type: "TV", status: "Finished Airing", score: {s["score"]}, scoredBy: 500000, rank: 0, popularity: {s["popularity"]}, members: {s["members"]},')
    lines.append(f'    year: {s["year"]}, season: "{s["season"]}", genres: ["Action", "Adventure", "Comedy", "Fantasy"], studios: ["Bones"],')
    lines.append(f'    episodeCount: {s["episodes"]}, duration: "24 min per ep", rating: "PG-13 - Teens 13 or older", source: "Manga", isFeatured: true,')
    lines.append(f'    episodeSources: [')

    if has_dub:
        lines.append(f'      // English dub')
        lines.append(f'      {{')
        lines.append(f'        startEp: 1, endEp: {s["episodes"]}, collection: "{s["dub_collection"]}", audio: "dub",')
        lines.append(f'        episodeFiles: {{')
        lines.append(to_ts_ep_files(dub_map_local))
        lines.append(f'        }},')
        lines.append(f'      }},')

    if has_sub:
        lines.append(f'      // Japanese audio (sub) — 1080p BD rip')
        lines.append(f'      {{')
        lines.append(f'        startEp: 1, endEp: {s["episodes"]}, collection: "{s["sub_collection"]}", audio: "sub",')
        lines.append(f'        episodeFiles: {{')
        lines.append(to_ts_ep_files(sub_map_local))
        lines.append(f'        }},')
        lines.append(f'      }},')

    lines.append(f'    ], hasSub: {"true" if has_sub else "false"}, hasDub: {"true" if has_dub else "false"},')
    lines.append(f'  }},')
    return "\n".join(lines)


def main():
    print("// ===== My Hero Academia (all 7 seasons) =====\n")
    for s in SEASONS:
        print(generate_season_entry(s))
        print()

    # Generate SEASON_GROUPS entry
    print("// ===== MHA season group =====")
    print("{")
    print('  franchise: "My Hero Academia",')
    print("  seasons: [")
    for s in SEASONS:
        label = f"Season {s['malId'] % 10 if s['malId'] != 31964 else 1}"
        print(f'    {{ malId: {s["malId"]}, label: "{label}" }},')
    print("  ],")
    print("},")


if __name__ == "__main__":
    main()
