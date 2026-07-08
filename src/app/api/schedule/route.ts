import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const schedule: Record<string, any[]> = {};
  const scheduleList: any[] = [];
  
  for (let i = 0; i < days.length; i++) {
    const items: any[] = [];
    if (i === 0) { // Sunday
      items.push({ anime: { malId: 62811, title: "The 100 Girlfriends S3", poster: "", type: "TV", score: 0, genres: [], studios: [], episodeCount: 12, synopsis: "", isNew: true }, time: "22:30 JST" });
      items.push({ anime: { malId: 63832, title: "Me and You Are Polar Opposites S2", poster: "", type: "TV", score: 0, genres: [], studios: [], episodeCount: 12, synopsis: "", isNew: true }, time: "17:00 JST" });
    }
    if (i === 4) { // Thursday
      items.push({ anime: { malId: 57658, title: "Jujutsu Kaisen: Culling Game", poster: "https://cdn.myanimelist.net/images/anime/1659/154920l.jpg", type: "TV", score: 8.61, genres: [], studios: [], episodeCount: 6, synopsis: "", isNew: true }, time: "23:00 JST" });
    }
    if (i === 6) { // Saturday
      items.push({ anime: { malId: -2, title: "My Hero Academia Final Season", poster: "/posters/mha-s8.jpg", type: "TV", score: 8.30, genres: [], studios: [], episodeCount: 11, synopsis: "", isNew: true }, time: "17:30 JST" });
    }
    schedule[days[i]] = items;
    scheduleList.push({ day: days[i], dayIndex: i, anime: items });
  }

  return NextResponse.json({ total: 4, schedule, scheduleList });
}
