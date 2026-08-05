import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 3600;
const ANILIST_GRAPHQL = "https://graphql.anilist.co";
const QUERY = `query ($page: Int, $perPage: Int, $sort: [MediaSort]) { Page(page: $page, perPage: $perPage) { media(type: ANIME, sort: $sort) { id idMal title { romaji english native } coverImage { large extraLarge color } bannerImage description(asHtml: false) averageScore popularity favourites episodes format status season seasonYear genres duration studios(isMain: true) { nodes { name } } source } } }`;
async function fetchAniList(page: number, perPage: number, sort: string[]) {
  const res = await fetch(ANILIST_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ query: QUERY, variables: { page, perPage, sort } }) });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const data = await res.json();
  return data.data?.Page?.media ?? [];
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "trending";
  const page = Number(searchParams.get("page") || 1);
  const perPage = Number(searchParams.get("perPage") || 20);
  try {
    const sortMap: Record<string, string[]> = { spotlight: ["TRENDING_DESC"], trending: ["TRENDING_DESC"], popular: ["POPULARITY_DESC"], watched: ["FAVOURITES_DESC"], airing: ["SCORE_DESC"], favorite: ["FAVOURITES_DESC"], "top-today": ["TRENDING_DESC"], "top-week": ["POPULARITY_DESC"], "top-month": ["SCORE_DESC"] };
    const sort = sortMap[section] || ["POPULARITY_DESC"];
    const anime = await fetchAniList(page, perPage, sort);
    const formatted = anime.map((a: any) => ({
      id: a.id,
      malId: a.idMal,
      // Prefer English title, then romaji, then native
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
    }));
    return NextResponse.json({ results: formatted });
  } catch (err) {
    console.error("[/api/anilist] error:", err);
    return NextResponse.json({ error: "Failed to fetch anime" }, { status: 500 });
  }
}
