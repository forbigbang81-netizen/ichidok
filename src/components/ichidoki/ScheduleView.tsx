"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { fetchSchedule } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { useApp } from "@/store/app";
import { cn } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton } from "./AnimeCard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_LABELS: Record<string, string> = {
  Sun: "Sundays",
  Mon: "Mondays",
  Tue: "Tuesdays",
  Wed: "Wednesdays",
  Thu: "Thursdays",
  Fri: "Fridays",
  Sat: "Saturdays",
};

export function ScheduleView() {
  const openAnime = useApp((s) => s.openAnime);
  const [schedule, setSchedule] = useState<Record<string, Anime[]>>({});
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
        setSchedule(s);
        // Auto-select the first day with anime if today is empty.
        if (!s[activeDay] || s[activeDay].length === 0) {
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

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <CalendarDays className="h-5 w-5 text-yellow-400" />
          Schedule
        </h1>
        <p className="text-xs text-white/50">
          Airing this season — tap a day to browse.
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
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
                "relative flex min-w-[3.25rem] flex-col items-center rounded-lg px-2 py-2 text-center transition",
                active
                  ? "bg-yellow-400 text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {d}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  active ? "text-black/70" : "text-white/40",
                )}
              >
                {count}
              </span>
              {isToday && (
                <span
                  className={cn(
                    "absolute -top-1 h-1.5 w-1.5 rounded-full",
                    active ? "bg-black" : "bg-yellow-400",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">
          {DAY_LABELS[activeDay]}
        </h2>
        <span className="text-[11px] text-white/40">
          {activeList.length} title{activeList.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="grid place-items-center py-12 text-center text-white/40">
          <CalendarDays className="mb-2 h-10 w-10 opacity-30" />
          <p className="text-sm">Nothing airing on this day.</p>
          <p className="mt-1 text-xs">Try another day of the week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
          {activeList.map((a) => (
            <AnimeCard key={a.malId} anime={a} />
          ))}
        </div>
      )}

      {/* Day-of-week preview list (compact) */}
      {!loading && Object.keys(schedule).length > 0 && (
        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/40">
            Week at a glance
          </p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => {
              const list = schedule[d] ?? [];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={cn(
                    "flex flex-col items-center rounded-md p-1.5 transition",
                    d === activeDay
                      ? "bg-yellow-400/20"
                      : "hover:bg-white/5",
                  )}
                >
                  <span className="text-[9px] font-bold uppercase text-white/60">
                    {d[0]}
                  </span>
                  <span className="text-[10px] font-semibold text-white/80">
                    {list.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
