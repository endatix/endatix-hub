/**
 * Absolute origin for Next.js metadata (OG/Twitter image resolution).
 * Prefer AUTH_URL (Auth.js canonical app URL), then BASE_URL, then local dev.
 */
export function getMetadataBase(): URL {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.BASE_URL?.trim() ||
    "http://localhost:3000";

  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}
