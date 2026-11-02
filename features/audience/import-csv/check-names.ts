import { Result } from "@/lib/result";

/** The name check refuses more than this many names in one request. */
export const NAME_CHECK_LIMIT = 500;

/** Shown when Continue cannot learn whether a name collides. Nothing is created. */
export const NAME_CHECK_FAILED = "Couldn't check the names. Try again.";

/** `names` split so each request stays within `limit`. */
export function nameCheckChunks(
  names: readonly string[],
  limit = NAME_CHECK_LIMIT,
): string[][] {
  const chunks: string[][] = [];
  for (let start = 0; start < names.length; start += limit)
    chunks.push(names.slice(start, start + limit));
  return chunks;
}

/**
 * Asks `check` once per chunk. A failed or rejected chunk fails the whole check,
 * so a name past the first 500 is still asked about and a failure never looks like "no collision".
 */
export async function checkNamesInChunks<T>(
  names: readonly string[],
  check: (chunk: string[]) => Promise<Result<readonly T[]>>,
): Promise<Result<T[]>> {
  const found: T[] = [];
  for (const chunk of nameCheckChunks(names)) {
    let result: Result<readonly T[]>;
    try {
      result = await check(chunk);
    } catch {
      return Result.error(NAME_CHECK_FAILED);
    }
    if (Result.isError(result)) return result;
    found.push(...result.value);
  }
  return Result.success(found);
}
