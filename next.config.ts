import type { NextConfig } from "next";
import {
  getRewriteRuleFor,
  includesRemoteImageHostnames,
} from "./lib/hosting/next-config-helper";
import { getStorageConfig } from "@/features/storage/infrastructure/storage-config";
import { Rewrite } from "next/dist/lib/load-custom-routes";
import { withEndatix } from "@/features/config";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // Used to decrease the size of the application, check https://nextjs.org/docs/pages/api-reference/next-config-js/output
  typedRoutes: true,
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {},
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    globalNotFound: true,
  },
  images: {
    remotePatterns: [],
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

includesRemoteImageHostnames(nextConfig.images?.remotePatterns);

const storageConfig = getStorageConfig();
if (storageConfig.isEnabled) {
  nextConfig?.images?.remotePatterns?.push({
    protocol: "https",
    hostname: storageConfig.hostName,
  });
}

export default withEndatix(nextConfig);
