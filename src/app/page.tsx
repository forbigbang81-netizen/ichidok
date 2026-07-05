"use client";

import { useEffect } from "react";
import {
  House,
  Calendar,
  Search,
  LayoutGrid,
  FolderOpen,
  Bell,
} from "lucide-react";
import { useApp } from "@/store/app";
import { fetchNotifications } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { HomeView } from "@/components/ichidoki/HomeView";
import { ScheduleView } from "@/components/ichidoki/ScheduleView";
import { SearchView } from "@/components/ichidoki/SearchView";
import { CatalogView } from "@/components/ichidoki/CatalogView";
import { LibraryView } from "@/components/ichidoki/LibraryView";
import { AnimeDetailView } from "@/components/ichidoki/AnimeDetailView";

export default function Page() {
  const currentView = useApp((s) => s.currentView);
  const navigate = useApp((s) => s.navigate);
  const selectedMalId = useApp((s) => s.selectedMalId);
  const selectedEpisode = useApp((s) => s.selectedEpisode);
  const notifications = useApp((s) => s.notifications);
  const setNotifications = useApp((s) => s.setNotifications);

  useEffect(() => {
    fetchNotifications().then((n) => setNotifications(n as any)).catch(() => {});
  }, [setNotifications]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView, selectedMalId, selectedEpisode]);

  const isDetail = currentView === "detail";

  return (
    <div className="mobile-shell min-h-screen flex flex-col bg-[#0b0b0f]">
      <main className="flex-1 pb-20">
        {currentView === "home" && <HomeView onOpenSearch={() => navigate("search")} />}
        {currentView === "search" && <SearchView />}
        {currentView === "catalog" && <CatalogView />}
        {currentView === "library" && <LibraryView />}
        {currentView === "schedule" && <ScheduleView />}
        {currentView === "detail" && <AnimeDetailView />}
      </main>

      {!isDetail && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] bg-[#0b0b0f]/95 backdrop-blur-lg border-t border-[#2a2a35]">
          <div className="grid grid-cols-5 h-16 px-2">
            <NavBtn active={currentView === "home"} onClick={() => navigate("home")} icon={<House className="w-[18px] h-[18px]" />} label="Home" />
            <NavBtn active={currentView === "schedule"} onClick={() => navigate("schedule")} icon={<Calendar className="w-[18px] h-[18px]" />} label="Schedule" />
            <SearchFab onClick={() => navigate("search")} />
            <NavBtn active={currentView === "catalog"} onClick={() => navigate("catalog")} icon={<LayoutGrid className="w-[18px] h-[18px]" />} label="Catalog" />
            <NavBtn active={currentView === "library"} onClick={() => navigate("library")} icon={<FolderOpen className="w-[18px] h-[18px]" />} label="Library" />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-0.5 transition-colors py-1 ${active ? "text-[#f5c518]" : "text-[#6b6b7b] hover:text-[#9a9aa8]"}`}>
      <div className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${active ? "bg-[#f5c518]/15" : ""}`}>{icon}</div>
      <span className="text-[10px] tracking-tight font-semibold">{label}</span>
    </button>
  );
}

function SearchFab({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Search">
      <div className="absolute -top-4 w-12 h-12 rounded-full h-yellow-gradient flex items-center justify-center shadow-lg shadow-[#f5c518]/30 ring-4 ring-[#0b0b0f] hover:scale-105 transition-transform pulse-yellow">
        <Search className="w-5 h-5 text-black" />
      </div>
      <span className="text-[9px] text-[#6b6b7b] font-medium mt-7">Search</span>
    </button>
  );
}
