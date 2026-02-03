import { Result } from "../result";

/**
 * Extracts the hostname from a URL string. This prevents malformed URLs when hostName is concatenated with protocols elsewhere
 * @param urlString - The URL string to extract the hostname from.
 * @returns A Result containing the hostname from the URL string or a validation error.
 */
function extractHostname(urlString: string): Result<string> {
  if (!urlString) {
    return Result.validationError("URL string is required to extract hostname");
  }

  if (typeof urlString !== "string" || urlString.length === 0) {
    return Result.validationError(
      "URL string must be a non-empty string to extract hostname",
    );
  }

  const startsWithProtocol =
    urlString.startsWith("http://") || urlString.startsWith("https://");
  if (!startsWithProtocol) {
    urlString = `https://${urlString}`;
  }

  try {
    const url = new URL(urlString);
    return Result.success(url.hostname);
  } catch {
    return Result.validationError("Invalid URL string to extract hostname");
  }
}

export { extractHostname };
