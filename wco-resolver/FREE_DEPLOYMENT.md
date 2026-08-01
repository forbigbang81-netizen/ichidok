# Free Deployment — No Purchase Required

## TL;DR
**All 1171 episodes are now watchable.** Episodes with archive.org sources play inline. Episodes needing the resolver show a gold **"Watch on WCOStream"** button that opens the episode in a new tab. For inline playback of ALL episodes, deploy the free resolver below.

---

## Option 1: Render Free Tier (Recommended — truly free, no credit card)

### Step 1: Push resolver to GitHub
```bash
cd wco-resolver
git init && git add -A && git commit -m "WCO resolver"
# Create a new repo at https://github.com/new named "wco-resolver"
git remote add origin https://github.com/YOUR_USERNAME/wco-resolver.git
git branch -M main && git push -u origin main
```

### Step 2: Deploy on Render (2 minutes)
1. Go to https://render.com → "Get Started" → "Sign up with GitHub"
2. Click "New +" → "Web Service"
3. Select your `wco-resolver` repo
4. Settings:
   - **Name**: `wco-resolver`
   - **Region**: Closest to you
   - **Runtime**: Docker (auto-detected)
   - **Instance Type**: Free (512MB RAM)
5. Click "Create Web Service"
6. Wait ~3-4 minutes for build (installs Playwright + Chromium)
7. Your URL: `https://wco-resolver.onrender.com`

### Step 3: Test the resolver
```bash
curl https://wco-resolver.onrender.com/health
# → {"ok": true, "slugs_dub": 1155, "slugs_sub": 1168}

curl https://wco-resolver.onrender.com/resolve-by-ep?ep=422&audio=dub
# → {"url": "https://e16.wcostream.com/getvid?evid=...", "expiresAt": ...}
```
**Note:** First request after 15 min idle takes ~60s (cold start). Subsequent requests take ~30-40s.

### Step 4: Set env var on Vercel
1. Go to https://vercel.com → your ichidok project → "Settings" → "Environment Variables"
2. Add: `NEXT_PUBLIC_WCO_RESOLVER_URL` = `https://wco-resolver.onrender.com`
3. Redeploy ichidok (Deployments → 3 dots → Redeploy)
4. Done! All 1171 episodes now play inline in 1080p HD.

---

## Option 2: Replit + UptimeRobot (Free, no cold starts)

### Step 1: Create Replit
1. Go to https://replit.com → "Create Repl"
2. Choose "Python" template
3. Upload all files from `wco-resolver/` folder
4. In `.replit` file, add:
   ```
   run = "python server.py"
   ```
5. Add `requirements.txt` content
6. Run `playwright install chromium` in the Replit shell
7. Click "Deploy" → "Deploy to Replit"
8. Your URL: `https://wco-resolver.YOUR_USERNAME.repl.co`

### Step 2: Keep it alive with UptimeRobot
1. Go to https://uptimerobot.com → "Add New Monitor"
2. Monitor Type: HTTP(s)
3. URL: `https://wco-resolver.YOUR_USERNAME.repl.co/health`
4. Monitoring Interval: 5 minutes
5. This pings the resolver every 5 min, preventing it from sleeping

### Step 3: Set env var on Vercel
Same as Render Step 4 above, but with your Replit URL.

---

## What happens without the resolver

| Episodes | Behavior |
|---|---|
| E1, E137-147, E506-513, E539-566, E995-1004 | Play inline from archive.org |
| E1001-1085 | Play inline from archive.org (DUB via SUB fallback) |
| E2-136, E148-421, E422-994, E1086-1171 | Show "Watch on WCOStream" button |

## What happens with the resolver

| Episodes | Behavior |
|---|---|
| ALL 1171 episodes (E1-1171) | Play inline in 1080p HD |

---

## Cost comparison

| Option | Cost | Cold starts | Setup time |
|---|---|---|---|
| Render Free | $0 | Yes (15 min idle → 60s start) | 5 min |
| Replit + UptimeRobot | $0 | No (kept alive by pings) | 10 min |
| Railway | $5/mo | No (always-on) | 5 min |
| Do nothing | $0 | N/A (fallback button) | 0 min |

**Recommendation:** Start with Render Free. If the cold starts annoy you, switch to Replit + UptimeRobot. The fallback button works immediately while you decide.
