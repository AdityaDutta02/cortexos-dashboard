# CORTEX — Phase 2 image.
#
# ONE IMAGE, TWO RUNTIMES, AND THAT IS NOT AN ACCIDENT.
#
# doc 08 says "a Node 22 base image". That image cannot convert, embed or rank:
# the agent shells out to `cortex-pipeline`, which is Python 3.12 with
# onnxruntime and sqlite-vec. A Node-only container starts cleanly, serves the
# dashboard, and returns empty search results forever — the failure shape this
# codebase keeps re-finding, where incomplete input produces correct-looking
# output. So the runtime carries both, and the base is Python (pinned 3.12,
# because 3.14 has no onnxruntime wheels) with Node copied in.
#
# The embedding weights are BAKED IN, not downloaded at boot. A 130MB fetch on
# every new machine turns a routine restart into a cold start that can fail on
# someone else's outage, and makes the image's behaviour depend on the day it
# was run. `CORTEX_MODELS_DIR` points at the baked copy; the volume holds only
# things that are genuinely state.

# ---- Stage 1: JS build ------------------------------------------------------
FROM node:22-slim AS js
WORKDIR /build
ENV PNPM_HOME=/pnpm CI=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Manifests first: this layer is the dependency cache and must not be
# invalidated by a source edit.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/agent/package.json packages/agent/
COPY packages/dashboard/package.json packages/dashboard/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
# `cortexos-types` has no build step by design — it is consumed as TypeScript
# source (tsup bundles it into the agent, `transpilePackages` compiles it for
# the web). Nothing to build here, so nothing is built.
RUN pnpm --filter cortexos-agent build \
 && pnpm --filter cortexos-dashboard build

# `pnpm deploy` produces a SELF-CONTAINED copy of the agent: its own package
# files plus a `node_modules` whose symlinks all point inside that directory.
#
# Copying `packages/agent/node_modules` straight out of a pnpm workspace does not
# work, and fails in the least helpful way. Those entries are symlinks into the
# workspace-root `.pnpm` store, so the copy lands a tree of dangling links; the
# image builds, the container starts, and node dies at import with
# ERR_MODULE_NOT_FOUND on the first dependency it needs. (Observed on the first
# real deploy: `Cannot find package '@hono/node-server'`.)
RUN pnpm --filter cortexos-agent deploy --prod /deploy/agent

# ---- Stage 2: Python build --------------------------------------------------
FROM python:3.12-slim-bookworm AS py
WORKDIR /build
ENV UV_HTTP_TIMEOUT=180 UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

# The lockfile, not a fresh resolve. `uv pip install ./pipeline` would ignore
# uv.lock and pick whatever versions exist on build day — which is how an image
# that built last week stops building, or worse, builds differently.
COPY pyproject.toml uv.lock ./
COPY packages/engine/ packages/engine/
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
# `--no-editable` is load-bearing. Without it uv installs workspace members in
# editable mode, so the venv gets `_editable_impl_cortex_pipeline.pth`
# containing `/build/packages/engine/src` — a path that exists in THIS stage and
# nowhere in the runtime image. Every third-party dependency copies across fine;
# only our own package becomes a dangling pointer.
#
# The result passes every check that matters to a scheduler: the venv is there,
# the `cortex-pipeline` console script is there and executable, the container
# boots, Fly's health check goes green. It just cannot import itself, so search,
# health, sources and the index are all dead behind a healthy machine.
# (Observed live on the second deploy.)
#
# The root now depends on `cortex-pipeline[convert]`, so this installs the
# document converter by default — see the note in pyproject.toml. It did not,
# for the whole life of the deployed instance: every PDF, docx and pptx dropped
# into the inbox was accepted, saved, and then refused at the convert stage with
# "no document converter available", a failure recorded in items.json and shown
# nowhere. Found with a 9MB PDF, 2026-08-13.
#
# `--extra convert` was the first attempt and does NOT work here: `convert` is
# an extra of the workspace MEMBER, and the flag applies to the root project.
# The build check below is what caught that.
RUN uv sync --frozen --no-dev --no-editable

# Prove the converter is actually importable in THIS image rather than assuming
# the flag above did what it says. Same reasoning as the `--help` check below:
# the failure mode is a container that boots healthy and cannot do its job.
RUN /opt/venv/bin/python -c "import markitdown; print('markitdown', markitdown.__name__)"

# Bake the encoder. `model fetch` is the pipeline's own downloader, so the image
# gets exactly the files the runtime checks for (model.onnx + tokenizer.json).
ENV CORTEX_MODELS_DIR=/opt/cortex/models
RUN /opt/venv/bin/cortex-pipeline model fetch \
 && test -f /opt/cortex/models/bge-small-en-v1.5/model.onnx

# ---- Stage 3: runtime -------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

