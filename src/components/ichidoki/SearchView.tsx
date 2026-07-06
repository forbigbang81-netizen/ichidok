"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Sparkles, TrendingUp } from "lucide-react";
import { searchAnime } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { cn } from "@/lib/utils";
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
  const [focused, setFocused] = useState(false);
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
      {/* Section header */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black tracking-editorial">
          <span className="gradient-text">
            <Search className="h-5 w-5" />
          </span>
          <span className="gradient-text">Search</span>
        </h1>
        <p className="mt-0.5 text-xs text-white/50">
          Find anime by title, English name, or Japanese name.
        </p>
      </div>

      {/* Search bar — glass with gradient focus ring */}
      <div className="relative">
        <div
          className={cn(
            "glass-card flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-300",
            focused && "glow",
          )}
        >
          <Search
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-300",
              focused ? "text-[#f5c518]" : "text-white/40",
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTouched(true);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search anime…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="btn-press glass-card grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/70 hover:text-[#f5c518]"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {focused && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full opacity-50"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,197,24,0.15), rgba(255,138,0,0.15))",
              filter: "blur(12px)",
              zIndex: -1,
            }}
          />
        )}
      </div>

      {/* Trending chips — glass pills with hover glow */}
      {!touched && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-bold text-white/50">
            <TrendingUp className="h-3 w-3" />
            Trending
          </span>
          {TRENDING_QUERIES.map((q, i) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                setTouched(true);
              }}
              className="glass-card fade-in-stagger btn-press rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/80 transition-all duration-300 hover:text-[#f5c518] hover:glow"
              style={{ ["--i"]: i } as React.CSSProperties}
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

      {/* Empty state — creative illustration with gradient text */}
      {!loading && query.trim() && results.length === 0 && (
        <div className="glass-card grid place-items-center rounded-2xl py-16 text-center">
          <div className="float-y mb-3 grid h-16 w-16 place-items-center rounded-full brand-gradient-soft">
            <Sparkles className="h-7 w-7 text-[#f5c518]" />
          </div>
          <p className="gradient-text text-base font-black tracking-editorial">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/45">
            Try a different spelling, a shorter query, or browse the catalog
            instead.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="glass-card w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white/70">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          <CardGrid>
            {results.map((a) => (
              <AnimeCard key={a.malId} anime={a} />
            ))}
          </CardGrid>
        </>
      )}

      {/* Idle empty state — creative illustration */}
      {!loading && !query.trim() && (
        <div className="glass-card grid place-items-center rounded-2xl py-16 text-center">
          <div className="float-y mb-3 grid h-16 w-16 place-items-center rounded-full brand-gradient-soft pulse-glow">
            <Search className="h-7 w-7 text-[#f5c518]" />
          </div>
          <p className="gradient-text text-base font-black tracking-editorial">
            Find your next obsession
          </p>
          <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-white/45">
            Search across thousands of titles — by English name, Japanese name,
            or any keyword.
          </p>
        </div>
      )}
    </div>
  );
}
