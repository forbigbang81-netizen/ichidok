"use client";

import { useEffect } from "react";
import {
  Bell,
  Bookmark,
  Compass,
  Home as HomeIcon,
  Search,
} from "lucide-react";
import { useApp, type View } from "@/store/app";
import { fetchNotifications } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { HomeView } from "@/components/ichidoki/HomeView";
import { ScheduleView } from "@/components/ichidoki/ScheduleView";
import { SearchView } from "@/components/ichidoki/SearchView";
import { CatalogView } from "@/components/ichidoki/CatalogView";
import { LibraryView } from "@/components/ichidoki/LibraryView";
import { AnimeDetailView } from "@/components/ichidoki/AnimeDetailView";

export default function Home() {
  const {
    currentView,
    navigate,
    notifications,
    setNotifications,
    selectedMalId,
  } = useApp();

  // Load notification count for the badge.
  useEffect(() => {
    fetchNotifications()
      .then((n) => setNotifications(n as any))
      .catch(() => {});
  }, [setNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems: {
    view: View;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { view: "home", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
    { view: "schedule", label: "Schedule", icon: <Compass className="h-5 w-5" /> },
    { view: "search", label: "Search", icon: <Search className="h-6 w-6" /> },
    { view: "catalog", label: "Catalog", icon: <Bookmark className="h-5 w-5" /> },
    { view: "library", label: "Library", icon: <Bell className="h-5 w-5" /> },
  ];

  return (
    <div className="mobile-shell flex min-h-screen flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 flex items-center gap-2 glass-header px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="flex items-center gap-2"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-yellow-400 text-black">
            <span className="text-sm font-black">一</span>
          </span>
          <span className="text-sm font-black tracking-tight text-white">
            ICHIDOKI
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("library")}
          className="relative ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/80 hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-yellow-400 px-1 text-[9px] font-bold text-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Active view */}
      <main className="flex-1 pt-3">
        {currentView === "home" && <HomeView />}
        {currentView === "schedule" && <ScheduleView />}
        {currentView === "search" && <SearchView />}
        {currentView === "catalog" && <CatalogView />}
        {currentView === "library" && <LibraryView />}
        {currentView === "detail" && selectedMalId && <AnimeDetailView />}
      </main>

      {/* Bottom nav with center FAB */}
      <nav
        className="sticky bottom-0 z-30 glass-header"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative grid grid-cols-5 items-end px-2 pt-2 pb-2">
          {navItems.map((item) => {
            const active = currentView === item.view;
            const isFab = item.view === "search";
            if (isFab) {
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => navigate(item.view)}
                  className="flex flex-col items-center"
                  aria-label={item.label}
                >
                  <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-yellow-400 text-black shadow-lg shadow-yellow-500/30 transition hover:scale-105 hover:bg-yellow-300 pulse-yellow">
                    {item.icon}
                  </span>
                  <span className="-mt-2 text-[10px] font-semibold text-yellow-400">
                    {item.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => navigate(item.view)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg py-1 transition",
                  active ? "text-yellow-400" : "text-white/60 hover:text-white",
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
