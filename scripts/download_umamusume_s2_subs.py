#!/usr/bin/env python3
"""Download Umamusume S2 subtitles using a better search query."""
import gzip, json, os, re, time, urllib.request

MAL_ID = 42334
OUT_DIR = "/home/z/my-project/public/subtitles"
USER_AGENT = "TemporaryUserAgent"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_gz(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        return gzip.decompress(r.read()).decode("utf-8", errors="replace")

def srt_to_vtt(srt_text):
    text = srt_text.replace("\r\n", "\n").replace("\r", "\n")
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

# Try multiple search queries
queries = [
    "uma musume pretty derby second season",
    "umamusume pretty derby 2nd",
    "uma musume 2nd season",
]

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

# Also try searching by the Japanese title
url2 = f"https://rest.opensubtitles.org/search/query-kusuriya/sublanguageid-eng"
time.sleep(3)

# Try a broader search
url3 = f"https://rest.opensubtitles.org/search/query-uma+musume/sublanguageid-eng"
try:
    results3 = fetch_json(url3)
    print(f"Query 'uma musume': {len(results3)} results")
    all_results.extend(results3)
except:
    pass

# Deduplicate by download URL
seen = set()
unique = []
for r in all_results:
    url = r.get("SubDownloadLink", "")
    if url not in seen:
        seen.add(url)
        unique.append(r)

print(f"\nTotal unique results: {len(unique)}")

# Parse episode numbers more carefully
eps = {}
for r in unique:
    fname = r.get("SubFileName", "")
    # Try S02E04 pattern
    m = re.search(r'S0?2E(\d+)', fname, re.I)
    if not m:
        # Try "Season 2 Episode N"
        m = re.search(r'[Ss]eason.?2.?[Ee]pisode.?(\d+)', fname)
    if not m:
        # Try "Uma Musume Pretty Derby - 14" pattern (S2 starts at ep 14 globally)
        m2 = re.search(r'-(\d+)', fname)
        if m2:
            ep_num = int(m2.group(1))
            if 14 <= ep_num <= 26:
                class FakeMatch:
                    def group(self, n=0):
                        return str(ep_num - 13)
                m = FakeMatch()
            else:
                m = None
    if not m:
        continue
    ep = int(m.group(1))
    if ep < 1 or ep > 13:
        continue
    score = 10 if fname.endswith(".srt") else 0
    if "S02" in fname or "Season 2" in fname or "2nd" in fname:
        score += 5
    if ep not in eps or score > eps[ep][0]:
        eps[ep] = (score, r)

print(f"Episodes found: {sorted(eps.keys())}")

success = 0
for ep in sorted(eps.keys()):
    r = eps[ep][1]
    fname = r.get("SubFileName", "")
    dl_url = r.get("SubDownloadLink", "")
    print(f"\nEp{ep}: {fname}")
    try:
        content = fetch_gz(dl_url)
        vtt = srt_to_vtt(content)
        out_path = os.path.join(OUT_DIR, f"{MAL_ID}_e{ep}.vtt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(vtt)
        print(f"  Saved: {len(vtt)} bytes")
        success += 1
    except Exception as e:
        print(f"  FAILED: {e}")
    time.sleep(2)

print(f"\n=== DONE: {success}/13 succeeded ===")
