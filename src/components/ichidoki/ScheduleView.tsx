"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useApp, type Anime } from "@/store/app";
import { fetchSchedule, type ScheduleDay } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AnimeCard, CardGrid } from "./AnimeCard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_LABELS: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

interface ScheduleItem {
  anime: Anime;
  time: string;
}

export function ScheduleView() {
  const [schedule, setSchedule] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>(() => {
    const d = new Date().getDay();
    return DAYS[d];
  });

  useEffect(() => {
    let cancelled = false;
    fetchSchedule()
      .then((s) => {
        if (cancelled) return;
        setSchedule(s as Record<string, ScheduleItem[]>);
        if (!s[activeDay] || s[activeDay]?.length === 0) {
          const firstWithAnime = DAYS.find((d) => (s[d]?.length ?? 0) > 0);
          if (firstWithAnime) setActiveDay(firstWithAnime);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = DAYS[new Date().getDay()];
  const activeList = schedule[activeDay] ?? [];
  const totalThisWeek = DAYS.reduce(
    (acc, d) => acc + (schedule[d]?.length ?? 0),
    0,
  );

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <CalendarDays className="h-5 w-5" />
          Schedule
        </h1>
        <p className="mt-0.5 text-xs text-white/40">
          {totalThisWeek > 0
            ? `${totalThisWeek} anime airing this week — tap a day.`
            : "Airing this season — tap a day to browse."}
        </p>
      </div>

      {/* Day selector */}
      <div className="no-scrollbar flex gap-5 overflow-x-auto border-b border-white/10 pb-2">
        {DAYS.map((d) => {
          const count = schedule[d]?.length ?? 0;
          const active = d === activeDay;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDay(d)}
              className={cn(
                "relative whitespace-nowrap py-1.5 text-sm font-medium transition-colors",
                active ? "text-white" : "text-white/40",
              )}
            >
              {d}
              {count > 0 && (
                <span className="ml-1 text-[10px] text-white/30">{count}</span>
              )}
              {active && (
                <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-[#f5c518]" />
              )}
              {isToday && !active && (
                <span className="absolute -top-1 right-0 h-1.5 w-1.5 rounded-full bg-[#f5c518]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          {DAY_LABELS[activeDay]}
        </h2>
        <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[11px] font-medium text-white/60">
          {activeList.length} title{activeList.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <CardGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="aspect-[2/3] w-full rounded-lg skeleton-shimmer" />
              <div className="mt-1 h-3 w-24 rounded skeleton-shimmer" />
            </div>
          ))}
        </CardGrid>
      ) : activeList.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/70">
            Nothing airing today
          </p>
          <p className="mt-1 text-xs text-white/40">
            Try another day of the week.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeList.map((item) => (
            <div key={item.anime.malId} className="flex items-center gap-3">
              {/* JST time badge */}
              <div className="w-20 shrink-0 text-right">
                <span className="rounded-md bg-[#f5c518]/10 px-2 py-1 text-[11px] font-bold text-[#f5c518]">
                  {item.time}
                </span>
              </div>
              {/* Anime card */}
              <div className="flex-1">
                <AnimeCard anime={item.anime} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
