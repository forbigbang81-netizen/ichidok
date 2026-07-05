# Subtitles Setup

Ichidoki supports real dialogue subtitles via **OpenSubtitles.com**. Without configuration, the player falls back to **episode-info cues** (title card, OP/ED markers, real MAL episode title) generated from Jikan.

## Two Tiers of Subtitles

| Source | What you get | Setup required |
|---|---|---|
| **OpenSubtitles.com** | Real English dialogue subtitles synced to the audio | Free OpenSubtitles account + API key (see below) |
| **Jikan episode-info** | Anime title, real MAL episode title, OP/ED/main-story markers — timed to standard 24-min structure | None — always available |

The CC button tooltip in the player tells you which source is active.

## Enabling OpenSubtitles.com

### Step 1 — Register at OpenSubtitles.com

1. Go to <https://www.opensubtitles.com/accounts/signup/>
2. Create a free account (username + password)
3. Confirm via the email they send

### Step 2 — Create an API consumer

1. Sign in at <https://www.opensubtitles.com/>
2. Go to **Consumers** → <https://www.opensubtitles.com/en/api/v1>
3. Click **New consumer**
4. Fill in:
   - **Application name**: `Ichidoki` (or anything)
   - **Application description**: `Anime streaming site subtitle integration`
   - **Website**: leave blank or your own URL
5. Submit — you'll get an **Api-Key** (long alphanumeric string)

### Step 3 — Add credentials to `.env`

Copy `.env.example` to `.env` and fill in:

```bash
OPENSUBS_API_KEY=your_api_key_here
OPENSUBS_USER=your_opensubtitles_username
OPENSUBS_PASS=your_opensubtitles_password
```

Restart the dev server (`bun run dev`) so the env vars are picked up.

### Step 4 — Test

```bash
./scripts/test_opensubs.sh
```

You should see:

```
PASS: OpenSubtitles returned real dialogue subtitles.
```

The CC button tooltip in the player will now say:
> Subtitles from OpenSubtitles (real dialogue)

## Free Tier Limits

OpenSubtitles.com free accounts get:

- **Search**: unlimited (1 req/sec)
- **Download**: 100/day authenticated, 20/day anonymous

Once a subtitle is downloaded, it's cached to `.opensubs-cache/` so subsequent plays of the same episode don't count against your daily quota.

## How It Works

When the player requests subtitles for an episode:

1. **OpenSubtitles search** — `/api/subtitles` searches OpenSubtitles.com by IMDB id (resolved via Jikan) or by anime title + season + episode.
2. **Pick best match** — Highest download count, trusted uploader, no AI/machine translation, prefer non-hearing-impaired.
3. **Download** — POST `/api/v1/download` with the file_id, get a temporary download link, fetch the raw SRT.
4. **Convert SRT → VTT** — Replace comma decimal separator with dot, strip HI-only lines (`[...]` and `(...)`), strip HTML tags.
5. **Cache** — Write to `.opensubs-cache/{malId}_e{ep}.vtt`.
6. **Return** with `X-Subtitle-Source: opensubtitles` header.

If any step fails, the endpoint falls back to Jikan episode-info VTT generation.

## Override Path (Custom Subtitles)

To use your own subtitle file for a specific anime episode:

1. Drop the `.vtt` file at `public/subtitles/{malId}_e{ep}.vtt`
2. Open `src/lib/seed.ts` and add to that anime's entry:

   ```ts
   localSubtitlePattern: "/subtitles/52991_e{ep}.vtt",
   ```

3. The player will use your file directly, bypassing OpenSubtitles and Jikan.

## Troubleshooting

### `x-subtitle-source: jikan-fallback`

OpenSubtitles was tried but returned nothing usable. Causes:
- Daily download limit reached
- Wrong username/password in `.env`
- No English subtitle exists for that episode on OpenSubtitles
- Network error reaching OpenSubtitles

Check `dev.log` for `[opensubs]` errors.

### `x-subtitle-source: jikan-no-downloads-configured`

You set `OPENSUBS_API_KEY` but not `OPENSUBS_USER`/`OPENSUBS_PASS`. Search works (so we know a subtitle exists) but downloads require authenticated login. Add your username and password to `.env`.

### `x-subtitle-source: jikan`

OpenSubtitles is not configured at all. The player is using Jikan episode-info cues (anime title, real MAL episode title, OP/ED markers). To get real dialogue subtitles, follow the setup above.

### Subtitles are out of sync

OpenSubtitles subtitles are timed to specific video releases (e.g. `Frieren.Beyond.Journeys.End.S01E01.JAPANESE.WEBRip.NF`). If the archive.org MP4 we're streaming is from a different release, the timing may be slightly off (typically by a few seconds due to different OP/ED lengths).

The picker prefers high-download-count subtitles from trusted uploaders, which usually match common releases. If sync is off, you can override with a manual file (see above).
