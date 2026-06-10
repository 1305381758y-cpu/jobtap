#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Missing GITHUB_TOKEN"
  exit 1
fi

echo "Syncing tracked files to GitHub deploy repository..."
node push-via-api.mjs
