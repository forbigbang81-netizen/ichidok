import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, serializeAnime } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ malId: string }> },
) {
  try {
    await ensureSeeded();
    const { malId } = await params;
    const malIdNum = Number(malId);
    if (!Number.isFinite(malIdNum)) {
      return NextResponse.json(
        { error: "Invalid malId" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeEpisodes =
      searchParams.get("includeEpisodes") !== "false";

    const anime = await db.anime.findFirst({
      where: { malId: malIdNum },
    });

    if (!anime) {
      return NextResponse.json(
        { error: "Anime not found", malId: malIdNum },
        { status: 404 },
      );
    }

    const episodes = includeEpisodes
      ? (anime.episodes ?? []).map((e) => ({
          number: e.number,
          title: e.title ?? undefined,
          aired: e.aired ?? undefined,
          filler: e.filler,
          recap: e.recap,
        }))
      : [];

    // Strip the heavy nested relations off the anime payload.
    const { episodes: _ep, imports: _imp, ...animeRest } = anime;
    const serialized = serializeAnime({
      ...animeRest,
      trailer: animeRest.trailer ?? "",
    });

    return NextResponse.json({
      anime: serialized,
      episodes,
      imports: anime.imports ?? [],
    });
  } catch (err) {
    console.error("[/api/jikan/[malId]] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch anime detail", detail: String(err) },
      { status: 500 },
    );
  }
}
