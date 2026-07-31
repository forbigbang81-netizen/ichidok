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
RESOLVE_TIMEOUT = 50  # seconds — max time to resolve one episode
MAX_CONCURRENT = 2    # max concurrent browser tabs (memory-limited)

# ─── Slug map ─────────────────────────────────────────────────────────────────
SLUGS_PATH = Path(__file__).parent / "slugs.json"
with open(SLUGS_PATH) as f:
    SLUG_MAP = json.load(f)  # { "422": "one-piece-episode-422-english-dubbed", ... }

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
                "--single-process",
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

    async def on_response(resp):
        nonlocal video_url
        ct = resp.headers.get("content-type", "")
        if "video/mp4" in ct and "wcostream.com" in resp.url:
            video_url = resp.url

    page.on("response", on_response)

    try:
        url = f"https://m.wcostream.tv/{slug}"
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(12)

        # Find embed iframe and interact with it
        iframe_el = await page.query_selector("iframe[src*='embed.wcostream']")
        if iframe_el:
            frame = await iframe_el.content_frame()
            if frame:
                # Click the ad/play button to trigger video load
                try:
                    btn = await frame.query_selector("#b-reklam, .round-button")
                    if btn:
                        await btn.click()
                        await asyncio.sleep(12)
                except:
                    pass
                # Try to play the video element directly
                try:
                    await frame.evaluate(
                        'document.querySelector("video")?.play()'
                    )
                    await asyncio.sleep(8)
                except:
                    pass

        # Wait a bit more for the video URL to appear
        for _ in range(5):
            if video_url:
                break
            await asyncio.sleep(3)

    except Exception as e:
        print(f"[error] {slug}: {e}", flush=True)
    finally:
        await ctx.close()

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
            {"error": "Resolution timed out", "slug": slug},
            status_code=504,
        )
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "slug": slug},
            status_code=500,
        )


@app.get("/resolve-by-ep")
async def resolve_by_ep_endpoint(
    ep: int = Query(..., description="Episode number"),
    anime: str = Query("one-piece", description="Anime slug prefix"),
    audio: str = Query("dubbed", description="Audio type: dubbed or subbed"),
):
    """Resolve by episode number using the slug map."""
    slug = SLUG_MAP.get(str(ep))
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
        "slugs_loaded": len(SLUG_MAP),
        "uptime": int(time.time()),
    }


@app.get("/slugs")
async def get_slugs():
    """Return the full slug map."""
    return SLUG_MAP


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
