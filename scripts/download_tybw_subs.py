#!/usr/bin/env python3
"""Download Bleach TYBW (3 cours) English subtitles from OpenSubtitles."""
import gzip, json, os, re, time, urllib.request

OUT_DIR = "/home/z/my-project/public/subtitles"
UA = "TemporaryUserAgent"

COURSES = [
    {"malId": 41467, "max_ep": 13, "queries": ["bleach thousand year blood war", "bleach tybw", "bleach sennen kessen hen"]},
    {"malId": 53998, "max_ep": 13, "queries": ["bleach tybw separation", "bleach sennen kessen hen ketsubetsu", "bleach thousand year blood war separation"]},
    {"malId": 56784, "max_ep": 14, "queries": ["bleach tybw conflict", "bleach sennen kessen hen soukoku", "bleach thousand year blood war conflict"]},
]

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
    "OP","OP-R","OP-E","OP-R-S","OP-E-furigana","OP-R-furigana","OP-R-S-furigana",
    "ED","ED-R","ED-E","ED-R-S","Signs","Signs-furigana","Signs_jtb",
    "Credits","Credit","Translation","FX","fx","Effects","Title","Episode Title","Shenanigans",
}

def is_dialogue_style(style):
    if style in NON_DIALOGUE_STYLES:
        return False
    for prefix in ("OP-","ED-","Signs-","OP_","ED_"):
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

def is_tybw_episode(fname, target_ep, max_ep):
    """Match TYBW episode by S01EXX, S02EXX, S03EXX or plain episode number."""
    fl = fname.lower()
    if "bleach" not in fl and "tybw" not in fl and "sennen" not in fl and "kusuriya" not in fl:
        return False
    # Reject original Bleach 2004 episodes (numbered 1-366)
    # TYBW episodes are 1-13 per cour
    # Try S01EXX, S02EXX, S03EXX patterns
    for season in [1, 2, 3]:
        m = re.search(rf'[Ss]0?{season}[Ee](\d+)', fl)
        if m:
            ep = int(m.group(1))
            if ep == target_ep:
                return True
            return False
    # Try plain "tybw NN" or "bleach tybw NN"
    m = re.search(r'tybw.(\d+)', fl)
    if m:
        return int(m.group(1)) == target_ep
    return False

for course in COURSES:
    mal_id = course["malId"]
    max_ep = course["max_ep"]
    queries = course["queries"]
    print(f"\n========== malId={mal_id} (eps=1-{max_ep}) ==========")

    all_results = []
    for q in queries:
        url = f"https://rest.opensubtitles.org/search/query-{urllib.request.quote(q)}/sublanguageid-eng"
        try:
            results = fetch_json(url)
            print(f"  Query '{q}': {len(results)} results")
            all_results.extend(results)
            time.sleep(3)
        except Exception as e:
            print(f"  Query '{q}' failed: {e}")
            time.sleep(2)

    seen = set()
    unique = []
    for r in all_results:
        u = r.get("SubDownloadLink", "")
        if u not in seen:
            seen.add(u)
            unique.append(r)
    print(f"  Total unique: {len(unique)}")

    eps = {}
    for r in unique:
        fname = r.get("SubFileName", "")
        for ep in range(1, max_ep + 1):
            if is_tybw_episode(fname, ep, max_ep):
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
                if ep not in eps or score > eps[ep][0]:
                    eps[ep] = (score, r)
                break

    print(f"  Episodes matched: {sorted(eps.keys())}")
    missing = [ep for ep in range(1, max_ep + 1) if ep not in eps]
    if missing:
        print(f"  Missing: {missing}")

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
            print(f"    Saved: {len(vtt)} bytes")
            success += 1
        except Exception as e:
            print(f"    FAILED: {e}")
        time.sleep(2)

    print(f"\n  >>> malId={mal_id}: {success}/{max_ep} episodes downloaded")

print("\n========== DONE ==========")
