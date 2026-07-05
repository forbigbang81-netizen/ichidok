import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { db } from "@/lib/db";

/**
 * OpenSubtitles.com API client (REST v1).
 *
 * Auth model:
 *   - All requests require `Api-Key` header (register at opensubtitles.com).
 *   - Downloads require a JWT token obtained via /api/v1/login (username+password).
 *   - Anonymous login (no body) is supported for search but not download.
 *
 * Env vars:
 *   - OPENSUBS_API_KEY (required for any API access)
 *   - OPENSUBS_USER  (optional — for download access)
 *   - OPENSUBS_PASS  (optional — for download access)
 *
 * If env vars are missing, all functions return null and the caller falls
 * back to the Jikan episode-title VTT generator.
 *
 * Rate limits (as of 2024):
 *   - Search: no limit
 *   - Download: 20/day anonymous, 100/day authenticated, more for VIP
 *   - Request rate: 1/sec
 */

const API_BASE = "https://api.opensubtitles.com/api/v1";
const CACHE_DIR = path.join(process.cwd(), ".opensubs-cache");
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours

let cachedToken: { token: string; expiresAt: number } | null = null;

interface OsSubtitle {
  id: string;
  type: string;
  attributes: {
    language?: string;
    url?: string;
    file_id?: number;
    release?: string;
    download_count?: number;
    ratings?: number;
    ai_translated?: boolean;
    machine_translated?: boolean;
    votes?: number;
    from_trusted?: boolean;
    hearing_impaired?: boolean;
    fps?: number;
    subtitle?: string; // raw subtitle URL when present
  };
}

interface OsSearchResponse {
  data?: OsSubtitle[];
  meta?: { total_count?: number };
}

interface OsLoginResponse {
  token?: string;
  status?: number;
  user?: { allowed_translations?: number; allowed_downloads?: number };
}

interface OsDownloadResponse {
  link?: string;
  file_name?: string;
  resets_in?: string;
  remaining?: number;
}

/** Force IPv4 to avoid IPv6 timeouts in this environment. */
function httpRequest(
  method: string,
  url: string,
  opts: {
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<{ status: number; body: Buffer; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        family: 4,
        headers: {
          Accept: "application/json",
          "User-Agent": "Ichidoki v1.0 (https://ichidoki.example)",
          ...(opts.headers ?? {}),
        },
        timeout: opts.timeoutMs ?? 15000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks),
            headers: res.headers as Record<string, string | string[] | undefined>,
          });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("request timeout")));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function isConfigured(): boolean {
  return !!process.env.OPENSUBS_API_KEY;
}

