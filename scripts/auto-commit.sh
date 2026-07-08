#!/usr/bin/env bash
# Auto-commit and push changes to git whenever project files change.
# Run in the background: nohup ./scripts/auto-commit.sh > /tmp/auto-commit.log 2>&1 &
#
# This watches for file changes every 30 seconds. When changes are detected,
# it stages all files, commits with a timestamp message, and pushes to origin.

set -e

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

INTERVAL=30  # seconds between checks

echo "[auto-commit] Watching $PROJECT_DIR for changes (every ${INTERVAL}s)..."

while true; do
  sleep "$INTERVAL"

  # Check if there are any changes (staged, unstaged, or untracked)
  if git diff --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    continue
  fi

  # Stage all changes
  git add -A

  # Generate commit message with timestamp
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  COMMIT_MSG="Auto-commit: $TIMESTAMP"

  # Commit
  if git diff --cached --quiet; then
    continue
  fi

  git commit -m "$COMMIT_MSG" --no-verify 2>/dev/null || true

  # Push if remote exists
  if git remote get-url origin &>/dev/null; then
    echo "[auto-commit] Pushing to origin..."
    git push origin main 2>/dev/null || echo "[auto-commit] Push failed (will retry next cycle)"
  else
    echo "[auto-commit] No remote 'origin' configured — commit saved locally only"
  fi

  echo "[auto-commit] Committed at $TIMESTAMP"
done
