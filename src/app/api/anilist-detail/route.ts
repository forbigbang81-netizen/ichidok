import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

const QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
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
    relations {
      edges {
        relationType(version: 2)
        node {
          id
          title { english romaji }
          coverImage { large }
          format
        }
      }
    }
    recommendations(perPage: 12, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          title { english romaji }
          coverImage { large }
          averageScore
          episodes
          format
        }
      }
    }
  }
}`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ query: QUERY, variables: { id: Number(id) } }),
    });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const data = await res.json();
    const a = data.data?.Media;
    if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const seasons = (a.relations?.edges || [])
      .filter((e: any) => ["PREQUEL", "SEQUEL", "SIDE_STORY", "PARENT", "ALTERNATIVE"].includes(e.relationType))
      .map((e: any) => ({
        id: e.node.id,
        title: e.node.title.english || e.node.title.romaji || "Unknown",
        poster: e.node.coverImage?.large,
        relation: e.relationType.toLowerCase().replace(/_/g, " "),
        type: e.node.format || "TV",
      }))
      .slice(0, 12);

    const recommendations = (a.recommendations?.nodes || [])
      .map((n: any) => n.mediaRecommendation)
      .filter(Boolean)
      .map((r: any) => ({
        id: r.id,
        title: r.title.english || r.title.romaji || "Unknown",
        poster: r.coverImage?.large,
        score: r.averageScore ? (r.averageScore / 10).toFixed(2) : null,
        episodes: r.episodes || 0,
        type: r.format === "TV" ? "TV" : r.format === "MOVIE" ? "Movie" : r.format || "TV",
      }))
      .slice(0, 12);

    return NextResponse.json({
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
      seasons,
      recommendations,
    });
  } catch (err) {
    console.error("[/api/anilist-detail] error:", err);
    return NextResponse.json({ error: "Failed to fetch detail" }, { status: 500 });
  }
}
