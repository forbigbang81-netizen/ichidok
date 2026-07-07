"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Play,
  Shuffle,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, type Anime } from "@/store/app";
import { apiCatalog, seedCatalog } from "@/lib/api/client";
import { TOP_10_DECADE } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { AnimeCard, CardGrid } from "./AnimeCard";

// Curated quick-browse genre list (kept in sync with CatalogView's GENRES).
const QUICK_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Romance",
  "Sci-Fi",
  "Supernatural",
  "Suspense",
  "Award Winning",
];

function SectionHeader({
  title,
  onMore,
}: {
  title: string;
  onMore?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="flex items-center gap-0.5 text-[11px] font-medium text-white/40 transition-colors hover:text-white"
        >
          See All
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] w-full rounded-lg skeleton-shimmer" />
      <div className="mt-1 h-3 w-24 rounded skeleton-shimmer" />
      <div className="mt-1 h-2 w-16 rounded skeleton-shimmer" />
    </div>
  );
}

export function HomeView({ activeType }: { activeType: string }) {
  const openAnime = useApp((s) => s.openAnime);
  const navigate = useApp((s) => s.navigate);
  const setCatalogGenre = useApp((s) => s.setCatalogGenre);
  const history = useApp((s) => s.history);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [top, setTop] = useState<Anime[]>([]);
  const [season, setSeason] = useState<Anime[]>([]);
  const [all, setAll] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [surprising, setSurprising] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const genreSectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!sessionStorage.getItem("ichidoki-seeded")) {
        sessionStorage.setItem("ichidoki-seeded", "1");
        seedCatalog().catch(() => {});
      }
      try {
        const [topRes, seasonRes, allRes] = await Promise.all([
          apiCatalog.top(25).catch(() => ({ results: [] as Anime[] })),
          apiCatalog.season(25).catch(() => ({ results: [] as Anime[] })),
          apiCatalog.all(50).catch(() => ({ results: [] as Anime[] })),
        ]);
        if (cancelled) return;
        setTop(topRes.results);
        setSeason(seasonRes.results);
        setAll(allRes.results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = all.filter((a) => a.status === "Not yet aired");
  const upcomingIds = new Set(upcoming.map((a) => a.malId));
  const featured = (top.length > 0 ? top : all)
    .filter((a) => a.isFeatured || a.score > 8)
    .slice(0, 5);
  const currentFeatured = featured[featuredIdx] ?? featured[0];

  const surprisePool = all.length > 0 ? all : top.length > 0 ? top : season;

  // Pre-compute genre sections from the in-memory `all` list so the
  // chips can scroll to them without any extra network calls.
  const genreSections = useMemo(() => {
    const map: Record<string, Anime[]> = {};
    for (const g of QUICK_GENRES) {
      map[g] = all.filter((a) => a.genres.includes(g));
    }
    return map;
  }, [all]);

  // Auto-rotate the featured banner.
  useEffect(() => {
    if (featured.length <= 1 || paused) return;
    const t = setInterval(
      () => setFeaturedIdx((i) => (i + 1) % featured.length),
      6500,
    );
    return () => clearInterval(t);
  }, [featured.length, paused]);

  const handleSurprise = () => {
    if (surprising) return;
    if (surprisePool.length === 0) {
      toast.error("No anime to pick from yet", {
        description: "Try again in a moment.",
      });
      return;
    }
    setSurprising(true);
    setTimeout(() => {
      const pick = surprisePool[Math.floor(Math.random() * surprisePool.length)];
      setSurprising(false);
      if (pick) {
        toast.success("Surprise pick!", { description: pick.title });
        openAnime(pick.malId);
      }
    }, 500);
  };

  // Netflix-style: clicking a genre chip smooth-scrolls the homepage down to
  // that genre's row (and highlights the active chip). No navigation away.
  const handleGenreClick = (g: string) => {
    setActiveGenre(g);
    const node = genreSectionRefs.current[g];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredTop = top.filter(
    (a) => !upcomingIds.has(a.malId) && a.type === activeType,
  );
  const filteredSeason = season.filter(
    (a) => !upcomingIds.has(a.malId) && a.type === activeType,
  );

  // Build continue-watching cards by joining history items with the in-memory
  // `all` list so we can show "Episode X / Y" and use the full poster.
  const continueWatching = history.slice(0, 10).map((h) => {
    const matched = all.find((a) => a.malId === h.malId);
    const total = matched?.episodeCount ?? 0;
    return {
      malId: h.malId,
      title: matched?.title ?? h.title,
      poster: matched?.poster ?? h.poster ?? "",
      type: matched?.type ?? h.type,
      episode: h.episode,
      totalEpisodes: total,
      progress: h.progress,
      position: h.position,
      duration: h.duration,
    };
  });

  return (
    <div className="fade-in pb-6">
      {/* ===== Genre quick-browse chips ===== */}
      <section className="mb-5 mt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
          {QUICK_GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleGenreClick(g)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors active:bg-white/10",
                activeGenre === g
                  ? "bg-[#f5c518] text-black"
                  : "bg-[#111111] text-white/80",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* ===== Continue watching — top of homepage, server-persisted =====
          Each card shows the poster, episode number + total, position
          timestamp, and a progress bar BELOW the poster. Clicking resumes
          at the saved position. History is fetched from /api/history on
          app mount so it survives redeploys. */}
      {continueWatching.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="Continue watching"
            onMore={() => navigate("library")}
          />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {continueWatching.map((c) => {
              const pct = Math.max(0, Math.min(100, c.progress ?? 0));
              const posMin = Math.floor((c.position ?? 0) / 60);
              const posSec = Math.floor((c.position ?? 0) % 60);
              const durMin = Math.floor((c.duration ?? 0) / 60);
              const durSec = Math.floor((c.duration ?? 0) % 60);
              const posStr = `${posMin}:${String(posSec).padStart(2, "0")}`;
              const durStr = `${durMin}:${String(durSec).padStart(2, "0")}`;
              return (
                <button
                  key={`${c.malId}-${c.episode}`}
                  type="button"
                  onClick={() =>
                    openAnime(c.malId, c.episode, c.position > 5 ? c.position : null)
                  }
                  className="w-40 shrink-0 text-left"
                >
                  {/* Poster thumbnail with play overlay */}
                  <div className="relative aspect-video w-40 overflow-hidden rounded-lg bg-[#111111]">
                    <img
                      src={c.poster}
                      alt={c.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-black/70">
                        <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                      </span>
                    </div>
                    {/* Episode badge top-left */}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      EP {c.episode}
                      {c.totalEpisodes > 0 ? ` / ${c.totalEpisodes}` : ""}
                    </span>
                    {/* Time-remaining hint bottom-right */}
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-medium text-white/90">
                      {posStr} / {durStr}
                    </span>
                  </div>
                  {/* Title */}
                  <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white">
                    {c.title}
                  </p>
                  {/* Progress bar BELOW the card — gold fill on dark track */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#f5c518]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-medium text-white/40">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Featured banner — full-width, no rounded corners ===== */}
      <section className="mb-6">
        {loading ? (
          <div className="aspect-[16/10] w-full skeleton-shimmer" />
        ) : currentFeatured ? (
          <div
            className="relative aspect-[16/10] w-full overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setPaused(false), 4000);
            }}
          >
            {/* Crossfade stack of banner images */}
            <div className="absolute inset-0">
              {featured.map((f, i) => (
                <div
                  key={f.malId}
                  className="absolute inset-0 transition-opacity duration-500 ease-out"
                  style={{ opacity: i === featuredIdx ? 1 : 0 }}
                >
                  <img
                    src={f.banner || f.poster}
                    alt={f.title}
                    className="absolute left-0 top-0 h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = f.poster;
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Surprise Me — simple gold text button */}
            <button
              type="button"
              onClick={handleSurprise}
              disabled={surprising || surprisePool.length === 0}
              aria-label="Surprise me with a random anime"
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-medium text-[#f5c518] backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-60"
            >
              <Shuffle
                className={cn(
                  "h-3.5 w-3.5",
                  surprising && "animate-spin",
                )}
              />
              {surprising ? "Picking…" : "Surprise Me"}
            </button>

            {/* Bottom-left info */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="mb-2 flex items-center gap-2">
                {currentFeatured.score > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#f5c518]">
                    <Star className="h-3 w-3 fill-[#f5c518]" />
                    {currentFeatured.score.toFixed(2)}
                  </span>
                )}
                <span className="text-[11px] font-medium text-white/60">
                  {currentFeatured.type}
                </span>
              </div>
              <h2 className="line-clamp-1 text-xl font-bold text-white">
                {currentFeatured.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/60">
                {currentFeatured.synopsis}
              </p>
              <button
                type="button"
                onClick={() => openAnime(currentFeatured.malId)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-black transition-transform active:scale-95"
              >
                <Play className="h-3 w-3 fill-black" />
                Watch Now
              </button>
            </div>

            {/* Dot indicators */}
            <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
              {featured.map((f, i) => (
                <button
                  key={f.malId}
                  type="button"
                  onClick={() => setFeaturedIdx(i)}
                  aria-label={`Featured ${i + 1}`}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === featuredIdx ? 16 : 6,
                    height: 6,
                    background:
                      i === featuredIdx ? "#f5c518" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* ===== Top 10 on Ichidok — horizontal scroll with rank numbers ===== */}
      <section className="mb-7">
        <SectionHeader title="Top 10 on Ichidok" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
          {TOP_10_DECADE.map((item) => (
            <button
              key={item.malId}
              onClick={() => openAnime(item.malId)}
              className="relative flex w-28 shrink-0 flex-col text-left"
            >
              {/* Rank number — large, behind/beside the poster */}
              <div className="relative flex items-end">
                <span
                  className="text-5xl font-black leading-none text-black"
                  style={{
                    WebkitTextStroke: "1.5px rgba(255,255,255,0.5)",
                  }}
                >
                  {item.rank}
                </span>
                <div className="relative -ml-2 aspect-[2/3] w-20 overflow-hidden rounded-md bg-[#111111]">
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <p className="mt-1.5 line-clamp-1 text-[10px] font-medium text-white">
                {item.title}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#f5c518]">
                  ★ {item.score}
                </span>
                <span className="text-[9px] text-white/40">{item.year}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ===== This Season ===== */}
      {filteredSeason.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="This Season"
            onMore={() => navigate("catalog")}
          />
          <div className="px-4">
            <CardGrid>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))
                : filteredSeason.map((a) => (
                    <AnimeCard key={a.malId} anime={a} badge={a.isNew ? "NEW" : null} />
                  ))}
            </CardGrid>
          </div>
        </section>
      )}

      {/* ===== Top Rated ===== */}
      <section className="mb-7">
        <SectionHeader
          title="Top Rated"
          onMore={() => navigate("catalog")}
        />
        <div className="px-4">
          {loading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </CardGrid>
          ) : filteredTop.length > 0 ? (
            <CardGrid>
              {filteredTop.map((a) => (
                <AnimeCard key={a.malId} anime={a} badge={a.isNew ? "NEW" : null} />
              ))}
            </CardGrid>
          ) : (
            <p className="py-4 px-1 text-xs text-white/40">
              No {activeType} anime found.
            </p>
          )}
        </div>
      </section>

      {/* ===== Upcoming ===== */}
      {upcoming.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="Upcoming"
            onMore={() => navigate("catalog")}
          />
          <div className="px-4">
            <CardGrid>
              {upcoming.slice(0, 9).map((a) => (
                <AnimeCard key={a.malId} anime={a} badge="NEW" />
              ))}
            </CardGrid>
          </div>
        </section>
      )}

      {/* ===== Browse by genre — Netflix-style inline sections =====
          Each chip in the top chip row smooth-scrolls to its matching
          section below. Sections only render if the in-memory catalog
          has at least one title for that genre, keeping the page tidy. */}
      {QUICK_GENRES.map((g) => {
        const items = genreSections[g] ?? [];
        if (items.length === 0) return null;
        return (
          <section
            key={g}
            ref={(el) => {
              genreSectionRefs.current[g] = el;
            }}
            className="mb-7 scroll-mt-16"
          >
            <SectionHeader
              title={g}
              onMore={() => {
                setCatalogGenre(g);
                navigate("catalog");
              }}
            />
            <div className="px-4">
              <CardGrid>
                {items.slice(0, 18).map((a) => (
                  <AnimeCard
                    key={a.malId}
                    anime={a}
                    badge={a.isNew ? "NEW" : null}
                  />
                ))}
              </CardGrid>
            </div>
          </section>
        );
      })}
    </div>
  );
}
