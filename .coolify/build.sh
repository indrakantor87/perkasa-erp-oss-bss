#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo -e "\n=== [BUILD FAILED] Line $LINENO: $BASH_COMMAND ===" >&2 ; sync ; exit 255' ERR
trap 'echo "=== [BUILD EXIT] code=$? ===" ; sync' EXIT

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain
export DEBIAN_FRONTEND=noninteractive
export NEXT_TELEMETRY_DISABLED=1

ARTIFACT_DIR="${1:-/artifacts/$HOSTNAME}"
COMPOSE_FILE="${ARTIFACT_DIR}/docker-compose.yaml"
DOCKERFILE="${ARTIFACT_DIR}/Dockerfile"
APP_DIR="${ARTIFACT_DIR}"
IMAGE_TAG="perkasa-erp-oss-bss:latest"
SERVICE_NAME="app"
CONTAINER_NAME="perkasa-erp-oss-bss"

echo "========================================"
echo "=== PERKASA ERP STABLE BUILD SCRIPT ==="
echo "========================================"
echo "Timestamp: $(date -Iseconds)"
echo "Artifact dir: $ARTIFACT_DIR"
echo "PWD: $(pwd)"
echo "========================================"

echo ""
echo "=== [1/7] Verify artifact files exist ==="
for f in Dockerfile docker-compose.yaml apps/web/package.json apps/web/next.config.ts apps/web/healthcheck.js ; do
  if [ -f "${ARTIFACT_DIR}/${f}" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ MISSING: $f (searched in $ARTIFACT_DIR/$f)"
    echo "  Dir listing of $ARTIFACT_DIR:"
    ls -la "${ARTIFACT_DIR}" 2>/dev/null || true
    exit 255
  fi
done

echo ""
echo "=== [2/7] Cleanup stale containers and images ==="
OLD_CONTAINERS=$(docker ps -aq --filter "name=^${CONTAINER_NAME}$" --filter "name=^qpwsfd82uqkae83wmgjsapie-" 2>/dev/null || true)
if [ -n "$OLD_CONTAINERS" ]; then
  echo "  Found stale containers, removing..."
  docker rm -f $OLD_CONTAINERS 2>/dev/null || true
  echo "  Cleaned."
else
  echo "  No stale containers found."
fi
echo "  Prune dangling images <none>..."
docker image prune -f 2>/dev/null || true

echo ""
echo "=== [3/7] Pull base image from AWS ECR (stable mirror) ==="
docker pull --platform linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim 2>&1 | tail -3 || {
  echo "  [WARN] ECR pull failed, fallback to Docker Hub canonical image..."
  docker pull --platform linux/amd64 docker.io/library/node:20-bookworm-slim 2>&1 | tail -5
}

echo ""
echo "=== [4/7] BUILD: docker compose build (no-cache=false, BuildKit=1) ==="
cd "${ARTIFACT_DIR}"
echo "  Running: docker compose -f docker-compose.yaml build --progress plain $SERVICE_NAME"
COMPOSE_CMD=(docker compose -f docker-compose.yaml build --progress plain "$SERVICE_NAME")
"${COMPOSE_CMD[@]}" 2>&1 | tail -80
BUILD_RC=$?
if [ $BUILD_RC -ne 0 ]; then
  echo "  ✗ Docker compose build FAILED with exit=$BUILD_RC"
  echo "  Retry with verbose output..."
  "${COMPOSE_CMD[@]}" --no-cache 2>&1 | tail -120
  exit 255
fi
echo "  ✓ Build completed successfully."

echo ""
echo "=== [5/7] Inspect built image metadata ==="
docker inspect "$IMAGE_TAG" --format '{{.Id}} {{.Size}} {{.Created}}' 2>/dev/null || {
  ALT=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | head -5)
  echo "  [WARN] Image tag $IMAGE_TAG not found. Available images:"
  echo "$ALT"
}

echo ""
echo "=== [6/7] Verify image has critical files (via temporary container) ==="
VERIFY_CONTAINER="perkasa-erp-verify-$$"
CHECK_LOG=$(docker run --rm --name "$VERIFY_CONTAINER" --entrypoint sh "$IMAGE_TAG" -c '
cd /app/.next/standalone 2>/dev/null && {
  [ -f server.js ] && echo "✓ server.js" || echo "✗ server.js MISSING"
  [ -f healthcheck.js ] && echo "✓ healthcheck.js" || echo "✗ healthcheck.js MISSING"
  [ -d .next/static ] && echo "✓ .next/static/" || echo "✗ .next/static/ MISSING"
  [ -d public ] && echo "✓ public/" || echo "✗ public/ MISSING"
  echo "PWD=$(pwd)"
  ls -la
} 2>&1
' 2>&1 || true)
echo "  --- Image content check ---"
echo "$CHECK_LOG"
if echo "$CHECK_LOG" | grep -q "✗"; then
  echo "  ✗ Image verification failed. Aborting."
  exit 255
fi
echo "  ✓ Image content verified."

echo ""
echo "=== [7/7] Final sync and explicit exit 0 ==="
sync
sleep 2
echo ""
echo "========================================"
echo "=== BUILD SUCCESSFUL - READY TO DEPLOY ==="
echo "========================================"
exit 0
