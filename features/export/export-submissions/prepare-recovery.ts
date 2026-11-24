import { z } from "zod";
import { Kind, ErrorType } from "@/lib/result";
import type { PrepareReportingExportResult } from "../prepare-reporting-export";

export type PrepareFailure = Exclude<
  PrepareReportingExportResult,
  { value: unknown }
>;
export const unconfirmed: PrepareFailure = {
  kind: Kind.Error,
  errorType: ErrorType.Error,
  message:
    "Preparation could not be confirmed. Prepare again before exporting.",
};

const recoverySchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("pending"), owner: z.string() }),
  z.object({ state: z.literal("refused") }),
  z.object({
    state: z.literal("failed"),
    message: z.string(),
    step: z.enum(["compile", "backfill"]).optional(),
    previousSchema: z.literal("retained").optional(),
    traceId: z.string().optional(),
  }),
]);
type Recovery = z.infer<typeof recoverySchema>;
type Prior = Recovery | null;
type Attempt = { key: string; owner: string; prior: Prior };
const memory = new Map<string, string>();

function read(key: string): Prior {
  let raw = memory.get(key);
  try {
    raw ??= sessionStorage.getItem(key) ?? undefined;
  } catch {
    /* Storage is optional. */
  }
  if (raw === undefined || raw === "null") return null;
  try {
    return recoverySchema.parse(JSON.parse(raw));
  } catch {
    // A legacy "1" marker (or unreadable state) never establishes readiness.
    return { state: "failed", message: unconfirmed.message };
  }
}

function write(key: string, record: Prior) {
  const raw = JSON.stringify(record);
  try {
    if (record) sessionStorage.setItem(key, raw);
    else sessionStorage.removeItem(key);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
}

function failureOf(record: Prior): PrepareFailure | null {
  if (!record || record.state === "refused") return null;
  if (record.state === "pending") return unconfirmed;
  return {
    ...unconfirmed,
    step: record.step,
    message: record.message,
    previousSchema: record.previousSchema,
    traceId: record.traceId,
  };
}

export function readPrepareFailure(key: string) {
  return failureOf(read(key));
}

export function startPrepare(key: string): Attempt {
  const attempt = { key, owner: crypto.randomUUID(), prior: read(key) };
  write(key, { state: "pending", owner: attempt.owner });
  return attempt;
}

function resolved(prior: Prior, failure: PrepareFailure | null): Prior {
  if (!failure) return null;
  if (failure.step === "refused") {
    if (prior?.state === "pending")
      return { state: "failed", message: unconfirmed.message };
    return prior ?? { state: "refused" };
  }
  const earlier = failureOf(prior);
  const previousSchema =
    earlier && !earlier.previousSchema ? undefined : failure.previousSchema;
  return {
    state: "failed",
    step: failure.step,
    previousSchema,
    traceId: failure.traceId,
    message: failure.message,
  };
}

export function finishPrepare(
  attempt: Attempt,
  failure: PrepareFailure | null,
) {
  const current = read(attempt.key);
  if (current?.state !== "pending" || current.owner !== attempt.owner)
    return false;
  write(attempt.key, resolved(attempt.prior, failure));
  return true;
}
