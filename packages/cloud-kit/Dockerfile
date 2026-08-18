# CORTEX — the cloud image, built from YOUR repo.
#
# BUILT FROM PUBLISHED PACKAGES, NOT FROM SOURCE.
#
# The earlier version of this file was written against the development monorepo:
# it COPYd pnpm-workspace.yaml, uv.lock, pyproject.toml, packages/types,
# packages/agent and packages/engine. None of those exist in the template repo,
# which ships the dashboard, the starter and this kit. So `fly deploy` failed on
# the first COPY for every buyer — found by a real deploy, 2026-08-18.
#
# So: the dashboard is built from your repo, because it is yours and you are
# expected to change it. The agent comes from npm and the engine from PyPI —
# the same packages module 2 and module 3 installed on your laptop, at the same
# versions. Nothing here needs source you do not have.
#
# ONE IMAGE, TWO RUNTIMES, AND THAT IS NOT AN ACCIDENT. The agent shells out to
# the engine, which is Python 3.12 with onnxruntime and sqlite-vec. A Node-only
# container starts cleanly, serves the dashboard, and returns empty search
# results forever. So the runtime carries both, and the base is Python (pinned
# 3.12 — 3.14 has no onnxruntime wheels) with Node copied in.
#
# The embedding weights are BAKED IN, not downloaded at boot: a 130MB fetch on
# every new machine turns a routine restart into a cold start that can fail on
# somebody else's outage.

# ---- Stage 1: the dashboard, and the agent from npm -------------------------
FROM node:22-slim AS js
WORKDIR /build
ENV PNPM_HOME=/pnpm CI=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Manifests first so a source edit does not invalidate the dependency layer.
COPY package.json pnpm-workspace.yaml ./
COPY packages/dashboard/package.json packages/dashboard/

# NOT --frozen-lockfile. The lockfile in your repo goes stale the moment you
# `pnpm add` anything locally — which module 2 has you do — and a frozen install
# then fails the build with a lockfile mismatch, days after the change that
# caused it.
RUN pnpm install --no-frozen-lockfile

COPY packages/ packages/
RUN pnpm --filter cortexos-dashboard build

# The agent, installed exactly the way you installed it locally. Its own
# directory with its own node_modules, so dependency resolution has one place to
# look and cannot climb into the dashboard's tree.
ARG CORTEX_AGENT_VERSION=latest
RUN mkdir -p /deploy/agent && cd /deploy/agent \
 && npm init -y > /dev/null \
 && npm install --omit=dev "cortexos-agent@${CORTEX_AGENT_VERSION}" \
 && test -f /deploy/agent/node_modules/cortexos-agent/dist/index.js

# ---- Stage 2: the engine from PyPI ------------------------------------------
FROM python:3.12-slim-bookworm AS py
WORKDIR /build
ENV UV_HTTP_TIMEOUT=180 UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

# `[convert]` is load-bearing and easy to lose. Without it the image accepts
# every PDF, docx and pptx dropped into the inbox, saves them, and then refuses
# them at the convert stage with "no document converter available" — recorded in
# items.json and surfaced nowhere. Found with a 9MB PDF, 2026-08-13.
ARG CORTEX_ENGINE_VERSION=""
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN uv venv /opt/venv \
 && uv pip install --python /opt/venv/bin/python \
      "cortexos-engine[convert]${CORTEX_ENGINE_VERSION}"

# Prove the converter is importable in THIS image rather than trusting the extra
# did what it says.
RUN /opt/venv/bin/python -c "import markitdown; print('markitdown ok')"

# Bake the encoder with the engine's own downloader, so the image gets exactly
# the files the runtime checks for.
ENV CORTEX_MODELS_DIR=/opt/cortex/models
RUN /opt/venv/bin/cortex-engine model fetch \
 && test -f /opt/cortex/models/bge-small-en-v1.5/model.onnx

# ---- Stage 3: runtime -------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

# git is not optional: the vault arrives by clone and leaves by push.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Node from the official image — same binary the build stage used, no third-party
# apt repo, no drift between stages.
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node

