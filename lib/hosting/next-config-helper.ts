import { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Includes remote image hostnames in the remote patterns.
 * @param remotePatterns - The remote patterns to include the hostnames in.
 * @returns void
 */
function includesRemoteImageHostnames(
  remotePatterns: (URL | RemotePattern)[] | undefined,
): void {
  if (!remotePatterns) {
    return;
  }

  const REMOTE_IMAGE_HOSTNAMES =
    process.env.REMOTE_IMAGE_HOSTNAMES?.trim() ?? "";
  const hostnames = REMOTE_IMAGE_HOSTNAMES.split(",").map((h: string) =>
    h.trim(),
  );

  if (!REMOTE_IMAGE_HOSTNAMES || hostnames.length < 1) {
    remotePatterns.push({
      protocol: "https",
      hostname: "**",
    } as RemotePattern);
    return;
  }

  hostnames.forEach((hostname: string) => {
    if (!hostname?.length) {
      return;
    }

    remotePatterns.push({
      protocol: "https",
      hostname: hostname,
    });
  });
}

/** Same sequence as `withEndatix`: `REMOTE_IMAGE_HOSTNAMES` / fallback, then storage-derived hostnames. */
export function appendEndatixImageRemotePatterns(
  remotePatterns: (URL | RemotePattern)[],
  imageRemoteHostnames: readonly string[],
): void {
  includesRemoteImageHostnames(remotePatterns);
  for (const hostname of imageRemoteHostnames) {
    remotePatterns.push({
      protocol: "https",
      hostname,
    });
  }
}

/**
 * Formats the remote patterns for display.
 * @param patterns - The remote patterns to format.
 * @returns The formatted remote patterns.
 */
export function formatRemotePatternsForDisplay(
  patterns: (URL | RemotePattern)[] | undefined,
): string {
  if (patterns === undefined || patterns.length === 0) {
    return "None configured";
  }
  const labels: string[] = [];
  for (const entry of patterns) {
    if (entry instanceof URL) {
      labels.push(
        entry.hostname.length > 0 ? entry.hostname : entry.toString(),
      );
      continue;
    }
    const p = entry as RemotePattern;
    const hostname =
      typeof p.hostname === "string" && p.hostname.length > 0 ? p.hostname : "";
    const protocol =
      typeof p.protocol === "string" && p.protocol.length > 0
        ? p.protocol
        : "https";
    if (hostname.length > 0) {
      const path =
        typeof p.pathname === "string" && p.pathname.length > 0
          ? p.pathname
          : "";
      labels.push(
        path.length > 0
          ? `${protocol}://${hostname}${path}`
          : `${protocol}://${hostname}`,
      );
    } else {
      labels.push(`${protocol}://*`);
    }
  }
  return labels.join(", ");
}

/**
 * Generates a rewrite rule for parallel route segments in Next.js static chunks.
 * This is needed because Next.js encodes @ symbols in parallel route segments as %40 in file paths,
 * but the original URL patterns use @ symbol.
 * more info on the workaround here - https://github.com/vercel/next.js/issues/71626
 * @param parallelRouteRoot - The root name of the parallel route segment (without the @ symbol)
 * @returns A rewrite rule object with source and destination patterns, or null if invalid input
 */
function getRewriteRuleFor(parallelRouteRoot: string): {
  source: string;
  destination: string;
} {
  // Sanitize input by trimming whitespace
  const trimmedRouteRoot = parallelRouteRoot?.trim()?.toLowerCase();

  // Validate that route name exists and doesn't already start with @
  const isValidRouteName = Boolean(
    trimmedRouteRoot?.length > 0 && !trimmedRouteRoot.startsWith("@"),
  );

  if (!isValidRouteName) {
    throw new Error("Invalid route name value", {
      cause: parallelRouteRoot,
    });
  }

  /**
   * Returns the rewrite rule for the parallel route segment.
   * @returns The rewrite rule for the parallel route segment.
   */
  return {
    source: `/_next/static/chunks/app/:folder*/@${trimmedRouteRoot}/:path*`,
    destination: `/_next/static/chunks/app/:folder*/%40${trimmedRouteRoot}/:path*`,
  };
}

export { includesRemoteImageHostnames, getRewriteRuleFor };
