#!/usr/bin/env python3
"""Download Frieren S1 (28 eps) and S2 (10 eps) English subtitles from OpenSubtitles.

For each episode:
  1. Search OpenSubtitles REST API (rest.opensubtitles.org) for English subs.
  2. Pick the best match (SRT preferred, episode number must match).
  3. Download gzipped file, decompress.
  4. Convert SRT -> VTT or ASS -> VTT.
  5. Save to /public/subtitles/{malId}_e{ep}.vtt.

OpenSubtitles rate-limits aggressively, so we sleep 3s between requests.
"""
import gzip, json, os, re, time, urllib.request

S1_MAL_ID = 52991  # Frieren: Beyond Journey's End (28 episodes)
S2_MAL_ID = 59978  # Frieren: Beyond Journey's End Season 2 (10 episodes)
OUT_DIR = "/home/z/my-project/public/subtitles"
UA = "TemporaryUserAgent"

# ---------- helpers ----------

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_gz(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return gzip.decompress(r.read()).decode("utf-8", errors="replace")

def srt_to_vtt(srt):
    text = srt.replace("\r\n", "\n").replace("\r", "\n")
    vtt = "WEBVTT\n\n"
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.strip().split("\n")
        if not lines or (lines[0].strip().isdigit() and len(lines) < 2):
            continue
        if lines[0].strip().isdigit():
            lines = lines[1:]
        if len(lines) < 2:
            continue
        timing = lines[0].replace(",", ".")
        if "-->" not in timing:
            continue
        cue_text = "\n".join(lines[1:])
        # Filter OpenSubtitles promo cues
        if re.search(r"opensubtitles|do you want subtitles", cue_text, re.IGNORECASE):
            continue
        vtt += timing + "\n" + cue_text + "\n\n"
    return vtt

def ass_time_to_vtt(t):
    m = re.match(r"(\d+):(\d+):(\d+)\.(\d+)", t)
    if not m:
        m = re.match(r"(\d+):(\d+):(\d+):(\d+)", t)
        if not m:
            return "00:00:00.000"
    h, mn, s, cs = m.groups()
    return f"{int(h):02d}:{int(mn):02d}:{int(s):02d}.{cs.ljust(3, '0')[:3]}"

NON_DIALOGUE_STYLES = {
    "OP", "OP-R", "OP-E", "OP-R-S", "OP-E-furigana", "OP-R-furigana", "OP-R-S-furigana",
    "ED", "ED-R", "ED-E", "ED-R-S",
    "Signs", "Signs-furigana", "Signs_jtb",
    "Credits", "Credit", "Translation",
    "FX", "fx", "Effects",
    "Title", "Episode Title",
    "Shenanigans",
}

def is_dialogue_style(style):
    if style in NON_DIALOGUE_STYLES:
        return False
    for prefix in ("OP-", "ED-", "Signs-", "OP_", "ED_"):
        if style.startswith(prefix):
            return False
    return True

def ass_to_vtt(ass_text):
    lines = ass_text.replace("\r\n", "\n").split("\n")
    cues = []
    for line in lines:
        if not line.startswith("Dialogue:"):
            continue
        parts = line.split(",", 9)
        if len(parts) < 10:
            continue
        start, end, style, text = parts[1], parts[2], parts[3], parts[9]
        if not is_dialogue_style(style):
            continue
        text = re.sub(r"\{[^}]*\}", "", text)
        text = text.replace("\\N", "\n").replace("\\n", "\n").strip()
        if not text:
            continue
        if re.search(r"opensubtitles|do you want subtitles", text, re.IGNORECASE):
            continue
        cues.append((ass_time_to_vtt(start), ass_time_to_vtt(end), text))
    out = ["WEBVTT", ""]
    for i, (s, e, t) in enumerate(cues, 1):
        out.append(str(i))
        out.append(f"{s} --> {e}")
        out.append(t)
        out.append("")
    return "\n".join(out)

# ---------- search + pick best ----------

def parse_ep_from_filename(fname, max_ep):
    """Extract episode number from subtitle filename. Returns int or None."""
    # Common patterns: S01E12, E12, EP12, 12, _12, -12
    patterns = [
        r'[Ss]\d+[Ee](\d+)',
        r'[Ee][Pp]?(\d+)',
        r'(\d+)\.',
        r'_(\d+)_',
        r'-(\d+)-',
        r'(\d+)',
    ]
    for p in patterns:
        m = re.search(p, fname)
        if m:
            ep = int(m.group(1))
            if 1 <= ep <= max_ep:
                return ep
    return None

def search_and_download(mal_id, queries, max_ep, season_label):
    """Search OpenSubtitles and download up to max_ep subtitles."""
    print(f"\n========== {season_label} (malId={mal_id}, eps=1-{max_ep}) ==========")
    all_results = []
    for q in queries:
        # Try query-based search
        url = f"https://rest.opensubtitles.org/search/query-{urllib.request.quote(q)}/sublanguageid-eng"
        try:
            results = fetch_json(url)
            print(f"  Query '{q}': {len(results)} results")
            all_results.extend(results)
            time.sleep(3)
        except Exception as e:
            print(f"  Query '{q}' failed: {e}")
            time.sleep(2)

    # Also try IMDB-based search by name (keyword search)
    # Deduplicate by SubDownloadLink
    seen = set()
    unique = []
    for r in all_results:
        u = r.get("SubDownloadLink", "")
        if u not in seen:
            seen.add(u)
            unique.append(r)
    print(f"  Total unique: {len(unique)}")

    # Group by episode number
    eps = {}
    for r in unique:
        fname = r.get("SubFileName", "").lower()
        mname = r.get("MovieName", "").lower()
        # Filter: must mention frieren
        if "frieren" not in mname and "frieren" not in fname and "sousou" not in mname and "sousou" not in fname:
            continue
        ep = parse_ep_from_filename(r.get("SubFileName", ""), max_ep)
        if ep is None:
            continue
        # Score: prefer SRT, prefer "frieren" in filename
        score = 0
        if fname.endswith(".srt"):
            score += 20
        elif fname.endswith(".ass"):
            score += 10
        # Prefer episode-numbered over episode-1-of-X
        if re.search(r'[Ss]\d+[Ee]\d+', r.get("SubFileName", "")):
            score += 5
        if ep not in eps or score > eps[ep][0]:
            eps[ep] = (score, r)

    print(f"  Episodes matched: {sorted(eps.keys())}")

    success = 0
    for ep in sorted(eps.keys()):
        r = eps[ep][1]
        fname = r.get("SubFileName", "")
        dl = r.get("SubDownloadLink", "")
        print(f"\n  Ep{ep}: {fname}")
        try:
            content = fetch_gz(dl)
            if fname.endswith(".ass"):
                vtt = ass_to_vtt(content)
            else:
                vtt = srt_to_vtt(content)
            if len(vtt) < 200:
                print(f"    TOO SMALL ({len(vtt)} bytes), skipping")
                continue
            out = os.path.join(OUT_DIR, f"{mal_id}_e{ep}.vtt")
            with open(out, "w", encoding="utf-8") as f:
                f.write(vtt)
            print(f"    Saved: {len(vtt)} bytes -> {out}")
            success += 1
        except Exception as e:
            print(f"    FAILED: {e}")
        time.sleep(2)

    print(f"\n  >>> {season_label}: {success}/{max_ep} episodes downloaded")
    return success

# ---------- main ----------

os.makedirs(OUT_DIR, exist_ok=True)

# Frieren S1 — 28 episodes
s1_queries = [
    "frieren beyond journey's end",
    "frieren beyond journeys end",
    "sousou no frieren",
    "frieren",
]
s1_success = search_and_download(S1_MAL_ID, s1_queries, 28, "Frieren S1")

# Frieren S2 — 10 episodes (Crunchyroll/BiliBili-style naming)
s2_queries = [
    "frieren season 2",
    "frieren s2",
    "frieren 2nd season",
    "sousou no frieren s2",
    "sousou no frieren season 2",
]
s2_success = search_and_download(S2_MAL_ID, s2_queries, 10, "Frieren S2")

print(f"\n========== TOTAL: S1={s1_success}/28, S2={s2_success}/10 ==========")
