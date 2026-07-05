import { NextResponse } from "next/server";
import https from "node:https";
import { db } from "@/lib/db";
import { SEED_ANIME } from "@/lib/seed";
import { ensureSeeded } from "@/app/api/catalog/route";
import { fetchOpenSubsVtt, isOpenSubsReady, isOpenSubsSearchOnly } from "@/lib/opensubs";

export const dynamic = "force-dynamic";

interface JikanEpisode {
  mal_id: number;
  title: string;
  title_japanese?: string | null;
  aired?: string | null;
  filler?: boolean;
  recap?: boolean;
}

/**
 * Fetch JSON from a URL using Node's https module with IPv4 forced.
 *
 * Why: Node's built-in fetch and the default https module both prefer IPv6
 * when DNS returns both A and AAAA records. api.jikan.moe has both, but its
 * IPv6 endpoint times out in this environment. Forcing family: 4 routes the
 * request over IPv4 which works.
 */
function fetchJsonIpv4<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        family: 4,
        headers: {
          Accept: "application/json",
          "User-Agent": "ichidoki/1.0 (internal subtitle resolver)",
        },
        timeout: 10000,
      },
      (res) => {
        if (!res.statusCode || (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf-8");
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.end();
  });
}

/**
 * Fetch all episodes for an anime from Jikan v4 and cache them in the DB.
 * Returns the cached episode rows.
 */
async function ensureEpisodesCached(malId: number) {
  const anime = await db.anime.findUnique({
    where: { malId },
    include: { episodes: true },
  });
  if (!anime) return [];

  if (anime.episodes.length > 0) {
    return anime.episodes;
  }

  try {
    const json = await fetchJsonIpv4<{ data?: JikanEpisode[] }>(
      `https://api.jikan.moe/v4/anime/${malId}/episodes`,
    );
    const eps: JikanEpisode[] = json?.data ?? [];
    if (eps.length === 0) return [];

    for (const e of eps) {
      const num = Number(e.mal_id);
      if (!Number.isFinite(num) || num < 1) continue;
      try {
        await db.episode.upsert({
          where: { animeId_number: { animeId: anime.id, number: num } },
          create: {
            animeId: anime.id,
            number: num,
            title: e.title ?? null,
            aired: e.aired ?? null,
            filler: e.filler ?? false,
            recap: e.recap ?? false,
          },
          update: {
            title: e.title ?? null,
            aired: e.aired ?? null,
            filler: e.filler ?? false,
            recap: e.recap ?? false,
          },
        });
      } catch (err) {
        console.error("[/api/subtitles] episode upsert failed:", err);
      }
    }

    const refreshed = await db.anime.findUnique({
      where: { malId },
      include: { episodes: true },
    });
    return refreshed?.episodes ?? [];
  } catch (err) {
    console.error("[/api/subtitles] Jikan fetch error:", err);
    return [];
  }
}

