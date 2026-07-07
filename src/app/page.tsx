"use client";

import { useEffect, useRef, useState } from "react";
import {
  House,
  Calendar,
  Search,
  LayoutGrid,
  FolderOpen,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { fetchHistory, fetchNotifications } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { HomeView } from "@/components/ichidoki/HomeView";
import { ScheduleView } from "@/components/ichidoki/ScheduleView";
import { SearchView } from "@/components/ichidoki/SearchView";
import { CatalogView } from "@/components/ichidoki/CatalogView";
import { LibraryView } from "@/components/ichidoki/LibraryView";
import { AnimeDetailView } from "@/components/ichidoki/AnimeDetailView";

const TYPES = ["TV", "Movie", "Special", "OVA", "ONA"];

export default function Page() {
  const currentView = useApp((s) => s.currentView);
  const navigate = useApp((s) => s.navigate);
  const selectedMalId = useApp((s) => s.selectedMalId);
  const selectedEpisode = useApp((s) => s.selectedEpisode);
  const notifications = useApp((s) => s.notifications);
  const setNotifications = useApp((s) => s.setNotifications);
  const setHistory = useApp((s) => s.setHistory);

  const [activeType, setActiveType] = useState("TV");

  // Load notifications + history on app mount. History must be loaded
  // server-side so "Continue Watching" on the homepage reflects everything
  // the user has ever watched, even after app updates / redeploys.
  useEffect(() => {
    fetchNotifications()
      .then((n) => setNotifications(n as typeof notifications))
      .catch(() => {});
    fetchHistory()
      .then((hist) => setHistory(hist as any[]))
      .catch(() => {});
  }, [setNotifications, setHistory]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView, selectedMalId, selectedEpisode]);

  const isDetail = currentView === "detail";
  const showHomeChrome = currentView === "home";
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mobile-shell fade-in flex min-h-screen flex-col">
      {/* Header — home only. Solid black, no glass. */}
      {showHomeChrome && (
        <header className="sticky top-0 z-30 bg-black pt-safe">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg font-bold tracking-tight text-white">
              ichidoki
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate("search")}
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors active:bg-white/10"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ns = await fetchNotifications().catch(() => []);
                  if (ns.length > 0) {
                    toast.message(ns[0].title, { description: ns[0].body });
                  } else {
                    toast.message("You're all caught up", {
                      description: "No new notifications right now.",
                    });
                  }
                }}
                className="relative grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors active:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f5c518]" />
                )}
              </button>
            </div>
          </div>

          {/* Type tabs — simple text tabs with underline indicator */}
          <TypeTabs types={TYPES} active={activeType} onChange={setActiveType} />
        </header>
      )}

      {/* Views */}
      <main className="flex-1 pb-20">
        <div key={currentView} className="fade-in">
          {currentView === "home" && <HomeView activeType={activeType} />}
          {currentView === "search" && <SearchView />}
          {currentView === "catalog" && <CatalogView />}
          {currentView === "library" && <LibraryView />}
          {currentView === "schedule" && <ScheduleView />}
          {currentView === "detail" && <AnimeDetailView />}
        </div>
      </main>

      {/* Bottom nav — solid black, icon-only, gold active state */}
      {!isDetail && (
        <nav className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-white/5 bg-black">
          <div className="grid h-16 grid-cols-5">
            <NavBtn
              active={currentView === "home"}
              onClick={() => navigate("home")}
              icon={<House className="h-5 w-5" />}
              label="Home"
            />
            <NavBtn
              active={currentView === "schedule"}
              onClick={() => navigate("schedule")}
              icon={<Calendar className="h-5 w-5" />}
              label="Schedule"
            />
            <NavBtn
              active={currentView === "search"}
              onClick={() => navigate("search")}
              icon={<Search className="h-5 w-5" />}
              label="Search"
            />
            <NavBtn
              active={currentView === "catalog"}
              onClick={() => navigate("catalog")}
              icon={<LayoutGrid className="h-5 w-5" />}
              label="Catalog"
            />
            <NavBtn
              active={currentView === "library"}
              onClick={() => navigate("library")}
              icon={<FolderOpen className="h-5 w-5" />}
              label="Library"
            />
          </div>
        </nav>
      )}
    </div>
  );
}

function TypeTabs({
  types,
  active,
  onChange,
}: {
  types: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = types.indexOf(active);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active, types]);

  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto px-4 pb-2">
      {types.map((t, i) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "relative whitespace-nowrap py-1.5 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-white/40",
            )}
          >
            {t}
          </button>
        );
      })}
      <span
        className="absolute bottom-2 h-0.5 rounded-full bg-[#f5c518] transition-all duration-200 ease-out"
        style={{ left: indicator.left + 16, width: indicator.width }}
      />
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center transition-colors",
        active ? "text-[#f5c518]" : "text-white/40",
      )}
    >
      {icon}
    </button>
  );
}
