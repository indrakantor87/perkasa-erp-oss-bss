#!/usr/bin/env bash
set -euo pipefail

# Coolify Custom Build Script - FORCE LEGACY DOCKER BUILD (TANPA BuildKit / coolify-helper)
# Problem: coolify-helper:1.0.14 (BuildKit buildx) DI SERVER localhost RUSAK PERMANEN
# exit code 255 saat start container helper. User tidak punya akses restart server Docker.
# Solusi: Lewati TOTAL coolify-helper, jalankan docker build LEGACY biasa (DOCKER_BUILDKIT=0).

export DOCKER_BUILDKIT=0
export DOCKER_BUILDX=0
export BUILDX_DISABLED=true
export COMPOSE_DOCKER_CLI_BUILD=0

echo "==> [coolify/build.sh] FORCE DOCKER_BUILDKIT=0 LEGACY BUILD MODE (no coolify-helper, no buildx)"
echo "==> Image tag: ${COOLIFY_IMAGE_FULL_TAG:-unknown}"

DOCKER_IMAGE_FULL="${COOLIFY_IMAGE_FULL_TAG:-perkasa-erp-oss-bss:latest}"
DOCKERFILE_PATH="${COOLIFY_DOCKERFILE_PATH:-Dockerfile}"
BUILD_CONTEXT="${COOLIFY_BUILD_CONTEXT:-.}"

echo "==> docker build -f ${DOCKERFILE_PATH} -t ${DOCKER_IMAGE_FULL} ${BUILD_CONTEXT}"
DOCKER_BUILDKIT=0 docker build \
  --no-cache \
  -f "${DOCKERFILE_PATH}" \
  -t "${DOCKER_IMAGE_FULL}" \
  "${BUILD_CONTEXT}"

echo "==> ✅ Legacy Docker build SUCCESS (tanpa coolify-helper / BuildKit)."
