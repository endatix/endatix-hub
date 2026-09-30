#!/usr/bin/env node

/**
 * Deterministic dependency review for the Hub (skill: .agents/skills/review-dependency).
 *
 *   node scripts/review-dependency.mjs pr <number|url>           Validate a lockfile PR (Dependabot or manual)
 *   node scripts/review-dependency.mjs advisory <GHSA|CVE|url>    Pick and prove the smallest fix for an advisory
 *   node scripts/review-dependency.mjs pkg <name>                 Where a package comes from, open advisories, fixes
 *   node scripts/review-dependency.mjs overrides [name...]        Test each override (or the named ones) for removal
 *
 * Options: --fresh  (overrides) regenerate the lockfile from nothing instead of re-resolving it
 *          --include-pins  (overrides) also test exact-version pins such as @types/react
 *
 * Never modifies the checkout. Every install runs against a scratch copy of package.json,
 * pnpm-workspace.yaml and pnpm-lock.yaml in the OS temp dir; the script prints the commands
 * and edits to apply. CLI input is allowlisted before it reaches argv, and spawnSync runs with
 * shell: false (CWE-78).
 *
 * Exit codes: 0 nothing to do / safe to merge, 1 action needed, 2 usage or tool error.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { parse as parseYaml } from "yaml";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "endatix/endatix-hub";
const MANIFESTS = ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"];
const OPTIONAL_FILES = [".npmrc"];
const ROOT_IMPORTER = JSON.parse(
  readFileSync(join(HUB, "package.json"), "utf8"),
).name;

const PKG_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const GHSA_RE = /GHSA(?:-[23456789cfghjmpqrvwx]{4}){3}/i;
const CVE_RE = /CVE-\d{4}-\d{4,}/i;
const PR_RE =
  /^(?:https:\/\/github\.com\/endatix\/endatix-hub\/pull\/)?(\d{1,7})(?:[/?#].*)?$/;
const REF_RE = /^[\w./-]{1,200}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const SCRATCH_FILES = new Set([...MANIFESTS, ...OPTIONAL_FILES]);

class ToolError extends Error {}
class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Evidence journal: every command, where it ran, what it returned, and which
// conclusions cite it. Printed as a table at the end; --json emits all of it.
// ---------------------------------------------------------------------------

const journal = {
  startedAt: new Date().toISOString(),
  commands: [],
  claims: [],
  verdict: null,
  result: null,
  error: null,
};
let currentStep = "setup";
let jsonStdout = false;
let visibleIds = 0;

const out = (line = "") => {
  if (line.startsWith("VERDICT:")) journal.verdict = line.slice(9).trim();
  (jsonStdout ? process.stderr : process.stdout).write(`${line}\n`);
};
const section = (title) => {
  currentStep = title;
  out(`\n## ${title}\n`);
};

/** Index into the journal; pass it to idsSince() to collect the evidence gathered after it. */
const mark = () => journal.commands.length;
const idsSince = (from) =>
  journal.commands
    .slice(from)
    .map((c) => c.id)
    .filter(Boolean);

function fmtIds(ids) {
  const parts = [];
  for (let i = 0; i < ids.length; i++) {
    let j = i;
    while (j + 1 < ids.length && ids[j + 1] === ids[j] + 1) j++;
    parts.push(j > i ? `#${ids[i]}-#${ids[j]}` : `#${ids[i]}`);
    i = j;
  }
  return parts.join(", ");
}

/** Print a conclusion with the commands that support it, and record it for the report. */
function claim(text, evidence = []) {
  out(evidence.length ? `${text}  [evidence ${fmtIds(evidence)}]` : text);
  journal.claims.push({
    step: currentStep,
    text: text.replace(/^\s*- /, ""),
    evidence,
  });
}

/** Attach what the script read back from the lockfile a command just wrote to that command's row. */
function observe(names, lockText) {
  const last = journal.commands.findLast((c) => c.id);
  if (!last) return;
  const { versions } = lockInfo(lockText);
  const seen = names
    .map((n) => `${n} ${sortVersions(versions.get(n)).join(", ") || "absent"}`)
    .join("; ");
  last.observed = seen;
  last.result = `${last.result} -> lockfile: ${seen}`;
}

const JSON_OUTPUT = (cmd, args) =>
  (cmd === "pnpm" && args.includes("--json")) ||
  (cmd === "gh" && (args[0] === "api" || args.includes("--json"))) ||
  (cmd === "git" && args[0] === "show");

/** One deterministic line per command: the fact the script took from its output. */
function summarize(cmd, args, r) {
  const ok = r.status === 0;
  try {
    if (cmd === "pnpm" && args[0] === "audit") {
      const adv = Object.values(JSON.parse(r.stdout).advisories ?? {});
      const bySeverity = {};
      for (const a of adv)
        bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
      const counts = Object.entries(bySeverity)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ");
      return `${adv.length} ${adv.length === 1 ? "advisory" : "advisories"}${counts ? ` (${counts})` : ""}`;
    }
    if (cmd === "pnpm" && args[0] === "why") {
      const nodes = JSON.parse(r.stdout || "[]");
      if (!nodes.length) return `${args[1]} is not in the tree`;
      return nodes
        .map(
          (n) =>
            `${n.name}@${n.version} <- ${(n.dependents ?? [])
              .map((d) =>
                d.name === ROOT_IMPORTER && !d.dependents
                  ? `${ROOT_IMPORTER} (${d.depField})`
                  : `${d.name}@${d.version}`,
              )
              .join(", ")}`,
        )
        .join("; ");
    }
    if (cmd === "pnpm" && args[0] === "view") {
      const parsed = JSON.parse(r.stdout);
      return `${(Array.isArray(parsed) ? parsed.at(-1) : parsed)?.version ?? "not found"}`;
    }
    if (cmd === "gh" && args[0] === "api") {
      const parsed = JSON.parse(r.stdout);
      return (Array.isArray(parsed) ? parsed : [parsed])
        .map(
          (a) =>
            `${a.ghsa_id}: ${(a.vulnerabilities ?? [])
              .map(
                (v) =>
                  `${v.package.name} ${v.vulnerable_version_range} -> ${v.first_patched_version ?? "no patch"}`,
              )
              .join(", ")}`,
        )
        .join("; ");
    }
    if (cmd === "gh" && args[0] === "pr") {
      const pr = JSON.parse(r.stdout);
      return `${pr.title} (${pr.state}); files: ${pr.files.map((f) => f.path).join(", ")}`;
    }
  } catch {
    // Unparseable output: fall through to the generic summary.
  }
  if (cmd === "git" && args[0] === "show")
    return ok ? `${r.stdout.length} bytes` : "missing";
  const last = tail(r.stdout || r.stderr, 1);
  return ok
    ? `ok${last ? ` - ${last}` : ""}`
    : `exit ${r.status} - ${tail(r.stderr || r.stdout, 1)}`;
}

// ---------------------------------------------------------------------------
// Process + scratch helpers
// ---------------------------------------------------------------------------

