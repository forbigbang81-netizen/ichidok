import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, serializeAnime } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

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

// Manual broadcast schedule for currently airing anime.
// Keyed by malId. Values: { day: 0-6 (0=Sun), time: "HH:MM JST" }
// Updated based on web search for actual broadcast times.
const BROADCAST_SCHEDULE: Record<number, { day: number; time: string }> = {
  // 100 Girlfriends S3 — Sundays at 22:30 JST
  62811: { day: 0, time: "22:30 JST" },
  // Polar Opposites S2 — Sundays at 17:00 JST
  63832: { day: 0, time: "17:00 JST" },
  // MHA Final Season (S8) — Saturdays at 17:30 JST (finished airing but keep for reference)
  -2: { day: 6, time: "17:30 JST" },
  // JJK Culling Game — Thursdays at 23:00 JST (Winter 2026)
  57658: { day: 4, time: "23:00 JST" },
};

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const now = new Date();

    // Get all anime (v2) from the DB using a raw SQL query to avoid ORM issues
    const { createClient } = await import("@libsql/client");
    const libsql = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
    const result = await libsql.execute('SELECT * FROM "Anime" WHERE "status" = \'Currently Airing\'');
    const airing = result.rows as any[];

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay: Record<number, { anime: ReturnType<typeof serializeScheduleAnime>; time: string }[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };

    // Place each airing anime on its broadcast day with JST time
    for (const a of airing) {
      const sched = BROADCAST_SCHEDULE[a.malId];
      if (sched) {
        byDay[sched.day].push({
          anime: serializeScheduleAnime(a),
          time: sched.time,
        });
      } else {
        // Unknown broadcast time — put on Sunday as default
        byDay[0].push({ anime: serializeScheduleAnime(a), time: "TBA JST" });
      }
    }

    // Sort each day's anime by time (earliest first)
    for (const day of Object.keys(byDay)) {
      byDay[Number(day)].sort((a, b) => {
        const ta = parseInt(a.time.replace(/\D/g, "")) || 0;
        const tb = parseInt(b.time.replace(/\D/g, "")) || 0;
        return ta - tb;
      });
    }

    const schedule: Record<string, { anime: any; time: string }[]> = {};
    const scheduleList = days.map((d, i) => ({
      day: d,
      dayIndex: i,
      anime: byDay[i],
    }));
    for (let i = 0; i < days.length; i++) {
      schedule[days[i]] = byDay[i];
    }

    return NextResponse.json({
      year: now.getFullYear(),
      total: airing.length,
      schedule,
      scheduleList,
    });
  } catch (err) {
    console.error("[/api/schedule] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedule", detail: String(err) },
      { status: 500 },
    );
  }
}
