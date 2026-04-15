#!/usr/bin/env bash
# scripts/build-multica-server.sh
# Builds the multica Go server binary for the current platform
# and places it at build/multica-server for Electron packaging.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CABINET_ROOT="$(dirname "$SCRIPT_DIR")"
MULTICA_SERVER="${MULTICA_SERVER_SRC:-$CABINET_ROOT/../multica/server}"
OUTPUT="$CABINET_ROOT/build/multica-server"
MIGRATIONS_OUTPUT_DIR="$CABINET_ROOT/build/migrations"

# Default to current platform
GOOS="${GOOS:-$(go env GOOS)}"
GOARCH="${GOARCH:-$(go env GOARCH)}"

echo "Building multica-server for $GOOS/$GOARCH..."
echo "Source: $MULTICA_SERVER"
echo "Output: $OUTPUT"

mkdir -p "$(dirname "$OUTPUT")"
rm -rf "$MIGRATIONS_OUTPUT_DIR"
mkdir -p "$MIGRATIONS_OUTPUT_DIR"

cd "$MULTICA_SERVER"

CGO_ENABLED=1 GOOS="$GOOS" GOARCH="$GOARCH" \
  go build -trimpath -ldflags="-s -w" \
  -o "$OUTPUT" \
  ./cmd/server

chmod +x "$OUTPUT"
cp -R "$MULTICA_SERVER/migrations/." "$MIGRATIONS_OUTPUT_DIR/"

echo "Built successfully: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
echo "Bundled migrations: $MIGRATIONS_OUTPUT_DIR"
