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

const settledSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("refused") }),
  z.object({
    state: z.literal("failed"),
    message: z.string(),
    step: z.enum(["compile", "backfill"]).optional(),
    previousSchema: z.literal("retained").optional(),
    traceId: z.string().optional(),
  }),
]);
const pendingSchema = z.object({
  state: z.literal("pending"),
  owners: z.array(z.string()).min(1),
  settled: settledSchema.nullable(),
});
const recoverySchema = z.union([settledSchema, pendingSchema]);
type Pending = z.infer<typeof pendingSchema>;
type Recovery = z.infer<typeof recoverySchema>;
type Prior = Recovery | null;
type Attempt = { key: string; owner: string };
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
  const attempt = { key, owner: crypto.randomUUID() };
  const prior = read(key);
  const pending =
    prior?.state === "pending" ? prior : { owners: [], settled: prior };
  write(key, {
    state: "pending",
    settled: pending.settled,
    owners: [...pending.owners, attempt.owner],
  });
  return attempt;
}

function resolved(
  prior: Prior,
  failure: PrepareFailure | null,
): Pending["settled"] {
  if (!failure) return null;
  if (failure.step === "refused") {
    const settled = prior?.state === "pending" ? prior.settled : prior;
    return settled ?? { state: "refused" };
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

// Refusal removes just that request. A mutation settles through its position;
// later requests still mask the settled result until they finish.
function finishAt(
  pending: Pending,
  index: number,
  failure: PrepareFailure | null,
): Prior {
  const owners =
    failure?.step === "refused"
      ? pending.owners.filter((_, position) => position !== index)
      : pending.owners.slice(index + 1);
  const settled = resolved(index === 0 ? pending.settled : pending, failure);
  return owners.length ? { state: "pending", owners, settled } : settled;
}

export function finishPrepare(
  attempt: Attempt,
  failure: PrepareFailure | null,
) {
  const current = read(attempt.key);
  if (current?.state !== "pending") return false;
  const index = current.owners.indexOf(attempt.owner);
  if (index < 0) return false;
  write(attempt.key, finishAt(current, index, failure));
  return index === current.owners.length - 1;
}
