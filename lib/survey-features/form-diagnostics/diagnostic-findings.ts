import type { FormDiagnosticsStats } from "./form-diagnostics-logic";
import { formatBytes } from "@/lib/utils/formatters";

export interface Benefit {
  basis: "Estimate" | "Not measured";
  headline: string;
  explanation: string;
}

export interface Finding {
  id: string;
  title: string;
  evidence: string;
  consequence: string;
  benefit: Benefit;
}

export type Conversion = { id: "choices" | "images"; runnable: boolean; impact: number };

export function leadConversion(candidates: Conversion[]) {
  return candidates.toSorted((left, right) =>
    Number(right.runnable) - Number(left.runnable) || right.impact - left.impact)[0]?.id;
}

const qualitative = (headline: string, explanation: string): Benefit => ({ basis: "Not measured", headline, explanation });

const descriptions = {
  logic: { title: "Review complex logic",
    consequence: "Conditional rules control which parts of the form respondents see.",
    benefit: qualitative("Clearer rules", "Review related conditions together to identify duplicated or unnecessary rules."),
  },
  length: { title: "Consider splitting the form",
    consequence: "Long sections can make the sequence of questions harder to follow.",
    benefit: qualitative("More focused sections", "Review page boundaries and keep related questions together."),
  },
  files: { title: "Check where uploaded files are stored",
    consequence: "Uploaded file contents become part of submission data.",
    benefit: qualitative("Keep file contents out of submissions", "Storage-backed questions reference the uploaded file instead. Savings depend on the files respondents send."),
  },
  size: { title: "Review the definition size",
    consequence: "The authored definition contains more than a megabyte of JSON.",
    benefit: qualitative("Less content to distribute", "Inspect the JSON for repeated content before deciding what to remove."),
  },
  audience: { title: "Review personalization",
    consequence: "The form’s personalization settings and participant properties may not agree.",
    benefit: qualitative("More predictable personalization", "Inspect the flagged references before applying a suggested fix."),
  },
};

export function manualFindings(stats: FormDiagnosticsStats, context: {remainingBytes: number; pages: number; audience: number}) {
  const findings: Finding[] = [];
  const add = (id: keyof typeof descriptions, evidence: string) => findings.push({id, evidence, ...descriptions[id]});
  if (stats.logicConditionsCount > 50) add("logic", `${stats.logicConditionsCount.toLocaleString()} conditions · ${stats.invisibleLogicItemsCount} invisible logic items`);
  if (stats.totalQuestions > 100) add("length", `${stats.totalQuestions.toLocaleString()} questions · ${context.pages} pages`);
  if (stats.fileUploadWithoutBlobCount) add("files", `${stats.fileUploadWithoutBlobCount} file questions store files inline`);
  if (context.remainingBytes > 1024 * 1024) add("size", "Definition exceeds 1 MB");
  if (context.audience) add("audience", `${context.audience} personalization findings`);
  return findings;
}

export function imageBenefit(before: number, reduction: number): Benefit {
  const direction = reduction < 0 ? "larger" : "smaller";
  const projected = formatBytes(before - reduction);
  return {
    basis: "Estimate",
    headline: reduction ? `About ${formatBytes(Math.abs(reduction))} ${direction}` : "No size change expected",
    explanation: `${formatBytes(before)} → about ${projected} of definition JSON when embedded sources become links.`,
  };
}

export function choiceFinding(count: number, bytes: number): Finding {
  return {
    id: "choices", title: "Move large choice lists into data lists",
    evidence: `${count} inline ${count === 1 ? "list" : "lists"} · ${formatBytes(bytes)} of choice data`,
    consequence: "The original form and its submissions stay unchanged.",
    benefit: qualitative("Reusable choices in a separate copy", "Selected lists are stored separately and the new form references them."),
  };
}
