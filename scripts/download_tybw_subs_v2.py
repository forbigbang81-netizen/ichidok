#!/usr/bin/env python3
"""Download Bleach TYBW (3 cours) English subtitles — season-specific matching."""
import gzip, json, os, re, time, urllib.request

OUT_DIR = "/home/z/my-project/public/subtitles"
UA = "TemporaryUserAgent"

# Each cour maps to a specific season number in OpenSubtitles filenames
COURSES = [
    {"malId": 41467, "season": 1, "max_ep": 13, "queries": ["bleach thousand year blood war", "bleach tybw", "bleach sennen kessen hen"]},
    {"malId": 53998, "season": 2, "max_ep": 13, "queries": ["bleach thousand year blood war", "bleach tybw", "bleach sennen kessen hen ketsubetsu"]},
    {"malId": 56784, "season": 3, "max_ep": 14, "queries": ["bleach thousand year blood war", "bleach tybw", "bleach sennen kessen hen soukoku"]},
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
    if not m: return "00:00:00.000"
    h, mn, s, cs = m.groups()
    return f"{int(h):02d}:{int(mn):02d}:{int(s):02d}.{cs.ljust(3, '0')[:3]}"

NON_DIALOGUE_STYLES = {"OP","OP-R","OP-E","ED","ED-R","ED-E","Signs","Credits","FX","Title","Episode Title"}
def is_dlg(s):
    if s in NON_DIALOGUE_STYLES: return False
    for p in ("OP-","ED-","Signs-"):
        if s.startswith(p): return False
    return True

def ass_to_vtt(ass_text):
    lines = ass_text.replace("\r\n","\n").split("\n")
    cues = []
    for line in lines:
        if not line.startswith("Dialogue:"): continue
        parts = line.split(",",9)
        if len(parts) < 10: continue
        start, end, style, text = parts[1], parts[2], parts[3], parts[9]
        if not is_dlg(style): continue
        text = re.sub(r"\{[^}]*\}","",text).replace("\\N","\n").replace("\\n","\n").strip()
        if not text: continue
        cues.append((ass_time_to_vtt(start), ass_time_to_vtt(end), text))
    out = ["WEBVTT",""]
    for i,(s,e,t) in enumerate(cues,1):
        out += [str(i), f"{s} --> {e}", t, ""]
    return "\n".join(out)

os.makedirs(OUT_DIR, exist_ok=True)

for course in COURSES:
    mal_id = course["malId"]
    season = course["season"]
    max_ep = course["max_ep"]
    queries = course["queries"]
    print(f"\n========== malId={mal_id} S{season} (eps=1-{max_ep}) ==========")

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
        u = r.get("SubDownloadLink","")
        if u not in seen:
            seen.add(u)
            unique.append(r)
    print(f"  Total unique: {len(unique)}")

    eps = {}
    for r in unique:
        fname = r.get("SubFileName","")
        fl = fname.lower()
        if "bleach" not in fl and "tybw" not in fl and "sennen" not in fl:
            continue
        # STRICT: must match S{season}EXX for this specific cour
        m = re.search(rf'[Ss]0?{season}[Ee](\d+)', fl)
        if not m:
            continue
        ep = int(m.group(1))
        if ep < 1 or ep > max_ep:
            continue
        score = 0
        if fl.endswith(".srt"): score += 20
        elif fl.endswith(".ass"): score += 10
        if "cr web" in fl or "webdl" in fl or "web-dl" in fl or "dsnp" in fl: score += 5
        if "1080p" in fl: score += 3
        if "japanese" in fl: score += 2
        if "crunchyroll" in fl or "official" in fl: score += 4
        if ep not in eps or score > eps[ep][0]:
            eps[ep] = (score, r)

    print(f"  Episodes matched: {sorted(eps.keys())}")
    missing = [ep for ep in range(1, max_ep+1) if ep not in eps]
    if missing:
        print(f"  Missing: {missing}")

    success = 0
    for ep in sorted(eps.keys()):
        r = eps[ep][1]
        fname = r.get("SubFileName","")
        dl = r.get("SubDownloadLink","")
        print(f"\n  Ep{ep}: {fname}")
        try:
            content = fetch_gz(dl)
            vtt = ass_to_vtt(content) if fname.endswith(".ass") else srt_to_vtt(content)
            if len(vtt) < 200:
                print(f"    TOO SMALL, skipping")
                continue
            out = os.path.join(OUT_DIR, f"{mal_id}_e{ep}.vtt")
            with open(out, "w", encoding="utf-8") as f:
                f.write(vtt)
            print(f"    Saved: {len(vtt)} bytes")
            success += 1
        except Exception as e:
            print(f"    FAILED: {e}")
        time.sleep(2)

    print(f"\n  >>> malId={mal_id}: {success}/{max_ep}")

print("\n========== DONE ==========")
