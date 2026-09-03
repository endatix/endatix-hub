"use client";

import type { SecretPresence } from "../types";
import { StatusBadge } from "@/components/common/status-badge";

interface SecretPresenceBadgeProps {
  presence: SecretPresence;
}

/**
 * Presence of a genuine secret, never its value. Uses the same badge vocabulary as
 * every other status on the page — a secret being set is not a different kind
 * of "on" than a feature being enabled.
 *
 * Only for values the browser never receives. A public key that already ships in the
 * page renders as its literal value via `ConfigValue`; reducing it to a badge hides
 * nothing and stops the operator confirming which key is live.
 */
export function SecretPresenceBadge({
  presence,
}: Readonly<SecretPresenceBadgeProps>) {
  return (
    <StatusBadge
      tone={presence.configured ? "on" : "off"}
      label={presence.configured ? "Set" : "Not set"}
    />
  );
}
