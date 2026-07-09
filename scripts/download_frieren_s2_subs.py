#!/usr/bin/env python3
"""Download Frieren S2 (10 eps) English subtitles from OpenSubtitles.

Uses broad "frieren" search and picks out S02EXX files.
"""
import gzip, json, os, re, time, urllib.request

MAL_ID = 59978
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
        if re.search(r"opensubtitles|do you want subtitles", cue_text, re.IGNORECASE):
            continue
        vtt += timing + "\n" + cue_text + "\n\n"
    return vtt

os.makedirs(OUT_DIR, exist_ok=True)

# Use broad search to find all Frieren subtitles, then filter for S2
queries = ["frieren", "sousou"]
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

# Find S2 episodes (S02E01 through S02E10)
eps = {}
for r in unique:
    fname = r.get("SubFileName", "")
    mname = r.get("MovieName", "").lower()
    if "frieren" not in mname and "frieren" not in fname.lower() and "sousou" not in mname:
        continue
    # Match S02EXX pattern
    m = re.search(r'[Ss]02[Ee](\d+)', fname)
    if not m:
        continue
    ep = int(m.group(1))
    if ep < 1 or ep > 10:
        continue
    # Score: prefer SRT, prefer "1080p CR WEB-DL" (Crunchyroll source)
    score = 0
    fl = fname.lower()
    if fl.endswith(".srt"):
        score += 20
    if "cr web-dl" in fl or "cr.web" in fl or "webdl" in fl or "web-dl" in fl:
        score += 5
    if "1080p" in fl:
        score += 3
    if ep not in eps or score > eps[ep][0]:
        eps[ep] = (score, r)

print(f"\nS2 episodes matched: {sorted(eps.keys())}")

success = 0
for ep in sorted(eps.keys()):
    r = eps[ep][1]
    fname = r.get("SubFileName", "")
    dl = r.get("SubDownloadLink", "")
    print(f"\n  Ep{ep}: {fname}")
    try:
        content = fetch_gz(dl)
        vtt = srt_to_vtt(content)
        if len(vtt) < 200:
            print(f"    TOO SMALL ({len(vtt)} bytes), skipping")
            continue
        out = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep}.vtt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(vtt)
        print(f"    Saved: {len(vtt)} bytes -> {out}")
        success += 1
    except Exception as e:
        print(f"    FAILED: {e}")
    time.sleep(2)

print(f"\n>>> Frieren S2: {success}/10 episodes downloaded")
