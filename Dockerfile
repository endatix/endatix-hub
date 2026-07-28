FROM node:26-alpine AS base
RUN npm install -g pnpm@10.18.0
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml .npmrc .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base
# Run as the non-root `node` user (uid 1000) the base image already provides,
# so the Helm chart can enforce runAsNonRoot. --chown matters as much as USER:
# COPY otherwise preserves the build host's directory permissions, and a
# restrictive local umask yields an image that cannot read its own /app/public
# and crashes on startup once it is no longer root.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
CMD ["node", "server.js"]
