#!/usr/bin/env python3
"""Debug: resolve wcostream episode and save all captured responses."""
import asyncio
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

SLUG = "one-piece-episode-422-english-dubbed"

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
        
        all_media = []
        async def on_response(resp):
            url = resp.url
            ct = resp.headers.get("content-type", "")
            if any(k in url.lower() for k in ["getvidlink", "getvid", "neptun", "e0", "e1", "video", ".mp4", "wcostream.com/get"]) or "video/" in ct:
                try:
                    body = ""
                    if "text" in ct or "json" in ct:
                        body = await resp.text()
                        body = body[:500]
                except: body = ""
                all_media.append({"url": url[:200], "status": resp.status, "ct": ct[:30], "body": body})
                print(f"  [{resp.status}] {ct[:25]} | {url[:150]}")
                if body:
                    print(f"    body: {body[:300]}")
        page.on("response", on_response)
        
        url = f"https://m.wcostream.tv/{SLUG}"
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(15)
        
        # Check if Cloudflare blocked us
        title = await page.title()
        print(f"\nPage title: {title}")
        if "Just a moment" in title or "Performing security" in title:
            print("CLOUDFLARE BLOCKED! Waiting longer...")
            await asyncio.sleep(15)
            title = await page.title()
            print(f"Title after wait: {title}")
        
        # Find embed iframe
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                frame_url = frame.url[:200]
                print(f"\nEmbed iframe URL: {frame_url}")
                content = await frame.content()
                print(f"Iframe content length: {len(content)}")
                
                # Check what's in the iframe
                if "Announcement" in content:
                    print("→ Got ANNOUNCEMENT page (pre-roll ad)")
                    # Look for the skip/continue button
                    buttons = re.findall(r'<button[^>]*>(.*?)</button>', content, re.DOTALL)
                    print(f"Buttons found: {len(buttons)}")
                    for b in buttons[:5]:
                        clean = re.sub(r'<[^>]+>', '', b).strip()
                        if clean:
                            print(f"  button: {clean[:50]}")
                    # Look for the close button or continue link
                    links = re.findall(r'<a[^>]+href="([^"]*)"[^>]*>(.*?)</a>', content, re.DOTALL)
                    for href, text in links[:10]:
                        clean = re.sub(r'<[^>]+>', '', text).strip()
                        if clean and "video" in clean.lower() or "play" in clean.lower() or "continue" in clean.lower():
                            print(f"  link: {clean[:50]} → {href[:100]}")
                elif "video-js" in content or "video.js" in content:
                    print("→ Got VIDEO PLAYER page!")
                    # Look for the play button
                    sources = re.findall(r'<source[^>]+src="([^"]+)"', content)
                    print(f"Sources: {sources[:3]}")
                    getvidlink = re.findall(r'getvidlink\.php[^"\']*', content)
                    print(f"getvidlink calls: {getvidlink[:3]}")
                
                # Try clicking various buttons
                for selector in ["#b-reklam", ".round-button", ".btn-close", "button", ".vjs-big-play-button"]:
                    try:
                        el = await frame.query_selector(selector)
                        if el:
                            is_disabled = await el.get_attribute("disabled")
                            text = await el.text_content() or ""
                            print(f"\nTrying {selector}: text='{text[:30]}', disabled={is_disabled}")
                            if not is_disabled:
                                await el.click()
                                print(f"  Clicked!")
                                await asyncio.sleep(10)
                                break
                    except Exception as e:
                        print(f"  {selector}: {e}")
                
                # Try playing video
                try:
                    await frame.evaluate('document.querySelector("video")?.play()')
                    print("\nCalled video.play()")
                    await asyncio.sleep(10)
                except Exception as e:
                    print(f"video.play() error: {e}")
        
        # Wait more
        await asyncio.sleep(10)
        
        print(f"\n=== ALL MEDIA URLS ({len(all_media)}) ===")
        for m in all_media:
            print(f"  [{m['status']}] {m['ct']} | {m['url']}")
            if m['body']:
                print(f"    body: {m['body'][:300]}")
        
        await browser.close()

asyncio.run(main())
