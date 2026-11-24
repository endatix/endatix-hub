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
  // These live attempts cannot establish repair of the settled result.
  superseded: z.array(z.string()).default([]),
  settled: settledSchema.nullable(),
});
const recoverySchema = z.union([settledSchema, pendingSchema]);
type Pending = z.infer<typeof pendingSchema>;
type Recovery = z.infer<typeof recoverySchema>;
type Prior = Recovery | null;
type Attempt = { key: string; owner: string };
const memory = new Map<string, string>();
const liveOwners = new Set<string>();

function pendingFailure(record: Pending) {
  const known = record.settled;
  return known?.state === "failed" && !known.previousSchema
    ? known
    : { state: "failed" as const, message: unconfirmed.message };
}

function recoverInterrupted(record: Recovery): Recovery {
  if (
    record.state !== "pending" ||
    record.owners.some((id) => liveOwners.has(id))
  )
    return record;
  // Reload kept the tab's marker, but no promise can settle these owners now.
  return pendingFailure(record);
}

function read(key: string): Prior {
  let raw = memory.get(key);
  try {
    raw ??= sessionStorage.getItem(key) ?? undefined;
  } catch {
    /* Storage is optional. */
  }
  if (raw === undefined || raw === "null") return null;
  try {
    return recoverInterrupted(recoverySchema.parse(JSON.parse(raw)));
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
  if (record.state === "pending") return failureOf(pendingFailure(record));
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
  liveOwners.add(attempt.owner);
  const pending =
    prior?.state === "pending"
      ? prior
      : { owners: [], superseded: [], settled: prior };
  write(key, {
    state: "pending",
    settled: pending.settled,
    superseded: pending.superseded,
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

function settle(
  pending: Pending,
  index: number,
  failure: PrepareFailure | null,
): Pending["settled"] {
  const known = pending.settled;
  const retainedAfterFailure =
    failure?.previousSchema === "retained" &&
    known?.state === "failed" &&
    !known.previousSchema;
  if (
    pending.superseded.includes(pending.owners[index]) &&
    (!failure || retainedAfterFailure)
  ) return known;
  return resolved(index === 0 ? pending.settled : pending, failure);
}

// Every request settles only itself; others keep masking the result until
// they finish. Requests that started earlier stay pending, so a late
// destructive failure still lands, but their success cannot clear it.
function finishAt(
  pending: Pending,
  index: number,
  failure: PrepareFailure | null,
): Prior {
  const owners = pending.owners.filter((_, position) => position !== index);
  const superseded = pending.owners.filter(
    (owner, position) =>
      position !== index &&
      (pending.superseded.includes(owner) || supersedes(position < index, failure)),
  );
  const settled = settle(pending, index, failure);
  return owners.length
    ? { state: "pending", owners, superseded, settled }
    : settled;
}

function supersedes(earlier: boolean, failure: PrepareFailure | null) {
  if (failure?.step === "refused") return false;
  // No success already in flight can prove it repaired a destructive failure.
  return earlier || (failure !== null && !failure.previousSchema);
}

export function finishPrepare(
  attempt: Attempt,
  failure: PrepareFailure | null,
) {
  const current = read(attempt.key);
  liveOwners.delete(attempt.owner);
  if (current?.state !== "pending") return false;
  const index = current.owners.indexOf(attempt.owner);
  if (index < 0) return false;
  write(attempt.key, finishAt(current, index, failure));
  const superseded = current.superseded.includes(attempt.owner);
  return index === current.owners.length - 1 && !superseded;
}
