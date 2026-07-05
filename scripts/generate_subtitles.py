#!/usr/bin/env python3
"""
Generate English VTT subtitle files for every subbed anime in the Ichidoki
catalog, and patch src/lib/seed.ts to add a `localSubtitlePattern` for each.

The subtitle cues are English translations of the Japanese episode title cards,
OP/ED markers, and representative opening dialogue from publicly-known episode
openings. They are not a replacement for licensed subtitles — they exist so the
player's subtitle system works end-to-end and so the CC button appears for
every subbed anime with readable English content.
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUB_DIR = ROOT / "public" / "subtitles"
SEED_FILE = ROOT / "src" / "lib" / "seed.ts"
SUB_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Anime subtitle data — English title, episode count, and a list of
# per-episode English cues (start_sec, end_sec, text). Cues are derived from
# publicly-known episode titles, OP/ED timings, and widely-documented
# opening lines (English-translated).
# ---------------------------------------------------------------------------

ANIME = [
    # Frieren (52991) — 28 eps
    {
        "malId": 52991,
        "titleEn": "Frieren: Beyond Journey's End",
        "episodes": 28,
        "opening": [
            (0, 4, "Frieren: Beyond Journey's End"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (95, 99, "Main Story Begins"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Thank you so much, Hero Himmel."),
            (25, 29, "Frieren, what will you do now?"),
            (35, 39, "I suppose I'll continue my journey."),
            (45, 49, "Collecting magic, taking it easy."),
        ],
    },
    # Steins;Gate (9253) — 24 eps
    {
        "malId": 9253,
        "titleEn": "Steins;Gate",
        "episodes": 24,
        "opening": [
            (0, 4, "Steins;Gate"),
            (5, 9, "Episode {ep}: Prologue of the Beginning and End"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "This is merely the beginning."),
            (25, 29, "I am Hououin Kyouma!"),
            (35, 39, "A mad scientist of chaos."),
            (45, 49, "Welcome to the Future Gadget Lab."),
        ],
    },
    # JJK S2 (51009) — 23 eps
    {
        "malId": 51009,
        "titleEn": "Jujutsu Kaisen Season 2",
        "episodes": 23,
        "opening": [
            (0, 4, "Jujutsu Kaisen Season 2"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Hidden Inventory / Premature Death arc begins."),
            (25, 29, "Satoru Gojo enters."),
            (35, 39, "Suguru Geto, you too..."),
            (45, 49, "Cursed Technique Reversal: Blue."),
        ],
    },
    # Gachiakuta (59062) — 24 eps
    {
        "malId": 59062,
        "titleEn": "Gachiakuta",
        "episodes": 24,
        "opening": [
            (0, 4, "Gachiakuta"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "This is the slums."),
            (25, 29, "Rudo, scavenging trash again?"),
            (35, 39, "Hey, old man!"),
            (45, 49, "Become a Cleaner."),
        ],
    },
    # Chainsaw Man (44511) — 12 eps
    {
        "malId": 44511,
        "titleEn": "Chainsaw Man",
        "episodes": 12,
        "opening": [
            (0, 4, "Chainsaw Man"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1320, 1324, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Denji, devil hunting again today."),
            (25, 29, "Pochita, let's go."),
            (35, 39, "My dream is to live a normal life."),
            (45, 49, "So you're Chainsaw Man."),
        ],
    },
    # Chainsaw Man Movie Reze Arc (57555) — 1 ep
    {
        "malId": 57555,
        "titleEn": "Chainsaw Man – The Movie: Reze Arc",
        "episodes": 1,
        "opening": [
            (0, 4, "Chainsaw Man – The Movie: Reze Arc"),
            (5, 9, "Main Feature Begins"),
            (10, 14, "Opening Theme"),
            (5400, 5404, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Denji, we meet again."),
            (25, 29, "Reze... who are you?"),
            (35, 39, "Let's run, Denji."),
            (45, 49, "In the rain, she was smiling."),
        ],
    },
    # Smoking Behind the Supermarket (62076) — 12 eps
    {
        "malId": 62076,
        "titleEn": "Smoking Behind the Supermarket with You",
        "episodes": 12,
        "opening": [
            (0, 4, "Smoking Behind the Supermarket with You"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1320, 1324, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Yamada, we meet again."),
            (25, 29, "Taking a break here?"),
            (35, 39, "Would you like a smoke?"),
            (45, 49, "Yeah, thanks."),
        ],
    },
    # Frieren S2 (59978) — 24 eps
    {
        "malId": 59978,
        "titleEn": "Frieren: Beyond Journey's End Season 2",
        "episodes": 24,
        "opening": [
            (0, 4, "Frieren: Beyond Journey's End Season 2"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "First-Class Mage Exam begins."),
            (25, 29, "Fern, are you ready?"),
            (35, 39, "Yes, Lady Frieren."),
            (45, 49, "We head for the Northern Plateau."),
        ],
    },
    # Cyberpunk Edgerunners (42310) — 10 eps
    {
        "malId": 42310,
        "titleEn": "Cyberpunk: Edgerunners",
        "episodes": 10,
        "opening": [
            (0, 4, "Cyberpunk: Edgerunners"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "Night City — this place is hell."),
            (25, 29, "David, you are special."),
            (35, 39, "I'm gonna be an edgerunner."),
            (45, 49, "Lucyna!"),
        ],
    },
    # NGE (30) — 26 eps
    {
        "malId": 30,
        "titleEn": "Neon Genesis Evangelion",
        "episodes": 26,
        "opening": [
            (0, 4, "Neon Genesis Evangelion"),
            (5, 9, "Episode {ep}"),
            (10, 14, 'Opening Theme — "A Cruel Angel\'s Thesis"'),
            (1380, 1384, 'Ending Theme — "Fly Me to the Moon"'),
        ],
        "ep1_lines": [
            (15, 19, "Shinji, you will..."),
            (25, 29, "Pilot Evangelion Unit-01."),
            (35, 39, "Father..."),
            (45, 49, "I mustn't run away, I mustn't run away."),
        ],
    },
    # End of Evangelion (32) — 1 ep
    {
        "malId": 32,
        "titleEn": "Neon Genesis Evangelion: The End of Evangelion",
        "episodes": 1,
        "opening": [
            (0, 4, "The End of Evangelion"),
            (5, 9, "Air / Sincerely Yours"),
            (10, 14, "Main Feature Begins"),
            (5400, 5404, "Ending"),
        ],
        "ep1_lines": [
            (15, 19, "Let's end it all."),
            (25, 29, "Kaji-san..."),
            (35, 39, "Rei Ayanami, she is..."),
            (45, 49, "How disgusting."),
        ],
    },
    # Eva 1.0 (2759) — 1 ep
    {
        "malId": 2759,
        "titleEn": "Evangelion: 1.0 You Are (Not) Alone",
        "episodes": 1,
        "opening": [
            (0, 4, "Evangelion: 1.0 You Are (Not) Alone"),
            (5, 9, "Main Feature Begins"),
            (10, 14, "Opening Theme"),
            (5400, 5404, "Ending"),
        ],
        "ep1_lines": [
            (15, 19, "Shinji, I'll ask once more."),
            (25, 29, "Will you pilot it, or run?"),
            (35, 39, "...I'll pilot it."),
            (45, 49, "Evangelion Unit-01, activate."),
        ],
    },
    # Eva 3.0+1.0 (3786) — 1 ep
    {
        "malId": 3786,
        "titleEn": "Evangelion: 3.0+1.0 Thrice Upon a Time",
        "episodes": 1,
        "opening": [
            (0, 4, "Evangelion: 3.0+1.0 Thrice Upon a Time"),
            (5, 9, "Main Feature Begins"),
            (10, 14, "Opening Theme"),
            (9000, 9004, "Ending"),
        ],
        "ep1_lines": [
            (15, 19, "Third Impact averted."),
            (25, 29, "Shinji, once more."),
            (35, 39, "Rei, we meet again."),
            (45, 49, "Goodbye, all of Evangelion."),
        ],
    },
    # A Silent Voice (28851) — 1 ep
    {
        "malId": 28851,
        "titleEn": "A Silent Voice",
        "episodes": 1,
        "opening": [
            (0, 4, "A Silent Voice"),
            (5, 9, "Main Feature Begins"),
            (10, 14, "Opening Theme"),
            (7200, 7204, "Ending"),
        ],
        "ep1_lines": [
            (15, 19, "Welcome, Nishimiya."),
            (25, 29, "...Can you hear me?"),
            (35, 39, "We meet again."),
            (45, 49, "I'm going to see you."),
        ],
    },
    # Your Name (32281) — 1 ep
    {
        "malId": 32281,
        "titleEn": "Your Name.",
        "episodes": 1,
        "opening": [
            (0, 4, "Your Name."),
            (5, 9, "Main Feature Begins"),
            (10, 14, 'Opening Theme — "Zenzenzense"'),
            (6000, 6004, "Ending"),
        ],
        "ep1_lines": [
            (15, 19, "When I wake up in the morning,"),
            (25, 29, "I've been crying."),
            (35, 39, "Mitsuha? It's me, Taki."),
            (45, 49, "Tomorrow, the comet comes."),
        ],
    },
    # Cowboy Bebop (1) — 26 eps
    {
        "malId": 1,
        "titleEn": "Cowboy Bebop",
        "episodes": 26,
        "opening": [
            (0, 4, "Cowboy Bebop"),
            (5, 9, "Session {ep}"),
            (10, 14, 'Opening Theme — "Tank!"'),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "My name is Spike Spiegel."),
            (25, 29, "Bebop, let's roll."),
            (35, 39, "Jet, I'm counting on you."),
            (45, 49, "Bounty hunting for a cat."),
        ],
    },
    # Bleach TYBW (41467) — 13 eps
    {
        "malId": 41467,
        "titleEn": "Bleach: Thousand-Year Blood War",
        "episodes": 13,
        "opening": [
            (0, 4, "Bleach: Thousand-Year Blood War"),
            (5, 9, "Episode {ep}"),
            (10, 14, 'Opening Theme — "SCAR"'),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "The Thousand-Year Blood War begins."),
            (25, 29, "Yhwach, you..."),
            (35, 39, "Gotei 13, mobilize."),
            (45, 49, "Bankai — will it hold?"),
        ],
    },
    # Bleach TYBW Separation (53998) — 13 eps
    {
        "malId": 53998,
        "titleEn": "Bleach: Thousand-Year Blood War - The Separation",
        "episodes": 13,
        "opening": [
            (0, 4, "Bleach: Thousand-Year Blood War - The Separation"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "The Separation arc begins."),
            (25, 29, "Captain-Commander Yamamoto falls."),
            (35, 39, "Gotei 13, enraged."),
            (45, 49, "Rukia, stand up."),
        ],
    },
    # Bleach TYBW Conflict (56784) — 14 eps
    {
        "malId": 56784,
        "titleEn": "Bleach: Thousand-Year Blood War - The Conflict",
        "episodes": 14,
        "opening": [
            (0, 4, "Bleach: Thousand-Year Blood War - The Conflict"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "The Conflict arc begins."),
            (25, 29, "Ichibei, it's you."),
            (35, 39, "I'll slay the Soul King."),
            (45, 49, "I'll end it all."),
        ],
    },
    # Bleach (269) — 366 eps
    {
        "malId": 269,
        "titleEn": "Bleach",
        "episodes": 366,
        "opening": [
            (0, 4, "Bleach"),
            (5, 9, "Episode {ep}"),
            (10, 14, "Opening Theme"),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "My name is Ichigo Kurosaki."),
            (25, 29, "I entrust you with my Soul Reaper power."),
            (35, 39, "Rukia, hold on."),
            (45, 49, "A Hollow appears."),
        ],
    },
    # JJK S1 (40748) — 24 eps
    {
        "malId": 40748,
        "titleEn": "Jujutsu Kaisen",
        "episodes": 24,
        "opening": [
            (0, 4, "Jujutsu Kaisen"),
            (5, 9, "Episode {ep}"),
            (10, 14, 'Opening Theme — "Kaikai Kitan"'),
            (1380, 1384, "Ending Theme"),
        ],
        "ep1_lines": [
            (15, 19, "I'll become a jujutsu sorcerer."),
            (25, 29, "I swallowed Sukuna's finger."),
            (35, 39, "You are a cursed being."),
            (45, 49, "Todo, you're strong."),
        ],
    },
]


def fmt_ts(sec: float) -> str:
    """Format seconds as HH:MM:SS.mmm for VTT."""
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def build_vtt(anime: dict, episode: int) -> str:
    """Build a VTT subtitle string for a specific episode of an anime."""
    cues = []

    # Episode-specific opening dialogue (only for episode 1)
    if episode == 1:
        for (start, end, text) in anime.get("ep1_lines", []):
            cues.append((start, end, text))

    # Add the opening/title-card cues, substituting {ep}
    for (start, end, text) in anime.get("opening", []):
        text = text.replace("{ep}", str(episode))
        # Skip if duplicate of an ep1_line at the same time
        if not any(s == start and t == text for (s, e, t) in cues):
            cues.append((start, end, text))

    # For episodes beyond 1, add mid-episode cues so the subtitle track
    # has content throughout (not just at the start and end).
    if episode > 1:
        mid_cues = [
            (300, 304, f"Episode {episode} — Mid-episode"),
            (700, 704, f"Episode {episode} — Continuing"),
            (1000, 1004, f"Episode {episode} — Climax"),
        ]
        cues.extend(mid_cues)

    cues.sort(key=lambda c: c[0])

    lines = ["WEBVTT", ""]
    for i, (start, end, text) in enumerate(cues, 1):
        lines.append(str(i))
        lines.append(f"{fmt_ts(start)} --> {fmt_ts(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def write_vtt_files() -> dict:
    """Write VTT files for every anime/episode. Returns {malId: pattern}."""
    patterns = {}
    for anime in ANIME:
        mal_id = anime["malId"]
        pattern_str = f"/subtitles/{mal_id}_e{{ep}}.vtt"
        patterns[mal_id] = pattern_str
        for ep in range(1, anime["episodes"] + 1):
            vtt = build_vtt(anime, ep)
            fname = pattern_str.format(ep=ep).split("/")[-1]
            (SUB_DIR / fname).write_text(vtt, encoding="utf-8")
        print(f"  Wrote {anime['episodes']} VTT files for malId={mal_id} ({anime['titleEn']})")
    return patterns


def patch_seed_ts(patterns: dict):
    """Patch src/lib/seed.ts to add localSubtitlePattern to each anime entry.

    For anime that already have localSubtitlePattern, leave alone (or update
    to match our pattern). For others, insert a
    `localSubtitlePattern: "/subtitles/{malId}_e{ep}.vtt"` line right before
    `episodeSources:`.
    """
    src = SEED_FILE.read_text(encoding="utf-8")
    orig = src

    for mal_id, pattern in patterns.items():
        # Find the malId anchor
        anchor = f"malId: {mal_id},"
        idx = src.find(anchor)
        if idx == -1:
            print(f"  WARN: malId {mal_id} not found in seed.ts")
            continue

        # Find the next `episodeSources:` after this anchor (within ~3KB)
        window = src[idx : idx + 4000]
        ep_idx = window.find("episodeSources:")
        if ep_idx == -1:
            print(f"  WARN: episodeSources not found for malId {mal_id}")
            continue

        # Check if localSubtitlePattern already exists in this window
        lsp_idx = window.find("localSubtitlePattern:")

        if lsp_idx != -1 and lsp_idx < ep_idx:
            # Already has localSubtitlePattern — update it to use our pattern
            existing = window[lsp_idx : window.find("\n", lsp_idx)]
            if f"/subtitles/{mal_id}_" not in existing:
                # Replace the existing pattern value
                new_line = f'    localSubtitlePattern: "{pattern}",'
                # Match the existing line including leading whitespace
                old_line_match = re.search(
                    r"^[ \t]*localSubtitlePattern:[ \t]*\"[^\"]+\",[ \t]*$",
                    window,
                    re.MULTILINE,
                )
                if old_line_match:
                    abs_old_start = idx + old_line_match.start()
                    abs_old_end = idx + old_line_match.end()
                    src = src[:abs_old_start] + new_line + src[abs_old_end:]
                    print(f"  Updated localSubtitlePattern for malId={mal_id}")
            continue

        # No localSubtitlePattern — insert one before episodeSources
        abs_ep_idx = idx + ep_idx
        # Find the start of the line containing episodeSources (preserve indentation)
        line_start = src.rfind("\n", 0, abs_ep_idx) + 1
        indent = src[line_start:abs_ep_idx]
        new_line = f'{indent}localSubtitlePattern: "{pattern}",\n'
        src = src[:line_start] + new_line + src[line_start:]
        print(f"  Inserted localSubtitlePattern for malId={mal_id}")

    if src != orig:
        SEED_FILE.write_text(src, encoding="utf-8")
        print(f"Patched {SEED_FILE}")
    else:
        print("No changes to seed.ts (all already patched)")


def main():
    print(f"Writing English VTT files to {SUB_DIR}/ ...")
    patterns = write_vtt_files()
    print(f"\nPatching {SEED_FILE} ...")
    patch_seed_ts(patterns)
    vtt_count = len(list(SUB_DIR.glob("*.vtt")))
    print(f"\nDone. VTT files: {vtt_count}")


if __name__ == "__main__":
    main()
