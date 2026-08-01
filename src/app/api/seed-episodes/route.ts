import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_ANIME, episodeHasSub, episodeHasDub } from "@/lib/seed";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function getDbClient() {
  const url = process.env.DATABASE_URL;
  if (process.env.NEXT_PHASE === 'phase-production-build' ||
      (process.env.NODE_ENV === 'production' && (!url || url.startsWith('file:')))) {
    return createClient({ url: 'file::memory:' });
  }
  return createClient({
    url: url && url.startsWith('libsql://') ? url : (url || 'file:./db/custom.db'),
    authToken: url && url.startsWith('libsql://') ? (process.env.DATABASE_AUTH_TOKEN || undefined) : undefined,
  });
}

export async function POST() {
  try {
    const client = getDbClient();
    let totalCreated = 0;
    
    for (const s of SEED_ANIME) {
      if (!s.arcs && !s.fillerEpisodes) continue;
      
      // Find the anime record
      const animeR = await client.execute({
        sql: `SELECT id FROM "Anime" WHERE "malId" = ?`,
        args: [s.malId],
      });
      const animeId = (animeR.rows[0] as any)?.id;
      if (!animeId) continue;
      
      // Delete existing episodes
      await client.execute({
        sql: `DELETE FROM "Episode" WHERE "animeId" = ?`,
        args: [animeId],
      });
      
      const fillerSet = new Set(s.fillerEpisodes ?? []);
      const episodes: { number: number; title: string | null; filler: boolean; hasSub: boolean; hasDub: boolean }[] = [];
      
      if (s.arcs) {
        for (const arc of s.arcs) {
          for (let ep = arc.startEp; ep <= arc.endEp; ep++) {
            episodes.push({
              number: ep,
              title: arc.name,
              filler: fillerSet.has(ep),
              hasSub: episodeHasSub(s, ep),
              hasDub: episodeHasDub(s, ep),
            });
          }
        }
      }
      
      // Insert episodes
      for (const e of episodes) {
        try {
          await client.execute({
            sql: `INSERT INTO "Episode" ("id", "animeId", "number", "title", "filler", "recap", "hasSub", "hasDub", "createdAt") VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            args: [
              Math.random().toString(36).substring(2) + Date.now().toString(36),
              animeId,
              e.number,
              e.title,
              e.filler ? 1 : 0,
              e.hasSub ? 1 : 0,
              e.hasDub ? 1 : 0,
              new Date().toISOString(),
            ],
          });
          totalCreated++;
        } catch (err) {
          console.error(`[seed-episodes] E${e.number} failed:`, err);
        }
      }
    }
    
    return NextResponse.json({ ok: true, totalCreated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
