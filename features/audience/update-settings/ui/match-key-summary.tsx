import { StatusBadge } from "@/components/common/status-badge";
import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { identifierKindLabel } from "../../utils";

/**
 * The match key once it is locked: a fact about the whole organization, not a control on this
 * form, so it is a clause in the People description instead of a card (DESIGN.md §6 Record
 * workspace). Inline, so it can sit inside that paragraph.
 */
export function MatchKeySummary({
  identifierKind,
}: Readonly<{ identifierKind: AudienceIdentifierKind }>) {
  const kind = identifierKindLabel(identifierKind).toLowerCase();
  return (
    <span>
      People are matched by <span className="text-foreground">{kind}</span> on
      every form in your organization.{" "}
      <StatusBadge tone="off" label="Locked" className="align-middle" />
    </span>
  );
}
