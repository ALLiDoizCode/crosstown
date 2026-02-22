# Git Proxy - ILP-Gated Git HTTP Proxy
# Multi-stage build for minimal image size
#
# Build from repo root:
#   docker build -f packages/git-proxy/Dockerfile -t crosstown/git-proxy .

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json .npmrc ./

# Copy package.json files
COPY packages/git-proxy/package.json packages/git-proxy/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/git-proxy/src/ packages/git-proxy/src/
COPY packages/git-proxy/tsconfig.json packages/git-proxy/tsup.config.ts packages/git-proxy/

# Build package
RUN pnpm --filter @crosstown/git-proxy build

# Create production deployment
RUN pnpm --filter @crosstown/git-proxy deploy --prod /prod

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy production deployment
COPY --from=builder /prod/dist ./dist
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./

# Set production environment
ENV NODE_ENV=production
ENV GIT_PROXY_PORT=3002

# Expose proxy port
EXPOSE 3002

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3002/health || exit 1

# Start proxy
CMD ["node", "dist/entrypoint.js"]
