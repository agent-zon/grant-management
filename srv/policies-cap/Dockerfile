# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install CDS CLI for database deployment
RUN npm install -g @sap/cds-dk

# Copy application files
COPY srv/ ./srv/
COPY app/ ./app/
COPY db/ ./db/
COPY yaml-examples/ ./yaml-examples/
COPY init-db.js ./

# Initialize database using custom script
RUN node init-db.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4004/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the server
CMD ["npm", "start"]