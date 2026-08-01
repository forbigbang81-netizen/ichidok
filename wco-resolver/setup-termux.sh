#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# WCO Resolver — Termux Phone Setup Script
# ═══════════════════════════════════════════════════════════════════════════
# Run this in Termux on your Android phone.
# It installs everything needed and starts the resolver + tunnel.
#
# Your phone's residential IP bypasses Cloudflare (datacenter IPs get blocked).
# A free Cloudflare Tunnel makes it publicly accessible.
#
# PREREQUISITE: Run `termux-setup-storage` first if you haven't.
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════"
echo "  WCO Resolver — Phone Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Install packages
echo "[1/5] Installing packages..."
pkg update -y >/dev/null 2>&1
pkg install -y python proot cloudflared git >/dev/null 2>&1
echo "  ✓ python, proot, cloudflared, git installed"

# Step 2: Install Playwright
echo "[2/5] Installing Playwright..."
pip install --upgrade pip >/dev/null 2>&1
pip install fastapi uvicorn playwright playwright-stealth >/dev/null 2>&1
echo "  ✓ Python packages installed"

# Step 3: Download resolver files
echo "[3/5] Downloading resolver files..."
mkdir -p ~/wco-resolver
cd ~/wco-resolver

# Download server.py, slugs.json, slugs_sub.json from ichidok repo
curl -sL "https://raw.githubusercontent.com/forbigbang81-netizen/ichidok/main/wco-resolver/server.py" -o server.py
curl -sL "https://raw.githubusercontent.com/forbigbang81-netizen/ichidok/main/wco-resolver/slugs.json" -o slugs.json
curl -sL "https://raw.githubusercontent.com/forbigbang81-netizen/ichidok/main/wco-resolver/slugs_sub.json" -o slugs_sub.json

if [ ! -s server.py ] || [ ! -s slugs.json ]; then
  echo "  ✗ Failed to download files. Check your internet connection."
  exit 1
fi
echo "  ✓ Resolver files downloaded ($(ls -la server.py slugs.json slugs_sub.json | wc -l) files)"

# Step 4: Install Chromium for Playwright
echo "[4/5] Installing Chromium (this takes ~2 minutes)..."
# In Termux, we use proot to run Chromium in a Linux-like environment
playwright install chromium 2>/dev/null || {
  echo "  ⚠ Standard install failed, trying alternative..."
  PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright playwright install chromium
}
echo "  ✓ Chromium installed"

# Step 5: Start the resolver + tunnel
echo "[5/5] Starting resolver and tunnel..."
echo ""
echo "═══════════════════════════════════════════════════"
echo "  STARTING SERVICES"
echo "═══════════════════════════════════════════════════"
echo ""
echo "1. Resolver server starting on port 8000..."
echo "2. Cloudflare tunnel starting (gives you a public URL)..."
echo ""
echo "═══════════════════════════════════════════════════"
echo "  YOUR TUNNEL URL WILL APPEAR BELOW"
echo "  (look for 'https://xxx-xxx-xxx.trycloudflare.com')"
echo "═══════════════════════════════════════════════════"
echo ""

# Start resolver in background
cd ~/wco-resolver
python -m uvicorn server:app --host 0.0.0.0 --port 8000 &
RESOLVER_PID=$!
sleep 5

# Start cloudflare tunnel in foreground (shows the URL)
cloudflared tunnel --url http://localhost:8000

# Cleanup when tunnel exits
kill $RESOLVER_PID 2>/dev/null
