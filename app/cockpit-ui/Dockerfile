FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npm run build

FROM nginx:alpine

# Copy custom nginx config, app, and entrypoint
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=builder /app/dist /usr/share/nginx/html

# Set permissions
RUN chmod +x /docker-entrypoint.sh && \
    chown -R 101:101 /usr/share/nginx/html /etc/nginx/nginx.conf

USER 101
EXPOSE 8080

# Use custom entrypoint that creates temp dirs at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]

