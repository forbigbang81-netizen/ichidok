"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Calendar, TrendingUp, ChevronRight, Play, Search as SearchIcon, Bell } from "lucide-react";
import { useApp, type Anime } from "@/store/app";
import { apiCatalog, seedCatalog, fetchNotifications } from "@/lib/api/client";
import { splitTitle } from "@/lib/utils";

const TYPES = ["TV", "Movie", "Special", "OVA", "ONA"];

function GridCard({ anime, onClick, isNew }: { anime: Anime; onClick: () => void; isNew?: boolean }) {
  const { main, sub } = splitTitle(anime.title);
  return (
    <button onClick={onClick} className="text-left group">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1a22] ring-1 ring-white/5">
        <img src={anime.poster} alt={anime.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='112' height='160'><rect width='100%' height='100%' fill='%231a1a22'/></svg>"; }} />
        {isNew && <span className="absolute top-1.5 left-1.5 text-[9px] bg-[#f5c518] text-black px-1.5 py-0.5 rounded font-bold">NEW</span>}
        {anime.score > 0 && <span className="absolute top-1.5 right-1.5 text-[9px] bg-black/70 backdrop-blur-sm text-[#f5c518] px-1.5 py-0.5 rounded font-bold">★ {anime.score.toFixed(2)}</span>}
      </div>
      <p className="text-xs text-white font-semibold line-clamp-1 mt-1.5 tracking-tight">{main}</p>
      <p className="text-[10px] text-[#9a9aa8] line-clamp-1 mt-0.5">{sub || `${anime.type} • ${anime.year}`}</p>
    </button>
  );
}

function CardSkeleton() {
  return <div><div className="aspect-[2/3] rounded-lg shimmer" /><div className="h-3 w-24 mt-1.5 rounded shimmer" /><div className="h-2 w-16 mt-1 rounded shimmer" /></div>;
}

function SectionHeader({ title, icon, onMore }: { title: string; icon: React.ReactNode; onMore?: () => void }) {
  return (
    <div className="px-4 mb-2.5 flex items-center justify-between">
      <h3 className="text-[15px] font-bold text-white flex items-center gap-1.5 tracking-tight"><span className="text-[#f5c518]">{icon}</span>{title}</h3>
      {onMore && <button onClick={onMore} className="text-[11px] text-[#f5c518] font-medium flex items-center gap-0.5 hover:gap-1 transition-all">More <ChevronRight className="w-3 h-3" /></button>}
    </div>
  );
}

