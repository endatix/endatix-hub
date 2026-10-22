"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AudienceFinding } from "@/lib/personalization/authoring";

const WARNING_CLASS =
  "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800";

type Described = { title: string; description: string; fixLabel?: string };

/** Audience words for each finding; every one is a warning. */
export function describeAudienceFinding(finding: AudienceFinding): Described {
  switch (finding.kind) {
    case "unknown-variable":
      return {
        title: `{${finding.variable}} is not declared`,
        description: finding.suggestion
          ? `Did you mean {${finding.suggestion}}? No Audience property, question or custom variable has this name, so it shows empty.`
          : "No Audience property, question or custom variable has this name, so it shows empty.",
        fixLabel:
          finding.fix && finding.suggestion
            ? `Use {${finding.suggestion}}`
            : undefined,
      };
    case "variable-collision":
      return {
        title: `A question hides the property {${finding.variable}}`,
        description: `The question and the Audience property share the name "${finding.variable}": the participant's value replaces the answer stored under it. Rename the question.`,
      };
    case "type-mismatch":
      return {
        title: `A condition on {${finding.variable}} cannot be met`,
        description: finding.message,
      };
    case "unused-property":
      return {
        title: `{${finding.variableName}} is never used`,
        description: "The form does not read this Audience property.",
      };
  }
}

function findingKey(finding: AudienceFinding): string {
  return finding.kind === "unused-property"
    ? `${finding.kind}:${finding.variableName}`
    : `${finding.kind}:${finding.path}:${finding.variable}`;
}

type AudienceFindingsProps = {
  findings: AudienceFinding[];
  onFix: (finding: AudienceFinding) => void;
};

/** The Personalization warnings in the Diagnostics tab. */
export function AudienceFindings({
  findings,
  onFix,
}: Readonly<AudienceFindingsProps>) {
  return (
    <section
      aria-labelledby="diagnostics-personalization"
      className="space-y-3 pt-2"
    >
      <h4
        id="diagnostics-personalization"
        className="flex items-center gap-2 text-sm font-medium"
      >
        Personalization <Badge variant="secondary">{findings.length}</Badge>
      </h4>
      {findings.map((finding) => {
        const { title, description, fixLabel } =
          describeAudienceFinding(finding);
        const where =
          "elementName" in finding ? finding.elementName : undefined;
        return (
          <Alert key={findingKey(finding)} className={WARNING_CLASS}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
            <AlertDescription className="text-xs opacity-90">
              {description}
              {where && (
                <span className="mt-1 block">In &quot;{where}&quot;.</span>
              )}
              {fixLabel && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => onFix(finding)}
                >
                  {fixLabel}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </section>
  );
}
