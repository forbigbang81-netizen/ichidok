import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route fetches the HLS video URL from zokoanime.video
// Usage: /api/stream-source?malId=21&episode=1&audio=dub

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId = searchParams.get("malId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";

  if (!malId || !episode) {
    return NextResponse.json({ error: "Missing malId or episode" }, { status: 400 });
  }

  try {
    // Fetch the zokoanime player page
    const playerUrl = `https://zokoanime.video/stream/mal/${malId}/${episode}/${audio}`;
    const res = await fetch(playerUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://anigo.re/",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch player page" }, { status: 502 });
    }

    const html = await res.text();

    // The HLS URL is embedded in the page's JavaScript
    // Look for the master.m3u8 URL pattern
    const m3u8Match = html.match(/https:\/\/[^"']+\/master\.m3u8/);
    
    if (m3u8Match) {
      return NextResponse.json({
        url: m3u8Match[0],
        type: "hls",
        quality: "1080p",
      });
    }

    // If not found in HTML, the URL might be encoded in window.__P
    // Try to extract and decode it
    const encodedMatch = html.match(/window\.__P="([^"]+)"/);
    if (encodedMatch) {
      // The encoded string needs to be decoded by the player.js
      // We can't easily decode it server-side, so return the player URL
      // and let the client handle it
      return NextResponse.json({
        url: playerUrl,
        type: "embed",
        quality: "1080p",
      });
    }

    return NextResponse.json({ error: "Could not find video URL" }, { status: 404 });
  } catch (err) {
    console.error("[/api/stream-source] error:", err);
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 });
  }
}
