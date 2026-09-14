FROM node:22-alpine AS base
# Node 22 LTS (Jod). Keep the major in step with .nvmrc and package.json engines.node;
# __tests__/pnpm-toolchain.test.ts fails the build if they drift. Dependabot is
# configured not to raise the major on its own (see .github/dependabot.yml).
# pnpm 12 is a native binary shipped as @pnpm/exe.* optionalDependencies, so the
# npm `pnpm` package resolves linux-{x64,arm64}-musl here without running its own
# install scripts. --ignore-scripts covers this npm install only; Hub's own
# prebuild still runs under `pnpm run build` below.
RUN npm install -g pnpm@12.4.1 --ignore-scripts
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm ci
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
