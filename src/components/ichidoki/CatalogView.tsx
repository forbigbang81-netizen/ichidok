"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { apiCatalog } from "@/lib/api/client";
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
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("popularity");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [genre, setGenre] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(24);

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
    type !== "All" || status !== "All" || genre !== "All" || sort !== "popularity";

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 fade-in">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white">Catalog</h1>
          <p className="text-xs text-white/50">
            {loading ? "Loading…" : `${items.length} titles`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            showFilters || hasActiveFilters
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
              : "border-white/10 bg-white/5 text-white/70",
          )}
        >
          <Filter className="h-3 w-3" />
          Filters
        </button>
      </div>

      {/* Sort chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
              sort === s.key
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 fade-in">
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
              className="flex w-fit items-center gap-1 text-[11px] font-medium text-white/60 hover:text-yellow-400"
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
        <div className="grid place-items-center py-12 text-center text-white/40">
          <p className="text-sm">No titles match these filters.</p>
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
              className="mx-auto rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Load More ({items.length - limit} left)
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
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-yellow-400 text-black"
          : "bg-white/5 text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
