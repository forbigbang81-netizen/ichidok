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
  MessageCircle,
  Send,
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

interface RatingSummary {
  avg: number; // 10-point scale
  count: number;
  rawAvg: number; // 5-point scale
}

interface CommentItem {
  id: string;
  malId: number;
  name: string;
  text: string;
  createdAt: string;
}

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

  // ----- Rating state -----
  const [ratingData, setRatingData] = useState<RatingSummary>({
    avg: 0,
    count: 0,
    rawAvg: 0,
  });
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // ----- Comments state -----
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentName, setCommentName] = useState<string>("Anonymous");
  const [commentText, setCommentText] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState(false);

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

  // ----- Fetch rating summary -----
  useEffect(() => {
    if (!selectedMalId) {
      setRatingData({ avg: 0, count: 0, rawAvg: 0 });
      return;
    }
    let cancelled = false;
    fetch(`/api/ratings?malId=${selectedMalId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: RatingSummary) => {
        if (cancelled) return;
        setRatingData({
          avg: data.avg ?? 0,
          count: data.count ?? 0,
          rawAvg: data.rawAvg ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled)
          setRatingData({ avg: 0, count: 0, rawAvg: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMalId]);

  // ----- Fetch comments -----
  useEffect(() => {
    if (!selectedMalId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/comments?malId=${selectedMalId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { comments: CommentItem[] }) => {
        if (cancelled) return;
        setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
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

  const handleEnded = () => {
    if (!anime) return;
    const next = selectedEpisode + 1;
    if (next <= anime.episodeCount) {
      setSelectedEpisode(next);
      toast.success(`Moving to episode ${next}`);
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

  // ----- Submit rating -----
  const handleSubmitRating = async (rating: number) => {
    if (!selectedMalId || submittingRating) return;
    setUserRating(rating);
    setSubmittingRating(true);
    try {
      const r = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ malId: selectedMalId, rating }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: RatingSummary = await r.json();
      setRatingData({
        avg: data.avg ?? 0,
        count: data.count ?? 0,
        rawAvg: data.rawAvg ?? 0,
      });
      toast.success("Thank you for rating!");
    } catch (e) {
      toast.error("Failed to submit rating");
      // Roll back the optimistic userRating on failure.
      setUserRating(0);
    } finally {
      setSubmittingRating(false);
    }
  };

  // ----- Submit comment -----
  const handleSubmitComment = async () => {
    if (!selectedMalId || submittingComment) return;
    const text = commentText.trim();
    if (!text) {
      toast.error("Please write a comment first");
      return;
    }
    setSubmittingComment(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          malId: selectedMalId,
          name: commentName.trim() || "Anonymous",
          text,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Refetch comments so the new one shows up at the top.
      const fresh = await fetch(`/api/comments?malId=${selectedMalId}`);
      if (fresh.ok) {
        const data: { comments: CommentItem[] } = await fresh.json();
        setComments(data.comments ?? []);
      }
      setCommentText("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
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
        <div className="overflow-hidden rounded-2xl glow-orange">
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
                return (
                  <button
                    key={ep.number}
                    type="button"
                    onClick={() => setSelectedEpisode(ep.number)}
                    className={cn(
                      "fade-in-stagger card-hover relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl p-2 text-left",
                      active
                        ? "brand-gradient-bg text-black"
                        : "glass-card text-white hover:text-[#f5c518]",
                    )}
                    style={{ ["--i"]: idx } as React.CSSProperties}
                  >
                    <span
                      className={cn(
                        "text-xs font-black tracking-editorial",
                        active ? "text-black" : "text-white",
                      )}
                    >
                      EP {ep.number}
                    </span>
                    <span
                      className={cn(
                        "line-clamp-2 text-[10px] leading-tight",
                        active ? "text-black/70" : "text-white/55",
                      )}
                    >
                      {ep.title ?? `Episode ${ep.number}`}
                    </span>
                    {ep.filler && (
                      <span className="absolute left-1 top-1 rounded bg-red-500/80 px-1 text-[8px] font-black text-white">
                        FILLER
                      </span>
                    )}
                    {epStatus && (
                      <span
                        className={cn(
                          "absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider",
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

      {/* ===== Rating section — below tabs, after Details ===== */}
      <section className="px-3">
        <div className="glass-card rounded-2xl p-4">
          {/* Inline SVG gradient definition for the gold→orange star fill.
              Defined once, referenced by all filled stars via fill="url(#starGradient)". */}
          <svg
            className="absolute h-0 w-0"
            aria-hidden
            focusable="false"
          >
            <defs>
              <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5c518" />
                <stop offset="100%" stopColor="#ff8a00" />
              </linearGradient>
            </defs>
          </svg>

          <div className="mb-3 flex items-center gap-2">
            <Star
              className="h-4 w-4 text-[#f5c518]"
              style={{ fill: "#f5c518" }}
            />
            <h2
              className="text-sm font-black tracking-editorial text-white"
              style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
            >
              Rate this anime
            </h2>
          </div>

          {/* 5-star picker — gold→orange gradient fill */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoverRating || userRating);
              return (
                <button
                  key={star}
                  type="button"
                  disabled={submittingRating}
                  onClick={() => handleSubmitRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={cn(
                    "btn-press grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100",
                    filled && "drop-shadow-[0_0_8px_rgba(255,138,0,0.55)]",
                  )}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      filled ? "text-[#ff8a00]" : "text-white/20",
                    )}
                    fill={filled ? "url(#starGradient)" : "none"}
                    stroke={filled ? "url(#starGradient)" : "currentColor"}
                  />
                </button>
              );
            })}

            {/* 10-point score next to stars */}
            <div className="ml-2 flex flex-col">
              <span
                className="gradient-text text-lg font-black tabular-nums leading-none"
                style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
              >
                {ratingData.avg > 0 ? ratingData.avg.toFixed(2) : "—"}
              </span>
              <span className="text-[10px] text-white/50">/ 10</span>
            </div>
          </div>

          {/* Voter count + status line */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/55">
            <Users className="h-3 w-3" />
            <span>
              {ratingData.count > 0
                ? `${ratingData.count} ${ratingData.count === 1 ? "person has" : "people have"} rated`
                : "Be the first to rate"}
            </span>
            {userRating > 0 && (
              <span
                className="ml-auto rounded-full brand-gradient-soft px-2 py-0.5 text-[10px] font-bold text-[#f5c518]"
                style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
              >
                You: {userRating}★
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ===== Comments section — below ratings ===== */}
      <section className="px-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle
              className="h-4 w-4 text-[#f5c518]"
              style={{ fill: "#f5c518" }}
            />
            <h2
              className="text-sm font-black tracking-editorial text-white"
              style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
            >
              Comments
              {comments.length > 0 && (
                <span className="ml-1.5 text-[11px] font-bold text-white/45">
                  ({comments.length})
                </span>
              )}
            </h2>
          </div>

          {/* New comment form */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={32}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#f5c518]/60 focus:outline-none focus:ring-1 focus:ring-[#f5c518]/40"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts…"
              maxLength={500}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#f5c518]/60 focus:outline-none focus:ring-1 focus:ring-[#f5c518]/40"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/35">
                {commentText.length}/500
              </span>
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={submittingComment || !commentText.trim()}
                className={cn(
                  "btn-press brand-gradient-bg glow flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-black transition-all duration-300",
                  "hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {submittingComment ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {/* Comments list (newest first) */}
          {comments.length > 0 ? (
            <ul className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {comments.map((c, i) => (
                <li
                  key={c.id ?? i}
                  className="fade-in-stagger glass-card rounded-xl p-3"
                  style={{ ["--i"]: Math.min(i, 8) } as React.CSSProperties}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="brand-gradient-bg grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black text-black">
                        {(c.name || "A").charAt(0).toUpperCase()}
                      </div>
                      <span
                        className="text-xs font-bold text-white"
                        style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
                      >
                        {c.name || "Anonymous"}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-white/40">
                      {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/80">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-white/10 py-6 text-center">
              <MessageCircle className="mb-1.5 h-5 w-5 text-white/25" />
              <p className="text-xs text-white/40">
                No comments yet — start the conversation.
              </p>
            </div>
          )}
        </div>
      </section>
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
// Rating + comments helpers
// ============================================================

function formatTimeAgo(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
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
