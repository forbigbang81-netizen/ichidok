#!/usr/bin/env python3
"""Download Steins;Gate English subtitles from OpenSubtitles."""
import gzip, json, os, re, time, urllib.request

MAL_ID = 9253
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
        vtt += timing + "\n" + "\n".join(lines[1:]) + "\n\n"
    return vtt

os.makedirs(OUT_DIR, exist_ok=True)

# Search for Steins;Gate subtitles
queries = ["steins gate", "steins;gate"]
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

# Deduplicate
seen = set()
unique = []
for r in all_results:
    u = r.get("SubDownloadLink", "")
    if u not in seen:
        seen.add(u)
        unique.append(r)

print(f"Total unique: {len(unique)}")

# Parse episode numbers
eps = {}
for r in unique:
    fname = r.get("SubFileName", "")
    mname = r.get("MovieName", "")
    if "steins" not in mname.lower() and "steins" not in fname.lower():
        continue
    # Try various patterns for episode number
    m = re.search(r'[Ee](\d+)', fname) or \
        re.search(r'(\d+)', fname)
    if not m:
        continue
    ep = int(m.group(1))
    if ep < 1 or ep > 24:
        continue
    score = 10 if fname.endswith(".srt") else 0
    if "steins" in fname.lower():
        score += 5
    if ep not in eps or score > eps[ep][0]:
        eps[ep] = (score, r)

print(f"Episodes found: {sorted(eps.keys())}")

success = 0
for ep in sorted(eps.keys()):
    r = eps[ep][1]
    fname = r.get("SubFileName", "")
    dl = r.get("SubDownloadLink", "")
    print(f"\nEp{ep}: {fname}")
    try:
        content = fetch_gz(dl)
        vtt = srt_to_vtt(content)
        if len(vtt) < 100:
            print(f"  TOO SMALL, skipping")
            continue
        out = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep}.vtt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(vtt)
        print(f"  Saved: {len(vtt)} bytes")
        success += 1
    except Exception as e:
        print(f"  FAILED: {e}")
    time.sleep(2)

print(f"\n=== DONE: {success}/24 ===")
