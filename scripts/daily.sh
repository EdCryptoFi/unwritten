#!/bin/bash
#
# The daily spend run, for launchd.
#
# Why this exists at all: the product tells a six-week story, and sixty transfers made in one
# sitting would all carry the same timestamp — the chain would contradict the narrative it is
# meant to corroborate. So the history has to accrue in real time, one day at a time.
#
# A missed day cannot be recovered. `spend.mts` is deterministic on `new Date()`, so there is no
# backfill: whatever did not happen today is simply absent from the chain forever. That is the
# reason this logs loudly and records its last success, rather than failing quietly like a
# well-behaved cron job.
#
# The signing key lives in .env.local on this machine and never leaves it, which is why this runs
# here under launchd rather than in CI.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$REPO/.daily.log"
LOCK="$REPO/.daily.lock"

export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

say() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" >>"$LOG"; }

# A manual run and the scheduled one must not sign at the same time: both would split coins from
# the same gas object and one would fail on a stale object version.
if ! mkdir "$LOCK" 2>/dev/null; then
  say "SKIP  another run holds the lock ($LOCK)"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# No local stamp. spend.mts asks the CHAIN whether today was already sent, which is the only
# guard two runners can agree on — and a stamp written for one plan blocked a later run with a
# different plan, which is how today's transfer was nearly lost.
TODAY="$(date -u '+%Y-%m-%d')"
say "START $TODAY"
if pnpm --dir "$REPO" -s exec tsx "$REPO/scripts/spend.mts" --commit >>"$LOG" 2>&1; then
  say "OK    $TODAY"
else
  code=$?
  # 0 is also returned when the chain says today is already done, so this is a real fault.
  # Loud on purpose. A silent failure costs a day of history that cannot be reconstructed.
  say "FAIL  $TODAY exit $code — this day is lost unless re-run before 00:00 UTC"
  osascript -e 'display notification "Unwritten: the daily spend run failed. That day of chain history cannot be recovered." with title "spend.mts failed"' 2>/dev/null
  exit "$code"
fi

# Keep the log readable rather than unbounded; a month of runs is what matters.
if [ "$(wc -l <"$LOG")" -gt 2000 ]; then
  tail -n 800 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
