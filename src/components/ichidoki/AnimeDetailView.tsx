"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Clock,
  Film,
  PlayCircle,
  Star,
  Users,
  History,
  Layers,
  Radio,
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
  // null = inactive. When the video ends we seed this with
  // NEXT_EP_COUNTDOWN_FROM and tick down each second; at 0 we advance.
  const [nextEpCountdown, setNextEpCountdown] = useState<number | null>(null);
  // Tracks which episode the active countdown belongs to, so we can cancel
  // cleanly if the user manually jumps to another episode mid-countdown.
  // Held in state (not a ref) so the overlay can read it during render.
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

  // Fetch related seasons for this anime
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
        // Fetch anime details for each season in parallel
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

  // History items for this anime only (Continue Watching)
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
  // Instead of jumping immediately on `onEnded`, we kick off a visible
  // countdown. The user can cancel; otherwise we advance at 0.
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
    // If the user jumped to a different episode, cancel the countdown.
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

  // Selecting an episode from the grid should always cancel any pending
  // auto-play countdown so the two never fight over the episode state.
  const handleSelectEpisode = (ep: number) => {
    setCountdownForEp(null);
    setNextEpCountdown(null);
    setSelectedEpisode(ep);
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
      <div className="fade-in flex min-h-[60vh] flex-col gap-3 p-4">
        <div className="aspect-video w-full rounded-2xl skeleton-shimmer" />
        <div className="h-6 w-2/3 rounded skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!anime || !selectedMalId) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center text-white/60">
        <div className="fade-in flex flex-col items-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl brand-gradient-soft">
            <Film className="h-6 w-6 text-[#f5c518]" />
          </div>
          <p className="text-sm font-semibold text-white/80">Anime not found.</p>
          <button
            type="button"
            onClick={back}
            className="btn-press brand-gradient-bg glow mt-4 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider text-black"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Build episode list — prefer DB rows, else synthesize from episodeCount.
  const episodeList: Episode[] =
    episodes.length > 0
      ? episodes
      : Array.from({ length: anime.episodeCount }, (_, i) => ({
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));

  // Available tabs (dynamic)
  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: "episodes", label: "Episodes", icon: <Film className="h-3 w-3" /> },
  ];
  if (continueWatching.length > 0) {
    tabs.push({
      key: "continue",
      label: "Continue",
      icon: <History className="h-3 w-3" />,
    });
  }
  if (seasons.length > 1) {
    tabs.push({
      key: "seasons",
      label: "Seasons",
      icon: <Layers className="h-3 w-3" />,
    });
  }
  tabs.push({
    key: "synopsis",
    label: "Synopsis",
    icon: <PlayCircle className="h-3 w-3" />,
  });
  tabs.push({
    key: "details",
    label: "Details",
    icon: <Radio className="h-3 w-3" />,
  });

  const nextAirInfo = getNextAirTime(broadcast);
  const isAiring = anime.status === "Currently Airing";

  // The next episode that the auto-play prompt will advance to (if active).
  const nextEpNumber = (countdownForEp ?? selectedEpisode) + 1;
  const showNextEpOverlay =
    nextEpCountdown !== null &&
    countdownForEp === selectedEpisode &&
    nextEpNumber <= anime.episodeCount;

  // The thumbnail used as the background for every episode button —
  // gives the grid a visual, Netflix-like feel.
  const episodeThumb = anime.banner || anime.poster;

  return (
    <div className="fade-in flex flex-col gap-4 pb-8">
      {/* Glass header with gradient back button */}
      <header className="glass-header sticky top-0 z-20">
        <div className="flex items-center gap-2 px-3 py-2.5 pt-safe">
          <button
            type="button"
            onClick={back}
            className="btn-press brand-gradient-bg grid h-9 w-9 place-items-center rounded-full text-black shadow-lg shadow-[#ff8a00]/20"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-black tracking-editorial text-white">
            Details
          </p>
          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={cn(
              "btn-press ml-auto grid h-9 w-9 place-items-center rounded-full transition-all duration-300",
              isBookmarked
                ? "brand-gradient-bg text-black glow"
                : "glass-card text-white hover:text-[#f5c518]",
            )}
            aria-label="Bookmark"
          >
            <Bookmark
              className={cn(
                "h-5 w-5 transition-transform",
                isBookmarked && "fill-black",
              )}
            />
          </button>
        </div>
      </header>

      {/* Video player area with rounded corners + subtle glow */}
      <div className="px-3">
        <div className="relative overflow-hidden rounded-2xl glow-orange">
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

          {/* ===== Next-episode auto-play prompt =====
              Shown when the video ends and a next episode exists. Counts
              down from NEXT_EP_COUNTDOWN_FROM; clicking Cancel dismisses. */}
          {showNextEpOverlay && (
            <div className="absolute inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-sm">
              <div className="glass-card fade-in flex w-[280px] max-w-[85%] flex-col items-center rounded-2xl p-5 text-center">
                <span className="brand-gradient-bg rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  Up Next
                </span>
                <p
                  className="gradient-text mt-2.5 text-lg font-black tracking-editorial"
                  style={{ textShadow: "0 0 12px rgba(255,138,0,0.6)" }}
                >
                  Episode {nextEpNumber}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Starting in{" "}
                  <span
                    className="gradient-text text-base font-black tabular-nums"
                    style={{ textShadow: "0 0 10px rgba(255,138,0,0.6)" }}
                  >
                    {nextEpCountdown}
                  </span>
                  …
                </p>
                {/* Countdown progress ring */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="brand-gradient-bg h-full rounded-full transition-[width] duration-1000 ease-linear"
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
                  className="btn-press glass-card mt-4 rounded-full px-6 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-colors hover:text-[#f5c518]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Anime info: glass card with poster + gradient title */}
      <section className="glass-card mx-3 rounded-2xl p-4">
        <div className="flex gap-3">
          <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-[#1a1a22] ring-1 ring-white/5">
            {anime.poster && (
              <img
                src={anime.poster}
                alt={anime.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="gradient-text line-clamp-2 text-base font-black leading-tight tracking-editorial">
              {anime.title}
            </h1>
            {anime.titleJapanese && (
              <p className="mt-0.5 text-[11px] text-white/50">
                {anime.titleJapanese}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
              {anime.score > 0 && (
                <span className="brand-gradient-soft flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-[#f5c518]">
                  <Star className="h-3 w-3 fill-[#f5c518]" />
                  {anime.score.toFixed(2)}
                </span>
              )}
              <span className="flex items-center gap-1 text-white/65">
                <Film className="h-3 w-3" /> {anime.type}
              </span>
              {anime.episodeCount > 0 && (
                <span className="flex items-center gap-1 text-white/65">
                  <PlayCircle className="h-3 w-3" /> {anime.episodeCount} eps
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1 text-white/65">
                  <Clock className="h-3 w-3" /> {anime.duration}
                </span>
              )}
              {anime.year && (
                <span className="flex items-center gap-1 text-white/65">
                  <Calendar className="h-3 w-3" /> {anime.year}
                </span>
              )}
              {anime.members ? (
                <span className="flex items-center gap-1 text-white/65">
                  <Users className="h-3 w-3" />
                  {(anime.members / 1000).toFixed(0)}K
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Animated genre chips */}
        {anime.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {anime.genres.slice(0, 6).map((g, i) => (
              <span
                key={g}
                className="glass-card fade-in-stagger rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white/80"
                style={{ ["--i"]: i } as React.CSSProperties}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Status + studio summary */}
        <p className="mt-3 text-xs leading-relaxed text-white/65">
          {anime.status}
          {anime.studios?.length ? ` · ${anime.studios.join(", ")}` : ""}
        </p>

        {/* Broadcast time badge: gradient glass with pulse if airing */}
        {nextAirInfo && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-xl px-3 py-2",
              "brand-gradient-soft glass-card",
              isAiring && "pulse-glow",
            )}
          >
            <Radio className="h-3.5 w-3.5 shrink-0 text-[#f5c518]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                {isAiring ? "Next episode airs in" : "Broadcast"}
              </p>
              <p className="gradient-text text-xs font-bold tracking-editorial">
                {broadcast?.string ??
                  `${broadcast?.day} ${broadcast?.time} JST`}
              </p>
            </div>
            {isAiring && (
              <span className="brand-gradient-bg rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                {formatCountdown(nextAirInfo)}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Pill-style tabs with sliding indicator */}
      <div className="px-3">
        <PillTabs
          tabs={tabs}
          active={activeTab}
          onChange={(t) => setActiveTab(t as DetailTab)}
        />
      </div>

      {/* Tab content with slide-up transition */}
      <div className="px-3" key={activeTab}>
        <div className="slide-up">
          {activeTab === "episodes" && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {episodeList.map((ep, idx) => {
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
                // Watch progress for THIS episode from history.
                const epHistory = continueWatching.find(
                  (h) => h.episode === ep.number,
                );
                const epProgress = epHistory?.progress ?? 0;
                const showProgress = epProgress > 0;
                const isCompleted = epProgress > 90;
                return (
                  <button
                    key={ep.number}
                    type="button"
                    onClick={() => handleSelectEpisode(ep.number)}
                    className={cn(
                      "fade-in-stagger card-hover relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl p-2 text-left ring-1 transition-all duration-300",
                      active
                        ? "ring-2 ring-[#ff8a00] glow-orange"
                        : "ring-white/5 hover:ring-[#f5c518]/40",
                    )}
                    style={{ ["--i"]: idx } as React.CSSProperties}
                  >
                    {/* Background thumbnail — the anime's banner/poster */}
                    {episodeThumb && (
                      <img
                        src={episodeThumb}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15" />

                    {/* Filler badge */}
                    {ep.filler && (
                      <span className="absolute left-1 top-1 z-10 rounded bg-red-500/85 px-1 text-[8px] font-black text-white">
                        FILLER
                      </span>
                    )}

                    {/* Air-status badge */}
                    {epStatus && (
                      <span
                        className={cn(
                          "absolute right-1 top-1 z-10 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
                          epStatus.type === "countdown"
                            ? "brand-gradient-bg text-black"
                            : epStatus.type === "coming-soon"
                              ? "bg-orange-500/30 text-orange-300"
                              : "bg-green-500/30 text-green-300",
                        )}
                      >
                        {epStatus.label}
                      </span>
                    )}

                    {/* Episode number — top */}
                    <span
                      className="relative z-10 text-xs font-black tracking-editorial text-white"
                      style={{
                        textShadow:
                          "0 0 8px rgba(255,138,0,0.7), 0 1px 3px rgba(0,0,0,0.9)",
                      }}
                    >
                      EP {ep.number}
                    </span>

                    {/* Episode title — bottom */}
                    <span
                      className="relative z-10 line-clamp-2 text-[10px] leading-tight text-white/85"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                    >
                      {ep.title ?? `Episode ${ep.number}`}
                    </span>

                    {/* Watch progress bar — green if completed (>90%), gold if in progress */}
                    {showProgress && (
                      <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/50">
                        <div
                          className="h-full transition-[width] duration-500"
                          style={{
                            width: `${Math.min(100, epProgress)}%`,
                            background: isCompleted
                              ? "linear-gradient(90deg, #22c55e, #4ade80)"
                              : "linear-gradient(90deg, #f5c518, #ff8a00)",
                            boxShadow: isCompleted
                              ? "0 0 6px rgba(34,197,94,0.6)"
                              : "0 0 6px rgba(255,138,0,0.6)",
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "continue" && continueWatching.length > 0 && (
            <div className="flex flex-col gap-2">
              {continueWatching.map((h, i) => {
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
                      "fade-in-stagger glass-card card-hover flex items-center gap-3 rounded-xl p-2 text-left",
                      isActive && "glow",
                    )}
                    style={{ ["--i"]: i } as React.CSSProperties}
                  >
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
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
                      {/* Gradient progress bar */}
                      {h.duration > 0 && (
                        <div
                          className="brand-gradient-bg absolute bottom-0 left-0 h-1"
                          style={{
                            width: `${Math.min(100, h.progress)}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-bold tracking-editorial",
                          isActive ? "gradient-text" : "text-white",
                        )}
                      >
                        Episode {h.episode}
                      </p>
                      <p className="text-[10px] text-white/50">
                        {h.progress > 0
                          ? `${Math.round(h.progress)}% watched`
                          : "Not started"}
                      </p>
                      {h.watchedAt && (
                        <p className="text-[9px] text-white/40">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                      "fade-in-stagger glass-card card-hover flex items-center gap-3 rounded-xl p-2 text-left disabled:cursor-default",
                      isCurrent && "glow",
                    )}
                    style={{ ["--i"]: idx } as React.CSSProperties}
                  >
                    {/* Glass number badge */}
                    <div
                      className={cn(
                        "grid h-12 w-8 shrink-0 place-items-center rounded-lg text-xs font-black",
                        isCurrent
                          ? "brand-gradient-bg text-black"
                          : "brand-gradient-soft text-[#f5c518]",
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
                      {s.anime?.poster && (
                        <img
                          src={s.anime.poster}
                          alt={s.label}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-bold leading-tight tracking-editorial",
                          isCurrent ? "gradient-text" : "text-white",
                        )}
                      >
                        {s.label}
                      </p>
                      {s.anime && (
                        <p className="text-[10px] text-white/50">
                          {s.anime.episodeCount > 0
                            ? `${s.anime.episodeCount} eps`
                            : s.anime.type}
                          {s.anime.score > 0 &&
                            ` · ⭐ ${s.anime.score.toFixed(2)}`}
                          {s.anime.year && ` · ${s.anime.year}`}
                        </p>
                      )}
                      {s.anime?.status && (
                        <p className="text-[9px] text-white/40">
                          {s.anime.status}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="brand-gradient-bg rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                        Now
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "synopsis" && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-sm leading-relaxed text-white/80">
                {anime.synopsis || "No synopsis available."}
              </p>
            </div>
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
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card flex flex-col rounded-lg px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="truncate text-xs font-semibold text-white/90">{value}</dd>
    </div>
  );
}

// ============================================================
// Tabs
// ============================================================

// Sliding pill indicator tabs (mirrors the home page type tabs)
function PillTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon: React.ReactNode }[];
  active: string;
  onChange: (k: string) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const idx = tabs.findIndex((t) => t.key === active);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active, tabs]);

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      <div className="glass-card relative flex gap-1 rounded-full p-1">
        <span
          className="brand-gradient-bg tab-pill-indicator absolute top-1 bottom-1 rounded-full"
          style={{ left: indicator.left, width: indicator.width }}
        />
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
                "relative z-10 flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-bold tracking-editorial transition-colors duration-300",
                isActive
                  ? "text-black"
                  : "text-white/55 hover:text-white/85",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
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
  // Calculate this episode's air time: next air is for ep (latestAvailableEp + 1)
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
