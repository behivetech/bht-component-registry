# Deploy

`pnpm build` writes the whole site to `apps/docs/out` as HTML, CSS and JavaScript. There is no server, no database and no environment variable to set, so deploying is serving a folder. The only thing a host has to get right is answering unknown paths with `404.html` and a real 404 status. Every option below starts from the same build.

## The build

```bash
pnpm build
```

Turborepo builds every registry package first (`dist/` and `docs.json`), then the docs app regenerates the catalog and runs `next build` with `output: "export"`. The result is `apps/docs/out`. Check it locally the way a static host serves it:

```bash
pnpm serve
```

That serves `apps/docs/out` on http://localhost:3000, answering unknown paths with `404.html` and a 404 status.

Optional: set `REGISTRY_READ_TOKEN` in the build environment if your packages are on a private registry and you want the Changelog tab to list published versions. See [Publishing](publishing.md).

## Vercel

Import the repository; Vercel detects pnpm and Turborepo. Settings:

- Framework preset: Next.js
- Root directory: leave as the repo root
- Build command: `pnpm build`
- Output directory: `apps/docs/out`

Next's static export tells Vercel how to serve `404.html`, so nothing else is needed. Every push to `main` redeploys; pull requests get preview URLs.

## Netlify

- Build command: `pnpm build`
- Publish directory: `apps/docs/out`

Netlify serves `404.html` from the publish directory with a 404 status automatically.

## Cloudflare Pages

- Framework preset: None
- Build command: `pnpm build`
- Build output directory: `apps/docs/out`

Cloudflare Pages serves a root `404.html` as the not-found page with a 404 status.

## Any static host, S3 and CloudFront

Upload `apps/docs/out` to the host or bucket. Then map not-found responses to `404.html`:

- **S3 static website hosting**: set the error document to `404.html`.
- **CloudFront**: add a custom error response for 403 and 404 that returns `/404.html` with response code 404 (S3 returns 403 for missing keys unless the bucket is public).
- **GitHub Pages**: it serves a root `404.html` as the not-found page by default. Set the Pages source to a branch or an Actions upload of `apps/docs/out`.
- **nginx or Apache on your own server**: see the `nginx.conf` at the repo root; the Apache equivalent is `ErrorDocument 404 /404.html`.

Routes are extensionless (`/acme/atoms/button`) and the export writes `button.html`, so the host must try `$uri.html` as well. Most static hosts do this by default; for nginx the `try_files` line below does it.

## Docker

The repo root has a multi-stage `Dockerfile` (Node to build, `nginx:alpine` to serve) and an `nginx.conf`.

```bash
docker build -t my-registry .
docker run -p 8080:80 my-registry
```

Open http://localhost:8080. The nginx config maps `404` to `/404.html` and uses `try_files $uri $uri.html $uri/ =404`, so unknown routes return a real 404 status, not a 200 with a not-found body.

Run it anywhere a container runs: a VM, Kubernetes, Fly.io, Cloud Run, ECS. Nothing in the image needs configuration at runtime.

## Custom domains

Point your domain at the host as its documentation says (a CNAME for Vercel, Netlify, Cloudflare Pages and GitHub Pages; an A record or load balancer for your own server). The site uses relative links and no base path, so it works at any domain. If you need to serve it under a path prefix (`example.com/components`), set `basePath` in `apps/docs/next.config.ts` and rebuild; note that `update` replaces that file, so keep the change in a commit you can re-apply.

## Rebuilding on changes

The site is static, so it changes only when you rebuild. Hosts connected to the repo rebuild on every push. For a manual host, rebuild and re-upload after merging a component change or a release. The release workflow does not deploy the site; your host does.

## Related

- [Getting started](getting-started.md)
- [Publishing](publishing.md)
- [Testing and CI](testing-and-ci.md)
- [Updating](updating.md)
- [FAQ](faq.md)
