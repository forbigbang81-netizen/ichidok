#!/usr/bin/env python3
"""Extract all One Piece DUBBED episode slugs from wcoanimedub.tv."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

URL = "https://www.wcoanimedub.tv/anime/one-piece"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        await Stealth().apply_stealth_async(ctx)
        page = await ctx.new_page()
        print(f"Navigating to {URL}...")
        await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(10)
        # Scroll to load all episodes
        prev_height = 0
        for _ in range(30):
            height = await page.evaluate("document.body.scrollHeight")
            if height == prev_height:
                break
            prev_height = height
            await page.evaluate(f"window.scrollTo(0, {height})")
            await asyncio.sleep(2)
        content = await page.content()
        print(f"Page content length: {len(content)}")
        # Find ONLY dubbed episode links (exclude subbed)
        # Pattern: one-piece-episode-N-english-dubbed (NOT -subbed)
        dubbed_map = {}
        subbed_map = {}
        # Find all links that contain "one-piece" and "episode-N"
        for match in re.finditer(r'href="([^"]*one-piece[^"]*episode-(\d+)[^"]*)"', content, re.IGNORECASE):
            link = match.group(1)
            ep = int(match.group(2))
            # Check if it's dubbed or subbed
            if "english-dubbed" in link.lower() or "dubbed" in link.lower():
                if "subbed" not in link.lower():
                    if ep not in dubbed_map:
                        dubbed_map[ep] = link.strip("/").split("/")[-1]
            elif "english-subbed" in link.lower() or "subbed" in link.lower():
                if ep not in subbed_map:
                    subbed_map[ep] = link.strip("/").split("/")[-1]
        print(f"\nDUBBED episodes: {len(dubbed_map)}")
        if dubbed_map:
            eps = sorted(dubbed_map.keys())
            print(f"  Range: E{eps[0]}-E{eps[-1]}")
            for ep in eps[:5]:
                print(f"  E{ep}: {dubbed_map[ep]}")
            print("  ...")
            for ep in eps[-5:]:
                print(f"  E{ep}: {dubbed_map[ep]}")
        print(f"\nSUBBED episodes: {len(subbed_map)}")
        if subbed_map:
            eps = sorted(subbed_map.keys())
            print(f"  Range: E{eps[0]}-E{eps[-1]}")
        # Check which dubbed episodes are NEW (not in current resolver)
        existing = json.load(open("/home/z/my-project/wco-resolver/slugs.json"))
        existing_eps = set(int(k) for k in existing.keys())
        new_dub = sorted([e for e in dubbed_map.keys() if e not in existing_eps])
        print(f"\nNEW DUB episodes not in current resolver: {len(new_dub)}")
        if new_dub:
            from itertools import groupby
            def ranges(lst):
                for a, b in groupby(enumerate(lst), lambda x: x[1]-x[0]):
                    b = list(b)
                    yield b[0][1], b[-1][1]
            for start, end in ranges(new_dub):
                print(f"  E{start}-E{end} ({end-start+1} eps)")
            # Show sample slugs
            print("\n  Sample new slugs:")
            for ep in new_dub[:5]:
                print(f"    E{ep}: {dubbed_map[ep]}")
            for ep in new_dub[-5:]:
                print(f"    E{ep}: {dubbed_map[ep]}")
        # Save full dubbed list
        with open("/tmp/wcoanimedub_dubbed.json", "w") as f:
            json.dump({str(k): v for k, v in dubbed_map.items()}, f, indent=2)
        print(f"\nSaved dubbed episodes to /tmp/wcoanimedub_dubbed.json")
        await browser.close()

asyncio.run(main())
