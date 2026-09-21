FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
RUN groupadd --gid 1001 loomdesk && useradd --uid 1001 --gid loomdesk loomdesk && mkdir /data && chown loomdesk:loomdesk /data
COPY --from=builder --chown=loomdesk:loomdesk /app/.next/standalone ./
COPY --from=builder --chown=loomdesk:loomdesk /app/.next/static ./.next/static
COPY --from=builder --chown=loomdesk:loomdesk /app/public ./public
USER loomdesk
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
