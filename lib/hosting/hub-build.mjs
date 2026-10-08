// How a Hub build is named. next.config and the dev banner both use this, so a
// release tag and a feature branch cannot drift apart. The running server does
// not import this file: execFileSync would pull the whole project into the bundle.
// Git is a fixed path, not a PATH lookup (Sonar S4036).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hubRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const NOT_A_RELEASE_PREFIX = "0.0.0";

/**
 * GitHub Actions ref only. Not the rest of the process environment.
 * @typedef {{ GITHUB_REF_TYPE?: string, GITHUB_HEAD_REF?: string, GITHUB_REF_NAME?: string }} ReleaseEnv
 */

/**
 * @param {(args: string[]) => string} [git]
 * @param {ReleaseEnv} [env]
 */
export function resolveHubBuild(git = runGit, env = process.env) {
  const branch = resolveBranch(git, env);
  const version =
    stampedVersion() ?? (isReleaseLine(branch) ? releaseTagAtHead(git) : null);
  const commit = tryGit(git, ["rev-parse", "HEAD"]);
  return { version, branch: version ? null : branch, commit };
}

function stampedVersion() {
  const version = readPackageVersion();
  return version.startsWith(NOT_A_RELEASE_PREFIX) ? null : version;
}

function readPackageVersion() {
  try {
    const manifest = path.join(hubRoot, "package.json");
    return JSON.parse(readFileSync(manifest, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function isReleaseLine(branch) {
  return branch === null || branch === "main" || branch.startsWith("hotfix/");
}

function releaseTagAtHead(git) {
  const tag = tryGit(git, [
    "describe",
    "--tags",
    "--exact-match",
    "--match",
    "v[0-9]*",
  ]);
  return tag ? tag.replace(/^v/, "") : null;
}

function resolveBranch(git, env) {
  const branch = tryGit(git, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch && branch !== "HEAD") {
    return branch;
  }
  if (env.GITHUB_REF_TYPE === "tag") {
    return null;
  }
  return blankToNull(env.GITHUB_HEAD_REF) ?? blankToNull(env.GITHUB_REF_NAME);
}

function tryGit(git, args) {
  try {
    return blankToNull(git(args));
  } catch {
    return null;
  }
}

function blankToNull(value) {
  return value?.trim() || null;
}

/**
 * Install locations, not PATH. Windows uses Program Files (any drive) and the
 * per-user Git install. Linux and macOS use the system and Homebrew paths.
 */
export function gitCandidates() {
  const paths = [
    "/usr/bin/git",
    "/bin/git",
    "/usr/local/bin/git",
    "/opt/homebrew/bin/git",
  ];
  if (process.platform !== "win32") {
    return paths;
  }
  const roots = [
    process.env.ProgramW6432,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
  ].filter((root) => root);
  for (const root of roots) {
    paths.push(path.join(root, "Git", "cmd", "git.exe"));
    paths.push(path.join(root, "Git", "bin", "git.exe"));
  }
  if (process.env.LOCALAPPDATA) {
    const localGit = path.join(process.env.LOCALAPPDATA, "Programs", "Git");
    paths.push(path.join(localGit, "cmd", "git.exe"));
    paths.push(path.join(localGit, "bin", "git.exe"));
  }
  return paths;
}

let gitExecutable;

function runGit(args) {
  if (gitExecutable === undefined) {
    gitExecutable =
      gitCandidates().find((candidate) => existsSync(candidate)) ?? null;
  }
  if (!gitExecutable) {
    throw new Error("git is not installed in a known location");
  }
  return execFileSync(gitExecutable, args, {
    cwd: hubRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}
