# Use the official Deno runtime as the base image
FROM denoland/deno:2.5.1

# Set the working directory
WORKDIR /app

# Copy the prebuilt application
COPY build/ ./build/
COPY package.json ./
COPY deno.jsonc ./
COPY deno.lock* ./
COPY react-router.config.ts ./

# Copy the server entry point
COPY . .

RUN deno install --allow-scripts=npm:@tailwindcss/oxide@4.1.7


ENV PORT=8080
# Expose the port
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["deno", "run", "start"]
