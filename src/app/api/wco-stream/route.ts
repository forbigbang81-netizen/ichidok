import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/wco-stream?episode=1&lang=sub
 *
 * Uses puppeteer-core + @sparticuz/chromium (serverless-compatible)
 * to bypass Cloudflare on wcoflix.tv and extract the direct video URL.
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

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to the episode page
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 5000));

    // Find the embed iframe and extract video URL
    const frames = page.frames();
    let videoUrl: string | null = null;

    for (const frame of frames) {
      const frameUrl = frame.url();
      if (frameUrl.includes("embed.wcostream")) {
        // Close announcement overlay
        try {
          await frame.evaluate(() => {
            const btn = document.getElementById("close-btn");
            if (btn) {
              (btn as any).disabled = false;
              btn.click();
            }
            const a = document.getElementById("announcement");
            const b = document.getElementById("backdrop");
            if (a) (a as HTMLElement).style.display = "none";
            if (b) (b as HTMLElement).style.display = "none";
          });
        } catch {}

        await new Promise((r) => setTimeout(r, 5000));

        // Extract video source
        try {
          videoUrl = await frame.evaluate(() => {
            const v = document.querySelector("video");
            return v ? v.src : null;
          });
        } catch {}
        break;
      }
    }

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
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
