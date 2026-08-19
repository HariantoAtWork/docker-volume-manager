# oven/bun:canary-alpine is a moving tag (Bun canary on Alpine/musl).
# Pin a digest in production if you need a reproducible image.
FROM oven/bun:canary-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# postinstall runs `nuxt prepare`, which needs the full source tree.
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:canary-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:canary-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# nsenter into host PID 1's mount ns requires root (Compose privileged + pid: host).
USER root
# Alpine 3.22 ships BusyBox nsenter; util-linux-misc replaces it with the
# util-linux binary the entrypoint expects (-t/-m and --wdns=).
RUN apk add --no-cache util-linux-misc

COPY --from=build /app/.output ./.output
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
# Compose may still pass the full nsenter command; the entrypoint strips it.
CMD ["bun", ".output/server/index.mjs"]
