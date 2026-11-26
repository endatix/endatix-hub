import { createHash } from "node:crypto";

/** An opaque navigation marker. Token rotation drops the continuation. */
export function workspaceScope(token?: string) {
  return token
    ? createHash("sha256").update(token).digest("base64url")
    : undefined;
}