function run(
  cmd,
  args,
  { cwd = HUB, allowFail = false, quiet = false, timeout = 600_000 } = {},
) {
  const command = [cmd, ...args].join(" ");
  const workspace =
    cwd === HUB ? "hub checkout" : (scratchLabels.get(cwd) ?? "scratch");
  const entry = {
    id: quiet ? null : ++visibleIds,
    step: currentStep,
    workspace,
    command,
  };
  if (!quiet)
    out(
      `    [#${entry.id}] $ ${command}${cwd === HUB ? "" : `   # ${workspace}`}`,
    );
  const started = Date.now();
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    timeout,
    maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
  });
  entry.durationMs = Date.now() - started;
  entry.exit = r.error ? null : r.status;
  entry.result = r.error
    ? `failed to start: ${r.error.message}`
    : summarize(cmd, args, r);
  if (!r.error && !JSON_OUTPUT(cmd, args))
    entry.output = tail(`${r.stdout ?? ""}\n${r.stderr ?? ""}`, 20).slice(
      -4000,
    );
  journal.commands.push(entry);
  if (r.error)
    throw new ToolError(`${cmd} failed to start: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    throw new ToolError(
      `${cmd} ${args.join(" ")} exited ${r.status}\n${tail(r.stderr || r.stdout)}`,
    );
  }
  return r;
}

const tail = (text, lines = 15) =>
  (text ?? "").trim().split("\n").slice(-lines).join("\n");

const scratchDirs = [];
const scratchLabels = new Map();
process.on("exit", () => {
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway copy of the manifests. The label names it in the evidence log. */
function scratch(files, label) {
  const dir = mkdtempSync(join(tmpdir(), "review-dependency-"));
  scratchDirs.push(dir);
  scratchLabels.set(dir, `scratch: ${label}`);
  for (const [name, content] of Object.entries(files)) {
    if (!SCRATCH_FILES.has(name)) {
      throw new ToolError(`Refusing to write ${name} into scratch`);
    }
    if (content != null) writeFileSync(join(dir, name), content);
  }
  return dir;
}

const readScratch = (dir, name) => readFileSync(join(dir, name), "utf8");
const scratchFiles = (dir) =>
  Object.fromEntries(
    [...MANIFESTS, ...OPTIONAL_FILES]
      .filter((f) => existsSync(join(dir, f)))
      .map((f) => [f, readScratch(dir, f)]),
  );

function readCheckout() {
  return Object.fromEntries(
    [...MANIFESTS, ...OPTIONAL_FILES]
      .filter((f) => existsSync(join(HUB, f)))
      .map((f) => [f, readFileSync(join(HUB, f), "utf8")]),
  );
}

// ---------------------------------------------------------------------------
// pnpm wrappers (all lockfile-only, scripts off)
// ---------------------------------------------------------------------------

const LOCK_ONLY = ["--lockfile-only", "--ignore-scripts"];

function relock(dir, { fresh = false } = {}) {
  if (fresh) rmSync(join(dir, "pnpm-lock.yaml"), { force: true });
  const r = run("pnpm", ["install", ...LOCK_ONLY], {
    cwd: dir,
    allowFail: true,
  });
  if (r.status !== 0)
    throw new ToolError(
      `pnpm install failed in scratch:\n${tail(r.stderr || r.stdout)}`,
    );
}

function audit(dir) {
  const r = run("pnpm", ["audit", "--json"], { cwd: dir, allowFail: true });
  let report;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    throw new ToolError(
      `pnpm audit returned no JSON:\n${tail(r.stderr || r.stdout)}`,
    );
  }
  return Object.values(report.advisories ?? {}).map((a) => ({
    ghsa: a.github_advisory_id,
    module: a.module_name,
    severity: a.severity,
    title: a.title,
    vulnerable: a.vulnerable_versions,
    patched: a.patched_versions,
    versions: [...new Set(a.findings.map((f) => f.version))],
    devOnly: a.findings.every((f) => f.dev),
  }));
}

const advisoryKey = (a) => `${a.ghsa} ${a.module}`;

/** `pnpm why --json` folded to one entry per version: direct parents + the shortest chain to the root. */
function why(dir, name) {
  const r = run("pnpm", ["why", name, "--json"], { cwd: dir, allowFail: true });
  let nodes;
  try {
    nodes = JSON.parse(r.stdout || "[]");
  } catch {
    throw new ToolError(
      `pnpm why returned no JSON:\n${tail(r.stderr || r.stdout)}`,
    );
  }
  const byVersion = new Map();
  for (const node of nodes) {
    const entry = byVersion.get(node.version) ?? {
      version: node.version,
      parents: [],
      chain: null,
    };
    for (const d of node.dependents ?? []) {
      const parent = {
        name: d.name,
        version: d.version,
        root: d.name === ROOT_IMPORTER && !d.dependents,
        depField: d.depField ?? null,
      };
      if (
        !entry.parents.some(
          (p) => p.name === parent.name && p.version === parent.version,
        )
      ) {
        entry.parents.push(parent);
      }
    }
    const chain = shortestChain(node);
    if (!entry.chain || chain.length < entry.chain.length) entry.chain = chain;
    byVersion.set(node.version, entry);
  }
  return byVersion;
}

/** Breadth-first to the root importer. Deduped nodes carry no dependents: their tree is printed elsewhere. */
function shortestChain(node) {
  const queue = [[node, [`${node.name}@${node.version}`]]];
  while (queue.length) {
    const [current, path] = queue.shift();
    for (const d of current.dependents ?? []) {
      if (d.name === ROOT_IMPORTER && !d.dependents)
        return [...path, ROOT_IMPORTER].reverse();
      if (!d.deduped) queue.push([d, [...path, `${d.name}@${d.version}`]]);
    }
  }
  return [`${node.name}@${node.version}`];
}

const metaCache = new Map();
/** `pnpm view <spec> --json`, cached. Returns null when the registry has nothing. */
function meta(spec) {
  if (!metaCache.has(spec)) {
    const r = run("pnpm", ["view", spec, "--json"], {
      allowFail: true,
      quiet: true,
    });
    let value = null;
    if (r.status === 0 && r.stdout.trim()) {
      const parsed = JSON.parse(r.stdout);
      value = Array.isArray(parsed) ? parsed.at(-1) : parsed;
    }
    metaCache.set(spec, value);
  }
  return metaCache.get(spec);
}

function ageMinutes(name, version) {
  const published = meta(name)?.time?.[version];
  return published ? (Date.now() - Date.parse(published)) / 60_000 : null;
}

const fmtAge = (minutes) =>
  minutes == null
    ? "unknown age"
    : minutes < 2880
      ? `${Math.round(minutes / 60)}h old`
      : `${Math.round(minutes / 1440)}d old`;

// ---------------------------------------------------------------------------
// Manifest parsing
// ---------------------------------------------------------------------------

function splitSpec(spec) {
  const at = spec.indexOf("@", 1);
  return at < 0 ? [spec, ""] : [spec.slice(0, at), spec.slice(at + 1)];
}

const sortVersions = (versions) => [...(versions ?? [])].sort(semver.compare);

function lockInfo(lockText) {
  const doc = parseYaml(lockText) ?? {};
  const versions = new Map();
  for (const key of Object.keys(doc.packages ?? {})) {
    const [name, rest] = splitSpec(key);
    const version = rest.replace(/\(.*$/, "");
    if (!semver.valid(version)) continue;
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name).add(version);
  }
  return { overrides: doc.overrides ?? {}, versions };
}

/**
 * Line-based read of the overrides block so each entry keeps its note and its line span
 * (the note is the comment lines directly above the entry).
 */
function workspaceOverrides(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^overrides:\s*$/.test(l));
  if (start < 0) return [];
  const entries = [];
  let note = [];
  let noteStart = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      note = [];
      noteStart = null;
      continue;
    }
    if (!/^\s/.test(line)) break;
    const comment = line.match(/^\s+#\s?(.*)$/);
    if (comment) {
      noteStart ??= i;
      note.push(comment[1].trim());
      continue;
    }
    const m = line.match(
      /^\s+(?:"([^"]+)"|'([^']+)'|([^\s:#][^:]*?)):\s*(.+?)\s*$/,
    );
    if (!m) continue;
    const key = m[1] ?? m[2] ?? m[3];
    const value = m[4].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
    const [name, selector] = splitSpec(key);
    // An entry directly under another one with no comment of its own shares that entry's note.
    const shared = !note.length && entries.at(-1)?.to === i - 1;
    entries.push({
      key,
      name,
      selector: selector || null,
      value,
      note: shared
        ? `${entries.at(-1).note} (shared note)`.replace(
            /( \(shared note\))+$/,
            " (shared note)",
          )
        : note.join(" "),
      from: noteStart ?? i,
      to: i,
    });
    note = [];
    noteStart = null;
  }
  return entries;
}

function removeLines(text, spans) {
  const drop = new Set(
    spans.flatMap(({ from, to }) =>
      Array.from({ length: to - from + 1 }, (_, k) => from + k),
    ),
  );
  return text
    .split("\n")
    .filter((_, i) => !drop.has(i))
    .join("\n");
}

function yamlDoubleQuoted(value) {
  const oneLine = String(value).replace(/\s+/g, " ").trim();
  return `"${oneLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const yamlKey = (key) =>
  /^[a-z0-9-]+$/i.test(key) ? key : yamlDoubleQuoted(key);

function addOverride(text, key, value, note) {
  const safeNote = String(note).replace(/[\r\n]/g, " ");
  const entry = `  # ${safeNote}\n  ${yamlKey(key)}: ${yamlDoubleQuoted(value)}`;
  const entries = workspaceOverrides(text);
  if (!entries.length) return `${text.trimEnd()}\n\noverrides:\n${entry}\n`;
  const lines = text.split("\n");
  lines.splice(entries.at(-1).to + 1, 0, entry);
  return lines.join("\n");
}

function addReleaseAgeExclude(text, name) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^minimumReleaseAgeExclude:\s*$/.test(l));
  if (at < 0)
    return `${text.trimEnd()}\nminimumReleaseAgeExclude:\n  - ${yamlDoubleQuoted(name)}\n`;
  lines.splice(at + 1, 0, `  - ${yamlDoubleQuoted(name)}`);
  return lines.join("\n");
}

