// Airing schedule route — returns currently-airing anime + their next episode info.
// This is used by the "auto-import new episodes" feature: when a new episode airs,
// AniList reports it via nextAiringEpisode, and our client uses that to expand
// the episode list automatically.
//
// Also used to show a "New Episodes" section on the homepage.

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30 min — fresh enough for airing data

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

// Fetch anime that are CURRENTLY AIRING (status = RELEASING) and have a
// nextAiringEpisode scheduled. Sorted by next airing time.
const QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, status: RELEASING, sort: TRENDING_DESC, isAdult: false) {
      id idMal
      title { romaji english native }
      coverImage { large extraLarge }
      bannerImage
      episodes
      format
      seasonYear
      duration
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const perPage = Number(searchParams.get("perPage") || 30);

  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ query: QUERY, variables: { page: 1, perPage } }),
    });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const data = await res.json();
    const media = (data.data?.Page?.media ?? []).filter((a: any) => a.idMal && a.nextAiringEpisode);

    // Sort by airingAt ascending (next to air first)
    const sorted = [...media].sort((a: any, b: any) => {
      const ta = a.nextAiringEpisode?.airingAt || 0;
      const tb = b.nextAiringEpisode?.airingAt || 0;
      return ta - tb;
    });

    const formatted = sorted.map((a: any) => ({
      id: a.id,
      malId: a.idMal,
      title: a.title.english || a.title.romaji || a.title.native || "Unknown",
      poster: a.coverImage.extraLarge || a.coverImage.large,
      banner: a.bannerImage || a.coverImage.extraLarge || a.coverImage.large,
      episodeCount: a.episodes || 0,
      type: a.format === "TV" ? "TV" : a.format === "MOVIE" ? "Movie" : a.format || "TV",
      year: a.seasonYear,
      duration: a.duration ? `${a.duration}m` : null,
      nextAiringEpisode: {
        episode: a.nextAiringEpisode.episode,
        airingAt: a.nextAiringEpisode.airingAt,
      },
    }));

    return NextResponse.json({ results: formatted, fetchedAt: Date.now() });
  } catch (err) {
    console.error("[/api/airing-schedule] error:", err);
    return NextResponse.json({ error: "Failed to fetch airing schedule" }, { status: 500 });
  }
}
