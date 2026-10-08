import { describe, expect, it, vi } from "vitest";
import styles, {
  supportsColor,
  supportsEmoji,
  type TerminalEnv,
} from "../console-styles";

type Case = {
  name: string;
  env: TerminalEnv;
  isTTY: boolean;
  platform: NodeJS.Platform;
  expected: boolean;
};

const cases: Case[] = [
  {
    name: "a macOS terminal",
    env: {},
    isTTY: true,
    platform: "darwin",
    expected: true,
  },
  {
    name: "a Linux terminal",
    env: { TERM: "xterm-256color" },
    isTTY: true,
    platform: "linux",
    expected: true,
  },
  {
    name: "piped output",
    env: {},
    isTTY: false,
    platform: "darwin",
    expected: false,
  },
  {
    name: "next dev's piped server output on a macOS terminal",
    env: { NEXT_PRIVATE_PROMPT_OUTPUT: "1" },
    isTTY: false,
    platform: "darwin",
    expected: true,
  },
  {
    name: "CI",
    env: { CI: "true" },
    isTTY: true,
    platform: "linux",
    expected: false,
  },
  {
    name: "TERM=dumb",
    env: { TERM: "dumb" },
    isTTY: true,
    platform: "linux",
    expected: false,
  },
  {
    name: "the legacy Windows console",
    env: {},
    isTTY: true,
    platform: "win32",
    expected: false,
  },
  {
    name: "Windows Terminal",
    env: { WT_SESSION: "1" },
    isTTY: true,
    platform: "win32",
    expected: true,
  },
  {
    name: "the VS Code terminal on Windows",
    env: { TERM_PROGRAM: "vscode" },
    isTTY: true,
    platform: "win32",
    expected: true,
  },
];

describe("supportsColor", () => {
  it.each([
    ["a terminal", {}, true, true],
    ["piped output", {}, false, false],
    [
      "next dev's pipe on a terminal",
      { NEXT_PRIVATE_PROMPT_OUTPUT: "1" },
      false,
      true,
    ],
    ["NO_COLOR", { NO_COLOR: "1" }, true, false],
    ["TERM=dumb", { TERM: "dumb" }, true, false],
    ["FORCE_COLOR on a pipe", { FORCE_COLOR: "1" }, false, true],
    [
      "NO_COLOR over FORCE_COLOR",
      { NO_COLOR: "1", FORCE_COLOR: "1" },
      true,
      false,
    ],
  ] as const)("in %s", (_name, env, isTTY, expected) => {
    // Act
    const result = supportsColor(env, { isTTY });

    // Assert
    expect(result).toBe(expected);
  });

  it("leaves the mark uncoloured when the terminal has no colour", () => {
    // Arrange
    vi.stubEnv("NO_COLOR", "1");

    // Act
    const painted = styles.green("✓");

    // Assert
    expect(painted).toBe("✓");
    vi.unstubAllEnvs();
  });
});

describe("supportsEmoji", () => {
  it.each(cases)("in $name gives $expected", (testCase) => {
    // Act
    const result = supportsEmoji(
      testCase.env,
      { isTTY: testCase.isTTY },
      testCase.platform,
    );

    // Assert
    expect(result).toBe(testCase.expected);
  });
});
