FROM --platform=$TARGETPLATFORM node:22-alpine AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN npm install -g npm@11.6.2

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files from CDS build output
COPY gen/mtx/sidecar/package*.json ./
RUN npm install --omit=dev

# Copy sidecar application code
COPY gen/mtx/sidecar/ ./
COPY mtx/sidecar/server.js ./srv/server.js

# Change ownership to nodejs user
RUN chown -R 1001:1001 /app
USER 1001

ENV PORT=8080
EXPOSE $PORT

CMD ["npm", "start"]
