interface AuditedDefinition {
  id: string;
  createdAt: string | Date;
  modifiedAt?: string | Date | null;
}

export interface DefinitionRevision {
  id: string;
  updatedAt: string;
}

/** The API can send finer-than-millisecond timestamps. Keep that precision when comparing two reads. */
export function definitionRevision(row: AuditedDefinition): DefinitionRevision | undefined {
  const value = row.modifiedAt ?? row.createdAt;
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return undefined;
  const remainder = typeof value === "string" ? /\.\d{3}(\d{1,4})/.exec(value)?.[1] : "";
  const updatedAt = time.toISOString().slice(0, -1) + (remainder ?? "").padEnd(4, "0");
  return { id: row.id, updatedAt };
}
