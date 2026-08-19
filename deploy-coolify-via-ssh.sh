#!/bin/bash
set -euo pipefail

SERVER_HOST="${1:-${DEPLOY_SERVER_HOST:-}}"
SERVER_USER="${2:-${DEPLOY_SERVER_USER:-root}}"
SSH_KEY_PATH="${3:-${DEPLOY_SSH_KEY_PATH:-}}"

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

if [ -z "$SERVER_HOST" ]; then
  echo "❌ ERROR: SERVER_HOST tidak diset. Arg1 atau env DEPLOY_SERVER_HOST (IP public server Coolify)"
  exit 1
fi

echo "========================================================"
echo " PERKASA ERP OSS BSS - AUTO DEPLOY VIA SSH"
echo " Date       : $(date '+%Y-%m-%d %H:%M:%S')"
echo " Target SSH : $SERVER_USER@$SERVER_HOST"
echo "========================================================"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -o ServerAliveInterval=60"
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY_PATH"
fi

REMOTE_SCRIPT=$(cat <<'REMOTE'
set -e
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

echo "--- [REMOTE:1/5] Pull image terbaru $IMAGE ---"
docker pull "$IMAGE"

echo "--- [REMOTE:2/5] Stop & hapus container lama $CONTAINER_NAME ---"
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
sleep 2

echo "--- [REMOTE:3/5] Buat container production BARU ---"
docker run -d \
  --name "$CONTAINER_NAME" \
  --network coolify \
  --restart unless-stopped \
  --memory 2g --cpus 2 \
  -p 3000:3000 \
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
  "$IMAGE"

echo "--- [REMOTE:4/5] Tunggu 55 detik startup ---"
sleep 55

echo "--- [REMOTE:5/5] Status check akhir ---"
echo "docker ps:"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "last 30 logs:"
docker logs --tail 30 "$CONTAINER_NAME" 2>&1 | grep -v "^$" | tail -40
REMOTE
)

echo ""
echo "[LOCAL] Connect via SSH $SERVER_USER@$SERVER_HOST & jalankan redeploy script..."
echo ""

ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "bash -s" <<<"$REMOTE_SCRIPT"

echo ""
echo "========================================================"
echo "✅ DEPLOY VIA SSH SELESAI!"
echo " Akses: http://$DOMAIN/login"
echo "========================================================"
