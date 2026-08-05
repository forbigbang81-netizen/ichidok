// Video sources for anime
// We use zokoanime.video (via anigo.re) for ALL streaming
// because it provides HLS 1080p that works in ALL browsers

export interface VideoSource {
  url: string;
  quality: string;
}

// Episode count overrides for anime where AniList returns 0
export const ANIME_EPISODE_COUNTS: Record<number, number> = {
  21: 1172,        // One Piece
  1735: 500,       // Naruto: Shippuden
  20: 220,         // Naruto
  11061: 148,      // Hunter x Hunter (2011)
};

// Get the zokoanime embed URL for any anime
// Format: https://zokoanime.video/stream/mal/{malId}/{episode}/{sub|dub}
export function getEmbedUrl(malId: number | null, episode: number, audio: "sub" | "dub"): string | null {
  if (!malId) return null;
  return `https://zokoanime.video/stream/mal/${malId}/${episode}/${audio}`;
}

// Get overridden episode count for an anime
export function getEpisodeCount(animeId: number, defaultCount: number): number {
  return ANIME_EPISODE_COUNTS[animeId] || defaultCount;
}

// Check if an anime has video sources (always true if it has a MAL ID)
export function hasVideoSource(animeId: number): boolean {
  return true;
}

// Legacy function — now returns null to force zokoanime fallback
export function getVideoUrl(animeId: number, episode: number, audio: "sub" | "dub"): VideoSource | null {
  return null; // Always use zokoanime embed
}
