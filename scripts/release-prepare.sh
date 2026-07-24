#!/usr/bin/env bash
# Consumer contract for endatix/release-workflows (prepare half):
# build the Endatix Hub container image AND the Helm chart, both stamped with
# the given version. Called by the shared pipeline for PR validation (version
# 0.0.0-ci), canary releases, and stable rebuilds.
# Builds only — nothing is pushed here (PR validation has no registry login).
#
# Usage: scripts/release-prepare.sh <version>
# Expects env vars (exported by the shared workflows):
#   DOCKER_IMAGE  container image name, from the caller's docker-image input
set -euo pipefail

VERSION="${1:?usage: release-prepare.sh <version>}"
: "${DOCKER_IMAGE:?DOCKER_IMAGE env var is required (is docker-image set on the caller workflow?)}"

# Clean so the publish step only ever sees artifacts stamped with THIS version.
rm -rf build/packages/helm

# linux/amd64 only, deliberately. Unlike the .NET API this cannot be
# cross-compiled: `pnpm install` resolves platform-specific binaries (sharp,
# esbuild) and `next build` actually executes, so an arm64 image would mean
# QEMU emulation on every PR and every canary. Revisit if arm64 nodes appear —
# the publish step would then need a manifest list, as the API's does.
echo "──── Building container image ${DOCKER_IMAGE}:${VERSION} ────"
docker build --platform linux/amd64 -t "${DOCKER_IMAGE}:${VERSION}" .

# Helm chart, released in lockstep with the image. Stamping BOTH version and
# appVersion with the release version is what makes the chart self-consistent:
# the deployment template falls back to .Chart.Version for the image tag, so a
# chart at X.Y.Z always deploys the image built at X.Y.Z above. The 0.1.0 in
# Chart.yaml is only a placeholder for local `helm template` runs.
# lint first — on PRs this is the only thing that type-checks the templates.
echo "──── Packaging Helm chart at version ${VERSION} ────"
helm lint helm
helm package helm \
  --version "${VERSION}" \
  --app-version "${VERSION}" \
  --destination build/packages/helm
