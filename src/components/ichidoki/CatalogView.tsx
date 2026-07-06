"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LayoutGrid, X } from "lucide-react";
import { apiCatalog } from "@/lib/api/client";
import { useApp } from "@/store/app";
import type { Anime } from "@/store/app";
import { cn } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

type SortKey = "popularity" | "score" | "year" | "rank";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popularity", label: "Popular" },
  { key: "score", label: "Top Rated" },
  { key: "year", label: "Newest" },
  { key: "rank", label: "Ranked" },
];

const TYPES = ["All", "TV", "Movie", "Special", "OVA", "ONA"];
const STATUSES = [
  "All",
  "Finished Airing",
  "Currently Airing",
  "Not yet aired",
];
const GENRES = [
  "All",
  "Action",
  "Adventure",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Romance",
  "Comedy",
  "Supernatural",
  "Suspense",
  "Award Winning",
];

export function CatalogView() {
  const catalogGenre = useApp((s) => s.catalogGenre);
  const setCatalogGenre = useApp((s) => s.setCatalogGenre);

  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("popularity");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [genre, setGenre] = useState<string>(
    catalogGenre && GENRES.includes(catalogGenre) ? catalogGenre : "All",
  );
  const [showFilters, setShowFilters] = useState(
    catalogGenre && GENRES.includes(catalogGenre) ? true : false,
  );
  const [limit, setLimit] = useState(24);

  // Consume any pending genre sent from another view (e.g. HomeView genre
  // chips) — apply it once on mount, then clear the store flag. Intentionally
  // mount-only: we want to consume the pending genre once, not react to
  // every store update.
  useEffect(() => {
    if (catalogGenre && GENRES.includes(catalogGenre)) {
      setGenre(catalogGenre);
      setShowFilters(true);
      setCatalogGenre(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number> = {
      sort,
      limit: 200,
    };
    if (type !== "All") params.type = type;
    if (status !== "All") params.status = status;
    if (genre !== "All") params.genre = genre;
    apiCatalog
      .custom(params)
      .then((r) => {
        if (cancelled) return;
        setItems(r.results);
        setLimit(24);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, type, status, genre]);

  const visible = useMemo(() => items.slice(0, limit), [items, limit]);

  const hasActiveFilters =
    type !== "All" ||
    status !== "All" ||
    genre !== "All" ||
    sort !== "popularity";

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Section header — gradient text */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-black tracking-editorial">
            <span className="gradient-text">
              <LayoutGrid className="h-5 w-5" />
            </span>
            <span className="gradient-text">Catalog</span>
          </h1>
          <p className="mt-0.5 text-xs text-white/50">
            {loading ? "Loading…" : `${items.length} titles`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "btn-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300",
            showFilters || hasActiveFilters
              ? "brand-gradient-bg text-black glow"
              : "glass-card text-white/70 hover:text-[#f5c518]",
          )}
        >
          <Filter className="h-3 w-3" />
          Filters
        </button>
      </div>

      {/* Sort chips — glass pills with gradient active */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {SORTS.map((s, i) => {
          const active = sort === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "fade-in-stagger btn-press shrink-0 rounded-full px-3.5 py-1 text-[11px] font-bold tracking-editorial transition-all duration-300",
                active
                  ? "brand-gradient-bg text-black"
                  : "glass-card text-white/70 hover:text-[#f5c518]",
              )}
              style={{ ["--i"]: i } as React.CSSProperties}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Active genre quick-pill — shown when a genre is selected */}
      {genre !== "All" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
            Genre
          </span>
          <button
            type="button"
            onClick={() => setGenre("All")}
            className="btn-press brand-gradient-bg glow flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-black"
          >
            {genre}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Filter panel — glass collapsible with smooth height animation */}
      <div
        className={cn(
          "glass-card overflow-hidden rounded-2xl transition-[max-height,opacity,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          showFilters
            ? "max-h-[640px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <div className="flex flex-col gap-3 p-3">
          <FilterRow label="Type">
            {TYPES.map((t) => (
              <Chip
                key={t}
                active={type === t}
                onClick={() => setType(t)}
              >
                {t}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Status">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                active={status === s}
                onClick={() => setStatus(s)}
              >
                {s === "All" ? "All" : s.replace(" ", " ")}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Genre">
            {GENRES.map((g) => (
              <Chip
                key={g}
                active={genre === g}
                onClick={() => setGenre(g)}
              >
                {g}
              </Chip>
            ))}
          </FilterRow>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setType("All");
                setStatus("All");
                setGenre("All");
                setSort("popularity");
              }}
              className="btn-press flex w-fit items-center gap-1 text-[11px] font-bold text-white/60 transition-colors duration-300 hover:text-[#f5c518]"
            >
              <X className="h-3 w-3" /> Reset filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <CardGrid>
          {Array.from({ length: 9 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </CardGrid>
      ) : visible.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-2xl py-16 text-center">
          <div className="float-y mb-3 grid h-14 w-14 place-items-center rounded-2xl brand-gradient-soft">
            <Filter className="h-6 w-6 text-[#f5c518]" />
          </div>
          <p className="gradient-text text-sm font-black tracking-editorial">
            No titles match these filters
          </p>
          <p className="mt-1 text-xs text-white/40">
            Try resetting or choosing a different combination.
          </p>
        </div>
      ) : (
        <>
          <CardGrid>
            {visible.map((a) => (
              <AnimeCard key={a.malId} anime={a} />
            ))}
          </CardGrid>
          {limit < items.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 24)}
              className="btn-press brand-gradient-bg glow mx-auto mt-2 flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#ff8a00]/20 transition-transform duration-300 hover:scale-105"
            >
              Load More
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold">
                {items.length - limit} left
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
        {label}
      </p>
      <div className="no-scrollbar flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-press rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-300",
        active
          ? "brand-gradient-bg text-black glow"
          : "glass-card text-white/70 hover:text-[#f5c518]",
      )}
    >
      {children}
    </button>
  );
}
