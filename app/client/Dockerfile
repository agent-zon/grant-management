# Stage 1: Build the application (if using TypeScript or a build step)
FROM node:lts-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
CMD ["npm", "run", "start"]