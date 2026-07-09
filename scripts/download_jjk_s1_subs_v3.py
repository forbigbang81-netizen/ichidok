#!/usr/bin/env python3
"""Download JJK S1 (24 eps) English subtitles from OpenSubtitles — smart matching."""
import gzip, json, os, re, time, urllib.request

MAL_ID = 40748
OUT_DIR = "/home/z/my-project/public/subtitles"
UA = "TemporaryUserAgent"

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
        if re.search(r"opensubtitles|do you want subtitles|osdb\.link", cue_text, re.IGNORECASE):
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

os.makedirs(OUT_DIR, exist_ok=True)

def is_s1_episode(fname, target_ep):
    """Check if filename is JJK S1 episode `target_ep`. Return True/False."""
    fl = fname.lower()
    # Reject anything with S02, S03, Season 2/3, or movie/0
    if re.search(r'[Ss]0[23456789]', fl):
        return False
    if re.search(r'season\s*[23456789]', fl):
        return False
    if 'movie' in fl or 'kaisen.0' in fl or 'kaisen 0' in fl:
        return False
    # Accept S01E{ep}
    m = re.search(r'[Ss]01[Ee](\d+)', fl)
    if m:
        return int(m.group(1)) == target_ep
    # Accept plain " - {ep}" or " {ep}" at word boundary (S1 numbering)
    # Pattern: " - 11" or " - 11 " or " - 11."
    if re.search(rf'[-\s]0?{target_ep}\b', fl):
        # But also make sure there's no other episode number that conflicts
        # (e.g. "Jujutsu Kaisen - 11 [1080p]" matches, but we want ep 11)
        return True
    return False

# Use broad search to find all JJK subtitles
queries = ["jujutsu kaisen", "jujutsu"]
all_results = []
for q in queries:
    url = f"https://rest.opensubtitles.org/search/query-{urllib.request.quote(q)}/sublanguageid-eng"
    try:
        results = fetch_json(url)
        print(f"Query '{q}': {len(results)} results")
        all_results.extend(results)
        time.sleep(3)
    except Exception as e:
        print(f"Query '{q}' failed: {e}")
        time.sleep(2)

# Deduplicate
seen = set()
unique = []
for r in all_results:
    u = r.get("SubDownloadLink", "")
    if u not in seen:
        seen.add(u)
        unique.append(r)
print(f"Total unique: {len(unique)}")

# Find S1 episodes — try multiple matching strategies
eps = {}
for r in unique:
    fname = r.get("SubFileName", "")
    mname = r.get("MovieName", "").lower()
    if "jujutsu" not in mname and "jujutsu" not in fname.lower():
        continue
    for ep in range(1, 25):
        if is_s1_episode(fname, ep):
            score = 0
            fl = fname.lower()
            if fl.endswith(".srt"):
                score += 20
            elif fl.endswith(".ass"):
                score += 10
            if "cr web" in fl or "cr.web" in fl or "webdl" in fl or "web-dl" in fl:
                score += 5
            if "1080p" in fl:
                score += 3
            if "netflix" in fl or "nf" in fl:
                score += 2
            if "crunchyroll" in fl or "official" in fl:
                score += 4
            if "subsplease" in fl:
                score += 2
            if ep not in eps or score > eps[ep][0]:
                eps[ep] = (score, r)
            break

print(f"\nS1 episodes matched (broad search): {sorted(eps.keys())}")

# For missing episodes, do episode-specific searches
missing = [ep for ep in range(1, 25) if ep not in eps]
print(f"Missing: {missing}")

for ep in missing:
    print(f"\n  Searching episode-specific for E{ep}...")
    for q in [f"jujutsu kaisen {ep}"]:
        url = f"https://rest.opensubtitles.org/search/query-{urllib.request.quote(q)}/sublanguageid-eng"
        try:
            results = fetch_json(url)
            for r in results:
                fname = r.get("SubFileName", "")
                if is_s1_episode(fname, ep):
                    dl = r.get("SubDownloadLink", "")
                    if dl in seen:
                        continue
                    seen.add(dl)
                    score = 20 if fname.lower().endswith(".srt") else 10
                    if ep not in eps or score > eps[ep][0]:
                        eps[ep] = (score, r)
                        print(f"    Found: {fname}")
                        break
            time.sleep(2)
        except Exception as e:
            print(f"    Query '{q}' failed: {e}")
            time.sleep(2)

print(f"\nFinal S1 episodes matched: {sorted(eps.keys())}")

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
        out = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep}.vtt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(vtt)
        print(f"    Saved: {len(vtt)} bytes")
        success += 1
    except Exception as e:
        print(f"    FAILED: {e}")
    time.sleep(2)

print(f"\n>>> JJK S1: {success}/24 episodes downloaded")
