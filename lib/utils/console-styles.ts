function paint(code: string, text: string): string {
  return supportsColor() ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const styles = {
  bold: (text: string) => paint("1", text),
  dim: (text: string) => paint("2", text),
  italic: (text: string) => paint("3", text),
  underline: (text: string) => paint("4", text),

  green: (text: string) => paint("32", text),
  red: (text: string) => paint("31", text),
  yellow: (text: string) => paint("33", text),
  blue: (text: string) => paint("34", text),
  magenta: (text: string) => paint("35", text),
  cyan: (text: string) => paint("36", text),

  success: (text: string) => `${paint("32", "✓")} ${text}`,
  error: (text: string) => `${paint("31", "✗")} ${text}`,
  warning: (text: string) => `${paint("33", "▴")} ${text}`,
  info: (text: string) => `${paint("36", "ℹ")} ${text}`,
  tip: (text: string) => `${paint("36", "💡")} ${text}`,
};

/**
 * Environment variables the terminal checks read: CI, TERM, TERM_PROGRAM,
 * WT_SESSION, NO_COLOR, FORCE_COLOR and NEXT_PRIVATE_PROMPT_OUTPUT.
 */
export type TerminalEnv = Readonly<Record<string, string | undefined>>;

/**
 * Whether startup logs may use emoji icons. Off without a terminal (CI, piped
 * logs), with TERM=dumb, and in the legacy Windows console, where emoji render
 * at the wrong width; Windows Terminal and the VS Code terminal render them.
 * `next dev` pipes its server's output through the CLI (to hold it while the
 * upgrade prompt is open) and sets NEXT_PRIVATE_PROMPT_OUTPUT when that pipe
 * ends on a terminal, so the pipe counts as one.
 */
export function supportsEmoji(
  env: TerminalEnv = process.env,
  stream: { isTTY?: boolean } = process.stdout,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const terminal = stream.isTTY || env.NEXT_PRIVATE_PROMPT_OUTPUT === "1";
  if (!terminal || env.CI || env.TERM === "dumb") {
    return false;
  }
  if (platform === "win32") {
    return Boolean(env.WT_SESSION) || env.TERM_PROGRAM === "vscode";
  }
  return true;
}

/**
 * Whether startup logs may use ANSI colour. Off when output is piped, when
 * `NO_COLOR` is set, and when `TERM` is `dumb`. `FORCE_COLOR` turns it back on
 * for a pipe. `next dev` sets `NEXT_PRIVATE_PROMPT_OUTPUT` when its pipe ends
 * on a terminal, so that pipe counts as one. Colour stays on in the legacy
 * Windows console; only emoji is dropped there.
 */
export function supportsColor(
  env: TerminalEnv = process.env,
  stream: { isTTY?: boolean } = process.stdout,
): boolean {
  if (env.NO_COLOR || env.TERM === "dumb") {
    return false;
  }
  if (env.FORCE_COLOR && env.FORCE_COLOR !== "0") {
    return true;
  }
  return Boolean(stream.isTTY) || env.NEXT_PRIVATE_PROMPT_OUTPUT === "1";
}

/** The emoji where the terminal renders it, otherwise a plain symbol. */
export function icon(emoji: string, fallback: string): string {
  return supportsEmoji() ? emoji : fallback;
}

export default styles;
