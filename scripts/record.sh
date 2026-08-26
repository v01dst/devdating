#!/usr/bin/env bash
# Append a timestamped entry to records/YYYY-MM-DD/<category>.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CATEGORY="${1:-notes}"
shift || true
MESSAGE="${*:-}(no message)"

case "$CATEGORY" in
  fixes|tests|build|smoke|incidents|notes) ;;
  *) echo "Unknown category '$CATEGORY'. Use: fixes tests build smoke incidents notes" >&2; exit 1 ;;
esac

DIR="$ROOT/records/$(date -u +%F)"
mkdir -p "$DIR"
printf -- "- [%s] %s\n" "$(date -u +%T)" "$MESSAGE" >> "$DIR/$CATEGORY.md"
echo "Recorded to ${DIR#$ROOT/}/$CATEGORY.md"
