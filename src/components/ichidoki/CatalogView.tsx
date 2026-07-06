"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LayoutGrid, X, ChevronDown, ChevronUp } from "lucide-react";
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
  const [sortOpen, setSortOpen] = useState(false);
  const [limit, setLimit] = useState(24);

  // Consume any pending genre sent from another view.
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <LayoutGrid className="h-5 w-5" />
            Catalog
          </h1>
          <p className="mt-0.5 text-xs text-white/40">
            {loading ? "Loading…" : `${items.length} titles`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            showFilters || hasActiveFilters
              ? "bg-[#f5c518] text-black"
              : "bg-[#111111] text-white/70 active:bg-white/10",
          )}
        >
          <Filter className="h-3 w-3" />
          Filters
        </button>
      </div>

      {/* Sort — simple text dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-medium text-white/80 transition-colors active:bg-white/10"
        >
          Sort: {SORTS.find((s) => s.key === sort)?.label}
          {sortOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {sortOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg bg-[#111111] py-1 shadow-xl">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSort(s.key);
                  setSortOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                  s.key === sort ? "text-[#f5c518]" : "text-white/80",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active genre pill */}
      {genre !== "All" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
            Genre
          </span>
          <button
            type="button"
            onClick={() => setGenre("All")}
            className="flex items-center gap-1 rounded-full bg-[#f5c518] px-3 py-1 text-[11px] font-medium text-black"
          >
            {genre}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-col gap-3 rounded-lg bg-[#111111] p-3">
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
                {s}
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
              className="flex w-fit items-center gap-1 text-[11px] font-medium text-white/50 transition-colors hover:text-white"
            >
              <X className="h-3 w-3" /> Reset filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <CardGrid>
          {Array.from({ length: 9 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </CardGrid>
      ) : visible.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <Filter className="mb-3 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/70">
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
              className="mx-auto mt-2 rounded-lg border border-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/5"
            >
              Load More
              <span className="ml-2 text-white/40">
                ({items.length - limit} left)
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
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
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
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-[#f5c518] text-black"
          : "bg-black text-white/70 active:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
