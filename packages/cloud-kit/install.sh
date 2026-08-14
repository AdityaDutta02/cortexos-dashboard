#!/usr/bin/env bash
#
# CORTEX CLOUD KIT — copies the cloud build files into your repo root.
#
# This is the Module 5 step: it ADDS files, it changes nothing that already
# works. Your local setup keeps running exactly as it did before and after.
#
# It refuses rather than overwrites. If a file is already there you get told,
# and you decide — a silent overwrite of a Dockerfile someone had already
# customised is the kind of "help" that costs an afternoon.
#
#   usage:  packages/cloud-kit/install.sh [--force]
#
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${KIT_DIR}/../.." && pwd)"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

# source-in-kit  ->  destination-relative-to-repo-root
#
# start.sh keeps its docker/ subdirectory: the Dockerfile's COPY line names that
# path, and moving one without the other produces an image that builds and then
# has no entrypoint.
FILES=(
  "Dockerfile:Dockerfile"
  "fly.toml:fly.toml"
  "dockerignore:.dockerignore"
  "start.sh:docker/start.sh"
  "vault.adoption.cloud.example.yaml:vault.adoption.cloud.example.yaml"
)

copied=0
skipped=0

for pair in "${FILES[@]}"; do
  src="${KIT_DIR}/${pair%%:*}"
  dst="${REPO_ROOT}/${pair##*:}"

  if [[ ! -f "$src" ]]; then
    echo "error: kit is incomplete, missing ${pair%%:*}" >&2
    exit 1
  fi

  if [[ -e "$dst" && $FORCE -eq 0 ]]; then
    echo "skip   ${pair##*:} — already exists (re-run with --force to replace)"
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  # start.sh must be executable AND must be run by bash, not sh: `wait -n` is a
  # bash builtin, and under dash the script fails on its last line — after both
  # processes have started and the container already looks healthy.
  [[ "$dst" == *start.sh ]] && chmod +x "$dst"
  echo "copied ${pair##*:}"
  copied=$((copied + 1))
done

echo
echo "cloud kit: ${copied} copied, ${skipped} skipped"
echo
echo "Before you deploy, three of these need YOUR values — none has a default"
echo "that is right for you, and each fails differently if it is wrong:"
echo
echo "  fly.toml            app        = the name fly launch actually claimed"
echo "  fly.toml            primary_region = a region with VOLUME capacity"
echo "  vault.adoption.cloud.yaml      copy the .example, keep root: /data/vault"
echo
echo "Then: fly secrets set ...   (see fly.toml for the list) — before the first deploy."
