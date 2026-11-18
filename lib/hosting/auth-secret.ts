import { createHash } from "node:crypto";

export const MIN_AUTH_SECRET_BYTES = 32;

const AUTH_SECRET_TIP =
  "Generate one with `npx auth secret` or `openssl rand -base64 32`.";

/**
 * SHA-256 of sample values that have appeared in example files, docs, or fixtures.
 * Example values are not private, so the Hub does not accept them. Each line names
 * where the value first appeared: repo, file, commit.
 */
const EXAMPLE_SECRET_HASHES = new Set([
  // endatix-hub .env.example af5f8688
  "df5f905cdefc3365a42eb867b2c0cd2e3bf16c36ad70c71c1d0c2e0bf4a1d26e",
  // endatix-hub .env.example 1c04ad03
  "c7ff0377b48ef96aa669b14d2d380879cc427ace6c02cf75a20aebefc307dd2e",
  // endatix-hub .env.example 1c04ad03 (comment)
  "1d58e624acb542bbb785bd62b51ed7eb9dafbbd37fef015e1bd498972b86044c",
  // endatix-hub README.md 1c04ad03
  "9c394569dd213c60061b5e27f9ae07c09670557a4ca5e855a4cae36570ec06dc",
  // endatix-hub scripts/check-runtime-storage.mjs 5d8b1b90
  "6518dd88877b1e477d3efbd291ec2fe003ab54113e80ea0b10cf5e639e029c0c",
  "88930b8277d9f01af67a96e85c6a67001891a06b616a63941d5ba21062507d21",
  // endatix-hub scripts/check-dereferenced-standalone.mjs 81d002e8
  "cfecfa55836c488d61f80ac9445c88d3ce885eff00133d88d0ae3c0d24de00c2",
  "c5afb4395a582947decbdd35d5b64c5249b0c9bd3186e2d67e52f2f617245af3",
  // endatix docker/docker-compose.yaml 77fbaf8f
  "05772bd84c7f385885e5e60bd812310287bcae1365103f5bcd4bc5bee3c0d413",
  "94b1fe5ff44ddc4405bd9a025920a76adda16ccc6a4dd5d67103912fecf0c1e1",
  // endatix docker/docker-compose.yaml e81fee83
  "ded168c22e91d36d398cd7e7d61e8220b00fc2de68702a25cc3ee8c870395db4",
  "47a6f09691fd4ea38c495e956840ae1dd1628678b3ffb26dce548246173bc5d4",
]);

function isExampleValue(value: string): boolean {
  const hash = createHash("sha256").update(value, "utf8").digest("hex");
  return EXAMPLE_SECRET_HASHES.has(hash);
}

/**
 * Why `AUTH_SECRET` cannot be used, or `undefined` when it can. The message never
 * contains the value.
 */
export function authSecretError(
  raw: string | undefined,
  legacyNextAuthSecret?: string,
): string | undefined {
  const value = raw?.trim() ?? "";
  if (!value) {
    const rename = legacyNextAuthSecret?.trim()
      ? " NEXTAUTH_SECRET is set: rename it to AUTH_SECRET."
      : "";
    return `AUTH_SECRET is required but not set.${rename} ${AUTH_SECRET_TIP}`;
  }
  if (Buffer.byteLength(value, "utf8") < MIN_AUTH_SECRET_BYTES) {
    return `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_BYTES} bytes. ${AUTH_SECRET_TIP}`;
  }
  if (isExampleValue(value)) {
    return `AUTH_SECRET is an example value from the documentation and cannot be used. ${AUTH_SECRET_TIP}`;
  }
  return undefined;
}
