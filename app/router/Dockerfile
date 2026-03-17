FROM sapse/approuter:20.8.0

COPY favicon.svg favicon.svg
COPY health.html .
COPY auth/ auth/
COPY api-docs/ api-docs/
COPY xs-app.json .
COPY default-env.json .
COPY custom-server.js sketch-proxy.js .
COPY sketches/ sketches/
COPY sketches-destinations.json .
COPY tsconfig.json .
COPY package.json package-lock.json* ./
USER root
RUN chown -R node:node /app
USER node
RUN npm install --omit=dev

# Custom server uses approuter module with Express sketch middleware (useOrFetchDestination)
CMD ["node", "--import", "tsx", "custom-server.js"]
    

