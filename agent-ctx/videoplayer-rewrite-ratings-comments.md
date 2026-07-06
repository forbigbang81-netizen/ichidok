# Task: VideoPlayer Rewrite + Rating & Comments UI

## Agent: code-rewriter (single-agent task)

## Files modified

| # | File | Lines | Summary |
|---|------|-------|---------|
| 1 | `src/components/ichidoki/VideoPlayer.tsx` | ~1170 | Full rewrite from scratch with fixed bottom controls layout + ambient backlight effect |
| 2 | `src/components/ichidoki/AnimeDetailView.tsx` | ~1200 | Preserved all existing functionality; added Rating section + Comments section below tabs |

## Database side-effect

Created missing `Rating` and `Comment` tables in the local SQLite DB
(`db/custom.db`) using a one-off `bun run` script. The Prisma schema
already declared both models — they just hadn't been pushed. Used
`CREATE TABLE IF NOT EXISTS` so re-running is safe.

## Task 1 — VideoPlayer.tsx changes

### The bug
The original player's bottom controls were in a container with
`pt-6` and a `glass-nav` background. When the video was small (or in
certain mobile aspect ratios), the controls visually appeared to float
in the middle of the screen rather than being anchored to the bottom
edge.

### The fix
- **All bottom controls are now in ONE `absolute bottom-0` container**
  with a `bg-gradient-to-t from-black/90 via-black/55 to-transparent`
  overlay (replaces the heavy `glass-nav` block).
- Inside that container, three stacked rows in this exact order:
  1. **Control buttons row** — play/pause, mute, inline time display,
     then right-aligned CC / AudioTracks / Settings / Fullscreen
  2. **Progress bar** — full width, gradient fill + buffered track +
     invisible range input for seeking + gradient thumb
  3. **Timestamp row** — current time (left) / duration (right)
- The top bar (`absolute top-0 z-30`) holds back button, title, and
  the SUB/DUB pill — unchanged from original.
- Center controls (`absolute inset-0 z-20 grid place-items-center`)
  hold the skip-10 / play-pause / skip+10 trio — only when visible.
- Always-present transparent click-catcher at `z-10` toggles UI on tap.

### Ambient backlight (NEW)
- A `pointer-events-none absolute -inset-8 z-0` div sits BEHIND the
  video, extending 8 units beyond the container on all sides.
- Its `background` is a `radial-gradient` and its `box-shadow` is a
  wide soft glow, both colored with `ambientColor`.
- A 16×9 offscreen canvas samples the video frame every 2 seconds via
  `drawImage` + `getImageData`. The average RGB is computed, near-black
  frames are skipped (luma < 0.08), and saturation is boosted ×1.15 so
  the glow reads as "mood" not "mud".
- Cross-origin videos (e.g. direct archive.org URLs) will taint the
  canvas — wrapped in `try/catch`, keeps the previous color. Same-origin
  proxy URLs (`/api/stream?url=...`) work fine.
- Color transitions use `transition-[background,box-shadow] duration-1000`
  for a smooth morph between scenes.

### Fullscreen mirror
- `mirrorStyle = isFullscreen ? "scaleX(-1)" : undefined` is applied to
  the video element AND every overlay (top bar, center controls, bottom
  container, subtitle overlay) so controls stay readable when the video
  is horizontally flipped.

### Preserved functionality (all from original)
- Props: `malId, episode, audioMode, poster, title, subtitle,
  resumePosition, onProgress, onEnded, onBack`
- `fetchVideoImport(malId, episode, audioMode)` for source resolution
- All 15 states: loading, error, isPlaying, currentTime, duration,
  buffered, controlsVisible, showSettings, showSubtitles, cues,
  activeCue, muted, audioTracks, activeAudioTrack, isFullscreen,
  subtitleSource (+ new `mirrored` and `ambientColor`)
- Auto-hide 10s timer (`HIDE_CONTROLS_MS`)
- `parseVtt()` VTT subtitle parser — **now exported** as named export
- Tap-to-toggle UI (transparent click-catcher at z-10)
- SUB/DUB toggle in top bar (shows when `hasSub || hasDub`)
- Settings menu (speed, quality, audio tracks, mirror)
- Seekable progress bar with buffered indicator + gradient thumb
- Fullscreen with `screen.orientation.lock('landscape')`
- YouTube iframe support (early-return branch)
- Resume position on `loadedmetadata` (prefers audio-switch position
  over the resumePosition prop)
