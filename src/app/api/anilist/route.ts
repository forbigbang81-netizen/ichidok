import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

// Query fetches nextAiringEpisode for auto-import of new episodes.
// Also accepts a $format param to filter by TV/MOVIE/SPECIAL/OVA/ONA.
const QUERY = `query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $season: MediaSeason, $year: Int, $format: MediaFormat) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: $sort, genre: $genre, season: $season, seasonYear: $year, format: $format, isAdult: false) {
      id idMal
      title { romaji english native }
      coverImage { large extraLarge color }
      bannerImage
      description(asHtml: false)
      averageScore popularity favourites
      episodes format status season seasonYear
      genres duration
      studios(isMain: true) { nodes { name } }
      source
      nextAiringEpisode { episode airingAt }
    }
  }
}`;

async function fetchAniList(page: number, perPage: number, sort: string[], genre?: string, season?: string, year?: number, format?: string) {
  const variables: any = { page, perPage, sort };
  if (genre) variables.genre = genre;
  if (season) variables.season = season;
  if (year) variables.year = year;
  if (format) variables.format = format;
  const res = await fetch(ANILIST_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const data = await res.json();
  return data.data?.Page?.media ?? [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "trending";
  const page = Number(searchParams.get("page") || 1);
  const perPage = Number(searchParams.get("perPage") || 30);

  try {
    const sortMap: Record<string, string[]> = {
      spotlight:     ["TRENDING_DESC"],
      trending:      ["TRENDING_DESC"],
      popular:       ["POPULARITY_DESC"],
      watched:       ["FAVOURITES_DESC"],
      airing:        ["SCORE_DESC"],
      favorite:      ["FAVOURITES_DESC"],
      "top-today":   ["TRENDING_DESC"],
      "top-week":    ["POPULARITY_DESC"],
      "top-month":   ["SCORE_DESC"],
      "top-rated":   ["SCORE_DESC"],
      "new-releases":["START_DATE_DESC"],
      "upcoming":    ["START_DATE_DESC"],
      "classic":     ["POPULARITY_DESC"],
      "movies":      ["POPULARITY_DESC"],
      "specials":    ["POPULARITY_DESC"],
      "onas":        ["POPULARITY_DESC"],
      "ovas":        ["POPULARITY_DESC"],
    };
    const sort = sortMap[section] || ["POPULARITY_DESC"];

    let genre: string | undefined;
    let season: string | undefined;
    let year: number | undefined;
    let format: string | undefined;
    let effectiveSort = sort;

    if (section === "upcoming") {
      effectiveSort = ["START_DATE_DESC"];
    } else if (section === "new-releases") {
      year = new Date().getFullYear() - 1;
    } else if (section === "classic") {
      year = 2009;
    } else if (section === "movies") {
      format = "MOVIE";
    } else if (section === "specials") {
      format = "SPECIAL";
    } else if (section === "onas") {
      format = "ONA";
    } else if (section === "ovas") {
      format = "OVA";
    }

    const anime = await fetchAniList(page, perPage, effectiveSort, genre, season, year, format);

    // Filter out anime without idMal (needed for zokoanime streaming)
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
      synopsis: (a.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim(),
      score: a.averageScore ? (a.averageScore / 10).toFixed(2) : null,
      popularity: a.popularity,
      episodeCount: a.episodes || 0,
      type: a.format === "TV" ? "TV" : a.format === "MOVIE" ? "Movie" : a.format === "SPECIAL" ? "Special" : a.format === "OVA" ? "OVA" : a.format === "ONA" ? "ONA" : a.format || "TV",
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
    console.error("[/api/anilist] error:", err);
    return NextResponse.json({ error: "Failed to fetch anime" }, { status: 500 });
  }
}
