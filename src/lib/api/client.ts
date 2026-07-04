import type { Anime, Episode } from "@/store/app";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j?.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export interface VideoImport {
  source: string;
  malId: number;
  episode: number;
  audio: "sub" | "dub";
  url: string | null;
  rawUrl: string | null;
  sourceType: string | null;
  quality: string;
  hasSub: boolean;
  hasDub: boolean;
  subtitleUrl: string | null;
  isTrailer: boolean;
  isYoutube: boolean;
  dualAudio?: boolean;
  title: string | null;
  // Back-compat aliases used by older consumers.
  cached?: boolean;
}

export const apiCatalog = {
  top: (limit = 25) =>
    api<{ results: Anime[]; total: number }>(
      `/api/catalog?type=top&limit=${limit}&_ts=${Date.now()}`,
    ),
  season: (limit = 25) =>
    api<{ results: Anime[]; total: number }>(
      `/api/catalog?type=season&limit=${limit}&_ts=${Date.now()}`,
    ),
  all: (limit = 25) =>
    api<{ results: Anime[]; total: number }>(
      `/api/catalog?type=all&limit=${limit}&_ts=${Date.now()}`,
    ),
  upcoming: (limit = 25) =>
    api<{ results: Anime[]; total: number }>(
      `/api/catalog?status=Not%20yet%20aired&sort=popularity&limit=${limit}&_ts=${Date.now()}`,
    ),
  custom: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    qs.set("_ts", String(Date.now()));
    return api<{ results: Anime[]; total: number }>(`/api/catalog?${qs.toString()}`);
  },
};

export async function searchAnime(q: string, limit = 12): Promise<Anime[]> {
  if (!q.trim()) return [];
  try {
    return (
      await api<{ results: Anime[] }>(
        `/api/jikan/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      )
    ).results;
  } catch {
    const t = await apiCatalog.all(50);
    const lc = q.toLowerCase();
    return t.results.filter(
      (a) =>
        a.title.toLowerCase().includes(lc) ||
        a.genres.some((g) => g.toLowerCase().includes(lc)),
    );
  }
}

export async function fetchAnimeDetail(
  malId: number,
  includeEpisodes = true,
): Promise<{ anime: Anime; episodes: Episode[]; imports: unknown[] }> {
  const r = await api<{
    anime: Anime;
    episodes: Episode[];
    imports: unknown[];
  }>(
    `/api/jikan/${malId}?includeEpisodes=${includeEpisodes ? "true" : "false"}`,
  );
  return {
    anime: r.anime,
    episodes: r.episodes ?? [],
    imports: r.imports ?? [],
  };
}

export async function fetchVideoImport(
  malId: number,
  episode: number,
  audio: "sub" | "dub" = "sub",
): Promise<VideoImport | null> {
  try {
    const r = await api<VideoImport>(
      `/api/auto-import?malId=${malId}&episode=${episode}&audio=${audio}`,
    );
    return { ...r, cached: r.source === "cache" };
  } catch (e) {
    console.error("auto-import failed:", e);
    return null;
  }
}

export async function seedCatalog(): Promise<void> {
  await fetch("/api/seed", { method: "POST" }).catch(() => {});
}

export async function fetchHistory() {
  return (await api<{ history: any[] }>("/api/history")).history;
}

export async function saveHistory(h: any) {
  return api<{ history: any }>("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(h),
  });
}

export async function deleteHistory(
  params?: { malId?: number; episode?: number; id?: string } | "all",
) {
  const qs = new URLSearchParams();
  if (params === "all") {
    // No params — clears all.
  } else if (params) {
    if (params.id) qs.set("id", String(params.id));
    if (params.malId) qs.set("malId", String(params.malId));
    if (params.episode) qs.set("episode", String(params.episode));
  }
  return api<{ ok: boolean }>(`/api/history?${qs.toString()}`, {
    method: "DELETE",
  });
}

export async function fetchBookmarks() {
  return (await api<{ bookmarks: any[] }>("/api/bookmarks")).bookmarks;
}

export async function addBookmark(a: Anime) {
  return api<{ bookmark: any; action: string }>("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      malId: a.malId,
      title: a.title,
      poster: a.poster,
      type: a.type,
    }),
  });
}

export async function removeBookmark(malId: number) {
  return api<{ ok: boolean }>(`/api/bookmarks?malId=${malId}`, {
    method: "DELETE",
  });
}

export async function fetchNotifications() {
  return (await api<{ notifications: any[] }>("/api/notifications"))
    .notifications;
}

export async function markNotificationsRead(opts?: { id?: string; all?: boolean }) {
  const qs = new URLSearchParams();
  if (opts?.all) qs.set("all", "1");
  else if (opts?.id) qs.set("id", String(opts.id));
  return api<{ ok: boolean }>(`/api/notifications?${qs.toString()}`, {
    method: "PATCH",
  });
}

export interface ScheduleDay {
  day: string;
  dayIndex: number;
  anime: Anime[];
}

export async function fetchSchedule(): Promise<
  Record<string, Anime[]>
> {
  const r = await api<{
    schedule: Record<string, Anime[]>;
    scheduleList: ScheduleDay[];
    year: number;
    season: string;
    total: number;
  }>("/api/schedule");
  return r.schedule;
}
