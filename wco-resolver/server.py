#!/usr/bin/env python3
"""
WCO Stream Resolver — resolves wcostream.tv video URLs by bypassing
Cloudflare Turnstile with Playwright + stealth.

Deploy on Railway / Render / Fly.io / any VPS with Docker support.
Set env var PORT (defaults to 8000).

Endpoints:
  GET /resolve?slug=one-piece-episode-422-english-dubbed
    → { "url": "https://e02.wcostream.com/getvid?evid=...", "expiresAt": 1234567890 }
    → { "error": "..." } on failure

  GET /health
    → { "ok": true, "cache_size": N, "browser": "connected" }

  GET /slugs
    → { "422": "one-piece-episode-422-english-dubbed", ... }
"""
import asyncio
import json
import os
import re
import time
import sys
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# ─── Config ───────────────────────────────────────────────────────────────────
PORT = int(os.environ.get("PORT", 8000))
CACHE_TTL = 40        # seconds — tokens expire in ~60s, keep 20s margin
RESOLVE_TIMEOUT = 90  # seconds — max time to resolve one episode (increased for Render)
MAX_CONCURRENT = 1    # max concurrent browser tabs (memory-limited on free tier)

# ─── Slug maps ───────────────────────────────────────────────────────────────
SLUGS_PATH = Path(__file__).parent / "slugs.json"
SLUGS_SUB_PATH = Path(__file__).parent / "slugs_sub.json"
with open(SLUGS_PATH) as f:
    SLUG_MAP_DUB = json.load(f)  # { "422": "one-piece-episode-422-english-dubbed", ... }
with open(SLUGS_SUB_PATH) as f:
    SLUG_MAP_SUB = json.load(f)  # { "1156": "one-piece-episode-1156-english-subbed", ... }

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="WCO Stream Resolver", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow ichidok.vercel.app or any origin
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ─── Browser management ───────────────────────────────────────────────────────
_playwright = None
_browser = None
_browser_lock = asyncio.Lock()
_semaphore = asyncio.Semaphore(MAX_CONCURRENT)
_cache: dict[str, tuple[str, float]] = {}  # slug -> (url, expires_at)


async def get_browser():
    """Get or create a persistent browser instance."""
    global _playwright, _browser
    if _browser and _browser.is_connected():
        return _browser
    async with _browser_lock:
        if _browser and _browser.is_connected():
            return _browser
        if _playwright:
            try:
                await _playwright.stop()
            except:
                pass
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-gpu",
                "--disable-extensions",
            ],
        )
        print(f"[browser] launched chromium", flush=True)
        return _browser


async def resolve_slug(slug: str) -> str:
    """Resolve a wcostream slug to a direct video URL."""
    # Check cache
    if slug in _cache:
        url, expires = _cache[slug]
        if expires > time.time():
            print(f"[cache] hit for {slug}", flush=True)
            return url

    async with _semaphore:
        url = await _resolve_with_browser(slug)
        _cache[slug] = (url, time.time() + CACHE_TTL)
        print(f"[resolved] {slug} → {url[:80]}...", flush=True)
        return url


