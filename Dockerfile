FROM docker.io/oven/bun:1.3-alpine AS base

WORKDIR /usr/src/vivy

FROM base AS install

RUN mkdir -p /tmp/vivy
COPY package.json bun.lock /tmp/vivy/
RUN cd /tmp/vivy && bun install --frozen-lockfile --production

FROM base AS release

RUN mkdir logs
COPY --from=install /tmp/vivy/node_modules node_modules
COPY src ./src
COPY package.json tsconfig.json index.ts .

USER bun
ENTRYPOINT [ "bun", "run", "index.ts" ]