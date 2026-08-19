#!/bin/bash
set -euo pipefail

IMAGE="ghcr.io/indrakantor87/perkasa-erp-oss-bss:latest"
CONTAINER_NAME="perkasa-erp-oss-bss"
DOMAIN="de6w6jefch37pks4cbg9hivq.103.162.17.178.sslip.io"
DB_IP="10.0.1.11"
DB_PORT="3306"
DB_USER="perkasa_erp"
DB_PASS="2z5WT1vImkigS1VlPEFzKAR8up1sbSF03pE0oaHXN7fGEOiEvrHQjS1ceSr6HPvc"
DB_NAME="default"

AUTH_SESSION_SECRET="278476982jhgs98763h59862fwjrihw648"
REVIEW_DB_CONNECT_TIMEOUT_MS="3000"
BOOTSTRAP_MOCK_AUTH_CREDENTIALS="disabled"
AUTH_COOKIE_SECURE="false"
APP_DATA_MODE="review-db"
NODE_ENV="production"
PORT="3000"
HOSTNAME_ENV="0.0.0.0"

echo "========================================================"
echo " PERKASA ERP OSS BSS - PRODUCTION REDEPLOY SCRIPT"
echo " Date : $(date '+%Y-%m-%d %H:%M:%S')"
echo " Host : Coolify localhost / Server Terminal"
echo "========================================================"
echo ""
echo "[1/6] Pull image terbaru dari GHCR: $IMAGE"
docker pull "$IMAGE"
echo ""
echo "[2/6] Stop & hapus container lama (jika ada): $CONTAINER_NAME"
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
sleep 2
echo ""
echo "[3/6] Buat container BARU dengan parameter production"
echo "      - DB        : mysql://$DB_USER@$DB_IP:$DB_PORT/$DB_NAME"
echo "      - DOMAIN    : http://$DOMAIN"
echo "      - PORT      : 3000"
echo "      - NETWORK   : coolify"
echo "      - RESOURCES : 2 CPU / 2 GB RAM"

echo ""
echo "[3/7] 🔍 AUTO FIND PATH server.js BENAR di dalam image (SAFETY NET!)"
SERVER_JS_PATH=$(docker run --rm --entrypoint=/bin/sh "$IMAGE" -c "find / -name server.js -type f 2>/dev/null | grep -v node_modules | head -1 | tr -d '\r'")
if [ -z "$SERVER_JS_PATH" ]; then
  echo "❌ FATAL: server.js TIDAK DITEMUKAN di dalam image!"
  docker run --rm --entrypoint=/bin/sh "$IMAGE" -c "ls -laR /app 2>&1 | head -100"
  exit 8
fi
WORKDIR_CORRECT=$(dirname "$SERVER_JS_PATH")
echo "   PATH server.js BENAR : $SERVER_JS_PATH"
echo "   WORKDIR BENAR       : $WORKDIR_CORRECT"
echo "   CMD FINAL            : node $SERVER_JS_PATH"

echo ""
echo "[4/7] Buat container BARU dengan parameter production"

docker run -d \
  --name "$CONTAINER_NAME" \
  --network coolify \
  --restart unless-stopped \
  --memory 2g --cpus 2 \
  -p 3000:3000 \
  -w "$WORKDIR_CORRECT" \
  -e PORT="$PORT" \
  -e HOSTNAME="$HOSTNAME_ENV" \
  -e NODE_ENV="$NODE_ENV" \
  -e APP_DATA_MODE="$APP_DATA_MODE" \
  -e AUTH_SESSION_SECRET="$AUTH_SESSION_SECRET" \
  -e "DATABASE_URL=mysql://$DB_USER:$DB_PASS@$DB_IP:$DB_PORT/$DB_NAME" \
  -e REVIEW_DB_CONNECT_TIMEOUT_MS="$REVIEW_DB_CONNECT_TIMEOUT_MS" \
  -e BOOTSTRAP_MOCK_AUTH_CREDENTIALS="$BOOTSTRAP_MOCK_AUTH_CREDENTIALS" \
  -e AUTH_COOKIE_SECURE="$AUTH_COOKIE_SECURE" \
  -e NEXTAUTH_URL="http://$DOMAIN" \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.perkasa.entryPoints=http" \
  -l "traefik.http.routers.perkasa.rule=Host(\`$DOMAIN\`)" \
  -l "traefik.http.services.perkasa.loadbalancer.server.port=3000" \
  "$IMAGE" \
  node "$SERVER_JS_PATH"

NEW_ID=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.ID}}")
echo ""
echo "[5/7] Container berhasil dibuat! ID: $NEW_ID"
echo ""
echo "[6/7] Menunggu 50 detik untuk startup Next.js + koneksi MySQL..."
sleep 50
echo ""
echo "[7/7] Final status check:"
echo "--------------------------------------------------------"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "--------------------------------------------------------"
echo ""
echo "===== LAST 30 LOGS ====="
docker logs --tail 30 "$CONTAINER_NAME" 2>&1 | grep -v "^$" | tail -40
echo "--------------------------------------------------------"
echo ""
echo "✅ REDEPLOY SELESAI!"
echo ""
echo "Akses aplikasi: http://$DOMAIN/login"
echo "Lihat log live: docker logs -f $CONTAINER_NAME"
echo "Restart app   : docker restart $CONTAINER_NAME"
echo "Stop app      : docker stop $CONTAINER_NAME"
