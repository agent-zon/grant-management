FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

# Create nginx user directories with proper permissions
RUN mkdir -p /tmp/nginx/cache /tmp/nginx/pid /tmp/nginx/logs && \
    chown -R nginx:nginx /tmp/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /tmp/nginx

# Custom nginx config for non-root
RUN echo 'pid /tmp/nginx/pid/nginx.pid;\n\
events { worker_connections 1024; }\n\
http {\n\
    include /etc/nginx/mime.types;\n\
    default_type application/octet-stream;\n\
    client_body_temp_path /tmp/nginx/cache/client_temp;\n\
    proxy_temp_path /tmp/nginx/cache/proxy_temp;\n\
    fastcgi_temp_path /tmp/nginx/cache/fastcgi_temp;\n\
    uwsgi_temp_path /tmp/nginx/cache/uwsgi_temp;\n\
    scgi_temp_path /tmp/nginx/cache/scgi_temp;\n\
    access_log /tmp/nginx/logs/access.log;\n\
    error_log /tmp/nginx/logs/error.log;\n\
    server {\n\
        listen 8080;\n\
        location / {\n\
            root /usr/share/nginx/html;\n\
            index index.html;\n\
            try_files $uri $uri/ /index.html;\n\
        }\n\
    }\n\
}' > /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

