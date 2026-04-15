# --- Build stage ---
FROM node:22-alpine AS builder

# Native module build dependencies
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/multica-core/package.json ./packages/multica-core/
COPY packages/multica-views/package.json ./packages/multica-views/
COPY packages/multica-ui/package.json ./packages/multica-ui/
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3 node-pty

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine

WORKDIR /app

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/node-pty ./node_modules/node-pty

# Data directory
RUN mkdir -p /data
ENV CABINET_DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
