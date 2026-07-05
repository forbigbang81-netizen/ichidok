# Task 3 — API Routes Builder

## Files created (12 routes)

| # | Route | File | Methods |
|---|-------|------|---------|
| 1 | `/api/catalog` | `src/app/api/catalog/route.ts` | GET (exports `ensureSeeded`) |
| 2 | `/api/jikan/[malId]` | `src/app/api/jikan/[malId]/route.ts` | GET |
| 3 | `/api/jikan/search` | `src/app/api/jikan/search/route.ts` | GET |
| 4 | `/api/auto-import` | `src/app/api/auto-import/route.ts` | GET |
| 5 | `/api/stream` | `src/app/api/stream/route.ts` | GET, OPTIONS |
| 6 | `/api/seed` | `src/app/api/seed/route.ts` | GET, POST |
| 7 | `/api/imports` | `src/app/api/imports/route.ts` | GET |
| 8 | `/api/imports/[id]` | `src/app/api/imports/[id]/route.ts` | GET, DELETE |
| 9 | `/api/history` | `src/app/api/history/route.ts` | GET, POST, DELETE |
| 10 | `/api/bookmarks` | `src/app/api/bookmarks/route.ts` | GET, POST, DELETE |
| 11 | `/api/notifications` | `src/app/api/notifications/route.ts` | GET, POST, PATCH |
| 12 | `/api/schedule` | `src/app/api/schedule/route.ts` | GET |

## Key implementation choices

- **`ensureSeeded()`** lives in `catalog/route.ts` and is re-exported to all other routes via `import { ensureSeeded } from "@/app/api/catalog/route"`. A module-level `seedPromise` lock ensures concurrent first-load requests share a single in-flight seeding pass, and Prisma `upsert` per anime avoids race conditions.
- **Auto-import** checks the DB cache first (`Import` table with `@@unique([malId, episode, audio])`). On cache miss it falls back to `resolveEpisodeUrl(seed, episode, audioMode)` from `@/lib/seed`. The `subtitleUrl` is returned even when no video source exists so the player can fall back to subtitle-only rendering. MKV / `needsProxy` URLs are wrapped as `/api/stream?url=<encoded>`; YouTube embed URLs (`collection === "youtube"`) are returned directly. Successful seed resolutions are upserted back into the `Import` cache.
- **Stream proxy** only allows `archive.org` (host allowlist). Uses 3 retries with exponential backoff (750ms × attempt) on network errors, 5xx, and 429. Mirrors `Range`, `Content-Range`, `Content-Length`, `Accept-Ranges`, `Content-Type`, `ETag`, `Last-Modified`, `Cache-Control`. Sends full CORS headers (`Access-Control-Allow-Origin: *` etc.) and handles `OPTIONS` preflight.
- **All routes** declare `export const dynamic = "force-dynamic"`.

## Verification

- `bun run lint` → exit 0
- Smoke tests via curl against the running dev server (all returned 200):
  - `GET /api/catalog?limit=2` → 25 anime seeded
  - `GET /api/jikan/52991` → anime detail
  - `GET /api/jikan/search?q=frieren` → search results
  - `GET /api/auto-import?malId=52991&episode=1&audio=sub` → resolved archive URL, persisted to cache
  - `GET /api/auto-import?malId=51009&episode=21&audio=sub` → MKV source wrapped via `/api/stream`
  - Second call to auto-import for 52991/1/sub → `source: "cache"`
  - `GET /api/imports` → 2 cached entries
  - `HEAD /api/stream?url=...archive.org...` → 200
  - `GET /api/bookmarks`, `/api/history`, `/api/notifications`, `/api/schedule`, `/api/seed` → all 200
