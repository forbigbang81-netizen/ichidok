#!/usr/bin/env python3
"""Test resolving an episode from wcoanimedub.tv (E1 — missing from wcostream)."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# Test E1 which has the non-standard slug "one-piece-episode-1-english-dubbed-2-2"
SLUG = "one-piece-episode-1-english-dubbed-2-2"
BASE_URL = "https://www.wcoanimedub.tv"

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
        video_url = None
        neptun_body = None
        async def on_response(resp):
            nonlocal video_url, neptun_body
            url = resp.url
            ct = resp.headers.get("content-type", "")
            if "video/mp4" in ct and "wcostream" in url:
                video_url = url
                print(f"  [VIDEO] {url[:120]}")
            if "neptun.wcostream.com/getvid" in url or ("getvid" in url and "neptun" in url):
                try:
                    body = await resp.text()
                    if body and "getvid" in body:
                        neptun_body = body
                        print(f"  [NEPTUN] {body[:120]}")
                except: pass
        page.on("response", on_response)
        url = f"{BASE_URL}/{SLUG}"
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(15)
        title = await page.title()
        print(f"Page title: {title}")
        # Find embed iframe
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream'], iframe[src*='embed.wco']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                print(f"Embed iframe URL: {frame.url[:150]}")
                await asyncio.sleep(5)
                content = await frame.content()
                if "Announcement" in content:
                    print("→ Got Announcement page, skipping...")
                    for selector in [".btn-close:not([disabled])", "#b-reklam", ".round-button", "button:not([disabled])"]:
                        try:
                            el = await frame.query_selector(selector)
                            if el:
                                await el.click()
                                print(f"  Clicked {selector}")
                                await asyncio.sleep(10)
                                break
                        except: pass
                # Click play button
                for selector in ["#b-reklam", ".round-button", ".vjs-big-play-button", "button.vjs-big-play-button"]:
                    try:
                        btn = await frame.query_selector(selector)
                        if btn:
                            await btn.click()
                            print(f"  Clicked {selector}")
                            await asyncio.sleep(12)
                            break
                    except: pass
                # Play video
                try:
                    await frame.evaluate('document.querySelector("video")?.play()')
                    print("  Called video.play()")
                    await asyncio.sleep(10)
                except: pass
        # Wait for video URL
        for _ in range(10):
            if video_url:
                break
            await asyncio.sleep(3)
        # Fallback: parse from neptun response
        if not video_url and neptun_body:
            try:
                parsed = json.loads(neptun_body)
                if isinstance(parsed, str):
                    video_url = parsed
                elif isinstance(parsed, dict):
                    video_url = parsed.get("url") or list(parsed.values())[0]
            except:
                m = re.search(r'(https?://[^"\'\\]+getvid[^"\'\\]+)', neptun_body)
                if m:
                    video_url = m.group(1).replace("\\/", "/")
        print(f"\n{'='*50}")
        if video_url:
            print(f"SUCCESS! Video URL: {video_url[:150]}")
            # Test it
            import subprocess
            result = subprocess.run(
                ["curl", "-sI", "-m", "10", video_url, "-H", "Range: bytes=0-100"],
                capture_output=True, text=True, timeout=15
            )
            print(f"HEAD: {result.stdout[:300]}")
        else:
            print("FAILED: No video URL captured")
        await browser.close()

asyncio.run(main())
