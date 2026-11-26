import { createHash } from "node:crypto";

/** An opaque navigation marker. Token rotation drops the continuation. */
export function workspaceScope(token?: string) {
  return token
    ? createHash("sha256").update(token).digest("base64url")
    : undefined;
}

/** A support exit has a fixed continuation; query edits cannot select a target-tenant page. */
export function homeScope(token: string) {
  return createHash("sha256").update("home:").update(token).digest("base64url");
}
