# Multi-stage Dockerfile for Crossword App
# Stage 1: Build client and server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source
COPY packages/ ./packages/
COPY tsconfig*.json ./

# Build shared, client, and server
RUN npm run build -w @crossword/shared
RUN npm run build -w @crossword/client
RUN npm run build -w @crossword/server

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start server
CMD ["node", "packages/server/dist/index.js"]
