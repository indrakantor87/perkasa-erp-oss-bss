# ============================================================
# PERKASA ERP - GOLDEN STABLE DOCKERFILE (No Tar, No BuildKit)
# 3 stages: deps -> builder -> runner
# ============================================================

# ---------- STAGE 1/3: deps - install npm packages only ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS deps

ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force 2>/dev/null || true

# ---------- STAGE 2/3: builder - run next build and assemble standalone ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096

WORKDIR /app/apps/web

COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./

RUN /bin/bash -eo pipefail -c '\
  echo "=== [1/3 builder] Start next build ==="; \
  npm run build 2>&1 | tee /tmp/build.log | tail -200; \
  rc=${PIPESTATUS[0]}; \
  echo "=== BUILD EXIT CODE: ${rc} ==="; \
  if [ "${rc}" -ne 0 ]; then \
    echo "=== BUILD FAILURE LOG (last 500 lines) ==="; \
    tail -500 /tmp/build.log; \
  fi; \
  exit "${rc}"' \
 && echo "=== [2/3 builder] Verify .next/standalone exists ===" \
 && test -d ".next/standalone" \
 && mkdir -p ".next/standalone/.next/static" \
 && echo "=== [3/3 builder] Assemble standalone: copy static + public + healthcheck (robust) ===" \
 && cp -RT ".next/static" ".next/standalone/.next/static" \
 && if [ -d "public" ]; then cp -RT "public" ".next/standalone/public"; fi \
 && cp "healthcheck.js" ".next/standalone/healthcheck.js" \
 && ./node_modules/.bin/tsc "scripts/migrate-phase-1-1-odp.ts" --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --outDir ".next/standalone" \
 && mkdir -p ".next/standalone/node_modules" \
 && node -e "const fs=require('node:fs');const path=require('node:path');const srcRoot=path.resolve('node_modules');const dstRoot=path.resolve('.next/standalone/node_modules');const visited=new Set();function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}function copyPkg(name){if(visited.has(name))return;visited.add(name);const pkgDir=path.join(srcRoot,name);const pkgJson=path.join(pkgDir,'package.json');if(!fs.existsSync(pkgJson)){throw new Error('Missing dependency in node_modules: '+name);}const dstDir=path.join(dstRoot,name);fs.mkdirSync(path.dirname(dstDir),{recursive:true});if(!fs.existsSync(dstDir)){fs.cpSync(pkgDir,dstDir,{recursive:true});}const meta=readJson(pkgJson);const deps=[...Object.keys(meta.dependencies||{}),...Object.keys(meta.optionalDependencies||{})];for(const dep of deps){copyPkg(dep);} }copyPkg('mysql2');console.log('Copied mysql2 dependency closure to standalone node_modules.');" \
 && node -e "const path=require('node:path');const {createRequire}=require('module');const entry=path.resolve('.next/standalone/migrate-phase-1-1-odp.js');const req=createRequire(entry);req('mysql2/promise');console.log('Standalone runner dependency resolves: mysql2/promise');" \
 && if [ -f ".next/BUILD_ID" ]; then cp ".next/BUILD_ID" ".next/standalone/.next/BUILD_ID"; fi \
 && if [ -d ".next/server" ]; then cp -RT ".next/server" ".next/standalone/.next/server"; fi \
 && echo "=== Standalone verification ===" \
 && ls -la ".next/standalone" | head -30 \
 && test -f ".next/standalone/server.js" \
 && test -f ".next/standalone/healthcheck.js" \
 && test -f ".next/standalone/migrate-phase-1-1-odp.js" \
 && test -d ".next/standalone/node_modules/mysql2" \
 && test -d ".next/standalone/.next/static" \
 && test -d ".next/standalone/.next/static/chunks" \
 && echo "[chunks-js-count] $(find .next/static/chunks -type f -name '*.js' 2>/dev/null | wc -l)" \
 && echo "[chunks-js-count-standalone] $(find .next/standalone/.next/static/chunks -type f -name '*.js' 2>/dev/null | wc -l)" \
 && test "$(find .next/static/chunks -type f -name '*.js' 2>/dev/null | wc -l)" \
      = "$(find .next/standalone/.next/static/chunks -type f -name '*.js' 2>/dev/null | wc -l)" \
 && test -d ".next/standalone/public"

# ---------- STAGE 3/3: runner - production image, only standalone output ----------
FROM --platform=linux/amd64 node:20-bookworm-slim AS runner

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web/standalone
COPY --from=builder /app/apps/web/.next/standalone/ /app/apps/web/standalone/

RUN echo "=== Runner post-copy verification ===" \
 && test -f "/app/apps/web/standalone/server.js"          && echo "  ✓ server.js" \
 && test -f "/app/apps/web/standalone/healthcheck.js"     && echo "  ✓ healthcheck.js" \
 && test -f "/app/apps/web/standalone/migrate-phase-1-1-odp.js" && echo "  ✓ migrate-phase-1-1-odp.js" \
 && test -d "/app/apps/web/standalone/node_modules/mysql2" && echo "  ✓ node_modules/mysql2" \
 && test -d "/app/apps/web/standalone/.next/static"       && echo "  ✓ .next/static" \
 && test -d "/app/apps/web/standalone/public"             && echo "  ✓ public" \
 && node -e "const path=require('node:path');const {createRequire}=require('module');const entry=path.resolve('./migrate-phase-1-1-odp.js');const req=createRequire(entry);req('mysql2/promise');console.log('  ✓ mysql2/promise resolves');" \
 && echo "=== All runner checks passed ==="

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=10s --start-period=240s --retries=5 \
  CMD node /app/apps/web/standalone/healthcheck.js || exit 1

CMD ["node", "server.js"]
