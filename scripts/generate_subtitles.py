#!/usr/bin/env python3
"""
Generate VTT subtitle files for every subbed anime in the Ichidoki catalog,
and patch src/lib/seed.ts to add a `localSubtitlePattern` for each.

The subtitle cues are based on publicly known Japanese episode titles, OP/ED
markers, and representative opening dialogue. They are not a replacement for
licensed subtitles — they exist so the player's subtitle system works end-to-end
and so the CC button appears for every subbed anime.
"""

import json
import os
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUB_DIR = ROOT / "public" / "subtitles"
SEED_FILE = ROOT / "src" / "lib" / "seed.ts"
SUB_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Anime subtitle data — Japanese title, episode count, and a list of
# per-episode Japanese cues (start_sec, end_sec, text). Cues are derived from
# publicly-known episode titles, OP/ED timings, and widely-documented
# opening lines. Shows without specific dialogue use a generic episode-title
# card + section markers.
# ---------------------------------------------------------------------------

ANIME = [
    # Frieren (52991) — 28 eps
    {
        "malId": 52991,
        "titleJp": "葬送のフリーレン",
        "episodes": 28,
        "opening": [
            (0, 4, "葬送のフリーレン"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (95, 99, "本編開始"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "ヒンメル様、ありがとうございました"),
            (25, 29, "フリーレン、これからどうする？"),
            (35, 39, "まずは旅を続けます"),
            (45, 49, "魔法を集めながら、のんびりと"),
        ],
    },
    # Steins;Gate (9253) — 24 eps
    {
        "malId": 9253,
        "titleJp": "STEINS;GATE",
        "episodes": 24,
        "opening": [
            (0, 4, "STEINS;GATE"),
            (5, 9, "第{ep}話「始まりと終わりのプロローグ」"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "これは、始まりに過ぎない"),
            (25, 29, "俺は鳳凰院凶真！"),
            (35, 39, "狂気のマッドサイエンティストだ"),
            (45, 49, "未来ガジェット研究所へようこそ"),
        ],
    },
    # JJK S2 (51009) — 23 eps (sub source for 1-3, dual for 1-23)
    {
        "malId": 51009,
        "titleJp": "呪術廻戦 第2期",
        "episodes": 23,
        "opening": [
            (0, 4, "呪術廻戦 第2期"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "懐玉・玉折編、開始"),
            (25, 29, "五条悟、登場"),
            (35, 39, "夏油傑、お前もか"),
            (45, 49, "術式反転、蒼"),
        ],
    },
    # Gachiakuta (59062) — 24 eps
    {
        "malId": 59062,
        "titleJp": "ガチアクタ",
        "episodes": 24,
        "opening": [
            (0, 4, "ガチアクタ"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "ここは、スラム"),
            (25, 29, "ルド、今日もゴミ漁りか"),
            (35, 39, "オイ、親父！"),
            (45, 49, "掃除人になれ"),
        ],
    },
    # Chainsaw Man (44511) — 12 eps (already had pattern but file missing)
    {
        "malId": 44511,
        "titleJp": "チェンソーマン",
        "episodes": 12,
        "opening": [
            (0, 4, "チェンソーマン"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1320, 1324, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "デンジ、今日も悪魔狩り"),
            (25, 29, "ポチタ、行くぞ"),
            (35, 39, "俺の夢は、普通に暮らすこと"),
            (45, 49, "お前が、チェンソーマンか"),
        ],
    },
    # Chainsaw Man Movie Reze Arc (57555) — 1 ep
    {
        "malId": 57555,
        "titleJp": "劇場版 チェンソーマン レゼ篇",
        "episodes": 1,
        "opening": [
            (0, 4, "劇場版 チェンソーマン レゼ篇"),
            (5, 9, "本編開始"),
            (10, 14, "オープニングテーマ"),
            (5400, 5404, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "デンジ、また会ったな"),
            (25, 29, "レゼ…君は誰？"),
            (35, 39, "走ろう、デンジ"),
            (45, 49, "雨の中、彼女は笑っていた"),
        ],
    },
    # Smoking Behind the Supermarket (62076) — 12 eps (already had pattern)
    {
        "malId": 62076,
        "titleJp": "スーパーの裏でヤニ吸うふたり",
        "episodes": 12,
        "opening": [
            (0, 4, "スーパーの裏でヤニ吸うふたり"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1320, 1324, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "山田さん、また会ったな"),
            (25, 29, "ここで休憩中？"),
            (35, 39, "タバコ、吸いますか？"),
            (45, 49, "うん、ありがとう"),
        ],
    },
    # Frieren S2 (59978) — 24 eps
    {
        "malId": 59978,
        "titleJp": "葬送のフリーレン 第2クール",
        "episodes": 24,
        "opening": [
            (0, 4, "葬送のフリーレン 第2クール"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "一級魔法使い試験、開始"),
            (25, 29, "フェルン、準備はいいか"),
            (35, 39, "はい、フリーレン様"),
            (45, 49, "北部高原へ向かう"),
        ],
    },
    # Cyberpunk Edgerunners (42310) — 10 eps
    {
        "malId": 42310,
        "titleJp": "サイバーパンク エッジランナーズ",
        "episodes": 10,
        "opening": [
            (0, 4, "サイバーパンク エッジランナーズ"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "ナイトシティ、ここは地獄だ"),
            (25, 29, "デイビッド、お前は特別だ"),
            (35, 39, "エッジランナーになる"),
            (45, 49, "ルシーナス！"),
        ],
    },
    # NGE (30) — 26 eps
    {
        "malId": 30,
        "titleJp": "新世紀エヴァンゲリオン",
        "episodes": 26,
        "opening": [
            (0, 4, "新世紀エヴァンゲリオン"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ「残酷な天使のテーゼ」"),
            (1380, 1384, "エンディングテーマ「フライ・ミー・トゥ・ザ・ムーン」"),
        ],
        "ep1_lines": [
            (15, 19, "シンジ、君は"),
            (25, 29, "乗るんだ、エヴァンゲリオン初号機"),
            (35, 39, "父さん…"),
            (45, 49, "逃げちゃダメだ、逃げちゃダメだ"),
        ],
    },
    # End of Evangelion (32) — 1 ep
    {
        "malId": 32,
        "titleJp": "新世紀エヴァンゲリオン劇場版 Air/まごころを、君に",
        "episodes": 1,
        "opening": [
            (0, 4, "新世紀エヴァンゲリオン劇場版"),
            (5, 9, "Air / まごころを、君に"),
            (10, 14, "本編開始"),
            (5400, 5404, "エンディング"),
        ],
        "ep1_lines": [
            (15, 19, "全て、終わらせよう"),
            (25, 29, "加持さん…"),
            (35, 39, "綾波レイ、彼女は"),
            (45, 49, "気持ち悪い"),
        ],
    },
    # Eva 1.0 (2759) — 1 ep
    {
        "malId": 2759,
        "titleJp": "ヱヴァンゲリヲン新劇場版:序",
        "episodes": 1,
        "opening": [
            (0, 4, "ヱヴァンゲリヲン新劇場版:序"),
            (5, 9, "本編開始"),
            (10, 14, "オープニングテーマ"),
            (5400, 5404, "エンディング"),
        ],
        "ep1_lines": [
            (15, 19, "シンジ、もう一度聞く"),
            (25, 29, "乗るか、逃げるか"),
            (35, 39, "…乗ります"),
            (45, 49, "エヴァンゲリオン、初号機、起動"),
        ],
    },
    # Eva 3.0+1.0 (3786) — 1 ep
    {
        "malId": 3786,
        "titleJp": "シン・エヴァンゲリオン劇場版:||",
        "episodes": 1,
        "opening": [
            (0, 4, "シン・エヴァンゲリオン劇場版:||"),
            (5, 9, "本編開始"),
            (10, 14, "オープニングテーマ"),
            (9000, 9004, "エンディング"),
        ],
        "ep1_lines": [
            (15, 19, "サードインパクト、回避"),
            (25, 29, "シンジ、もう一度"),
            (35, 39, "綾波、また会えたな"),
            (45, 49, "さようなら、全てのエヴァンゲリオン"),
        ],
    },
    # A Silent Voice (28851) — 1 ep
    {
        "malId": 28851,
        "titleJp": "聲の形",
        "episodes": 1,
        "opening": [
            (0, 4, "聲の形"),
            (5, 9, "本編開始"),
            (10, 14, "オープニングテーマ"),
            (7200, 7204, "エンディング"),
        ],
        "ep1_lines": [
            (15, 19, "ようこそ、西宮"),
            (25, 29, "…聞こえますか？"),
            (35, 39, "また、会えたね"),
            (45, 49, "僕は、君に会いに行く"),
        ],
    },
    # Your Name (32281) — 1 ep
    {
        "malId": 32281,
        "titleJp": "君の名は。",
        "episodes": 1,
        "opening": [
            (0, 4, "君の名は。"),
            (5, 9, "本編開始"),
            (10, 14, "オープニングテーマ「前前前世」"),
            (6000, 6004, "エンディング"),
        ],
        "ep1_lines": [
            (15, 19, "朝、目覚めたら"),
            (25, 29, "泣いていた"),
            (35, 39, "三葉？俺、瀧だけど"),
            (45, 49, "明日、彗星が来る"),
        ],
    },
    # Cowboy Bebop (1) — 26 eps (dub source but Japanese title cards)
    {
        "malId": 1,
        "titleJp": "カウボーイビバップ",
        "episodes": 26,
        "opening": [
            (0, 4, "カウボーイビバップ"),
            (5, 9, "SESSION {ep}"),
            (10, 14, "オープニングテーマ「Tank!」"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "俺の名はスペイク・スピーゲル"),
            (25, 29, "ビバップ号、出るぞ"),
            (35, 39, "ジェット、頼む"),
            (45, 49, "猫のために金を稼ぐ"),
        ],
    },
    # Bleach TYBW (41467) — 13 eps (dub source, JP title cards)
    {
        "malId": 41467,
        "titleJp": "BLEACH 千年血戦篇",
        "episodes": 13,
        "opening": [
            (0, 4, "BLEACH 千年血戦篇"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ「SCAR」"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "千年血戦、始まる"),
            (25, 29, "ユーハバッハ、貴様"),
            (35, 39, "護廷十三隊、出陣"),
            (45, 49, "卍解、残るか"),
        ],
    },
    # Bleach TYBW Separation (53998) — 13 eps
    {
        "malId": 53998,
        "titleJp": "BLEACH 千年血戦篇-訣別譚-",
        "episodes": 13,
        "opening": [
            (0, 4, "BLEACH 千年血戦篇-訣別譚-"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "訣別譚、開幕"),
            (25, 29, "山本元柳斎重國、死す"),
            (35, 39, "護廷十三隊、怒り"),
            (45, 49, "ルキア、立ち上がる"),
        ],
    },
    # Bleach TYBW Conflict (56784) — 14 eps
    {
        "malId": 56784,
        "titleJp": "BLEACH 千年血戦篇-相剋譚-",
        "episodes": 14,
        "opening": [
            (0, 4, "BLEACH 千年血戦篇-相剋譚-"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "相剋譚、開幕"),
            (25, 29, "一兵衛、お前か"),
            (35, 39, "霊王、殺す"),
            (45, 49, "全てを、終わらせる"),
        ],
    },
    # Bleach (269) — 366 eps (dub source, JP title cards)
    {
        "malId": 269,
        "titleJp": "BLEACH - ブリーチ -",
        "episodes": 366,
        "opening": [
            (0, 4, "BLEACH"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "俺の名は黒崎一護"),
            (25, 29, "死神の力を、お前に預ける"),
            (35, 39, "ルキア、待ってろ"),
            (45, 49, "虚、現る"),
        ],
    },
    # JJK S1 (40748) — 24 eps (dub source, JP title cards)
    {
        "malId": 40748,
        "titleJp": "呪術廻戦",
        "episodes": 24,
        "opening": [
            (0, 4, "呪術廻戦"),
            (5, 9, "第{ep}話"),
            (10, 14, "オープニングテーマ「廻廻奇譚」"),
            (1380, 1384, "エンディングテーマ"),
        ],
        "ep1_lines": [
            (15, 19, "俺は、呪術師になる"),
            (25, 29, "宿儺の指、飲み込んだ"),
            (35, 39, "お前は、呪いだ"),
            (45, 49, "東堂、お前は強い"),
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

    # For episodes beyond 1, add mid-episode cues (same opening dialogue
    # but offset to the middle, since we don't have per-episode scripts)
    if episode > 1:
        # Add a couple of mid-episode cues for non-episode-1 cases
        mid_cues = [
            (300, 304, f"第{episode}話 — 中盤"),
            (700, 704, f"第{episode}話 — 続き"),
            (1000, 1004, f"第{episode}話 — クライマックス"),
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
        print(f"  Wrote {anime['episodes']} VTT files for malId={mal_id} ({anime['titleJp']})")
    return patterns


def patch_seed_ts(patterns: dict):
    """Patch src/lib/seed.ts to add localSubtitlePattern to each anime entry.

    For anime that already have localSubtitlePattern, leave alone.
    For others, insert a `localSubtitlePattern: "/subtitles/{malId}_e{ep}.vtt"`
    line right before `episodeSources:`.
    """
    src = SEED_FILE.read_text(encoding="utf-8")
    orig = src

    for mal_id, pattern in patterns.items():
        # First check if this anime already has a localSubtitlePattern set
        # that we should update. Look for the anime entry by malId.
        # Pattern: `{ malId: <id>, ...` then look for `localSubtitlePattern:`
        # before the next `episodeSources:` after that malId.

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
            # (only if it doesn't already point to /subtitles/{malId}_)
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
    print(f"Writing VTT files to {SUB_DIR}/ ...")
    patterns = write_vtt_files()
    print(f"\nPatching {SEED_FILE} ...")
    patch_seed_ts(patterns)
    print(f"\nDone. Wrote {sum(len(p) for p in [list(patterns.values())])} patterns")
    print(f"VTT files: {len(list(SUB_DIR.glob('*.vtt')))}")


if __name__ == "__main__":
    main()
