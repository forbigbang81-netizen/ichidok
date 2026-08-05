"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Home, LayoutGrid, Clock, Search, Heart, Share2, Info, Play, ChevronLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVideoUrl, getEpisodeCount } from "@/lib/video-sources";

interface Anime {
  id: number; malId: number | null; title: string; titleEnglish: string | null;
  poster: string; banner: string; synopsis: string; score: string | null;
  popularity: number; episodeCount: number; type: string; status: string;
  year: number | null; season: string | null; genres: string[];
  studios: string[]; duration: string | null;
}
interface AnimeDetail extends Anime {
  seasons: { id: number; title: string; poster: string; relation: string; type: string }[];
  recommendations: { id: number; title: string; poster: string; score: string | null; episodes: number; type: string }[];
}
type View = "home" | "detail" | "episodes" | "player" | "genres" | "latest" | "search" | "mylist";

async function fetchSection(section: string): Promise<Anime[]> {
  const r = await fetch(`/api/anilist?section=${section}&perPage=20`);
  if (!r.ok) return [];
  const d = await r.json();
  return d.results || [];
}
async function fetchDetail(id: number): Promise<AnimeDetail | null> {
  const r = await fetch(`/api/anilist-detail?id=${id}`);
  if (!r.ok) return null;
  return r.json();
}

