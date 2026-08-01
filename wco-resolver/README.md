# WCO Stream Resolver

Resolves wcostream.tv video URLs by bypassing Cloudflare Turnstile with
Playwright + stealth. Designed to run on Railway / Render / Fly.io / any VPS.

## Deploy on Railway (recommended — $5/mo, always-on)

1. Push the `wco-resolver/` folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo, set root directory to `wco-resolver`
4. Railway auto-detects the Dockerfile and deploys
5. Add a custom domain or use the auto-generated URL:
   `https://wco-resolver-xxxx.up.railway.app`
6. Test: `curl https://wco-resolver-xxxx.up.railway.app/health`

## Deploy on Render (free tier available, but cold starts)

1. Push `wco-resolver/` to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect repo, set root directory to `wco-resolver`
4. Select "Docker" environment
5. Choose instance type (free: 512MB, paid: 2GB+)
6. Deploy → get URL: `https://wco-resolver.onrender.com`

## Deploy on Fly.io

```bash
cd wco-resolver
fly launch --no-deploy
fly deploy
```

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /resolve?slug=one-piece-episode-422-english-dubbed` | Resolve a slug to a video URL |
| `GET /resolve-by-ep?ep=422` | Resolve by episode number (uses slug map) |
| `GET /health` | Health check |
| `GET /slugs` | Full slug map (732 episodes) |

## Response

```json
{
  "url": "https://e02.wcostream.com/getvid?evid=qUP-ALy6_...",
  "expiresAt": 1785538260
}
```

## Caching

- Resolved URLs are cached for 40 seconds (tokens expire in ~60s)
- Max 2 concurrent resolutions (memory-limited)
- Browser instance is reused across requests

## Memory

- ~500MB RAM with 1 browser instance
- Works on Railway's $5/mo plan (512MB, may need 1GB for stability)
- Render free tier (512MB) works but has cold starts after 15min idle
