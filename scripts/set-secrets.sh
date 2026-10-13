#!/bin/bash
#
# Pushes the values in .env.local to GitHub Actions secrets, for the daily spend workflow.
#
# Run it yourself rather than having an agent do it: this sends a signing key and a Walrus
# delegate key to a third party. The wallet holds a few SUI and exists for this demo, and the
# delegate key can write to the house's memory permanently — Walrus has no delete — so it is
# worth a deliberate keystroke.
#
# Only the names below are sent. SUI_GROCER_KEY, SUI_SUBS_KEY and TATUM_API_KEY_ALT stay local:
# the workflow does not need them, so they do not go.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f .env.local ] || { echo "no .env.local here"; exit 1; }

NEEDED=(
  TATUM_API_KEY TATUM_API_BASE
  SUI_NETWORK SUI_HOUSE_KEY SUI_HOUSE_ADDRESS
  SUI_GROCER_ADDRESS SUI_SUBS_ADDRESS SUI_FASTFOOD_ADDRESS
  MEMWAL_PRIVATE_KEY MEMWAL_ACCOUNT_ID MEMWAL_SERVER_URL
  SEED_VERSION
)

for name in "${NEEDED[@]}"; do
  value="$(grep "^${name}=" .env.local | head -1 | cut -d= -f2-)"
  if [ -z "$value" ]; then
    echo "  ✗ $name is not in .env.local"
    continue
  fi
  # --body, never an argument, so the value does not reach the shell history or the process list.
  printf '%s' "$value" | gh secret set "$name" --repo EdCryptoFi/unwritten
  echo "  ✓ $name"
done

echo
echo "Then arm it:  gh workflow run 'daily spend' --repo EdCryptoFi/unwritten"
echo "And watch it: gh run list --workflow 'daily spend' --repo EdCryptoFi/unwritten --limit 3"