# git is not optional here: the vault arrives by clone and leaves by push.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Node from the official image rather than nodesource — same binary the build
# stage used, no third-party apt repo, no version drift between the two stages.
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node

# npm and npx, which the agent itself does not need — four MCP connectors do.
# `shadcn`, `magicui` and similar servers are all `npx -y <pkg>` servers, so
# without npx on PATH they resolve to ENOENT at the first tool call: the
# dashboard shows them configured, `resolveConnectors` reports them reachable
# (their credentials are present, which is all it can check), and only an actual
# run finds out. Copying the binary alone is not enough — npm is a JS program,
# so its lib tree comes too and the bin entries are symlinks into it.
COPY --from=node:22-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npx --version > /dev/null

WORKDIR /app
COPY --from=py /opt/venv /opt/venv
COPY --from=py /opt/cortex/models /opt/cortex/models

# The agent. tsup bundles our own code and `cortexos-types`, but leaves the real
# dependencies external — including `@anthropic-ai/claude-agent-sdk`, which is
# load-bearing here: CORTEX_CLAUDE_TRANSPORT defaults to `sdk`, so a deployed
# instance without it cannot run a single skill.
#
# The Linux-native variant of that SDK is the one resolved here, because the
# install happens inside this build rather than being copied from a laptop.
COPY --from=js /deploy/agent ./agent

# The dashboard: Next standalone traces its own dependencies. `static` is not
# part of that trace and must be copied explicitly, or every page renders
# unstyled with no JS — a failure that looks like a broken app, not a bad COPY.
COPY --from=js /build/packages/dashboard/.next/standalone ./web/
COPY --from=js /build/packages/dashboard/.next/static ./web/packages/dashboard/.next/static

# Prove the pipeline can actually import itself, here, in the stage where the
# build directories no longer exist. This is the only place the check is
# meaningful — anywhere earlier, a path that will be discarded is still present
# and a broken install looks fine.
#
# Cheap, and it converts the worst failure mode this image has (boots, goes
# green, returns nothing) into a failed build.
# `/opt/venv/bin` ON PATH. The pipeline is invoked by absolute path
# (CORTEX_PIPELINE_BIN), so nothing needed this — until the converter arrived.
# `detect_toolchain` finds converters with `shutil.which`, and markitdown is a
# venv console script: installed, present at /opt/venv/bin/markitdown, and
# invisible. The image reported `markitdown: null` and refused every PDF with
# "no document converter available" while the package sat in the same image.
ENV PATH="/opt/venv/bin:${PATH}"

# Prove the converter is on PATH *here*, in the runtime stage, not just
# installed in the builder — same reasoning as the import check below.
RUN command -v markitdown > /dev/null || (echo "markitdown not on PATH" && exit 1)

RUN /opt/venv/bin/cortex-pipeline --help > /dev/null \
 && test -f /opt/cortex/models/bge-small-en-v1.5/model.onnx

COPY cortex.yaml ./cortex.yaml
# The cloud vault profile. The local `vault.adoption.yaml` is dockerignored on
# purpose — it is machine-specific and would point the container at a path on
# somebody's laptop.
# Repo root, not a deploy/ subfolder: the cloud kit installs it beside cortex.yaml
# so the two config files a deploy needs sit next to each other. If this build
# fails here, you have not copied vault.adoption.cloud.example.yaml to
# vault.adoption.cloud.yaml yet — do that and set `root: /data/vault`.
COPY vault.adoption.cloud.yaml ./vault.adoption.cloud.yaml
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV NODE_ENV=production \
    PATH="/opt/venv/bin:${PATH}" \
    CORTEX_REPO_ROOT=/app \
    CORTEX_MODELS_DIR=/opt/cortex/models \
    CORTEX_VAULT_ROOT=/data/vault \
    CORTEX_VAULT_CONFIG=/app/vault.adoption.cloud.yaml \
    CORTEX_STATE_DIR=/data/pipeline \
    CORTEX_STATE_DB=/data/cortex.db \
    CORTEX_PIPELINE_BIN=/opt/venv/bin/cortex-pipeline \
    CORTEX_MCP_TRANSPORT=http \
    CORTEX_WEB_ORIGIN=http://127.0.0.1:3000 \
    CORTEX_PORT=8787 \
    CORTEX_HOST=0.0.0.0 \
    CORTEX_GIT_PUSH=true \
    CORTEX_SKILLS_ROOT=/data/skills \
    # `npx -y` downloads on first use. Default cache is ~/.npm, which lives in
    # the container layer and is therefore lost on every restart — so each
    # restart would re-download four packages before the first connector call
    # could succeed. On the volume it survives.
    npm_config_cache=/data/npm-cache \
    WEB_PORT=3000

EXPOSE 8787
CMD ["/usr/local/bin/start.sh"]