export function HomeView({ onOpenSearch }: { onOpenSearch: () => void }) {
  const openAnime = useApp((s) => s.openAnime);
  const navigate = useApp((s) => s.navigate);
  const history = useApp((s) => s.history);
  const [activeType, setActiveType] = useState("TV");
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [top, setTop] = useState<Anime[]>([]);
  const [season, setSeason] = useState<Anime[]>([]);
  const [all, setAll] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!sessionStorage.getItem("ichidoki-seeded")) { sessionStorage.setItem("ichidoki-seeded", "1"); seedCatalog().catch(() => {}); }
      try {
        const [topRes, seasonRes, allRes] = await Promise.all([
          apiCatalog.top(25).catch(() => ({ results: [] as Anime[] })),
          apiCatalog.season(25).catch(() => ({ results: [] as Anime[] })),
          apiCatalog.all(50).catch(() => ({ results: [] as Anime[] })),
        ]);
        if (cancelled) return;
        setTop(topRes.results);
        setSeason(seasonRes.results);
        setAll(allRes.results);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const upcoming = all.filter((a) => a.status === "Not yet aired");
  const upcomingIds = new Set(upcoming.map((a) => a.malId));
  const featured = (top.length > 0 ? top : all).filter(a => a.isFeatured || a.score > 8).slice(0, 5);
  const currentFeatured = featured[featuredIdx] ?? featured[0];

  useEffect(() => {
    if (featured.length <= 1) return;
    carouselTimer.current = setInterval(() => setFeaturedIdx((i) => (i + 1) % featured.length), 7000);
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current); };
  }, [featured.length]);

  const filteredTop = top.filter((a) => !upcomingIds.has(a.malId) && a.type === activeType);
  const filteredSeason = season.filter((a) => !upcomingIds.has(a.malId) && a.type === activeType);

  const continueWatching = history.slice(0, 4).map((h) => ({
    anime: { malId: h.malId, id: String(h.malId), title: h.title, poster: h.poster ?? "", banner: h.poster ?? "", type: h.type, score: 0, genres: [], studios: [], episodeCount: 0, synopsis: "", year: undefined, isNew: false } as Anime,
    episode: h.episode, progress: h.progress,
  }));

  return (
    <div className="fade-in pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-header border-b border-white/5">
        <div className="px-4 py-2 flex items-center gap-2">
          <video src="/logo-animation.mp4" autoPlay loop muted playsInline className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-md shadow-[#f5c518]/20" />
          <button onClick={onOpenSearch} className="flex-1 flex items-center gap-2 bg-[#1a1a22] border border-[#2a2a35] rounded-full px-4 py-2 text-sm text-[#6b6b7b] hover:border-[#3a3a47] hover:bg-[#22222c] transition-all text-left">
            <SearchIcon className="w-3.5 h-3.5" /><span className="truncate">Search anime...</span>
          </button>
          <button onClick={async () => { const ns = await fetchNotifications().catch(() => []); if (ns.length > 0) import("sonner").then(({ toast }) => toast.message(ns[0].title, { description: ns[0].body })); }}
            className="w-9 h-9 rounded-full bg-[#1a1a22] border border-[#2a2a35] flex items-center justify-center text-[#9a9aa8] hover:border-[#3a3a47] hover:text-[#f5c518] transition-all relative shrink-0" aria-label="Notifications">
            <Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#f5c518] rounded-full" />
          </button>
        </div>
      </header>

      {/* Type tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-5 overflow-x-auto no-scrollbar">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`text-sm font-semibold whitespace-nowrap pb-2 transition-colors relative tracking-tight ${activeType === t ? "text-[#f5c518]" : "text-[#6b6b7b] hover:text-[#9a9aa8]"}`}>
            {t}{activeType === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#f5c518] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Featured carousel */}
      <div className="px-4 mb-4">
        {loading ? <div className="w-full aspect-[16/9] rounded-2xl shimmer" /> : currentFeatured ? (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#1a1a22] ring-1 ring-white/5">
            <img key={currentFeatured.malId} src={currentFeatured.banner || currentFeatured.poster} alt={currentFeatured.title} className="w-full h-full object-cover fade-in"
              onError={(e) => { (e.target as HTMLImageElement).src = currentFeatured.poster; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            <button onClick={() => openAnime(currentFeatured.malId)} className="absolute inset-0 flex items-center justify-center group" aria-label="Play featured">
              <div className="w-14 h-14 rounded-full bg-[#f5c518] flex items-center justify-center shadow-2xl shadow-black/50 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black fill-black ml-0.5" />
              </div>
            </button>
            <div className="absolute bottom-4 left-4 right-16">
              <div className="flex items-center gap-2 mb-2">
                <span className="premium-badge text-[10px] px-2 py-0.5 rounded">FEATURED</span>
                <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-medium">{currentFeatured.type}</span>
                {currentFeatured.score > 0 && <span className="bg-[#f5c518]/15 backdrop-blur-sm text-[#f5c518] text-[10px] px-2 py-0.5 rounded font-bold">★ {currentFeatured.score.toFixed(2)}</span>}
              </div>
              <h2 className="text-lg font-bold text-white line-clamp-1 text-glow">{currentFeatured.title}</h2>
              <p className="text-[11px] text-[#c4c4d0] line-clamp-2 mt-1 leading-relaxed">{currentFeatured.synopsis}</p>
            </div>
            <div className="absolute top-3 right-3 flex gap-1.5">
              {featured.map((_, i) => <button key={i} onClick={() => setFeaturedIdx(i)} className={`h-1.5 rounded-full transition-all ${i === featuredIdx ? "w-5 bg-[#f5c518]" : "w-1.5 bg-white/50"}`} aria-label={`Featured ${i + 1}`} />)}
            </div>
          </div>
        ) : null}
      </div>

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Continue watching" icon={<Play className="w-3.5 h-3.5" />} onMore={() => navigate("library")} />
          <div className="pl-4 flex gap-3 overflow-x-auto no-scrollbar pr-4">
            {continueWatching.map((c, i) => (
              <button key={`${c.anime.malId}-${c.episode}-${i}`} onClick={() => openAnime(c.anime.malId, c.episode)} className="shrink-0 w-44 text-left">
                <div className="relative w-44 h-24 rounded-lg overflow-hidden bg-[#1a1a22] ring-1 ring-white/5">
                  <img src={c.anime.poster} alt={c.anime.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Play className="w-8 h-8 text-white fill-white drop-shadow-lg" /></div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60"><div className="h-full bg-[#f5c518]" style={{ width: `${c.progress}%` }} /></div>
                </div>
                <p className="text-xs text-white font-semibold line-clamp-1 mt-1.5 text-glow">{c.anime.title}</p>
                <p className="text-[10px] text-[#f5c518] font-medium mt-0.5">Episode {c.episode}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* This Season */}
      {filteredSeason.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="This season" icon={<Calendar className="w-3.5 h-3.5" />} onMore={() => navigate("catalog")} />
          <div className="px-4 grid grid-cols-3 gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />) : filteredSeason.map((a) => <GridCard key={a.malId} anime={a} isNew={a.isNew} onClick={() => openAnime(a.malId)} />)}
          </div>
        </section>
      )}

      {/* Top Rated */}
      <section className="mb-6">
        <SectionHeader title="Top rated" icon={<TrendingUp className="w-3.5 h-3.5" />} onMore={() => navigate("catalog")} />
        <div className="px-4 grid grid-cols-3 gap-3">
          {loading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : filteredTop.length > 0 ? filteredTop.map((a) => <GridCard key={a.malId} anime={a} isNew={a.isNew} onClick={() => openAnime(a.malId)} />) : null}
        </div>
        {!loading && filteredTop.length === 0 && <p className="text-xs text-[#6b6b7b] px-4 py-4">No {activeType} anime found.</p>}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Upcoming" icon={<Flame className="w-3.5 h-3.5" />} onMore={() => navigate("catalog")} />
          <div className="px-4 grid grid-cols-3 gap-3">
            {upcoming.map((a) => <GridCard key={a.malId} anime={a} isNew={true} onClick={() => openAnime(a.malId)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
