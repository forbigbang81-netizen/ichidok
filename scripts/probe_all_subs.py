#!/usr/bin/env python3
"""Probe all anime in seed.ts for embedded subtitle streams in their archive.org MP4 files."""
import subprocess
import json
import re
import sys
from pathlib import Path

# Parse seed.ts to extract all anime with their episode sources
SEED_FILE = Path("/home/z/my-project/src/lib/seed.ts")

def parse_seed():
    """Extract anime entries with their episode sources from seed.ts."""
    content = SEED_FILE.read_text()
    # Find all malId + episodeSources blocks
    entries = []
    # Match: { malId: 12345, ... episodeSources: [ ... ], ... }
    # We'll do a simpler line-by-line parse
    lines = content.split('\n')
    current_mal_id = None
    current_title = None
    in_sources = False
    sources = []
    
    for line in lines:
        # Match malId
        m = re.search(r'malId:\s*(\d+)', line)
        if m:
            if current_mal_id and sources:
                entries.append({
                    'malId': current_mal_id,
                    'title': current_title,
                    'sources': sources,
                })
            current_mal_id = int(m.group(1))
            current_title = None
            sources = []
            in_sources = False
        # Match title
        if current_mal_id and not current_title:
            m = re.search(r'title:\s*"([^"]+)"', line)
            if m:
                current_title = m.group(1)
        # Match episodeSources start
        if 'episodeSources:' in line:
            in_sources = True
            continue
        # Match end of entry (closing bracket)
        if in_sources and line.strip().startswith('}],'):
            in_sources = False
            continue
        if in_sources and line.strip().startswith('}'):
            in_sources = False
            continue
        # Match source entries
        if in_sources:
            m = re.search(r'startEp:\s*(\d+).*endEp:\s*(\d+).*collection:\s*"([^"]+)".*(?:fileName|fileTemplate):\s*"([^"]+)"', line)
            if m:
                start_ep, end_ep, collection, file_str = m.groups()
                sources.append({
                    'startEp': int(start_ep),
                    'endEp': int(end_ep),
                    'collection': collection,
                    'file': file_str,
                })
    
    # Don't forget the last entry
    if current_mal_id and sources:
        entries.append({
            'malId': current_mal_id,
            'title': current_title,
            'sources': sources,
        })
    
    return entries

def probe_subtitle_streams(url: str, timeout: int = 30) -> list:
    """Probe an MP4 for subtitle streams. Returns list of stream indices."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_streams", "-of", "json", url],
            timeout=timeout, capture_output=True, text=True,
        )
        if result.returncode != 0:
            return []
        data = json.loads(result.stdout)
        sub_streams = []
        for s in data.get('streams', []):
            if s.get('codec_type') == 'subtitle':
                sub_streams.append({
                    'index': s.get('index'),
                    'codec': s.get('codec_name'),
                    'title': s.get('tags', {}).get('title', ''),
                    'language': s.get('tags', {}).get('language', ''),
                })
        return sub_streams
    except subprocess.TimeoutExpired:
        return []
    except Exception as e:
        print(f"  probe error: {e}", file=sys.stderr)
        return []

def build_archive_url(collection: str, file: str, ep: int) -> str:
    """Build the archive.org URL for a file, substituting {ep} placeholders."""
    # Substitute {ep} and {ep:02} etc.
    file = re.sub(r'\{ep(?::(\d+))?\}', lambda m: str(ep).zfill(int(m.group(1))) if m.group(1) else str(ep), file)
    # URL-encode spaces
    encoded = file.replace(' ', '%20')
    return f"https://archive.org/download/{collection}/{encoded}"

def main():
    entries = parse_seed()
    print(f"Found {len(entries)} anime with episode sources")
    print()
    
    results = []
    for entry in entries:
        mal_id = entry['malId']
        title = entry['title']
        # Test the first episode of the first source
        if not entry['sources']:
            continue
        src = entry['sources'][0]
        ep = src['startEp']
        url = build_archive_url(src['collection'], src['file'], ep)
        
        print(f"=== {title} (malId={mal_id}) ep{ep} ===")
        print(f"  URL: {url[:100]}...")
        streams = probe_subtitle_streams(url)
        if streams:
            print(f"  Found {len(streams)} subtitle streams:")
            for s in streams:
                print(f"    Stream {s['index']}: {s['codec']} lang={s['language']} title={s['title']}")
            results.append({
                'malId': mal_id,
                'title': title,
                'sources': entry['sources'],
                'subStreams': streams,
            })
        else:
            print(f"  No subtitle streams found")
        print()
    
    print(f"\n=== Summary ===")
    print(f"Anime with embedded subtitles: {len(results)}")
    for r in results:
        print(f"  - {r['title']} (malId={r['malId']}): {len(r['subStreams'])} streams")
    
    # Save results for the extraction script
    import json
    with open('/tmp/anime_with_subs.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved probe results to /tmp/anime_with_subs.json")

if __name__ == "__main__":
    main()
