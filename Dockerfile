FROM --platform=$TARGETPLATFORM node:22-alpine AS build
ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "I am running on $BUILDPLATFORM, building for $TARGETPLATFORM" > /log

# Install global dependencies
RUN npm install -g npm@11.6.2
RUN npm i -g @sap/cds-dk
RUN npm i -g typescript ts-node tsx

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build the application
RUN npx cds build --production

# Change ownership to nodejs user
RUN chown -R 1001:1001 /app
USER 1001

ENV PORT=4004
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]
