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
ARG PSB_ERP_BUILD_SENTINEL=20260817-data-psb-import-export-v4
ARG CACHEBUST=1
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
 && echo "--- PACK public/ KE TARBALL public.tar di builder root (fix legacy builder COPY subfolder kecil parse path salah) ---" \
 && tar -cf /app/apps/web/public.tar -C /app/apps/web public \
 && (ls -la /app/apps/web/public.tar 2>&1 || (echo "ERROR: public.tar gagal dibuat di builder root /app/apps/web/" && exit 6)) \
 && echo "--- VERIFY BUILDER OUTPUT LENGKAP ---" \
 && ls -la /app/apps/web/ | head -n 20 \
 && ls -la /app/apps/web/.next/static/ | head -n 8 \
 && echo "--- BUILDER LAYER SELESAI ---" \
 && sync \
 && sleep 2 \
 && sync \
 && sleep 1 \
 && sync \
 && echo "disk sync x3 OK (flush overlay2 agar file tidak hilang saat copy ke runner)"

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

RUN mkdir -p /app/apps/web /app/apps/web/.next

COPY --from=builder /app/apps/web/.next/standalone /app/apps/web/
COPY --from=builder /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=builder /app/apps/web/public.tar /tmp/public.tar

RUN echo "=== FINAL RUNNER: extract public.tar + verify SEMUA copy BERHASIL SEKALIGUS ===" \
 && tar -xf /tmp/public.tar -C /app/apps/web \
 && rm -f /tmp/public.tar \
 && echo "--- [1/5] Verify server.js ---" \
 && (ls -la /app/apps/web/server.js 2>&1 || (echo "ERROR: server.js TIDAK ADA di /app/apps/web/ - COPY standalone GAGAL!" && exit 11)) \
 && echo "--- [2/5] Verify package.json runner ---" \
 && (ls -la /app/apps/web/package.json 2>&1 || (echo "ERROR: package.json TIDAK ADA di runner root" && exit 12)) \
 && echo "--- [3/5] Verify .next/static folder ---" \
 && (ls -la /app/apps/web/.next/static/ 2>&1 | head -n 8 || (echo "ERROR: .next/static TIDAK ADA / KOSONG" && exit 13)) \
 && echo "--- [4/5] Verify public/branding folder ---" \
 && (ls -la /app/apps/web/public/ 2>&1 | head -n 8 || (echo "ERROR: public folder TIDAK ADA / KOSONG" && exit 14)) \
 && (ls -la /app/apps/web/public/branding/ 2>&1 | head -n 8 || (echo "ERROR: public/branding TIDAK ADA (extract tar salah)" && exit 15)) \
 && echo "--- [5/5] ls root runner final ---" \
 && ls -la /app/apps/web/ \
 && sync \
 && sleep 1 \
 && echo "=== RUNNER LAYER FINAL OK, SEMUA COPY TERCOPY DENGAN BENAR ==="

EXPOSE 3000
HEALTHCHECK --interval=300s --timeout=10s --start-period=120s --retries=3 CMD exit 0
CMD ["node","/app/apps/web/server.js"]
