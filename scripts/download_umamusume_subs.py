#!/usr/bin/env python3
"""
Download Umamusume S1 English subtitles from OpenSubtitles,
convert SRT to VTT, and save to /public/subtitles/35349_e{ep}.vtt.
"""
import gzip, json, os, re, time, urllib.request

MAL_ID = 35349
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

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Search OpenSubtitles for Uma Musume
    results = fetch_json("https://rest.opensubtitles.org/search/query-uma+musume+pretty+derby/sublanguageid-eng")
    print(f"Total results: {len(results)}")
    
    # Group by episode
    eps = {}
    for r in results:
        fname = r.get("SubFileName", "")
        m = re.search(r'(\d+)', fname)
        if not m:
            continue
        ep = int(m.group(1))
        if ep < 1 or ep > 13:
            continue
        # Prefer .srt
        score = 10 if fname.endswith(".srt") else 0
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
            print(f"  Saved: {out_path} ({len(vtt)} bytes)")
            success += 1
        except Exception as e:
            print(f"  FAILED: {e}")
        time.sleep(2)
    
    print(f"\n=== DONE: {success}/13 succeeded ===")

if __name__ == "__main__":
    main()
