FROM node:20-alpine
RUN npm install -g npm@latest

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Set PORT environment variable
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Run as non-root user
RUN addgroup -g 1993 -S nodejs && \
    adduser -S nodejs -u 1993 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start the application
CMD ["npm", "run", "start"]