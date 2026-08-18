FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim

LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.description="Satu website operasional ISP untuk sales, support, inventory, HR, dan billing."
LABEL org.opencontainers.image.vendor="Perkasa Networks"
LABEL org.opencontainers.image.source="https://github.com/indrakantor87/perkasa-erp-oss-bss"
LABEL org.opencontainers.image.licenses="proprietary"
LABEL org.opencontainers.image.version="0.66.64-stable-pipeline-20260818"

LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="1"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
LABEL coolify.force_recreate="true"
LABEL coolify.cachebust="20260818-STABLE-PIPELINE-v4"
LABEL coolify.nested_container="false"
LABEL coolify.docker_socket_build="true"

ARG CACHEBUST=20260818-stable-pipeline-v4
ARG BUILDKIT_INLINE_CACHE=1

ENV DEBIAN_FRONTEND=noninteractive \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY apps/web/package.json /app/
COPY apps/web/package-lock.json /app/

RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force 2>/dev/null || true

COPY apps/web /app/

ENV NODE_OPTIONS=--max-old-space-size=2048

RUN echo "=== Start Next.js build ===" \
 && next build \
 && echo "=== Build completed - verifying output structure ===" \
 && echo "--- .next/ directory listing ---" \
 && ls -la /app/.next/ 2>/dev/null || echo "WARN: .next dir missing" \
 && echo "--- Check standalone/ ---" \
 && ls -la /app/.next/standalone/ 2>/dev/null || echo "WARN: standalone dir missing" \
 && echo "--- Check .next/static/ ---" \
 && ls -la /app/.next/static/ 2>/dev/null || echo "WARN: static dir missing" \
 && echo "--- Verify server.js existence ---" \
 && if [ -f /app/.next/standalone/server.js ]; then echo "✓ server.js found at .next/standalone/server.js"; else echo "✗ CRITICAL: server.js missing"; exit 255; fi \
 && echo "--- Verify .next/static inside standalone copy ---" \
 && mkdir -p /app/.next/standalone/.next \
 && cp -a /app/.next/static /app/.next/standalone/.next/static \
 && if [ -d /app/.next/standalone/.next/static ]; then echo "✓ .next/static copied into standalone"; else echo "✗ CRITICAL: static copy failed"; exit 255; fi \
 && echo "--- Verify public inside standalone copy ---" \
 && if [ -d /app/public ]; then cp -a /app/public /app/.next/standalone/public && echo "✓ public copied into standalone"; else echo "⚠ public missing, skipping"; fi \
 && echo "--- Verify healthcheck inside standalone copy ---" \
 && cp /app/healthcheck.js /app/.next/standalone/healthcheck.js \
 && if [ -f /app/.next/standalone/healthcheck.js ]; then echo "✓ healthcheck.js copied into standalone"; else echo "✗ CRITICAL: healthcheck copy failed"; exit 255; fi \
 && echo "=== All verifications passed ===" \
 && echo "--- Final standalone tree ---" \
 && ls -la /app/.next/standalone/

WORKDIR /app/.next/standalone

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=10s --start-period=180s --retries=5 \
  CMD node healthcheck.js || exit 1

CMD ["node", "server.js"]
