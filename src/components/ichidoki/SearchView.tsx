"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Sparkles, TrendingUp, ChevronRight, Film } from "lucide-react";
import { searchAnime } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { useApp } from "@/store/app";
import { cn } from "@/lib/utils";

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openAnime, navigate } = useApp();

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
    setExpandedSection(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchAnime(query, 100);
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

  // Categorize results
  const topResults = results.slice(0, 3);
  const seriesResults = results.filter((a) => a.type === "TV" || a.type === "ONA");
  const movieResults = results.filter((a) => a.type === "Movie");
  const otherResults = results.filter((a) => !["TV", "ONA", "Movie"].includes(a.type));

  // When a section is expanded, show all results in that category
  const showAllSeries = expandedSection === "series";
  const showAllMovies = expandedSection === "movies";
  const showAllTop = expandedSection === "top";

  const seriesToShow = showAllSeries ? seriesResults : seriesResults.slice(0, 3);
  const moviesToShow = showAllMovies ? movieResults : movieResults.slice(0, 3);
  const topToShow = showAllTop ? results : topResults;

  // Render a horizontal search result card (Crunchyroll-style)
  const renderSearchCard = (a: Anime) => (
    <button
      key={a.malId}
      type="button"
      onClick={() => openAnime(a.malId)}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors active:bg-white/5"
    >
      {/* Thumbnail on left — 16:9 aspect, small */}
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-[#111111]">
        <img
          src={a.poster}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      {/* Text info on right */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">
          {a.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-white/40">
          {a.episodeCount > 0 ? `${a.episodeCount} episodes` : ""}
          {a.year ? ` · ${a.year}` : ""}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[#f5c518]/80">
            {a.type}
          </span>
          {a.hasSub && a.hasDub && (
            <span className="text-[10px] text-white/40">· Dub | Sub</span>
          )}
          {a.hasSub && !a.hasDub && (
            <span className="text-[10px] text-white/40">· Sub</span>
          )}
          {a.hasDub && !a.hasSub && (
            <span className="text-[10px] text-white/40">· Dub</span>
          )}
        </div>
      </div>
    </button>
  );

  // Section header with optional "See All" button
  const renderSectionHeader = (title: string, count: number, sectionKey: string) => (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {count > 3 && (
        <button
          type="button"
          onClick={() => {
            setExpandedSection(expandedSection === sectionKey ? null : sectionKey);
          }}
          className="flex items-center gap-0.5 text-[11px] font-bold text-[#f5c518] transition-colors active:text-[#e6b016]"
        >
          {expandedSection === sectionKey ? "Show Less" : "See All"}
          <ChevronRight className={cn("h-3 w-3 transition-transform", expandedSection === sectionKey && "rotate-90")} />
        </button>
      )}
    </div>
  );

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Search bar — Crunchyroll-style: back arrow + input + clear */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors active:bg-white/10"
          aria-label="Back"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[#111111] px-4 py-2.5">
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

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2">
              <div className="h-14 w-24 shrink-0 rounded-md skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
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

      {/* Results — Crunchyroll-style categorized sections */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-5">
          {/* Top Results section */}
          {topToShow.length > 0 && (
            <div className="flex flex-col gap-2">
              {renderSectionHeader("Top Results", results.length, "top")}
              <div className="flex flex-col gap-1">
                {topToShow.map(renderSearchCard)}
              </div>
            </div>
          )}

          {/* Series section */}
          {seriesResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {renderSectionHeader("Series", seriesResults.length, "series")}
              <div className="flex flex-col gap-1">
                {seriesToShow.map(renderSearchCard)}
              </div>
            </div>
          )}

          {/* Movies section */}
          {movieResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {renderSectionHeader("Movies", movieResults.length, "movies")}
              <div className="flex flex-col gap-1">
                {moviesToShow.map(renderSearchCard)}
              </div>
            </div>
          )}

          {/* Other (OVA, Special, etc.) */}
          {otherResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {renderSectionHeader("Other", otherResults.length, "other")}
              <div className="flex flex-col gap-1">
                {(expandedSection === "other" ? otherResults : otherResults.slice(0, 3)).map(renderSearchCard)}
              </div>
            </div>
          )}
        </div>
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
