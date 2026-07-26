#!/usr/bin/env bash
# Consumer contract for endatix/release-workflows (publish half):
# push the artifacts produced by release-prepare.sh.
#
# Channels (RELEASE_CHANNEL, set by the shared workflows):
#   canary       push to main             prerelease build
#   hotfix       push to hotfix/X.Y.x     prerelease build on a maintenance line
#   stable       promoted release, and the newest version overall
#   maintenance  promoted release on an older line (a newer stable exists)
#
# Prereleases stay on GHCR — Docker Hub is public and immutable, so per-push
# builds must never land there. BOTH promoted channels publish to Docker Hub;
# only `stable` may move floating pointers (docker `latest`), so a hotfix for an
# older line ships without dragging `latest` backwards.
#
#   channel                 GHCR      Docker Hub     latest
#   canary / hotfix          yes          no           no
#   maintenance              yes          yes          no
#   stable                   yes          yes          yes
#
# The Helm chart ships to GHCR on every channel: OCI charts are addressed by
# exact version with no floating pointer to protect, and the prerelease version
# already keeps canaries out of `helm upgrade` unless --devel is passed.
#
# Usage: scripts/release-publish.sh <version>
# Expects env vars (exported by the shared workflows):
#   GH_PACKAGES_USER   actor for the GHCR/Helm registry login
#   GH_PACKAGES_TOKEN  job token with packages:write
#   DOCKER_IMAGE       GHCR image name, from the caller's docker-image input
#                      (the shared workflows do the ghcr.io login)
#   HELM_OCI_REPO      OCI chart repo (oci://ghcr.io/endatix/charts)
#   ENDATIX_DOCKERHUB_USERNAME / ENDATIX_DOCKERHUB_TOKEN
#                      Docker Hub credentials via Infisical (fetch-secrets:
#                      true on the caller) — promoted releases only
set -euo pipefail

VERSION="${1:?usage: release-publish.sh <version>}"
CHANNEL="${RELEASE_CHANNEL:-stable}"
: "${GH_PACKAGES_USER:?GH_PACKAGES_USER env var is required}"
: "${GH_PACKAGES_TOKEN:?GH_PACKAGES_TOKEN env var is required}"
: "${DOCKER_IMAGE:?DOCKER_IMAGE env var is required (is docker-image set on the caller workflow?)}"
: "${HELM_OCI_REPO:?HELM_OCI_REPO env var is required}"

# Public mirror for promoted releases. Not an input on the shared workflows
# (they model a single image) — mirroring is this repo's own publish concern.
DOCKERHUB_IMAGE="docker.io/endatix/endatix-hub"

# Fail loud on an unrecognised channel: silently publishing nothing is a far
# worse outcome for a release than a red run.
case "$CHANNEL" in
  stable) PUBLISH_PUBLIC=true; MOVE_LATEST=true ;;
  maintenance) PUBLISH_PUBLIC=true; MOVE_LATEST=false ;;
  canary | hotfix) PUBLISH_PUBLIC=false; MOVE_LATEST=false ;;
  *) echo "::error::Unknown RELEASE_CHANNEL '${CHANNEL}' — release-workflows contract changed?" >&2; exit 1 ;;
esac

echo "──── Publishing ${VERSION} (${CHANNEL} channel) ────"

echo "──── Pushing container image to ${DOCKER_IMAGE} ────"
docker push "${DOCKER_IMAGE}:${VERSION}"

if [[ "$MOVE_LATEST" = true ]]; then
  echo "──── Moving ${DOCKER_IMAGE}:latest to ${VERSION} ────"
  docker buildx imagetools create -t "${DOCKER_IMAGE}:latest" "${DOCKER_IMAGE}:${VERSION}"
fi

if [[ "$PUBLISH_PUBLIC" = true ]]; then
  : "${ENDATIX_DOCKERHUB_USERNAME:?ENDATIX_DOCKERHUB_USERNAME env var is required for promoted releases (Infisical prod — is fetch-secrets: true set?)}"
  : "${ENDATIX_DOCKERHUB_TOKEN:?ENDATIX_DOCKERHUB_TOKEN env var is required for promoted releases (Infisical prod — is fetch-secrets: true set?)}"

  # Mirror by copying the manifest — same digest as GHCR, no rebuild.
  DOCKERHUB_TAGS=(-t "${DOCKERHUB_IMAGE}:${VERSION}")
  if [[ "$MOVE_LATEST" = true ]]; then
    DOCKERHUB_TAGS+=(-t "${DOCKERHUB_IMAGE}:latest")
  fi

  echo "──── Mirroring container image to ${DOCKERHUB_IMAGE} ────"
  echo "$ENDATIX_DOCKERHUB_TOKEN" | docker login docker.io -u "$ENDATIX_DOCKERHUB_USERNAME" --password-stdin
  docker buildx imagetools create "${DOCKERHUB_TAGS[@]}" "${DOCKER_IMAGE}:${VERSION}"
fi

# Helm chart. Helm keeps its own registry credentials (~/.config/helm), so the
# workflow's docker login does not carry over — log in explicitly. The path is
# pinned to the exact version so a stale tarball can never be pushed.
echo "──── Pushing Helm chart to ${HELM_OCI_REPO} ────"
echo "$GH_PACKAGES_TOKEN" | helm registry login ghcr.io -u "$GH_PACKAGES_USER" --password-stdin
helm push "build/packages/helm/endatix-hub-${VERSION}.tgz" "$HELM_OCI_REPO"
