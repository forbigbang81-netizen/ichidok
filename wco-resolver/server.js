/**
 * WCO Stream Resolver — Node.js + puppeteer-core version
 * Uses puppeteer-core which can launch any system Chromium binary.
 * Works on Termux/Android where Playwright refuses to run.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { execSync } = require("child_process");

// Slug maps
const SLUGS_DUB = JSON.parse(fs.readFileSync(path.join(__dirname, "slugs.json"), "utf8"));
const SLUGS_SUB = JSON.parse(fs.readFileSync(path.join(__dirname, "slugs_sub.json"), "utf8"));

// Cache
const cache = new Map();
const CACHE_TTL = 40;

let browser = null;
let puppeteer = null;

function findChromiumBinary() {
  // Try to find chromium binary on the system (Windows, Mac, Linux, Termux)
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    // Windows paths
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    // Mac paths
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Linux paths
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    // Termux paths
    "/data/data/com.termux/files/usr/bin/chromium",
    "/data/data/com.termux/files/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        console.log(`[browser] found chromium at ${p}`);
        return p;
      }
    } catch (e) {}
  }

  // Try `which` command (Linux/Mac only)
  try {
    const result = execSync("which chromium chromium-browser google-chrome 2>/dev/null", { encoding: "utf8" });
    const found = result.trim().split("\n")[0];
    if (found) {
      console.log(`[browser] found chromium via which: ${found}`);
      return found;
    }
  } catch (e) {}

  return null;
}

async function getBrowser() {
  if (browser && browser.connected) return browser;
  puppeteer = require("puppeteer-core");

  const executablePath = findChromiumBinary();
  if (!executablePath) {
    throw new Error("Chromium binary not found. Install with: pkg install chromium");
  }

  console.log(`[browser] launching chromium from ${executablePath}...`);
  browser = await puppeteer.launch({
    executablePath,
    headless: "new",  // Headless mode — works on Windows/Mac/Linux
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-dev-tools",
      "--no-first-run",
      "--no-default-browser-check",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--lang=en-US,en",
      "--window-size=1920,1080",
      "--disable-infobars",
      "--disable-notifications",
    ],
    defaultViewport: { width: 1920, height: 1080 },
    ignoreDefaultArgs: ["--enable-automation"],
  });
  console.log("[browser] launched chromium");
  return browser;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const context = await b.createBrowserContext();

  // Set stealth-like properties
  await context.overridePermissions("https://www.wcoforever.net", ["geolocation"]);

  const page = await context.newPage();

  // Set user agent to look like a real Windows Chrome browser
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    // Hide webdriver
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // Fake plugins
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    // Set languages
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    // Set platform
    Object.defineProperty(navigator, "platform", { get: () => "Win32" });
    // Set hardware concurrency
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    // Set deviceMemory
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    // Add window.chrome
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  });

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
      // Find embed iframe
      const iframeEl = await page.$("iframe[src*='embed.wcostream']");
      if (iframeEl) {
        const frame = await iframeEl.contentFrame();
        if (frame) {
          await sleep(5000);
          const content = await frame.content();

          // Skip announcement
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

          // Click play
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

          // video.play()
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

  // Fallback: parse from neptun
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

  cache.set(slug, { url: videoUrl, expiresAt: Date.now() / 1000 + CACHE_TTL });
  console.log(`[resolved] ${slug} → ${videoUrl.substring(0, 80)}...`);
  return videoUrl;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
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

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      cache_size: cache.size,
      browser: browser ? (browser.connected ? "connected" : "disconnected") : "not_started",
      slugs_dub: Object.keys(SLUGS_DUB).length,
      slugs_sub: Object.keys(SLUGS_SUB).length,
      chromium_path: findChromiumBinary(),
    }));
    return;
  }

  if (pathname === "/debug") {
    const slug = params.get("slug") || "one-piece-episode-2-english-dubbed-2-2";
    try {
      const b = await getBrowser();
      const context = await b.createBrowserContext();
      const page = await context.newPage();
      await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      const sites = [
        "https://www.wcoforever.net",
        "https://www.wcoanimedub.tv",
        "https://www.wcoanimesub.tv",
      ];

      const results = [];
      for (const site of sites) {
        const url = `${site}/${slug}`;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          await sleep(10000);
          const title = await page.title();
          const isCF = title.includes("Just a moment") || title.includes("Performing security");
          const iframeEl = await page.$("iframe[src*='embed.wcostream']");
          let iframeUrl = "";
          if (iframeEl) {
            const frame = await iframeEl.contentFrame();
            if (frame) iframeUrl = frame.url().substring(0, 150);
          }
          results.push({ site, status: "ok", title: title.substring(0, 80), is_cloudflare: isCF, has_iframe: !!iframeEl, iframe_url: iframeUrl });
          if (!isCF) break;
        } catch (e) {
          results.push({ site, status: "error", error: e.message.substring(0, 100) });
        }
      }

      await context.close();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ slug, results }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      service: "WCO Stream Resolver (puppeteer-core)",
      endpoints: ["/resolve", "/resolve-by-ep", "/health", "/slugs"],
    }));
    return;
  }

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

  if (pathname === "/slugs") {
    const audio = params.get("audio") || "dub";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(audio === "sub" ? SLUGS_SUB : SLUGS_DUB));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`WCO Resolver running on http://0.0.0.0:${PORT}`);
  console.log(`DUB slugs: ${Object.keys(SLUGS_DUB).length}, SUB slugs: ${Object.keys(SLUGS_SUB).length}`);
});
