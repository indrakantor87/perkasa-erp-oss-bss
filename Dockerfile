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
RUN npm run build

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

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

EXPOSE 3000
HEALTHCHECK --interval=300s --timeout=10s --start-period=120s --retries=3 CMD exit 0
CMD ["node","server.js"]
