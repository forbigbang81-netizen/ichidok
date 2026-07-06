"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [seasons, setSeasons] = useState<{ malId: number; label: string; anime: Anime | null }[]>([]);
  const [broadcast, setBroadcast] = useState<any>(null);
  useCountdownTick();

  const isBookmarked = selectedMalId
    ? bookmarks.includes(selectedMalId)
    : false;

  useEffect(() => {
    if (!selectedMalId) return;
    let cancelled = false;
    setLoading(true);
    fetchAnimeDetail(selectedMalId, true)
      .then((r: any) => {
        if (cancelled) return;
        setAnime(r.anime);
        setEpisodes(r.episodes ?? []);
        setBroadcast(r.broadcast ?? null);
      })
      .catch((e) => {
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
    ? history.filter((h) => h.malId === selectedMalId).sort((a, b) => {
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
      } catch {}
    } else {
      toggleBookmark(anime.malId);
      try {
        await addBookmark(anime);
        toast.success("Added to bookmarks");
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col gap-3 p-4">
        <div className="aspect-video w-full rounded-lg shimmer" />
        <div className="h-6 w-2/3 rounded shimmer" />
        <div className="h-4 w-1/2 rounded shimmer" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!anime || !selectedMalId) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center text-white/60">
        <div>
          <p className="text-sm">Anime not found.</p>
          <button
            type="button"
            onClick={back}
            className="mt-3 rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black"
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

  return (
    <div className="flex flex-col gap-4 pb-8 fade-in">
      {/* Back button */}
      <div className="sticky top-0 z-20 flex items-center gap-2 glass-header px-3 py-2">
        <button
          type="button"
          onClick={back}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="truncate text-sm font-semibold text-white">Details</p>
        <button
          type="button"
          onClick={handleBookmarkToggle}
          className={cn(
            "ml-auto grid h-9 w-9 place-items-center rounded-full",
            isBookmarked
              ? "bg-yellow-400 text-black"
              : "bg-white/5 text-white hover:bg-white/10",
          )}
          aria-label="Bookmark"
        >
          <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-black")} />
        </button>
      </div>

      {/* Video player */}
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

      {/* Anime info */}
      <div className="flex gap-3 px-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md bg-[#1a1a22] ring-1 ring-white/5">
          {anime.poster && (
            <img
              src={anime.poster}
              alt={anime.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight text-white">
            {anime.title}
          </h1>
          {anime.titleJapanese && (
            <p className="mt-0.5 text-[11px] text-white/50">
              {anime.titleJapanese}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
            {anime.score > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-yellow-400/10 px-1.5 py-0.5 font-bold text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" />
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
                <Users className="h-3 w-3" />{" "}
                {(anime.members / 1000).toFixed(0)}K
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {anime.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="px-4 text-xs leading-relaxed text-white/70">
        {anime.status}
        {anime.studios?.length ? ` · ${anime.studios.join(", ")}` : ""}
      </p>

      {/* Tabs */}
      <Tabs defaultValue="episodes" className="px-4">
        <TabsList className="bg-white/5">
          <TabsTrigger value="episodes" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Episodes
          </TabsTrigger>
          {continueWatching.length > 0 && (
            <TabsTrigger value="continue" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <History className="mr-1 h-3 w-3" />
              Continue
            </TabsTrigger>
          )}
          {seasons.length > 1 && (
            <TabsTrigger value="seasons" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <Layers className="mr-1 h-3 w-3" />
              Seasons
            </TabsTrigger>
          )}
          <TabsTrigger value="synopsis" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Synopsis
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="mt-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {episodeList.map((ep) => {
              const active = ep.number === selectedEpisode;
              const isAiring = anime.status === "Currently Airing";
              const watchedEps = continueWatching.map((h) => h.episode);
              const latestAvailableEp = watchedEps.length > 0 ? Math.max(...watchedEps) : 0;
              const hasStream = !isAiring || ep.number <= latestAvailableEp;
              const epStatus = isAiring
                ? getEpisodeAirStatus(ep.number, anime.episodeCount, broadcast, hasStream, latestAvailableEp)
                : null;
              return (
                <button
                  key={ep.number}
                  type="button"
                  onClick={() => setSelectedEpisode(ep.number)}
                  className={cn(
                    "relative flex aspect-video flex-col justify-between rounded-md border p-2 text-left transition overflow-hidden",
                    active
                      ? "border-yellow-400 bg-yellow-400/10"
                      : "border-white/5 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      active ? "text-yellow-400" : "text-white",
                    )}
                  >
                    EP {ep.number}
                  </span>
                  <span className="line-clamp-2 text-[10px] text-white/60">
                    {ep.title ?? `Episode ${ep.number}`}
                  </span>
                  {ep.filler && (
                    <span className="text-[9px] font-bold text-red-400">
                      FILLER
                    </span>
                  )}
                  {epStatus && (
                    <span className={cn(
                      "absolute bottom-1 right-1 rounded px-1 py-0.5 text-[8px] font-bold",
                      epStatus.type === "countdown"
                        ? "bg-yellow-400/20 text-yellow-400"
                        : epStatus.type === "coming-soon"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-green-500/20 text-green-400"
                    )}>
                      {epStatus.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </TabsContent>

        {continueWatching.length > 0 && (
          <TabsContent value="continue" className="mt-3">
            <div className="flex flex-col gap-2">
              {continueWatching.map((h) => {
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
                      "flex items-center gap-3 rounded-lg border p-2 text-left transition",
                      isActive
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-white/5 bg-white/5 hover:bg-white/10",
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
                      {/* Progress bar */}
                      {h.duration > 0 && (
                        <div className="absolute bottom-0 left-0 h-1 bg-yellow-400" style={{ width: `${Math.min(100, h.progress)}%` }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-bold", isActive ? "text-yellow-400" : "text-white")}>
                        Episode {h.episode}
                      </p>
                      <p className="text-[10px] text-white/50">
                        {h.progress > 0 ? `${Math.round(h.progress)}% watched` : "Not started"}
                      </p>
                      {h.watchedAt && (
                        <p className="text-[9px] text-white/40">
                          {new Date(h.watchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        )}

        {seasons.length > 1 && (
          <TabsContent value="seasons" className="mt-3">
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
                      "flex items-center gap-3 rounded-lg border p-2 text-left transition",
                      isCurrent
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-white/5 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <div className="grid h-12 w-8 shrink-0 place-items-center rounded-md bg-yellow-400/10 text-xs font-bold text-yellow-400">
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
                      <p className={cn("text-xs font-bold leading-tight", isCurrent ? "text-yellow-400" : "text-white")}>
                        {s.label}
                      </p>
                      {s.anime && (
                        <p className="text-[10px] text-white/50">
                          {s.anime.episodeCount > 0 ? `${s.anime.episodeCount} eps` : s.anime.type}
                          {s.anime.score > 0 && ` · ⭐ ${s.anime.score.toFixed(2)}`}
                          {s.anime.year && ` · ${s.anime.year}`}
                        </p>
                      )}
                      {s.anime?.status && (
                        <p className="text-[9px] text-white/40">{s.anime.status}</p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-[9px] font-bold text-yellow-400">CURRENT</span>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>
        )}

        <TabsContent value="synopsis" className="mt-3">
          <p className="text-xs leading-relaxed text-white/75">
            {anime.synopsis || "No synopsis available."}
          </p>
        </TabsContent>

        <TabsContent value="details" className="mt-3">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md bg-white/5 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="truncate text-xs font-medium text-white/90">{value}</dd>
    </div>
  );
}

// ---- Episode countdown timer ----

interface BroadcastInfo { day?: string; time?: string; timezone?: string; string?: string }

function getNextAirTime(broadcast: BroadcastInfo | null): Date | null {
  if (!broadcast?.day || !broadcast?.time) return null;
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    sundays: 0, mondays: 1, tuesdays: 2, wednesdays: 3, thursdays: 4, fridays: 5, saturdays: 6,
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

function getEpisodeAirStatus(
  epNumber: number, _totalEps: number, broadcast: BroadcastInfo | null,
  hasStream: boolean, latestAvailableEp: number,
): { type: "countdown" | "coming-soon" | "available"; label: string } | null {
  if (!broadcast?.day || !broadcast?.time) return null;
  if (hasStream) return { type: "available", label: "AVAILABLE" };
  const nextAir = getNextAirTime(broadcast);
  if (!nextAir) return null;
  // Calculate this episode's air time: next air is for ep (latestAvailableEp + 1)
  const weeksDiff = (latestAvailableEp + 1) - epNumber;
  const epAirTime = new Date(nextAir.getTime() - weeksDiff * 7 * 24 * 3600000);
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
  return { type: "coming-soon", label: "COMING SOON" };
}

function useCountdownTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);
}
