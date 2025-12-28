# Simple Dockerfile for running pre-built server
# Use when building locally and uploading dist/ folders

FROM node:20-alpine

WORKDIR /app

# Create workspace structure and minimal package.json files first
RUN mkdir -p packages/server packages/shared packages/client

# Create the package.json files for module resolution BEFORE installing deps
RUN echo '{"name":"@crossword/shared","version":"0.0.1","type":"module","main":"dist/index.js","exports":{".":"./dist/index.js"}}' > packages/shared/package.json
RUN echo '{"name":"@crossword/server","version":"0.0.1","type":"module","main":"dist/index.js"}' > packages/server/package.json
RUN echo '{"name":"crossword","version":"0.0.1","type":"module","private":true,"workspaces":["packages/shared","packages/server"]}' > package.json

# Copy pre-built dist files
COPY dist/server/ ./packages/server/dist/
COPY dist/shared/ ./packages/shared/dist/

# Install ALL production dependencies (including zod for shared package)
RUN npm install zod ioredis express multer express-rate-limit uuid socket.io cors --omit=dev

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start server
CMD ["node", "packages/server/dist/index.js"]