function workspaceSettings(text) {
  const doc = parseYaml(text) ?? {};
  return {
    minimumReleaseAge: doc.minimumReleaseAge ?? 1440,
    releaseAgeExclude: doc.minimumReleaseAgeExclude ?? [],
    overrides: workspaceOverrides(text),
  };
}

function directDeps(packageJsonText) {
  const pkg = JSON.parse(packageJsonText);
  const deps = new Map();
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {}))
      deps.set(name, { range, field });
  }
  return deps;
}

const addFlag = (field) =>
  field === "devDependencies"
    ? ["-D"]
    : field === "optionalDependencies"
      ? ["-O"]
      : [];

/** Lowest version on the same caret line, e.g. 3.3.16 -> 3.0.0, 0.35.1 -> 0.35.0. */
function lineFloor(version) {
  const v = semver.parse(version);
  return v.major > 0 ? `${v.major}.0.0` : `0.${v.minor}.0`;
}

const sameLine = (a, b) =>
  semver.satisfies(b, `^${a}`) || semver.satisfies(a, `^${b}`);

function declaredRange(files, parent, dep) {
  if (parent.root)
    return directDeps(files["package.json"]).get(dep)?.range ?? null;
  const m = meta(`${parent.name}@${parent.version}`);
  return (
    m?.dependencies?.[dep] ??
    m?.optionalDependencies?.[dep] ??
    m?.peerDependencies?.[dep] ??
    null
  );
}

const allowsAtLeast = (range, version) =>
  range == null
    ? true
    : semver.validRange(range)
      ? semver.intersects(range, `>=${version}`)
      : false;

// ---------------------------------------------------------------------------
// Advisory resolution (GitHub advisory database via gh)
// ---------------------------------------------------------------------------

function resolveAdvisories(input) {
  const ghsa = input.match(GHSA_RE)?.[0];
  const cve = input.match(CVE_RE)?.[0];
  if (!ghsa && !cve)
    throw new UsageError(`Not a GHSA id, CVE id or advisory URL: ${input}`);
  const path = ghsa
    ? `/advisories/GHSA-${ghsa.slice(5).toLowerCase()}`
    : `/advisories?cve_id=${cve.toUpperCase()}&ecosystem=npm`;
  const raw = JSON.parse(run("gh", ["api", path]).stdout);
  const list = (Array.isArray(raw) ? raw : [raw]).map((a) => ({
    ghsa: a.ghsa_id,
    cve: a.cve_id,
    severity: a.severity,
    summary: a.summary,
    url: a.html_url,
    vulns: (a.vulnerabilities ?? [])
      .filter((v) => v.package?.ecosystem === "npm")
      .map((v) => ({
        name: v.package.name,
        range:
          semver.validRange(v.vulnerable_version_range.replace(/,/g, " ")) ??
          v.vulnerable_version_range,
        patched: v.first_patched_version ?? null,
      })),
  }));
  if (!list.length)
    throw new ToolError(
      `GitHub has no reviewed npm advisory for ${cve ?? ghsa}.`,
    );
  return list;
}

// ---------------------------------------------------------------------------
// Fix planning: REFRESH < BUMP_DIRECT < BUMP_PARENT < OVERRIDE, then proof in scratch
// ---------------------------------------------------------------------------

const RANK = {
  NOT_AFFECTED: 0,
  REFRESH: 1,
  BUMP_DIRECT: 2,
  BUMP_PARENT: 3,
  OVERRIDE: 4,
  NO_PATCH_ON_LINE: 5,
  NO_PATCH: 6,
};

/**
 * One advisory range for one package. `vuln` = { name, range, patched }; patched may be null.
 * Returns the ranked fix kind, the per-version reasoning and the concrete steps.
 */
function planFix(files, dir, vuln, ws, label) {
  const from = mark();
  const installed = sortVersions(
    lockInfo(files["pnpm-lock.yaml"]).versions.get(vuln.name),
  );
  const affected = installed.filter((v) => semver.satisfies(v, vuln.range));
  const plan = {
    ...vuln,
    label,
    installed,
    affected,
    instances: [],
    steps: [],
    kind: "NOT_AFFECTED",
  };
  if (!affected.length) return plan;
  if (!vuln.patched) {
    plan.kind = "NO_PATCH";
    return plan;
  }

  const tree = why(dir, vuln.name);
  const direct = directDeps(files["package.json"]);
  const bump = (kind) => {
    if (RANK[kind] > RANK[plan.kind]) plan.kind = kind;
  };

  for (const version of affected) {
    const node = tree.get(version) ?? { parents: [], chain: [] };
    const instance = { version, chain: node.chain, parents: [] };
    for (const parent of node.parents) {
      const declared = declaredRange(files, parent, vuln.name);
      const info = {
        ...parent,
        declared,
        allows: allowsAtLeast(declared, vuln.patched),
        latest: null,
      };
      if (parent.root) {
        info.kind = "BUMP_DIRECT";
        plan.steps.push({
          kind: "BUMP_DIRECT",
          name: vuln.name,
          spec: `^${vuln.patched}`,
          field: direct.get(vuln.name)?.field,
        });
      } else if (info.allows) {
        info.kind = "REFRESH";
        plan.steps.push({ kind: "REFRESH", name: vuln.name });
      } else {
        const latest = meta(`${parent.name}@latest`);
        const latestDeclared = latest
          ? (latest.dependencies?.[vuln.name] ??
            latest.optionalDependencies?.[vuln.name] ??
            latest.peerDependencies?.[vuln.name] ??
            null)
          : undefined;
        info.latest = latest
          ? {
              version: latest.version,
              declared: latestDeclared,
              allows: allowsAtLeast(latestDeclared, vuln.patched),
            }
          : null;
        if (info.latest?.allows) {
          info.kind = "BUMP_PARENT";
          info.latest.major = !sameLine(parent.version, latest.version);
          // An override on the parent that excludes its latest release would silently undo the bump.
          const pin = ws.overrides.find(
            (e) =>
              e.name === parent.name &&
              (!e.selector || semver.satisfies(parent.version, e.selector)) &&
              !semver.satisfies(latest.version, e.value),
          );
          info.latest.pin = pin ?? null;
          plan.steps.push({
            kind: "BUMP_PARENT",
            name: parent.name,
            to: latest.version,
            field: direct.get(parent.name)?.field ?? null,
            major: info.latest.major,
            pin: pin ? { key: pin.key, value: pin.value, line: pin.to } : null,
          });
        } else if (sameLine(version, vuln.patched)) {
          info.kind = "OVERRIDE";
          plan.steps.push(overrideStep(vuln, version, label));
        } else {
          info.kind = "NO_PATCH_ON_LINE";
        }
      }
      bump(info.kind);
      instance.parents.push(info);
    }
    if (!node.parents.length) bump("REFRESH");
    plan.instances.push(instance);
  }
  plan.steps = dedupeSteps(plan.steps);

  const age = ageMinutes(vuln.name, vuln.patched);
  plan.patchedAge = age;
  plan.releaseAgeBlocked =
    age != null &&
    age < ws.minimumReleaseAge &&
    !ws.releaseAgeExclude.includes(vuln.name);
  plan.evidence = idsSince(from);
  return plan;
}

