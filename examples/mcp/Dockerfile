FROM node:22-alpine AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM" > /log

RUN npm install -g npm@11.6.2
RUN npm i -g @sap/cds-dk
RUN npm i -g typescript ts-node tsx

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001


WORKDIR /app

# Copy package files
COPY gen/srv/package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY gen/srv/ ./
COPY srv/server.js ./srv/server.js
COPY tsconfig.json ./
COPY tsconfig.cdsbuild.json ./
COPY types/ ./types/
COPY @cds-models/ ./@cds-models/
RUN npm install

# Change ownership to nodejs user
RUN chown -R 1001:1001 /app
USER 1001

# USER node

ENV PORT=8080
# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]
