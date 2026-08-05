import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 3600;
const ANILIST_GRAPHQL = "https://graphql.anilist.co";
const DETAIL_QUERY = `query ($id: Int) { Media(id: $id, type: ANIME) { id idMal title { romaji english native } coverImage { large extraLarge color } bannerImage description(asHtml: false) averageScore popularity favourites episodes format status season seasonYear genres duration studios(isMain: true) { nodes { name } } source relations { edges { relationType node { id title { romaji english } coverImage { large extraLarge } format type } } } recommendations(sort: RATING_DESC, perPage: 12) { nodes { mediaRecommendation { id title { romaji english } coverImage { large extraLarge } averageScore episodes format } } } } }`;
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  try {
    const res = await fetch(ANILIST_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ query: DETAIL_QUERY, variables: { id } }) });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const data = await res.json();
    const a = data.data?.Media;
    if (!a) return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    return NextResponse.json({
      id: a.id,
      malId: a.idMal,
      // Prefer English title
      title: a.title.english || a.title.romaji || a.title.native || "Unknown",
      titleEnglish: a.title.english,
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
      // Use English titles for seasons and recommendations too
      seasons: (a.relations?.edges || []).filter((e: any) => e.node.type === "ANIME" && ["PREQUEL", "SEQUEL", "SIDE_STORY", "SUMMARY", "ALTERNATIVE", "PARENT"].includes(e.relationType)).map((e: any) => ({ id: e.node.id, title: e.node.title.english || e.node.title.romaji || "Unknown", poster: e.node.coverImage.extraLarge || e.node.coverImage.large, relation: e.relationType.replace("_", " ").toLowerCase(), type: e.node.format || "TV" })),
      recommendations: (a.recommendations?.nodes || []).filter((n: any) => n.mediaRecommendation).map((n: any) => ({ id: n.mediaRecommendation.id, title: n.mediaRecommendation.title.english || n.mediaRecommendation.title.romaji || "Unknown", poster: n.mediaRecommendation.coverImage.extraLarge || n.mediaRecommendation.coverImage.large, score: n.mediaRecommendation.averageScore ? (n.mediaRecommendation.averageScore / 10).toFixed(2) : null, episodes: n.mediaRecommendation.episodes || 0, type: n.mediaRecommendation.format || "TV" }))
    });
  } catch (err) {
    console.error("[/api/anilist-detail] error:", err);
    return NextResponse.json({ error: "Failed to fetch anime detail" }, { status: 500 });
  }
}