function overrideStep(vuln, version, label) {
  return {
    kind: "OVERRIDE",
    key: `${vuln.name}@>=${lineFloor(version)} <${vuln.patched}`,
    value: `^${vuln.patched}`,
    note: `${vuln.name} ${vuln.patched} fixes ${label}. Remove when \`node scripts/review-dependency.mjs overrides ${vuln.name}\` reports REMOVABLE`,
  };
}

function dedupeSteps(steps) {
  const seen = new Map();
  for (const s of steps) seen.set(JSON.stringify(s), s);
  return [...seen.values()];
}

/** Apply the steps to a scratch copy, re-lock, then regenerate from nothing: both must be clean. */
function prove(files, plan) {
  const from = mark();
  const what = `${plan.kind} for ${plan.name} ${plan.patched}`;
  const dir = scratch(files, `${what}, steps applied`);
  if (plan.releaseAgeBlocked) {
    writeFileSync(
      join(dir, "pnpm-workspace.yaml"),
      addReleaseAgeExclude(readScratch(dir, "pnpm-workspace.yaml"), plan.name),
    );
  }
  for (const step of plan.steps) {
    if (step.kind === "BUMP_PARENT" && step.pin) {
      const lines = readScratch(dir, "pnpm-workspace.yaml").split("\n");
      lines[step.pin.line] = lines[step.pin.line].replace(
        step.pin.value,
        `^${step.to}`,
      );
      writeFileSync(join(dir, "pnpm-workspace.yaml"), lines.join("\n"));
    }
    if (step.kind === "OVERRIDE") {
      writeFileSync(
        join(dir, "pnpm-workspace.yaml"),
        addOverride(
          readScratch(dir, "pnpm-workspace.yaml"),
          step.key,
          step.value,
          step.note,
        ),
      );
    }
  }
  relock(dir);
  for (const step of plan.steps) {
    if (step.kind === "REFRESH")
      run("pnpm", ["update", step.name, ...LOCK_ONLY], { cwd: dir });
    if (step.kind === "BUMP_DIRECT")
      run(
        "pnpm",
        [
          "add",
          ...addFlag(step.field),
          `${step.name}@${step.spec}`,
          ...LOCK_ONLY,
        ],
        { cwd: dir },
      );
    if (step.kind === "BUMP_PARENT") {
      if (step.field)
        run(
          "pnpm",
          [
            "add",
            ...addFlag(step.field),
            `${step.name}@^${step.to}`,
            ...LOCK_ONLY,
          ],
          { cwd: dir },
        );
      else run("pnpm", ["update", step.name, ...LOCK_ONLY], { cwd: dir });
    }
  }
  const still = (lockText) =>
    sortVersions(lockInfo(lockText).versions.get(plan.name)).filter((v) =>
      semver.satisfies(v, plan.range),
    );
  observe([plan.name], readScratch(dir, "pnpm-lock.yaml"));
  const afterApply = still(readScratch(dir, "pnpm-lock.yaml"));
  const applied = scratchFiles(dir);
  const freshDir = scratch(
    { ...applied, "pnpm-lock.yaml": null },
    `${what}, lockfile regenerated from nothing`,
  );
  relock(freshDir);
  observe([plan.name], readScratch(freshDir, "pnpm-lock.yaml"));
  const afterFresh = still(readScratch(freshDir, "pnpm-lock.yaml"));
  return {
    afterApply,
    afterFresh,
    ok: !afterApply.length && !afterFresh.length,
    evidence: idsSince(from),
  };
}

/** Plan, prove, and if the cheap fix does not hold, escalate to a scoped override and prove that. */
function planAndProve(files, dir, vuln, ws, label) {
  const plan = planFix(files, dir, vuln, ws, label);
  if (!plan.steps.length) return { plan, proof: null };
  let proof = prove(files, plan);
  if (!proof.ok && plan.kind !== "OVERRIDE") {
    const fallback = plan.affected
      .filter((v) => sameLine(v, plan.patched))
      .map((v) => overrideStep(plan, v, label));
    if (fallback.length) {
      const escalated = {
        ...plan,
        kind: "OVERRIDE",
        escalatedFrom: plan.kind,
        steps: dedupeSteps(fallback),
      };
      const escalatedProof = prove(files, escalated);
      return { plan: escalated, proof: escalatedProof, firstProof: proof };
    }
  }
  return { plan, proof };
}

const printPlanHeader = (target) =>
  out(`### ${target.name} -> ${target.patched ?? "no patched release"}`);

function printPlan({ plan, proof, firstProof }, ws) {
  out(`- affected: ${plan.affected.join(", ") || "none"} (${plan.label})`);
  for (const instance of plan.instances) {
    out(`- ${instance.version} via ${instance.chain.join(" > ")}`);
    for (const p of instance.parents) {
      const who = p.root
        ? `${ROOT_IMPORTER} (${p.depField})`
        : `${p.name}@${p.version}`;
      const latest = p.latest
        ? `; latest ${p.name}@${p.latest.version} declares ${p.latest.declared ?? "no dependency"}${p.latest.major ? " (MAJOR bump of the parent)" : ""}${p.latest.pin ? ` (override \`${p.latest.pin.key}: ${p.latest.pin.value}\` pins it)` : ""}`
        : "";
      out(`    - ${who} declares ${p.declared ?? "?"} -> ${p.kind}${latest}`);
    }
  }
  if (plan.patchedAge !== undefined && plan.patched) {
    out(
      `- ${plan.name}@${plan.patched} is ${fmtAge(plan.patchedAge)} (minimumReleaseAge ${ws.minimumReleaseAge} min)${plan.releaseAgeBlocked ? " -> RELEASE_AGE_BLOCKED" : ""}`,
    );
  }
  claim(
    `- decision: ${plan.kind}${plan.escalatedFrom ? ` (escalated: ${plan.escalatedFrom} did not remove the affected versions)` : ""}`,
    plan.evidence ?? [],
  );
  if (firstProof)
    claim(
      `- ${plan.escalatedFrom} proof: after apply [${firstProof.afterApply.join(", ")}], after regenerate [${firstProof.afterFresh.join(", ")}] -> DOES NOT HOLD`,
      firstProof.evidence,
    );
  if (proof) {
    claim(
      `- proof: affected after apply [${proof.afterApply.join(", ") || "none"}], after full regenerate [${proof.afterFresh.join(", ") || "none"}] -> ${proof.ok ? "HOLDS" : "DOES NOT HOLD"}`,
      proof.evidence,
    );
  }
}

function printApply(plans, ws) {
  const commands = [];
  const edits = [];
  for (const { plan } of plans) {
    if (plan.releaseAgeBlocked) {
      edits.push(
        `pnpm-workspace.yaml minimumReleaseAgeExclude: add "${plan.name}" with a note "# ${plan.label}: ${plan.name} ${plan.patched} shipped ${meta(plan.name)?.time?.[plan.patched]?.slice(0, 10)}. Remove once it is older than minimumReleaseAge." (or wait ${Math.ceil((ws.minimumReleaseAge - plan.patchedAge) / 60)}h)`,
      );
    }
    for (const s of plan.steps) {
      if (s.kind === "REFRESH") commands.push(`pnpm update ${s.name}`);
      if (s.kind === "BUMP_DIRECT")
        commands.push(
          `pnpm add ${[...addFlag(s.field), `${s.name}@${s.spec}`].join(" ")}`,
        );
      if (s.kind === "BUMP_PARENT") {
        if (s.pin)
          edits.push(
            `pnpm-workspace.yaml overrides: change \`${s.pin.key}: ${s.pin.value}\` to \`^${s.to}\` (or drop it) and update its note`,
          );
        if (s.major)
          edits.push(
            `nothing yet - MAJOR bump of ${s.name} to ${s.to}: read its changelog/migration guide first`,
          );
        commands.push(
          s.field
            ? `pnpm add ${[...addFlag(s.field), `${s.name}@^${s.to}`].join(" ")}`
            : `pnpm update ${s.name}`,
        );
      }
      if (s.kind === "OVERRIDE")
        edits.push(
          `pnpm-workspace.yaml overrides: add\n      # ${s.note}\n      ${yamlKey(s.key)}: ${s.value}`,
        );
    }
  }
  if (!commands.length && !edits.length) return;
  section("Apply in hub/");
  for (const e of new Set(edits)) out(`- edit ${e}`);
  if (edits.length) commands.push("pnpm install");
  for (const c of new Set(commands)) out(`- run \`${c}\``);
  out(
    "- then re-run this command: it must report NOT_AFFECTED, and `pnpm test --run` must pass",
  );
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Fold every advisory range on one package into one target per installed version: the highest
 * first-patched release among the ranges that hit it. One plan per target instead of one per range.
 */