function fmtTs(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

/**
 * Generate VTT cues for an episode using the real episode title from Jikan.
 *
 * Timing follows standard anime episode structure (24-min episodes):
 *   0:00-0:04   Title card (anime title)
 *   0:05-0:09   Episode number + title (real, from MAL)
 *   0:10-0:14   Opening Theme marker
 *   1:30-1:34   Main Story Begins (after OP)
 *  10:00-10:04  Mid-episode marker
 *  21:30-21:34  Ending Theme marker
 *  23:30-23:34  Next Episode preview marker
 *
 * For non-24-min episodes (movies), the cues are scaled to the actual duration.
 *
 * These are NOT dialogue subtitles - they are accurate episode-info cues
 * based on real MAL episode titles. For dialogue subtitles, drop real .vtt
 * files into /public/subtitles/{malId}_e{ep}.vtt and they will be served
 * instead (see seed.ts localSubtitlePattern).
 */
function buildCues(opts: {
  animeTitle: string;
  episodeNumber: number;
  episodeTitle: string | null;
  nextEpisodeTitle: string | null;
  durationSec: number;
}): Cue[] {
  const { animeTitle, episodeNumber, episodeTitle, nextEpisodeTitle, durationSec } = opts;

  const isMovie = durationSec > 60 * 60;
  const scale = isMovie ? durationSec / (24 * 60) : 1;

  const cues: Cue[] = [
    { start: 0, end: 4, text: animeTitle },
    {
      start: 5,
      end: 9,
      text: episodeTitle
        ? `Episode ${episodeNumber}: ${episodeTitle}`
        : `Episode ${episodeNumber}`,
    },
    { start: 10, end: 14, text: "Opening Theme" },
    { start: 90 * scale, end: 94 * scale, text: "Main Story Begins" },
    { start: 600 * scale, end: 604 * scale, text: `Episode ${episodeNumber} - Continuing` },
    { start: 1290 * scale, end: 1294 * scale, text: "Ending Theme" },
  ];

  if (nextEpisodeTitle) {
    cues.push({
      start: 1410 * scale,
      end: 1414 * scale,
      text: `Next: Episode ${episodeNumber + 1} - ${nextEpisodeTitle}`,
    });
  } else if (episodeNumber >= 1) {
    cues.push({
      start: 1410 * scale,
      end: 1414 * scale,
      text: `Next: Episode ${episodeNumber + 1}`,
    });
  }

  return cues;
}

function toVtt(cues: Cue[]): string {
  const sorted = [...cues].sort((a, b) => a.start - b.start);
  const lines = ["WEBVTT", ""];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    lines.push(String(i + 1));
    lines.push(`${fmtTs(c.start)} --> ${fmtTs(c.end)}`);
    lines.push(c.text);
    lines.push("");
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = Number(searchParams.get("malId"));
    const episode = Number(searchParams.get("episode") ?? 1);

    if (!Number.isFinite(malId) || malId <= 0) {
      return NextResponse.json(
        { error: "malId is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(episode) || episode < 1) {
      return NextResponse.json(
        { error: "episode is required and must be >= 1" },
        { status: 400 },
      );
    }

    const seed = SEED_ANIME.find((s) => s.malId === malId);
    if (!seed) {
      return NextResponse.json(
        { error: "Anime not in catalog" },
        { status: 404 },
      );
    }

    // === TIER 1: OpenSubtitles.com (real dialogue subs) ===
    // Requires env: OPENSUBS_API_KEY, OPENSUBS_USER, OPENSUBS_PASS
    // See README for how to obtain a free API key.
    if (isOpenSubsReady()) {
      try {
        const vtt = await fetchOpenSubsVtt({
          malId,
          animeTitle: seed.titleEnglish ?? seed.title,
          episode,
        });
        if (vtt && vtt.startsWith("WEBVTT") && vtt.length > 200) {
          // Heuristic: real dialogue subs have many cues. Episode-info VTT
          // has ~7 cues (~200 chars). Require at least 1KB to consider it real.
          return new NextResponse(vtt, {
            status: 200,
            headers: {
              "Content-Type": "text/vtt; charset=utf-8",
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
              "X-Subtitle-Source": "opensubtitles",
            },
          });
        }
      } catch (e) {
        console.error("[/api/subtitles] OpenSubtitles fetch failed:", e);
      }
    }

    // === TIER 2: Jikan episode-title cues (always available) ===
    // These are episode-info cues (title card, OP/ED markers, real MAL
    // episode title). Not dialogue subs, but accurate and synced to
    // standard 24-min anime structure.
    const episodes = await ensureEpisodesCached(malId);
    const ep = episodes.find((e) => e.number === episode);
    const nextEp = episodes.find((e) => e.number === episode + 1);

    const cues = buildCues({
      animeTitle: seed.titleEnglish ?? seed.title,
      episodeNumber: episode,
      episodeTitle: ep?.title ?? null,
      nextEpisodeTitle: nextEp?.title ?? null,
      durationSec: 24 * 60,
    });

    const vtt = toVtt(cues);
    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Subtitle-Source": isOpenSubsReady()
          ? "jikan-fallback"  // OpenSubtitles was tried but failed/returned nothing
          : isOpenSubsSearchOnly()
            ? "jikan-no-downloads-configured"
            : "jikan",
      },
    });
  } catch (err) {
    console.error("[/api/subtitles] error:", err);
    return NextResponse.json(
      { error: "Failed to generate subtitles", detail: String(err) },
      { status: 500 },
    );
  }
}
