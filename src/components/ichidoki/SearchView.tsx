"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Sparkles, TrendingUp } from "lucide-react";
import { searchAnime } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

const TRENDING_QUERIES = [
  "Frieren",
  "Bleach",
  "Jujutsu",
  "Evangelion",
  "Cyberpunk",
];

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchAnime(query, 24);
        setResults(r);
      } catch (e) {
        console.error(e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <Search className="h-5 w-5" />
          Search
        </h1>
        <p className="mt-0.5 text-xs text-white/40">
          Find anime by title, English name, or Japanese name.
        </p>
      </div>

      {/* Search bar — simple solid dark bg */}
      <div className="flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTouched(true);
          }}
          placeholder="Search anime…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/60 transition-colors active:bg-white/10"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Trending chips */}
      {!touched && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-medium text-white/40">
            <TrendingUp className="h-3 w-3" />
            Trending
          </span>
          {TRENDING_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                setTouched(true);
              }}
              className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors active:bg-white/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <CardGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </CardGrid>
      )}

      {/* Empty state */}
      {!loading && query.trim() && results.length === 0 && (
        <div className="grid place-items-center py-16 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/70">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/40">
            Try a different spelling, a shorter query, or browse the catalog
            instead.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="w-fit rounded-full bg-[#111111] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <CardGrid>
            {results.map((a) => (
              <AnimeCard key={a.malId} anime={a} />
            ))}
          </CardGrid>
        </>
      )}

      {/* Idle empty state */}
      {!loading && !query.trim() && (
        <div className="grid place-items-center py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/70">
            Find your next obsession
          </p>
          <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/40">
            Search across thousands of titles — by English name, Japanese name,
            or any keyword.
          </p>
        </div>
      )}
    </div>
  );
}
