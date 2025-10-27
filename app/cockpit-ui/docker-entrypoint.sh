#!/bin/sh
set -e

# Create nginx temp directories at runtime
mkdir -p /tmp/nginx/cache/client_temp \
         /tmp/nginx/cache/proxy_temp \
         /tmp/nginx/cache/fastcgi_temp \
         /tmp/nginx/cache/uwsgi_temp \
         /tmp/nginx/cache/scgi_temp \
         /tmp/nginx/pid \
         /tmp/nginx/logs

# Start nginx
exec nginx -c /etc/nginx/nginx.conf -g "daemon off;"

