FROM ubuntu:focal

# Install dependencies in a single layer
RUN apt-get update && apt-get install -y \
    curl git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /home/app

# Copy package.json and pnpm-lock.yaml first for caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy remaining source files
COPY main.sh index.js ./

# Set executable permissions
RUN chmod +x main.sh index.js

# Set entry point
ENTRYPOINT [ "/home/app/main.sh" ]
