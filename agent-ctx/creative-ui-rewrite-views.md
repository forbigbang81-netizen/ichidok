# Task — Creative UI Rewrite (5 Ichidoki views)

## Summary

Rewrote 5 Ichidoki anime streaming site components to match the new creative UI design system using utility classes from `globals.css` (`.glass-card`, `.glass-header`, `.gradient-text`, `.brand-gradient-bg`, `.brand-gradient-soft`, `.fade-in`, `.fade-in-stagger`, `.slide-up`, `.scale-in`, `.card-hover`, `.btn-press`, `.glow`, `.pulse-glow`, `.shimmer`, `.no-scrollbar`, etc.).

Accent color: gold→orange gradient (`#f5c518` → `#ff8a00`). Base: deep dark `#0a0a0f`. Mobile-first (`max-w-[480px]`). Animations 0.3-0.5s ease-out. No indigo or blue.

## Files rewritten

| # | File | Key design changes |
|---|------|--------------------|
| 1 | `src/components/ichidoki/AnimeDetailView.tsx` | Glass header with gradient back button · glass info card with gradient title · broadcast badge with `pulse-glow` if airing · custom `PillTabs` with sliding gradient indicator · glass episode buttons with hover lift and gradient active · countdown badges (yellow gradient / orange / green) · glass season cards with number badges · glass key-value DetailRow grid · `fade-in` on mount. |
| 2 | `src/components/ichidoki/ScheduleView.tsx` | Day selector glass pills with gradient active + today dot · staggered `CardGrid` entrance · "Week at a glance" glass overview with gradient number badges · gradient-text section header · creative empty state with `float-y` + `brand-gradient-soft` icon · `fade-in` on mount. |
| 3 | `src/components/ichidoki/SearchView.tsx` | Glass search bar with gradient focus ring (`glow` on focus + blurred gradient backdrop) · trending chips as glass pills with `hover:glow` · staggered `CardGrid` results · creative empty states (idle + no-results) with `float-y`, `pulse-glow`, gradient text · `fade-in` on mount. |
| 4 | `src/components/ichidoki/CatalogView.tsx` | Sort chips as glass pills with gradient active · glass collapsible filter panel with cubic-bezier height animation · `Chip` sub-component (glass → gradient active) · gradient "Load More" button with press effect and remaining-count badge · staggered CardGrid · creative empty state · `fade-in` on mount. |
| 5 | `src/components/ichidoki/LibraryView.tsx` | shadcn `Tabs` styled as glass pill bar with gradient active state · Continue Watching as glass `HistoryRowV2` with gradient progress bar (both overlay on thumb + inline) · Bookmarks staggered CardGrid with glass remove button (red hover) · Updates as glass `NotificationRowV2` with gradient unread dot + `pulse-glow` + "New" badge · unread count badge on Updates tab · gradient glass "Mark all read" and "Clear all" buttons · creative EmptyState with gradient text · `fade-in` on mount. |

## Functionality preserved (all 5 files)

All existing data fetching, store usage, API calls, state, effects, and event handlers were preserved exactly:

- **AnimeDetailView**: `fetchAnimeDetail` (stores `r.broadcast`), `/api/seasons` fetch with parallel `fetchAnimeDetail` for each season, `continueWatching` filter, `handleProgress`, `handleEnded`, `handleBookmarkToggle`, `getEpisodeAirStatus`, `getNextAirTime`, `useCountdownTick`. `VideoPlayer` import + usage unchanged. Tabs: Episodes / Continue (if history) / Seasons (if season group > 1) / Synopsis / Details. Episode buttons keep epStatus countdown badges (countdown / coming-soon / available).
- **ScheduleView**: `fetchSchedule` call, auto-select first day with anime if today is empty, day selector with counts, "Week at a glance" overview.
- **SearchView**: `searchAnime` with 350ms debounce, `touched`/`focused` state, autofocus, trending chips, idle + no-results empty states.
- **CatalogView**: `apiCatalog.custom` with sort/type/status/genre params, 200-limit fetch then client-side pagination (`limit` state, +24 on Load More), filter panel toggle, reset button, `hasActiveFilters` derived.
- **LibraryView**: `Promise.all([fetchHistory, fetchBookmarks, fetchNotifications])` on mount, re-fetch bookmarks when `bookmarks` array changes, `handleClearHistory` (confirm + `deleteHistory("all")`), `handleRemoveBookmark` (optimistic + `removeBookmark`), `handleMarkAllRead` (optimistic + `markNotificationsRead({ all: true })`).

## Shared imports (as required)

- `cn` from `@/lib/utils`
- `toast` from `sonner` (AnimeDetailView, LibraryView)
- Lucide icons only
- `AnimeCard`, `AnimeCardSkeleton`, `CardGrid` from `./AnimeCard` (all 4 list views)
- `VideoPlayer` from `./VideoPlayer` (AnimeDetailView only)
- `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs` (LibraryView)

