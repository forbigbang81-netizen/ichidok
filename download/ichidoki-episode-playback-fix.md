# Ichidoki — Episode Playback Bug Fix

## Summary

Episodes fail to play on https://ichidoki.space-z.ai/. The `<video>` element
ends up in a disabled `Unable to play media.` state. Root cause is a single
mis-placed attribute on the video element that forces a CORS request against
an archive.org CDN that does not return CORS headers on the final redirect
target.

The fix is a one-line change in the `VideoPlayer` component.

---

## Root Cause

The `<video>` element in the `VideoPlayer` component is rendered with
`crossOrigin="anonymous"`:

```tsx
<video
  ref={videoRef}
  src={src}
  poster={poster}
  preload="metadata"
  crossOrigin="anonymous"   // <-- THIS IS THE BUG
  className="w-full h-full object-contain bg-black transition-transform duration-300"
  onClick={...}
  onTimeUpdate={...}
  onLoadedMetadata={...}
  ...
/>
```

### Why this breaks playback

1. The episode URL returned by `/api/auto-import` points to
   `https://archive.org/download/<collection>/<file>.mp4` — which returns a
   **302 redirect** to a CDN host like
   `https://ia801906.us.archive.org/3/items/<collection>/<file>.mp4`.

2. The redirect response from `archive.org/download/...` does include
   `Access-Control-Allow-Origin: *`, so the first hop passes CORS.

3. **The CDN host (`ia801906.us.archive.org`) does NOT return any
   `Access-Control-Allow-Origin` header.** Verified by direct curl:

   ```bash
   $ curl -sI -H "Origin: https://ichidoki.space-z.ai" \
     "https://ia801906.us.archive.org/3/items/frieren-beyond-journeys-end_1080p_2024/Frieren-Beyond-Journey's-End_S01E01.mp4"

   HTTP/2 200
   server: nginx/1.31.1
   content-type: video/mp4
   content-length: 155054331
   ...
   # NO Access-Control-Allow-Origin header
   ```

4. Per the Fetch / CORS spec, when `crossOrigin="anonymous"` is set on a
   media element, **every** response in the redirect chain must include
   valid CORS headers. If any hop is missing them, the resource is rejected
   and the media element transitions to `HTMLMediaElement.error` with
   `MEDIA_ERR_SRC_NOT_SUPPORTED`, which the accessibility tree surfaces as
   `Video "Unable to play media." [disabled]`.

5. Removing `crossOrigin` from the element makes the request a plain
   no-CORS media fetch, which the browser allows for `<video>` playback
   regardless of the response headers. The 155 MB MP4 then plays normally.

### Why `crossOrigin` was probably added

Looking at the rest of the component, `crossOrigin="anonymous"` was likely
added to enable:

- `video.audioTracks` manipulation for SUB/DUB switching.
- `video.textTracks` for subtitle display.
- Possibly canvas frame capture (not currently used).

None of those features actually require `crossOrigin` to be set. The
`audioTracks` / `textTracks` APIs work on same-origin or no-CORS media
loaded into the same browsing context. `crossOrigin` is only required when
you want to **read pixel data** from the media (e.g. `canvas.drawImage(video)`
followed by `getImageData`) or process it through Web Audio API. The
current component does neither.

---

## The Fix

### File to edit

Find the `VideoPlayer` component. In a typical Next.js + shadcn project
structure it is one of:

- `components/video-player.tsx`
- `components/VideoPlayer.tsx`
- `components/anime/video-player.tsx`
- `components/player.tsx`

You can locate it by searching the repo for `crossOrigin` or for the
`preload="metadata"` + `aspect-video` combo:

```bash
rg -n 'crossOrigin|"anonymous"' --type tsx
rg -n 'preload="metadata"' --type tsx
```

### Change

