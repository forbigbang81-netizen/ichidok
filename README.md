# Ichidoki — Anime Streaming Site

A mobile-first anime streaming app built with Next.js 16, TypeScript, Prisma, and Tailwind CSS.

## Features

- **Catalog** of 22 anime with real MAL metadata (scores, posters, synopses)
- **SUB/DUB toggle** — switch between Japanese audio with subtitles and English dub
- **Real English subtitles** — extracted from embedded ASS tracks in archive.org MKV files
- **Seasons tab** — browse related seasons/cours of a franchise
- **Continue Watching** — resume episodes from where you left off
- **Custom video player** — tap-to-toggle UI, seekable progress bar, speed/quality controls, fullscreen
- **Schedule** — current season anime by day of week
- **Search** — debounced search with trending chips
- **Library** — bookmarks, watch history, notifications
- **OpenSubtitles.com integration** — optional, for real dialogue subtitles via API

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM + SQLite
- **State**: Zustand
- **Video**: archive.org (MP4/MKV), YouTube embeds
- **Subtitles**: WebVTT (from ASS extraction, SRT conversion, or Jikan episode-title cues)

## Getting Started

```bash
# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the dev server
bun run dev
```

The site runs on `http://localhost:3000` (or the port shown in `.zscripts/dev.log`).

## Subtitle System

Subtitles are resolved in this order:

1. **Local VTT files** (`public/subtitles/{malId}_e{ep}.vtt`) — real dialogue subs
   - Smoking Behind the Supermarket: 12 episodes (extracted from Crunchyroll ASS)
   - Chainsaw Man S1: 12 episodes (extracted from GJM ASS)
   - Chainsaw Man Movie: Reze Arc: 1 episode (from user-provided Dropbox SRT)
2. **OpenSubtitles.com API** (if `OPENSUBS_API_KEY` env is set) — real dialogue subs on demand
3. **Jikan episode-title cues** — always available fallback (anime title, real MAL episode title, OP/ED markers)

### Extracting More Subtitles

```bash
# Convert an ASS file to VTT
python3 scripts/ass_to_vtt.py input.ass output.vtt

# Extract subtitles from an archive.org MKV
ffmpeg -i "https://archive.org/download/{collection}/{file}.mkv" -map 0:{stream} -c:s copy /tmp/sub.ass
python3 scripts/ass_to_vtt.py /tmp/sub.ass public/subtitles/{malId}_e{ep}.vtt
```

Then add to `src/lib/seed.ts`:
```ts
localSubtitlePattern: "/subtitles/{malId}_e{ep}.vtt",
```

## OpenSubtitles Integration (Optional)

To enable real dialogue subtitles for anime without local VTT files:

1. Register at [opensubtitles.com](https://www.opensubtitles.com/)
2. Create an API consumer at [/en/api/v1](https://www.opensubtitles.com/en/api/v1)
3. Add to `.env`:
   ```
   OPENSUBS_API_KEY=your_api_key
   OPENSUBS_USER=your_username
   OPENSUBS_PASS=your_password
   ```

Free tier: 100 downloads/day (cached after first play).

## Deployment

### Vercel (Recommended)

1. Push this repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` — Vercel Postgres or external DB URL
4. Deploy

The included `.github/workflows/deploy.yml` auto-deploys on every push to `main`.

### Auto-Commit

To automatically commit and push changes:

```bash
nohup ./scripts/auto-commit.sh > /tmp/auto-commit.log 2>&1 &
```

This watches for file changes every 30 seconds and commits+pushes automatically.

## Project Structure

```
src/
  app/
    api/              — API routes (catalog, jikan, auto-import, stream, subtitles, seasons, etc.)
    layout.tsx        — Root layout
    page.tsx          — Main page (mobile shell + view switching)
  components/
    ichidoki/         — App components (HomeView, VideoPlayer, AnimeDetailView, etc.)
    ui/               — shadcn/ui components
  lib/
    api/client.ts     — API client functions
    db.ts             — Prisma client
    opensubs.ts       — OpenSubtitles.com integration
    seed.ts           — Anime catalog + season groups + resolution functions
    utils.ts          — Utility functions
  store/
    app.ts            — Zustand store
public/
  subtitles/          — VTT subtitle files
scripts/
  ass_to_vtt.py       — ASS to VTT converter
  auto-commit.sh      — Git auto-commit watcher
prisma/
  schema.prisma       — Database schema
```

## Anime in Catalog

- Frieren: Beyond Journey's End (S1 + S2 + Golden Land Arc)
- Steins;Gate
- Bleach (2004) + Bleach: TYBW (Cours 1-4)
- Jujutsu Kaisen (S1 + S2 + Culling Game)
- Chainsaw Man (S1 + Reze Arc Movie)
- Gachiakuta (S1 + S2)
- Smoking Behind the Supermarket with You
- Cowboy Bebop
- Cyberpunk: Edgerunners
- Neon Genesis Evangelion + End of Evangelion + 1.0 + 3.0+1.0
- A Silent Voice
- Your Name
