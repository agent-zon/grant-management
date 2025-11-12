FROM node:22-alpine AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM" > /log

RUN npm install -g npm@11.6.2
RUN npm i -g @sap/cds-dk

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files from gen directory
COPY gen/mtx/sidecar/package*.json ./
RUN npm install --omit=dev

# Copy application code from gen directory
COPY gen/mtx/sidecar/ ./

# Change ownership to nodejs user
RUN chown -R 1001:1001 /app
USER 1001

ENV PORT=8080
# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]