```diff
  <video
    ref={videoRef}
    src={src}
    poster={poster}
    preload="metadata"
-   crossOrigin="anonymous"
    className="w-full h-full object-contain bg-black transition-transform duration-300"
    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
    onTimeUpdate={...}
    onLoadedMetadata={...}
    ...
  />
```

That single line removal is the entire fix.

### Result

- Episodes load and play immediately.
- SUB/DUB switching via `audioTracks` continues to work (when the source
  MP4 actually contains multiple audio tracks).
- Subtitle `<track>` continues to work.
- The "Unable to play media." disabled state disappears.

---

## Secondary issue (not blocking, but worth fixing)

The `/api/auto-import` endpoint is called **twice** on every episode open
(see network trace: two identical fetches within ~3 ms of each other).

Cause is in the detail-view component:

```tsx
const loadVideo = useCallback(async () => { /* ... */ }, [
  malId, episode, audioMode, anime?.status
]);
useEffect(() => { loadVideo(); }, [loadVideo]);
```

On first mount, `anime` is `null` so `anime?.status` is `undefined`. After
the Jikan fetch resolves, `anime.status` becomes e.g. `"Finished Airing"`.
That changes the dependency array, recreates `loadVideo`, and re-runs the
effect — producing the second API call.

### Recommended fix

Drop `anime?.status` from the dependency array and handle the "not yet
aired" branch inside the callback via a ref, or split into two effects:

```tsx
const loadVideo = useCallback(async () => {
  if (!malId || !episode) return;
  // ... existing logic, but read anime.status from a ref instead of closure
}, [malId, episode, audioMode]);

const statusRef = useRef<string | undefined>(undefined);
useEffect(() => { statusRef.current = anime?.status; }, [anime?.status]);
useEffect(() => { loadVideo(); }, [loadVideo]);
```

This is an optimization — it does not affect playback. Apply it after
verifying the `crossOrigin` fix works.

---

## Verification steps after deploying

1. Open `https://ichidoki.space-z.ai/` in a fresh tab.
2. Click any anime (e.g. *Frieren: Beyond Journey's End*).
3. Click the Play button.
4. Confirm the video begins loading and playing (you should see the
   buffer bar fill and the play icon flip to pause).
5. Open DevTools → Network → filter by `mp4`. You should see a single
   request to `archive.org/download/...` that 302-redirects to
   `iaXXX.us.archive.org/...` with status 200 and a long Content-Length.
   The request should be `sec-fetch-mode: no-cors` (NOT `cors`).
6. Open DevTools → Console. There should be no CORS errors.
7. Repeat with a couple of other anime (Steins;Gate, Attack on Titan) to
   confirm the fix is general, not specific to one title.

---

## Why not "fix it server-side" by proxying the video?

You could route video requests through your own Next.js API (e.g.
`/api/stream?malId=...&episode=...`) that fetches from archive.org and
re-adds CORS headers. That works, but:

- It egresses every byte of video through your server (≈ 155 MB per
  episode), blowing up your bandwidth and Cloud Function / Vercel
  invocation costs.
- It introduces a new point of failure and latency.
- It is unnecessary, because `<video>` does not need CORS for plain
  playback.

Removing `crossOrigin` is the correct, minimal fix. Only add a proxy if
you later need pixel-level access to the video (thumbnails, watermarking,
Web Audio analysis, etc.).

---

## Quick reference

| Item | Value |
|------|-------|
| Site | `https://ichidoki.space-z.ai/` |
| Symptom | `<video>` shows `Unable to play media.` and is `[disabled]` |
| Failing request | `https://ia801906.us.archive.org/3/items/.../...mp4` |
| Missing header | `Access-Control-Allow-Origin` on the CDN response |
| Trigger | `crossOrigin="anonymous"` on the `<video>` element |
| Fix | Remove the `crossOrigin` attribute |
| File | `VideoPlayer` component (search the repo for `crossOrigin`) |
| Risk | None — `audioTracks` / `textTracks` / `<track>` continue to work |
