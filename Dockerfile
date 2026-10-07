# Builds the registry's docs site and serves the static export with nginx.
#
#   docker build -t my-registry .
#   docker run --rm -p 8080:80 my-registry
#
# The build stage needs network access to install dependencies and, when
# REGISTRY_READ_TOKEN is passed as a build arg, to list published versions
# from a private registry. The runtime image is nginx and the exported folder,
# nothing else. See docs/deploy.md.

FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
# One copy, then install: workspace packages ship bin scripts and source that
# pnpm links at install time, so a manifests-only first layer breaks linking.
COPY . .
RUN pnpm install --frozen-lockfile
ARG REGISTRY_READ_TOKEN=""
ENV REGISTRY_READ_TOKEN=$REGISTRY_READ_TOKEN
RUN pnpm build --ui=stream

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/docs/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
