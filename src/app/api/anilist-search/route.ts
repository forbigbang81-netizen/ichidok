import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 600;

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

const QUERY = `query ($search: String, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
      id idMal
      title { romaji english native }
      coverImage { large extraLarge color }
      bannerImage
      description(asHtml: false)
      averageScore popularity favourites
      episodes format status season seasonYear
      genres duration
      studios(isMain: true) { nodes { name } }
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const perPage = Number(searchParams.get("perPage") || 30);
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ query: QUERY, variables: { search: q, perPage } }),
    });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const data = await res.json();
    const anime = data.data?.Page?.media ?? [];
    const filtered = anime.filter((a: any) => a.idMal);
    const formatted = filtered.map((a: any) => ({
      id: a.id,
      malId: a.idMal,
      title: a.title.english || a.title.romaji || a.title.native || "Unknown",
      titleEnglish: a.title.english,
      titleRomaji: a.title.romaji,
      titleJapanese: a.title.native,
      poster: a.coverImage.extraLarge || a.coverImage.large,
      banner: a.bannerImage || a.coverImage.extraLarge || a.coverImage.large,
      synopsis: (a.description || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
      score: a.averageScore ? (a.averageScore / 10).toFixed(2) : null,
      popularity: a.popularity,
      episodeCount: a.episodes || 0,
      type: a.format === "TV" ? "TV" : a.format === "MOVIE" ? "Movie" : a.format || "TV",
      status: a.status === "FINISHED" ? "Finished" : a.status === "RELEASING" ? "Currently Airing" : "Not yet aired",
      year: a.seasonYear,
      season: a.season ? a.season.toLowerCase() : null,
      genres: a.genres || [],
      studios: a.studios?.nodes?.map((s: any) => s.name) || [],
      duration: a.duration ? `${a.duration}m` : null,
      nextAiringEpisode: a.nextAiringEpisode
        ? { episode: a.nextAiringEpisode.episode, airingAt: a.nextAiringEpisode.airingAt }
        : null,
    }));
    return NextResponse.json({ results: formatted });
  } catch (err) {
    console.error("[/api/anilist-search] error:", err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
