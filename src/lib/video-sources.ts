// Video sources for anime
// We use zokoanime.video for ALL streaming because it provides HLS 1080p
// that works in ALL browsers. We decode the actual m3u8 URL server-side
// (see /api/zoko-source) so we can use hls.js directly in our own player,
// giving us full control: skip intro, seek, picture-in-picture, subtitles, etc.

export interface VideoSource {
  url: string;
  quality: string;
}

// Episode count overrides for anime where AniList returns 0 or wrong data.
// For ONGOING anime, we now also check the airing schedule (nextAiringEpisode)
// at runtime — so this map is only used as a fallback / hard floor.
export const ANIME_EPISODE_COUNTS: Record<number, number> = {
  21: 1172,        // One Piece
  1735: 500,       // Naruto: Shippuden
  20: 220,         // Naruto
  11061: 148,      // Hunter x Hunter (2011)
};

// DUB episode limits - some anime only have DUB up to a certain episode.
// For episodes beyond this, fall back to SUB.
export const DUB_EPISODE_LIMITS: Record<number, number> = {
  21: 1133,  // One Piece DUB goes up to episode 1133
};

// Intro timestamps for popular anime (MAL ID -> { start, end } in seconds).
// These are community-known typical intro ranges. Most modern anime have
// the OP start at ~0:00 and end around ~1:30 (90s). Some have cold opens
// before the OP (One Piece, Demon Slayer), so we adjust per series.
//
// Users can override these per-anime via localStorage (long-press the
// Skip Intro button to set a custom end time).
export const INTRO_TIMES: Record<number, { start: number; end: number }> = {
  // Long-running shonen
  21:    { start: 0,   end: 145 }, // One Piece - long OP (~2:25)
  1735:  { start: 0,   end: 95  }, // Naruto Shippuden
  20:    { start: 0,   end: 90  }, // Naruto
  11061: { start: 0,   end: 90  }, // Hunter x Hunter (2011)
  31964: { start: 0,   end: 90  }, // One Punch Man
  30276: { start: 0,   end: 90  }, // JoJo's Bizarre Adventure Part 4

  // Modern shonen (typical 90s intro)
  38000: { start: 0,   end: 90  }, // Demon Slayer
  40748: { start: 0,   end: 90  }, // Jujutsu Kaisen
  34599: { start: 0,   end: 90  }, // My Hero Academia S2
  44511: { start: 0,   end: 90  }, // Chainsaw Man
  48654: { start: 0,   end: 90  }, // Bocchi the Rock
  35349: { start: 0,   end: 90  }, // Dr. Stone
  51009: { start: 0,   end: 90  }, // Tokyo Revengers

  // Classics
  16498: { start: 0,   end: 90  }, // Attack on Titan
  28851: { start: 0,   end: 90  }, // Attack on Titan S2
  9253:  { start: 0,   end: 90  }, // Steins;Gate
  5114:  { start: 0,   end: 90  }, // Fullmetal Alchemist: Brotherhood
  2001:  { start: 0,   end: 90  }, // Death Note
  30:    { start: 0,   end: 90  }, // Neon Genesis Evangelion
  1:     { start: 0,   end: 90  }, // Cowboy Bebop
  245:   { start: 0,   end: 90  }, // Great Teacher Onizuka

  // Other popular
  52991: { start: 0,   end: 90  }, // Frieren
  38524: { start: 0,   end: 90  }, // Attack on Titan S3
  42310: { start: 0,   end: 90  }, // Tokyo Ghoul:re
  53998: { start: 0,   end: 90  }, // Spy x Family
  58514: { start: 0,   end: 90  }, // Mob Psycho 100 S3
  20583: { start: 0,   end: 90  }, // Haikyu!! S3
  62076: { start: 0,   end: 90  }, // Mashle S2
  41467: { start: 0,   end: 90  }, // Bleach: Thousand-Year Blood War
  22199: { start: 0,   end: 90  }, // Akame ga Kill!
};

// Get intro times for an anime (with optional user override from localStorage)
export function getIntroTimes(malId: number | null): { start: number; end: number } | null {
  if (!malId) return null;
  // Check user override first
  if (typeof window !== "undefined") {
    try {
      const overrides = JSON.parse(localStorage.getItem("intro-overrides") || "{}");
      const userSet = overrides[malId];
      if (userSet) return userSet;
    } catch {}
  }
  // Fall back to hardcoded DB
  return INTRO_TIMES[malId] || null;
}

