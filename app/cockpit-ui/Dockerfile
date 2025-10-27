FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

# Copy custom nginx config and app
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Create writable directories for nginx non-root user (after COPY)
RUN mkdir -p /tmp/nginx/cache/client_temp /tmp/nginx/cache/proxy_temp /tmp/nginx/cache/fastcgi_temp \
             /tmp/nginx/cache/uwsgi_temp /tmp/nginx/cache/scgi_temp /tmp/nginx/pid /tmp/nginx/logs && \
    chown -R 101:101 /tmp/nginx /usr/share/nginx/html /etc/nginx/nginx.conf

USER 101
EXPOSE 8080

# Run nginx with custom config
CMD ["nginx", "-c", "/etc/nginx/nginx.conf", "-g", "daemon off;"]