# npm and npx, which the agent does not need but several MCP connectors do:
# they are `npx -y <pkg>` servers, so without npx they resolve to ENOENT at the
# first tool call while the dashboard still reports them configured. npm is a JS
# program, so its lib tree comes too and the bin entries are symlinks into it.
COPY --from=node:22-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npx --version > /dev/null

WORKDIR /app
COPY --from=py /opt/venv /opt/venv
COPY --from=py /opt/cortex/models /opt/cortex/models
COPY --from=js /deploy/agent ./agent

# The dashboard: Next standalone traces its own dependencies. `static` is not
# part of that trace and must be copied explicitly, or every page renders
# unstyled with no JS — a failure that looks like a broken app, not a bad COPY.
COPY --from=js /build/packages/dashboard/.next/standalone ./web/
COPY --from=js /build/packages/dashboard/.next/static ./web/packages/dashboard/.next/static

# `/opt/venv/bin` ON PATH. The engine is invoked by absolute path, so nothing
# needed this until the converter arrived: `detect_toolchain` finds converters
# with `shutil.which`, and markitdown is a venv console script — installed,
# present, and invisible. The image reported `markitdown: null` and refused every
# PDF while the package sat in the same image.
ENV PATH="/opt/venv/bin:${PATH}"

# Prove it here, in the stage where the build directories no longer exist. This
# is the only place these checks are meaningful, and they convert the worst
# failure this image has — boots, goes green, returns nothing — into a failed
# build.
RUN command -v markitdown > /dev/null || (echo "markitdown not on PATH" && exit 1)
RUN /opt/venv/bin/cortex-engine --help > /dev/null 2>&1 \
 && test -f /opt/cortex/models/bge-small-en-v1.5/model.onnx \
 && test -f /app/agent/node_modules/cortexos-agent/dist/index.js

# SKILLS SHIP IN THE IMAGE.
#
# Only `<repoRoot>/.claude/skills` is loadable: DiscoveryService grades a skill
# by where it was found, and the SDK runs with cwd=repoRoot and
# settingSources=["project"]. Skills anywhere else are listed, labelled, and get
# no button — `invocableSkills: 0` on a machine that otherwise looks healthy.
#
# The starter skills are copied straight from the kit rather than from
# `.claude/`, because a COPY of a directory that may not exist fails the build
# for anyone who deploys before running the starter installer. Anything you add
# later goes in `packages/starter/skills/` and ships the same way.
#
# The alternative — CORTEX_SKILLS_REPO, a second private repo with its own token
# — still works and takes precedence at boot. It exists for people running many
# more skills than a course buyer has.
COPY packages/starter/skills/ ./.claude/skills/
RUN test -f /app/.claude/skills/grill-me/SKILL.md

COPY cortex.yaml ./cortex.yaml
# The cloud vault profile. The local `vault.adoption.yaml` is dockerignored on
# purpose — it points at a path on somebody's laptop. If the build fails here,
# run packages/cloud-kit/go-live.sh, which puts this file in place for you.
COPY vault.adoption.cloud.yaml ./vault.adoption.cloud.yaml
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV NODE_ENV=production \
    PATH="/opt/venv/bin:${PATH}" \
    CORTEX_REPO_ROOT=/app \
    CORTEX_MODELS_DIR=/opt/cortex/models \
    CORTEX_AGENT_ENTRY=/app/agent/node_modules/cortexos-agent/dist/index.js \
    CORTEX_VAULT_ROOT=/data/vault \
    CORTEX_VAULT_CONFIG=/app/vault.adoption.cloud.yaml \
    CORTEX_STATE_DIR=/data/pipeline \
    CORTEX_STATE_DB=/data/cortex.db \
    CORTEX_PIPELINE_BIN=/opt/venv/bin/cortex-engine \
    CORTEX_MCP_TRANSPORT=http \
    CORTEX_WEB_ORIGIN=http://127.0.0.1:3000 \
    CORTEX_PORT=8787 \
    CORTEX_HOST=0.0.0.0 \
    CORTEX_GIT_PUSH=true

EXPOSE 8787
CMD ["/usr/local/bin/start.sh"]
