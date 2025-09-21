# OAuth 2.0 Grant Management API - Dev Container Dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    jq \
    sqlite3 \
    build-essential \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Install Docker CLI (for Docker-in-Docker)
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Set up Deno environment
ENV DENO_DIR="/workspace/.deno"
RUN mkdir -p /workspace/.deno

# Install global Node.js packages
RUN npm install -g \
    @sap/cds-dk \
    typescript \
    ts-node \
    nodemon \
    eslint \
    prettier

# Set up workspace directory
WORKDIR /workspace

# Copy package files for dependency caching
COPY package*.json ./
COPY srv/package.json ./srv/
COPY srv/deno.jsonc ./srv/

# Install Node.js dependencies
RUN npm install

# Cache Deno dependencies
WORKDIR /workspace/srv
RUN deno cache deno.jsonc

# Return to workspace root
WORKDIR /workspace

# Set up Git configuration
RUN git config --global init.defaultBranch main

# Create useful aliases and environment setup
RUN echo 'alias cds-dev="cd /workspace && npm run dev"' >> ~/.bashrc \
    && echo 'alias cds-build="cd /workspace && npm run build"' >> ~/.bashrc \
    && echo 'alias cds-deploy="cd /workspace && npm run deploy"' >> ~/.bashrc \
    && echo 'alias deno-dev="cd /workspace/srv && deno task dev"' >> ~/.bashrc \
    && echo 'alias deno-build="cd /workspace/srv && deno task build"' >> ~/.bashrc \
    && echo 'alias deno-start="cd /workspace/srv && deno task start"' >> ~/.bashrc \
    && echo 'alias db-reset="cd /workspace && rm -f db.sqlite && npm run deploy && npm run mockdata"' >> ~/.bashrc \
    && echo 'alias db-view="cd /workspace && sqlite3 db.sqlite"' >> ~/.bashrc \
    && echo 'alias logs="cd /workspace && npm run dev 2>&1 | tee dev.log"' >> ~/.bashrc \
    && echo 'alias test-api="curl -X GET http://localhost:4004/api/grants"' >> ~/.bashrc

# Set environment variables
ENV NODE_ENV=development
ENV CDS_ENV=development
ENV DENO_DIR=/workspace/.deno

# Expose ports
EXPOSE 3000 4004 5173 8080

# Set the default user
USER node

# Set the default command
CMD ["bash"]
