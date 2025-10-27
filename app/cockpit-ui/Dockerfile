FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Change ownership to nodejs user
RUN chown -R 1001:1001 /app
USER 1001

EXPOSE 8080

# Start the application using a simple HTTP server
CMD ["npx", "serve", "-s", "dist", "-l", "8080"]

