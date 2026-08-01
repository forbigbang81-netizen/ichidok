/**
 * WCO Stream Resolver — Node.js version
 * Runs on Termux (Android) with residential IP to bypass Cloudflare.
 * Uses Playwright + stealth to resolve wcostream video URLs.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// Slug maps (loaded from JSON files)
const SLUGS_DUB = JSON.parse(fs.readFileSync(path.join(__dirname, "slugs.json"), "utf8"));
const SLUGS_SUB = JSON.parse(fs.readFileSync(path.join(__dirname, "slugs_sub.json"), "utf8"));

// Cache: slug -> { url, expiresAt }
const cache = new Map();
const CACHE_TTL = 40; // seconds (tokens expire in ~60s)

// Browser instance (lazy-loaded)
let browser = null;
let playwright = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  playwright = require("playwright");
  browser = await playwright.chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-gpu",
      "--disable-extensions",
    ],
  });
  console.log("[browser] launched chromium");
  return browser;
}

async function resolveSlug(slug) {
  // Check cache
  if (cache.has(slug)) {
    const { url, expiresAt } = cache.get(slug);
    if (expiresAt > Date.now() / 1000) {
      console.log(`[cache] hit for ${slug}`);
      return url;
    }
  }

  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });

  // Apply stealth (simple version — hides webdriver flag)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  });

  const page = await context.newPage();
  let videoUrl = null;
  let neptunBody = null;

  page.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";
    if (ct.includes("video/mp4") && url.includes("wcostream")) {
      videoUrl = url;
      console.log(`  [capture] video/mp4: ${url.substring(0, 100)}`);
    }
    if (url.includes("neptun.wcostream.com/getvid")) {
      try {
        const body = await response.text();
        if (body && body.includes("getvid")) {
          neptunBody = body;
          console.log(`  [capture] neptun: ${body.substring(0, 100)}`);
        }
      } catch (e) {}
    }
  });

  try {
    // Try multiple WCO sites
    const sites = [
      "https://www.wcoforever.net",
      slug.includes("subbed") ? "https://www.wcoanimesub.tv" : "https://www.wcoanimedub.tv",
      slug.includes("subbed") ? "https://www.wcoanimedub.tv" : "https://www.wcoanimesub.tv",
    ];

    let loaded = false;
    for (const site of sites) {
      const url = `${site}/${slug}`;
      console.log(`  [goto] ${url}`);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await sleep(15000);
        const title = await page.title();
        if (!title.includes("Just a moment") && !title.includes("Performing security")) {
          loaded = true;
          break;
        }
        console.log(`  [cf-blocked] trying next site...`);
      } catch (e) {
        console.log(`  [error] ${e.message.substring(0, 80)}`);
      }
    }

    if (loaded) {
      // Find embed iframe and interact
      const iframeEl = await page.$("iframe[src*='embed.wcostream']");
      if (iframeEl) {
        const frame = await iframeEl.contentFrame();
        if (frame) {
          await sleep(5000);
          const content = await frame.content();

          // Skip announcement if present
          if (content.includes("Announcement")) {
            for (const sel of [".btn-close:not([disabled])", "#b-reklam", ".round-button"]) {
              try {
                const el = await frame.$(sel);
                if (el) {
                  await el.click();
                  console.log(`  [click] ${sel}`);
                  await sleep(10000);
                  break;
                }
              } catch (e) {}
            }
          }

          // Click play button
          for (const sel of [".vjs-big-play-button", "#b-reklam", ".round-button"]) {
            try {
              const btn = await frame.$(sel);
              if (btn) {
                await btn.click();
                console.log(`  [click] ${sel}`);
                await sleep(12000);
                break;
              }
            } catch (e) {}
          }

          // Try video.play()
          try {
            await frame.evaluate('document.querySelector("video")?.play()');
            console.log("  [play] video.play() called");
            await sleep(8000);
          } catch (e) {}
        }
      }

      // Wait for video URL
      for (let i = 0; i < 10; i++) {
        if (videoUrl) break;
        await sleep(3000);
      }
    }
  } catch (e) {
    console.log(`[error] ${slug}: ${e.message}`);
  } finally {
    await context.close();
  }

  // Fallback: parse from neptun response
  if (!videoUrl && neptunBody) {
    try {
      const parsed = JSON.parse(neptunBody);
      if (typeof parsed === "string") {
        videoUrl = parsed;
      } else if (parsed && parsed.url) {
        videoUrl = parsed.url;
      }
      console.log(`  [fallback] parsed: ${videoUrl.substring(0, 100)}`);
    } catch (e) {
      const m = neptunBody.match(/(https?:\/\/[^"\\]+getvid[^"\\]+)/);
      if (m) {
        videoUrl = m[1].replace(/\\\//g, "/");
        console.log(`  [fallback] regex: ${videoUrl.substring(0, 100)}`);
      }
    }
  }

  if (!videoUrl) {
    throw new Error(`Failed to resolve video URL for ${slug}`);
  }

  // Cache it
  cache.set(slug, { url: videoUrl, expiresAt: Date.now() / 1000 + CACHE_TTL });
  console.log(`[resolved] ${slug} → ${videoUrl.substring(0, 80)}...`);
  return videoUrl;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${process.env.PORT || 8000}`);
  const pathname = parsedUrl.pathname;
  const params = parsedUrl.searchParams;

  // Health check
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      cache_size: cache.size,
      browser: browser ? (browser.isConnected() ? "connected" : "disconnected") : "not_started",
      slugs_dub: Object.keys(SLUGS_DUB).length,
      slugs_sub: Object.keys(SLUGS_SUB).length,
    }));
    return;
  }

  // Root
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      service: "WCO Stream Resolver (Node.js)",
      endpoints: ["/resolve", "/resolve-by-ep", "/health", "/slugs"],
      episodes_dub: Object.keys(SLUGS_DUB).length,
      episodes_sub: Object.keys(SLUGS_SUB).length,
    }));
    return;
  }

  // Resolve by slug
  if (pathname === "/resolve") {
    const slug = params.get("slug");
    if (!slug) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'slug' parameter" }));
      return;
    }
    try {
      const url = await Promise.race([
        resolveSlug(slug),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 90000)),
      ]);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url, expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message, slug }));
    }
    return;
  }

  // Resolve by episode number
  if (pathname === "/resolve-by-ep") {
    const ep = params.get("ep");
    const audio = params.get("audio") || "dub";
    if (!ep) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'ep' parameter" }));
      return;
    }
    const slugMap = audio === "sub" ? SLUGS_SUB : SLUGS_DUB;
    let slug = slugMap[ep];
    if (!slug) {
      slug = `one-piece-episode-${ep}-english-${audio === "sub" ? "subbed" : "dubbed"}`;
    }
    try {
      const url = await Promise.race([
        resolveSlug(slug),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 90000)),
      ]);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url, expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message, slug }));
    }
    return;
  }

  // Get slugs
  if (pathname === "/slugs") {
    const audio = params.get("audio") || "dub";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(audio === "sub" ? SLUGS_SUB : SLUGS_DUB));
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`WCO Resolver running on http://0.0.0.0:${PORT}`);
  console.log(`DUB slugs: ${Object.keys(SLUGS_DUB).length}, SUB slugs: ${Object.keys(SLUGS_SUB).length}`);
});
