# ================================
# Stage 1: Dependencies
# ================================
FROM oven/bun:1.3.3-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml .npmrc ./

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ================================
# Stage 2: Prisma Generation
# ================================
FROM oven/bun:1.3.3-alpine AS prisma-gen

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy Prisma schema and config
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma client
RUN bunx prisma generate

# ================================
# Stage 3: Builder
# ================================
FROM oven/bun:1.3.3-alpine AS builder

WORKDIR /app

# Copy dependencies and generated Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma-gen /app/prisma/generated ./prisma/generated

# Copy application source
COPY . .

# Build the application (if there's a build step)
# Note: Bun typically doesn't need a build step for TypeScript
# But we'll keep this stage for potential future build requirements

# ================================
# Stage 4: Production Runtime
# ================================
FROM oven/bun:1.3.3-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package.json bun.lock bunfig.toml .npmrc ./
RUN bun install --frozen-lockfile --production

# Copy Prisma schema and generated client
COPY --from=prisma-gen /app/prisma ./prisma
COPY prisma.config.ts ./

# Copy application source files
COPY bun-server.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY client ./client
COPY domain ./domain
COPY server ./server
COPY utilities ./utilities
COPY workflows ./workflows
COPY scripts ./scripts

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunuser -u 1001 && \
    chown -R bunuser:nodejs /app

# Switch to non-root user
USER bunuser

# Expose the application port
EXPOSE 7373

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run -e "fetch('http://localhost:7373').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "bun-server.ts"]
