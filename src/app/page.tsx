"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Home, LayoutGrid, Clock, Search, Heart, Share2, Info, Play,
  ChevronLeft, Star, SkipForward, History, FastForward, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEpisodeCount, getEmbedUrl, hasDub,
  getIntroTimes, setIntroEndOverride,
  getWatchHistory, saveWatchProgress, removeWatchHistory,
  setAiringCache,
  type WatchHistoryEntry,
} from "@/lib/video-sources";

// ============================================================================
// Types
// ============================================================================
interface Anime {
  id: number; malId: number | null; title: string; titleEnglish: string | null;
  poster: string; banner: string; synopsis: string; score: string | null;
  popularity: number; episodeCount: number; type: string; status: string;
  year: number | null; season: string | null; genres: string[];
  studios: string[]; duration: string | null;
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
}
interface AnimeDetail extends Anime {
  seasons: { id: number; title: string; poster: string; relation: string; type: string }[];
  recommendations: { id: number; title: string; poster: string; score: string | null; episodes: number; type: string }[];
}
interface SkipTime {
  type: string;
  start: number;
  end: number;
  episodeLength?: number;
}
type View = "home" | "detail" | "episodes" | "player" | "genres" | "latest" | "search" | "mylist" | "schedule";

// ============================================================================
// Fetchers
// ============================================================================
async function fetchSection(section: string, perPage = 30): Promise<Anime[]> {
  const r = await fetch(`/api/anilist?section=${section}&perPage=${perPage}`);
  if (!r.ok) return [];
  const d = await r.json();
  return d.results || [];
}
async function fetchDetail(id: number): Promise<AnimeDetail | null> {
  const r = await fetch(`/api/anilist-detail?id=${id}`);
  if (!r.ok) return null;
  return r.json();
}
async function fetchZokoSource(malId: number, episode: number, audio: "sub" | "dub") {
  const r = await fetch(`/api/zoko-source?malId=${malId}&episode=${episode}&audio=${audio}`);
  if (!r.ok) return null;
  const data = await r.json();
  // Rewrite URLs to go through our CORS proxy
  if (data?.src) {
    data.src = `/api/hls-proxy?url=${encodeURIComponent(data.src)}`;
  }
  if (data?.subtitles?.length) {
    data.subtitles = data.subtitles.map((s: any) => ({
      ...s,
      src: `/api/hls-proxy?url=${encodeURIComponent(s.src)}`,
    }));
  }
  return data;
}
async function fetchSkipTimes(malId: number, episode: number, episodeLength: number): Promise<SkipTime[]> {
  try {
    const r = await fetch(`/api/skip-times?malId=${malId}&episode=${episode}&episodeLength=${episodeLength}`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.skipTimes || [];
  } catch {
    return [];
  }
}
async function fetchAiringSchedule(): Promise<Anime[]> {
  const r = await fetch(`/api/airing-schedule?perPage=30`);
  if (!r.ok) return [];
  const d = await r.json();
  return d.results || [];
}

// ============================================================================
// Helper: format next airing time
// ============================================================================
function formatAiringTime(airingAt: number): string {
  const now = Date.now() / 1000;
  const diff = airingAt - now;
  if (diff < 0) return "Aired";
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${Math.floor((diff % 3600) / 60)}m`;
  const mins = Math.floor(diff / 60);
  return `in ${mins}m`;
}

// ============================================================================
// Cards
// ============================================================================
function PosterCard({ anime, onClick, progress }: { anime: Anime; onClick: () => void; progress?: number }) {
  return (
    <button onClick={onClick} className="shrink-0 cursor-pointer group active:scale-95 flex flex-col gap-1.5 w-[140px] md:w-[160px] lg:w-[180px]">
      <div className="aspect-[2/3] rounded-xl overflow-hidden relative shadow-md border border-white/5">
        <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {anime.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold text-yellow-400">star {anime.score}</div>}
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div className="h-full bg-red-500" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </div>
        )}
      </div>
      <p className="text-xs md:text-sm font-medium text-white line-clamp-2 leading-tight">{anime.title}</p>
    </button>
  );
}

function GridCard({ anime, onClick, progress }: { anime: Anime; onClick: () => void; progress?: number }) {
  return (
    <button onClick={onClick} className="cursor-pointer group active:scale-95 flex flex-col gap-1.5">
      <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-white/5 relative">
        <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        {anime.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] md:text-[10px] font-bold text-yellow-400">star {anime.score}</div>}
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div className="h-full bg-red-500" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </div>
        )}
      </div>
      <p className="text-[11px] md:text-xs font-medium text-white line-clamp-2 leading-tight">{anime.title}</p>
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-4 md:px-6 lg:px-8">
      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{title}</h2>
      {subtitle && <span className="text-xs md:text-sm text-gray-500">{subtitle}</span>}
    </div>
  );
}

// ============================================================================
// Hero Section — responsive: bigger on desktop, mobile aspect on phones
// ============================================================================
function HeroSection({ anime, onClick, onToggleList, isInList }: {
  anime: Anime; onClick: () => void; onToggleList: () => void; isInList: boolean;
}) {
  if (!anime) return null;
  const seasonStr = anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} ${anime.year}` : anime.year?.toString() || "";
  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] max-h-[800px] flex flex-col justify-end overflow-hidden">
      <img src={anime.banner || anime.poster} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0" />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.05) 100%)" }} />
      <div className="relative z-10 px-5 md:px-12 lg:px-20 pb-8 md:pb-12 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold mb-3 md:mb-5 tracking-tight drop-shadow-lg text-white">{anime.title}</h1>
        <div className="flex md:justify-start justify-center items-center gap-2 mb-4 flex-wrap">
          <span className="bg-gray-200/90 text-black text-xs md:text-sm font-bold px-2 py-0.5 rounded">{anime.type}</span>
          {anime.score && <span className="bg-gray-400/90 text-black text-xs md:text-sm font-bold px-2 py-0.5 rounded">{anime.score}</span>}
          {anime.nextAiringEpisode && (
            <span className="bg-red-600/90 text-white text-xs md:text-sm font-bold px-2 py-0.5 rounded">
              {formatAiringTime(anime.nextAiringEpisode.airingAt)}
            </span>
          )}
        </div>
        <div className="flex md:justify-start justify-center items-center gap-3 text-xs md:text-sm text-gray-300 font-medium mb-1 flex-wrap">
          {seasonStr && <span>{seasonStr}</span>}
          {anime.status && <span>{anime.status}</span>}
          {anime.duration && <span>{anime.duration}</span>}
          {anime.score && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{anime.score}</span>}
        </div>
        <p className="text-sm md:text-base text-gray-300 mb-6 md:mb-8 font-medium md:max-w-2xl">{anime.genres.slice(0, 3).join(", ")}</p>
        <div className="flex justify-between md:justify-start items-center gap-3 md:gap-4 px-2 md:px-0">
          <button className="flex flex-col items-center gap-1 opacity-90 active:opacity-70">
            <Share2 className="w-7 h-7" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Share</span>
          </button>
          <button onClick={onClick} className="flex-1 md:flex-none md:px-12 bg-white text-black font-bold py-3.5 md:py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/20 active:scale-95 transition-transform">
            <Info className="w-5 h-5" />
            <span className="text-base tracking-wide">Details</span>
          </button>
          <button
            onClick={onToggleList}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            title={isInList ? "Remove from My List" : "Add to My List"}
          >
            <Heart
              className={cn("w-7 h-7 transition-all", isInList ? "fill-red-500 text-red-500" : "text-white")}
              strokeWidth={1.5}
            />
            <span className={cn("text-[10px] font-semibold transition-colors", isInList ? "text-red-500" : "text-white")}>
              {isInList ? "Added" : "My List"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Sections — responsive columns
// ============================================================================
function HorizontalSection({ title, anime, onSelect, getProgress }: {
  title: string; anime: Anime[]; onSelect: (a: Anime) => void;
  getProgress?: (a: Anime) => number | undefined;
}) {
  if (anime.length === 0) return null;
  return (
    <section className="mb-8 md:mb-12">
      <SectionHeader title={title} />
      <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar px-4 md:px-6 lg:px-8 pb-2">
        {anime.map((a) => (
          <PosterCard key={a.id} anime={a} onClick={() => onSelect(a)} progress={getProgress?.(a)} />
        ))}
      </div>
    </section>
  );
}

function GridSection({ title, anime, onSelect, getProgress }: {
  title: string; anime: Anime[]; onSelect: (a: Anime) => void;
  getProgress?: (a: Anime) => number | undefined;
}) {
  if (anime.length === 0) return null;
  return (
    <section className="mb-8 md:mb-12 px-4 md:px-6 lg:px-8">
      <SectionHeader title={title} />
      {/* Mobile: 4 cols, Tablet: 5 cols, Desktop: 6 cols, Large: 8 cols */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-x-3 md:gap-x-4 gap-y-5 md:gap-y-6">
        {anime.slice(0, 24).map((a) => (
          <GridCard key={a.id} anime={a} onClick={() => onSelect(a)} progress={getProgress?.(a)} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Bottom Nav (mobile) / Top Nav (desktop)
// ============================================================================
function Nav({ active, onChange }: { active: View; onChange: (v: View) => void }) {
  const items: { key: View; icon: typeof Home; label: string }[] = [
    { key: "home", icon: Home, label: "Home" },
    { key: "schedule", icon: Calendar, label: "Schedule" },
    { key: "genres", icon: LayoutGrid, label: "Genres" },
    { key: "latest", icon: Clock, label: "Latest" },
    { key: "search", icon: Search, label: "Search" },
    { key: "mylist", icon: Heart, label: "My List" },
  ];

  return (
    <>
      {/* Desktop: top horizontal nav bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-b border-gray-800 h-14 items-center px-6 lg:px-10">
        <div className="flex items-center mr-8 lg:mr-12">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Ichidok</span>
        </div>
        <div className="flex items-center gap-1 lg:gap-2">
          {items.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                active === key ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile: bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40 pb-safe">
        <div className="flex justify-between items-center h-16 px-4">
          {items.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 transition-colors",
                active === key ? "text-white" : "text-gray-500"
              )}
            >
              <Icon className="w-5 h-5" fill={active === key ? "currentColor" : "none"} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

// ============================================================================
// Episode Grid View — responsive columns
// ============================================================================
function EpisodeGridView({ anime, onBack, onEpisode, currentEp }: {
  anime: AnimeDetail; onBack: () => void;
  onEpisode: (ep: number, audio: "sub" | "dub") => void;
  currentEp?: number;
}) {
  const [sortDesc, setSortDesc] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEp, setSelectedEp] = useState<number | null>(null);
  const [showNoDub, setShowNoDub] = useState(false);
  const epCount = getEpisodeCount(anime.id, anime.episodeCount || 0);
  const episodes = Array.from({ length: epCount }, (_, i) => i + 1);
  const sortedEpisodes = sortDesc ? [...episodes].reverse() : episodes;
  const filteredEpisodes = search ? sortedEpisodes.filter((e) => e.toString().includes(search)) : sortedEpisodes;

  const handleDubClick = () => {
    if (hasDub(anime.malId, selectedEp)) {
      onEpisode(selectedEp!, "dub");
    } else {
      setShowNoDub(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:pt-14">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-none text-white">{anime.title}</h1>
            <span className="text-xs md:text-sm text-gray-400">{epCount} Episodes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSortDesc((p) => !p)} className="text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M9 18h6" /></svg>
          </button>
          <button onClick={() => setShowSearch((p) => !p)} className="text-white"><Search className="w-5 h-5" /></button>
        </div>
      </div>
      {showSearch && (
        <div className="p-4 border-b border-gray-800">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search episode..." className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm outline-none" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Mobile: 5 cols, Tablet: 8, Desktop: 10, Large: 12 */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
          {filteredEpisodes.map((ep) => (
            <button
              key={ep}
              onClick={() => setSelectedEp(ep)}
              className={cn(
                "aspect-square rounded-lg text-white font-medium text-sm md:text-base hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center",
                currentEp === ep ? "bg-red-600" : "bg-gray-900"
              )}
            >{ep}</button>
          ))}
        </div>
        {filteredEpisodes.length === 0 && <p className="text-white/40 text-center mt-8">No episodes found</p>}
      </div>
      {selectedEp !== null && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEp(null)} />
          <div className="relative w-full max-w-[480px] bg-[#1c1c1e] rounded-t-3xl md:rounded-3xl p-6 pb-10 shadow-2xl">
            <button onClick={() => setSelectedEp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Episode {selectedEp}</h2>
            <p className="text-sm text-gray-400 mb-6">Choose a server. If one doesn&apos;t work, try the other.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onEpisode(selectedEp, "sub")} className="bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition">SUB Server</button>
              <button onClick={handleDubClick} className="bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition">DUB Server</button>
            </div>
          </div>
        </div>
      )}
      {showNoDub && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80">
          <div className="bg-[#1c1c1e] rounded-2xl p-6 max-w-[300px] text-center shadow-2xl">
            <p className="text-white text-sm font-medium mb-4">Sorry, there&apos;s no DUB available at the moment.</p>
            <button onClick={() => setShowNoDub(false)} className="bg-white text-black font-bold py-2 px-8 rounded-full active:scale-95 transition">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Custom HLS Player — responsive size, full controls
// ============================================================================
function HlsPlayer({
  anime, episode, audio, onBack, onEpisode, totalEpisodes,
}: {
  anime: AnimeDetail; episode: number; audio: "sub" | "dub";
  onBack: () => void;
  onEpisode: (ep: number, audio: "sub" | "dub") => void;
  totalEpisodes: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const skipTimesRef = useRef<SkipTime[]>([]);
  const hideControlsTimer = useRef<number | null>(null);

  const [streamInfo, setStreamInfo] = useState<{ src: string; poster?: string; subtitles?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [skipTimes, setSkipTimes] = useState<SkipTime[]>([]);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [qualities, setQualities] = useState<{ height: number; level: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [usingFallback, setUsingFallback] = useState(false);
  const [longPressHint, setLongPressHint] = useState(false);
  const [subtitlesOn, setSubtitlesOn] = useState(audio === "sub");
  const [hasSubtitles, setHasSubtitles] = useState(false);

  // Load the stream source and skip times
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamInfo(null);
    setSkipTimes([]);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    setSubtitlesOn(audio === "sub");
    setHasSubtitles(false);

    (async () => {
      if (!anime.malId) {
        setError("No MAL ID for this anime");
        setLoading(false);
        return;
      }
      const src = await fetchZokoSource(anime.malId!, episode, audio);
      if (cancelled) return;
      if (!src || !src.src) {
        setError("Failed to load stream source");
        setLoading(false);
        return;
      }
      setStreamInfo({ src: src.src, poster: src.poster, subtitles: src.subtitles });
      setHasSubtitles(!!src.subtitles && src.subtitles.length > 0);

      fetchSkipTimes(anime.malId!, episode, 24).then((skips) => {
        if (cancelled) return;
        skipTimesRef.current = skips;
        setSkipTimes(skips);
      });
    })();

    return () => { cancelled = true; };
  }, [anime.malId, episode, audio]);

  // Initialize hls.js
  useEffect(() => {
    if (!streamInfo?.src) return;
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);

    import("hls.js").then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(streamInfo.src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          const levels = hls.levels.map((l: any, i: number) => ({ height: l.height, level: i }));
          setQualities(levels);
          setCurrentQuality(-1);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError("Stream failed to load");
                setLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamInfo.src;
        setLoading(false);
        video.play().catch(() => {});
      } else {
        setError("HLS not supported in this browser");
        setLoading(false);
      }
    });

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [streamInfo?.src]);

  // Wire up video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => {
      if (episode < totalEpisodes) {
        if (confirm("Watch next episode?")) {
          onEpisode(episode + 1, audio);
        }
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
    };
  }, [episode, audio, totalEpisodes, onEpisode]);

  // Skip Intro / Skip Outro visibility
  // Skip Intro is ONLY shown for One Piece (MAL ID 21) — we have per-episode
  // intro/recap skip times for it. For all other anime, no skip button.
  useEffect(() => {
    const isOnePiece = anime.malId === 21;
    if (!isOnePiece) {
      setShowSkipIntro(false);
      setShowSkipOutro(duration > 0 && currentTime >= duration * 0.95);
      return;
    }
    // One Piece: use skip times if available, otherwise default 0-145s
    if (skipTimes.length === 0) {
      setShowSkipIntro(currentTime >= 10 && currentTime < 145);
      setShowSkipOutro(duration > 0 && currentTime >= duration * 0.95);
      return;
    }
    const op = skipTimes.find((s) => s.type === "op" || s.type === "mixed-op" || s.type === "recap");
    const ed = skipTimes.find((s) => s.type === "ed" || s.type === "mixed-ed");
    if (op) {
      const startShow = Math.max(op.start + 10, op.start);
      setShowSkipIntro(currentTime >= startShow && currentTime < op.end - 1);
    } else {
      setShowSkipIntro(false);
    }
    setShowSkipOutro(!!ed ? (currentTime >= ed.start && currentTime < ed.end - 1) : (duration > 0 && currentTime >= duration * 0.95));
  }, [currentTime, skipTimes, duration, anime.malId]);

  // Auto-enable English subtitle track only
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasSubtitles) return;

    const applySubtitleMode = () => {
      const tracks = v.textTracks;
      if (tracks.length === 0) return;
      let englishIdx = -1;
      let defaultIdx = -1;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t.kind !== "subtitles") continue;
        if (englishIdx === -1 && (t.language === "en" || t.label === "English" || (t as any).srclang === "en")) {
          englishIdx = i;
        }
        if (defaultIdx === -1) defaultIdx = i;
      }
      const targetIdx = englishIdx !== -1 ? englishIdx : defaultIdx;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].kind !== "subtitles") continue;
        if (i === targetIdx) {
          tracks[i].mode = subtitlesOn ? "showing" : "disabled";
        } else {
          tracks[i].mode = "disabled";
        }
      }
    };

    applySubtitleMode();

    const onLoad = () => applySubtitleMode();
    v.addEventListener("loadstart", onLoad);
    v.addEventListener("loadedmetadata", onLoad);
    v.addEventListener("addtrack", onLoad);
    const t1 = window.setTimeout(applySubtitleMode, 500);
    const t2 = window.setTimeout(applySubtitleMode, 1500);

    return () => {
      v.removeEventListener("loadstart", onLoad);
      v.removeEventListener("loadedmetadata", onLoad);
      v.removeEventListener("addtrack", onLoad);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [hasSubtitles, subtitlesOn, streamInfo?.src]);

  // Save progress to continue-watching every 5s
  useEffect(() => {
    if (!duration || currentTime < 1) return;
    const sec = Math.floor(currentTime);
    if (sec % 5 !== 0) return;
    saveWatchProgress({
      animeId: anime.id,
      malId: anime.malId,
      title: anime.title,
      poster: anime.poster,
      episode,
      audio,
      episodeCount: totalEpisodes,
      position: currentTime,
      duration,
      lastWatchedAt: Date.now(),
    });
  }, [currentTime, duration, anime, episode, audio, totalEpisodes]);

  // Toggle controls visibility on tap.
  // - If controls are currently hidden → show them (stay visible until tapped again)
  // - If controls are currently visible → hide immediately, stay hidden until tapped
  // NO auto-hide — the user explicitly controls visibility via tap.
  const pokeControls = useCallback(() => {
    setShowControls((prev) => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
      return !prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // When playback starts, keep controls visible.
  // When paused, keep controls visible.
  // NO auto-hide — the user controls visibility via tap only.
  useEffect(() => {
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    setShowControls(true);
  }, [playing]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
      }
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
      // When pausing, make sure controls stay visible (don't auto-hide)
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
      setShowControls(true);
    }
  };

  const seek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setCurrentTime(val);
  };

  const skipBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipIntro = () => {
    // For One Piece: skip past both recap AND opening.
    // The skipTimes array may contain a "recap" entry (0 → recapEnd)
    // and an "op" entry (recapEnd → opEnd). We want to jump to opEnd.
    const op = skipTimes.find((s) => s.type === "op" || s.type === "mixed-op");
    // Default end for One Piece (when no skipTimes from API)
    const endSec = op?.end ?? (anime.malId === 21 ? 145 : 90);
    seek(endSec);
  };

  const skipOutro = () => {
    if (episode < totalEpisodes) {
      onEpisode(episode + 1, audio);
    }
  };

  const skipIntroLongPress = useRef<number | null>(null);
  const onSkipIntroDown = () => {
    skipIntroLongPress.current = window.setTimeout(() => {
      if (anime.malId && videoRef.current) {
        setIntroEndOverride(anime.malId, Math.floor(videoRef.current.currentTime));
        setLongPressHint(true);
        setTimeout(() => setLongPressHint(false), 2000);
      }
    }, 800);
  };
  const onSkipIntroUp = () => {
    if (skipIntroLongPress.current) {
      window.clearTimeout(skipIntroLongPress.current);
      skipIntroLongPress.current = null;
    }
  };

  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
    setShowSettings(false);
  };

  const toggleSubtitles = () => setSubtitlesOn((prev) => !prev);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(() => {});
        }
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (error && !usingFallback && anime.malId) {
    const fallbackUrl = getEmbedUrl(anime.malId, episode, audio);
    if (fallbackUrl) {
      return <FallbackIframePlayer url={fallbackUrl} anime={anime} episode={episode} audio={audio} onBack={onBack} />;
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:pt-14">
      {/* Top bar */}
      <div className={cn(
        "flex items-center gap-3 p-3 bg-black z-30 transition-opacity",
        !showControls && !isFullscreen && "opacity-0 pointer-events-none"
      )}>
        <button onClick={onBack} className="text-white flex items-center gap-2">
          <ChevronLeft className="w-6 h-6" />
          <span className="font-bold text-sm truncate max-w-[250px] md:max-w-[400px]">{anime.title} - Ep {episode} {audio.toUpperCase()}</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Player area — responsive max-width on desktop, full-width on mobile */}
        <div className="w-full bg-black flex justify-center">
          <div
            ref={containerRef}
            className="relative w-full md:max-w-[900px] lg:max-w-[1100px] xl:max-w-[1300px] bg-black aspect-video"
            onClick={pokeControls}
            onTouchStart={pokeControls}
          >
            <video
              ref={videoRef}
              className="w-full h-full"
              playsInline
              poster={streamInfo?.poster}
              crossOrigin="anonymous"
              onClick={(e) => { e.stopPropagation(); pokeControls(); }}
            >
              {(streamInfo?.subtitles || []).map((s: any, i: number) => (
                <track
                  key={i}
                  kind="subtitles"
                  src={s.src}
                  label={s.label || "English"}
                  srcLang={s.lang || "en"}
                  default={s.default}
                />
              ))}
            </video>

            {(loading || buffering) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/80">
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => {
                    if (anime.malId) {
                      const url = getEmbedUrl(anime.malId, episode, audio);
                      if (url) {
                        setUsingFallback(true);
                        setStreamInfo({ src: url });
                      }
                    }
                  }}
                  className="bg-white text-black font-bold py-2 px-6 rounded-full text-sm active:scale-95"
                >Use Fallback Player</button>
              </div>
            )}

            {showSkipIntro && !loading && !error && (
              <button
                onClick={skipIntro}
                onMouseDown={onSkipIntroDown}
                onMouseUp={onSkipIntroUp}
                onMouseLeave={onSkipIntroUp}
                onTouchStart={onSkipIntroDown}
                onTouchEnd={onSkipIntroUp}
                className="absolute bottom-20 md:bottom-24 right-4 z-20 bg-white/95 text-black font-bold text-xs md:text-sm px-4 py-2 rounded-full shadow-lg active:scale-95 transition"
              >Skip Intro</button>
            )}
            {longPressHint && (
              <div className="absolute bottom-20 md:bottom-24 right-4 z-30 bg-black/90 text-white text-xs px-3 py-2 rounded-lg">
                Intro end saved for this anime
              </div>
            )}

            {showSkipOutro && !loading && !error && episode < totalEpisodes && (
              <button
                onClick={skipOutro}
                className="absolute bottom-20 md:bottom-24 right-4 z-20 bg-red-600 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-full shadow-lg active:scale-95 transition flex items-center gap-1"
              >
                <SkipForward className="w-3 h-3 md:w-4 md:h-4" /> Next Ep
              </button>
            )}

            {/* Center play button when paused — small, centered, only resumes on direct click */}
            {!playing && !loading && !error && (
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                title="Play"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/70 active:scale-95 transition">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" />
                </div>
              </button>
            )}

            {/* Custom controls bar */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 px-3 md:px-5 lg:px-8 pb-1.5 md:pb-2 pt-10 md:pt-12 bg-gradient-to-t from-black/90 to-transparent z-20 transition-opacity",
                !showControls && "opacity-0 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] md:text-[11px] text-white font-mono w-9 text-right">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  step={0.5}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-red-500 cursor-pointer"
                />
                <span className="text-[10px] md:text-[11px] text-white font-mono w-9">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 md:gap-2">
                  <button onClick={togglePlay} className="text-white p-0.5 md:p-1">
                    {playing ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                  </button>
                  <button onClick={() => skipBy(-10)} className="text-white p-0.5 md:p-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8V4l-8 8 8 8v-4" /><text x="14" y="16" fontSize="9" fill="currentColor" stroke="none">10</text>
                    </svg>
                  </button>
                  <button onClick={() => skipBy(10)} className="text-white p-0.5 md:p-1">
                    <FastForward className="w-4 h-4" />
                  </button>
                  {episode > 1 && (
                    <button onClick={() => onEpisode(episode - 1, audio)} className="text-white p-0.5 md:p-1" title="Previous episode">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 20L9 12l10-8v16z" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
                    </button>
                  )}
                  {episode < totalEpisodes && (
                    <button onClick={() => onEpisode(episode + 1, audio)} className="text-white p-0.5 md:p-1" title="Next episode">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4l10 8-10 8V4z" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  {hasSubtitles && (
                    <button
                      onClick={toggleSubtitles}
                      className={cn("text-white p-0.5 md:p-1 transition-opacity", subtitlesOn ? "opacity-100" : "opacity-50")}
                      title={subtitlesOn ? "Subtitles: On" : "Subtitles: Off"}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M7 12.5a1.5 1.5 0 0 1 3 0" fill="none" />
                        <path d="M14 12.5a1.5 1.5 0 0 1 3 0" fill="none" />
                      </svg>
                    </button>
                  )}
                  <button onClick={() => setShowSettings((p) => !p)} className="text-white p-0.5 md:p-1" title="Quality">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                  <button onClick={toggleFullscreen} className="text-white p-0.5 md:p-1">
                    {isFullscreen ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {showSettings && (
                <div className="absolute bottom-10 right-3 bg-black/95 border border-white/10 rounded-lg p-2 min-w-[140px] shadow-xl">
                  <p className="text-[10px] text-white/60 px-2 py-1 uppercase tracking-wider">Quality</p>
                  <button
                    onClick={() => changeQuality(-1)}
                    className={cn("w-full text-left px-3 py-1.5 text-xs rounded text-white hover:bg-white/10", currentQuality === -1 && "bg-white/10")}
                  >Auto</button>
                  {qualities.map((q) => (
                    <button
                      key={q.level}
                      onClick={() => changeQuality(q.level)}
                      className={cn("w-full text-left px-3 py-1.5 text-xs rounded text-white hover:bg-white/10", currentQuality === q.level && "bg-white/10")}
                    >{q.height}p</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Episode list BELOW the player */}
        <div className="bg-black px-4 md:px-6 lg:px-8 py-4 pb-24 md:pb-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold text-white">Episodes</h2>
            <span className="text-xs md:text-sm text-gray-400">{totalEpisodes} total</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {Array.from({ length: Math.min(totalEpisodes, 100) }, (_, i) => i + 1).map((ep) => (
              <button
                key={ep}
                onClick={() => onEpisode(ep, audio)}
                className={cn(
                  "aspect-square rounded-lg text-white font-medium text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center",
                  ep === episode ? "bg-red-600" : "bg-gray-900"
                )}
              >{ep}</button>
            ))}
          </div>
          {totalEpisodes > 100 && (
            <p className="text-gray-500 text-xs text-center mt-3">Showing first 100 episodes. Use search in Episodes view for more.</p>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => onEpisode(episode, "sub")}
              className={cn("flex-1 py-2.5 rounded-full font-bold text-sm transition", audio === "sub" ? "bg-white text-black" : "bg-gray-900 text-white")}
            >SUB</button>
            <button
              onClick={() => hasDub(anime.malId, episode) ? onEpisode(episode, "dub") : null}
              className={cn("flex-1 py-2.5 rounded-full font-bold text-sm transition", audio === "dub" ? "bg-white text-black" : "bg-gray-900 text-white")}
            >DUB</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackIframePlayer({ url, anime, episode, audio, onBack }: {
  url: string; anime: AnimeDetail; episode: number; audio: "sub" | "dub"; onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:pt-14">
      <div className="flex items-center gap-3 p-3 bg-black z-30">
        <button onClick={onBack} className="text-white flex items-center gap-2">
          <ChevronLeft className="w-6 h-6" />
          <span className="font-bold text-sm truncate max-w-[250px] md:max-w-[400px]">{anime.title} - Ep {episode} {audio.toUpperCase()}</span>
        </button>
      </div>
      <div className="w-full bg-black flex justify-center">
        <div className="relative w-full md:max-w-[900px] lg:max-w-[1100px] xl:max-w-[1300px] aspect-video bg-black">
          <iframe
            src={url}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-white/60 text-xs">Using fallback player (zokoanime embedded)</p>
      </div>
    </div>
  );
}

// ============================================================================
// Detail View — responsive
// ============================================================================
function DetailView({ animeId, onBack, onWatch, onSelectAnime, myList, onToggleList, continueFromEp }: {
  animeId: number; onBack: () => void; onWatch: (d: AnimeDetail, ep?: number, audio?: "sub" | "dub") => void;
  onSelectAnime: (id: number) => void; myList: number[];
  onToggleList: (d: AnimeDetail) => void;
  continueFromEp?: { episode: number; audio: "sub" | "dub" } | null;
}) {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchDetail(animeId).then((d) => setDetail(d)).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [animeId]);

  if (loading) return <div className="fixed inset-0 bg-black z-50 flex items-center justify-center md:pt-14"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>;
  if (!detail) return <div className="fixed inset-0 bg-black z-50 flex items-center justify-center md:pt-14"><p className="text-white/60">Failed to load.</p></div>;

  const seasonStr = detail.season ? `${detail.season.charAt(0).toUpperCase() + detail.season.slice(1)} ${detail.year}` : detail.year?.toString() || "";
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto no-scrollbar md:pt-14">
      <header className="relative h-[400px] md:h-[500px] lg:h-[600px] w-full">
        <img src={detail.banner || detail.poster} alt={detail.title} className="absolute inset-0 w-full h-full object-cover z-0" style={{ filter: "brightness(0.6)" }} />
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,1) 100%)" }} />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 md:pt-16">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"><ChevronLeft className="w-5 h-5" /></button>
        </div>
        <div className="absolute bottom-16 md:bottom-20 left-0 right-0 px-5 md:px-12 lg:px-20 z-20 flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 tracking-wide drop-shadow-lg text-white">{detail.title}</h1>
          <div className="flex gap-2 mb-4 flex-wrap justify-center md:justify-start">
            <span className="bg-gray-200 text-black text-xs md:text-sm font-bold px-2 py-0.5 rounded">{detail.type}</span>
            {detail.episodeCount > 0 && <span className="bg-red-600 text-white text-xs md:text-sm font-bold px-2 py-0.5 rounded">{detail.episodeCount} eps</span>}
            {detail.nextAiringEpisode && (
              <span className="bg-red-600 text-white text-xs md:text-sm font-bold px-2 py-0.5 rounded">
                Ep {detail.nextAiringEpisode.episode} {formatAiringTime(detail.nextAiringEpisode.airingAt)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-1 text-xs md:text-sm text-gray-300 mb-1 font-medium">
            {seasonStr && <span>{seasonStr}</span>}
            {detail.status && <span>{detail.status}</span>}
            {detail.duration && <span>{detail.duration}</span>}
            {detail.score && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{detail.score}</span>}
          </div>
          <p className="text-sm md:text-base text-gray-400 mb-6">{detail.genres.slice(0, 4).join(", ")}</p>
          <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4 md:gap-6 px-2 md:px-0">
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center"><Share2 className="w-5 h-5 text-white" /></div>
              <span className="text-[10px] text-gray-300">Share</span>
            </button>
            <button
              onClick={() => onWatch(detail, continueFromEp?.episode ?? 1, continueFromEp?.audio ?? "sub")}
              className="bg-white text-black font-bold py-3 md:py-4 px-8 md:px-12 rounded-full flex items-center gap-2 active:scale-95 transition-transform shadow-lg"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{continueFromEp ? `Continue E${continueFromEp.episode}` : "Watch"}</span>
            </button>
            <button onClick={() => onToggleList(detail)} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${myList.includes(detail.id) ? "border-red-500 bg-red-500/10" : "border-gray-500"}`}>
                <Heart className={`w-5 h-5 transition-all ${myList.includes(detail.id) ? "fill-red-500 text-red-500" : "text-white"}`} />
              </div>
              <span className="text-[10px] text-gray-300">{myList.includes(detail.id) ? "Added" : "My List"}</span>
            </button>
          </div>
        </div>
      </header>
      <section className="px-5 md:px-12 lg:px-20 pt-6 md:pt-10 pb-10 md:pb-16 bg-black">
        <article className="mb-8 md:mb-12 max-w-4xl">
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">{detail.synopsis || "No synopsis available."}</p>
        </article>
        {detail.seasons.length > 0 && (
          <div className="mb-8 md:mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Other Seasons</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {detail.seasons.map((s) => (
                <button key={s.id} onClick={() => onSelectAnime(s.id)} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group text-left">
                  <img src={s.poster} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                    <span className="text-xs md:text-sm font-bold text-white drop-shadow-md truncate">{s.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {detail.recommendations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">You May Also Like</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {detail.recommendations.map((r) => (
                <button key={r.id} onClick={() => onSelectAnime(r.id)} className="min-w-[120px] md:min-w-[150px] w-[120px] md:w-[150px] cursor-pointer group text-left shrink-0">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative">
                    <img src={r.poster} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    {r.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold text-yellow-400">star {r.score}</div>}
                  </div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-200 line-clamp-2 leading-tight">{r.title}</h3>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Search View — responsive
// ============================================================================
function SearchView({ onSelect }: { onSelect: (a: Anime) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/anilist-search?q=${encodeURIComponent(query)}&perPage=30`)
        .then((r) => r.json())
        .then((data) => setResults(data.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <div className="pt-12 md:pt-20 px-4 md:px-6 lg:px-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Search</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anime..." className="w-full bg-[#1c1c1e] text-white pl-10 pr-4 py-3 rounded-xl text-sm md:text-base outline-none" autoFocus />
      </div>
      {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 md:gap-x-4 gap-y-5 md:gap-y-6 pb-8">
          {results.map((a) => <GridCard key={a.id} anime={a} onClick={() => onSelect(a)} />)}
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && <p className="text-white/40 text-center mt-8">No results found</p>}
    </div>
  );
}

// ============================================================================
// My List View — responsive
// ============================================================================
function MyListView({ onSelect, myList, onRemove }: { onSelect: (a: Anime) => void; myList: AnimeDetail[]; onRemove: (id: number) => void }) {
  return (
    <div className="pt-12 md:pt-20 px-4 md:px-6 lg:px-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">My List</h1>
      {myList.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 md:gap-x-4 gap-y-5 md:gap-y-6 pb-8">
          {myList.map((a) => (
            <div key={a.id} className="relative group">
              <GridCard anime={a} onClick={() => onSelect(a)} />
              <button onClick={() => onRemove(a.id)} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white text-xs z-10">X</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20">
          <Heart className="w-16 h-16 text-white/20 mb-3" />
          <p className="text-white/40 text-sm">Your list is empty</p>
          <p className="text-white/30 text-xs mt-1">Tap the heart icon on an anime to add it</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Continue Watching — responsive horizontal scroll
// ============================================================================
function ContinueWatchingSection({ history, onSelect, onClear }: {
  history: WatchHistoryEntry[];
  onSelect: (e: WatchHistoryEntry) => void;
  onClear: () => void;
}) {
  if (history.length === 0) return null;
  return (
    <section className="mb-8 md:mb-12">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 mb-3">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5 md:w-6 md:h-6" /> Continue Watching</h2>
        <button onClick={onClear} className="text-xs md:text-sm text-gray-400 hover:text-white">Clear All</button>
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar px-4 md:px-6 lg:px-8 pb-2">
        {history.map((e) => {
          const progress = e.duration > 0 ? e.position / e.duration : 0;
          return (
            <div key={`${e.animeId}-${e.episode}`} className="shrink-0 w-[200px] md:w-[240px] lg:w-[280px] group cursor-pointer" onClick={() => onSelect(e)}>
              <div className="aspect-video rounded-lg overflow-hidden relative bg-gray-900 border border-white/5">
                <img src={e.poster} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </div>
                </div>
                <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded">EP {e.episode}</div>
                <div className="absolute top-1 right-1 bg-black/80 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{e.audio}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div className="h-full bg-red-500" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
                </div>
              </div>
              <p className="text-xs md:text-sm font-medium text-white line-clamp-1 mt-1.5">{e.title}</p>
              <p className="text-[10px] md:text-xs text-gray-400">{Math.floor(progress * 100)}% watched</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Schedule View — shows currently airing anime with next episode countdown
// ============================================================================
function ScheduleView({ onSelect }: { onSelect: (a: Anime) => void }) {
  const [schedule, setSchedule] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchAiringSchedule()
      .then(setSchedule)
      .catch(() => setSchedule([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Group anime by the day their next episode airs
  const dayLabels = ["Today", "Tomorrow", "In 2 days", "In 3 days", "In 4+ days", "Aired"];
  const grouped: { label: string; items: Anime[] }[] = dayLabels.map((l) => ({ label: l, items: [] }));

  for (const a of schedule) {
    const airingAt = a.nextAiringEpisode?.airingAt || 0;
    const diff = airingAt - now / 1000;
    let idx: number;
    if (diff < 0) idx = 5; // Aired
    else if (diff < 86400) idx = 0; // Today (< 24h)
    else if (diff < 172800) idx = 1; // Tomorrow
    else if (diff < 259200) idx = 2; // In 2 days
    else if (diff < 345600) idx = 3; // In 3 days
    else idx = 4; // 4+ days
    grouped[idx].items.push(a);
  }

  return (
    <div className="pt-12 md:pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">{schedule.length} airing now</p>
      </div>
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {!loading && schedule.length === 0 && (
        <p className="text-gray-500 text-center py-16">Nothing airing right now.</p>
      )}
      {!loading && grouped.map((group) => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.label} className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-900 pb-2">
              {group.label} <span className="text-gray-700">· {group.items.length}</span>
            </h2>
            <div className="space-y-1">
              {group.items.map((a) => {
                const airingAt = a.nextAiringEpisode?.airingAt || 0;
                const diff = airingAt - now / 1000;
                const isLive = diff < 3600 && diff > 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 active:scale-[0.99] transition-colors text-left group"
                  >
                    <img
                      src={a.poster}
                      alt={a.title}
                      className="w-10 h-14 rounded object-cover shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-red-400 transition-colors">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.type} · Ep {a.nextAiringEpisode?.episode || "?"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {isLive ? (
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {formatAiringTime(airingAt).replace("in ", "")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================
export default function Page() {
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<AnimeDetail | null>(null);
  const [playerEp, setPlayerEp] = useState<number>(1);
  const [playerAudio, setPlayerAudio] = useState<"sub" | "dub">("sub");
  const [heroAnime, setHeroAnime] = useState<Anime | null>(null);
  const [spotlight, setSpotlight] = useState<Anime[]>([]);
  const [trending, setTrending] = useState<Anime[]>([]);
  const [popular, setPopular] = useState<Anime[]>([]);
  const [watched, setWatched] = useState<Anime[]>([]);
  const [airing, setAiring] = useState<Anime[]>([]);
  const [favorite, setFavorite] = useState<Anime[]>([]);
  const [topToday, setTopToday] = useState<Anime[]>([]);
  const [topWeek, setTopWeek] = useState<Anime[]>([]);
  const [topMonth, setTopMonth] = useState<Anime[]>([]);
  const [topRated, setTopRated] = useState<Anime[]>([]);
  const [newReleases, setNewReleases] = useState<Anime[]>([]);
  const [classic, setClassic] = useState<Anime[]>([]);
  const [movies, setMovies] = useState<Anime[]>([]);
  const [specials, setSpecials] = useState<Anime[]>([]);
  const [onas, setOnas] = useState<Anime[]>([]);
  const [ovas, setOvas] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [myList, setMyList] = useState<AnimeDetail[]>([]);
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const myListIds = myList.map((a) => a.id);

  const refreshHistory = useCallback(() => {
    setHistory(getWatchHistory());
  }, []);

  useEffect(() => {
    try { const s = localStorage.getItem("mylist"); if (s) setMyList(JSON.parse(s)); } catch {}
    refreshHistory();
  }, [refreshHistory]);

  const toggleMyList = useCallback((d: AnimeDetail) => {
    setMyList((prev) => {
      const exists = prev.some((a) => a.id === d.id);
      const next = exists ? prev.filter((a) => a.id !== d.id) : [...prev, d];
      try { localStorage.setItem("mylist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Fetch all sections — also builds the airing cache so getEpisodeCount()
  // can return accurate counts for ongoing anime (auto-import new episodes)
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSection("spotlight", 30),
      fetchSection("trending", 40),
      fetchSection("popular", 50),
      fetchSection("watched", 50),
      fetchSection("airing", 50),
      fetchSection("favorite", 50),
      fetchSection("top-today", 30),
      fetchSection("top-week", 30),
      fetchSection("top-month", 30),
      fetchSection("top-rated", 50),
      fetchSection("new-releases", 40),
      fetchSection("classic", 30),
      fetchSection("movies", 40),
      fetchSection("specials", 30),
      fetchSection("onas", 30),
      fetchSection("ovas", 30),
    ]).then(([sl, tr, po, wa, ai, fa, tt, tw, tm, tr2, nr, cl, mv, sp, on, ov]) => {
      setSpotlight(sl);
      setTrending(tr);
      setPopular(po);
      setWatched(wa);
      setAiring(ai);
      setFavorite(fa);
      setTopToday(tt);
      setTopWeek(tw);
      setTopMonth(tm);
      setTopRated(tr2);
      setNewReleases(nr);
      setClassic(cl);
      setMovies(mv);
      setSpecials(sp);
      setOnas(on);
      setOvas(ov);

      // Build airing cache from all fetched anime — this is what powers
      // the "auto-import new episodes" feature. When AniList reports a
      // new nextAiringEpisode, getEpisodeCount() returns a higher number.
      const allAnime = [...sl, ...tr, ...po, ...wa, ...ai, ...fa, ...tt, ...tw, ...tm, ...tr2, ...nr, ...cl, ...mv, ...sp, ...on, ...ov];
      const cache: Record<number, { nextEpisode: number | null; airingAt: number | null } | undefined> = {};
      for (const a of allAnime) {
        if (a.nextAiringEpisode) {
          cache[a.id] = {
            nextEpisode: a.nextAiringEpisode.episode,
            airingAt: a.nextAiringEpisode.airingAt,
          };
        }
      }
      setAiringCache(cache);

      if (tr.length > 0) setHeroAnime(tr[0]);
      else if (sl.length > 0) setHeroAnime(sl[0]);
      else if (po.length > 0) setHeroAnime(po[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== "player") refreshHistory();
  }, [view, refreshHistory]);

  const openDetail = useCallback((a: Anime) => { setSelectedId(a.id); setView("detail"); }, []);
  const continueWatching = history.find((h) => h.animeId === selectedId) || null;

  return (
    <div className="bg-black min-h-screen w-full overflow-x-hidden pb-20 md:pb-0">
      <Nav active={view === "detail" ? "home" : view} onChange={(v) => { setView(v); setSelectedId(null); }} />

      <div className="md:pt-14">
        {view === "home" && (
          loading ? (
            <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
          ) : (
            <>
              {heroAnime && (
                <HeroSection
                  anime={heroAnime}
                  onClick={() => openDetail(heroAnime)}
                  isInList={myListIds.includes(heroAnime.id)}
                  onToggleList={() => {
                    if (myListIds.includes(heroAnime.id)) {
                      const existing = myList.find((a) => a.id === heroAnime.id);
                      if (existing) toggleMyList(existing);
                    } else {
                      fetchDetail(heroAnime.id).then((d) => {
                        if (d) toggleMyList(d);
                        else {
                          toggleMyList({
                            ...heroAnime,
                            seasons: [],
                            recommendations: [],
                          } as AnimeDetail);
                        }
                      });
                    }
                  }}
                />
              )}
              <div className="pt-6 md:pt-10">
                <ContinueWatchingSection
                  history={history}
                  onSelect={(e) => {
                    const all = [...trending, ...popular, ...spotlight, ...watched, ...airing, ...favorite, ...topRated, ...newReleases, ...classic, ...topToday, ...topWeek, ...topMonth];
                    const found = all.find((a) => a.id === e.animeId);
                    const anime: Anime = found || {
                      id: e.animeId,
                      malId: e.malId,
                      title: e.title,
                      titleEnglish: e.title,
                      poster: e.poster,
                      banner: e.poster,
                      synopsis: "",
                      score: null,
                      popularity: 0,
                      episodeCount: e.episodeCount,
                      type: "TV",
                      status: "",
                      year: null,
                      season: null,
                      genres: [],
                      studios: [],
                      duration: null,
                    };
                    fetchDetail(e.animeId).then((d) => {
                      if (d) {
                        setDetailData(d);
                        setPlayerEp(e.episode);
                        setPlayerAudio(e.audio);
                        setView("player");
                      } else {
                        openDetail(anime);
                      }
                    });
                  }}
                  onClear={() => {
                    if (confirm("Clear all watch history?")) {
                      history.forEach((h) => removeWatchHistory(h.animeId));
                      refreshHistory();
                    }
                  }}
                />
                <HorizontalSection title="Spotlight" anime={spotlight} onSelect={openDetail} />
                <HorizontalSection title="Trending Now" anime={trending} onSelect={openDetail}
                  getProgress={(a) => {
                    const h = history.find((h) => h.animeId === a.id);
                    return h && h.duration > 0 ? h.position / h.duration : undefined;
                  }}
                />
                <GridSection title="Most Popular" anime={popular} onSelect={openDetail} />
                <GridSection title="Most Watched" anime={watched} onSelect={openDetail} />
                <GridSection title="Top Airing" anime={airing} onSelect={openDetail} />
                <GridSection title="Most Favorite" anime={favorite} onSelect={openDetail} />
                <HorizontalSection title="Top 10 Today" anime={topToday} onSelect={openDetail} />
                <HorizontalSection title="Top 10 Week" anime={topWeek} onSelect={openDetail} />
                <HorizontalSection title="Top 10 Month" anime={topMonth} onSelect={openDetail} />
                <GridSection title="Top Rated of All Time" anime={topRated} onSelect={openDetail} />
                <GridSection title="New Releases" anime={newReleases} onSelect={openDetail} />
                <GridSection title="Classics" anime={classic} onSelect={openDetail} />
                <HorizontalSection title="Movies" anime={movies} onSelect={openDetail} />
                <HorizontalSection title="Specials" anime={specials} onSelect={openDetail} />
                <HorizontalSection title="ONAs" anime={onas} onSelect={openDetail} />
                <HorizontalSection title="OVAs" anime={ovas} onSelect={openDetail} />
              </div>
            </>
          )
        )}

        {view === "detail" && selectedId !== null && (
          <DetailView
            animeId={selectedId}
            onBack={() => setView("home")}
            onWatch={(d, ep, audio) => {
              setDetailData(d);
              setPlayerEp(ep ?? 1);
              setPlayerAudio(audio ?? "sub");
              setView("episodes");
            }}
            onSelectAnime={(id) => setSelectedId(id)}
            myList={myListIds}
            onToggleList={toggleMyList}
            continueFromEp={continueWatching ? { episode: continueWatching.episode, audio: continueWatching.audio } : null}
          />
        )}

        {view === "episodes" && detailData && (
          <EpisodeGridView
            anime={detailData}
            onBack={() => setView("detail")}
            onEpisode={(ep, audio) => {
              setPlayerEp(ep);
              setPlayerAudio(audio);
              setView("player");
            }}
            currentEp={playerEp}
          />
        )}

        {view === "player" && detailData && (
          <HlsPlayer
            anime={detailData}
            episode={playerEp}
            audio={playerAudio}
            onBack={() => setView("episodes")}
            onEpisode={(ep, audio) => {
              setPlayerEp(ep);
              setPlayerAudio(audio);
            }}
            totalEpisodes={getEpisodeCount(detailData.id, detailData.episodeCount || 0)}
          />
        )}

        {view === "search" && <SearchView onSelect={openDetail} />}

        {view === "schedule" && <ScheduleView onSelect={openDetail} />}

        {view === "mylist" && (
          <MyListView
            onSelect={openDetail}
            myList={myList}
            onRemove={(id) => toggleMyList(myList.find((a) => a.id === id) as AnimeDetail)}
          />
        )}

        {view === "genres" && (
          <div className="pt-12 md:pt-20 px-4 md:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Genres</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Sci-Fi", "Supernatural", "Suspense", "Slice of Life", "Mystery", "Horror"].map((g) => (
                <button key={g} onClick={() => setView("search")} className="bg-[#1c1c1e] text-white font-medium py-4 md:py-6 rounded-xl text-sm md:text-base hover:bg-[#2c2c2c] active:scale-95 transition">{g}</button>
              ))}
            </div>
          </div>
        )}

        {view === "latest" && (
          <div className="pt-12 md:pt-20 px-4 md:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Latest</h1>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 md:gap-x-4 gap-y-5 md:gap-y-6 pb-8">
              {[...newReleases, ...trending, ...popular, ...movies, ...specials, ...onas, ...ovas].slice(0, 40).map((a) => <GridCard key={a.id + "-latest"} anime={a} onClick={() => openDetail(a)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
