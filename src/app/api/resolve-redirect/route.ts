import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * GET /api/resolve-redirect?url=<archive.org url>
 *
 * Resolves 302 redirects server-side and returns the final CDN URL.
 * Used by the CastButton to get a direct URL that Chromecast can play.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!parsed.hostname.includes("archive.org")) {
    return NextResponse.json({ error: "Only archive.org URLs allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "ichidoki/1.0" },
    });
    const finalUrl = res.url || target;
    return NextResponse.json({ originalUrl: target, resolvedUrl: finalUrl });
  } catch (err) {
    return NextResponse.json({ originalUrl: target, resolvedUrl: target, error: String(err) });
  }
}
