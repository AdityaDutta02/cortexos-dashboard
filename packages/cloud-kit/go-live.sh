#!/usr/bin/env bash
#
# CORTEX GO-LIVE — every configuration step between "local works" and "ready to
# deploy", done for you.
#
# This exists because the manual version was four fiddly edits in two files, and
# every one of them fails silently when it is wrong:
#
#   * `fly launch` OVERWRITES fly.toml with its own, throwing away the health
#     check path, the volume mount and always-on. We use `fly apps create`
#     instead, which claims a name and touches nothing.
#   * The app name in fly.toml must match the claimed name exactly. If it does
#     not, `fly deploy` targets an app that does not exist and reports success.
#   * The region must have VOLUME capacity, which you cannot know in advance.
#     So we try, read the failure, and move to the next region automatically.
#   * vault.adoption.cloud.yaml needs no edits at all, but it does need to be
#     in place before the build: the Dockerfile COPYs it from the build context,
#     and a missing one fails the build with a line nobody can act on.
#
# It does NOT commit anything. fly.toml, cortex.yaml and both adoption profiles
# are gitignored on purpose — they carry a vault path, a name and a timezone, so
# they are per-person by definition. `fly deploy` uploads the local directory as
# its build context, so the files being present locally is the whole requirement.
#
#   usage:  packages/cloud-kit/go-live.sh [--region xxx] [--dry-run]
#
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${KIT_DIR}/../.." && pwd)"
DRY_RUN=0
WANT_REGION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --region)  WANT_REGION="${2:-}"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  ok    %s\n' "$*"; }
info() { printf '  ...   %s\n' "$*"; }
die()  { printf '\n  STOP  %s\n\n' "$*" >&2; exit 1; }

run() {
  if [[ $DRY_RUN -eq 1 ]]; then printf '  would run: %s\n' "$*"; return 0; fi
  "$@"
}

# ── 1. Preflight ────────────────────────────────────────────────────────────
# Checked in the order that produces the most useful error. A missing CLI is a
# different problem from a CLI that is not logged in.
say "Checking your setup"

command -v fly >/dev/null 2>&1 \
  || die "The fly command is not installed. Install it, then run this again:
        brew install flyctl"

fly auth whoami >/dev/null 2>&1 \
  || die "You are not logged in to Fly. Run this, then try again:
        fly auth signup      (first time)
        fly auth login       (if you already have an account)"
ok "logged in as $(fly auth whoami 2>/dev/null)"

[[ -f "${REPO_ROOT}/fly.toml" ]] \
  || die "No fly.toml found. Run the cloud kit installer first:
        packages/cloud-kit/install.sh"
ok "cloud kit is in place"

# ── 2. Claim an app name ────────────────────────────────────────────────────
# `--generate-name` rather than asking the user to invent one: app names are
# globally unique across every Fly customer, so a chosen name is mostly a
# sequence of rejections. The generated one is guaranteed free.
say "Creating your app"

EXISTING_APP="$(grep -E '^app *= *"' "${REPO_ROOT}/fly.toml" | head -1 | sed -E 's/.*"(.*)".*/\1/' || true)"

if [[ -n "$EXISTING_APP" && "$EXISTING_APP" != "CHANGE-ME" ]] \
   && fly status -a "$EXISTING_APP" >/dev/null 2>&1; then
  APP="$EXISTING_APP"
  ok "already created: ${APP}"
elif [[ $DRY_RUN -eq 1 ]]; then
  APP="dry-run-app-name"
  info "would run: fly apps create --generate-name"
else
  # `--json` returns the entire app object, not a name. Parsed properly rather
  # than by regex: a sloppy match here puts a JSON blob into fly.toml and every
  # later command fails somewhere far away from the cause.
  CREATE_OUT="$(fly apps create --generate-name --json 2>&1)" || true
  APP="$(printf '%s' "$CREATE_OUT" | python3 -c '
import json, sys
raw = sys.stdin.read()
start = raw.find("{")
try:
    print(json.loads(raw[start:]).get("ID", "") if start >= 0 else "")
except Exception:
    print("")
' 2>/dev/null)"
  [[ -n "$APP" && "$APP" != "null" ]] || die "Could not create an app. Fly said:
${CREATE_OUT}"
  ok "created: ${APP}"
