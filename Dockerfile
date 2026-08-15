FROM --platform=linux/amd64 node:20-bookworm-slim AS deps
LABEL coolify.engine="dockerfile"
LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.description="Satu website operasional ISP untuk sales, support, inventory, HR, dan billing."
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --ignore-scripts

FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
LABEL coolify.engine="dockerfile"
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
LABEL coolify.engine="dockerfile"
LABEL org.opencontainers.image.title="Perkasa ERP OSS BSS"
LABEL org.opencontainers.image.vendor="Perkasa Networks"
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

EXPOSE 3000
HEALTHCHECK --interval=300s --timeout=10s --start-period=120s --retries=3 CMD exit 0
CMD ["node","server.js"]
