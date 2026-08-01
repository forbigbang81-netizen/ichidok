#!/usr/bin/env python3
"""Try Playwright with stealth to bypass animepahe.pw Cloudflare challenge."""
import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

URL = "https://animepahe.pw/anime/one-piece"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        # Apply stealth
        stealth = Stealth()
        await stealth.apply_stealth_async(ctx)
        page = await ctx.new_page()
        print(f"Navigating to {URL}...")
        await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        # Wait for cloudflare challenge to potentially pass
        for i in range(8):
            await asyncio.sleep(5)
            title = await page.title()
            url = page.url
            print(f"  [{i*5}s] title={title!r} url={url}")
            if "Just a moment" not in title and "Performing security" not in title:
                print("  Cloudflare bypassed!")
                break
        # Print final state
        content = await page.content()
        print(f"\nFinal content length: {len(content)}")
        print(f"Body preview: {content[:600]}")
        # Look for episode links
        import re
        eps = re.findall(r'/anime/([a-z0-9-]+)', content)
        unique_eps = list(set(eps))[:10]
        print(f"Anime slugs found: {unique_eps}")
        # Save cookies
        cookies = await ctx.cookies()
        print(f"\nCookies ({len(cookies)}):")
        for c in cookies[:5]:
            print(f"  {c['name']}={c['value'][:50]}")
        await browser.close()

asyncio.run(main())
