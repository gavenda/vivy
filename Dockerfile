# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM docker.io/oven/bun:1.3-alpine AS base
WORKDIR /usr/src/app

FROM base AS install

RUN mkdir -p /tmp/vivy
COPY package.json bun.lock /tmp/vivy/
RUN cd /tmp/vivy && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /tmp/vivy/node_modules node_modules
COPY . .

# run the app
USER bun
ENTRYPOINT [ "bun", "run", "index.ts" ]