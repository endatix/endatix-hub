/**
 * Removes trailing LF / CRLF sequences without a backtracking regex.
 */
export function stripTrailingNewlines(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "\n") {
    end -= 1;
    if (end > 0 && value[end - 1] === "\r") {
      end -= 1;
    }
  }

  return value.slice(0, end);
}