function PosterCard({ anime, onClick }: { anime: Anime; onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 cursor-pointer group active:scale-95 flex flex-col gap-1.5 w-[140px]">
      <div className="aspect-[2/3] rounded-xl overflow-hidden relative shadow-md border border-white/5">
        <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {anime.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-yellow-400">star {anime.score}</div>}
      </div>
      <p className="text-xs font-medium text-white line-clamp-2 leading-tight">{anime.title}</p>
    </button>
  );
}

function GridCard({ anime, onClick }: { anime: Anime; onClick: () => void }) {
  return (
    <button onClick={onClick} className="cursor-pointer group active:scale-95 flex flex-col gap-1.5">
      <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-white/5 relative">
        <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        {anime.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold text-yellow-400">star {anime.score}</div>}
      </div>
      <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight">{anime.title}</p>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-xl font-bold text-white mb-3 px-4">{title}</h2>;
}

function HeroSection({ anime, onClick }: { anime: Anime; onClick: () => void }) {
  if (!anime) return null;
  const seasonStr = anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} ${anime.year}` : anime.year?.toString() || "";
  return (
    <section className="relative w-full aspect-[9/14] max-h-[80vh] flex flex-col justify-end overflow-hidden">
      <img src={anime.banner || anime.poster} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0" />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.05) 100%)" }} />
      <div className="relative z-10 px-5 pb-6 text-center">
        <h1 className="text-4xl font-extrabold mb-3 tracking-tight drop-shadow-lg text-white">{anime.title}</h1>
        <div className="flex justify-center items-center gap-2 mb-4">
          <span className="bg-gray-200/90 text-black text-xs font-bold px-2 py-0.5 rounded">{anime.type}</span>
          {anime.score && <span className="bg-gray-400/90 text-black text-xs font-bold px-2 py-0.5 rounded">{anime.score}</span>}
        </div>
        <div className="flex justify-center items-center gap-3 text-xs text-gray-300 font-medium mb-1 flex-wrap">
          {seasonStr && <span>{seasonStr}</span>}
          {anime.status && <span>{anime.status}</span>}
          {anime.duration && <span>{anime.duration}</span>}
          {anime.score && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{anime.score}</span>}
        </div>
        <p className="text-sm text-gray-300 mb-6 font-medium">{anime.genres.slice(0, 3).join(", ")}</p>
        <div className="flex justify-between items-center gap-3 px-2">
          <button className="flex flex-col items-center gap-1 opacity-90 active:opacity-70">
            <Share2 className="w-7 h-7" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Share</span>
          </button>
          <button onClick={onClick} className="flex-1 bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/20 active:scale-95 transition-transform">
            <Info className="w-5 h-5" />
            <span className="text-base tracking-wide">Details</span>
          </button>
          <button className="flex flex-col items-center gap-1 opacity-90 active:opacity-70">
            <Heart className="w-7 h-7" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">My List</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function HorizontalSection({ title, anime, onSelect }: { title: string; anime: Anime[]; onSelect: (a: Anime) => void }) {
  if (anime.length === 0) return null;
  return (
    <section className="mb-8">
      <SectionHeader title={title} />
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {anime.map((a) => <PosterCard key={a.id} anime={a} onClick={() => onSelect(a)} />)}
      </div>
    </section>
  );
}

function GridSection({ title, anime, onSelect }: { title: string; anime: Anime[]; onSelect: (a: Anime) => void }) {
  if (anime.length === 0) return null;
  return (
    <section className="mb-8 px-4">
      <SectionHeader title={title} />
      <div className="grid grid-cols-4 gap-x-3 gap-y-5">
        {anime.slice(0, 12).map((a) => <GridCard key={a.id} anime={a} onClick={() => onSelect(a)} />)}
      </div>
    </section>
  );
}

function BottomNav({ active, onChange }: { active: View; onChange: (v: View) => void }) {
  const items: { key: View; icon: typeof Home; label: string }[] = [
    { key: "home", icon: Home, label: "Home" },
    { key: "genres", icon: LayoutGrid, label: "Genres" },
    { key: "latest", icon: Clock, label: "Latest" },
    { key: "search", icon: Search, label: "Search" },
    { key: "mylist", icon: Heart, label: "My List" },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-black border-t border-gray-800 z-40 pb-safe">
      <div className="flex justify-between items-center h-16 px-6">
        {items.map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => onChange(key)} className={cn("flex flex-col items-center justify-center gap-1 w-16 transition-colors", active === key ? "text-white" : "text-gray-500")}>
            <Icon className="w-6 h-6" fill={active === key ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function EpisodeGridView({ anime, onBack, onEpisode }: { anime: AnimeDetail; onBack: () => void; onEpisode: (ep: number, audio: "sub" | "dub") => void }) {
  const [sortDesc, setSortDesc] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEp, setSelectedEp] = useState<number | null>(null);
  const epCount = getEpisodeCount(anime.id, anime.episodeCount || 0);
  const episodes = Array.from({ length: epCount }, (_, i) => i + 1);
  const sortedEpisodes = sortDesc ? [...episodes].reverse() : episodes;
  const filteredEpisodes = search ? sortedEpisodes.filter((e) => e.toString().includes(search)) : sortedEpisodes;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 pt-8">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-lg font-bold leading-none text-white">{anime.title}</h1>
            <span className="text-xs text-gray-400">Episodes</span>
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
        <div className="grid grid-cols-5 gap-2">
          {filteredEpisodes.map((ep) => (
            <button key={ep} onClick={() => setSelectedEp(ep)} className="aspect-square bg-gray-900 rounded-lg text-white font-medium text-base hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center">{ep}</button>
          ))}
        </div>
        {filteredEpisodes.length === 0 && <p className="text-white/40 text-center mt-8">No episodes found</p>}
      </div>
      {selectedEp !== null && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEp(null)} />
          <div className="relative w-full max-w-[480px] bg-[#1c1c1e] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <button onClick={() => setSelectedEp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Episode {selectedEp}</h2>
            <p className="text-sm text-gray-400 mb-6">Choose a server, if a server does not work, please choose another.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onEpisode(selectedEp, "sub")} className="bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition">SUB Server</button>
              <button onClick={() => onEpisode(selectedEp, "dub")} className="bg-white text-black font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition">DUB Server</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleVideoPlayer({ title, episode, audio, videoUrl, onBack }: { title: string; episode: number; audio: "sub" | "dub"; videoUrl?: string; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onErr = () => setError(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onErr);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const seek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setCurrentTime(val);
  };
  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  };
  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const proxiedUrl = videoUrl
    ? (videoUrl.includes("drive.google.com") || videoUrl.includes("archive.org") || videoUrl.includes("dropbox.com"))
      ? `/api/stream?url=${encodeURIComponent(videoUrl)}`
      : videoUrl
    : undefined;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="relative w-full aspect-video max-h-screen flex items-center justify-center" onClick={() => setShowControls((p) => !p)}>
        {proxiedUrl && !error ? (
          <video ref={videoRef} src={proxiedUrl} className="w-full h-full object-contain" playsInline autoPlay onClick={(e) => { e.stopPropagation(); togglePlay(); }} />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <p className="text-sm">{error ? "Video failed to load" : "No video source available"}</p>
            <p className="text-xs text-white/40">{audio === "dub" ? "DUB" : "SUB"} - Episode {episode}</p>
          </div>
        )}
        {showControls && (
          <div className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="text-white flex items-center gap-2">
                <ChevronLeft className="w-6 h-6" />
                <span className="font-bold text-sm truncate max-w-[200px]">{title} - Ep {episode} {audio.toUpperCase()}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowSpeed((p) => !p); }} className="text-white text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full">{speed}x</button>
            </div>
          </div>
        )}
        {showControls && proxiedUrl && !error && (
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="absolute z-20 w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            {playing ? (
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-6 h-6 text-black ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            )}
          </button>
        )}
        {showSpeed && (
          <div className="absolute top-12 right-3 z-40 bg-[#1c1c1e] rounded-xl shadow-2xl p-1.5 min-w-[90px]">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <button key={s} onClick={(e) => { e.stopPropagation(); changeSpeed(s); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium ${speed === s ? "bg-white text-black" : "text-white hover:bg-white/10"}`}>{s}x</button>
            ))}
          </div>
        )}
        {showControls && proxiedUrl && !error && (
          <div className="absolute bottom-0 left-0 right-0 z-30 p-3 pb-5 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-[11px] font-medium tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 0} value={currentTime} onChange={(e) => seek(Number(e.target.value))} className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-red-500" />
              <span className="text-white text-[11px] font-medium tabular-nums w-10">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button onClick={(e) => { e.stopPropagation(); seek(Math.max(0, currentTime - 10)); }} className="flex items-center gap-1 text-white px-2 py-1 rounded-lg hover:bg-white/10">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3,4 3,8 7,8" /></svg>
                <span className="text-[10px] font-medium">10</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white p-1">
                {playing ? (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 21,12 6,21" /></svg>
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); seek(Math.min(duration, currentTime + 10)); }} className="flex items-center gap-1 text-white px-2 py-1 rounded-lg hover:bg-white/10">
                <span className="text-[10px] font-medium">10</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><polyline points="21,4 21,8 17,8" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ animeId, onBack, onWatch, onSelectAnime, myList, onToggleList }: {
  animeId: number; onBack: () => void; onWatch: (d: AnimeDetail) => void;
  onSelectAnime: (id: number) => void; myList: number[]; onToggleList: (d: AnimeDetail) => void;
}) {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchDetail(animeId).then((d) => setDetail(d)).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [animeId]);

  if (loading) return <div className="fixed inset-0 bg-black z-50 flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>;
  if (!detail) return <div className="fixed inset-0 bg-black z-50 flex items-center justify-center"><p className="text-white/60">Failed to load.</p></div>;

  const seasonStr = detail.season ? `${detail.season.charAt(0).toUpperCase() + detail.season.slice(1)} ${detail.year}` : detail.year?.toString() || "";
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto no-scrollbar">
      <header className="relative h-[500px] w-full">
        <img src={detail.banner || detail.poster} alt={detail.title} className="absolute inset-0 w-full h-full object-cover z-0" style={{ filter: "brightness(0.6)" }} />
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,1) 100%)" }} />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 pt-8">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"><ChevronLeft className="w-5 h-5" /></button>
          <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"><Search className="w-5 h-5" /></button>
        </div>
        <div className="absolute bottom-16 left-0 right-0 px-6 z-20 flex flex-col items-center text-center">
          <h1 className="text-4xl font-black mb-3 tracking-wide drop-shadow-lg text-white">{detail.title}</h1>
          <div className="flex gap-2 mb-4">
            <span className="bg-gray-200 text-black text-xs font-bold px-2 py-0.5 rounded">{detail.type}</span>
            {detail.episodeCount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">{detail.episodeCount} eps</span>}
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-300 mb-1 font-medium">
            {seasonStr && <span>{seasonStr}</span>}
            {detail.status && <span>{detail.status}</span>}
            {detail.duration && <span>{detail.duration}</span>}
            {detail.score && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{detail.score}</span>}
          </div>
          <p className="text-sm text-gray-400 mb-6">{detail.genres.slice(0, 4).join(", ")}</p>
          <div className="w-full flex items-center justify-between px-2">
            <button className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full border border-gray-500 flex items-center justify-center"><Share2 className="w-5 h-5 text-white" /></div>
              <span className="text-[10px] text-gray-300">Share</span>
            </button>
            <button onClick={() => onWatch(detail)} className="bg-white text-black font-bold py-3 px-12 rounded-full flex items-center gap-2 active:scale-95 transition-transform shadow-lg">
              <Play className="w-4 h-4 fill-black" /><span>Watch</span>
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
      <section className="px-5 pt-6 pb-10 bg-black">
        <article className="mb-8"><p className="text-sm text-gray-300 leading-relaxed">{detail.synopsis || "No synopsis available."}</p></article>
        {detail.seasons.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Other Seasons</h2>
            <div className="grid grid-cols-3 gap-3">
              {detail.seasons.map((s) => (
                <button key={s.id} onClick={() => onSelectAnime(s.id)} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group text-left">
                  <img src={s.poster} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                    <span className="text-xs font-bold text-white drop-shadow-md truncate">{s.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {detail.recommendations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">You May Also Like</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {detail.recommendations.map((r) => (
                <button key={r.id} onClick={() => onSelectAnime(r.id)} className="min-w-[120px] w-[120px] cursor-pointer group text-left">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative">
                    <img src={r.poster} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    {r.score && <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold text-yellow-400">star {r.score}</div>}
                  </div>
                  <h3 className="text-xs font-semibold text-gray-200 line-clamp-2 leading-tight">{r.title}</h3>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

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
    <div className="pt-12 px-4">
      <h1 className="text-2xl font-bold text-white mb-4">Search</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full bg-[#1c1c1e] text-white pl-10 pr-4 py-3 rounded-xl text-sm outline-none" autoFocus />
      </div>
      {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>}
      {!loading && results.length > 0 && <div className="grid grid-cols-3 gap-x-3 gap-y-5 pb-8">{results.map((a) => <GridCard key={a.id} anime={a} onClick={() => onSelect(a)} />)}</div>}
      {!loading && query.trim() && results.length === 0 && <p className="text-white/40 text-center mt-8">No results found</p>}
    </div>
  );
}

function MyListView({ onSelect, myList, onRemove }: { onSelect: (a: Anime) => void; myList: AnimeDetail[]; onRemove: (id: number) => void }) {
  return (
    <div className="pt-12 px-4">
      <h1 className="text-2xl font-bold text-white mb-4">My List</h1>
      {myList.length > 0 ? (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 pb-8">
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

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<AnimeDetail | null>(null);
  const [playerEp, setPlayerEp] = useState<number>(1);
  const [playerAudio, setPlayerAudio] = useState<"sub" | "dub">("sub");
  const [playerVideoUrl, setPlayerVideoUrl] = useState<string | undefined>(undefined);
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
  const [loading, setLoading] = useState(true);
  const [myList, setMyList] = useState<AnimeDetail[]>([]);
  const myListIds = myList.map((a) => a.id);

  useEffect(() => {
    try { const s = localStorage.getItem("mylist"); if (s) setMyList(JSON.parse(s)); } catch {}
  }, []);

  const toggleMyList = useCallback((d: AnimeDetail) => {
    setMyList((prev) => {
      const exists = prev.some((a) => a.id === d.id);
      const next = exists ? prev.filter((a) => a.id !== d.id) : [...prev, d];
      try { localStorage.setItem("mylist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSection("spotlight"), fetchSection("trending"), fetchSection("popular"),
      fetchSection("watched"), fetchSection("airing"), fetchSection("favorite"),
      fetchSection("top-today"), fetchSection("top-week"), fetchSection("top-month"),
    ]).then(([sl, tr, po, wa, ai, fa, tt, tw, tm]) => {
      setSpotlight(sl); setTrending(tr); setPopular(po); setWatched(wa);
      setAiring(ai); setFavorite(fa); setTopToday(tt); setTopWeek(tw); setTopMonth(tm);
      if (tr.length > 0) setHeroAnime(tr[0]);
      else if (sl.length > 0) setHeroAnime(sl[0]);
      else if (po.length > 0) setHeroAnime(po[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openDetail = useCallback((a: Anime) => { setSelectedId(a.id); setView("detail"); }, []);

  return (
    <div className="bg-black min-h-screen w-full overflow-x-hidden pb-20">
      <div className="max-w-[480px] mx-auto">
        {view === "home" && (
          loading ? (
            <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
          ) : (
            <>
              {heroAnime && <HeroSection anime={heroAnime} onClick={() => openDetail(heroAnime)} />}
              <div className="pt-6">
                <HorizontalSection title="Spotlight" anime={spotlight} onSelect={openDetail} />
                <HorizontalSection title="Trending" anime={trending} onSelect={openDetail} />
                <GridSection title="Most Popular" anime={popular} onSelect={openDetail} />
                <GridSection title="Most Watched" anime={watched} onSelect={openDetail} />
                <GridSection title="Top Airing" anime={airing} onSelect={openDetail} />
                <GridSection title="Most Favorite" anime={favorite} onSelect={openDetail} />
                <GridSection title="Top 10 Today" anime={topToday} onSelect={openDetail} />
                <GridSection title="Top 10 Week" anime={topWeek} onSelect={openDetail} />
                <GridSection title="Top 10 Month" anime={topMonth} onSelect={openDetail} />
              </div>
            </>
          )
        )}

        {view === "detail" && selectedId !== null && (
          <DetailView
            animeId={selectedId}
            onBack={() => setView("home")}
            onWatch={(d) => { setDetailData(d); setView("episodes"); }}
            onSelectAnime={(id) => setSelectedId(id)}
            myList={myListIds}
            onToggleList={toggleMyList}
          />
        )}

        {view === "episodes" && detailData && (
          <EpisodeGridView
            anime={detailData}
            onBack={() => setView("detail")}
            onEpisode={(ep, audio) => {
              setPlayerEp(ep);
              setPlayerAudio(audio);
              const src = getVideoUrl(detailData.id, ep, audio);
              setPlayerVideoUrl(src?.url);
              setView("player");
            }}
          />
        )}

        {view === "player" && detailData && (
          <SimpleVideoPlayer
            title={detailData.title}
            episode={playerEp}
            audio={playerAudio}
            videoUrl={playerVideoUrl}
            onBack={() => setView("episodes")}
          />
        )}

        {view === "search" && <SearchView onSelect={openDetail} />}

        {view === "mylist" && (
          <MyListView
            onSelect={openDetail}
            myList={myList}
            onRemove={(id) => toggleMyList(myList.find((a) => a.id === id) as AnimeDetail)}
          />
        )}

        {view === "genres" && (
          <div className="pt-12 px-4">
            <h1 className="text-2xl font-bold text-white mb-4">Genres</h1>
            <div className="grid grid-cols-2 gap-3">
              {["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Sci-Fi", "Supernatural", "Suspense", "Slice of Life", "Mystery", "Horror"].map((g) => (
                <button key={g} onClick={() => setView("search")} className="bg-[#1c1c1e] text-white font-medium py-4 rounded-xl text-sm hover:bg-[#2c2c2c] active:scale-95 transition">{g}</button>
              ))}
            </div>
          </div>
        )}

        {view === "latest" && (
          <div className="pt-12 px-4">
            <h1 className="text-2xl font-bold text-white mb-4">Latest</h1>
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 pb-8">
              {[...trending, ...popular].slice(0, 18).map((a) => <GridCard key={a.id + "-latest"} anime={a} onClick={() => openDetail(a)} />)}
            </div>
          </div>
        )}
      </div>

      {view !== "player" && view !== "episodes" && (
        <BottomNav active={view === "detail" ? "home" : view} onChange={(v) => { setView(v); setSelectedId(null); }} />
      )}
    </div>
  );
}
