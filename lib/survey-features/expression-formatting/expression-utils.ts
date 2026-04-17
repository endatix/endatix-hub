import { parseNumberValue } from "@/lib/utils/formatters";

/**
 * Gets a string parameter from the parameters array.
 * @param params - The parameters array.
 * @param index - The index of the parameter to get.
 * @returns The string parameter or undefined if the parameter is not a string.
 */
function getStringParam(
  params: ReadonlyArray<unknown>,
  index: number,
): string | undefined {
  if (!Array.isArray(params) || index < 0 || params.length <= index) {
    return undefined;
  }

  const param = params[index];
  if (typeof param !== "string") {
    return undefined;
  }

  return param;
}

/**
 * Gets a number parameter from the parameters array.
 * @param params - The parameters array.
 * @param index - The index of the parameter to get.
 * @returns The number parameter or undefined if the parameter is not a number.
 */
function getNumberParam(
  params: ReadonlyArray<unknown>,
  index: number,
): number | undefined {
  if (!Array.isArray(params) || params.length <= index) return undefined;

  const param = params[index];

  return parseNumberValue(param) ?? undefined;
}

export { getStringParam, getNumberParam };
