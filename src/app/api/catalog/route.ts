import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_ANIME, type SeedAnime, episodeHasSub, episodeHasDub } from "@/lib/seed";

// Allow Vercel to cache GET responses at the edge for 5 minutes, with
// stale-while-revalidate of 10 minutes. This makes the homepage cards load
// near-instantly after the first hit.
export const dynamic = "force-dynamic";
export const revalidate = 300;

// Module-level promise lock so concurrent callers share a single in-flight seed.
let seedPromise: Promise<void> | null = null;
// Module-level flag that records whether the seed has been verified in this
// warm Lambda. Avoids re-running ~40 sequential upserts on every request.
let seedVerified = false;

function serializeGenres(s: SeedAnime) {
  return {
    genres: s.genres.join(","),
    studios: s.studios.join(","),
  };
}

/**
 * Ensures the DB has all seed anime records.
 *
 * Strategy:
 *   1. If we already verified the seed in this warm process, return immediately.
 *   2. Otherwise, count the Anime table — if the count matches SEED_ANIME.length,
 *      mark verified and return (the DB is already populated).
 *   3. Otherwise, run the upserts in parallel chunks of 8 to keep latency low.
 *
 * Concurrent calls share a single in-flight promise.
 *
 * Pass `force: true` to bypass the count short-circuit and re-run all upserts.
 * Useful when seed data has changed (e.g. type correction) and the DB needs to
 * be re-synced. The /api/seed POST endpoint uses this.
 */
export async function ensureSeeded(opts?: { force?: boolean }): Promise<void> {
  if (!opts?.force && seedVerified) return;
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      // Fast path — count check. If the DB already has every seed entry,
      // skip the expensive upsert loop entirely. Bypassed when force=true.
      if (!opts?.force) {
        try {
          const existing = await db.anime.count();
          if (existing >= SEED_ANIME.length) {
            seedVerified = true;
            return;
          }
        } catch {
          // Count failed (table might not exist yet on first deploy) — fall
          // through to the upsert loop, which will create rows.
        }
      }

      // Parallel upserts in chunks of 8 to avoid overwhelming the DB.
      const CHUNK = 8;
      for (let i = 0; i < SEED_ANIME.length; i += CHUNK) {
        const chunk = SEED_ANIME.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map((s) => {
            const { genres, studios } = serializeGenres(s);
            return db.anime.upsert({
              where: { malId: s.malId },
              create: {
                malId: s.malId,
                title: s.title,
                titleEnglish: s.titleEnglish ?? null,
                titleJapanese: s.titleJapanese ?? null,
                synopsis: s.synopsis,
                poster: s.poster,
                banner: s.banner,
                trailer: s.trailer ?? null,
                type: s.type,
                status: s.status,
                score: s.score,
                scoredBy: s.scoredBy,
                rank: s.rank,
                popularity: s.popularity,
                members: s.members,
                year: s.year,
                season: s.season ?? null,
                genres,
                studios,
                episodeCount: s.episodeCount,
                duration: s.duration,
                rating: s.rating,
                source: s.source,
                isFeatured: s.isFeatured ?? false,
              },
              update: {
                title: s.title,
                titleEnglish: s.titleEnglish ?? null,
                titleJapanese: s.titleJapanese ?? null,
                synopsis: s.synopsis,
                poster: s.poster,
                banner: s.banner,
                trailer: s.trailer ?? null,
                type: s.type,
                status: s.status,
                score: s.score,
                scoredBy: s.scoredBy,
                rank: s.rank,
                popularity: s.popularity,
                members: s.members,
                year: s.year,
                season: s.season ?? null,
                genres,
                studios,
                episodeCount: s.episodeCount,
                duration: s.duration,
                rating: s.rating,
                source: s.source,
                isFeatured: s.isFeatured ?? false,
              },
            }).then(async (anime) => {
              // If the seed defines arcs or filler episodes, create Episode
              // records with arc names as titles and filler flags.
              if (s.arcs || s.fillerEpisodes) {
                const fillerSet = new Set(s.fillerEpisodes ?? []);
                // Build episode list from arcs (if present) or episodeCount
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
                } else {
                  for (let ep = 1; ep <= s.episodeCount; ep++) {
                    episodes.push({
                      number: ep,
                      title: null,
                      filler: fillerSet.has(ep),
                      hasSub: episodeHasSub(s, ep),
                      hasDub: episodeHasDub(s, ep),
                    });
                  }
                }
                // Upsert episodes in chunks to avoid overwhelming the DB
                for (let j = 0; j < episodes.length; j += 20) {
                  const epChunk = episodes.slice(j, j + 20);
                  await Promise.all(
                    epChunk.map((e) =>
                      db.episode.upsert({
                        where: { animeId: anime.id, number: e.number },
                        create: {
                          animeId: anime.id,
                          number: e.number,
                          title: e.title,
                          filler: e.filler,
                          hasSub: e.hasSub,
                          hasDub: e.hasDub,
                        },
                        update: {
                          title: e.title,
                          filler: e.filler,
                          hasSub: e.hasSub,
                          hasDub: e.hasDub,
                        },
                      }).catch((e) => console.error("[seed] ep upsert fail:", e)),
                    ),
                  );
                }
              }
            }).catch((e) => {
              // Don't let a single row failure abort the whole seed.
              console.error(`[ensureSeeded] upsert failed for malId=${s.malId}:`, e);
            });
          }),
        );
      }
      seedVerified = true;
    } finally {
      seedPromise = null;
    }
  })();
  return seedPromise;
}

