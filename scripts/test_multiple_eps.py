#!/usr/bin/env python3
"""Capture embed page content and try different episodes."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

EPISODES = [
    "https://m.wcostream.tv/one-piece-episode-422-english-dubbed",
    "https://m.wcostream.tv/one-piece-episode-1-english-dubbed",
    "https://m.wcostream.tv/one-piece-episode-1000-english-dubbed",
]

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
        # Capture media URLs
        media_urls = []
        async def on_response(resp):
            url = resp.url
            ct = resp.headers.get("content-type", "")
            if ("getvidlink" in url or "getvid" in url or "e16.wco" in url or "e15.wco" in url
                or "neptun.wco" in url or "video/" in ct or ".mp4" in url.lower()):
                try:
                    body = ""
                    if "text" in ct or "json" in ct:
                        body = await resp.text()
                        body = body[:800]
                except: body = ""
                media_urls.append({"url": url, "status": resp.status, "ct": ct, "body": body})
                print(f"  [MEDIA] [{resp.status}] {ct[:20]} | {url[:150]}")
                if body:
                    print(f"          body: {body[:400]}")
        page.on("response", on_response)
        for ep_url in EPISODES:
            print(f"\n{'='*60}")
            print(f"Testing: {ep_url}")
            media_urls.clear()
            await page.goto(ep_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(10)
            # Find embed iframe
            iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
            if not iframe_el:
                # Check if there's a direct video link
                content = await page.content()
                print(f"No embed iframe. Page title: {await page.title()}")
                # Look for any video links
                m = re.search(r'(https?://embed\.wcostream\.com[^"\']+)', content)
                if m:
                    embed_url = m.group(1).replace("&amp;", "&")
                    print(f"Found embed URL in HTML: {embed_url[:200]}")
                continue
            frame = await iframe_el.content_frame()
            if frame:
                embed_url = frame.url
                print(f"Embed iframe URL: {embed_url[:200]}")
                # Wait for player to load
                await asyncio.sleep(8)
                # Get the iframe content
                content = await frame.content()
                print(f"Iframe content length: {len(content)}")
                # Check if it's an announcement or actual player
                if "Announcement" in content or "announcement" in content:
                    print("  → Got ANNOUNCEMENT page (not video player)")
                    # Save it
                    with open(f"/tmp/wco_announcement_{ep_url.split('-')[-2]}.html", "w") as f:
                        f.write(content)
                else:
                    print("  → Got video player page!")
                    # Look for the video source
                    sources = re.findall(r'<source[^>]+src="([^"]+)"', content)
                    if sources:
                        print(f"  Sources: {sources[:3]}")
                    # Look for getvidlink calls in the HTML
                    getvid = re.findall(r'(getvidlink\.php[^"\']*)', content)
                    if getvid:
                        print(f"  getvidlink calls: {getvid[:3]}")
                    # Look for the video.js setup
                    m = re.search(r'(?:videojs|thevideo)\s*\(\s*["\']([^"\']+)["\']', content)
                    if m:
                        print(f"  Video element ID: {m.group(1)}")
                    # Look for any URL with .mp4 or getvid
                    mp4_urls = re.findall(r'(https?://[^"\'>\s]+(?:\.mp4|getvid|/video)[^"\'>\s]*)', content)
                    if mp4_urls:
                        print(f"  MP4/getvid URLs: {mp4_urls[:5]}")
        await browser.close()

asyncio.run(main())
