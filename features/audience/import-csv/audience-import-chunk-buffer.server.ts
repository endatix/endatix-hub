import type { AudienceImportRow } from "@/lib/endatix-api/audience/types";

const pending = new Map<string, AudienceImportRow[]>();

export function pendingChunkKey(
  formId: string,
  importId: string,
  index: number,
): string {
  return `${formId}:${importId}:${index}`;
}

export function appendPendingRows(key: string, rows: readonly AudienceImportRow[]) {
  pending.set(key, [...(pending.get(key) ?? []), ...rows]);
}

export function takePendingRows(key: string): AudienceImportRow[] {
  const rows = pending.get(key) ?? [];
  pending.delete(key);
  return rows;
}

export function pendingRowCount(key: string): number {
  return pending.get(key)?.length ?? 0;
}