/** Get JWT token (cached for 23h). Returns null if no user/pass configured. */
async function getAuthToken(): Promise<string | null> {
  if (!isConfigured()) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const user = process.env.OPENSUBS_USER;
  const pass = process.env.OPENSUBS_PASS;
  if (!user || !pass) {
    // Anonymous login (no body) — works for search but not download.
    try {
      const r = await httpRequest("POST", `${API_BASE}/login`, {
        headers: {
          "Api-Key": process.env.OPENSUBS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (r.status !== 200) {
        console.error("[opensubs] anon login failed:", r.status, r.body.toString("utf-8").slice(0, 200));
        return null;
      }
      const json = JSON.parse(r.body.toString("utf-8")) as OsLoginResponse;
      if (json.token) {
        cachedToken = { token: json.token, expiresAt: Date.now() + TOKEN_TTL_MS };
        return json.token;
      }
    } catch (e) {
      console.error("[opensubs] anon login error:", e);
      return null;
    }
    return null;
  }
  // Authenticated login
  try {
    const body = JSON.stringify({ username: user, password: pass });
    const r = await httpRequest("POST", `${API_BASE}/login`, {
      headers: {
        "Api-Key": process.env.OPENSUBS_API_KEY!,
        "Content-Type": "application/json",
        Authorization: "", // no Authorization header for initial login
      },
      body,
    });
    if (r.status !== 200) {
      console.error("[opensubs] login failed:", r.status, r.body.toString("utf-8").slice(0, 200));
      return null;
    }
    const json = JSON.parse(r.body.toString("utf-8")) as OsLoginResponse;
    if (json.token) {
      cachedToken = { token: json.token, expiresAt: Date.now() + TOKEN_TTL_MS };
      return json.token;
    }
  } catch (e) {
    console.error("[opensubs] login error:", e);
    return null;
  }
  return null;
}

/**
 * Look up the IMDB id for an anime via Jikan.
 * Jikan v4 returns external links; we parse the IMDB URL out of the
 * Wikipedia / external links if present. Returns just the numeric id.
 */
async function resolveImdbId(malId: number): Promise<string | null> {
  try {
    const r = await httpRequest(
      "GET",
      `https://api.jikan.moe/v4/anime/${malId}/external`,
      { timeoutMs: 8000 },
    );
    if (r.status !== 200) return null;
    const json = JSON.parse(r.body.toString("utf-8"));
    const links: Array<{ name?: string; url?: string }> = json?.data ?? [];
    for (const l of links) {
      const u = l.url ?? "";
      // Jikan v4 doesn't typically return IMDB directly, but check
      const m = u.match(/imdb\.com\/title\/(tt\d+)/i);
      if (m) return m[1];
    }
  } catch {
    // fall through
  }
  // Try the full anime resource — it sometimes has imdb_id in external
  try {
    const r = await httpRequest(
      "GET",
      `https://api.jikan.moe/v4/anime/${malId}/full`,
      { timeoutMs: 8000 },
    );
    if (r.status !== 200) return null;
    const json = JSON.parse(r.body.toString("utf-8"));
    // Jikan v4 doesn't expose IMDB id directly; we'd need TMDB lookup
    // For now, return null and use query-string search instead.
    void json;
  } catch {
    // fall through
  }
  return null;
}

/**
 * Search OpenSubtitles for English subtitles matching an anime episode.
 * Tries IMDB id first (most accurate), falls back to query string.
 *
 * @returns the best matching subtitle (highest download_count, no AI/machine translation),
 *          or null if none found.
 */
export async function searchSubtitle(opts: {
  malId: number;
  animeTitle: string;
  episode: number;
  season?: number;
}): Promise<OsSubtitle | null> {
  if (!isConfigured()) return null;
  const { malId, animeTitle, episode, season = 1 } = opts;

  const params = new URLSearchParams({
    languages: "en",
    episode: String(episode),
    season: String(season),
    order_by: "download_count",
    order_direction: "desc",
    ai_translated: "exclude",
    machine_translated: "exclude",
  });

  // Try IMDB id first
  const imdbId = await resolveImdbId(malId);
  if (imdbId) {
    params.set("imdb_id", imdbId);
  } else {
    // Fall back to query — use the english title
    params.set("query", animeTitle);
  }

  try {
    const r = await httpRequest("GET", `${API_BASE}/subtitles?${params.toString()}`, {
      headers: { "Api-Key": process.env.OPENSUBS_API_KEY! },
    });
    if (r.status !== 200) {
      console.error("[opensubs] search failed:", r.status, r.body.toString("utf-8").slice(0, 200));
      return null;
    }
    const json = JSON.parse(r.body.toString("utf-8")) as OsSearchResponse;
    const subs = json.data ?? [];
    if (subs.length === 0) return null;
    // Pick best: prefer hearing-impaired=false, highest download_count, trusted
    const scored = subs
      .filter((s) => s.attributes?.file_id)
      .map((s) => ({
        sub: s,
        score:
          (s.attributes?.download_count ?? 0) +
          (s.attributes?.from_trusted ? 1000 : 0) +
          (s.attributes?.hearing_impaired ? 0 : 500) +
          (s.attributes?.ratings ?? 0) * 100,
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.sub ?? null;
  } catch (e) {
    console.error("[opensubs] search error:", e);
    return null;
  }
}

/**
 * Download a subtitle file from OpenSubtitles and return the raw SRT/SSA/ASS text.
 *
 * Requires authenticated login (env OPENSUBS_USER + OPENSUBS_PASS).
 * Returns null if not configured, login fails, or download fails.
 */
async function downloadSubtitleRaw(fileId: number): Promise<Buffer | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error("[opensubs] no auth token — download requires OPENSUBS_USER + OPENSUBS_PASS");
    return null;
  }
  try {
    // 1. Request download link
    const r = await httpRequest("POST", `${API_BASE}/download`, {
      headers: {
        "Api-Key": process.env.OPENSUBS_API_KEY!,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (r.status !== 200) {
      console.error("[opensubs] download link failed:", r.status, r.body.toString("utf-8").slice(0, 200));
      return null;
    }
    const json = JSON.parse(r.body.toString("utf-8")) as OsDownloadResponse;
    if (!json.link) {
      console.error("[opensubs] no link in download response");
      return null;
    }
    // 2. Download the actual file (may be gzipped)
    const r2 = await httpRequest("GET", json.link, {
      headers: { Accept: "*/*" },
      timeoutMs: 30000,
    });
    if (r2.status !== 200) {
      console.error("[opensubs] file download failed:", r2.status);
      return null;
    }
    // If gzipped, decompress
    const enc = (r2.headers["content-encoding"] as string) ?? "";
    if (enc.includes("gzip")) {
      return zlib.gunzipSync(r2.body);
    }
    if (enc.includes("deflate")) {
      return zlib.inflateSync(r2.body);
    }
    return r2.body;
  } catch (e) {
    console.error("[opensubs] download error:", e);
    return null;
  }
}

/** Convert SRT timestamp "HH:MM:SS,mmm" to VTT "HH:MM:SS.mmm" */
function srtToVttTime(t: string): string {
  return t.replace(",", ".");
}

/**
 * Convert SRT (SubRip) to WebVTT.
 * - Replaces comma decimal separator with dot.
 * - Strips HI-only lines (parenthesized lines meant for hearing-impaired viewers).
 * - Strips <i>...</i> tags (kept simple).
 */
function srtToVtt(srt: string): string {
  const normalized = srt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  const cues: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    let timingLine = lines[0];
    let textStart = 1;
    if (!timingLine.includes("-->")) {
      if (lines.length < 2) continue;
      timingLine = lines[1];
      textStart = 2;
    }
    const m = timingLine.match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if (!m) continue;
    const start = srtToVttTime(m[1]);
    const end = srtToVttTime(m[2]);
    // Strip HI-only lines: lines that are entirely inside () or []
    const textLines = lines.slice(textStart).filter((l) => {
      const t = l.trim();
      if (/^\([\s\S]*\)$/.test(t)) return false;
      if (/^\[\s\S]*\]$/.test(t)) return false;
      return true;
    });
    if (textLines.length === 0) continue;
    const text = textLines.join("\n").replace(/<\/?[^>]+>/g, "");
    if (!text.trim()) continue;
    cues.push(`${start} --> ${end}\n${text}`);
  }
  return "WEBVTT\n\n" + cues.map((c) => c).join("\n\n") + "\n";
}

function cachePath(malId: number, episode: number): string {
  return path.join(CACHE_DIR, `${malId}_e${episode}.vtt`);
}

/**
 * Get a VTT subtitle for an anime episode, using OpenSubtitles as the source.
 *
 * Flow:
 *   1. Check disk cache (.opensubs-cache/{malId}_e{ep}.vtt). If exists, return it.
 *   2. Search OpenSubtitles for an English subtitle.
 *   3. Download the raw SRT, convert to VTT.
 *   4. Write to cache, return VTT.
 *
 * Returns null at any step where OpenSubtitles isn't configured or fails.
 * Caller should fall back to Jikan episode-title VTT generation in that case.
 */
export async function fetchOpenSubsVtt(opts: {
  malId: number;
  animeTitle: string;
  episode: number;
  season?: number;
}): Promise<string | null> {
  const { malId, animeTitle, episode, season = 1 } = opts;

  // 1. Disk cache
  try {
    const cached = await fs.readFile(cachePath(malId, episode), "utf-8");
    if (cached && cached.startsWith("WEBVTT")) {
      return cached;
    }
  } catch {
    // not cached
  }

  if (!isConfigured()) return null;

  // Also persist a record in the DB so we can audit what was fetched.
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {}

  // 2. Search
  const sub = await searchSubtitle({ malId, animeTitle, episode, season });
  if (!sub || !sub.attributes?.file_id) return null;

  // 3. Download
  const raw = await downloadSubtitleRaw(sub.attributes.file_id);
  if (!raw) return null;

  // 4. Convert SRT -> VTT
  let vtt: string;
  const text = raw.toString("utf-8");
  if (text.includes("WEBVTT")) {
    vtt = text;
  } else {
    vtt = srtToVtt(text);
  }

  // 5. Cache
  try {
    await fs.writeFile(cachePath(malId, episode), vtt, "utf-8");
  } catch (e) {
    console.error("[opensubs] cache write failed:", e);
  }

  return vtt;
}

/** Check whether OpenSubtitles is fully configured (API key + user/pass). */
export function isOpenSubsReady(): boolean {
  return (
    !!process.env.OPENSUBS_API_KEY &&
    !!process.env.OPENSUBS_USER &&
    !!process.env.OPENSUBS_PASS
  );
}

/** Check whether OpenSubtitles is partially configured (API key only — search works, download doesn't). */
export function isOpenSubsSearchOnly(): boolean {
  return (
    !!process.env.OPENSUBS_API_KEY &&
    (!process.env.OPENSUBS_USER || !process.env.OPENSUBS_PASS)
  );
}
