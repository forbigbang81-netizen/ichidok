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

interface AppState {
  currentView: View; previousView: View; selectedMalId: number | null; selectedEpisode: number;
  resumePosition: number | null; audioMode: "SUB" | "DUB"; selectedQuality: string;
  selectedSpeed: number; fullscreenPlayer: boolean;
  history: HistoryItem[]; bookmarks: number[];
  notifications: { id: string; title: string; body: string; type: string; read: boolean; createdAt: string }[];
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
}

export const useApp = create<AppState>((set, get) => ({
  currentView: "home", previousView: "home", selectedMalId: null, selectedEpisode: 1,
  resumePosition: null, audioMode: "SUB", selectedQuality: "1080p", selectedSpeed: 1,
  fullscreenPlayer: false, history: [], bookmarks: [], notifications: [],
  navigate: (v) => set((s) => ({ currentView: v, previousView: s.currentView, selectedMalId: v === "detail" ? s.selectedMalId : null })),
  openAnime: (malId, episode = 1, position = null) => set((s) => {
    const hist = s.history.find((h) => h.malId === malId && h.episode === episode);
    const resume = position ?? (hist && hist.position > 5 ? hist.position : null);
    return { currentView: "detail", previousView: s.currentView, selectedMalId: malId, selectedEpisode: episode, resumePosition: resume };
  }),
  back: () => set((s) => ({ currentView: s.previousView, selectedMalId: s.previousView === "detail" ? s.selectedMalId : null, resumePosition: null })),
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
  setSelectedEpisode: (ep) => set({ selectedEpisode: ep, resumePosition: null }),
}));
