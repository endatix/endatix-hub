"use client";

import { MatchKeySelect } from "./match-key-select";
import { useMatchKey, type MatchKeyState } from "../use-match-key.hook";

const MATCH_KEY_HINTS = Object.freeze({
  locked:
    "Locked while people are on any form's audience. Remove them to change it.",
  noPermission: "Only users who manage organization settings can change it.",
  open: "Choose it before adding people. It locks once anyone is added.",
} as const);

function matchKeyHint({ isLocked, canManage }: MatchKeyState): string {
  if (isLocked) return MATCH_KEY_HINTS.locked;
  return canManage ? MATCH_KEY_HINTS.open : MATCH_KEY_HINTS.noPermission;
}

export function MatchKeySettings(props: Readonly<MatchKeyState>) {
  const matchKey = useMatchKey(props);
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Match key</h2>
      <p className="text-sm text-muted-foreground">
        Tenant-wide identifier used to match people. {matchKeyHint(props)}
      </p>
      <MatchKeySelect
        identifierKind={matchKey.identifierKind}
        disabled={matchKey.disabled}
        onChange={matchKey.change}
      />
    </section>
  );
}
