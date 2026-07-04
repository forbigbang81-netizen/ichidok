"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchAnime } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { cn } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

const TRENDING_QUERIES = ["Frieren", "Bleach", "Jujutsu", "Evangelion", "Cyberpunk"];

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
    <div className="flex flex-col gap-4 p-4 pb-6 fade-in">
      <div>
        <h1 className="text-lg font-bold text-white">Search</h1>
        <p className="text-xs text-white/50">
          Find anime by title, English name, or Japanese name.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTouched(true);
          }}
          placeholder="Search anime…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus:border-yellow-400/60 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {!touched && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-white/40">Trending:</span>
          {TRENDING_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                setTouched(true);
              }}
              className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70 hover:bg-yellow-400/20 hover:text-yellow-400"
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

      {!loading && query.trim() && results.length === 0 && (
        <div className="grid place-items-center py-12 text-center">
          <p className="text-sm text-white/60">No results for “{query}”.</p>
          <p className="mt-1 text-xs text-white/40">
            Try a different spelling or browse the catalog.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-xs text-white/50">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <CardGrid>
            {results.map((a) => (
              <AnimeCard key={a.malId} anime={a} />
            ))}
          </CardGrid>
        </>
      )}

      {!loading && !query.trim() && (
        <div className="grid place-items-center py-12 text-center text-white/40">
          <Search className="mb-2 h-10 w-10 opacity-30" />
          <p className="text-xs">Start typing to search</p>
        </div>
      )}
    </div>
  );
}
