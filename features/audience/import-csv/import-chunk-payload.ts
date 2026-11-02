import type {
  AudienceImportRow,
  IndexedImportChunk,
} from "@/lib/endatix-api/audience/types";
import { importChunk, type ChunkPlace } from "./import-run";

/** Headroom under `serverActions.bodySizeLimit` in next.config (20mb): one chunk is one action's body. */
export const IMPORT_CHUNK_BODY_BYTES = 19 * 1024 * 1024;

/**
 * Rows per chunk, matching OSS `ImportRunnerRegistration.ChunkRows`. The API takes exactly this many
 * rows per chunk index, so a chunk can never be split across requests.
 */
export const IMPORT_CHUNK_ROWS = 1_000;

export function chunkIndexProblem(index: number): string | null {
  if (!Number.isInteger(index) || index < 0) {
    return "The chunk index is not valid.";
  }
  return null;
}

export function importChunkJsonBytes(chunk: IndexedImportChunk): number {
  return new TextEncoder().encode(JSON.stringify(chunk)).length;
}

/** The spreadsheet rows of the first chunk whose request body would be over `maxBytes`, or `null`. */
export function firstOversizedChunk(
  rows: readonly AudienceImportRow[],
  place: Omit<ChunkPlace, "index">,
  maxBytes: number,
): { firstRowNumber: number; lastRowNumber: number } | null {
  for (let index = 0; index * place.chunkSize < rows.length; index++) {
    const chunk = { index, ...importChunk(rows, { index, ...place }) };
    if (importChunkJsonBytes(chunk) > maxBytes) {
      const { firstRowNumber } = chunk;
      return {
        firstRowNumber,
        lastRowNumber: firstRowNumber + chunk.rows.length - 1,
      };
    }
  }
  return null;
}
