import urllib.request, json, sys

# All sections we currently fetch on the home page
SECTIONS = [
    "spotlight", "trending", "popular", "watched", "airing", "favorite",
    "top-today", "top-week", "top-month", "top-rated", "new-releases", "classic"
]

# Hardcoded intro times from src/lib/video-sources.ts
INTRO_TIMES_MAL_IDS = {
    21, 1735, 20, 11061, 31964, 30276,
    38000, 40748, 34599, 44511, 48654, 35349, 51009,
    16498, 28851, 9253, 5114, 2001, 30, 1, 245,
    52991, 38524, 42310, 53998, 58514, 20583, 62076, 41467,
}

BASE = "http://localhost:3000"
all_anime = {}  # malId -> { title, malId, sections: [], score, year, type, episodes }

for section in SECTIONS:
    try:
        url = f"{BASE}/api/anilist?section={section}&perPage=50"
        with urllib.request.urlopen(url, timeout=30) as r:
            data = json.loads(r.read())
        for a in data.get("results", []):
            mal_id = a.get("malId")
            if not mal_id:
                continue
            if mal_id not in all_anime:
                all_anime[mal_id] = {
                    "anilist_id": a["id"],
                    "mal_id": mal_id,
                    "title": a["title"],
                    "type": a.get("type"),
                    "score": a.get("score"),
                    "year": a.get("year"),
                    "episodes": a.get("episodeCount"),
                    "status": a.get("status"),
                    "sections": [],
                }
            all_anime[mal_id]["sections"].append(section)
    except Exception as e:
        print(f"  ! section {section}: {e}", file=sys.stderr)

# Build the report
total = len(all_anime)
with_intro = sum(1 for a in all_anime.values() if a["mal_id"] in INTRO_TIMES_MAL_IDS)

# Sort by score desc
anime_list = sorted(all_anime.values(), key=lambda x: (float(x["score"] or 0)), reverse=True)

print(f"# Anime Catalog Audit")
print(f"\n**Total unique anime with episodes:** {total}")
print(f"**Anime with Skip Intro:** {with_intro} / {total} ({with_intro*100//total}%)")
print(f"**Sections:** {len(SECTIONS)}\n")

# Group by section count (anime in more sections are more popular)
print("## By Popularity (sections count)")
print()
counts = {}
for a in anime_list:
    n = len(a["sections"])
    counts[n] = counts.get(n, 0) + 1
for n in sorted(counts.keys(), reverse=True):
    print(f"- **{n} sections:** {counts[n]} anime")

print("\n## Full Catalog (sorted by score)")
print()
print("| # | Title | MAL ID | Type | Year | Score | Eps | Sections | Skip Intro |")
print("|---|-------|--------|------|------|-------|-----|----------|-----------|")
for i, a in enumerate(anime_list, 1):
    has_skip = "Yes" if a["mal_id"] in INTRO_TIMES_MAL_IDS else "No"
    sections = ", ".join(sorted(set(a["sections"])))
    eps = a["episodes"] or "?"
    score = a["score"] or "-"
    print(f"| {i} | {a['title']} | {a['mal_id']} | {a['type']} | {a['year']} | {score} | {eps} | {sections} | {has_skip} |")

# Save as JSON for the user
with open("/home/z/my-project/download/anime_catalog_audit.json", "w") as f:
    json.dump({
        "total_anime": total,
        "with_intro_skip": with_intro,
        "sections": SECTIONS,
        "anime": anime_list,
    }, f, indent=2)

print(f"\n(JSON saved to /home/z/my-project/download/anime_catalog_audit.json)")