function mergeTargets(name, entries, installed) {
  const targets = new Map();
  for (const version of installed) {
    const hits = entries.filter((e) => semver.satisfies(version, e.range));
    if (!hits.length) continue;
    const patched = hits.some((h) => !h.patched)
      ? null
      : hits
          .map((h) => h.patched)
          .sort(semver.compare)
          .at(-1);
    const target = targets.get(patched) ?? {
      name,
      patched,
      ranges: new Set(),
      labels: new Set(),
    };
    for (const h of hits) {
      target.ranges.add(h.range);
      target.labels.add(h.label);
    }
    targets.set(patched, target);
  }
  return [...targets.values()].map((t) => ({
    name,
    patched: t.patched,
    range: [...t.ranges].join(" || "),
    label: [...t.labels].join(", "),
  }));
}

/** Plan + prove every advisory entry ({ name, range, patched, label }) grouped by package. */
function planPackages(files, dir, ws, entries) {
  const lock = lockInfo(files["pnpm-lock.yaml"]);
  const results = [];
  for (const name of [...new Set(entries.map((e) => e.name))]) {
    const own = entries.filter((e) => e.name === name);
    const installed = sortVersions(lock.versions.get(name));
    const targets = mergeTargets(name, own, installed);
    section(`Plan for ${name}`);
    out(`- installed: ${installed.join(", ") || "not in the tree"}`);
    out(
      `- advisory ranges: ${[...new Set(own.map((e) => e.range))].join("; ")}`,
    );
    if (!targets.length) {
      out("- no installed version is in a vulnerable range -> NOT_AFFECTED");
      continue;
    }
    for (const target of targets) {
      printPlanHeader(target);
      const result = planAndProve(files, dir, target, ws, target.label);
      printPlan(result, ws);
      results.push(result);
    }
  }
  return results;
}

const advisoryEntries = (a) =>
  a.vulns.map((v) => ({ ...v, label: a.cve ?? a.ghsa }));

function cmdAdvisory(input) {
  const files = readCheckout();
  const ws = workspaceSettings(files["pnpm-workspace.yaml"]);
  const dir = scratch(files, "checkout copy");
  section("Advisory");
  const advisories = resolveAdvisories(input);
  for (const a of advisories) {
    out(`- ${a.ghsa} ${a.cve ?? ""} [${a.severity}] ${a.summary}\n  ${a.url}`);
    if (!a.vulns.length) out("  (no npm packages in this advisory)");
  }
  const results = planPackages(
    files,
    dir,
    ws,
    advisories.flatMap(advisoryEntries),
  );
  printApply(results, ws);
  return verdict(results);
}

function verdict(results) {
  journal.result = { plans: results };
  const worst = results.reduce(
    (w, r) => (RANK[r.plan.kind] > RANK[w] ? r.plan.kind : w),
    "NOT_AFFECTED",
  );
  const unproven = results.some((r) => r.proof && !r.proof.ok);
  section("Verdict");
  if (worst === "NOT_AFFECTED")
    out(
      "VERDICT: NOT_AFFECTED - no installed version is in the vulnerable range. Nothing to do.",
    );
  else if (worst === "NO_PATCH")
    out(
      "VERDICT: NO_PATCH - no patched release exists. Remove or replace the dependency, or record an accepted risk (`pnpm audit --ignore <GHSA>` in CI) with a dated note.",
    );
  else if (worst === "NO_PATCH_ON_LINE")
    out(
      "VERDICT: NO_PATCH_ON_LINE - the fix exists only on a newer major. An override would force consumers across majors: bump or replace the parent package instead, and test it.",
    );
  else if (unproven)
    out(
      `VERDICT: ${worst} (UNPROVEN) - the steps did not clear every affected version in scratch. Read the proof lines above before applying.`,
    );
  else out(`VERDICT: ${worst} - apply the steps above.`);
  return worst === "NOT_AFFECTED" ? 0 : 1;
}

function cmdPkg(name) {
  if (!PKG_RE.test(name))
    throw new UsageError(`Not an npm package name: ${name}`);
  const files = readCheckout();
  const ws = workspaceSettings(files["pnpm-workspace.yaml"]);
  const dir = scratch(files, "checkout copy");

  section(`Where ${name} comes from`);
  const whyFrom = mark();
  const installed = sortVersions(
    lockInfo(files["pnpm-lock.yaml"]).versions.get(name),
  );
  const tree = why(dir, name);
  if (!installed.length) out(`- ${name} is not in pnpm-lock.yaml`);
  for (const v of installed) {
    const node = tree.get(v);
    claim(`- ${v} via ${node?.chain.join(" > ") ?? "?"}`, idsSince(whyFrom));
    for (const p of node?.parents ?? [])
      out(
        `    - required by ${p.root ? `${ROOT_IMPORTER} (${p.depField})` : `${p.name}@${p.version}`}`,
      );
  }
  const latest = meta(name);
  if (latest)
    out(
      `- registry latest: ${latest.version} (${fmtAge(ageMinutes(name, latest.version))})`,
    );

  section("Workspace config");
  const entries = workspaceOverrides(files["pnpm-workspace.yaml"]).filter(
    (e) => e.name === name,
  );
  if (!entries.length) out("- no override");
  for (const e of entries)
    out(
      `- override \`${e.key}: ${e.value}\` - ${e.note || "NO NOTE (every override needs one)"}`,
    );
  if (ws.releaseAgeExclude.includes(name))
    out("- listed in minimumReleaseAgeExclude (check its removal note)");
  if (entries.length)
    out(
      `- removal check: node scripts/review-dependency.mjs overrides ${name}`,
    );

  section(`Open advisories on ${name}`);
  const auditFrom = mark();
  const open = audit(dir).filter((a) => a.module === name);
  if (!open.length) {
    claim("- none", idsSince(auditFrom));
    journal.result = { plans: [] };
    section("Verdict");
    out(`VERDICT: CLEAN - no open advisory on ${name}.`);
    return 0;
  }
  out(
    open.every((a) => a.devOnly)
      ? "- reachable only through devDependencies (build/test tooling)"
      : "- reachable at runtime (dependencies)",
  );
  const advisories = [...new Set(open.map((a) => a.ghsa))].flatMap(
    resolveAdvisories,
  );
  for (const a of advisories)
    out(`- ${a.ghsa} ${a.cve ?? ""} [${a.severity}] ${a.summary}`);
  const results = planPackages(
    files,
    dir,
    ws,
    advisories.flatMap(advisoryEntries).filter((e) => e.name === name),
  );
  printApply(results, ws);
  return verdict(results);
}

