# CORTEX — your copy

This is the interface, and it is **yours**. Rename it, recolour it, extend it.
There is no licence check anywhere in it and nothing phones home.

The rest of the system installs into this folder, one part at a time, and each
part proves it works before the next one arrives.

---

## What you need first

- **A vault.** An Obsidian folder you already write in. Nothing here moves,
  renames or uploads it — it is read, and that is all.
  No vault yet? Start with [secondbrain-template](https://github.com/AdityaDutta02/secondbrain-template).
- **Node 22+** and **pnpm**
- **uv** (installs the engine — `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **git**

## Module 2 — see your brain

```bash
pnpm install

# the engine: reads, indexes and searches your vault. Never calls a model.
uv tool install cortexos-engine --python 3.12
cortex-engine --json health          # red is CORRECT here — it has no vault yet
cortex-engine model fetch
```

Point it at your vault — one line, the only value you must supply:

```bash
cp packages/starter/vault.adoption.example.yaml vault.adoption.yaml
$EDITOR vault.adoption.yaml          # set `root:` to your vault folder
cortex-engine --json index rebuild   # GATE: it reads your note count back
```

Then run it:

```bash
npm install cortexos-agent           # the part the dashboard talks to
CORTEX_REPO_ROOT="$PWD" CORTEX_ALLOW_OPEN_DEV=1 npx cortex-agent   # terminal 1
pnpm dev                                                            # terminal 2
```

`http://localhost:3000` → your graph.

## Module 3 — make it work for you

```bash
packages/starter/install.sh --vault /path/to/your/vault
$EDITOR cortex.yaml                  # owner.name, owner.timezone
claude setup-token                   # your SUBSCRIPTION. Never an API key.
```

## Module 5 — prepare for the cloud

```bash
packages/cloud-kit/install.sh        # adds build files; changes nothing that works
```

Three values in `fly.toml` are yours and none has a safe default: the app name,
the region, and the vault path inside the container. Each one fails differently
if it is wrong, and the comments say how.

---

## The rules this will not let you break

Change one and startup fails with a message naming the rule. These are not
preferences — each is a decision that cannot be un-made quietly.

- **No API key. Ever.** Auth is your Claude subscription. A key billed per token
  behind a background process is an open tab on your card.
- **Nothing runs unattended** unless you switch it on and watch it for a week.
- **Nothing is ever deleted.** Duplicates group; they do not die.
- **One writer.** Everything that touches your vault goes through one queue, so
  git is always a working undo.
- **No citation, no claim.** If it cannot point at the note, it says so.

## What costs nothing

Reading, indexing, searching and drawing the graph never call a model. That is
architecture, not a trial limit — 100% of your vault stays searchable for free.
Spending starts when you run a skill, and every run shows the estimate first.

## The parts

| Part | Where it comes from |
|---|---|
| Dashboard | this repo |
| Engine | [`cortexos-engine`](https://pypi.org/project/cortexos-engine/) (PyPI) |
| Agent | [`cortexos-agent`](https://www.npmjs.com/package/cortexos-agent) (npm) |
| Connector | [`cortexos-connector`](https://www.npmjs.com/package/cortexos-connector) (npm) |
| Config, skills, jobs | `packages/starter` |
| Cloud build files | `packages/cloud-kit` |
