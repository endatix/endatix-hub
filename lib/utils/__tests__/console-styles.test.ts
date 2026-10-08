import { describe, expect, it } from "vitest";
import { supportsEmoji, type TerminalEnv } from "../console-styles";

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
