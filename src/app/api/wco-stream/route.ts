import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/wco-stream?episode=1&lang=sub
 *
 * Uses Playwright to bypass Cloudflare on wcoflix.tv and extract
 * the direct video URL for a One Piece episode. The URL is returned
 * to the client which can use it in a <video> element.
 *
 * The video URLs are time-limited (expire in ~30 min) so they must
 * be fetched on-demand each time the user plays an episode.
 */

const WCOFLIX_BASE = "https://www.wcoflix.tv/one-piece-episode-";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episode = parseInt(searchParams.get("episode") ?? "1", 10);
  const lang = searchParams.get("lang") ?? "sub";

  if (!Number.isFinite(episode) || episode < 1) {
    return NextResponse.json({ error: "Invalid episode number" }, { status: 400 });
  }

  const langSuffix = lang === "dub" ? "english-dubbed" : "english-subbed";
  const episodeUrl = `${WCOFLIX_BASE}${episode}-${langSuffix}`;

  try {
    // Dynamic import to avoid loading playwright at build time
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    await page.goto(episodeUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    const frames = page.frames();
    let videoUrl: string | null = null;

    for (const f of frames) {
      if (f.url().includes("embed.wcostream")) {
        try {
          await f.evaluate(() => {
            const btn = document.getElementById("close-btn");
            if (btn) { btn.disabled = false; btn.click(); }
            const a = document.getElementById("announcement");
            const b = document.getElementById("backdrop");
            if (a) a.style.display = "none";
            if (b) b.style.display = "none";
          });
        } catch {}

        await f.waitForTimeout(5000);

        try {
          videoUrl = await f.evaluate(() => {
            const v = document.querySelector("video");
            return v ? v.src : null;
          });
        } catch {}
        break;
      }
    }

    await browser.close();

    if (videoUrl) {
      return NextResponse.json(
        { ok: true, url: videoUrl, episode, lang },
        { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" } },
      );
    } else {
      return NextResponse.json(
        { ok: false, error: "Could not extract video URL" },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[/api/wco-stream] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch video", detail: String(err) },
      { status: 500 },
    );
  }
}
