"use client";

import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { MatchKeySelect } from "./match-key-select";
import { useMatchKey } from "./use-match-key";

type MatchKeySettingsProps = {
  identifierKind: AudienceIdentifierKind;
  hasMembers: boolean;
};

export function MatchKeySettings({
  identifierKind,
  hasMembers,
}: Readonly<MatchKeySettingsProps>) {
  const matchKey = useMatchKey(identifierKind, hasMembers);
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Match key</h2>
      <p className="text-sm text-muted-foreground">
        Tenant-wide identifier used to match people. Locked after the first
        audience member exists.
      </p>
      <MatchKeySelect
        identifierKind={matchKey.identifierKind}
        disabled={matchKey.pending}
        onChange={matchKey.change}
      />
    </section>
  );
}
