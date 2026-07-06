import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (!url || !url.startsWith("libsql://")) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }
  try {
    const libsql = createClient({ url, authToken: token || undefined });
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Anime" ("id" TEXT NOT NULL PRIMARY KEY, "malId" INTEGER NOT NULL, "title" TEXT NOT NULL, "titleEnglish" TEXT, "titleJapanese" TEXT, "synopsis" TEXT, "poster" TEXT, "banner" TEXT, "trailer" TEXT, "type" TEXT NOT NULL DEFAULT 'TV', "status" TEXT, "score" REAL NOT NULL DEFAULT 0, "scoredBy" INTEGER NOT NULL DEFAULT 0, "rank" INTEGER NOT NULL DEFAULT 0, "popularity" INTEGER NOT NULL DEFAULT 0, "members" INTEGER NOT NULL DEFAULT 0, "year" INTEGER, "season" TEXT, "genres" TEXT NOT NULL DEFAULT '', "studios" TEXT NOT NULL DEFAULT '', "episodeCount" INTEGER NOT NULL DEFAULT 0, "duration" TEXT, "rating" TEXT, "source" TEXT, "isFeatured" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Anime_malId_key" UNIQUE ("malId"))`,
      `CREATE TABLE IF NOT EXISTS "Episode" ("id" TEXT NOT NULL PRIMARY KEY, "animeId" TEXT NOT NULL, "number" INTEGER NOT NULL, "title" TEXT, "aired" TEXT, "filler" BOOLEAN NOT NULL DEFAULT false, "recap" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Episode_animeId_number_key" UNIQUE ("animeId", "number"), FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS "Import" ("id" TEXT NOT NULL PRIMARY KEY, "animeId" TEXT NOT NULL, "malId" INTEGER NOT NULL, "episode" INTEGER NOT NULL, "audio" TEXT NOT NULL DEFAULT 'sub', "url" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'archive', "quality" TEXT NOT NULL DEFAULT '1080p', "hasSub" BOOLEAN NOT NULL DEFAULT true, "hasDub" BOOLEAN NOT NULL DEFAULT false, "subtitleUrl" TEXT, "isTrailer" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Import_malId_episode_audio_key" UNIQUE ("malId", "episode", "audio"), FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS "Bookmark" ("id" TEXT NOT NULL PRIMARY KEY, "malId" INTEGER NOT NULL, "title" TEXT NOT NULL, "poster" TEXT, "type" TEXT NOT NULL DEFAULT 'TV', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Bookmark_malId_key" UNIQUE ("malId"))`,
      `CREATE TABLE IF NOT EXISTS "History" ("id" TEXT NOT NULL PRIMARY KEY, "malId" INTEGER NOT NULL, "title" TEXT NOT NULL, "poster" TEXT, "type" TEXT NOT NULL DEFAULT 'TV', "episode" INTEGER NOT NULL, "position" REAL NOT NULL DEFAULT 0, "duration" REAL NOT NULL DEFAULT 0, "progress" REAL NOT NULL DEFAULT 0, "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "History_malId_episode_key" UNIQUE ("malId", "episode"))`,
      `CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'info', "read" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Rating" ("id" TEXT NOT NULL PRIMARY KEY, "malId" INTEGER NOT NULL, "rating" REAL NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Rating_malId_key" UNIQUE ("malId"))`,
      `CREATE TABLE IF NOT EXISTS "Comment" ("id" TEXT NOT NULL PRIMARY KEY, "malId" INTEGER NOT NULL, "name" TEXT NOT NULL DEFAULT 'Anonymous', "text" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    ];
    const results = [];
    for (const sql of statements) {
      try { await libsql.execute(sql); results.push("OK"); } catch (e) { results.push((e as Error).message.substring(0, 60)); }
    }
    const tables = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table'");
    return NextResponse.json({ ok: true, results, tables: tables.rows.map((r: any) => r.name) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
