# HAnime Aesthetic Rewrite — Complete

## Task
Rewrite 10 Ichidoki UI files to match the HAnime app aesthetic: pure black background, minimal/no borders, clean typography, larger posters, full-width featured banner, simple icon-only bottom nav, vertical episode list, fast/snappy transitions, minimal visual noise, OLED-friendly dark mode.

## Files Rewritten

1. **`src/app/globals.css`** — Pure black (#000000) background. Removed ALL glass-card, glass-header, glass-nav, gradient-text, gradient-brand-bg, glow, glow-orange, pulse-glow, float-y, pulse-ring, animated-gradient, card-hover, btn-press, fade-in-stagger, slide-up, scale-in, slide-in-right, tab-pill-indicator, carousel-fade, text-glow, gradient-border, brand-gradient, brand-gradient-soft, text-shadow utilities. Kept only: `fade-in` (simple opacity), `no-scrollbar`, `shimmer`/`skeleton-shimmer`, `mobile-shell`, safe-area helpers, basic body styles, scrollbar styling, selection.

2. **`src/app/page.tsx`** — Pure black shell. Simple header: "ichidoki" logo text + search icon + bell icon (solid black, no glass). Type tabs: simple text tabs with gold underline indicator. Bottom nav: solid black, icon-only (5 icons), gold active state. Removed FAB. Removed PillTabs sliding gradient indicator. Removed NavBtn gradient/glow.

3. **`src/components/ichidoki/AnimeCard.tsx`** — No borders, no glass, no shadows. Poster with rounded-lg (8px). Score badge: small, top-right, gold text on semi-transparent black. Title below: white, 1 line, small. No hover effects (active:scale only). No staggered animations. CardGrid: simple `grid-cols-3 gap-2`. Kept `splitTitle` helper. Kept `HistoryRow`.

4. **`src/components/ichidoki/HomeView.tsx`** — Featured banner: full-width, NO rounded corners, gradient overlay at bottom only. Title + score on banner. "Continue Watching": horizontal scroll of thumbnails. "Top 10 on Ichidok": horizontal scroll with large rank numbers (outlined text) beside posters. "This Season", "Top Rated", "Upcoming": simple grid sections. Section headers: white text, small, with "See All" link. Surprise Me: simple gold text button on semi-transparent black. Removed gradient text, glow, parallax, 3D transforms, dot indicators vertical bar.

5. **`src/components/ichidoki/AnimeDetailView.tsx`** — Full-width video player (no rounded corners, no glow). Below player: anime title (white, bold), score (gold), info chips. Episode list: VERTICAL list (not grid) — each row has 16:9 thumbnail (left) + episode number/title (white) + play icon overlay + progress bar at bottom of thumbnail. Tabs: simple underline tabs (Episodes | Continue | Seasons | Synopsis | Details). No glass cards, no glow. Kept ALL functionality: countdown timers, broadcast, seasons, continue watching, next ep auto-play, bookmark toggle.

6. **`src/components/ichidoki/ScheduleView.tsx`** — Day selector: simple text tabs with gold underline. Grid of anime cards. Clean, minimal. Removed week-at-a-glance overview.

7. **`src/components/ichidoki/SearchView.tsx`** — Search bar: simple solid dark bg (#111111), no glass. Trending: simple text chips. Results: simple grid. Removed gradient focus ring, pulse-glow empty states.

8. **`src/components/ichidoki/CatalogView.tsx`** — Sort: simple text dropdown (ChevronDown/Up). Filters: simple expandable section. Results: simple grid. Load More: simple bordered button. Removed gradient pills, glow buttons.

9. **`src/components/ichidoki/LibraryView.tsx`** — Tabs: simple underline (Continue | Bookmarks | Updates). Continue Watching: vertical list with thumbnails. Bookmarks: simple grid. Updates: simple list. Removed shadcn Tabs component (replaced with custom underline tabs for consistency). Removed gradient pills, glow effects.

10. **`src/components/ichidoki/VideoPlayer.tsx`** — Kept ALL functionality: ambient backlight (now subtle — alpha 0.12, no blur boost), keyboard shortcuts (Space/K, ←/→, ↑/↓, F, M, C), `parseVtt` export, subtitles, audio tracks menu, settings menu (speed/quality/mirror), fullscreen, YouTube iframe fallback, volume HUD, resume position, audio mode switch with position preservation, next-episode auto-play countdown. Simplified control styling: solid black control bars (gradient overlays, no glass), simple white icons, GOLD progress bar, clean layout (controls row → progress bar → timestamp at bottom). No glow effects on buttons. Removed gradient spinner (now single-color gold), removed gradient text, removed brand-gradient-bg fills (replaced with white play button, gold progress).

## Key Design Decisions

- **Pure black (#000000)** everywhere — body, mobile-shell, header, nav, video player bg
- **Card background (#111111)** for chips, search bar, filter panels, notification rows
- **Gold (#f5c518) used SPARINGLY**: active nav icon, score badges, progress bars, active tab underline, active filter chips, "NEW" badge, broadcast countdown, surprise me text, next-ep countdown number
- **No borders** on cards (rounded-lg only), minimal borders elsewhere (white/5 or white/10 for tab separators)
- **No animations** except simple fade-in (0.2s) and active:scale transitions
- **No backdrop-blur, no will-change, no glassmorphism**
- **Mobile-first** max-w-[480px] maintained

## Verification

- `bun run lint` — passes with 0 errors, 0 warnings
- Dev server compiles successfully ("✓ Compiled in 233ms")
- Page renders (GET / returns 200)
- All API endpoints used by the UI return 200 (catalog, jikan, seasons, auto-import)

## Pre-existing Issues (NOT introduced by this rewrite)

- `/api/notifications` returns 500 — Prisma schema issue (`db.notification.count is not a function`). The `Notification` model likely needs `bun run db:push` or Prisma client regeneration.
- `/api/subtitles` returns 500 for some anime — `anime.episodes` is undefined in `ensureEpisodesCached`. Pre-existing backend bug.

These are backend/Prisma issues unrelated to the UI aesthetic rewrite.
