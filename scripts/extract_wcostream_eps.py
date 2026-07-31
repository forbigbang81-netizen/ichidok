#!/usr/bin/env python3
"""Extract One Piece DUBBED episodes from wcostream + resolve actual MP4 URL."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

LIST_URL = "https://m.wcostream.tv/anime/one-piece/season=all"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        stealth = Stealth()
        await stealth.apply_stealth_async(ctx)
        page = await ctx.new_page()
        await page.goto(LIST_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(8)
        content = await page.content()
        # Find DUBBED episode links specifically
        all_links = re.findall(r'href="(/one-piece-episode-(\d+)-english-(dubbed|subbed))"', content, re.IGNORECASE)
        # Dedupe by episode number, prefer dubbed
        by_ep = {}
        for path, ep_num, audio in all_links:
            ep = int(ep_num)
            if ep not in by_ep or audio.lower() == "dubbed":
                by_ep[ep] = (path, audio.lower())
        dubbed = sorted([(ep, path) for ep, (path, a) in by_ep.items() if a == "dubbed"])
        subbed = sorted([(ep, path) for ep, (path, a) in by_ep.items() if a == "subbed"])
        print(f"DUBBED episodes: {len(dubbed)} (first: E{dubbed[0][0] if dubbed else '?'}, last: E{dubbed[-1][0] if dubbed else '?'})")
        print(f"SUBBED episodes: {len(subbed)} (first: E{subbed[0][0] if subbed else '?'}, last: E{subbed[-1][0] if subbed else '?'})")
        # Save lists
        with open("/tmp/wco_dubbed_eps.json", "w") as f:
            json.dump([{"ep": ep, "path": path} for ep, path in dubbed], f, indent=2)
        with open("/tmp/wco_subbed_eps.json", "w") as f:
            json.dump([{"ep": ep, "path": path} for ep, path in subbed], f, indent=2)
        print("Saved to /tmp/wco_dubbed_eps.json and /tmp/wco_subbed_eps.json")
        # Show sample
        if dubbed:
            for ep, path in dubbed[:3] + dubbed[-3:]:
                print(f"  E{ep}: {path}")
        # Now test fetching the actual video for one episode (E1 dub)
        if dubbed:
            test_ep = dubbed[0]
            test_path = test_ep[1]
            test_url = f"https://m.wcostream.tv{test_path}"
            print(f"\n=== Testing E{test_ep[0]} DUB: {test_url} ===")
            await page.goto(test_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(6)
            content = await page.content()
            # Find embed iframe
            iframes = re.findall(r'<iframe[^>]+src="([^"]+)"', content)
            embed_url = None
            for src in iframes:
                if "embed.wcostream" in src or "wcostream" in src and "embed" in src:
                    embed_url = src
                    break
            if not embed_url:
                # Look in scripts
                m = re.search(r'(https?://embed\.wcostream\.com[^"\']+)', content)
                if m: embed_url = m.group(1)
            print(f"Embed URL: {embed_url}")
            if embed_url:
                if embed_url.startswith("//"):
                    embed_url = "https:" + embed_url
                # Navigate to embed page
                print(f"\nNavigating to embed: {embed_url[:120]}...")
                await page.goto(embed_url, wait_until="domcontentloaded", timeout=60000)
                await asyncio.sleep(8)
                content = await page.content()
                # Look for video source
                videos = re.findall(r'<source[^>]+src="([^"]+)"', content)
                print(f"Video sources: {len(videos)}")
                for v in videos[:5]:
                    print(f"  source: {v[:120]}")
                # Look for js variables holding video URL
                js_urls = re.findall(r'(?:file|source|url|video)\s*[:=]\s*["\']([^"\']+\.(?:mp4|m3u8|mkv)[^"\']*)["\']', content, re.IGNORECASE)
                print(f"JS video URLs: {len(js_urls)}")
                for u in js_urls[:5]:
                    print(f"  js: {u[:120]}")
                # Look for the typical wcostream "getVideos" call
                get_urls = re.findall(r'/inc/embed/get.php\?[^"\']+)', content)
                print(f"get.php calls: {len(get_urls)}")
                for g in get_urls[:5]:
                    print(f"  get: {g[:120]}")
                # Save the embed page for inspection
                with open("/tmp/wco_embed_page.html", "w") as f:
                    f.write(content)
                print("Saved embed page to /tmp/wco_embed_page.html")
                # Also capture network requests for video/mp4
                # Look for the actual JSON endpoint pattern: /inc/embed/get.php?... returns JSON with video URL
        await browser.close()

asyncio.run(main())
