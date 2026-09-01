"use client";

import type { SecretPresence } from "../types";
import { ConfigStatusBadge } from "./config-status-badge";

interface SecretPresenceBadgeProps {
  presence: SecretPresence;
}

/**
 * Presence of a secret, never its value. Uses the same badge vocabulary as
 * every other status on the page — a secret being set is not a different kind
 * of "on" than a feature being enabled.
 */
export function SecretPresenceBadge({
  presence,
}: Readonly<SecretPresenceBadgeProps>) {
  return (
    <ConfigStatusBadge
      tone={presence.configured ? "on" : "off"}
      label={presence.configured ? "Set" : "Not set"}
    />
  );
}
