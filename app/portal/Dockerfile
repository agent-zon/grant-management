# Use Deno latest
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy dependency files
# COPY server.ts deno.jsonc deno.lock* ./
COPY . .

# Cache dependencies
RUN deno install --allow-scripts=npm:@tailwindcss/oxide@4.1.13
# Copy source code

# RUN deno install --allow-scripts=npm:better-sqlite3@12.2.0

# RUN deno task build

 
 
# Set environment variables
ENV PORT=8080

EXPOSE $PORT
ENV NODE_ENV=production


RUN chown -R deno:deno /app/node_modules \
    && chmod -R u+w /app/node_modules

# Use existing deno user (already exists in denoland/deno image)
# deno numeric representation 1993
USER 1993
 

# Run the application
CMD ["deno", "task", "start"]