function cmdOverrides(names, { fresh, includePins }) {
  for (const n of names)
    if (!PKG_RE.test(n)) throw new UsageError(`Not an npm package name: ${n}`);
  const files = readCheckout();
  const all = workspaceOverrides(files["pnpm-workspace.yaml"]);
  const targets = names.length
    ? all.filter((e) => names.includes(e.name))
    : all;
  if (names.length && !targets.length)
    throw new UsageError(`No override for: ${names.join(", ")}`);

  section("Baseline (current checkout)");
  const baseDir = scratch(files, "checkout copy (baseline)");
  const baseFrom = mark();
  const baseline = new Set(audit(baseDir).map(advisoryKey));
  claim(
    `- ${all.length} overrides, ${baseline.size} open advisories`,
    idsSince(baseFrom),
  );
  out(
    `- mode: ${fresh ? "regenerate the lockfile from nothing (--fresh)" : "re-resolve the existing lockfile"}`,
  );

  const results = [];
  for (const entry of targets) {
    section(`${entry.key}: ${entry.value}`);
    out(`- note: ${entry.note || "NO NOTE"}`);
    const floor = semver.validRange(entry.value)
      ? semver.minVersion(entry.value)?.version
      : null;
    if (!includePins && semver.valid(entry.value)) {
      out(
        "- exact pin (policy, not a security floor): skipped. Pass --include-pins to test it.",
      );
      results.push({ entry, status: "PIN" });
      continue;
    }
    if (!floor) {
      out(`- value ${entry.value} is not a semver range: review by hand.`);
      results.push({ entry, status: "REVIEW" });
      continue;
    }
    const from = mark();
    const dir = scratch(
      {
        ...files,
        "pnpm-workspace.yaml": removeLines(files["pnpm-workspace.yaml"], [
          entry,
        ]),
      },
      `without override ${entry.key}`,
    );
    relock(dir, { fresh });
    observe([entry.name], readScratch(dir, "pnpm-lock.yaml"));
    const inScope = (v) =>
      !entry.selector || semver.satisfies(v, entry.selector);
    const resolved = sortVersions(
      lockInfo(readScratch(dir, "pnpm-lock.yaml")).versions.get(entry.name),
    ).filter(inScope);
    const below = resolved.filter((v) => semver.lt(v, floor));
    const introduced = audit(dir).filter(
      (a) => a.module === entry.name && !baseline.has(advisoryKey(a)),
    );
    out(
      `- without it ${entry.name} resolves to: ${resolved.join(", ") || "nothing (no longer in the tree)"}`,
    );
    out(`- below the floor ${floor}: ${below.join(", ") || "none"}`);
    out(
      `- advisories that reappear: ${introduced.map((a) => `${a.ghsa} [${a.severity}] patched ${a.patched}`).join("; ") || "none"}`,
    );

    let status;
    if (!below.length && !introduced.length) status = "REMOVABLE";
    else if (introduced.length) status = "NEEDED";
    else status = "REVIEW";

    if (below.length) {
      const tree = why(dir, entry.name);
      for (const v of below) {
        const node = tree.get(v);
        out(`- ${v} via ${node?.chain.join(" > ") ?? "?"}`);
        for (const p of node?.parents ?? []) {
          if (p.root) {
            out(
              `    - ${ROOT_IMPORTER} (${p.depField}) declares ${declaredRange(files, p, entry.name)}: raise it in package.json`,
            );
            continue;
          }
          const latest = meta(`${p.name}@latest`);
          const latestDeclared =
            latest?.dependencies?.[entry.name] ??
            latest?.optionalDependencies?.[entry.name] ??
            latest?.peerDependencies?.[entry.name] ??
            null;
          const unblocks = latest && allowsAtLeast(latestDeclared, floor);
          out(
            `    - ${p.name}@${p.version} declares ${declaredRange(files, p, entry.name) ?? "?"}; latest ${latest?.version ?? "?"} declares ${latestDeclared ?? "no dependency"}${unblocks ? " -> bumping it removes this blocker" : ""}`,
          );
        }
        if (sameLine(v, floor)) continue;
        if (!status.startsWith("NEEDED")) {
          out(
            `    - the override forces this consumer from the ${lineFloor(v)} line onto ${entry.value}; removing it restores the range it asked for`,
          );
          continue;
        }
        const fix = sortVersions(
          Object.keys(meta(entry.name)?.time ?? {}).filter(
            (x) => semver.valid(x) && !semver.prerelease(x),
          ),
        ).find(
          (x) =>
            sameLine(v, x) &&
            introduced.every(
              (a) => a.patched && semver.satisfies(x, a.patched),
            ),
        );
        out(
          fix
            ? `    - crosses a major: scope the override per line instead, e.g. "${entry.name}@>=${lineFloor(v)} <${fix}": ^${fix}`
            : `    - crosses a major and no release on the ${lineFloor(v)} line is patched: bump or replace the parent instead`,
        );
        status = "NEEDED+SCOPE";
      }
    }
    if (status === "REVIEW") {
      out(
        "- nothing below the floor has an open advisory, so the floor is not needed for security. Removing is safe unless the note gives a compatibility reason.",
      );
    }
    claim(`- result: ${status}`, idsSince(from));
    results.push({
      entry,
      status,
      floor,
      resolved,
      below,
      reappearing: introduced.map((a) => a.ghsa),
      evidence: idsSince(from),
    });
  }

  const removable = results
    .filter((r) => r.status === "REMOVABLE")
    .map((r) => r.entry);
  if (removable.length > 1) {
    section("Combined removal");
    const from = mark();
    const dir = scratch(
      {
        ...files,
        "pnpm-workspace.yaml": removeLines(
          files["pnpm-workspace.yaml"],
          removable,
        ),
      },
      `without all ${removable.length} removable overrides`,
    );
    relock(dir, { fresh });
    const introduced = audit(dir).filter((a) => !baseline.has(advisoryKey(a)));
    claim(
      `- removing all ${removable.length} together reintroduces: ${introduced.map((a) => `${a.module} ${a.ghsa}`).join(", ") || "nothing"}`,
      idsSince(from),
    );
    if (introduced.length) {
      const hit = new Set(introduced.map((a) => a.module));
      for (const r of results)
        if (r.status === "REMOVABLE" && hit.has(r.entry.name))
          r.status = "REVIEW";
    }
  }

  section("Summary");
  for (const r of results)
    out(`- ${r.status.padEnd(14)} ${r.entry.key}: ${r.entry.value}`);
  const finalRemovable = results.filter((r) => r.status === "REMOVABLE");
  if (finalRemovable.length) {
    section("Apply in hub/");
    out(
      `- delete from pnpm-workspace.yaml overrides (entry and its note): ${finalRemovable.map((r) => r.entry.key).join(", ")}`,
    );
    out(
      "- run `pnpm install`, then `pnpm test --run`, then re-run this command: the removed entries must be gone and nothing new may be NEEDED",
    );
  }
  const scoped = results.filter((r) => r.status.endsWith("+SCOPE"));
  if (scoped.length)
    out(
      `- rewrite as per-major scoped entries: ${scoped.map((r) => r.entry.key).join(", ")}`,
    );
  journal.result = {
    overrides: results.map(({ entry, ...rest }) => ({
      key: entry.key,
      value: entry.value,
      note: entry.note,
      ...rest,
    })),
  };
  section("Verdict");
  out(
    finalRemovable.length || scoped.length
      ? `VERDICT: CLEANUP - ${finalRemovable.length} removable, ${scoped.length} to rescope.`
      : "VERDICT: KEEP - every tested override is still needed or is a policy pin.",
  );
  return finalRemovable.length || scoped.length ? 1 : 0;
}

