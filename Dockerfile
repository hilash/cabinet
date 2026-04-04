FROM node:22-alpine AS base

# Install dependencies only
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install supported CLI providers
RUN npm install -g @anthropic-ai/claude-code || true
RUN npm install -g @openai/codex || true

# Create non-root user
RUN addgroup --system --gid 1001 cabinet
RUN adduser --system --uid 1001 cabinet

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Data directory (mount as volume)
RUN mkdir -p /app/data && chown cabinet:cabinet /app/data

USER cabinet

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start both Next.js and the unified Cabinet daemon
CMD ["sh", "-c", "node server.js & npx tsx server/cabinet-daemon.ts & wait"]
