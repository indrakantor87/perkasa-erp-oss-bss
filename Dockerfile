FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20-bookworm-slim

LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.description="Satu website operasional ISP untuk sales, support, inventory, HR, dan billing."
LABEL org.opencontainers.image.vendor="Perkasa Networks"
LABEL org.opencontainers.image.source="https://github.com/indrakantor87/perkasa-erp-oss-bss"
LABEL org.opencontainers.image.licenses="proprietary"
LABEL org.opencontainers.image.version="0.66.65-stable-pipeline-fallback-20260818"

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
LABEL coolify.cachebust="20260818-STABLE-PIPELINE-FALLBACK-v5"
LABEL coolify.nested_container="false"
LABEL coolify.docker_socket_build="true"

ARG CACHEBUST=20260818-stable-pipeline-fallback-v5
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

RUN echo "=== 1/5 Check build context files (sanity) ===" \
 && for f in package.json next.config.ts next-env.d.ts shims.d.ts tsconfig.json postcss.config.js tailwind.config.ts app/layout.tsx healthcheck.js; do \
      if [ -f "/app/$f" ]; then echo "  ✓ $f"; else echo "  ✗ MISSING (critical for build): $f"; fi; \
    done \
 && echo "" \
 && echo "=== 2/5 Start Next.js build ===" \
 && next build 2>&1 | tail -80 \
 && BUILD_RC=${PIPESTATUS[0]} \
 && if [ "$BUILD_RC" != "0" ]; then echo "✗ next build exit=$BUILD_RC - aborting"; exit 255; fi \
 && echo "" \
 && echo "=== 3/5 Inspect .next/ output tree ===" \
 && echo "--- Top level /app/.next/ listing ---" \
 && ls -la /app/.next/ 2>/dev/null || echo "  [WARN] /app/.next/ directory missing!" \
 && echo "" \
 && echo "--- Recursive 2-level .next tree ---" \
 && (find /app/.next -maxdepth 2 -type d -o -type f 2>/dev/null | sort | head -100) || echo "  [WARN] find failed" \
 && echo "" \
 && echo "=== 4/5 Strategy: Try standalone first, FALLBACK to next start ===" \
 && if [ -f /app/.next/standalone/server.js ]; then \
      echo "✓ STRATEGY A: output:standalone DETECTED - optimizing runtime to standalone/" \
   && mkdir -p /app/.next/standalone/.next \
   && cp -a /app/.next/static /app/.next/standalone/.next/static \
   && if [ -d /app/public ]; then cp -a /app/public /app/.next/standalone/public; fi \
   && cp /app/healthcheck.js /app/.next/standalone/healthcheck.js \
   && for verify in "server.js|/app/.next/standalone/server.js" ".next/static|/app/.next/standalone/.next/static" "public|/app/.next/standalone/public" "healthcheck.js|/app/.next/standalone/healthcheck.js"; do \
        name="${verify%%|*}"; path="${verify##*|}"; \
        if [ -e "$path" ]; then echo "    ✓ standalone verified: $name"; else echo "    ✗ STANDALONE BROKEN: missing $name at $path"; exit 255; fi; \
      done \
   && echo "export RUNTIME_STRATEGY=standalone" > /app/.runtime-env.sh \
   && echo "✓ Runtime strategy: STANDALONE (smaller memory, faster cold start)" \
   && echo "--- Standalone tree root ---" \
   && ls -la /app/.next/standalone/ | head -40; \
    else \
      echo "⚠ STRATEGY B: standalone NOT FOUND - using FALLBACK runtime: 'next start' with node_modules" \
   && cp /app/healthcheck.js /app/healthcheck-runtime.js \
   && echo "export RUNTIME_STRATEGY=nextstart" > /app/.runtime-env.sh \
   && for verify in "next binary|/app/node_modules/.bin/next" ".next/static|/app/.next/static" "package.json|/app/package.json" "healthcheck.js|/app/healthcheck-runtime.js"; do \
        name="${verify%%|*}"; path="${verify##*|}"; \
        if [ -e "$path" ]; then echo "    ✓ nextstart verified: $name"; else echo "    ✗ NEXTSTART BROKEN: missing $name at $path"; exit 255; fi; \
      done \
   && echo "✓ Runtime strategy: NEXT START (node_modules available, compatibility mode)" ; \
    fi \
 && echo "" \
 && echo "=== 5/5 Build + strategy verification PASSED ==="

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=10s --start-period=240s --retries=5 \
  CMD /bin/sh -c '. /app/.runtime-env.sh ; if [ "$RUNTIME_STRATEGY" = "standalone" ]; then cd /app/.next/standalone && node healthcheck.js || exit 1; else cd /app && node healthcheck-runtime.js || exit 1; fi'

CMD /bin/sh -c '. /app/.runtime-env.sh ; if [ "$RUNTIME_STRATEGY" = "standalone" ]; then cd /app/.next/standalone && exec node server.js; else cd /app && exec npx next start -p 3000 -H 0.0.0.0; fi'
