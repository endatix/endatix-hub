import { createHash } from "node:crypto";

export const MIN_AUTH_SECRET_BYTES = 32;

const AUTH_SECRET_TIP =
  "Generate one with `npx auth secret` or `openssl rand -base64 32`.";

/**
 * SHA-256 of values that have appeared in example files (`.env.example`, README, the
 * API repo's docker-compose). Anyone can read them, so they must never sign sessions.
 */
const EXAMPLE_SECRET_HASHES = new Set([
  "df5f905cdefc3365a42eb867b2c0cd2e3bf16c36ad70c71c1d0c2e0bf4a1d26e",
  "05772bd84c7f385885e5e60bd812310287bcae1365103f5bcd4bc5bee3c0d413",
  "c7ff0377b48ef96aa669b14d2d380879cc427ace6c02cf75a20aebefc307dd2e",
  "94b1fe5ff44ddc4405bd9a025920a76adda16ccc6a4dd5d67103912fecf0c1e1",
  "1d58e624acb542bbb785bd62b51ed7eb9dafbbd37fef015e1bd498972b86044c",
]);

function isExampleValue(value: string): boolean {
  const hash = createHash("sha256").update(value, "utf8").digest("hex");
  return EXAMPLE_SECRET_HASHES.has(hash);
}

/**
 * Why `AUTH_SECRET` cannot be used, or `undefined` when it can. The message never
 * contains the value.
 */
export function authSecretError(raw: string | undefined): string | undefined {
  const value = raw?.trim() ?? "";
  if (!value) {
    return `AUTH_SECRET is required but not set. ${AUTH_SECRET_TIP}`;
  }
  if (Buffer.byteLength(value, "utf8") < MIN_AUTH_SECRET_BYTES) {
    return `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_BYTES} bytes. ${AUTH_SECRET_TIP}`;
  }
  if (isExampleValue(value)) {
    return `AUTH_SECRET is an example value from the documentation and cannot be used. ${AUTH_SECRET_TIP}`;
  }
  return undefined;
}
