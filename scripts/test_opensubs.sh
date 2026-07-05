#!/usr/bin/env bash
# Test OpenSubtitles integration end-to-end.
#
# Usage:
#   OPENSUBS_API_KEY=xxx OPENSUBS_USER=xxx OPENSUBS_PASS=xxx ./scripts/test_opensubs.sh
#
# Or set them in .env first, then run:
#   ./scripts/test_opensubs.sh

set -e

# Load .env if it exists
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "$OPENSUBS_API_KEY" ]; then
  echo "FAIL: OPENSUBS_API_KEY is not set."
  echo "  Get a free API key at https://www.opensubtitles.com/en/api/v1"
  echo "  Then either:"
  echo "    1. Add OPENSUBS_API_KEY=xxx OPENSUBS_USER=xxx OPENSUBS_PASS=xxx to .env"
  echo "    2. Or export them in your shell before running this script"
  exit 1
fi

echo "=== OpenSubtitles Integration Test ==="
echo "API Key: ${OPENSUBS_API_KEY:0:8}... (length: ${#OPENSUBS_API_KEY})"
echo "User: ${OPENSUBS_USER:-<not set>}"
echo "Pass: ${OPENSUBS_PASS:+<set>}${OPENSUBS_PASS:-<not set>}"
echo

# Test 1: Subtitle endpoint should now prefer OpenSubtitles
echo "--- Test 1: GET /api/subtitles?malId=52991&episode=1 (Frieren ep1) ---"
HEADERS=$(mktemp)
BODY=$(curl -s -D "$HEADERS" "http://localhost:3000/api/subtitles?malId=52991&episode=1")
SOURCE=$(grep -i "x-subtitle-source:" "$HEADERS" | tr -d '\r' | awk '{print $2}')
echo "Source: $SOURCE"
echo "Body length: $(echo "$BODY" | wc -c) bytes"
echo "First 5 lines:"
echo "$BODY" | head -8
echo

if [ "$SOURCE" = "opensubtitles" ]; then
  echo "PASS: OpenSubtitles returned real dialogue subtitles."
elif [ "$SOURCE" = "jikan-fallback" ]; then
  echo "WARN: OpenSubtitles was tried but returned nothing usable."
  echo "  Check dev.log for [opensubs] error messages."
  echo "  Common causes:"
  echo "    - Wrong username/password"
  echo "    - Daily download limit reached (20 anonymous, 100 authenticated)"
  echo "    - No English subtitle exists for this episode"
elif [ "$SOURCE" = "jikan-no-downloads-configured" ]; then
  echo "WARN: Only OPENSUBS_API_KEY is set; OPENSUBS_USER/PASS missing."
  echo "  Search works but downloads require authenticated login."
  echo "  Add OPENSUBS_USER and OPENSUBS_PASS to .env to enable downloads."
elif [ "$SOURCE" = "jikan" ]; then
  echo "INFO: OpenSubtitles not configured. Using Jikan episode-title cues."
  echo "  To enable real dialogue subs, set OPENSUBS_API_KEY in .env."
fi

echo
echo "--- Test 2: Cache directory ---"
ls -la .opensubs-cache/ 2>/dev/null || echo "(cache directory empty or doesn't exist yet)"

echo
echo "=== Done ==="
