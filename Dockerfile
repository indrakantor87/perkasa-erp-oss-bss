# ============================================================
# PERKASA ERP - GOLDEN STABLE DOCKERFILE (No Tar, No BuildKit)
# 3 stages: deps -> builder -> runner
# ============================================================

# ---------- STAGE 1/3: deps - install npm packages only ----------
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS deps

ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force 2>/dev/null || true

# ---------- STAGE 2/3: builder - run next build and assemble standalone ----------
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096

WORKDIR /app/apps/web

COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./

RUN echo "=== [1/3 builder] Start next build ===" \
 && npm run build 2>&1 | tail -80 \
 && echo "=== [2/3 builder] Verify .next/standalone exists ===" \
 && test -d ".next/standalone" \
 && mkdir -p ".next/standalone/.next" \
 && echo "=== [3/3 builder] Assemble standalone: copy static + public + healthcheck ===" \
 && cp -a ".next/static" ".next/standalone/.next/static" \
 && if [ -d "public" ]; then cp -a "public" ".next/standalone/public"; fi \
 && cp "healthcheck.js" ".next/standalone/healthcheck.js" \
 && echo "=== Standalone verification ===" \
 && ls -la ".next/standalone" | head -30 \
 && test -f ".next/standalone/server.js" \
 && test -f ".next/standalone/healthcheck.js" \
 && test -d ".next/standalone/.next/static" \
 && test -d ".next/standalone/public"

# ---------- STAGE 3/3: runner - production image, only standalone output ----------
FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS runner

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web
COPY --from=builder /app/apps/web/.next/standalone ./

RUN echo "=== Runner post-copy verification ===" \
 && test -f "/app/apps/web/server.js"          && echo "  ✓ server.js" \
 && test -f "/app/apps/web/healthcheck.js"     && echo "  ✓ healthcheck.js" \
 && test -d "/app/apps/web/.next/static"       && echo "  ✓ .next/static" \
 && test -d "/app/apps/web/public"             && echo "  ✓ public" \
 && echo "=== All runner checks passed ==="

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=10s --start-period=240s --retries=5 \
  CMD node /app/apps/web/healthcheck.js || exit 1

CMD ["node", "/app/apps/web/server.js"]
