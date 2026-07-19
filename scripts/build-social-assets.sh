#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
social_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/lgtm-social.XXXXXX")"
trap 'rm -rf "$social_tmp_dir"' EXIT

sips -s format png \
  "$repo_root/assets/social/og-lgtm.svg" \
  --out "$social_tmp_dir/background.png" >/dev/null

magick "$social_tmp_dir/background.png" \
  \( "$repo_root/game/src/assets/characters/paul-shipped-v1.webp" -resize 400x710 \) \
  -geometry +850-4 -composite \
  \( "$repo_root/game/src/assets/characters/odin-satisfied-v1.webp" -resize 385x684 \) \
  -geometry +620+43 -composite \
  \( "$repo_root/game/src/assets/characters/madi-delighted-v1.webp" -resize 365x649 \) \
  -geometry +826+50 -composite \
  -depth 8 \
  "$repo_root/game/public/og-lgtm.png"

sips -g pixelWidth -g pixelHeight "$repo_root/game/public/og-lgtm.png"
