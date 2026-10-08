const styles = {
  // Text styles
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[0m`,

  // Colors
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,

  // Symbols
  success: (text: string) => `\x1b[32m✓\x1b[0m ${text}`,
  error: (text: string) => `\x1b[31m✗\x1b[0m ${text}`,
  warning: (text: string) => `\x1b[33m▴\x1b[0m ${text}`,
  info: (text: string) => `\x1b[36mℹ\x1b[0m ${text}`,
  tip: (text: string) => `\x1b[36m💡\x1b[0m ${text}`,
};

/** Environment variables; only CI, TERM, TERM_PROGRAM and WT_SESSION are read. */
export type TerminalEnv = Readonly<Record<string, string | undefined>>;

/**
 * Whether startup logs may use emoji icons. Off without a terminal (CI, piped
 * logs), with TERM=dumb, and in the legacy Windows console, where emoji render
 * at the wrong width; Windows Terminal and the VS Code terminal render them.
 */
export function supportsEmoji(
  env: TerminalEnv = process.env,
  stream: { isTTY?: boolean } = process.stdout,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!stream.isTTY || env.CI || env.TERM === "dumb") {
    return false;
  }
  if (platform === "win32") {
    return Boolean(env.WT_SESSION) || env.TERM_PROGRAM === "vscode";
  }
  return true;
}

/** The emoji where the terminal renders it, otherwise a plain symbol. */
export function icon(emoji: string, fallback: string): string {
  return supportsEmoji() ? emoji : fallback;
}

export default styles;
