#!/usr/bin/env bash
#
# CORTEX STARTER — copies the config, the skills and the job list into place.
#
# Refuses rather than overwrites: your edited cortex.yaml and your own Jobs.md
# are exactly the files you least want silently replaced on a re-run.
#
#   usage:  packages/starter/install.sh [--vault /path/to/vault] [--force]
#
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${KIT_DIR}/../.." && pwd)"
VAULT=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vault) VAULT="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "usage: install.sh [--vault /path/to/vault] [--force]" >&2; exit 64 ;;
  esac
done

place() {   # place <src> <dst> <label>
  local src="$1" dst="$2" label="$3"
  if [[ -e "$dst" && $FORCE -eq 0 ]]; then
    echo "skip   ${label} — already exists (--force to replace)"
    return
  fi
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
  echo "copied ${label}"
}

place "${KIT_DIR}/cortex.example.yaml" "${REPO_ROOT}/cortex.yaml" "cortex.yaml"

# Skills live beside the agent, not in the vault: they are code-adjacent config
# and they are versioned with the system, not with your notes.
for skill in "${KIT_DIR}"/skills/*/; do
  name="$(basename "$skill")"
  place "$skill" "${REPO_ROOT}/.claude/skills/${name}" ".claude/skills/${name}"
done

# The job list DOES live in the vault, because you edit it the way you edit a
# note and it belongs to you, not to the install.
if [[ -n "$VAULT" ]]; then
  if [[ ! -d "$VAULT" ]]; then
    echo "error: --vault path does not exist: $VAULT" >&2
    exit 66
  fi
  place "${KIT_DIR}/tasks/Jobs.md" "${VAULT}/00 Maps/Jobs.md" "<vault>/00 Maps/Jobs.md"
else
  echo "skip   Jobs.md — no --vault given; copy packages/starter/tasks/Jobs.md"
  echo "       into your vault's maps folder by hand"
fi

echo
echo "Next: open cortex.yaml and set owner.name and owner.timezone."
echo "Everything else has a working default."
