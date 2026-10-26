import type {
  AudienceImportRow,
  IndexedImportChunk,
} from "@/lib/endatix-api/audience/types";

/** Headroom under `serverActions.bodySizeLimit` in next.config (20mb). */
export const IMPORT_CHUNK_BODY_BYTES = 19 * 1024 * 1024;

export function chunkIndexProblem(index: number): string | null {
  if (!Number.isInteger(index) || index < 0) {
    return "The chunk index is not valid.";
  }
  return null;
}

export function importChunkJsonBytes(chunk: IndexedImportChunk): number {
  return new TextEncoder().encode(JSON.stringify(chunk)).length;
}

/** Disjoint row slices so each serialized chunk stays under `maxBytes`. */
export function chunkRowParts(
  chunk: IndexedImportChunk,
  maxBytes: number,
): AudienceImportRow[][] {
  const { rows } = chunk;
  if (rows.length === 0 || importChunkJsonBytes(chunk) <= maxBytes) return [rows];

  const head = { index: chunk.index, firstRowNumber: chunk.firstRowNumber };
  const parts: AudienceImportRow[][] = [];
  let start = 0;
  while (start < rows.length) {
    let end = start;
    while (
      end < rows.length &&
      importChunkJsonBytes({ ...head, rows: rows.slice(start, end + 1) }) <= maxBytes
    ) {
      end += 1;
    }
    if (end === start) end = start + 1;
    parts.push(rows.slice(start, end));
    start = end;
  }
  return parts;
}
