import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const ANILIST_GRAPHQL = "https://graphql.anilist.co";
const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int) { Page(page: $page, perPage: $perPage) { media(type: ANIME, search: $search, sort: SEARCH_MATCH) { id idMal title { romaji english native } coverImage { large extraLarge } bannerImage description(asHtml: false) averageScore popularity episodes format status seasonYear genres } } }`;
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1);
  const perPage = Number(searchParams.get("perPage") || 30);
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const res = await fetch(ANILIST_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: q, page, perPage } }) });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const data = await res.json();
    const anime = data.data?.Page?.media ?? [];
    const formatted = anime.map((a: any) => ({
      id: a.id,
      malId: a.idMal,
      // Prefer English title
      title: a.title.english || a.title.romaji || a.title.native || "Unknown",
      titleEnglish: a.title.english,
      poster: a.coverImage.extraLarge || a.coverImage.large,
      banner: a.bannerImage || a.coverImage.extraLarge || a.coverImage.large,
      synopsis: (a.description || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
      score: a.averageScore ? (a.averageScore / 10).toFixed(2) : null,
      popularity: a.popularity,
      episodeCount: a.episodes || 0,
      type: a.format === "TV" ? "TV" : a.format === "MOVIE" ? "Movie" : a.format || "TV",
      status: a.status === "FINISHED" ? "Finished" : a.status === "RELEASING" ? "Currently Airing" : "Not yet aired",
      year: a.seasonYear,
      genres: a.genres || [],
    }));
    return NextResponse.json({ results: formatted });
  } catch (err) {
    console.error("[/api/anilist-search] error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
