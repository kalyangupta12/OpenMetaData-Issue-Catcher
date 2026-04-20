# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed deps from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source
COPY package.json ./
COPY src/ ./src/

# State file volume (persisted across container restarts)
VOLUME ["/app/data"]

# Redirect seen_issues.json to /app/data so it persists
ENV STATE_DIR=/app/data

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "src/index.js"]
