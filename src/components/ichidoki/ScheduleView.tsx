"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { fetchSchedule } from "@/lib/api/client";
import type { Anime } from "@/store/app";
import { cn } from "@/lib/utils";
import { AnimeCard, AnimeCardSkeleton, CardGrid } from "./AnimeCard";

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
  const totalThisWeek = DAYS.reduce(
    (acc, d) => acc + (schedule[d]?.length ?? 0),
    0,
  );

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-6">
      {/* Section header — gradient text */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black tracking-editorial">
          <span className="gradient-text">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="gradient-text">Schedule</span>
        </h1>
        <p className="mt-0.5 text-xs text-white/50">
          {totalThisWeek > 0
            ? `${totalThisWeek} anime airing this week — tap a day.`
            : "Airing this season — tap a day to browse."}
        </p>
      </div>

      {/* Day selector — glass pills with gradient active state */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {DAYS.map((d, i) => {
          const count = schedule[d]?.length ?? 0;
          const active = d === activeDay;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDay(d)}
              className={cn(
                "fade-in-stagger btn-press relative flex min-w-[3.75rem] flex-col items-center rounded-xl px-2.5 py-2 text-center transition-all duration-300",
                active
                  ? "brand-gradient-bg text-black glow"
                  : "glass-card text-white/70 hover:text-white",
              )}
              style={{ ["--i"]: i } as React.CSSProperties}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">
                {d}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[12px] font-black",
                  active ? "text-black/75" : "text-white/45",
                )}
              >
                {count}
              </span>
              {isToday && !active && (
                <span className="brand-gradient-bg absolute -top-1 h-1.5 w-1.5 rounded-full" />
              )}
              {isToday && active && (
                <span className="absolute -top-1 h-1.5 w-1.5 rounded-full bg-black" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-editorial text-white">
          {DAY_LABELS[activeDay]}
        </h2>
        <span className="glass-card rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white/70">
          {activeList.length} title{activeList.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <CardGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </CardGrid>
      ) : activeList.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-2xl py-14 text-center">
          <div className="float-y mb-3 grid h-14 w-14 place-items-center rounded-2xl brand-gradient-soft">
            <CalendarDays className="h-6 w-6 text-[#f5c518]" />
          </div>
          <p className="gradient-text text-sm font-black tracking-editorial">
            Nothing airing today
          </p>
          <p className="mt-1 text-xs text-white/40">
            Try another day of the week.
          </p>
        </div>
      ) : (
        <CardGrid>
          {activeList.map((a) => (
            <AnimeCard key={a.malId} anime={a} />
          ))}
        </CardGrid>
      )}

      {/* Week at a glance — glass overview cards */}
      {!loading && Object.keys(schedule).length > 0 && (
        <div className="glass-card mt-4 rounded-2xl p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/50">
            <Clock className="h-3 w-3 text-[#f5c518]" />
            Week at a glance
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => {
              const list = schedule[d] ?? [];
              const isActive = d === activeDay;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={cn(
                    "btn-press relative flex flex-col items-center rounded-lg p-2 transition-all duration-300",
                    isActive
                      ? "brand-gradient-bg text-black"
                      : "brand-gradient-soft hover:bg-white/8",
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider",
                      isActive ? "text-black/80" : "text-white/60",
                    )}
                  >
                    {d[0]}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px] font-black",
                      isActive ? "text-black" : "gradient-text",
                    )}
                  >
                    {list.length}
                  </span>
                  {isToday && (
                    <span
                      className={cn(
                        "absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full",
                        isActive ? "bg-black" : "brand-gradient-bg",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
