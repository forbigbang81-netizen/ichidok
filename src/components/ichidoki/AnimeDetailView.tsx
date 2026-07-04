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
  } = useApp();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  const isBookmarked = selectedMalId
    ? bookmarks.includes(selectedMalId)
    : false;

  useEffect(() => {
    if (!selectedMalId) return;
    let cancelled = false;
    setLoading(true);
    fetchAnimeDetail(selectedMalId, true)
      .then((r) => {
        if (cancelled) return;
        setAnime(r.anime);
        setEpisodes(r.episodes ?? []);
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
              return (
                <button
                  key={ep.number}
                  type="button"
                  onClick={() => setSelectedEpisode(ep.number)}
                  className={cn(
                    "flex aspect-video flex-col justify-between rounded-md border p-2 text-left transition",
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
                </button>
              );
            })}
          </div>
        </TabsContent>

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
