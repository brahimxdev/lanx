# Stage 1: Builder
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps needed for build)
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript
RUN npm run build

# Stage 2: Production Runner
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root user (security best practice)
RUN addgroup -S lanx && adduser -S lanx -G lanx

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Own the files as the non-root user
RUN chown -R lanx:lanx /app
USER lanx

# Expose port
EXPOSE 3000

# Health check - Railway uses this
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start compiled server
CMD ["node", "dist/server.js"]
