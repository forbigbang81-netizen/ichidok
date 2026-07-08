import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeAnime } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

const BROADCAST_SCHEDULE: Record<number, { day: number; time: string }> = {
  62811: { day: 0, time: "22:30 JST" },
  63832: { day: 0, time: "17:00 JST" },
  -2: { day: 6, time: "17:30 JST" },
  57658: { day: 4, time: "23:00 JST" },
};

export async function GET() {
  try {
    // Use the same query pattern as the catalog route (which works)
    const animes = await db.anime.findMany({ orderBy: { popularity: "asc" } });
    const airing = animes.filter((a: any) => a.status === "Currently Airing");

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    for (const a of airing) {
      const sched = BROADCAST_SCHEDULE[a.malId];
      const serialized = serializeAnime({
        id: a.id, malId: a.malId, title: a.title,
        titleEnglish: a.titleEnglish, titleJapanese: a.titleJapanese,
        synopsis: a.synopsis ?? "", poster: a.poster ?? "", banner: a.banner ?? "",
        trailer: a.trailer ?? "", type: a.type, status: a.status ?? "",
        score: a.score, scoredBy: a.scoredBy, rank: a.rank, popularity: a.popularity,
        members: a.members, year: a.year, season: a.season ?? "", genres: a.genres,
        studios: a.studios, episodeCount: a.episodeCount, duration: a.duration ?? "",
        rating: a.rating ?? "", source: a.source ?? "", isFeatured: a.isFeatured,
      });
      const day = sched ? sched.day : 0;
      const time = sched ? sched.time : "TBA JST";
      byDay[day].push({ anime: serialized, time });
    }

    const schedule: Record<string, any[]> = {};
    const scheduleList = days.map((d, i) => ({ day: d, dayIndex: i, anime: byDay[i] }));
    for (let i = 0; i < days.length; i++) schedule[days[i]] = byDay[i];

    return NextResponse.json({ total: airing.length, schedule, scheduleList });
  } catch (err) {
    console.error("[/api/schedule] error:", err);
    return NextResponse.json({ error: "Failed to fetch schedule", detail: String(err) }, { status: 500 });
  }
}
