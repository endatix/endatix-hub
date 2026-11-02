"use client";

import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import type { AudienceLinkStatus } from "@/lib/endatix-api/audience/types";

type LinkBadge = { tone: StatusTone; label: string };

const LINK_BADGE: Record<AudienceLinkStatus["status"], LinkBadge> = {
  none: { tone: "off", label: "Not issued" },
  issued: { tone: "idle", label: "Issued" },
  opened: { tone: "on", label: "Opened" },
};

/** Not issued, Issued or Opened: the same label for a participant's link everywhere. */
export function LinkStatusBadge({
  status,
}: Readonly<{ status: AudienceLinkStatus["status"] }>) {
  return <StatusBadge {...LINK_BADGE[status]} />;
}
