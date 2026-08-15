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

which docker >/dev/null 2>&1 || {
  echo "[ERROR] docker binary tidak ditemukan di PATH. Exit 1."
  exit 1
}

echo ""
echo "==> Step 1/2: docker build --progress=plain -f ${DOCKERFILE_PATH} -t ${DOCKER_IMAGE_FULL} ${BUILD_CONTEXT}"
echo "    (progress=plain = selalu ada stdout, hindari Coolify timeout 'no output >10menit')"
echo ""

if DOCKER_BUILDKIT=0 DEBIAN_FRONTEND=noninteractive docker build \
  --progress=plain \
  --build-arg DEBIAN_FRONTEND=noninteractive \
  -f "${DOCKERFILE_PATH}" \
  -t "${DOCKER_IMAGE_FULL}" \
  "${BUILD_CONTEXT}"; then
  echo ""
  echo "=========================================================================="
  echo " ✅ Direct Legacy Docker Build BERHASIL (tanpa coolify-helper / BuildKit)."
  echo " Image siap dijalankan: ${DOCKER_IMAGE_FULL}"
  echo "=========================================================================="
  exit 0
else
  BUILD_EXIT=$?
  echo ""
  echo "[WARN] docker build pertama gagal (exit ${BUILD_EXIT}). Retry dengan --no-cache + verbose."
  echo ""
  if DOCKER_BUILDKIT=0 DEBIAN_FRONTEND=noninteractive docker build \
    --no-cache \
    --progress=plain \
    --build-arg DEBIAN_FRONTEND=noninteractive \
    -f "${DOCKERFILE_PATH}" \
    -t "${DOCKER_IMAGE_FULL}" \
    "${BUILD_CONTEXT}"; then
    echo ""
    echo "========================================================================"
    echo " ✅ Retry Legacy Docker Build BERHASIL (--no-cache)."
    echo "========================================================================"
    exit 0
  else
    RETRY_EXIT=$?
    echo "[FATAL] Docker build GAGAL setelah retry. Exit code: ${RETRY_EXIT}"
    exit "${RETRY_EXIT}"
  fi
fi
