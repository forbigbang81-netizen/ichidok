#!/usr/bin/env python3
"""Capture the ACTUAL video stream URL (the one returning video/mp4) and test it."""
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
        # Capture ALL responses with their content-type
        video_responses = []
        async def on_response(resp):
            url = resp.url
            ct = resp.headers.get("content-type", "")
            # Capture anything that looks like video content or video URL resolution
            if ("video/" in ct or "octet-stream" in ct
                or "getvid" in url.lower() or "e16.wco" in url or "e15.wco" in url
                or "neptun" in url or ".mp4" in url.lower()):
                try:
                    body_preview = ""
                    if "text" in ct or "json" in ct or "html" in ct:
                        body_preview = await resp.text()
                        body_preview = body_preview[:500]
                except: body_preview = ""
                video_responses.append({
                    "url": url, "status": resp.status, "ct": ct,
                    "body": body_preview,
                    "headers": dict(resp.headers),
                })
                print(f"  [{resp.status}] {ct[:30]} | {url[:150]}")
        page.on("response", on_response)
        print(f"Navigating to {EP_URL}...")
        await page.goto(EP_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(15)
        # Find embed iframe and interact
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                print(f"\nEmbed frame loaded. Waiting for player...")
                await asyncio.sleep(5)
                # Click the play/ad button
                try:
                    btn = await frame.query_selector("#b-reklam, .round-button")
                    if btn:
                        print("Clicking #b-reklam button...")
                        await btn.click()
                        await asyncio.sleep(15)
                except Exception as e:
                    print(f"Click: {e}")
                # Try clicking the close button after timer
                try:
                    close_btn = await frame.query_selector(".btn-close:not([disabled])")
                    if close_btn:
                        print("Clicking close button...")
                        await close_btn.click()
                        await asyncio.sleep(10)
                except: pass
                # Try to play the video directly
                try:
                    await frame.evaluate("""
                        var v = document.querySelector('video');
                        if (v) {
                            v.play();
                            console.log('Video element found, playing...');
                        }
                    """)
                    await asyncio.sleep(10)
                except: pass
        # Wait more
        await asyncio.sleep(10)
        # Find the video URL
        final_video_url = None
        for r in video_responses:
            if "video/mp4" in r["ct"] or "video/webm" in r["ct"]:
                final_video_url = r["url"]
                print(f"\n*** FOUND VIDEO STREAM URL ***")
                print(f"URL: {final_video_url}")
                print(f"Content-Type: {r['ct']}")
                print(f"Content-Length: {r['headers'].get('content-length', '?')}")
                break
            elif "neptun" in r["url"]:
                print(f"\n*** NEPTUN RESPONSE ***")
                print(f"Body: {r['body'][:300]}")
                # Parse the final URL from the body
                try:
                    parsed = json.loads(r["body"])
                    if isinstance(parsed, str):
                        final_video_url = parsed
                    elif isinstance(parsed, dict):
                        final_video_url = parsed.get("url") or list(parsed.values())[0]
                except:
                    m = re.search(r'(https?://[^"\'\\]+)', r["body"])
                    if m:
                        final_video_url = m.group(1).replace("\\/", "/")
        # Save results
        with open("/tmp/wco_video_responses.json", "w") as f:
            json.dump(video_responses, f, indent=2)
        # Test the final URL
        if final_video_url:
            print(f"\n=== TESTING FINAL URL WITH CURL ===")
            import subprocess
            # Test with Referer
            result = subprocess.run(
                ["curl", "-sI", "-m", "15", final_video_url,
                 "-H", "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                 "-H", "Referer: https://embed.wcostream.com/",
                 "-H", "Range: bytes=0-1024"],
                capture_output=True, text=True, timeout=20
            )
            print(f"WITH Referer:\n{result.stdout[:800]}")
            # Test without Referer
            result2 = subprocess.run(
                ["curl", "-sI", "-m", "15", final_video_url,
                 "-H", "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                 "-H", "Range: bytes=0-1024"],
                capture_output=True, text=True, timeout=20
            )
            print(f"\nWITHOUT Referer:\n{result2.stdout[:500]}")
            # Test with different IP (Vercel-like)
            result3 = subprocess.run(
                ["curl", "-sI", "-m", "15", final_video_url,
                 "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                 "-H", "Origin: https://ichidok.vercel.app"],
                capture_output=True, text=True, timeout=20
            )
            print(f"\nWith Vercel Origin:\n{result3.stdout[:500]}")
        else:
            print("\nNo video URL found!")
            print(f"Total responses captured: {len(video_responses)}")
        await browser.close()

asyncio.run(main())