// Save a user-set intro end time
export function setIntroEndOverride(malId: number, endSeconds: number) {
  if (typeof window === "undefined") return;
  try {
    const overrides = JSON.parse(localStorage.getItem("intro-overrides") || "{}");
    const existing = overrides[malId] || { start: 0 };
    overrides[malId] = { start: existing.start || 0, end: endSeconds };
    localStorage.setItem("intro-overrides", JSON.stringify(overrides));
  } catch {}
}

// Get the zokoanime embed URL for any anime (used as fallback when our
// hls.js player fails — iframe still works for playback)
export function getEmbedUrl(malId: number | null, episode: number, audio: "sub" | "dub"): string | null {
  if (!malId) return null;
  if (audio === "dub") {
    const dubLimit = DUB_EPISODE_LIMITS[malId];
    if (dubLimit && episode > dubLimit) {
      return `https://zokoanime.video/stream/mal/${malId}/${episode}/sub`;
    }
  }
  return `https://zokoanime.video/stream/mal/${malId}/${episode}/${audio}`;
}

// Check if DUB is available for a specific episode
export function hasDub(malId: number | null, episode: number): boolean {
  if (!malId) return false;
  const dubLimit = DUB_EPISODE_LIMITS[malId];
  if (dubLimit && episode > dubLimit) return false;
  return true;
}

// ============================================================================
// Dynamic episode count - uses airing schedule data when available.
// This is what enables "auto-import new episodes" - when AniList reports
// a new episode has aired (nextAiringEpisode advances), our episode count
// automatically increases without any code changes.
// ============================================================================

// Cache of airing data fetched from AniList (refreshed hourly by the API route)
// Keyed by AniList anime ID.
let airingCache: Record<number, { nextEpisode: number | null; airingAt: number | null } | undefined> = {};

export function setAiringCache(data: Record<number, { nextEpisode: number | null; airingAt: number | null } | undefined>) {
  airingCache = { ...airingCache, ...data };
}

// Get the effective episode count for an anime.
// Priority:
//   1. Airing schedule (nextAiringEpisode - 1, since that episode has aired)
//   2. Hardcoded ANIME_EPISODE_COUNTS override
//   3. AniList's `episodes` field (passed in as defaultCount)
export function getEpisodeCount(animeId: number, defaultCount: number): number {
  const airing = airingCache[animeId];
  if (airing && airing.nextEpisode && airing.nextEpisode > 1) {
    // nextEpisode is the NEXT episode to air, so aired count = nextEpisode - 1
    const airedCount = airing.nextEpisode - 1;
    // Use max of airing data, hardcoded override, and AniList's count
    return Math.max(airedCount, ANIME_EPISODE_COUNTS[animeId] || 0, defaultCount || 0);
  }
  return ANIME_EPISODE_COUNTS[animeId] || defaultCount || 0;
}

// Check if an anime has video sources (always true if it has a MAL ID)
export function hasVideoSource(animeId: number): boolean {
  return true;
}

// Legacy function - now returns null to force zokoanime fallback
export function getVideoUrl(animeId: number, episode: number, audio: "sub" | "dub"): VideoSource | null {
  return null;
}

// ============================================================================
// Continue Watching - localStorage-based watch history
// ============================================================================

export interface WatchHistoryEntry {
  animeId: number;        // AniList ID
  malId: number | null;
  title: string;
  poster: string;
  episode: number;
  audio: "sub" | "dub";
  episodeCount: number;   // Total episodes (for progress bar)
  position: number;       // Seconds watched
  duration: number;       // Total seconds
  lastWatchedAt: number;  // Timestamp
}

const HISTORY_KEY = "continue-watching";
const MAX_HISTORY = 20;

export function getWatchHistory(): WatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list: WatchHistoryEntry[] = JSON.parse(raw);
    // Sort by most recent
    return list.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
  } catch {
    return [];
  }
}

export function saveWatchProgress(entry: WatchHistoryEntry) {
  if (typeof window === "undefined") return;
  try {
    const list = getWatchHistory();
    // Remove existing entry for same anime+episode
    const filtered = list.filter(
      (e) => !(e.animeId === entry.animeId && e.episode === entry.episode)
    );
    // Add new entry at top
    filtered.unshift(entry);
    // Cap at MAX_HISTORY
    const capped = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(capped));
  } catch {}
}

export function removeWatchHistory(animeId: number) {
  if (typeof window === "undefined") return;
  try {
    const list = getWatchHistory();
    const filtered = list.filter((e) => e.animeId !== animeId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
}