## Lint & runtime verification

- `bun run lint` → **exit 0, no warnings, no errors** (cleaned up an unused `eslint-disable` directive in ScheduleView)
- `GET /` → **200 OK** (~30KB HTML), no compile errors
- `GET /api/catalog?type=all&limit=5` → 200 ✓
- `GET /api/jikan/search?q=bleach&limit=3` → 200 ✓

Pre-existing backend errors observed in `dev.log` (NOT related to this UI rewrite — they exist in API routes I did not touch):
- `GET /api/notifications` 500 — `db.notification.count is not a function` (Prisma client not regenerated)
- `GET /api/subtitles` 500 — `anime.episodes` undefined (route assumes nested shape)
- `GET /api/schedule` 500 — `SQLITE_ERROR: no such column: 0` (custom db wrapper issue in `src/lib/db.ts`)

These API failures cause the ScheduleView and LibraryView's notification tab to show empty/error states, but the components themselves render and animate correctly — they gracefully fall back to the creative empty states I built (gradient-text headers, `float-y` + `brand-gradient-soft` + `pulse-glow` icon blocks).

## Design system usage (per file)

### AnimeDetailView
- `.fade-in` on root
- `.glass-header` on sticky header, `.brand-gradient-bg` on back/bookmark buttons
- `.glass-card` on info section, synopsis, DetailRow, genre chips, continue/season rows
- `.gradient-text` on title, broadcast time, active continue/season labels
- `.brand-gradient-soft` on score badge, broadcast badge bg, season number badge
- `.pulse-glow` on broadcast badge when `isAiring`
- `.card-hover` + `.fade-in-stagger` on episode buttons, continue rows, season cards
- `.glow` on active bookmark button, active continue/season rows
- `.btn-press` on all buttons
- Custom `PillTabs` with `.tab-pill-indicator` sliding gradient

### ScheduleView
- `.fade-in` on root
- `.gradient-text` on section header, week-at-a-glance day counts
- `.glass-card` on count badge, empty state, week-at-a-glance panel
- `.brand-gradient-bg` on active day pill + today dot
- `.brand-gradient-soft` on empty-state icon disc + inactive week-glance cells
- `.fade-in-stagger` on day pills
- `.float-y` on empty-state icon
- `.btn-press` on day pills + week-glance cells
- `.no-scrollbar` on day selector

### SearchView
- `.fade-in` on root
- `.gradient-text` on section header, empty-state headlines
- `.glass-card` on search bar, trending chips, result-count badge, empty states
- `.glow` on focused search bar
- `.fade-in-stagger` + `.btn-press` on trending chips
- `.float-y` + `.pulse-glow` + `.brand-gradient-soft` on empty-state icon discs
- `.no-scrollbar` implied via CardGrid

### CatalogView
- `.fade-in` on root
- `.gradient-text` on section header, empty-state headline
- `.glass-card` on Filters button (inactive), sort chips (inactive), filter panel, Chip (inactive), empty state
- `.brand-gradient-bg` on active sort chip, active Chip, Filters button (when open/active), Load More button
- `.glow` on active states + Load More
- `.fade-in-stagger` + `.btn-press` on sort chips and Chips
- `.float-y` + `.brand-gradient-soft` on empty-state icon disc
- `.btn-press` + `hover:scale-105` on Load More

### LibraryView
- `.fade-in` on root
- `.gradient-text` on section header, EmptyState title
- shadcn `Tabs` with custom `data-[state=active]:brand-gradient-bg` styling → pill-style with gradient active
- `.glass-card` on TabsList, count badges, action buttons, HistoryRowV2, NotificationRowV2, remove button, EmptyState
- `.brand-gradient-bg` on Mark-all-read button, unread dot, "New" badge, unread count badge on tab
- `.card-hover` + `.fade-in-stagger` on history rows and notification rows
- `.glow` on unread notifications and Mark-all-read button
- `.pulse-glow` on unread dot and EmptyState icon disc
- `.brand-gradient-soft` on EmptyState icon disc
- `.float-y` on EmptyState icon
- `.btn-press` on all buttons
- `.skeleton-shimmer` on notification loading rows

## Notes for future agents

- All 5 components are `"use client"` and mobile-first (`max-w-[480px]` via the `.mobile-shell` wrapper in `page.tsx`).
- The `PillTabs` component in AnimeDetailView mirrors the one in `page.tsx` (same sliding gradient indicator pattern using `useLayoutEffect` to track `offsetLeft`/`offsetWidth`).
- LibraryView's `HistoryRowV2` and `NotificationRowV2` are local to LibraryView (not exported). The shared `HistoryRow` export from `AnimeCard.tsx` is left untouched.
- The pre-existing backend API errors (`/api/notifications`, `/api/subtitles`, `/api/schedule`) are out of scope for this UI rewrite but should be fixed in a separate backend task — they prevent the ScheduleView and LibraryView notifications from displaying real data.
