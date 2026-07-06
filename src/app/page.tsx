"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { fetchNotifications } from "@/lib/api/client";
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

  const [activeType, setActiveType] = useState("TV");

  useEffect(() => {
    fetchNotifications()
      .then((n) => setNotifications(n as typeof notifications))
      .catch(() => {});
  }, [setNotifications]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView, selectedMalId, selectedEpisode]);

  const isDetail = currentView === "detail";
  const showHomeChrome = currentView === "home";
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mobile-shell fade-in flex min-h-screen flex-col">
      {/* Header — home experience only */}
      {showHomeChrome && (
        <header className="glass-header sticky top-0 z-30">
          <div className="flex items-center gap-2 px-4 py-2.5 pt-safe">
            <video
              src="/logo-animation.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-[#f5c518]/20"
            />
            <button
              type="button"
              onClick={() => navigate("search")}
              className="glass-card group flex flex-1 items-center gap-2 rounded-full px-4 py-2 text-left text-sm text-white/45 transition-all duration-300 hover:border-[#f5c518]/30"
            >
              <Search className="h-3.5 w-3.5 text-[#f5c518]/80" />
              <span className="truncate tracking-editorial">Search anime…</span>
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
              className="glass-card relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 transition-all duration-300 hover:text-[#f5c518]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {hasUnread && (
                <span className="pulse-ring absolute right-1.5 top-1.5 h-2 w-2 rounded-full brand-gradient-bg" />
              )}
            </button>
          </div>

          {/* Pill type tabs with sliding indicator */}
          <PillTabs
            types={TYPES}
            active={activeType}
            onChange={setActiveType}
          />
        </header>
      )}

      {/* Views — keyed wrapper triggers fade-in transition on switch */}
      <main className="flex-1 pb-24">
        <div key={currentView} className="fade-in">
          {currentView === "home" && <HomeView activeType={activeType} />}
          {currentView === "search" && <SearchView />}
          {currentView === "catalog" && <CatalogView />}
          {currentView === "library" && <LibraryView />}
          {currentView === "schedule" && <ScheduleView />}
          {currentView === "detail" && <AnimeDetailView />}
        </div>
      </main>

      {/* Bottom nav — glass with animated FAB */}
      {!isDetail && (
        <nav className="glass-nav pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2">
          <div className="grid h-16 grid-cols-5 px-2">
            <NavBtn
              active={currentView === "home"}
              onClick={() => navigate("home")}
              icon={<House className="h-[18px] w-[18px]" />}
              label="Home"
            />
            <NavBtn
              active={currentView === "schedule"}
              onClick={() => navigate("schedule")}
              icon={<Calendar className="h-[18px] w-[18px]" />}
              label="Schedule"
            />
            <SearchFab onClick={() => navigate("search")} />
            <NavBtn
              active={currentView === "catalog"}
              onClick={() => navigate("catalog")}
              icon={<LayoutGrid className="h-[18px] w-[18px]" />}
              label="Catalog"
            />
            <NavBtn
              active={currentView === "library"}
              onClick={() => navigate("library")}
              icon={<FolderOpen className="h-[18px] w-[18px]" />}
              label="Library"
            />
          </div>
        </nav>
      )}
    </div>
  );
}

function PillTabs({
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

  useLayoutEffect(() => {
    const idx = types.indexOf(active);
    const el = tabRefs.current[idx];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active, types]);

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5 pt-2">
      <div className="glass-card relative flex gap-1 rounded-full p-1">
        {/* Sliding gradient indicator */}
        <span
          className="brand-gradient-bg absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
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
                "relative z-10 whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-bold tracking-editorial transition-colors duration-300",
                isActive
                  ? "text-black"
                  : "text-white/55 hover:text-white/85",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
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
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-300",
        active ? "text-white" : "text-white/40 hover:text-white/70",
      )}
    >
      <div
        className={cn(
          "grid h-7 w-9 place-items-center rounded-lg transition-all duration-300",
          active && "brand-gradient-soft glow",
        )}
      >
        <span className={cn(active && "gradient-text")}>{icon}</span>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold tracking-editorial",
          active && "gradient-text",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function SearchFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5"
      aria-label="Search"
    >
      <div className="float-y brand-gradient-bg pulse-glow absolute -top-5 grid h-12 w-12 place-items-center rounded-full shadow-2xl shadow-[#ff8a00]/40 ring-4 ring-[#0a0a0f] transition-transform duration-300 hover:scale-105">
        <Search className="h-5 w-5 text-black" />
      </div>
      <span className="mt-7 text-[9px] font-bold tracking-editorial text-white/40">
        Search
      </span>
    </button>
  );
}
