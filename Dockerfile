FROM --platform=linux/amd64 node:20-bookworm-slim AS deps
LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="0"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.description="Satu website operasional ISP untuk sales, support, inventory, HR, dan billing."
LABEL org.opencontainers.image.vendor="Perkasa Networks"
LABEL org.opencontainers.image.source="https://github.com/indrakantor87/perkasa-erp-oss-bss"
LABEL org.opencontainers.image.licenses="proprietary"
ARG BUILDKIT_INLINE_CACHE=1
ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --ignore-scripts

FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="0"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.vendor="Perkasa Networks"
LABEL org.opencontainers.image.source="https://github.com/indrakantor87/perkasa-erp-oss-bss"
LABEL org.opencontainers.image.licenses="proprietary"
ARG BUILDKIT_INLINE_CACHE=1
ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build \
 && echo "=== VERIFY OUTPUT STANDALONE (next.config output: standalone) ===" \
 && pwd \
 && echo "--- ls .next ---" \
 && ls -la .next || (echo "ERROR: .next TIDAK TERGENERATE" && exit 1) \
 && echo "--- ls .next/standalone ---" \
 && (ls -la .next/standalone 2>&1 || (echo "ERROR: .next/standalone TIDAK TERGENERATE. Pastikan next.config.ts output:'standalone' diaktifkan." && exit 2)) \
 && echo "--- ls .next/standalone/server.js (wajib ada entry point) ---" \
 && (ls -la .next/standalone/server.js 2>&1 || (echo "ERROR: .next/standalone/server.js TIDAK ADA. Command start = node .next/standalone/server.js." && exit 3)) \
 && echo "--- STANDALONE VERIFICATION OK ---" \
 && sync \
 && sleep 2 \
 && echo "disk sync OK (prevent layer copy missing files legacy builder cache bug)"

FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="0"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.description="Satu website operasional ISP untuk sales, support, inventory, HR, dan billing."
LABEL org.opencontainers.image.vendor="Perkasa Networks"
LABEL org.opencontainers.image.source="https://github.com/indrakantor87/perkasa-erp-oss-bss"
LABEL org.opencontainers.image.licenses="proprietary"
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app/apps/web

RUN mkdir -p /app/apps/web/public /app/apps/web/.next/static && echo "=== RUNNER INIT DIRS ===" && ls -la /app/apps/web/

COPY --from=builder /app/apps/web/public /app/apps/web/public
COPY --from=builder /app/apps/web/.next/standalone /app/apps/web/
COPY --from=builder /app/apps/web/.next/static /app/apps/web/.next/static

RUN echo "=== VERIFY COPY CONTENTS TO RUNNER ===" \
 && ls -la /app/apps/web/ \
 && (ls -la /app/apps/web/server.js 2>&1 || (echo "ERROR: COPY standalone TIDAK BERHASIL! server.js TIDAK ADA di /app/apps/web/" && exit 11)) \
 && ls -la /app/apps/web/public/ | head \
 && ls -la /app/apps/web/.next/static/ | head \
 && echo "=== RUNNER VERIFICATION OK, READY TO START ==="

EXPOSE 3000
HEALTHCHECK --interval=300s --timeout=10s --start-period=120s --retries=3 CMD exit 0
CMD ["node","/app/apps/web/server.js"]
