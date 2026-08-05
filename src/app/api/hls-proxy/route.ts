// HLS proxy route — fetches m3u8/ts files from upstream HLS CDNs and
// re-serves them with permissive CORS headers so our client-side
// hls.js player can load them from any origin (localhost / vercel).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 12000;

function rewriteM3u8Urls(content: string, baseUrl: string): string {
  const proxy = (u: string) =>
    `/api/hls-proxy?url=${encodeURIComponent(new URL(u, baseUrl).toString())}`;

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

    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=300",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    if (isM3u8) {
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      const body = await upstream.text();
      const rewritten = rewriteM3u8Urls(body, targetUrl.toString());
      return new NextResponse(rewritten, { status: 200, headers });
    } else {
      if (contentType) headers.set("Content-Type", contentType);
      const buf = await upstream.arrayBuffer();
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