/** Convert a raw DB anime row into the Anime shape the client expects. */
export function serializeAnime<T extends Record<string, unknown>>(a: T) {
  return {
    ...a,
    genres: String(a.genres ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean),
    studios: String(a.studios ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    isNew: a.isFeatured === true || a.status === "Currently Airing",
  } as Omit<T, "genres" | "studios"> & {
    genres: string[];
    studios: string[];
    isNew: boolean;
  };
}

function currentSeason(): { year: number; season: string } {
  const now = new Date();
  const m = now.getMonth();
  let season = "winter";
  if (m <= 2) season = "winter";
  else if (m <= 5) season = "spring";
  else if (m <= 8) season = "summer";
  else season = "fall";
  return { year: now.getFullYear(), season };
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase().trim();
    const genre = searchParams.get("genre");
    const typePreset = searchParams.get("type"); // top | season | all | <anime type>
    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const sort = searchParams.get("sort") ?? "popularity";
    // Default to 60 (was 100) for faster initial load. Max 200.
    const limit = Math.min(Number(searchParams.get("limit") ?? 60), 200);
    // Page number for pagination (0-indexed)
    const page = Math.max(0, Number(searchParams.get("page") ?? 0));

    // Determine sort order — preset "top" forces score desc.
    const orderBy =
      typePreset === "top"
        ? ({ score: "desc" } as const)
        : sort === "score"
          ? ({ score: "desc" } as const)
          : sort === "year"
            ? ({ year: "desc" } as const)
            : sort === "rank"
              ? ({ rank: "asc" } as const)
              : ({ popularity: "asc" } as const);

    // Optimize: only fetch the columns we need (skip synopsis, banner, trailer)
    // This reduces the data transferred from the DB significantly
    const animes = await db.anime.findMany({
      orderBy,
      select: {
        id: true,
        malId: true,
        title: true,
        titleEnglish: true,
        titleJapanese: true,
        poster: true,
        type: true,
        status: true,
        score: true,
        scoredBy: true,
        rank: true,
        popularity: true,
        members: true,
        year: true,
        season: true,
        genres: true,
        studios: true,
        episodeCount: true,
        duration: true,
        rating: true,
        source: true,
        isFeatured: true,
      },
    });

    let filtered = animes;

    // Preset filters take precedence over the bare `type=` anime-type filter.
    if (typePreset === "top") {
      const cs = currentSeason();
      filtered = filtered.filter(
        (a) =>
          a.score > 0 &&
          a.status !== "Not yet aired" &&
          !(a.year === cs.year && a.season === cs.season),
      );
    } else if (typePreset === "season") {
      const cs = currentSeason();
      filtered = filtered.filter(
        (a) =>
          a.year === cs.year &&
          a.season === cs.season &&
          a.status !== "Not yet aired",
      );
    } else if (typePreset === "all") {
      // No-op — return everything sorted.
    } else if (typePreset) {
      filtered = filtered.filter((a) => a.type === typePreset);
    }

    if (q) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.titleEnglish ?? "").toLowerCase().includes(q) ||
          (a.titleJapanese ?? "").toLowerCase().includes(q),
      );
    }
    if (genre) {
      filtered = filtered.filter((a) =>
        a.genres.split(",").some((g) => g.trim() === genre),
      );
    }
    if (status) filtered = filtered.filter((a) => a.status === status);
    if (year) filtered = filtered.filter((a) => a.year === Number(year));

    // Apply pagination: slice to page * limit, then take limit
    const startIndex = page * limit;
    const pagedFiltered = filtered.slice(startIndex, startIndex + limit);

    const results = pagedFiltered.map((a) =>
      serializeAnime({
        id: a.id,
        malId: a.malId,
        title: a.title,
        titleEnglish: a.titleEnglish,
        titleJapanese: a.titleJapanese,
        synopsis: "",  // Not fetched (stripped for performance)
        poster: a.poster ?? "",
        banner: "",    // Not fetched (stripped for performance)
        trailer: "",   // Not fetched (stripped for performance)
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

    return NextResponse.json(
      {
        total: filtered.length,
        results,
        anime: results,
      },
      {
        headers: {
          // Cache at the edge for 10 min (was 5 min), stale for 30 min
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  } catch (err) {
    console.error("[/api/catalog] error:", err);
    return NextResponse.json(
      { error: "Failed to load catalog", detail: String(err) },
      { status: 500 },
    );
  }
}
// Cache bust: Sun Aug  2 02:28:12 UTC 2026
