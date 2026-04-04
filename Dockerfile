FROM node:22-alpine AS base

# Install dependencies only
FROM base AS deps
RUN apk add --no-cache python3 make g++ linux-headers
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

# Install Claude CLI, gh CLI, and git (needed for worktrees)
RUN npm install -g @anthropic-ai/claude-code || true
RUN apk add --no-cache github-cli git

# Create non-root user with proper home directory
RUN addgroup --system --gid 1001 cabinet
RUN adduser --system --uid 1001 --home /home/cabinet cabinet
ENV HOME=/home/cabinet

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Data directory (mount as volume)
RUN mkdir -p /app/data && chown cabinet:cabinet /app/data

# Repos and worktrees directories (mount points)
RUN mkdir -p /repos /worktrees && chown cabinet:cabinet /repos /worktrees

USER cabinet

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start both Next.js and the unified Cabinet daemon
CMD ["sh", "-c", "node server.js & npx tsx server/cabinet-daemon.ts & wait"]
