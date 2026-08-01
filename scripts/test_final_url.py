#!/usr/bin/env python3
"""Test if we can resolve wcostream video URL using plain HTTP (no browser) with the cf_clearance cookie."""
import asyncio
import re
import json
import urllib.parse
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
        # Set up response capture for the getvidlink call
        getvidlink_response = None
        neptun_response = None
        async def on_response(resp):
            nonlocal getvidlink_response, neptun_response
            url = resp.url
            if "getvidlink.php" in url:
                try:
                    body = await resp.text()
                    getvidlink_response = {"url": url, "body": body}
                except: pass
            elif "neptun.wcostream.com/getvid" in url:
                try:
                    body = await resp.text()
                    neptun_response = {"url": url, "body": body}
                except: pass
        page.on("response", on_response)
        await page.goto(EP_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(15)  # Wait for all requests
        # Extract final video URL
        final_url = None
        if neptun_response:
            print(f"Neptun response body: {neptun_response['body'][:500]}")
            # Body is a JSON string containing the URL
            try:
                parsed = json.loads(neptun_response["body"])
                if isinstance(parsed, str):
                    final_url = parsed
                elif isinstance(parsed, dict):
                    final_url = parsed.get("url") or parsed.get("hd") or list(parsed.values())[0]
            except:
                # Try regex
                m = re.search(r'(https?://[^"\']+getvid[^"\']+)', neptun_response["body"])
                if m: final_url = m.group(1)
        elif getvidlink_response:
            print(f"Getvidlink response: {getvidlink_response['body'][:500]}")
            try:
                data = json.loads(getvidlink_response["body"])
                enc = data.get("enc")
                if enc:
                    # Call neptun directly
                    import urllib.request
                    req = urllib.request.Request(f"https://neptun.wcostream.com/getvid?evid={enc}", headers={
                        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                        "Referer": "https://embed.wcostream.com/",
                    })
                    with urllib.request.urlopen(req, timeout=10) as r:
                        neptun_body = r.read().decode()
                        print(f"Direct neptun call body: {neptun_body[:500]}")
                        m = re.search(r'(https?://[^"\'\\]+)', neptun_body)
                        if m: final_url = m.group(1).replace("\\/", "/")
            except Exception as e:
                print(f"Direct neptun call failed: {e}")
        print(f"\n=== FINAL VIDEO URL ===\n{final_url}")
        if final_url:
            # Test if it plays video (HEAD request)
            import urllib.request
            req = urllib.request.Request(final_url, method="HEAD", headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Referer": "https://embed.wcostream.com/",
                "Range": "bytes=0-1024",
            })
            try:
                with urllib.request.urlopen(req, timeout=15) as r:
                    print(f"HEAD status: {r.status}")
                    print(f"Content-Type: {r.headers.get('Content-Type')}")
                    print(f"Content-Length: {r.headers.get('Content-Length')}")
                    print(f"Accept-Ranges: {r.headers.get('Accept-Ranges')}")
                    print(f"Headers: {dict(r.headers)}")
            except Exception as e:
                print(f"HEAD failed: {e}")
        # Save cookies for later use
        cookies = await ctx.cookies()
        print(f"\n=== COOKIES ===")
        for c in cookies:
            print(f"  {c['name']}={c['value'][:80]} (domain: {c['domain']})")
        await browser.close()

asyncio.run(main())
