import type { NextConfig } from "next";
import { normalizeBasePath } from "./lib/hosting/base-path";
import { resolveHubBuild } from "./lib/hosting/hub-build.mjs";
import { getHubDeploymentId } from "./lib/hosting/hub-version";
import { getRewriteRuleFor } from "./lib/hosting/next-config-helper";
import { Rewrite } from "next/dist/lib/load-custom-routes";
import { withEndatix } from "@/features/config";
import { OTEL_SERVER_EXTERNAL_PACKAGES } from "./features/telemetry/infrastructure/otel-server-externals";

// Resolved once at build. `env` replaces each `process.env.HUB_*` read with its value
// at build, so a standalone server (which never runs this file) still has them. Only
// server code reads them (lib/hosting/hub-version.ts, from the About dialog's server
// action) and does not import hub-build.mjs, so they land in server chunks only;
// the release check greps .next/static.
const hubBuild = resolveHubBuild();

const nextConfig: NextConfig = {
  env: {
    HUB_VERSION: hubBuild.version ?? "",
    HUB_BRANCH: hubBuild.branch ?? "",
    HUB_COMMIT: hubBuild.commit ?? "",
  },
  // Skew protection. Opaque hash of the build so ?dpl= is not the semver.
  deploymentId: getHubDeploymentId(hubBuild),
  output: "standalone", // Used to decrease the size of the application, check https://nextjs.org/docs/pages/api-reference/next-config-js/output
  basePath: normalizeBasePath(),
  // Keep OTel + Azure exporters out of the server bundle so instrumentation and
  // route handlers share one @opentelemetry/api-logs global (otherwise emit() is a no-op).
  serverExternalPackages: [...OTEL_SERVER_EXTERNAL_PACKAGES],
  typedRoutes: true,
  reactStrictMode: true,
  reactCompiler: true,
  typescript: {
    // App/build typecheck excludes tests; root tsconfig.json keeps @/ working in the IDE
    tsconfigPath: "tsconfig.next.json",
  },
  turbopack: {
    resolveAlias: {
      "@": __dirname,
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    globalNotFound: true,
    // Native Turbopack React Compiler (Babel plugin kept as --webpack fallback)
    turbopackRustReactCompiler: true,
    // Dev-only: drop unused Turbopack compile cache from memory and disk.
    turbopackGc: true,
  },
  images: {
    remotePatterns: [],
    maximumRedirects: 3,
  },
  rewrites: async () => {
    const rules = {
      beforeFiles: new Array<Rewrite>(),
      afterFiles: new Array<Rewrite>(),
      fallback: new Array<Rewrite>(),
    };

    const headerRouteFix = getRewriteRuleFor("header");
    const postHogRewrites = [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
    rules.beforeFiles.push(headerRouteFix);
    rules.beforeFiles.push(...postHogRewrites);
    return rules;
  },
  redirects: async () => [
    {
      source: "/",
      destination: "/signin",
      permanent: false,
    },
    {
      source: "/login",
      destination: "/signin",
      permanent: true,
    },
  ],
  headers: async () => [
    {
      // Security headers for embeddable form pages
      source: "/embed/:path*",
      headers: [
        {
          // Allows embedding in iframes from any origin
          key: "Content-Security-Policy",
          value: "frame-ancestors *",
        },
        {
          // Sends origin only for cross-origin requests, full URL for same-origin
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          // Prevents MIME-type sniffing attacks
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
      ],
    },
    {
      source: "/embed/v1/embed.js",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: "*",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type",
        },
        {
          // Cache for 1 hour
          key: "Cache-Control",
          value: "public, max-age=3600, must-revalidate",
        },
        {
          // Prevent MIME-type sniffing
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
      ],
    },
  ],
  skipTrailingSlashRedirect: true,
};

export default withEndatix(nextConfig);
