#!/bin/bash
# bash, not sh: `wait -n` is a bash builtin and `/bin/sh` on Debian is dash,
# where it does not exist. Under dash this script would fail at the last line —
# after both processes had started and the container looked healthy.
#
# Two processes, one container, and a hard rule: if either dies, the container
# dies. Fly restarts it. The alternative — a supervisor that keeps the survivor
# alive — produces a machine that passes its health check while half the system
# is gone, which is worse than being down, because nobody gets paged for it.
set -eu

: "${WEB_PORT:=3000}"
: "${CORTEX_PORT:=8787}"

# The volume is empty on a fresh machine. The agent clones the vault into
# CORTEX_VAULT_ROOT itself (cloud/provision.ts) before it boots; these are the
# directories that must simply exist first.
mkdir -p "${CORTEX_STATE_DIR:-/data/pipeline}" "$(dirname "${CORTEX_STATE_DB:-/data/cortex.db}")" \
         "${npm_config_cache:-/data/npm-cache}"

# Identify commits made by the machine. Without this, `git commit` on a fresh
# container fails outright with "please tell me who you are" — and it fails at
# the moment of the first write, long after boot looked successful.
git config --global user.email "${CORTEX_GIT_EMAIL:-cortex@localhost}"
git config --global user.name "${CORTEX_GIT_NAME:-CORTEX}"
# The volume is owned by root but git refuses to operate on a repo it considers
# owned by someone else; on Fly that check fires after a volume restore.
git config --global --add safe.directory "${CORTEX_VAULT_ROOT:-/data/vault}"
# The skills snapshot is a second checkout on the same volume and hits the same
# ownership check. Without this its clone succeeds and every later refresh fails.
git config --global --add safe.directory "${CORTEX_SKILLS_ROOT:-/data/skills}"

echo "starting dashboard on :${WEB_PORT}"
PORT="${WEB_PORT}" HOSTNAME=127.0.0.1 node /app/web/packages/dashboard/server.js &
web_pid=$!

echo "starting agent on :${CORTEX_PORT}"
node /app/agent/dist/index.js &
agent_pid=$!

# Exit as soon as either child exits, carrying its status out.
wait -n "$web_pid" "$agent_pid"
status=$?
echo "a process exited (status ${status}) — stopping the container"
kill "$web_pid" "$agent_pid" 2>/dev/null || true
exit "$status"