function assertGitRef(ref, label) {
  if (
    !REF_RE.test(ref) ||
    ref.includes("..") ||
    ref.startsWith("-") ||
    ref.includes("@")
  ) {
    throw new ToolError(`Unexpected ${label}: ${ref}`);
  }
}

function assertSha(sha, label) {
  if (!SHA_RE.test(sha)) throw new ToolError(`Unexpected ${label}: ${sha}`);
}

function gitShow(ref, path) {
  assertSha(ref, "git object");
  if (!SCRATCH_FILES.has(path)) {
    throw new ToolError(`Refusing to read ${path} from git`);
  }
  const result = run("git", ["show", `${ref}:${path}`], {
    allowFail: true,
    quiet: true,
  });
  return result.status === 0 ? result.stdout : null;
}

function cmdPr(input) {
  const number = input.match(PR_RE)?.[1];
  if (!number)
    throw new UsageError(`Not a PR number or ${REPO} PR URL: ${input}`);

  section(`PR #${number}`);
  const pr = JSON.parse(
    run("gh", [
      "pr",
      "view",
      number,
      "--repo",
      REPO,
      "--json",
      "number,title,url,state,author,baseRefName,headRefName,files",
    ]).stdout,
  );
  assertGitRef(pr.baseRefName, "base ref");
  out(`- ${pr.title} (${pr.state}) by ${pr.author.login}\n- ${pr.url}`);

  const fetchFrom = mark();
  run("git", [
    "fetch",
    "--no-tags",
    "--quiet",
    "origin",
    `refs/pull/${number}/head`,
  ]);
  const head = run("git", ["rev-parse", "FETCH_HEAD"], {
    quiet: true,
  }).stdout.trim();
  assertSha(head, "PR head");
  run("git", [
    "fetch",
    "--no-tags",
    "--quiet",
    "origin",
    `refs/heads/${pr.baseRefName}`,
  ]);
  const baseTip = run("git", ["rev-parse", "FETCH_HEAD"], {
    quiet: true,
  }).stdout.trim();
  assertSha(baseTip, "base tip");
  const base = run("git", ["merge-base", head, baseTip]).stdout.trim();
  assertSha(base, "merge-base");
  out(
    `- head ${head.slice(0, 10)}, merge-base ${base.slice(0, 10)} on ${pr.baseRefName}`,
  );

  const load = (ref) =>
    Object.fromEntries(
      [...MANIFESTS, ...OPTIONAL_FILES].map((f) => [f, gitShow(ref, f)]),
    );
  const headFiles = load(head);
  const baseFiles = load(base);
  for (const f of MANIFESTS)
    if (!headFiles[f] || !baseFiles[f])
      throw new ToolError(`${f} missing at head or base.`);

  const findings = { blocked: [], fix: [], review: [], cleanup: new Set() };
  const checks = [];
  const check = (name, pass, detail, evidence) => {
    checks.push({ name, pass, detail: detail || null, evidence });
    claim(
      `- [${pass ? "pass" : "FAIL"}] ${name}${detail ? `: ${detail}` : ""}`,
      evidence,
    );
  };

  section("Scope");
  const changed = pr.files.map((f) => f.path);
  const unexpected = changed.filter((p) => !MANIFESTS.includes(p));
  out(`- files: ${changed.join(", ")}`);
  if (unexpected.length)
    findings.review.push(
      `touches files outside the manifests: ${unexpected.join(", ")}`,
    );

  const baseDirect = directDeps(baseFiles["package.json"]);
  const headDirect = directDeps(headFiles["package.json"]);
  for (const [name, { range }] of headDirect) {
    const before = baseDirect.get(name)?.range;
    if (before === range) continue;
    const from = semver.minVersion(before ?? "0.0.0")?.version;
    const to = semver.validRange(range)
      ? semver.minVersion(range)?.version
      : null;
    const major = from && to && !sameLine(from, to);
    out(
      `- package.json ${name}: ${before ?? "(new)"} -> ${range}${major ? "  MAJOR" : ""}`,
    );
    if (major)
      findings.review.push(
        `major bump of ${name} (${before} -> ${range}): read its changelog and run the app`,
      );
  }

  section("Resolved version changes");
  const baseLock = lockInfo(baseFiles["pnpm-lock.yaml"]);
  const headLock = lockInfo(headFiles["pnpm-lock.yaml"]);
  const bumped = new Map();
  for (const name of new Set([
    ...baseLock.versions.keys(),
    ...headLock.versions.keys(),
  ])) {
    const b = baseLock.versions.get(name) ?? new Set();
    const h = headLock.versions.get(name) ?? new Set();
    const added = sortVersions([...h].filter((v) => !b.has(v)));
    const removed = sortVersions([...b].filter((v) => !h.has(v)));
    if (!added.length && !removed.length) continue;
    out(
      `- ${name}: ${removed.join(", ") || "(new)"} -> ${added.join(", ") || "(removed)"}`,
    );
    bumped.set(name, { added, removed });
  }
  if (!bumped.size) out("- none (peer-suffix or metadata changes only)");

  section("Checks");
  const pnpmVersion = run("pnpm", ["--version"], { quiet: true }).stdout.trim();
  const ciPin = readFileSync(join(HUB, "Dockerfile"), "utf8").match(
    /pnpm@(\d+\.\d+\.\d+)/,
  )?.[1];
  out(
    `- pnpm ${pnpmVersion}${ciPin ? ` (CI/Docker pin ${ciPin}${ciPin === pnpmVersion ? "" : " - MISMATCH, results may differ from CI"})` : ""}`,
  );

  const lockOverrides = JSON.stringify(
    Object.entries(headLock.overrides).sort(),
  );
  const wsOverrides = JSON.stringify(
    workspaceOverrides(headFiles["pnpm-workspace.yaml"])
      .map((e) => [e.key, e.value])
      .sort(),
  );
  const overridesOk = lockOverrides === wsOverrides;
  check(
    "lockfile overrides block matches pnpm-workspace.yaml",
    overridesOk,
    "",
    idsSince(fetchFrom),
  );
  if (!overridesOk)
    findings.blocked.push(
      "lockfile overrides differ from pnpm-workspace.yaml: run `pnpm install` on the branch and push the lockfile",
    );

  const headDir = scratch(headFiles, "PR head");
  const frozenFrom = mark();
  const frozen = run("pnpm", ["install", "--frozen-lockfile", ...LOCK_ONLY], {
    cwd: headDir,
    allowFail: true,
  });
  check(
    "frozen install + supply-chain policy (what CI runs)",
    frozen.status === 0,
    "",
    idsSince(frozenFrom),
  );
  if (frozen.status !== 0) {
    out(tail(frozen.stderr || frozen.stdout, 8).replace(/^/gm, "      "));
    findings.blocked.push("frozen install fails: CI will fail too");
  }

  const auditFrom = mark();
  const baseAdv = audit(scratch(baseFiles, "PR merge-base"));
  const headAdv = audit(headDir);
  const headKeys = new Set(headAdv.map(advisoryKey));
  const baseKeys = new Set(baseAdv.map(advisoryKey));
  const fixed = baseAdv.filter((a) => !headKeys.has(advisoryKey(a)));
  const introduced = headAdv.filter((a) => !baseKeys.has(advisoryKey(a)));
  claim(
    `- advisories: ${baseAdv.length} before, ${headAdv.length} after`,
    idsSince(auditFrom),
  );
  for (const a of fixed)
    out(`    - fixed      ${a.module} ${a.ghsa} [${a.severity}] ${a.title}`);
  for (const a of introduced)
    out(`    - INTRODUCED ${a.module} ${a.ghsa} [${a.severity}] ${a.title}`);
  if (introduced.length)
    findings.fix.push(
      `introduces ${introduced.length} advisories: run \`advisory <GHSA>\` for each`,
    );

  const freshFrom = mark();
  const freshDir = scratch(
    { ...headFiles, "pnpm-lock.yaml": null },
    "PR head, lockfile regenerated from nothing",
  );
  relock(freshDir);
  observe([...bumped.keys()], readScratch(freshDir, "pnpm-lock.yaml"));
  const freshLock = lockInfo(readScratch(freshDir, "pnpm-lock.yaml"));
  const regressed = [];
  for (const [name, { removed }] of bumped) {
    const back = removed.filter((v) => freshLock.versions.get(name)?.has(v));
    if (back.length) regressed.push(`${name}@${back.join(",")}`);
  }
  const freshKeys = new Set(audit(freshDir).map(advisoryKey));
  const fixedLost = fixed.filter((a) => freshKeys.has(advisoryKey(a)));
  const persists = !regressed.length && !fixedLost.length;
  check(
    "fix survives a full lockfile regenerate",
    persists,
    persists
      ? ""
      : `back to ${regressed.join(", ") || "-"}; advisories back: ${fixedLost.map((a) => a.ghsa).join(", ") || "-"}`,
    idsSince(freshFrom),
  );
  if (!persists) {
    findings.fix.push(
      `a regenerate loses the fix: merge, then run \`node scripts/review-dependency.mjs advisory <GHSA>\` for ${fixedLost.map((a) => a.ghsa).join(", ") || "the affected package"} to get a scoped override`,
    );
  }

  const touched = new Set([
    ...bumped.keys(),
    ...[...headDirect.keys()].filter(
      (n) => baseDirect.get(n)?.range !== headDirect.get(n).range,
    ),
  ]);
  for (const entry of workspaceOverrides(headFiles["pnpm-workspace.yaml"])) {
    const mentioned = [...touched].some(
      (n) =>
        n.length > 2 &&
        new RegExp(
          `(^|[^\\w@/-])${n.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^\\w-]|$)`,
        ).test(entry.note),
    );
    if (touched.has(entry.name) || mentioned) findings.cleanup.add(entry.name);
  }

  section("Verdict");
  for (const b of findings.blocked) out(`- BLOCKED: ${b}`);
  for (const f of findings.fix) out(`- NEEDS_FIX: ${f}`);
  for (const r of findings.review) out(`- REVIEW: ${r}`);
  if (findings.cleanup.size) {
    out(
      `- CLEANUP: overrides whose note names a changed package. After merge run: node scripts/review-dependency.mjs overrides ${[...findings.cleanup].join(" ")}`,
    );
  }
  const state = findings.blocked.length
    ? "BLOCKED"
    : findings.fix.length
      ? "NEEDS_FIX"
      : findings.review.length
        ? "REVIEW"
        : "MERGE";
  journal.result = {
    pr: {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: pr.author.login,
      head,
      mergeBase: base,
    },
    scope: { files: changed, unexpected },
    versionChanges: Object.fromEntries(bumped),
    checks,
    advisories: {
      fixed: fixed.map((a) => `${a.module} ${a.ghsa}`),
      introduced: introduced.map((a) => `${a.module} ${a.ghsa}`),
    },
    findings: { ...findings, cleanup: [...findings.cleanup] },
    verdict: state,
  };
  out(`VERDICT: ${state}`);
  return state === "MERGE" ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Evidence output
// ---------------------------------------------------------------------------

const cell = (text) =>
  String(text ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");

function printEvidence() {
  const visible = journal.commands.filter((c) => c.id);
  const lookups = journal.commands.filter((c) => !c.id);
  section("Evidence log");
  out(
    "Every command the review ran, in order. `[evidence #n]` on a line above cites these rows.",
  );
  out(
    "Scratch workspaces are temp copies of package.json, pnpm-workspace.yaml and pnpm-lock.yaml; the checkout is never modified.\n",
  );
  out("| # | Step | Workspace | Command | Exit | Time | Result |");
  out("| - | ---- | --------- | ------- | ---- | ---- | ------ |");
  for (const c of visible) {
    out(
      `| ${c.id} | ${cell(c.step)} | ${cell(c.workspace)} | \`${cell(c.command)}\` | ${c.exit ?? "-"} | ${(c.durationMs / 1000).toFixed(1)}s | ${cell(c.result)} |`,
    );
  }
  if (lookups.length) {
    const kinds = {};
    for (const c of lookups) {
      const kind = c.command.split(" ").slice(0, 2).join(" ");
      kinds[kind] = (kinds[kind] ?? 0) + 1;
    }
    out(
      `\nAlso ${lookups.length} read-only lookups (${Object.entries(kinds)
        .map(([k, n]) => `${n}x \`${k}\``)
        .join(", ")}); each is listed with its result in the --json report.`,
    );
  }
}

function buildReport(argv, exitCode) {
  const quietRun = (cmd, args) => {
    const r = spawnSync(cmd, args, {
      cwd: HUB,
      encoding: "utf8",
      shell: false,
    });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const dirty = quietRun("git", ["status", "--porcelain", "--", ...MANIFESTS]);
  return {
    tool: "review-dependency",
    schemaVersion: 1,
    invocation: `node scripts/review-dependency.mjs ${argv.join(" ")}`,
    startedAt: journal.startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    verdict: journal.verdict,
    error: journal.error,
    environment: {
      pnpm: quietRun("pnpm", ["--version"]),
      node: process.version,
      checkout: quietRun("git", ["rev-parse", "HEAD"]),
      uncommittedManifests: dirty ? dirty.split("\n") : [],
    },
    result: journal.result,
    claims: journal.claims,
    commands: journal.commands,
  };
}

// ---------------------------------------------------------------------------

const USAGE = `Usage:
  node scripts/review-dependency.mjs pr <number|url>
  node scripts/review-dependency.mjs advisory <GHSA-id|CVE-id|advisory url>
  node scripts/review-dependency.mjs pkg <npm-package>
  node scripts/review-dependency.mjs overrides [npm-package...] [--fresh] [--include-pins]

Every mode also takes --json (JSON report on stdout, human output on stderr)
or --json=<file> (write the JSON report to <file>, human output as usual).`;

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const [command, ...args] = argv.filter((a) => !a.startsWith("--"));
  for (const f of flags)
    if (
      !["--fresh", "--include-pins", "--json"].includes(f) &&
      !f.startsWith("--json=")
    )
      throw new UsageError(`Unknown option ${f}`);
  switch (command) {
    case "pr":
      if (args.length !== 1) throw new UsageError(USAGE);
      return cmdPr(args[0]);
    case "advisory":
    case "cve":
      if (args.length !== 1) throw new UsageError(USAGE);
      return cmdAdvisory(args[0]);
    case "pkg":
      if (args.length !== 1) throw new UsageError(USAGE);
      return cmdPkg(args[0]);
    case "overrides":
      return cmdOverrides(args, {
        fresh: flags.has("--fresh"),
        includePins: flags.has("--include-pins"),
      });
    default:
      throw new UsageError(USAGE);
  }
}

const argv = process.argv.slice(2);
const jsonFile =
  argv.find((a) => a.startsWith("--json="))?.slice("--json=".length) || null;
jsonStdout = argv.includes("--json");

if (
  jsonFile &&
  (jsonFile.startsWith("/") ||
    /^[A-Za-z]:/.test(jsonFile) ||
    jsonFile.split(/[/\\]/).includes(".."))
) {
  process.stderr.write(
    "--json file must be a relative path inside the working directory\n",
  );
  process.exit(2);
}

let exitCode;
try {
  exitCode = main(argv);
} catch (error) {
  if (error instanceof UsageError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
  if (!(error instanceof ToolError)) throw error;
  process.stderr.write(`${error.message}\n`);
  journal.error = error.message;
  exitCode = 2;
}
// The log is printed on tool errors too: the last row is the command that failed.
printEvidence();
if (jsonStdout || jsonFile) {
  const report = `${JSON.stringify(buildReport(argv, exitCode), null, 2)}\n`;
  if (jsonFile) {
    writeFileSync(jsonFile, report);
    out(`\nJSON report written to ${jsonFile}`);
  }
  if (jsonStdout) process.stdout.write(report);
}
process.exitCode = exitCode;
