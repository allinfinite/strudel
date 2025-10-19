#!/usr/bin/env bash
set -euo pipefail

# Build the website package
pnpm --filter website run build

ROOT="$(pwd)"
SRC_DIR="$ROOT/website/dist"
OUT_DIR="$ROOT/.vercel/output"
STATIC_DIR="$OUT_DIR/static"

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: Built directory not found: $SRC_DIR" >&2
  exit 1
fi

mkdir -p "$STATIC_DIR"
cp -R "$SRC_DIR"/. "$STATIC_DIR"

mkdir -p "$OUT_DIR"
echo '{"version":3}' > "$OUT_DIR/config.json"

echo "Build Output API prepared at $OUT_DIR"

