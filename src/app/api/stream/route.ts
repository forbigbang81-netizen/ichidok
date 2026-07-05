import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 750;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "Range, Content-Type, Content-Length, Accept, User-Agent",
  "Access-Control-Expose-Headers":
    "Content-Range, Content-Length, Accept-Ranges, Content-Type",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Retry on 5xx and on 429 (rate limit).
      if ((res.status >= 500 && res.status < 600) || res.status === 429) {
        if (attempt < retries - 1) {
          await sleep(RETRY_BACKOFF_MS * (attempt + 1));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr ?? new Error("fetch failed after retries");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json(
      { error: "Invalid 'url' parameter" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Only allow archive.org (covers both archive.org/download/... and
  // archive.org/embed/...).  This keeps the proxy scoped to MKV/CDN sources.
  const allowed = ["archive.org"];
  if (!allowed.includes(parsed.hostname)) {
    return NextResponse.json(
      { error: `Proxy only allows hosts: ${allowed.join(", ")}` },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  const reqHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (compatible; IchidokiProxy/1.0; +https://ichidoki.app)",
    Accept: "*/*",
  };
  const range = request.headers.get("range");
  if (range) reqHeaders["Range"] = range;

  try {
    const upstream = await fetchWithRetry(target, {
      method: "GET",
      headers: reqHeaders,
      redirect: "follow",
    });

    // Pass through status + body, mirror relevant headers.
    const responseHeaders = new Headers(CORS_HEADERS);
    const passthrough = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
      "cache-control",
    ];
    for (const name of passthrough) {
      const v = upstream.headers.get(name);
      if (v) responseHeaders.set(name, v);
    }
    if (upstream.status === 206 || request.headers.get("range")) {
      responseHeaders.set("Accept-Ranges", "bytes");
    }

    if (!upstream.body) {
      return new NextResponse(null, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[/api/stream] proxy error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch upstream resource",
        detail: String(err),
      },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
