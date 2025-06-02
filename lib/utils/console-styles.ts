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

export default styles;
