FROM node:latest

# Enable pnpm
RUN corepack enable pnpm

# Create app directory
RUN mkdir -p /app/vivy
WORKDIR /app/vivy

# Copy package.json, pnpm-workspace.yaml and pnpm-lock.yaml
COPY package.json /app/vivy
COPY pnpm-lock.yaml /app/vivy
COPY pnpm-workspace.yaml /app/vivy

# Run install
RUN pnpm install

# Copy source files
COPY . /app/vivy

# Start app
CMD ["node", "--import", "tsx/esm", "./dist/app.ts"]