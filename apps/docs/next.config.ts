import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything on this site is known at build time: the catalog is generated
  // from the registry folder tree before `next build`, and there is no auth,
  // no database and no request-time data. A static export is therefore the
  // whole site — a folder of HTML, CSS and JS that any host can serve.
  // See docs/deploy.md.
  output: "export",
  // A static host has no way to render an unknown route on demand, so every
  // page must come from generateStaticParams; the routes set
  // `dynamicParams = false` to make that explicit.
  trailingSlash: false,
  // Workspace tooling packages ship TypeScript source, not a build.
  transpilePackages: ["@bht-component-registry/class-names"],
};

export default nextConfig;
