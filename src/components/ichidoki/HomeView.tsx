"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Flame, Sparkles, Star, TrendingUp } from "lucide-react";
import { apiCatalog, seedCatalog } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { useApp } from "@/store/app";
import { cn, splitTitle } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

export function HomeView() {
  const openAnime = useApp((s) => s.openAnime);
  const navigate = useApp((s) => s.navigate);

  const [featured, setFeatured] = useState<Anime[]>([]);
  const [season, setSeason] = useState<Anime[]>([]);
  const [top, setTop] = useState<Anime[]>([]);
  const [upcoming, setUpcoming] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Kick off seeding in parallel (no await — best-effort).
      seedCatalog().catch(() => {});
      try {
        const [all, seasonRes, topRes, upcomingRes] = await Promise.all([
          apiCatalog.all(100),
          apiCatalog.season(25),
          apiCatalog.top(25),
          apiCatalog.upcoming(25),
        ]);
        if (cancelled) return;
        const upcomingIds = new Set(upcomingRes.results.map((a) => a.malId));
        // Deduplicate: upcoming excluded from This Season and Top Rated.
        setSeason(seasonRes.results.filter((a) => !upcomingIds.has(a.malId)));
        setTop(topRes.results.filter((a) => !upcomingIds.has(a.malId)));
        setUpcoming(upcomingRes.results);
        // Featured = isFeatured flag from catalog, fallback to top-rated.
        const featuredList = all.results.filter(
          (a) => (a as { isFeatured?: boolean }).isFeatured,
        );
        setFeatured(
          (featuredList.length > 0 ? featuredList : all.results.slice(0, 6)).slice(0, 8),
        );
      } catch (e) {
        console.error("HomeView load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-6 fade-in">
      <FeaturedCarousel
        items={featured}
        loading={loading}
        onOpen={(malId) => openAnime(malId)}
      />

      <Section
        title="This Season"
        icon={<Sparkles className="h-4 w-4 text-yellow-400" />}
        loading={loading}
        onSeeAll={() => navigate("catalog")}
      >
        <CardGrid>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : season.slice(0, 9).map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </CardGrid>
      </Section>

      <Section
        title="Top Rated"
        icon={<TrendingUp className="h-4 w-4 text-yellow-400" />}
        loading={loading}
        onSeeAll={() => navigate("catalog")}
      >
        <CardGrid>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : top.slice(0, 9).map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </CardGrid>
      </Section>

      <Section
        title="Upcoming"
        icon={<Flame className="h-4 w-4 text-yellow-400" />}
        loading={loading}
        onSeeAll={() => navigate("catalog")}
      >
        <CardGrid>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : upcoming.slice(0, 9).map((a) => <AnimeCard key={a.malId} anime={a} />)}
        </CardGrid>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  loading,
  onSeeAll,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  onSeeAll?: () => void;
}) {
  return (
    <section className="px-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold tracking-wide text-white">{title}</h2>
        {!loading && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="ml-auto flex items-center text-[11px] font-medium text-white/60 hover:text-yellow-400"
          >
            See All <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function FeaturedCarousel({
  items,
  loading,
  onOpen,
}: {
  items: Anime[];
  loading: boolean;
  onOpen: (malId: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const total = items.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % total);
    }, 6000);
    return () => clearInterval(id);
  }, [total]);

  const current = items[idx];
  const { main, sub } = useMemo(
    () => (current ? splitTitle(current.title) : { main: "", sub: "" }),
    [current],
  );

  if (loading) {
    return (
      <div className="px-4">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl shimmer" />
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="px-4">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#1a1a22] ring-1 ring-white/5">
        {current.banner && (
          <img
            src={current.banner}
            alt={current.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-black">
              FEATURED
            </span>
            {current.score > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-yellow-400" />
                {current.score.toFixed(2)}
              </span>
            )}
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
              {current.type}
            </span>
          </div>
          <h1 className="text-xl font-black leading-tight text-white drop-shadow-lg">
            {main}
          </h1>
          {sub && <p className="text-xs text-white/70">{sub}</p>}
          <p className="line-clamp-2 text-[11px] leading-relaxed text-white/70">
            {current.synopsis}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(current.malId)}
              className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-300"
            >
              ▶ Watch Now
            </button>
            <button
              type="button"
              onClick={() => onOpen(current.malId)}
              className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Details
            </button>
          </div>
        </div>

        {/* Dots */}
        {total > 1 && (
          <div className="absolute right-3 top-3 flex gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-5 bg-yellow-400" : "w-1.5 bg-white/40",
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
