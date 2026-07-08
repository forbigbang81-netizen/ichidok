#!/usr/bin/env bash
# Auto-commit and push changes to git whenever project files change.
# Termux-ready version.
#
# Setup in Termux:
#   pkg install git
#   cd /storage/emulated/0/ichidoki  # or wherever your project is
#   git init  (if not already a repo)
#   git remote add origin https://github.com/YOUR_USERNAME/ichidoki.git
#   # Copy this script into the project folder, then:
#   chmod +x auto-commit.sh
#   nohup ./auto-commit.sh > auto-commit.log 2>&1 &
#
# To stop it:
#   pkill -f auto-commit.sh

# === CONFIG ===
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTERVAL=30  # seconds between checks
BRANCH="main"
# ==============

cd "$PROJECT_DIR" || exit 1

echo "[auto-commit] Watching $PROJECT_DIR for changes (every ${INTERVAL}s)..."
echo "[auto-commit] Branch: $BRANCH"
echo "[auto-commit] Press Ctrl+C to stop."

while true; do
  sleep "$INTERVAL"

  # Check if there are any changes (staged, unstaged, or untracked)
  if git diff --quiet HEAD -- 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    continue
  fi

  # Stage all changes
  git add -A

  # Skip if nothing staged after add
  if git diff --cached --quiet; then
    continue
  fi

  # Generate commit message with timestamp
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  COMMIT_MSG="Auto-commit: $TIMESTAMP"

  # Commit
  git commit -m "$COMMIT_MSG" --no-verify 2>/dev/null || true

  # Push if remote exists
  if git remote get-url origin &>/dev/null; then
    echo "[auto-commit] Pushing to origin..."
    if git push origin "$BRANCH" 2>/dev/null; then
      echo "[auto-commit] ✅ Committed and pushed at $TIMESTAMP"
    else
      echo "[auto-commit] ⚠️ Push failed (will retry next cycle)"
    fi
  else
    echo "[auto-commit] 📝 Committed locally at $TIMESTAMP (no remote configured)"
  fi
done
