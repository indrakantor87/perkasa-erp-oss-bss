FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS deps
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
LABEL org.opencontainers.image.version="0.66.66-golden-recommit-20260818"
ARG BUILDKIT_INLINE_CACHE=1
ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --ignore-scripts

FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS builder
LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="0"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
ARG BUILDKIT_INLINE_CACHE=1
ARG CACHEBUST=gha-golden-recommit-v0
ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN echo "=== GOLDEN BUILD: next build ===" \
 && npm run build 2>&1 | tail -60 \
 && echo "=== POST-BUILD: standalone structure assembly ===" \
 && ls -la .next 2>/dev/null \
 && if [ ! -d .next/standalone ]; then echo "ERROR: .next/standalone missing! Aborting golden build." >&2; exit 255; fi \
 && mkdir -p .next/standalone/.next \
 && cp -a .next/static .next/standalone/.next/static \
 && if [ -d public ]; then cp -a public .next/standalone/public; fi \
 && cp healthcheck.js .next/standalone/healthcheck.js \
 && echo "=== Final standalone root ===" \
 && ls -la .next/standalone \
 && echo "=== Standalone .next/ folder ===" \
 && ls -la .next/standalone/.next

FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim AS runner
LABEL coolify.engine="dockerfile"
LABEL coolify.build_pack="dockerfile"
LABEL coolify.helper="disabled"
LABEL coolify.use_helper="0"
LABEL coolify.buildkit="0"
LABEL coolify.buildx="0"
LABEL coolify.disable_buildx="true"
LABEL coolify.disable_helper="true"
LABEL coolify.skip_prepare_builder="true"
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app/apps/web
COPY --from=builder /app/apps/web/.next/standalone /app/apps/web
RUN echo "=== GOLDEN RUNNER POST-COPY VERIFICATION ===" \
 && test -f /app/apps/web/server.js && echo "✓ server.js OK" || (echo "✗ server.js MISSING at /app/apps/web/server.js - GOLDEN IMAGE BROKEN" && ls -laR /app/apps/web | head -80 && exit 255) \
 && test -f /app/apps/web/healthcheck.js && echo "✓ healthcheck.js OK" \
 && test -d /app/apps/web/.next/static && echo "✓ .next/static/ OK" \
 && test -d /app/apps/web/public && echo "✓ public/ OK"
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=10s --start-period=240s --retries=5 CMD node /app/apps/web/healthcheck.js || exit 1
CMD ["node", "/app/apps/web/server.js"]
