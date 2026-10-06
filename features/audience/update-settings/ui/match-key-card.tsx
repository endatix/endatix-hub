"use client";

import { StatusBadge } from "@/components/common/status-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { OptionsSelect } from "../../ui/options-select";
import { AUDIENCE_IDENTIFIER_KINDS } from "../../utils";
import { useMatchKey, type MatchKeyState } from "../use-match-key.hook";

const SELECT_ID = "audience-match-key";
const DESCRIPTION =
  "How a person is recognised on every form in your organization, so the same person is one member everywhere.";

function MatchKeyHeader({ isLocked }: Readonly<{ isLocked: boolean }>) {
  return (
    <CardHeader>
      <CardTitle>Match key</CardTitle>
      <CardDescription>{DESCRIPTION}</CardDescription>
      {isLocked ? (
        <CardAction>
          <StatusBadge tone="off" label="Locked" />
        </CardAction>
      ) : null}
    </CardHeader>
  );
}

type MatchKey = ReturnType<typeof useMatchKey>;
type MatchKeyFieldProps = { matchKey: MatchKey; value: string };

const LABEL = "Identify people by";

function MatchKeyField({ matchKey, value }: Readonly<MatchKeyFieldProps>) {
  const { error, hint, disabled, change } = matchKey;
  const options = AUDIENCE_IDENTIFIER_KINDS;
  const describedBy = helpId(SELECT_ID);
  return (
    <FieldWithHelp
      id={SELECT_ID}
      label={LABEL}
      invalid={Boolean(error)}
      help={error ?? hint}
    >
      <OptionsSelect
        id={SELECT_ID}
        {...{ value, options, disabled, describedBy }}
        onChange={change}
      />
    </FieldWithHelp>
  );
}

/**
 * The tenant-wide match key, shown on the form page because adding people depends on it. A
 * standalone control, so it is a card (tenant settings recipe). Its lock is a badge on the card
 * and one line under the control; a failed save replaces that line.
 */
export function MatchKeyCard(props: Readonly<MatchKeyState>) {
  const matchKey = useMatchKey(props);
  return (
    <Card>
      <MatchKeyHeader isLocked={props.isLocked} />
      <CardContent className="max-w-md">
        <MatchKeyField matchKey={matchKey} value={props.identifierKind} />
      </CardContent>
    </Card>
  );
}
