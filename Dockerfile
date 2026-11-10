# Builds the registry's docs site and serves the static export with nginx.
#
#   docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t my-registry .
#   docker run --rm -p 8080:80 my-registry
#
# For now the @behivetech packages install from GitHub Packages (see .npmrc), so
# the install needs a token with read:packages: pass it as the build secret
# npm_token (never a build arg, which stays in the image history). It is written
# to a throwaway ~/.npmrc for the install and removed in the same layer.
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
RUN --mount=type=secret,id=npm_token \
    sh -c 'NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token 2>/dev/null || true)"; export NODE_AUTH_TOKEN; \
    echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}" > "$HOME/.npmrc"; \
    pnpm install --frozen-lockfile; status=$?; rm -f "$HOME/.npmrc"; exit $status'
ARG REGISTRY_READ_TOKEN=""
ENV REGISTRY_READ_TOKEN=$REGISTRY_READ_TOKEN
RUN pnpm build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/docs/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
