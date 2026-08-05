// Proxy route for the AniSkip skip-times API.
// The upstream API requires types as an array and an episodeLength, and it
// is sometimes empty - so we fall back to a small built-in DB of known
// intro times for popular anime.

import { NextResponse } from "next/server";
import { INTRO_TIMES } from "@/lib/video-sources";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId = searchParams.get("malId");
  const episode = Number(searchParams.get("episode") || 1);
  const episodeLength = Number(searchParams.get("episodeLength") || 24);

  if (!malId) {
    return NextResponse.json({ error: "malId required" }, { status: 400 });
  }

  // Try AniSkip upstream first
  try {
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episode}?episodeLength=${episodeLength}&types=op&types=ed&types=mixed-op&types=mixed-ed&types=recap`;
    const r = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ichidoki/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.found && Array.isArray(data.results) && data.results.length > 0) {
        // Map to a simpler shape
        const skipTimes = data.results.map((s: any) => ({
          type: s.skipType,
          start: s.interval.startTime,
          end: s.interval.endTime,
          episodeLength: s.episodeLength,
        }));
        return NextResponse.json({ found: true, source: "aniskip", skipTimes });
      }
    }
  } catch {
    // fall through to local DB
  }

  // Fall back to local DB
  const local = INTRO_TIMES[Number(malId)];
  if (local) {
    return NextResponse.json({
      found: true,
      source: "local-db",
      skipTimes: [
        { type: "op", start: local.start, end: local.end, episodeLength },
      ],
    });
  }

  // Default guess for any modern anime: 0 - 90s intro
  return NextResponse.json({
    found: true,
    source: "default",
    skipTimes: [
      { type: "op", start: 0, end: 90, episodeLength },
    ],
  });
}
