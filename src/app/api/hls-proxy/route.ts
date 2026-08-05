// HLS proxy route — fetches m3u8/ts files from upstream HLS CDNs and
// re-serves them with permissive CORS headers so our client-side
// hls.js player can load them from any origin (localhost / vercel).
//
// Usage:
//   /api/hls-proxy?url=<encoded HLS URL>
//
// The route:
//   1. Fetches the upstream file with browser-like headers
//   2. For .m3u8 files: rewrites all relative/absolute URLs in the
//      playlist to also go through this proxy (recursive)
//   3. Serves the bytes back with Access-Control-Allow-Origin: *
//   4. Preserves content-type

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 12000;

function rewriteM3u8Urls(content: string, baseUrl: string): string {
  // Resolve relative URLs against baseUrl, then route them through /api/hls-proxy
  const proxy = (u: string) =>
    `/api/hls-proxy?url=${encodeURIComponent(new URL(u, baseUrl).toString())}`;

  // Rewrite lines that are NOT comments (don't start with #)
  // OR #EXT-X-KEY / #EXT-X-MAP URI attributes
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite URI="..." attributes in tags
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, p1) => `URI="${proxy(p1)}"`);
      }

      // Plain URL line — proxy it
      return proxy(trimmed);
    })
    .join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Validate URL — must be http/https
  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
    if (!/^https?:$/.test(targetUrl.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        Origin: "https://zokoanime.video",
        Referer: "https://zokoanime.video/",
      },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    const isM3u8 =
      contentType.includes("mpegurl") ||
      contentType.includes("m3u8") ||
      targetUrl.pathname.endsWith(".m3u8") ||
      targetUrl.pathname.endsWith(".m3u");

    // Always pass through bytes; for m3u8 also rewrite URLs
    const body = await upstream.text();

    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=300",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    if (isM3u8) {
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      const rewritten = rewriteM3u8Urls(body, targetUrl.toString());
      return new NextResponse(rewritten, { status: 200, headers });
    } else {
      // For .ts segments, return binary
      if (contentType) headers.set("Content-Type", contentType);
      // Re-fetch as binary (we already consumed as text — but for segments
      // we need bytes, so re-fetch)
      const binRes = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Origin: "https://zokoanime.video",
          Referer: "https://zokoanime.video/",
        },
      });
      const buf = await binRes.arrayBuffer();
      return new NextResponse(buf, { status: 200, headers });
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "upstream timeout" }, { status: 504 });
    }
    console.error("[/api/hls-proxy] error:", err);
    return NextResponse.json(
      { error: err?.message || "proxy failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
