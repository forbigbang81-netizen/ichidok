"use client";
import { create } from "zustand";

export type View = "home" | "schedule" | "search" | "catalog" | "library" | "detail";

export interface Anime {
  id: string; malId: number; title: string; titleEnglish?: string; titleJapanese?: string;
  synopsis: string; poster: string; banner: string; trailer?: string; type: string;
  status: string; score: number; scoredBy?: number; rank?: number; popularity?: number;
  members?: number; year?: number; season?: string; genres: string[]; studios: string[];
  episodeCount: number; duration?: string; rating?: string; source?: string; isNew?: boolean;
}

export interface Episode { number: number; title?: string; aired?: string; filler?: boolean; recap?: boolean; }
export interface HistoryItem { malId: number; title: string; poster?: string | null; type: string; episode: number; progress: number; position: number; duration: number; watchedAt?: string; }

/**
 * Parse the current URL hash into a view + malId + episode.
 * Format: #/view, #/view/malId, #/view/malId/episode
 * Examples:
 *   #/catalog         → catalog view
 *   #/detail/34572    → detail view for Black Clover
 *   #/detail/34572/5  → detail view for Black Clover episode 5
 */
export function parseHash(): { view: View; malId: number | null; episode: number | null } {
  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "home", malId: null, episode: null };
  const view = (parts[0] as View) || "home";
  if (!["home", "schedule", "search", "catalog", "library", "detail"].includes(view)) {
    return { view: "home", malId: null, episode: null };
  }
  const malId = parts[1] ? parseInt(parts[1], 10) : null;
  const episode = parts[2] ? parseInt(parts[2], 10) : null;
  return { view, malId: Number.isFinite(malId) ? malId : null, episode: Number.isFinite(episode) ? episode : null };
}

/** Build a URL hash from the current view state. */
function buildHash(view: View, malId: number | null, episode: number | null): string {
  if (view === "detail" && malId !== null) {
    if (episode !== null && episode > 1) return `#/detail/${malId}/${episode}`;
    return `#/detail/${malId}`;
  }
  if (view !== "home") return `#/${view}`;
  return "";
}

interface AppState {
  currentView: View; previousView: View; selectedMalId: number | null; selectedEpisode: number;
  resumePosition: number | null; audioMode: "SUB" | "DUB"; selectedQuality: string;
  selectedSpeed: number; fullscreenPlayer: boolean;
  history: HistoryItem[]; bookmarks: number[];
  notifications: { id: string; title: string; body: string; type: string; read: boolean; createdAt: string }[];
  // Genre to pre-select when navigating to the Catalog view. Consumed on mount.
  catalogGenre: string | null;
  navigate: (v: View) => void;
  openAnime: (malId: number, episode?: number, position?: number | null) => void;
  back: () => void;
  setAudioMode: (a: "SUB" | "DUB") => void;
  setQuality: (q: string) => void;
  setSpeed: (s: number) => void;
  toggleFullscreen: () => void;
  toggleBookmark: (malId: number) => void;
  setBookmarks: (ids: number[]) => void;
  addHistory: (h: HistoryItem) => void;
  setHistory: (h: HistoryItem[]) => void;
  updateHistoryPosition: (malId: number, episode: number, position: number, duration: number) => void;
  setNotifications: (n: AppState["notifications"]) => void;
  setSelectedEpisode: (ep: number) => void;
  setCatalogGenre: (g: string | null) => void;
}

// On initial load, parse the URL hash to restore the view.
const initialHash = typeof window !== "undefined" ? parseHash() : { view: "home" as View, malId: null, episode: null };

export const useApp = create<AppState>((set, get) => ({
  currentView: initialHash.view, previousView: "home",
  selectedMalId: initialHash.malId, selectedEpisode: initialHash.episode ?? 1,
  resumePosition: null, audioMode: "DUB", selectedQuality: "1080p", selectedSpeed: 1,
  fullscreenPlayer: false, history: [], bookmarks: [], notifications: [],
  catalogGenre: null,
  navigate: (v) => {
    set((s) => {
      const newState = { currentView: v, previousView: s.currentView, selectedMalId: v === "detail" ? s.selectedMalId : null };
      // Update URL hash
      if (typeof window !== "undefined") {
        const hash = buildHash(v, newState.selectedMalId, s.selectedEpisode);
        const newUrl = hash ? `${window.location.pathname}${window.location.search}${hash}` : `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, "", newUrl);
      }
      return newState;
    });
  },
  openAnime: (malId, episode = 1, position = null) => {
    set((s) => {
      const hist = s.history.find((h) => h.malId === malId && h.episode === episode);
      const resume = position ?? (hist && hist.position > 5 ? hist.position : null);
      // Update URL hash
      if (typeof window !== "undefined") {
        const hash = buildHash("detail", malId, episode > 1 ? episode : null);
        const newUrl = `${window.location.pathname}${window.location.search}${hash}`;
        window.history.replaceState(null, "", newUrl);
      }
      return { currentView: "detail", previousView: s.currentView, selectedMalId: malId, selectedEpisode: episode, resumePosition: resume };
    });
  },
  back: () => {
    set((s) => {
      const newState = { currentView: s.previousView, selectedMalId: s.previousView === "detail" ? s.selectedMalId : null, resumePosition: null as number | null };
      // Update URL hash
      if (typeof window !== "undefined") {
        const hash = buildHash(newState.currentView, newState.selectedMalId, s.selectedEpisode);
        const newUrl = hash ? `${window.location.pathname}${window.location.search}${hash}` : `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, "", newUrl);
      }
      return newState;
    });
  },
  setAudioMode: (a) => set({ audioMode: a }),
  setQuality: (q) => set({ selectedQuality: q }),
  setSpeed: (s) => set({ selectedSpeed: s }),
  toggleFullscreen: () => set((s) => ({ fullscreenPlayer: !s.fullscreenPlayer })),
  toggleBookmark: (malId) => set((s) => ({ bookmarks: s.bookmarks.includes(malId) ? s.bookmarks.filter((b) => b !== malId) : [...s.bookmarks, malId] })),
  setBookmarks: (ids) => set({ bookmarks: ids }),
  addHistory: (h) => set((s) => {
    const existing = s.history.find((x) => x.malId === h.malId && x.episode === h.episode);
    const list = s.history.filter((x) => x.malId !== h.malId || x.episode !== h.episode);
    return { history: [{ ...h, progress: h.progress ?? existing?.progress ?? 0, position: h.position ?? existing?.position ?? 0, watchedAt: new Date().toISOString() }, ...list] };
  }),
  setHistory: (h) => set({ history: h }),
  updateHistoryPosition: (malId, episode, position, duration) => set((s) => ({
    history: s.history.map((x) => x.malId === malId && x.episode === episode ? { ...x, position, duration, progress: duration > 0 ? (position / duration) * 100 : 0, watchedAt: new Date().toISOString() } : x)
  })),
  setNotifications: (n) => set({ notifications: n }),
  setSelectedEpisode: (ep) => {
    set({ selectedEpisode: ep, resumePosition: null });
    // Update URL hash if in detail view
    const s = get();
    if (typeof window !== "undefined" && s.currentView === "detail" && s.selectedMalId !== null) {
      const hash = buildHash("detail", s.selectedMalId, ep > 1 ? ep : null);
      const newUrl = hash ? `${window.location.pathname}${window.location.search}${hash}` : `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", newUrl);
    }
  },
  setCatalogGenre: (g) => set({ catalogGenre: g }),
}));
