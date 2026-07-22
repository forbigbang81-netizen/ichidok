"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Clock,
  Film,
  PlayCircle,
  Star,
  Users,
  Radio,
  Play,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  addBookmark,
  fetchAnimeDetail,
  removeBookmark,
  saveHistory,
} from "@/lib/api/client";
import { useApp, type Anime, type Episode } from "@/store/app";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "./VideoPlayer";

type DetailTab = "episodes" | "continue" | "seasons" | "synopsis" | "details";

interface BroadcastInfo {
  day?: string;
  time?: string;
  timezone?: string;
  string?: string;
}

// Countdown seconds before auto-playing the next episode.
const NEXT_EP_COUNTDOWN_FROM = 5;

export function AnimeDetailView() {
  const {
    selectedMalId,
    selectedEpisode,
    setSelectedEpisode,
    resumePosition,
    audioMode,
    back,
    bookmarks,
    toggleBookmark,
    updateHistoryPosition,
    history,
    openAnime,
  } = useApp();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<
    { malId: number; label: string; anime: Anime | null }[]
  >([]);
  const [broadcast, setBroadcast] = useState<BroadcastInfo | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("episodes");
  useCountdownTick();

  // ----- Next-episode auto-play countdown -----
  const [nextEpCountdown, setNextEpCountdown] = useState<number | null>(null);
  const [countdownForEp, setCountdownForEp] = useState<number | null>(null);

  const isBookmarked = selectedMalId
    ? bookmarks.includes(selectedMalId)
    : false;

  useEffect(() => {
    if (!selectedMalId) return;
    let cancelled = false;
    setLoading(true);
    fetchAnimeDetail(selectedMalId, true)
      .then((r: { anime: Anime; episodes: Episode[]; imports: unknown[] }) => {
        if (cancelled) return;
        setAnime(r.anime);
        setEpisodes(r.episodes ?? []);
        setBroadcast((r as { broadcast?: BroadcastInfo }).broadcast ?? null);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(`Failed to load: ${e.message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMalId]);

  // Fetch related seasons
  useEffect(() => {
    if (!selectedMalId) {
      setSeasons([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/seasons?malId=${selectedMalId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { seasons: { malId: number; label: string }[] }) => {
        if (cancelled) return;
        const seasonList = data.seasons ?? [];
        Promise.all(
          seasonList.map(async (s) => {
            try {
              const r = await fetchAnimeDetail(s.malId, false);
              return { malId: s.malId, label: s.label, anime: r.anime };
            } catch {
              return { malId: s.malId, label: s.label, anime: null };
            }
          }),
        ).then((results) => {
          if (!cancelled) setSeasons(results);
        });
      })
      .catch(() => {
        if (!cancelled) setSeasons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMalId]);

  // History items for this anime (Continue Watching tab)
  const continueWatching = selectedMalId
    ? history
        .filter((h) => h.malId === selectedMalId)
        .sort((a, b) => {
          const da = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
          const db = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
          return db - da;
        })
    : [];

  const handleProgress = (position: number, duration: number) => {
    if (!anime) return;
    const progress = duration > 0 ? (position / duration) * 100 : 0;
    updateHistoryPosition(anime.malId, selectedEpisode, position, duration);
    saveHistory({
      malId: anime.malId,
      title: anime.title,
      poster: anime.poster,
      type: anime.type,
      episode: selectedEpisode,
      position,
      duration,
      progress,
    }).catch(() => {});
  };

  // ===== Next-episode auto-play prompt =====
  const handleEnded = () => {
    if (!anime) return;
    const next = selectedEpisode + 1;
    if (next <= anime.episodeCount) {
      setCountdownForEp(selectedEpisode);
      setNextEpCountdown(NEXT_EP_COUNTDOWN_FROM);
    }
  };

  useEffect(() => {
    if (nextEpCountdown === null) return;
    if (countdownForEp !== null && countdownForEp !== selectedEpisode) {
      setCountdownForEp(null);
      setNextEpCountdown(null);
      return;
    }
    if (nextEpCountdown <= 0) {
      const baseEp = countdownForEp ?? selectedEpisode;
      const next = baseEp + 1;
      setCountdownForEp(null);
      setNextEpCountdown(null);
      if (anime && next <= anime.episodeCount) {
        setSelectedEpisode(next);
        toast.success(`Now playing episode ${next}`);
      }
      return;
    }
    const t = setTimeout(() => {
      setNextEpCountdown((c) => (c ?? 0) - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [nextEpCountdown, selectedEpisode, countdownForEp, anime, setSelectedEpisode]);

  const handleSelectEpisode = (ep: number) => {
    setCountdownForEp(null);
    setNextEpCountdown(null);
    setSelectedEpisode(ep);
  };

  const handleDownload = async (ep: number) => {
    try {
      const audio = audioMode.toLowerCase();
      const resp = await fetch(
        `/api/auto-import?malId=${selectedMalId}&episode=${ep}&audio=${audio}`,
      );
      const data = await resp.json();
      if (!data.url) {
        toast.error("No stream available for this episode");
        return;
      }
      // For archive.org/proxy URLs, open in a new tab which triggers download
      // (browsers handle it as a download if Content-Disposition is set, or
      // the user can right-click > Save Video As)
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${anime.title} - Episode ${ep}.mp4`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading Episode ${ep}...`);
    } catch {
      toast.error("Failed to start download");
    }
  };

  const handleBookmarkToggle = async () => {
    if (!anime) return;
    if (isBookmarked) {
      toggleBookmark(anime.malId);
      try {
        await removeBookmark(anime.malId);
        toast.success("Removed from bookmarks");
      } catch {
        /* noop */
      }
    } else {
      toggleBookmark(anime.malId);
      try {
        await addBookmark(anime);
        toast.success("Added to bookmarks");
      } catch {
        /* noop */
      }
    }
  };

  if (loading) {
    return (
      <div className="fade-in flex min-h-[60vh] flex-col gap-3">
        <div className="aspect-video w-full skeleton-shimmer" />
        <div className="px-4">
          <div className="h-6 w-2/3 rounded skeleton-shimmer" />
          <div className="mt-2 h-4 w-1/2 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-3 gap-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!anime || !selectedMalId) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center text-white/60">
        <div className="flex flex-col items-center">
          <Film className="mb-3 h-10 w-10 text-white/30" />
          <p className="text-sm font-medium text-white/80">Anime not found.</p>
          <button
            type="button"
            onClick={back}
            className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-black transition-transform active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const episodeList: Episode[] =
    episodes.length > 0
      ? episodes
      : Array.from({ length: anime.episodeCount }, (_, i) => ({
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));

  // Available tabs (dynamic)
  const tabs: { key: DetailTab; label: string }[] = [
    { key: "episodes", label: "Episodes" },
  ];
  if (continueWatching.length > 0) {
    tabs.push({ key: "continue", label: "Continue" });
  }
  if (seasons.length > 1) {
    tabs.push({ key: "seasons", label: "Seasons" });
  }
  tabs.push({ key: "synopsis", label: "Synopsis" });
  tabs.push({ key: "details", label: "Details" });

  const nextAirInfo = getNextAirTime(broadcast);
  const isAiring = anime.status === "Currently Airing";

  const nextEpNumber = (countdownForEp ?? selectedEpisode) + 1;
  const showNextEpOverlay =
    nextEpCountdown !== null &&
    countdownForEp === selectedEpisode &&
    nextEpNumber <= anime.episodeCount;

  const episodeThumb = anime.banner || anime.poster;

  return (
    <div className="fade-in flex flex-col pb-8">
      {/* ===== Header — solid black, no glass ===== */}
      <header className="sticky top-0 z-20 bg-black pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={back}
            className="grid h-9 w-9 place-items-center rounded-full text-white transition-colors active:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 truncate text-sm font-medium text-white">
            Details
          </p>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-colors active:bg-white/10",
              isBookmarked ? "text-[#f5c518]" : "text-white/60",
            )}
            aria-label="Bookmark"
          >
            <Bookmark
              className={cn("h-5 w-5", isBookmarked && "fill-[#f5c518]")}
            />
          </button>
        </div>
      </header>

      {/* ===== Video player — full-width, no rounded corners ===== */}
      <div className="relative">
        <VideoPlayer
          malId={selectedMalId}
          episode={selectedEpisode}
          audioMode={audioMode}
          poster={anime.banner || anime.poster}
          title={`${anime.title} — Episode ${selectedEpisode}`}
          resumePosition={resumePosition}
          onProgress={handleProgress}
          onEnded={handleEnded}
          onBack={back}
        />

        {/* ===== Next-episode auto-play prompt ===== */}
        {showNextEpOverlay && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-black/90">
            <div className="flex w-[280px] max-w-[85%] flex-col items-center rounded-xl bg-[#111111] p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5c518]">
                Up Next
              </span>
              <p className="mt-2 text-lg font-bold text-white">
                Episode {nextEpNumber}
              </p>
              <p className="mt-1 text-xs text-white/60">
                Starting in{" "}
                <span className="text-base font-bold tabular-nums text-[#f5c518]">
                  {nextEpCountdown}
                </span>
                …
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#f5c518] transition-[width] duration-1000 ease-linear"
                  style={{
                    width: `${
                      ((NEXT_EP_COUNTDOWN_FROM - (nextEpCountdown ?? 0)) /
                        NEXT_EP_COUNTDOWN_FROM) *
                      100
                    }%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCountdownForEp(null);
                  setNextEpCountdown(null);
                }}
                className="mt-4 rounded-full px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-white/70 transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Anime info: title + score + info chips ===== */}
      <section className="px-4 pt-4">
        <h1 className="text-xl font-bold leading-tight text-white">
          {anime.title}
        </h1>
        {anime.titleJapanese && (
          <p className="mt-0.5 text-[11px] text-white/40">
            {anime.titleJapanese}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
          {anime.score > 0 && (
            <span className="flex items-center gap-1 font-bold text-[#f5c518]">
              <Star className="h-3 w-3 fill-[#f5c518]" />
              {anime.score.toFixed(2)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" /> {anime.type}
          </span>
          {anime.episodeCount > 0 && (
            <span className="flex items-center gap-1">
              <PlayCircle className="h-3 w-3" /> {anime.episodeCount} eps
            </span>
          )}
          {anime.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {anime.duration}
            </span>
          )}
          {anime.year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {anime.year}
            </span>
          )}
          {anime.members ? (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {(anime.members / 1000).toFixed(0)}K
            </span>
          ) : null}
        </div>

        {/* Genre chips */}
        {anime.genres.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-start gap-1.5">
            {anime.genres.slice(0, 6).map((g) => (
              <span
                key={g}
                className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[10px] font-medium leading-relaxed text-white/70"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <p className="mt-2.5 text-xs text-white/50">
          {anime.status}
          {anime.studios?.length ? ` · ${anime.studios.join(", ")}` : ""}
        </p>

        {/* Broadcast time */}
        {nextAirInfo && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#111111] px-3 py-2">
            <Radio className="h-3.5 w-3.5 shrink-0 text-[#f5c518]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                {isAiring ? "Next episode airs in" : "Broadcast"}
              </p>
              <p className="text-xs font-medium text-white">
                {broadcast?.string ??
                  `${broadcast?.day} ${broadcast?.time} JST`}
              </p>
            </div>
            {isAiring && (
              <span className="rounded bg-[#f5c518] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                {formatCountdown(nextAirInfo)}
              </span>
            )}
          </div>
        )}
      </section>

      {/* ===== Tabs — simple underline ===== */}
      <div className="mt-4 px-4">
        <UnderlineTabs
          tabs={tabs}
          active={activeTab}
          onChange={(t) => setActiveTab(t as DetailTab)}
        />
      </div>

      {/* ===== Tab content ===== */}
      <div className="px-4 mt-4" key={activeTab}>
        {activeTab === "episodes" && (
          <div className="flex flex-col gap-2">
            {episodeList.map((ep) => {
              const active = ep.number === selectedEpisode;
              const watchedEps = continueWatching.map((h) => h.episode);
              const latestAvailableEp =
                watchedEps.length > 0 ? Math.max(...watchedEps) : 0;
              const hasStream =
                !isAiring || ep.number <= latestAvailableEp;
              const epStatus = isAiring
                ? getEpisodeAirStatus(
                    ep.number,
                    anime.episodeCount,
                    broadcast,
                    hasStream,
                    latestAvailableEp,
                  )
                : null;
              const epHistory = continueWatching.find(
                (h) => h.episode === ep.number,
              );
              const epProgress = epHistory?.progress ?? 0;
              const isCompleted = epProgress > 90;
              return (
                <button
                  key={ep.number}
                  type="button"
                  onClick={() => handleSelectEpisode(ep.number)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2 text-left transition-colors",
                    active ? "bg-white/5" : "active:bg-white/5",
                  )}
                >
                  {/* Thumbnail — 16:9, small, left side */}
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-[#111111]">
                    {episodeThumb && (
                      <img
                        src={episodeThumb}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/30">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                    {/* Progress bar at bottom of thumbnail */}
                    {epProgress > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                        <div
                          className={cn(
                            "h-full",
                            isCompleted ? "bg-green-500" : "bg-[#f5c518]",
                          )}
                          style={{ width: `${Math.min(100, epProgress)}%` }}
                        />
                      </div>
                    )}
                    {ep.filler && (
                      <span className="absolute left-0.5 top-0.5 rounded bg-red-500/85 px-1 text-[8px] font-bold text-white">
                        FILLER
                      </span>
                    )}
                  </div>
                  {/* Episode info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        EP {ep.number}
                      </span>
                      {epStatus && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                            epStatus.type === "countdown"
                              ? "bg-[#f5c518] text-black"
                              : epStatus.type === "coming-soon"
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-green-500/20 text-green-300",
                          )}
                        >
                          {epStatus.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/50">
                      {ep.title ?? `Episode ${ep.number}`}
                    </p>
                  </div>
                  {/* Download button — outside the player, per-episode */}
                  {hasStream && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(ep.number);
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/40 transition-colors active:bg-white/10 hover:text-[#f5c518]"
                      aria-label={`Download episode ${ep.number}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "continue" && continueWatching.length > 0 && (
          <div className="flex flex-col gap-2">
            {continueWatching.map((h) => {
              const isActive = h.episode === selectedEpisode;
              return (
                <button
                  key={`${h.malId}-${h.episode}`}
                  type="button"
                  onClick={() => {
                    setCountdownForEp(null);
                    setNextEpCountdown(null);
                    if (anime) {
                      openAnime(h.malId, h.episode, h.position);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2 text-left transition-colors",
                    isActive ? "bg-white/5" : "active:bg-white/5",
                  )}
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-black">
                    {h.poster && (
                      <img
                        src={h.poster}
                        alt={h.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/30">
                      <PlayCircle className="h-6 w-6 text-white/90" />
                    </div>
                    {h.duration > 0 && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-[#f5c518]"
                        style={{
                          width: `${Math.min(100, h.progress)}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">
                      Episode {h.episode}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {h.progress > 0
                        ? `${Math.round(h.progress)}% watched`
                        : "Not started"}
                    </p>
                    {h.watchedAt && (
                      <p className="text-[9px] text-white/30">
                        {new Date(h.watchedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "seasons" && seasons.length > 1 && (
          <div className="flex flex-col gap-2">
            {seasons.map((s, idx) => {
              const isCurrent = s.malId === selectedMalId;
              return (
                <button
                  key={s.malId}
                  type="button"
                  onClick={() => {
                    setCountdownForEp(null);
                    setNextEpCountdown(null);
                    if (!isCurrent) openAnime(s.malId, 1);
                  }}
                  disabled={isCurrent}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2 text-left transition-colors disabled:opacity-60",
                    isCurrent ? "bg-white/5" : "active:bg-white/5",
                  )}
                >
                  <div className="grid h-12 w-8 shrink-0 place-items-center rounded-md bg-[#111111] text-xs font-bold text-[#f5c518]">
                    {idx + 1}
                  </div>
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-black">
                    {s.anime?.poster && (
                      <img
                        src={s.anime.poster}
                        alt={s.label}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight text-white">
                      {s.label}
                    </p>
                    {s.anime && (
                      <p className="text-[10px] text-white/40">
                        {s.anime.episodeCount > 0
                          ? `${s.anime.episodeCount} eps`
                          : s.anime.type}
                        {s.anime.score > 0 &&
                          ` · ⭐ ${s.anime.score.toFixed(2)}`}
                        {s.anime.year && ` · ${s.anime.year}`}
                      </p>
                    )}
                    {s.anime?.status && (
                      <p className="text-[9px] text-white/30">
                        {s.anime.status}
                      </p>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="rounded bg-[#f5c518] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                      Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "synopsis" && (
          <p className="text-sm leading-relaxed text-white/70">
            {anime.synopsis || "No synopsis available."}
          </p>
        )}

        {activeTab === "details" && (
          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            <DetailRow label="Type" value={anime.type} />
            <DetailRow label="Status" value={anime.status} />
            <DetailRow label="Episodes" value={String(anime.episodeCount)} />
            <DetailRow label="Duration" value={anime.duration ?? "-"} />
            <DetailRow label="Year" value={String(anime.year ?? "-")} />
            <DetailRow label="Season" value={anime.season ?? "-"} />
            <DetailRow label="Rating" value={anime.rating ?? "-"} />
            <DetailRow label="Source" value={anime.source ?? "-"} />
            <DetailRow
              label="Studio"
              value={anime.studios?.join(", ") || "-"}
            />
            <DetailRow
              label="Score"
              value={anime.score > 0 ? anime.score.toFixed(2) : "-"}
            />
          </dl>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-[#111111] px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="truncate text-xs font-medium text-white/90">{value}</dd>
    </div>
  );
}

// ============================================================
// Simple underline tabs
// ============================================================

function UnderlineTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === active);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active, tabs]);

  return (
    <div className="relative no-scrollbar flex gap-5 overflow-x-auto border-b border-white/10">
      {tabs.map((t, i) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "relative whitespace-nowrap pb-2 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-white/40",
            )}
          >
            {t.label}
          </button>
        );
      })}
      <span
        className="absolute bottom-0 h-0.5 rounded-full bg-[#f5c518] transition-all duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  );
}

// ============================================================
// Episode countdown timer
// ============================================================

function getNextAirTime(broadcast: BroadcastInfo | null): Date | null {
  if (!broadcast?.day || !broadcast?.time) return null;
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sundays: 0,
    mondays: 1,
    tuesdays: 2,
    wednesdays: 3,
    thursdays: 4,
    fridays: 5,
    saturdays: 6,
  };
  const targetDay = dayMap[broadcast.day.toLowerCase()];
  if (targetDay === undefined) return null;
  const [hours, minutes] = broadcast.time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const now = new Date();
  const nowJst = new Date(now.getTime() + 9 * 3600000);
  const nextAirJst = new Date(nowJst);
  let daysUntil = (targetDay - nowJst.getDay() + 7) % 7;
  if (daysUntil === 0) {
    const curMin = nowJst.getHours() * 60 + nowJst.getMinutes();
    const airMin = hours * 60 + minutes;
    if (curMin >= airMin) daysUntil = 7;
  }
  nextAirJst.setDate(nowJst.getDate() + daysUntil);
  nextAirJst.setHours(hours, minutes, 0, 0);
  return new Date(nextAirJst.getTime() - 9 * 3600000);
}

function formatCountdown(d: Date): string {
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "Now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getEpisodeAirStatus(
  epNumber: number,
  _totalEps: number,
  broadcast: BroadcastInfo | null,
  hasStream: boolean,
  latestAvailableEp: number,
): { type: "countdown" | "coming-soon" | "available"; label: string } | null {
  if (!broadcast?.day || !broadcast?.time) return null;
  if (hasStream) return { type: "available", label: "AVAILABLE" };
  const nextAir = getNextAirTime(broadcast);
  if (!nextAir) return null;
  const weeksDiff = latestAvailableEp + 1 - epNumber;
  const epAirTime = new Date(
    nextAir.getTime() - weeksDiff * 7 * 24 * 3600000,
  );
  const diff = epAirTime.getTime() - Date.now();
  if (diff > 0) {
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    let label: string;
    if (days > 0) label = `${days}d ${hours}h`;
    else if (hours > 0) label = `${hours}h ${mins}m`;
    else label = `${mins}m`;
    return { type: "countdown", label };
  }
  return { type: "coming-soon", label: "SOON" };
}

function useCountdownTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);
}
