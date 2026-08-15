#!/usr/bin/env bash
# =============================================================================
# Coolify Custom Build Script - FORCE BYPASS COOLIFY-HELPER 100%
# =============================================================================
# ROOT CAUSE: coolify-helper:1.0.14 exit 255 saat dijalankan pada server
# tipe "localhost" karena mount /root/.docker/buildx tidak exist
# (Coolify berjalan sebagai user non-root, home user bukan /root).
#
# SOLUSI: Lewati TOTAL coolify-helper. Jalankan docker build LEGACY
#         (DOCKER_BUILDKIT=0) secara DIRECT dari host docker socket.
#
# PREREQUISITE: File ini HARUS punya mode executable (chmod +x).
#               Git mode: 100755 (bukan 100644).
# =============================================================================
set -o pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export DOCKER_BUILDKIT=0
export DOCKER_BUILDX=0
export BUILDX_DISABLED=true
export COMPOSE_DOCKER_CLI_BUILD=0
export DOCKER_CLI_EXPERIMENTAL=disabled
export DEBIAN_FRONTEND=noninteractive
export DEBCONF_NONINTERACTIVE_SEEN=true
export TMPDIR="/tmp"
export BUILDKIT_PROGRESS=plain

echo "========================================================================"
echo " [Coolify Build Script] MODE: DIRECT DOCKER BUILD (NO HELPER, NO BUILDKIT)"
echo "========================================================================"
echo " Image target     : ${COOLIFY_IMAGE_FULL_TAG:-perkasa-erp-oss-bss:latest}"
echo " Dockerfile path  : ${COOLIFY_DOCKERFILE_PATH:-Dockerfile}"
echo " Build context    : ${COOLIFY_BUILD_CONTEXT:-.}"
echo " DOCKER_BUILDKIT  : ${DOCKER_BUILDKIT}"
echo " Platform force   : linux/amd64 (dari Dockerfile --platform)"

DOCKER_IMAGE_FULL="${COOLIFY_IMAGE_FULL_TAG:-perkasa-erp-oss-bss:latest}"
DOCKERFILE_PATH="${COOLIFY_DOCKERFILE_PATH:-Dockerfile}"
BUILD_CONTEXT="${COOLIFY_BUILD_CONTEXT:-.}"
BUILD_EXIT=0
FINAL_EXIT=0

which docker >/dev/null 2>&1 || {
  echo "[ERROR] docker binary tidak ditemukan di PATH. Exit 1."
  exit 1
}

echo ""
echo "==> Step 1/2: docker build --progress=plain -f ${DOCKERFILE_PATH} -t ${DOCKER_IMAGE_FULL} ${BUILD_CONTEXT}"
echo "    (progress=plain = selalu ada stdout, hindari Coolify timeout 'no output >10menit')"
echo ""

DOCKER_BUILDKIT=0 DEBIAN_FRONTEND=noninteractive docker build \
  --progress=plain \
  --build-arg DEBIAN_FRONTEND=noninteractive \
  -f "${DOCKERFILE_PATH}" \
  -t "${DOCKER_IMAGE_FULL}" \
  "${BUILD_CONTEXT}"
BUILD_EXIT=$?

set +e

if [ "${BUILD_EXIT}" -eq 0 ]; then
  echo ""
  echo "=========================================================================="
  echo " [PASS] Step 1 docker build BERHASIL (exit 0)."
  echo "=========================================================================="
else
  echo ""
  echo "[WARN] docker build pertama exit ${BUILD_EXIT}. Retry dengan --no-cache + verbose."
  echo ""
  DOCKER_BUILDKIT=0 DEBIAN_FRONTEND=noninteractive docker build \
    --no-cache \
    --progress=plain \
    --build-arg DEBIAN_FRONTEND=noninteractive \
    -f "${DOCKERFILE_PATH}" \
    -t "${DOCKER_IMAGE_FULL}" \
    "${BUILD_CONTEXT}"
  RETRY_EXIT=$?
  if [ "${RETRY_EXIT}" -eq 0 ]; then
    BUILD_EXIT=0
    echo ""
    echo "========================================================================"
    echo " [PASS] Retry --no-cache Docker Build BERHASIL."
    echo "========================================================================"
  else
    echo "[FATAL] Docker build GAGAL setelah retry. Step 1 exit=${BUILD_EXIT} retry exit=${RETRY_EXIT}"
    FINAL_EXIT=${RETRY_EXIT}
    BUILD_EXIT=${RETRY_EXIT}
  fi
fi

if [ "${BUILD_EXIT}" -eq 0 ]; then
  echo ""
  echo "==> Step 2/2: Validasi image tag & filesystem (sync disk layer)."
  echo ""
  sync
  docker inspect --format '  ID image     : {{.Id}}' "${DOCKER_IMAGE_FULL}" >/dev/null 2>&1
  INSPECT_EXIT=$?
  if [ "${INSPECT_EXIT}" -eq 0 ]; then
    echo "  Image tag found  : ${DOCKER_IMAGE_FULL} OK"
    docker inspect --format '  Size           : {{.Size}} bytes' "${DOCKER_IMAGE_FULL}" 2>/dev/null || true
    docker inspect --format '  Created        : {{.Created}}'    "${DOCKER_IMAGE_FULL}" 2>/dev/null || true
    docker inspect --format '  Exposed ports  : {{json .Config.ExposedPorts}}' "${DOCKER_IMAGE_FULL}" 2>/dev/null || true
  else
    echo "  [WARN] docker inspect tag ${DOCKER_IMAGE_FULL} tidak ketemu (exit ${INSPECT_EXIT}). Build tetap OK."
  fi

  echo ""
  echo "=========================================================================="
  echo " ✅ Direct Legacy Docker Build BERHASIL (tanpa coolify-helper / BuildKit)."
  echo " Image siap dijalankan: ${DOCKER_IMAGE_FULL}"
  echo "=========================================================================="
  FINAL_EXIT=0
fi

echo ""
echo ">> BUILD SCRIPT END. Final exit=${FINAL_EXIT}"
exit ${FINAL_EXIT}
