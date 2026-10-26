"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useId, useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AudienceFinding } from "@/lib/personalization/authoring";
import { formatCount } from "@/lib/utils/formatters";
import type { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";

const WARNING_CLASS =
  "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800";

type Described = {
  title: string;
  description: string;
  fixLabel?: string;
  addPropertyLabel?: string;
};

type Finding<K extends AudienceFinding["kind"]> = Extract<
  AudienceFinding,
  { kind: K }
>;

const NOT_DECLARED = "No Property, question or calculated value has this name.";

const DECLARED_BY = {
  question: "question",
  calculatedValue: "calculated value",
} as const;

// survey-core's variable/collision: the Property is set with setVariable, which deletes a root
// question's answer under the same key; a calculated value writes the same slot, last one wins.
const COLLISION_EFFECT = {
  question: (variable: string) =>
    `The Property replaces the answer to the question "${variable}", and {${variable}} reads the Property. Rename the question.`,
  calculatedValue: (variable: string) =>
    `The calculated value and the Property write the same "${variable}", so {${variable}} reads whichever was set last. Rename the calculated value.`,
} as const;

const DESCRIBE: {
  [K in AudienceFinding["kind"]]: (finding: Finding<K>) => Described;
} = {
  "unknown-variable": ({ variable, suggestion, fix, canAddProperty }) => ({
    title: `{${variable}} is not declared`,
    description: suggestion
      ? `Did you mean {${suggestion}}? ${NOT_DECLARED}`
      : NOT_DECLARED,
    fixLabel: fix && suggestion ? `Use {${suggestion}}` : undefined,
    addPropertyLabel: canAddProperty ? "Add as Audience property" : undefined,
  }),
  "variable-collision": ({ variable, declaredBy }) => ({
    title: `A ${DECLARED_BY[declaredBy]} shares its name with the Property {${variable}}`,
    description: COLLISION_EFFECT[declaredBy](variable),
  }),
  "not-filled-in": ({ variableName, filledReal, real }) => ({
    title: `{${variableName}} is not filled in for ${formatCount(real - filledReal)} of ${formatCount(real)} real participants`,
    description:
      "The form reads this Property, and those participants have no value for it.",
  }),
  "unused-property": ({ variableName }) => ({
    title: `{${variableName}} is never used`,
    description: "The form does not read this Property.",
  }),
};

/** Audience words for each finding; every one is a warning. */
export function describeAudienceFinding(finding: AudienceFinding): Described {
  const describe = DESCRIBE[finding.kind] as (f: AudienceFinding) => Described;
  return describe(finding);
}

function findingKey(finding: AudienceFinding, index: number): string {
  const at =
    "path" in finding
      ? `${finding.path}:${finding.variable}`
      : finding.variableName;
  return `${finding.kind}:${at}:${index}`;
}

const FINDINGS = "audienceFindings";
const NONE: AudienceFinding[] = [];

/** The plugin's findings, re-rendered when they change (a refresh lands, a fix applies). */
export function useAudienceFindings(
  model: FormDiagnosticsPlugin | undefined,
): AudienceFinding[] {
  const key = `audience-findings-${useId()}`;
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!model) return () => {};
      model.registerPropertyChangedHandlers([FINDINGS], onChange, key);
      return () => model.unregisterPropertyChangedHandlers([FINDINGS], key);
    },
    [model, key],
  );
  const read = () => (model?.audience ? model.audienceFindings : NONE);
  return useSyncExternalStore(subscribe, read, read);
}

/** What a finding's buttons do: the Diagnostics plugin. */
type FindingActions = Pick<
  FormDiagnosticsPlugin,
  "applyAudienceFix" | "addAudienceProperty"
>;

type FindingAlertProps = { finding: AudienceFinding; actions: FindingActions };

type FixButtonProps = { label: string; onClick: () => void };

function FixButton({ label, onClick }: Readonly<FixButtonProps>) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="mt-2 mr-2"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function FindingButtons({ finding, actions }: Readonly<FindingAlertProps>) {
  const { fixLabel, addPropertyLabel } = describeAudienceFinding(finding);
  return (
    <>
      {fixLabel && (
        <FixButton
          label={fixLabel}
          onClick={() => void actions.applyAudienceFix(finding)}
        />
      )}
      {addPropertyLabel && (
        <FixButton
          label={addPropertyLabel}
          onClick={() => void actions.addAudienceProperty(finding)}
        />
      )}
    </>
  );
}

function AudienceFindingAlert({
  finding,
  actions,
}: Readonly<FindingAlertProps>) {
  const { title, description } = describeAudienceFinding(finding);
  const where = "elementName" in finding ? finding.elementName : undefined;
  return (
    <Alert className={WARNING_CLASS}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
      <AlertDescription className="text-xs opacity-90">
        {description}
        {where && <span className="mt-1 block">In &quot;{where}&quot;.</span>}
        <FindingButtons finding={finding} actions={actions} />
      </AlertDescription>
    </Alert>
  );
}

type AudienceFindingsProps = {
  findings: AudienceFinding[];
  actions: FindingActions;
};

const HEADING_ID = "diagnostics-personalization";

function FindingsHeading({ count }: Readonly<{ count: number }>) {
  return (
    <h4 id={HEADING_ID} className="flex items-center gap-2 text-sm font-medium">
      Personalization <Badge variant="secondary">{count}</Badge>
    </h4>
  );
}

/** The Personalization warnings in the Diagnostics tab; nothing when there are none. */
export function AudienceFindings({
  findings,
  actions,
}: Readonly<AudienceFindingsProps>) {
  if (findings.length === 0) return null;
  return (
    <section aria-labelledby={HEADING_ID} className="space-y-3 pt-2">
      <FindingsHeading count={findings.length} />
      {findings.map((finding, index) => (
        <AudienceFindingAlert
          key={findingKey(finding, index)}
          finding={finding}
          actions={actions}
        />
      ))}
    </section>
  );
}
