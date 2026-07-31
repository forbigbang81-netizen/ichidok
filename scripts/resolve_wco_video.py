#!/usr/bin/env python3
"""Resolve wcostream video URL by staying on the episode page and interacting with the iframe."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

TEST_URL = "https://m.wcostream.tv/one-piece-episode-422-english-dubbed"

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
        # Set up network request capture - look for ALL video/media URLs
        video_urls = []
        async def on_response(resp):
            url = resp.url
            ct = resp.headers.get("content-type", "")
            # Capture any video media, mp4, m3u8, or json with video URL
            if (any(k in url.lower() for k in [".mp4", ".m3u8", "get.php", "video.php", "ahcdn", "streamable", "mstreload", "/cdn/", "/videos/", "json"])
                or "video" in ct
                or "octet-stream" in ct):
                try:
                    body = ""
                    if "json" in ct or "text" in ct:
                        body = await resp.text()
                        body = body[:500]
                except: body = ""
                video_urls.append({"url": url, "status": resp.status, "ct": ct, "body_preview": body})
        page.on("response", on_response)
        print(f"Going to {TEST_URL}")
        await page.goto(TEST_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(10)
        # Find the embed iframe on the page
        iframe_element = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_element:
            print(f"Found embed iframe")
            # Get the iframe's content frame
            frame = await iframe_element.content_frame()
            if frame:
                print(f"Frame URL: {frame.url[:120]}")
                # Wait for the frame to fully load
                await asyncio.sleep(8)
                # Look for the play button inside the iframe
                try:
                    play_btn = await frame.query_selector("#thevideo, .play-btn, button, [onclick], a.btn")
                    if play_btn:
                        print(f"Clicking play button in iframe...")
                        await play_btn.click()
                        await asyncio.sleep(8)
                except Exception as e:
                    print(f"Play click: {e}")
                # Get the iframe content
                content = await frame.content()
                print(f"\nIframe content length: {len(content)}")
                print(f"Iframe content preview:\n{content[:1500]}")
                # Save it
                with open("/tmp/wco_iframe_content.html", "w") as f:
                    f.write(content)
                # Look for video source
                videos = re.findall(r'<source[^>]+src="([^"]+)"', content)
                print(f"\n<source> tags: {len(videos)}")
                for v in videos[:5]:
                    print(f"  {v[:200]}")
                # Look for JS with video URL
                js_videos = re.findall(r'(?:source|file|video|url)\s*[:=]\s*["\']([^"\']{20,200})["\']', content)
                # Filter for ones with mp4/m3u8
                js_videos = [v for v in js_videos if ".mp4" in v or ".m3u8" in v or "/video" in v or "ahcdn" in v]
                print(f"\nJS video URLs: {len(js_videos)}")
                for v in js_videos[:10]:
                    print(f"  {v[:200]}")
                # Look for get.php calls (wcostream's typical pattern)
                get_calls = re.findall(r'(/inc/embed/get\.php[^"\']+)', content)
                print(f"\nget.php calls: {len(get_calls)}")
                for g in get_calls[:5]:
                    print(f"  https://embed.wcostream.com{g[:200]}")
                # Look for any URL with cdn
                cdn_urls = re.findall(r'(https?://[^"\'>\s]+\.(?:mp4|m3u8|mkv)[^"\'>\s]*)', content)
                print(f"\nDirect media URLs in iframe: {len(cdn_urls)}")
                for u in cdn_urls[:5]:
                    print(f"  {u[:200]}")
        # Print all captured video URLs
        print(f"\n=== Captured {len(video_urls)} video-related URLs ===")
        for v in video_urls[:40]:
            print(f"  [{v['status']}] {v['ct'][:25]} | {v['url'][:180]}")
            if v['body_preview']:
                print(f"      body: {v['body_preview'][:200]}")
        await browser.close()

asyncio.run(main())
