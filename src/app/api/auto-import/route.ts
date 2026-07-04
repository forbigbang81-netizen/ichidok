import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SEED_ANIME,
  resolveEpisodeUrl,
  resolveSubtitleUrl,
  episodeHasSub,
  episodeHasDub,
  type SeedAnime,
} from "@/lib/seed";
import { ensureSeeded } from "@/app/api/catalog/route";

export const dynamic = "force-dynamic";

function findSeed(malId: number): SeedAnime | undefined {
  return SEED_ANIME.find((s) => s.malId === malId);
}

function buildStreamProxy(url: string, request: Request): string {
  const origin = new URL(request.url).origin;
  return `${origin}/api/stream?url=${encodeURIComponent(url)}`;
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const malId = Number(searchParams.get("malId"));
    const episode = Number(searchParams.get("episode") ?? 1);
    const audio = (searchParams.get("audio") ?? "sub") as "sub" | "dub";

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
    if (audio !== "sub" && audio !== "dub") {
      return NextResponse.json(
        { error: "audio must be 'sub' or 'dub'" },
        { status: 400 },
      );
    }

    // 1) DB cache lookup first
    const cached = await db.import.findUnique({
      where: { malId_episode_audio: { malId, episode, audio } },
      include: { anime: true },
    });

    if (cached) {
      const subtitleUrl = cached.subtitleUrl ?? null;
      const isYoutube = cached.source === "youtube";
      const videoUrl = isYoutube
        ? cached.url
        : cached.source === "archive-mkv" || cached.source === "archive-proxy"
          ? buildStreamProxy(cached.url, request)
          : cached.url;
      return NextResponse.json({
        source: "cache",
        malId,
        episode,
        audio,
        url: videoUrl,
        rawUrl: cached.url,
        sourceType: cached.source,
        quality: cached.quality,
        hasSub: cached.hasSub,
        hasDub: cached.hasDub,
        subtitleUrl,
        isTrailer: cached.isTrailer,
        isYoutube,
        title: cached.anime?.title ?? null,
      });
    }

    // 2) Fall back to seed resolution
    const seed = findSeed(malId);
    if (!seed) {
      return NextResponse.json(
        {
          error: "Anime not found in catalog",
          malId,
          episode,
          audio,
          url: null,
          subtitleUrl: null,
        },
        { status: 404 },
      );
    }

    const resolved = resolveEpisodeUrl(seed, episode, audio);
    const hasSub = episodeHasSub(seed, episode);
    const hasDub = episodeHasDub(seed, episode);
    const subtitleUrl = resolveSubtitleUrl(seed, episode);

    if (!resolved) {
      // No video source — still return subtitleUrl for fallback rendering.
      return NextResponse.json({
        source: "seed",
        malId,
        episode,
        audio,
        url: null,
        rawUrl: null,
        sourceType: null,
        hasSub,
        hasDub,
        subtitleUrl,
        isTrailer: false,
        isYoutube: false,
        title: seed.title,
      });
    }

    const isYoutube = resolved.source === "youtube";
    const sourceLabel =
      resolved.source === "youtube"
        ? "youtube"
        : resolved.needsProxy
          ? "archive-mkv"
          : "archive";

    // Build the URL the player should consume. YouTube embeds go straight.
    // MKV / proxy-needed files go through /api/stream.
    const playerUrl = isYoutube
      ? resolved.url
      : resolved.needsProxy
        ? buildStreamProxy(resolved.url, request)
        : resolved.url;

    // Persist into the imports cache so subsequent calls skip the seed.
    const anime = await db.anime.findUnique({ where: { malId } });
    if (anime) {
      try {
        await db.import.upsert({
          where: {
            malId_episode_audio: { malId, episode, audio },
          },
          create: {
            animeId: anime.id,
            malId,
            episode,
            audio,
            url: resolved.url,
            source: sourceLabel,
            quality: "1080p",
            hasSub,
            hasDub,
            subtitleUrl,
            isTrailer: false,
          },
          update: {
            url: resolved.url,
            source: sourceLabel,
            hasSub,
            hasDub,
            subtitleUrl,
          },
        });
      } catch (e) {
        console.error("[/api/auto-import] cache upsert failed:", e);
      }
    }

    return NextResponse.json({
      source: "seed",
      malId,
      episode,
      audio,
      url: playerUrl,
      rawUrl: resolved.url,
      sourceType: sourceLabel,
      quality: "1080p",
      hasSub,
      hasDub,
      subtitleUrl,
      isTrailer: false,
      isYoutube,
      dualAudio: resolved.dualAudio,
      title: seed.title,
    });
  } catch (err) {
    console.error("[/api/auto-import] error:", err);
    return NextResponse.json(
      { error: "Failed to resolve episode", detail: String(err) },
      { status: 500 },
    );
  }
}