fi

# ── 3. Write the app name in ────────────────────────────────────────────────
# The single most expensive silent failure in this whole setup, done by machine
# so it cannot be mistyped.
say "Configuring fly.toml"

if [[ $DRY_RUN -eq 0 ]]; then
  perl -0pi -e "s/^app *= *\"[^\"]*\"/app = \"${APP}\"/m" "${REPO_ROOT}/fly.toml"
fi
ok "app = \"${APP}\""

# ── 4. Region, chosen by what actually works ────────────────────────────────
# Volume capacity is not visible ahead of time and the failure text does not say
# "full" — it says the app is using all available zones, on a brand new app with
# zero volumes. So: try, read, move on. This is the loop that replaces a lecture.
say "Creating your disk"

if [[ -n "$WANT_REGION" ]]; then
  REGIONS=("$WANT_REGION")
else
  # Ordered by rough population coverage, not preference. Any of them works;
  # the only thing that matters is that the volume and the machine agree.
  REGIONS=(sin bom sjc iad lhr fra syd)
fi

VOLUME_REGION=""
if fly volumes list -a "$APP" 2>/dev/null | grep -q cortex_data; then
  VOLUME_REGION="$(fly volumes list -a "$APP" 2>/dev/null | awk '/cortex_data/{print $6; exit}')"
  ok "disk already exists in ${VOLUME_REGION}"
elif [[ $DRY_RUN -eq 1 ]]; then
  VOLUME_REGION="${REGIONS[0]}"
  info "would try regions: ${REGIONS[*]}"
else
  # Only a capacity refusal is worth retrying elsewhere. Treating EVERY failure
  # as "region full" is how a bad app name or an expired login gets reported as
  # a Fly outage, sending someone away to wait an hour for a problem that is
  # sitting in front of them.
  VOL_ERR=""
  for region in "${REGIONS[@]}"; do
    info "trying ${region}"
    if VOL_ERR="$(fly volumes create cortex_data --size 10 --region "$region" -a "$APP" --yes 2>&1)"; then
      VOLUME_REGION="$region"
      ok "disk created in ${region}"
      break
    fi
    if printf '%s' "$VOL_ERR" | grep -qiE 'zones|capacity|no capacity|not available'; then
      info "${region} has no capacity right now — trying the next one"
      continue
    fi
    die "Creating the disk failed, and not because the region was full. Fly said:

${VOL_ERR}"
  done
  [[ -n "$VOLUME_REGION" ]] || die "Every region we tried is full. This is temporary and not your fault.
        Wait an hour and run this again, or pick one yourself:
        packages/cloud-kit/go-live.sh --region <code>"
fi

if [[ $DRY_RUN -eq 0 ]]; then
  perl -0pi -e "s/^primary_region *= *\"[^\"]*\"/primary_region = \"${VOLUME_REGION}\"/m" "${REPO_ROOT}/fly.toml"
fi
ok "primary_region = \"${VOLUME_REGION}\""

# ── 5. The cloud vault profile ──────────────────────────────────────────────
# Nothing in this file is edited. It ships with root: /data/vault, which is
# already correct — it exists only because the LOCAL profile points at a path on
# a laptop that does not exist inside a container.
say "Adding the cloud vault profile"

if [[ -f "${REPO_ROOT}/vault.adoption.cloud.yaml" ]]; then
  ok "already there"
else
  run cp "${KIT_DIR}/vault.adoption.cloud.example.yaml" "${REPO_ROOT}/vault.adoption.cloud.yaml"
  ok "copied (nothing in it needs changing)"
fi

# ── 6. What is left, which is only the secrets ──────────────────────────────
say "Done. One step left — your four secrets."

cat <<TEXT

  Copy this, fill in the four values, and run it:

    fly secrets set \\
      CORTEX_ACCESS_PASSWORD='pick-a-strong-password' \\
      CORTEX_VAULT_REPO='https://github.com/YOU/your-vault.git' \\
      CORTEX_GIT_TOKEN='the-github-token-from-module-5' \\
      CLAUDE_CODE_OAUTH_TOKEN='the-claude-token-from-module-3' \\
      -a ${APP}

  Then deploy:

    fly deploy -a ${APP}

  And open it:  https://${APP}.fly.dev

TEXT
