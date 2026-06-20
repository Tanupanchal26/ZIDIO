FROM node:18-alpine AS base
WORKDIR /usr/src/app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Production image ──────────────────────────────────────────────────────────
FROM base AS production

# Drop to non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 5000

# Tini as PID-1 for proper signal handling
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
