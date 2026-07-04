import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, serializeAnime } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

const SEASON_MONTHS: Record<string, [number, number]> = {
  winter: [0, 2], // Jan – Mar
  spring: [3, 5], // Apr – Jun
  summer: [6, 8], // Jul – Sep
  fall: [9, 11], // Oct – Dec
};

type AnimeRow = Awaited<ReturnType<typeof db.anime.findFirst>>;

function serializeScheduleAnime(a: NonNullable<AnimeRow>) {
  return serializeAnime({
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
  });
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const seasonQuery = searchParams.get("season");

    let season: keyof typeof SEASON_MONTHS | null = null;
    if (seasonQuery && seasonQuery in SEASON_MONTHS) {
      season = seasonQuery as keyof typeof SEASON_MONTHS;
    } else {
      const m = now.getMonth();
      if (m <= 2) season = "winter";
      else if (m <= 5) season = "spring";
      else if (m <= 8) season = "summer";
      else season = "fall";
    }

    const animes = await db.anime.findMany({
      where: {
        year,
        season,
        status: { in: ["Currently Airing", "Not yet aired"] },
      },
      orderBy: [{ popularity: "asc" }],
    });

    // Group by day-of-week based on airing season start month.
    const [startMonth] = SEASON_MONTHS[season];
    const seasonStart = new Date(year, startMonth, 1);
    const dow = seasonStart.getDay(); // 0=Sun

    const byDay: Record<number, typeof animes> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };

    animes.forEach((a, i) => {
      const day = (dow + i) % 7;
      byDay[day].push(a);
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Schedule as a Record<day, Anime[]> for easy client lookup.
    const schedule: Record<string, ReturnType<typeof serializeScheduleAnime>[]> = {};
    for (let i = 0; i < days.length; i++) {
      schedule[days[i]] = byDay[i].map((a) => serializeScheduleAnime(a));
    }

    const scheduleList = days.map((d, i) => ({
      day: d,
      dayIndex: i,
      anime: byDay[i].map((a) => serializeScheduleAnime(a)),
    }));

    return NextResponse.json({
      year,
      season,
      total: animes.length,
      schedule, // Record<string, Anime[]>
      scheduleList, // Array<{ day, dayIndex, anime }>
    });
  } catch (err) {
    console.error("[/api/schedule] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedule", detail: String(err) },
      { status: 500 },
    );
  }
}
