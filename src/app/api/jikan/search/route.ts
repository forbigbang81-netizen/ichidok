import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, serializeAnime } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase().trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100);
    const type = searchParams.get("type");
    const genre = searchParams.get("genre");

    if (!q) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 },
      );
    }

    const all = await db.anime.findMany({
      orderBy: { popularity: "asc" },
    });

    const matches = all
      .filter((a) => {
        const text = [
          a.title,
          a.titleEnglish ?? "",
          a.titleJapanese ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .filter((a) => (type ? a.type === type : true))
      .filter((a) =>
        genre ? a.genres.split(",").some((g) => g.trim() === genre) : true,
      )
      .slice(0, limit)
      .map((a) =>
        serializeAnime({
          id: a.id,
          malId: a.malId,
          title: a.title,
          titleEnglish: a.titleEnglish,
          titleJapanese: a.titleJapanese,
          synopsis: a.synopsis ?? "",
          poster: a.poster ?? "",
          banner: a.banner ?? "",
          trailer: a.trailer ?? "",
          type: a.type,
          status: a.status ?? "",
          score: a.score,
          scoredBy: a.scoredBy,
          rank: a.rank,
          popularity: a.popularity,
          members: a.members,
          year: a.year,
          season: a.season ?? "",
          genres: a.genres,
          studios: a.studios,
          episodeCount: a.episodeCount,
          duration: a.duration ?? "",
          rating: a.rating ?? "",
          source: a.source ?? "",
          isFeatured: a.isFeatured,
        }),
      );

    return NextResponse.json({
      q,
      total: matches.length,
      results: matches,
    });
  } catch (err) {
    console.error("[/api/jikan/search] error:", err);
    return NextResponse.json(
      { error: "Failed to search anime", detail: String(err) },
      { status: 500 },
    );
  }
}
