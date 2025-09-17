import type { NextConfig } from "next";
import {
  getRewriteRuleFor,
  includesRemoteImageHostnames,
} from "./lib/hosting/next-config-helper";
import { STORAGE_SERVICE_CONFIG } from "@/features/storage/infrastructure/storage-service";
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
    authInterrupts: true
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
  skipTrailingSlashRedirect: true,
};

includesRemoteImageHostnames(nextConfig.images?.remotePatterns);

if (STORAGE_SERVICE_CONFIG.isEnabled) {
  nextConfig?.images?.remotePatterns?.push({
    protocol: "https",
    hostname: STORAGE_SERVICE_CONFIG.hostName,
  });
}

export default withEndatix(nextConfig);
