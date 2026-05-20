import type {
  LocalPattern,
  RemotePattern,
} from "next/dist/shared/lib/image-config";

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

/** Pathname glob Next uses to allow any object path on the host. */
const STORAGE_IMAGE_PATHNAME = "/**";

/**
 * Registers a storage host for `next/image` with both HTTP and HTTPS.
 * S3-compatible endpoints (RustFS, MinIO) often use `http://` on localhost/LAN;
 * Azure Blob is HTTPS-only.
 */
function appendStorageHostRemotePatterns(
  remotePatterns: (URL | RemotePattern)[],
  hostname: string,
): void {
  const trimmed = hostname.trim();
  if (trimmed.length === 0) {
    return;
  }
  remotePatterns.push(
    {
      protocol: "https",
      hostname: trimmed,
      pathname: STORAGE_IMAGE_PATHNAME,
    },
    {
      protocol: "http",
      hostname: trimmed,
      pathname: STORAGE_IMAGE_PATHNAME,
    },
  );
}

/** Same sequence as `withEndatix`: `REMOTE_IMAGE_HOSTNAMES` / fallback, then storage-derived hostnames. */
export function appendEndatixImageRemotePatterns(
  remotePatterns: (URL | RemotePattern)[],
  imageRemoteHostnames: readonly string[],
): void {
  includesRemoteImageHostnames(remotePatterns);
  for (const hostname of imageRemoteHostnames) {
    appendStorageHostRemotePatterns(remotePatterns, hostname);
  }
}

/** Same-origin storage APIs; omit `search` so any query string matches (Next picomatch on pathname only). */
const ENDATIX_STORAGE_IMAGE_LOCAL_PATTERNS: readonly LocalPattern[] = [
  { pathname: "/api/public/v0/storage/**" },
];

/**
 * Merges `images.localPatterns` for `withEndatix`.
 * When unset or empty, returns `undefined` so Next does not run strict local `src` checks for every path.
 * When the app defines patterns, appends public storage routes (query strings allowed on those paths).
 */
export function mergeEndatixImageLocalPatterns(
  existing: LocalPattern[] | undefined,
): LocalPattern[] | undefined {
  if (existing === undefined || existing.length === 0) {
    return undefined;
  }
  return [...existing, ...ENDATIX_STORAGE_IMAGE_LOCAL_PATTERNS];
}

function formatURLPattern(entry: URL): string {
  return entry.hostname.length > 0 ? entry.hostname : entry.toString();
}

function getRemotePatternProtocol(p: RemotePattern): string {
  return typeof p.protocol === "string" && p.protocol.length > 0
    ? p.protocol
    : "https";
}

function getRemotePatternHostname(p: RemotePattern): string {
  return typeof p.hostname === "string" && p.hostname.length > 0
    ? p.hostname
    : "";
}

function getRemotePatternPathname(p: RemotePattern): string {
  return typeof p.pathname === "string" && p.pathname.length > 0
    ? p.pathname
    : "";
}

function formatRemotePattern(p: RemotePattern): string {
  const protocol = getRemotePatternProtocol(p);
  const hostname = getRemotePatternHostname(p);
  if (hostname.length > 0) {
    const path = getRemotePatternPathname(p);
    return path.length > 0
      ? `${protocol}://${hostname}${path}`
      : `${protocol}://${hostname}`;
  }
  return `${protocol}://*`;
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
      labels.push(formatURLPattern(entry));
      continue;
    }
    labels.push(formatRemotePattern(entry as RemotePattern));
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
