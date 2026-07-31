#!/usr/bin/env python3
"""Capture final video URL from wcostream by clicking play."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

EP_URL = "https://m.wcostream.tv/one-piece-episode-422-english-dubbed"

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
        # Capture ALL media URLs
        media_urls = []
        async def on_response(resp):
            url = resp.url
            ct = resp.headers.get("content-type", "")
            if ("video/" in ct or "mp4" in url.lower() or "m3u8" in url.lower()
                or "getvid" in url.lower() or "e16.wcostream" in url or "e15.wcostream" in url
                or "e14.wcostream" in url or "ahcdn" in url):
                try:
                    body = ""
                    if "text" in ct or "json" in ct:
                        body = await resp.text()
                        body = body[:1000]
                except: body = ""
                media_urls.append({"url": url, "status": resp.status, "ct": ct, "body": body})
                print(f"  [CAPTURED] [{resp.status}] {ct[:25]} | {url[:150]}")
                if body:
                    print(f"            body: {body[:300]}")
        page.on("response", on_response)
        await page.goto(EP_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(8)
        # Find embed iframe and click play
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                print("Found embed iframe, waiting for player...")
                await asyncio.sleep(5)
                # Click play button - thevideo.js player
                try:
                    # Look for various play button selectors
                    for sel in [".vjs-big-play-button", "#thevideo", "button[onclick*='play']", ".play-btn", "video", "[onclick]"]:
                        el = await frame.query_selector(sel)
                        if el:
                            print(f"Clicking {sel}...")
                            try:
                                await el.click(timeout=5000)
                            except:
                                await frame.evaluate(f"document.querySelector('{sel}')?.click()")
                            await asyncio.sleep(5)
                            break
                except Exception as e:
                    print(f"Click error: {e}")
                # Try clicking video element directly
                try:
                    video = await frame.query_selector("video")
                    if video:
                        print("Found video element, trying to play...")
                        await frame.evaluate("document.querySelector('video')?.play()")
                        await asyncio.sleep(8)
                except Exception as e:
                    print(f"Video play: {e}")
        # Wait for media requests
        await asyncio.sleep(10)
        # Print all captured media URLs
        print(f"\n=== ALL CAPTURED MEDIA URLS ({len(media_urls)}) ===")
        for m in media_urls:
            print(f"  [{m['status']}] {m['ct'][:25]} | {m['url'][:200]}")
        await browser.close()

asyncio.run(main())
