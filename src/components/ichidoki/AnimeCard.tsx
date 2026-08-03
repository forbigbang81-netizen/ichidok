"use client";

import React from "react";
import Image from "next/image";
import { Star, PlayCircle } from "lucide-react";
import type { Anime, HistoryItem } from "@/store/app";
import { useApp } from "@/store/app";
import { cn, splitTitle } from "@/lib/utils";

interface AnimeCardProps {
  anime: Anime;
  className?: string;
  badge?: "NEW" | "FEATURED" | null;
  progress?: number; // 0-100 history progress bar
}

export function AnimeCard({ anime, className, badge, progress }: AnimeCardProps) {
  const openAnime = useApp((s) => s.openAnime);
  const { main, sub } = splitTitle(anime.title);
  const isNew = badge === "NEW" || anime.isNew;
  const score = anime.score ?? 0;

  // Check if poster is a local path (starts with /) or external URL
  const isLocal = anime.poster?.startsWith("/");
  const posterUrl = anime.poster || "";

  return (
    <button
      type="button"
      onClick={() => openAnime(anime.malId)}
      className={cn(
        "group flex flex-col gap-1.5 text-left",
        "transition-transform duration-150 active:scale-[0.97]",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-[#111111] ring-1 ring-white/5 transition-all duration-200 group-hover:ring-[#f5c518]/30">
        {posterUrl ? (
          isLocal ? (
            <Image
              src={posterUrl}
              alt={anime.title}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1280px) 20vw, 16vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <img
              src={posterUrl}
              alt={anime.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] font-medium text-white/30">
            No Image
          </div>
        )}

        {/* Subtle bottom gradient overlay — always visible for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Score badge — small, top-right, gold text on semi-transparent black */}
        {score > 0 && (
          <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-[#f5c518] text-[#f5c518]" />
            <span className="text-[#f5c518]">{score.toFixed(2)}</span>
          </div>
        )}

        {/* NEW badge — simple white text */}
        {isNew && (
          <div className="absolute left-1 top-1 rounded bg-[#f5c518] px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black shadow-lg">
            NEW
          </div>
        )}

        {/* Hover play indicator */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md">
            <PlayCircle className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Progress bar overlay */}
        {typeof progress === "number" && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-[#f5c518] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      <p className="line-clamp-1 text-xs font-medium text-white transition-colors group-hover:text-[#f5c518]">{main}</p>
      {sub && <p className="line-clamp-1 text-[10px] text-white/40">{sub}</p>}
    </button>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] w-full rounded-lg skeleton-shimmer" />
      <div className="h-3 w-3/4 rounded skeleton-shimmer" />
      <div className="h-2 w-1/2 rounded skeleton-shimmer" />
    </div>
  );
}

/**
 * CardGrid — simple grid layout, no staggered animations.
 */
export function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 xl:gap-4", className)}>
      {children}
    </div>
  );
}

/**
 * HistoryRow — used by LibraryView and other history surfaces.
 * Solid dark thumbnail + simple progress bar.
 */
export function HistoryRow({
  item,
  onClick,
}: {
  item: HistoryItem;
  onClick: () => void;
}) {
  const { main, sub } = splitTitle(item.title);
  const pct = Math.min(100, Math.max(0, item.progress ?? 0));
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors active:bg-white/5"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-[#111111]">
        {item.poster && (
          <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <PlayCircle className="h-7 w-7 text-white" />
        </div>
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-[#f5c518]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-xs font-medium text-white">{main}</p>
        {sub && <p className="line-clamp-1 text-[10px] text-white/40">{sub}</p>}
        <p className="mt-0.5 text-[10px] text-white/40">
          Episode {item.episode} · {Math.round(pct)}% watched
        </p>
      </div>
    </button>
  );
}
