"use client";

import React from "react";
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
  const isNew = badge === "NEW" || anime.isNew || anime.status === "Currently Airing";
  const isFeatured = badge === "FEATURED" || (anime as { isFeatured?: boolean }).isFeatured;
  const score = anime.score ?? 0;

  return (
    <button
      type="button"
      onClick={() => openAnime(anime.malId)}
      className={cn(
        "fade-in-stagger group relative flex flex-col gap-1.5 text-left focus:outline-none",
        "transition-transform duration-200 active:scale-[0.97]",
        className,
      )}
    >
      <div className="glass-card card-hover relative aspect-[2/3] w-full overflow-hidden rounded-xl">
        {anime.poster ? (
          <img
            src={anime.poster}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] font-medium text-white/30">
            No Image
          </div>
        )}

        {/* Bottom gradient for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Score badge — gold→orange gradient text on glass */}
        {score > 0 && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md border border-white/10 bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
            <Star className="h-2.5 w-2.5 fill-[#f5c518] text-[#f5c518]" />
            <span className="gradient-text">{score.toFixed(2)}</span>
          </div>
        )}

        {/* NEW badge — animated pulse glow */}
        {isNew && (
          <div className="brand-gradient-bg pulse-glow absolute left-1.5 top-1.5 rounded-md border border-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
            NEW
          </div>
        )}
        {isFeatured && !isNew && (
          <div className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-black/55 text-[10px] font-bold text-[#f5c518] backdrop-blur-md">
            ★
          </div>
        )}

        {/* Progress bar overlay — gradient fill */}
        {typeof progress === "number" && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="brand-gradient-bg h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {/* Type chip */}
        <div className="absolute bottom-1.5 left-1.5 rounded border border-white/10 bg-black/55 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">
          {anime.type}
        </div>
      </div>

      <div className="min-w-0 px-0.5">
        <p className="truncate text-xs font-semibold tracking-editorial text-white/95 transition-colors duration-200 group-hover:gradient-text">
          {main}
        </p>
        {sub && <p className="truncate text-[10px] font-medium text-white/45">{sub}</p>}
      </div>
    </button>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] w-full rounded-xl skeleton-shimmer" />
      <div className="h-3 w-3/4 rounded skeleton-shimmer" />
      <div className="h-2 w-1/2 rounded skeleton-shimmer" />
    </div>
  );
}

/**
 * CardGrid — applies a staggered entrance to each direct child by injecting
 * the `--i` custom property. Children that use the `fade-in-stagger` class
 * (e.g. AnimeCard) will then animate with an incremental delay.
 */
export function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children);
  return (
    <div
      className={cn("grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4", className)}
    >
      {items.map((child, i) => {
        if (!React.isValidElement(child)) {
          return (
            <div
              key={i}
              style={{ ["--i"]: i } as React.CSSProperties}
              className="fade-in-stagger"
            >
              {child}
            </div>
          );
        }
        const existingStyle = (
          child.props as { style?: React.CSSProperties }
        ).style;
        return React.cloneElement(child, {
          key: child.key ?? i,
          style: {
            ...(existingStyle ?? {}),
            ["--i"]: i,
          } as React.CSSProperties,
        });
      })}
    </div>
  );
}

/**
 * HistoryRow — used by LibraryView and other history surfaces.
 * Glass row with thumbnail, gradient progress bar, and tight editorial type.
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
      className="glass-card card-hover flex items-center gap-3 rounded-xl p-2 text-left"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#1a1a26]">
        {item.poster && (
          <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <PlayCircle className="h-7 w-7 text-white drop-shadow-lg" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold tracking-editorial text-white">{main}</p>
        {sub && <p className="truncate text-[10px] text-white/45">{sub}</p>}
        <p className="mt-0.5 text-[10px] font-medium text-white/45">
          Episode {item.episode} · {Math.round(pct)}% watched
        </p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="brand-gradient-bg h-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}
