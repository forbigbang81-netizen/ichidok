#!/usr/bin/env python3
"""Extract the FULL final video URL from wcostream and test if it's playable."""
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
        # Capture ALL network responses
        all_responses = []
        async def on_response(resp):
            url = resp.url
            if "getvidlink" in url or "getvid" in url or "e16.wco" in url or "e15.wco" in url or "neptun" in url or "video-js.php" in url:
                try:
                    body = await resp.text()
                except:
                    body = ""
                all_responses.append({"url": url, "status": resp.status, "body": body})
                print(f"  [CAPTURED] [{resp.status}] {url[:150]}")
                if body:
                    print(f"    body (first 1000): {body[:1000]}")
        page.on("response", on_response)
        print(f"Navigating to {EP_URL}...")
        await page.goto(EP_URL, wait_until="domcontentloaded", timeout=60000)
        # Wait longer for everything to load
        print("Waiting 20s for all requests...")
        await asyncio.sleep(20)
        # Find and interact with the embed iframe
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                print(f"\nEmbed iframe URL: {frame.url[:200]}")
                # Wait for player
                await asyncio.sleep(5)
                # Look for the play button
                try:
                    play_btn = await frame.query_selector("#b-reklam, .round-button, .vjs-big-play-button, #thevideo")
                    if play_btn:
                        print("Found play button, clicking...")
                        await play_btn.click()
                        await asyncio.sleep(10)
                except Exception as e:
                    print(f"Play click error: {e}")
                # Try to trigger video load via JS
                try:
                    await frame.evaluate("""
                        // Try to find and trigger the video
                        var v = document.querySelector('video');
                        if (v) { v.play(); }
                        // Look for thevideo player
                        if (typeof thevideo !== 'undefined') { thevideo(); }
                        // Try clicking any play button
                        document.querySelectorAll('button, a').forEach(e => {
                            if (/play|video|start/i.test(e.textContent + ' ' + e.className)) {
                                e.click();
                            }
                        });
                    """)
                    await asyncio.sleep(10)
                except Exception as e:
                    print(f"JS trigger: {e}")
        # Wait more
        await asyncio.sleep(10)
        # Find the final video URL
        final_url = None
        for r in all_responses:
            if "neptun.wcostream.com/getvid" in r["url"]:
                # This response contains the final URL
                try:
                    parsed = json.loads(r["body"])
                    if isinstance(parsed, str):
                        final_url = parsed
                    elif isinstance(parsed, dict):
                        final_url = parsed.get("url") or list(parsed.values())[0]
                except:
                    m = re.search(r'(https?://[^"\'\\]+getvid[^"\'\\]+)', r["body"])
                    if m:
                        final_url = m.group(1).replace("\\/", "/")
            elif "e16.wcostream.com" in r["url"] or "e15.wcostream.com" in r["url"]:
                final_url = r["url"]
        print(f"\n{'='*60}")
        print(f"FINAL VIDEO URL: {final_url}")
        if final_url:
            # Test with curl if it serves video
            import subprocess
            result = subprocess.run(
                ["curl", "-sI", "-m", "15", final_url,
                 "-H", "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                 "-H", "Referer: https://embed.wcostream.com/",
                 "-H", "Range: bytes=0-1024"],
                capture_output=True, text=True, timeout=20
            )
            print(f"\nHEAD response:\n{result.stdout[:1000]}")
            # Also test without Referer
            result2 = subprocess.run(
                ["curl", "-sI", "-m", "15", final_url,
                 "-H", "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                 "-H", "Range: bytes=0-1024"],
                capture_output=True, text=True, timeout=20
            )
            print(f"\nHEAD without Referer:\n{result2.stdout[:500]}")
        # Save all captured responses
        with open("/tmp/wco_all_responses.json", "w") as f:
            json.dump(all_responses, f, indent=2)
        print(f"\nSaved {len(all_responses)} responses to /tmp/wco_all_responses.json")
        await browser.close()

asyncio.run(main())
