#!/bin/bash
# Installs the daily spend LaunchAgent for THIS checkout. The committed plist holds __REPO__ instead
# of an absolute path, so no machine's username is published and any checkout can install it.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HOME/Library/LaunchAgents/com.unwritten.daily-spend.plist"
sed "s#__REPO__#${REPO}#g" "$REPO/scripts/com.unwritten.daily-spend.plist" > "$DEST"
plutil -lint "$DEST"
launchctl bootout "gui/$(id -u)/com.unwritten.daily-spend" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "installed: $DEST"
