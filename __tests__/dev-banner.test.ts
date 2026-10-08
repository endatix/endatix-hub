import { describe, expect, it } from "vitest";
import { resolveHubBuild } from "@/lib/hosting/hub-version";
import { formatBuild, hubBuildIdentity } from "../scripts/banner.mjs";

const SHA = "8ef28cee396f8dfb959d40c34868314585659f28";

/** A fake git that answers per command; a missing answer fails like git does. */
function fakeGit(answers: Record<string, string>) {
  return (args: string[]) => {
    const answer =
      answers[args[0] === "describe" ? "describe" : args.join(" ")];
    if (answer === undefined) {
      throw new Error(`fatal: git ${args.join(" ")}`);
    }
    return `${answer}\n`;
  };
}

type ReleaseEnv = {
  GITHUB_REF_TYPE?: string;
  GITHUB_HEAD_REF?: string;
  GITHUB_REF_NAME?: string;
};

type Case = {
  name: string;
  git: Record<string, string>;
  env: ReleaseEnv;
};

const cases: Case[] = [
  {
    name: "a release tag on main",
    git: {
      describe: "v0.8.0",
      "rev-parse HEAD": SHA,
      "rev-parse --abbrev-ref HEAD": "main",
    },
    env: {},
  },
  {
    name: "a feature branch on a tagged commit",
    git: {
      describe: "v0.8.0",
      "rev-parse HEAD": SHA,
      "rev-parse --abbrev-ref HEAD": "feat/x",
    },
    env: {},
  },
  {
    name: "a detached tag checkout",
    git: {
      describe: "v0.8.1",
      "rev-parse HEAD": SHA,
      "rev-parse --abbrev-ref HEAD": "HEAD",
    },
    env: { GITHUB_REF_TYPE: "tag" },
  },
  {
    name: "a detached PR checkout",
    git: { "rev-parse HEAD": SHA, "rev-parse --abbrev-ref HEAD": "HEAD" },
    env: { GITHUB_HEAD_REF: "feat/y" },
  },
  { name: "no git", git: {}, env: {} },
];

describe("dev banner build identity", () => {
  it.each(cases)(
    "matches resolveHubBuild (About dialog) for $name",
    (testCase) => {
      // Arrange
      const git = fakeGit(testCase.git);

      // Act
      const banner = hubBuildIdentity(git, testCase.env);

      // Assert
      expect(banner).toEqual(resolveHubBuild(git, testCase.env));
    },
  );

  it.each([
    [{ version: "0.8.0", branch: null, commit: SHA }, "v0.8.0"],
    [{ version: null, branch: "feat/x", commit: SHA }, "feat/x @ 8ef28ce"],
    [{ version: null, branch: null, commit: null }, "local build"],
  ])("formats %o as %s", (build, expected) => {
    // Act & Assert
    expect(formatBuild(build)).toBe(expected);
  });
});