async def _resolve_with_browser(slug: str) -> str:
    """Open wcostream episode page, capture the video URL from network traffic."""
    browser = await get_browser()
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
        # Capture the direct video stream (e02.wcostream.com or similar)
        if "video/mp4" in ct and "wcostream" in url:
            video_url = url
            print(f"  [capture] video/mp4: {url[:100]}", flush=True)
        # Also capture the neptun response which contains the final URL
        # as a JSON string: "https://e02.wcostream.com/getvid?evid=..."
        if "neptun.wcostream.com/getvid" in url:
            try:
                body = await resp.text()
                if body and "getvid" in body:
                    neptun_body = body
                    print(f"  [capture] neptun response: {body[:100]}", flush=True)
            except:
                pass

    page.on("response", on_response)

    try:
        # Use wcoanimedub.tv for dubbed episodes, wcoanimesub.tv for subbed.
        # Both sites share the same embed.wcostream.com backend.
        base_url = "https://www.wcoanimesub.tv" if slug.endswith("-english-subbed") or "subbed" in slug else "https://www.wcoanimedub.tv"
        url = f"{base_url}/{slug}"
        print(f"  [goto] {url}", flush=True)
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(15)

        # Find embed iframe and interact with it
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                # Wait for the iframe to fully load
                await asyncio.sleep(5)
                
                # Check if we got the video player or the announcement page
                content = await frame.content()
                if "Announcement" in content:
                    print(f"  [info] got Announcement page, looking for skip button...", flush=True)
                    # Try clicking the close/skip button on the announcement
                    for selector in [".btn-close:not([disabled])", "#b-reklam", ".round-button", "button:not([disabled])"]:
                        try:
                            el = await frame.query_selector(selector)
                            if el:
                                await el.click()
                                print(f"  [click] {selector} on announcement", flush=True)
                                await asyncio.sleep(10)
                                break
                        except:
                            pass
                
                # Click the play/ad button to trigger video load
                for selector in ["#b-reklam", ".round-button", ".vjs-big-play-button", "button.vjs-big-play-button"]:
                    try:
                        btn = await frame.query_selector(selector)
                        if btn:
                            await btn.click()
                            print(f"  [click] {selector} clicked", flush=True)
                            await asyncio.sleep(12)
                            break
                    except:
                        pass
                
                # Try to play the video element directly
                try:
                    await frame.evaluate(
                        'document.querySelector("video")?.play()'
                    )
                    print(f"  [play] video.play() called", flush=True)
                    await asyncio.sleep(10)
                except:
                    pass

        # Wait a bit more for the video URL to appear
        for i in range(10):
            if video_url:
                break
            await asyncio.sleep(3)

    except Exception as e:
        print(f"[error] {slug}: {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
    finally:
        await ctx.close()

    # If we got the neptun response but not the direct video URL,
    # parse the URL from the neptun JSON body.
    if not video_url and neptun_body:
        try:
            import json
            parsed = json.loads(neptun_body)
            if isinstance(parsed, str):
                video_url = parsed
            elif isinstance(parsed, dict):
                video_url = parsed.get("url") or list(parsed.values())[0]
            print(f"  [fallback] parsed from neptun: {video_url[:100]}", flush=True)
        except:
            import re
            m = re.search(r'(https?://[^"\'\\]+getvid[^"\'\\]+)', neptun_body)
            if m:
                video_url = m.group(1).replace("\\/", "/")
                print(f"  [fallback] regex from neptun: {video_url[:100]}", flush=True)

    if not video_url:
        raise RuntimeError(f"Failed to resolve video URL for {slug}")
    return video_url


# ─── Cleanup ──────────────────────────────────────────────────────────────────
@app.on_event("shutdown")
async def shutdown():
    global _playwright, _browser
    if _browser:
        await _browser.close()
    if _playwright:
        await _playwright.stop()


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/resolve")
async def resolve_endpoint(slug: str = Query(..., description="wcostream episode slug")):
    """Resolve a slug to a direct video URL."""
    try:
        url = await asyncio.wait_for(resolve_slug(slug), timeout=RESOLVE_TIMEOUT)
        return {"url": url, "expiresAt": int(time.time()) + CACHE_TTL}
    except asyncio.TimeoutError:
        return JSONResponse(
            {"error": "Resolution timed out", "slug": slug, "timeout": RESOLVE_TIMEOUT},
            status_code=504,
        )
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "slug": slug, "error_type": type(e).__name__},
            status_code=500,
        )


@app.get("/debug")
async def debug_endpoint(slug: str = Query(..., description="slug to debug")):
    """Debug endpoint — returns page title, iframe URL, and content length."""
    try:
        browser = await get_browser()
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        await Stealth().apply_stealth_async(ctx)
        page = await ctx.new_page()
        base_url = "https://www.wcoanimesub.tv" if "subbed" in slug else "https://www.wcoanimedub.tv"
        url = f"{base_url}/{slug}"
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(10)
        title = await page.title()
        # Check for Cloudflare
        is_cf = "Just a moment" in title or "Performing security" in title
        # Check for iframe
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        iframe_url = ""
        iframe_content_len = 0
        iframe_title = ""
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                iframe_url = frame.url[:200]
                iframe_content = await frame.content()
                iframe_content_len = len(iframe_content)
                iframe_title_match = re.search(r'<title>([^<]+)</title>', iframe_content)
                iframe_title = iframe_title_match.group(1) if iframe_title_match else ""
        result = {
            "slug": slug,
            "url": url,
            "page_title": title,
            "is_cloudflare": is_cf,
            "has_iframe": iframe_el is not None,
            "iframe_url": iframe_url,
            "iframe_title": iframe_title,
            "iframe_content_length": iframe_content_len,
        }
        await ctx.close()
        return result
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "error_type": type(e).__name__},
            status_code=500,
        )


@app.get("/resolve-by-ep")
async def resolve_by_ep_endpoint(
    ep: int = Query(..., description="Episode number"),
    anime: str = Query("one-piece", description="Anime slug prefix"),
    audio: str = Query("dubbed", description="Audio type: dubbed or subbed"),
):
    """Resolve by episode number using the appropriate slug map."""
    # Choose slug map based on audio type
    slug_map = SLUG_MAP_SUB if audio == "subbed" or audio == "sub" else SLUG_MAP_DUB
    slug = slug_map.get(str(ep))
    if not slug:
        # Try constructing from pattern
        slug = f"{anime}-episode-{ep}-english-{audio}"
    return await resolve_endpoint(slug=slug)


@app.get("/health")
async def health():
    browser_ok = _browser is not None and _browser.is_connected()
    return {
        "ok": True,
        "cache_size": len(_cache),
        "browser": "connected" if browser_ok else "disconnected",
        "slugs_dub": len(SLUG_MAP_DUB),
        "slugs_sub": len(SLUG_MAP_SUB),
        "uptime": int(time.time()),
    }


@app.get("/slugs")
async def get_slugs(audio: str = Query("dubbed", description="dubbed or subbed")):
    """Return the slug map for the requested audio type."""
    return SLUG_MAP_SUB if audio in ("subbed", "sub") else SLUG_MAP_DUB


@app.get("/")
async def root():
    return {
        "service": "WCO Stream Resolver",
        "endpoints": ["/resolve", "/resolve-by-ep", "/health", "/slugs"],
        "episodes_available": len(SLUG_MAP),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
