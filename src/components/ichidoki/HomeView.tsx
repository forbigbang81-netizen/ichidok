"use client";

import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Calendar,
  TrendingUp,
  ChevronRight,
  Play,
  Clock,
} from "lucide-react";
import { useApp, type Anime } from "@/store/app";
import { apiCatalog, seedCatalog } from "@/lib/api/client";
import { TOP_10_DECADE } from "@/lib/seed";
import { AnimeCard, CardGrid } from "./AnimeCard";

function SectionHeader({
  title,
  icon,
  onMore,
}: {
  title: string;
  icon: React.ReactNode;
  onMore?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h3 className="flex items-center gap-1.5 text-[15px] font-bold tracking-editorial">
        <span className="gradient-text">{icon}</span>
        <span className="text-white">{title}</span>
      </h3>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="group flex items-center gap-0.5 text-[11px] font-semibold text-white/55 transition-colors hover:text-[#f5c518]"
        >
          More
          <ChevronRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] w-full rounded-xl skeleton-shimmer" />
      <div className="mt-1 h-3 w-24 rounded skeleton-shimmer" />
      <div className="mt-1 h-2 w-16 rounded skeleton-shimmer" />
    </div>
  );
}

export function HomeView({ activeType }: { activeType: string }) {
  const openAnime = useApp((s) => s.openAnime);
  const navigate = useApp((s) => s.navigate);
  const history = useApp((s) => s.history);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [top, setTop] = useState<Anime[]>([]);
  const [season, setSeason] = useState<Anime[]>([]);
  const [all, setAll] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [parallax, setParallax] = useState(0);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

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

  // Auto-rotate with crossfade; pause on hover/tap.
  useEffect(() => {
    if (featured.length <= 1 || paused) return;
    carouselTimer.current = setInterval(
      () => setFeaturedIdx((i) => (i + 1) % featured.length),
      6500,
    );
    return () => {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    };
  }, [featured.length, paused]);

  // Parallax: track scroll and translate the banner image.
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        // Cap the parallax range so the image buffer always covers the shift.
        const y = Math.min(window.scrollY, 240);
        setParallax(y * 0.18);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const filteredTop = top.filter(
    (a) => !upcomingIds.has(a.malId) && a.type === activeType,
  );
  const filteredSeason = season.filter(
    (a) => !upcomingIds.has(a.malId) && a.type === activeType,
  );

  const continueWatching = history.slice(0, 4).map((h) => ({
    anime: {
      malId: h.malId,
      id: String(h.malId),
      title: h.title,
      poster: h.poster ?? "",
      banner: h.poster ?? "",
      type: h.type,
      score: 0,
      genres: [],
      studios: [],
      episodeCount: 0,
      synopsis: "",
      year: undefined,
      isNew: false,
    } as Anime,
    episode: h.episode,
    progress: h.progress,
  }));

  return (
    <div className="fade-in pb-6">
      {/* Featured carousel */}
      <section className="mb-6 px-4 pt-3">
        {loading ? (
          <div className="aspect-[16/10] w-full rounded-2xl skeleton-shimmer" />
        ) : currentFeatured ? (
          <div
            className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setPaused(false), 4000);
            }}
          >
            {/* Crossfade stack of banner images with parallax */}
            <div className="absolute inset-0">
              {featured.map((f, i) => (
                <div
                  key={f.malId}
                  className="absolute inset-0 transition-opacity duration-700 ease-out"
                  style={{ opacity: i === featuredIdx ? 1 : 0 }}
                >
                  <img
                    src={f.banner || f.poster}
                    alt={f.title}
                    className="absolute left-0 top-[-18%] h-[136%] w-full object-cover"
                    style={{
                      transform: `translateY(${
                        i === featuredIdx ? parallax : 0
                      }px)`,
                      transition: "transform 0.12s linear",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = f.poster;
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Gradient overlays */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/45 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/55 via-transparent to-transparent" />

            {/* Center play button */}
            <button
              type="button"
              onClick={() => openAnime(currentFeatured.malId)}
              className="btn-press group absolute inset-0 grid place-items-center"
              aria-label={`Watch ${currentFeatured.title}`}
            >
              <span className="brand-gradient-bg pulse-glow grid h-14 w-14 place-items-center rounded-full shadow-2xl shadow-black/50 transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-black text-black" />
              </span>
            </button>

            {/* Bottom-left info */}
            <div className="absolute bottom-3 left-3 right-16">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="brand-gradient-bg rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  Featured
                </span>
                <span className="rounded border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {currentFeatured.type}
                </span>
                {currentFeatured.score > 0 && (
                  <span className="glass-card rounded px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="gradient-text">
                      ★ {currentFeatured.score.toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="line-clamp-1 text-lg font-bold tracking-editorial text-white text-glow">
                {currentFeatured.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/70">
                {currentFeatured.synopsis}
              </p>
              <button
                type="button"
                onClick={() => openAnime(currentFeatured.malId)}
                className="btn-press brand-gradient-bg mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold text-black"
              >
                <Play className="h-3 w-3 fill-black" />
                Watch Now
              </button>
            </div>

            {/* Dot indicators — active is wider, animated */}
            <div className="absolute right-3 top-3 flex flex-col items-center gap-1.5">
              {featured.map((f, i) => (
                <button
                  key={f.malId}
                  type="button"
                  onClick={() => setFeaturedIdx(i)}
                  aria-label={`Featured ${i + 1}`}
                  className="overflow-hidden rounded-full transition-all duration-300"
                  style={{
                    width: i === featuredIdx ? 6 : 6,
                    height: i === featuredIdx ? 22 : 6,
                    background:
                      i === featuredIdx
                        ? "var(--gradient-brand)"
                        : "rgba(255,255,255,0.45)",
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="Continue watching"
            icon={<Clock className="h-3.5 w-3.5" />}
            onMore={() => navigate("library")}
          />
          <div className="no-scrollbar flex gap-3 overflow-x-auto pl-4 pr-4">
            {continueWatching.map((c, i) => (
              <button
                key={`${c.anime.malId}-${c.episode}-${i}`}
                type="button"
                onClick={() => openAnime(c.anime.malId, c.episode)}
                className="fade-in-stagger w-44 shrink-0 text-left"
                style={{ ["--i"]: i } as React.CSSProperties}
              >
                <div className="glass-card card-hover relative h-24 w-44 overflow-hidden rounded-xl">
                  <img
                    src={c.anime.poster}
                    alt={c.anime.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
                      <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                    <div
                      className="brand-gradient-bg h-full"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-semibold tracking-editorial text-white">
                  {c.anime.title}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#f5c518]">
                  Episode {c.episode}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Top 10 of the Decade */}
      <section className="mb-7">
        <SectionHeader
          title="Top 10 of the Decade"
          icon={<Flame className="h-3.5 w-3.5" />}
        />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
          {TOP_10_DECADE.map((item, i) => (
            <button
              key={item.malId}
              onClick={() => openAnime(item.malId)}
              className="group relative flex h-44 w-32 shrink-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#11111a] transition-all duration-200 hover:border-[#f5c518]/40 hover:scale-[1.03]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Rank number */}
              <div
                className="absolute left-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-lg text-sm font-black text-black"
                style={{
                  background: item.rank <= 3
                    ? "linear-gradient(135deg, #f5c518, #ff8a00)"
                    : "rgba(255,255,255,0.15)",
                  boxShadow: item.rank <= 3 ? "0 0 12px rgba(245,197,24,0.5)" : "none",
                }}
              >
                {item.rank}
              </div>
              {/* Poster */}
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="truncate text-[11px] font-bold text-white">{item.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-[#f5c518]">★ {item.score}</span>
                  <span className="text-[9px] text-white/50">{item.year}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* This Season */}
      {filteredSeason.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="This season"
            icon={<Calendar className="h-3.5 w-3.5" />}
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

      {/* Top Rated */}
      <section className="mb-7">
        <SectionHeader
          title="Top rated"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
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
            <p className="py-4 px-1 text-xs text-white/45">
              No {activeType} anime found.
            </p>
          )}
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="Upcoming"
            icon={<Flame className="h-3.5 w-3.5" />}
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
    </div>
  );
}