- Switch audio mode preserves position via `audioSwitchPositionRef`
- Progress callback throttled to 5s via `lastProgressEmitRef`
- Audio tracks detection via `HTMLVideoElement.audioTracks`

## Task 2 — AnimeDetailView.tsx changes

### Rating section (below tabs, after Details)
- Section sits in its own `<section className="px-3">` AFTER the tab
  content div, BEFORE the comments section.
- 5 clickable star buttons (1-5). Hover sets `hoverRating`, click
  submits via `handleSubmitRating(star)`.
- **Gold→orange gradient fill** for filled stars via an inline SVG
  `<linearGradient id="starGradient">` def + `fill="url(#starGradient)"`
  + `stroke="url(#starGradient)"` on each filled `Star` icon.
- Fetches summary from `GET /api/ratings?malId=X` on mount and whenever
  `selectedMalId` changes. Summary shape: `{avg, count, rawAvg}` where
  `avg` is the 10-point score.
- On click: `POST /api/ratings { malId, rating }`, optimistic UI
  update, then refreshes summary from response.
- Shows "Thank you for rating!" toast on success; "Failed to submit
  rating" on error (rolls back the optimistic star).
- 10-point score displayed next to stars using `gradient-text` + orange
  glow text shadow.
- Voter count: "N people have rated" or "Be the first to rate".
- "You: N★" badge appears after submitting.

### Comments section (below ratings)
- Name input (default "Anonymous", maxLength 32).
- Textarea (maxLength 500, 3 rows, with live character counter).
- Submit button: gradient + Send icon, disabled while submitting or
  when text is empty. Posts to `POST /api/comments { malId, name, text }`.
- After successful POST, refetches `GET /api/comments?malId=X` to get
  the authoritative newest-first list, clears the textarea, shows
  "Comment posted" toast.
- Comments list: `max-h-96 overflow-y-auto` with custom scrollbar.
  Each comment shows:
  - Gradient circle avatar with first letter of name
  - Name (bold, orange glow text shadow)
  - `formatTimeAgo(createdAt)` (e.g. "5m ago", "3h ago", "2d ago")
  - Comment text (whitespace-pre-wrap, break-words)
- Empty state: dashed border placeholder with MessageCircle icon and
  "No comments yet — start the conversation."

### Helper functions added
- `formatTimeAgo(iso: string): string` — relative time formatter
  (just now / Nm / Nh / Nd / Nw / Nmo / Ny ago).

### Preserved functionality (all from original)
- All existing imports, state, effects, handlers, and JSX for:
  - Loading skeleton
  - "Anime not found" fallback
  - Sticky glass header with back + bookmark
  - Video player area with `glow-orange` wrapper
  - Anime info glass card (poster, title, score badge, genres,
    status/studio, broadcast countdown)
  - PillTabs with sliding indicator
  - All 5 tab content panels (episodes, continue, seasons, synopsis,
    details)
  - `DetailRow`, `PillTabs`, `getNextAirTime`, `formatCountdown`,
    `getEpisodeAirStatus`, `useCountdownTick` helpers

## Verification

- `bun run lint` → exit 0, no errors
- `GET /` → HTTP 200 (compiles successfully)
- `GET /api/ratings?malId=52991` → 200, returns `{avg, count, rawAvg}`
- `POST /api/ratings {malId, rating}` → 200, returns updated summary
- `GET /api/comments?malId=52991` → 200, returns `{comments: [...]}`
- `POST /api/comments {malId, name, text}` → 200, returns `{ok: true}`
- Pre-existing errors in `/api/notifications` and `/api/subtitles` are
  unrelated to this task (they were failing before any changes).

## Design system adherence

- `"use client"` directive at top of both files
- `cn` from `@/lib/utils` for class merging
- Lucide icons only (Star, MessageCircle, Send added to AnimeDetailView)
- `toast` from `sonner` for notifications
- No indigo or blue colors anywhere
- Orange glow text style: `textShadow: "0 0 8px rgba(255,138,0,0.5)"`
- Mobile-first `max-w-[480px]` (inherited from `.mobile-shell` in
  globals.css)
- `VideoPlayer` exports both `parseVtt` (named) and `VideoPlayer`
  (named) as required
