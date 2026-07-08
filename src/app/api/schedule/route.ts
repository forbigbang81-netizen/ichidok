import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Static schedule data with proper poster URLs and broadcast times.
// Only includes currently airing + upcoming anime.
const SCHEDULE_DATA = [
  // Sunday
  { day: 0, time: "17:00 JST", anime: {
    malId: 63832, title: "Me and You Are Polar Opposites S2",
    poster: "https://cdn.myanimelist.net/images/anime/1143/158409l.jpg",
    banner: "https://cdn.myanimelist.net/images/anime/1143/158409l.jpg",
    type: "TV", score: 7.50, genres: ["Romance", "Comedy"], studios: [],
    episodeCount: 12, synopsis: "Opposites attract in this romantic comedy.", isNew: true,
  }},
  { day: 0, time: "22:30 JST", anime: {
    malId: 62811, title: "The 100 Girlfriends S3",
    poster: "https://cdn.myanimelist.net/images/anime/1106/157174l.jpg",
    banner: "https://cdn.myanimelist.net/images/anime/1106/157174l.jpg",
    type: "TV", score: 8.00, genres: ["Comedy", "Romance"], studios: [],
    episodeCount: 12, synopsis: "Rentaro continues his quest to date all his soulmates.", isNew: true,
  }},
  // Thursday
  { day: 4, time: "23:00 JST", anime: {
    malId: 57658, title: "Jujutsu Kaisen: Culling Game",
    poster: "https://cdn.myanimelist.net/images/anime/1659/154920l.jpg",
    banner: "https://cdn.myanimelist.net/images/anime/1659/154920l.jpg",
    type: "TV", score: 8.61, genres: ["Action", "Supernatural"], studios: ["MAPPA"],
    episodeCount: 6, synopsis: "Yuji enters the deadly Culling Game.", isNew: true,
  }},
  // Saturday
  { day: 6, time: "17:30 JST", anime: {
    malId: -2, title: "My Hero Academia Final Season",
    poster: "/posters/mha-s8.jpg",
    banner: "/posters/mha-s8.jpg",
    type: "TV", score: 8.30, genres: ["Action", "Adventure"], studios: ["Bones"],
    episodeCount: 11, synopsis: "The final war between heroes and villains reaches its climax.", isNew: true,
  }},
  // Upcoming (Not yet aired) — show on Sunday since that's when it premieres
  { day: 0, time: "TBA JST", anime: {
    malId: 60636, title: "Bleach: TYBW - The Calamity",
    poster: "/posters/bleach-tybw-cal-tv.jpg",
    banner: "/posters/bleach-tybw-cal-tv.jpg",
    type: "TV", score: 0, genres: ["Action", "Adventure", "Supernatural"], studios: ["Pierrot Films"],
    episodeCount: 12, synopsis: "The final part of the Thousand-Year Blood War arc. Premieres July 2026.", isNew: true,
  }},
];

export async function GET() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const schedule: Record<string, any[]> = {};
  const scheduleList: any[] = [];

  for (let i = 0; i < days.length; i++) {
    const items = SCHEDULE_DATA.filter((s) => s.day === i).map((s) => ({
      anime: s.anime,
      time: s.time,
    }));
    // Sort by time (earliest first)
    items.sort((a, b) => {
      const ta = parseInt(a.time.replace(/\D/g, "")) || 9999;
      const tb = parseInt(b.time.replace(/\D/g, "")) || 9999;
      return ta - tb;
    });
    schedule[days[i]] = items;
    scheduleList.push({ day: days[i], dayIndex: i, anime: items });
  }

  return NextResponse.json({
    total: SCHEDULE_DATA.length,
    schedule,
    scheduleList,
  });
}
