#!/usr/bin/env python3
"""Try Playwright with stealth + human-like interaction to bypass wcostream Cloudflare Turnstile."""
import asyncio
import random
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

URL = "https://m.wcostream.tv/anime/one-piece"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Linux"',
            },
        )
        # Apply stealth
        stealth = Stealth()
        await stealth.apply_stealth_async(ctx)
        page = await ctx.new_page()
        print(f"Navigating to {URL}...")
        try:
            await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            print(f"goto error (continuing): {e}")
        # Try clicking Turnstile checkbox with human-like mouse
        for attempt in range(8):
            await asyncio.sleep(4)
            title = await page.title()
            url = page.url
            print(f"  [{attempt*4}s] title={title!r}")
            if "Just a moment" not in title and "Performing security" not in title:
                print("  Cloudflare bypassed!")
                break
            # Try to find and click the Turnstile checkbox
            try:
                frames = page.frames
                for f in frames:
                    if "challenges.cloudflare" in f.url or "turnstile" in f.url.lower():
                        print(f"  Found CF frame: {f.url[:80]}")
                        # Get the iframe content
                        try:
                            box = await f.frame_locator("iframe").first.locator("body").bounding_box() if False else None
                        except: pass
                        # Try clicking via JS
                        try:
                            checkbox = await f.query_selector("input[type=checkbox]")
                            if checkbox:
                                # Move mouse randomly first (human-like)
                                await page.mouse.move(random.randint(100, 800), random.randint(100, 600))
                                await asyncio.sleep(random.uniform(0.3, 0.7))
                                await checkbox.click()
                                print(f"  [attempt {attempt}] clicked checkbox!")
                                await asyncio.sleep(5)
                        except Exception as e:
                            print(f"  checkbox click error: {e}")
                        # Try clicking the body of the iframe
                        try:
                            await f.click("body", position={"x": 25, "y": 25})
                            print(f"  [attempt {attempt}] clicked body!")
                            await asyncio.sleep(5)
                        except Exception as e:
                            print(f"  body click error: {e}")
            except Exception as e:
                print(f"  frame error: {e}")
        # Final check
        title = await page.title()
        url = page.url
        content = await page.content()
        print(f"\nFinal: title={title!r} url={url}")
        print(f"Content length: {len(content)}")
        if "one piece" in content.lower() and "episode" in content.lower():
            # Find episode links
            import re
            links = re.findall(r'href="([^"]*one-piece[^"]*)"', content, re.IGNORECASE)
            print(f"One Piece links found: {len(links)}")
            for l in links[:10]:
                print(f"  {l}")
        # Save cookies
        cookies = await ctx.cookies()
        print(f"\nCookies ({len(cookies)}):")
        for c in cookies:
            print(f"  {c['name']}={c['value'][:80]}")
        await browser.close()

asyncio.run(main())
