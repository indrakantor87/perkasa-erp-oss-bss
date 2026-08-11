FROM node:20-slim AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --omit=optional --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_DISABLE_V8_COMPILE_CACHE=1
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
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN DEBIAN_FRONTEND=noninteractive apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
