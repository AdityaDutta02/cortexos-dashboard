#!/usr/bin/env bash
#
# CORTEX CHECKUP — the weekly look at your graph, in plain English.
#
# `cortex-engine audit` already produces this data. What it does not produce is
# a reason to care: seven raw counts in JSON tell you nothing about which ones
# matter or what to do next. This wraps it so a weekly check is a command and a
# read, not an interpretation exercise.
#
# Nothing here writes to your vault. Every fix is something you do yourself, in
# Obsidian, on a note — which is the same rule as the rest of the system.
#
#   usage:  packages/starter/checkup.sh [--vault /path/to/vault]
#
set -euo pipefail

VAULT="${CORTEX_VAULT:-}"
[[ "${1:-}" == "--vault" ]] && VAULT="${2:-}"

command -v cortex-engine >/dev/null 2>&1 || {
  echo "The cortex-engine command is not on your PATH. Run:" >&2
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\"" >&2
  exit 1
}

[[ -n "$VAULT" ]] || {
  echo "Point this at your vault, either way round:" >&2
  echo "    export CORTEX_VAULT=\"/path/to/your/vault\"" >&2
  echo "    packages/starter/checkup.sh --vault /path/to/your/vault" >&2
  exit 1
}

REPORT="$(CORTEX_VAULT="$VAULT" cortex-engine --json audit 2>/dev/null)"

# Parsed in python rather than jq: jq is not installed by default on macOS and
# a checkup that fails on a missing dependency is a checkup nobody runs.
python3 - "$REPORT" <<'PY'
import sys, json

d = json.loads(sys.argv[1])
n = lambda k: len(d.get(k, [])) if isinstance(d.get(k), list) else (d.get(k) or 0)

orphans      = n("orphanNodes")
dangling     = n("danglingEdges")
contra       = n("contradictions")
never        = n("neverRetrieved")
malformed    = n("malformedFrontmatter")

print()
print("  YOUR GRAPH, THIS WEEK")
print("  " + "-" * 46)
print()

def block(count, title, meaning, fix, examples=None):
    print(f"  {count:>5}  {title}")
    print(f"         {meaning}")
    if count:
        print(f"         Fix: {fix}")
        for e in (examples or [])[:3]:
            print(f"           · {e}")
    print()

block(orphans, "notes connected to nothing",
      "They show up in search, but they add nothing to the graph.",
      "open one in Obsidian and add a [[link]] to something related.",
      d.get("orphanNodes"))

# Dangling edges arrive as {source, relation, target} objects. Printed raw they
# are unreadable JSON; what the reader needs is which note to open and which
# link inside it is broken.
def edge(e):
    if isinstance(e, str):
        return e
    return f'{e.get("source", "?")}  →  [[{e.get("target", "?")}]]'

block(dangling, "links pointing at notes that don't exist",
      "Usually a renamed note, or a typo inside a [[wiki link]].",
      "open the note on the left and fix the link on the right.",
      [edge(e) for e in (d.get("danglingEdges") or [])])

block(contra, "places two of your notes disagree",
      "Not a bug — these are decisions you have not made yet.",
      "read both and decide which one you still believe.")

block(malformed, "notes with broken frontmatter",
      "The header block at the top of the file cannot be read.",
      "open the note and fix the --- block at the top.")

print(f"  {never:>5}  notes never returned by a search")
print( "         Nothing to fix. This is just what is not earning its place.")
print()
print("  " + "-" * 46)

if orphans + dangling + malformed == 0:
    print("  Nothing needs you. Come back next week.")
else:
    print("  Ten minutes in Obsidian clears most of this.")
print()
PY
