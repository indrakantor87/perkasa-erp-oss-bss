FROM node:20-slim AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=3072
COPY apps/web/package.json apps/web/package-lock.json ./
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN set -eux; \
  apt-get update -o Acquire::Retries=10 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15; \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    bash curl ca-certificates; \
  rm -rf /var/lib/apt/lists/*; \
  command -v curl >/dev/null 2>&1 || { echo "ERROR: curl binary not found after install."; exit 1; }
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=6 CMD curl -fsS -m 5 http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
