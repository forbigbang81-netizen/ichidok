"use client";

import { Star } from "lucide-react";
import type { Anime } from "@/store/app";
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
        "group relative flex flex-col gap-1.5 text-left focus:outline-none",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#1a1a22] ring-1 ring-white/5 transition group-hover:ring-yellow-400/60">
        {anime.poster ? (
          <img
            src={anime.poster}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-white/30">
            No Image
          </div>
        )}

        {/* Score badge */}
        {score > 0 && (
          <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-yellow-400" />
            {score.toFixed(2)}
          </div>
        )}

        {/* NEW badge (yellow) */}
        {isNew && (
          <div className="absolute left-1 top-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-black">
            NEW
          </div>
        )}
        {isFeatured && !isNew && (
          <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-yellow-400 backdrop-blur-sm">
            ★
          </div>
        )}

        {/* Progress bar overlay */}
        {typeof progress === "number" && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <div
              className="h-full bg-yellow-400"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {/* Type chip */}
        <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
          {anime.type}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white/95 group-hover:text-yellow-400">
          {main}
        </p>
        {sub && (
          <p className="truncate text-[10px] text-white/50">{sub}</p>
        )}
      </div>
    </button>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] w-full rounded-md shimmer" />
      <div className="h-3 w-3/4 rounded shimmer" />
      <div className="h-2 w-1/2 rounded shimmer" />
    </div>
  );
}

export function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
