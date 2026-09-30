---
name: review-dependency
description: Review a dependency change in the Hub with a deterministic, tool-driven process. Use when given a Dependabot or lockfile PR (number or URL) to validate, a CVE/GHSA id or advisory URL to fix, an npm package name to investigate, or when asked to clean up, audit or justify the overrides in pnpm-workspace.yaml. Also use for "should we merge this bump", "do we need an override", "is this override still needed" and pnpm audit findings.
---

# Review Dependency

One script does the work: `hub/scripts/review-dependency.mjs`. It never touches the checkout — every
install runs on a scratch copy of `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` — and it
prints each command it runs, the evidence, the exact edits to make, and a final `VERDICT:` line.
Your job is to pick the mode, run it, act on the verdict, and report. Do not replace its steps with
your own reasoning about semver ranges; if the output looks wrong, fix the script.

## Pick the mode from the input

Run from `hub/`.

| Input                                                  | Command                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| PR number or `github.com/endatix/endatix-hub/pull/<n>` | `node scripts/review-dependency.mjs pr <n>`               |
| `GHSA-…`, `CVE-…`, or an advisory URL                  | `node scripts/review-dependency.mjs advisory <id-or-url>` |
| npm package name                                       | `node scripts/review-dependency.mjs pkg <name>`           |
| "clean up overrides" / a Dependabot PR's CLEANUP line  | `node scripts/review-dependency.mjs overrides [name...]`  |

Options for `overrides`: `--fresh` regenerates the lockfile from nothing (slower, worst case) instead of
re-resolving it; `--include-pins` also tests exact pins such as `@types/react`.

Exit code: `0` nothing to do / safe to merge, `1` action needed, `2` usage or tool error (read stderr).

### Evidence: how a reviewer follows the diagnosis

Every command the script runs is numbered as it runs (`[#7] $ pnpm update qs …   # scratch: REFRESH for qs 6.16.0, steps applied`),
and every conclusion cites the commands behind it (`- proof: … -> HOLDS  [evidence #6-#8]`). The run
ends with an **Evidence log** table — step, workspace, command, exit code, duration, and the fact the
script took from the output (advisory counts by severity, `pnpm why` parents, the advisory's ranges, and
for installs the versions read back from the lockfile, e.g. `-> lockfile: qs 6.16.0`). Workspaces name
the scratch copy a command ran in (`checkout copy`, `PR head`, `PR merge-base`,
`without override flatted`, `… lockfile regenerated from nothing`); `hub checkout` means read-only use
of the real repo (`gh`, `git fetch`). Read-only lookups (`pnpm view`, `git show`) are counted under the
table and listed in the JSON report.

Structured output, for PR comments, CI artifacts or another agent:

- `--json` — the JSON report on stdout; the human output moves to stderr.
- `--json=<file>` — human output as usual, JSON report written to `<file>`.

The report (`schemaVersion: 1`) holds `verdict`, `exitCode`, `environment` (pnpm, node, checkout SHA,
uncommitted manifest changes), `result` (mode-specific: `plans` with parents, steps and proofs;
`overrides` with resolved/below/reappearing per entry; or the PR `checks`, `versionChanges`,
`advisories` and `findings`), `claims` (each conclusion with its evidence ids) and `commands` (every
command, lookups included, with exit, duration, result and an output tail). The script also prints the
evidence log when a tool fails, so the last row shows the command that broke.

Prerequisites: `gh auth status` succeeds, network access to the npm registry, and `pnpm --version`
matches the pin in `Dockerfile` (the `pr` mode prints a MISMATCH line otherwise — results may then
differ from CI).

## Override policy (what the script enforces)

1. **An override is the last resort.** Fixes are ranked, and the script picks the first that works and
   proves it:
   `REFRESH` (the parent's range already allows the fix — `pnpm update <pkg>`, lockfile only)
   → `BUMP_DIRECT` (raise our own range in `package.json`)
   → `BUMP_PARENT` (a newer parent declares a range that allows the fix)
   → `OVERRIDE` (scoped, same major).
2. **Scope every new override to the vulnerable versions, on one major line**:
   `"pkg@>=3.0.0 <3.3.19": ^3.3.19` — never a bare `pkg: ^x`. A bare entry forces every consumer onto
   one major (today `minimatch` pushes eslint plugins that want `^3` onto 10, `protobufjs` pushes
   `@grpc/proto-loader` from 7 to 8) and keeps matching after it stops being needed. A scoped entry
   stops matching once no parent asks for a vulnerable version, which is exactly what the removal
   check detects. One entry per major when several majors are affected (as `picomatch` does).
3. **Never override across a major.** When the fix exists only on a newer major the verdict is
   `NO_PATCH_ON_LINE`: bump or replace the parent, and test it like any major upgrade.
4. **Every override carries its note** on the line above: what it fixes, and a testable removal
   condition. The script writes it for you:
   `# <pkg> <version> fixes <CVE>. Remove when \`node scripts/review-dependency.mjs overrides <pkg>\` reports REMOVABLE`
5. **Same-day fixes**: when the patched release is younger than `minimumReleaseAge` the plan says
   `RELEASE_AGE_BLOCKED` and adds the package to `minimumReleaseAgeExclude` with a dated note. Never
   lower `minimumReleaseAge`. Remove the exclude entry once the release is older than the age (the
   `pkg` mode shows it).
6. Dependabot needs no special config: it already reads `pnpm-workspace.yaml` (overrides,
   `minimumReleaseAge`). Keep `cooldown.default-days` in `.github/dependabot.yml` ≥ the release age.

## Mode: `pr` — validate a lockfile PR

The script fetches the PR head and its merge-base (no checkout), then checks:

- **Scope** — changed files outside the three manifests, and `package.json` range changes (MAJOR flagged).
- **Resolved version changes** — every package whose resolved versions differ.
- **Overrides block matches** — the lockfile's `overrides:` equals `pnpm-workspace.yaml` (else CI's frozen install fails).
- **Frozen install + supply-chain policy** — exactly what CI's `pnpm ci` enforces.
- **Advisories before/after** — fixed and INTRODUCED, by GHSA.
- **Fix survives a full lockfile regenerate** — deletes the lockfile, re-resolves, and fails if any version
  the PR removed comes back or a fixed advisory reappears. This answers "will we lose the fix on the next
  regenerate?" — PASS means no override is needed.
- **CLEANUP candidates** — overrides whose note names a package the PR changes.

Act on the verdict:

| Verdict     | Do                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `MERGE`     | Report it as safe. Merge only if the user asked (`gh pr merge <n> --squash`).                     |
| `REVIEW`    | A human decision: a major bump (read the changelog, run the app) or files outside the manifests.  |
| `NEEDS_FIX` | Regenerate loses the fix or advisories were introduced: run `advisory <GHSA>` for each and apply. |
| `BLOCKED`   | CI would fail. Ask Dependabot to rebase (`@dependabot rebase`) or fix the lockfile on the branch. |

If there is a `CLEANUP` line, run the `overrides` mode for those names after the merge.

## Mode: `advisory` / `pkg` — choose the fix for a CVE or package

`advisory` resolves the id through the GitHub advisory database (`gh api /advisories/...`).
`pkg` shows where the package comes from (`pnpm why` chains), its override and release-age entries, and
plans a fix for every open advisory on it. Both merge all ranges per installed version into one target
(the highest first-patched release), then for each affected version list the parents, the range each
declares, and the range the parent's latest release declares. The chosen fix is applied to a scratch
copy and **proved twice**: after applying, and after a full lockfile regenerate.

| Verdict                  | Do                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_AFFECTED` / `CLEAN` | Nothing. Say which versions are installed and why they are outside the range.                                                                      |
| `REFRESH`                | Run the printed `pnpm update <pkg>`. No config change.                                                                                             |
| `BUMP_DIRECT`            | Run the printed `pnpm add`.                                                                                                                        |
| `BUMP_PARENT`            | Run it; a `MAJOR` flag means read the parent's migration notes first, and a pinning override on the parent must change in the same edit (printed). |
| `OVERRIDE`               | Add the printed scoped entry with its note, then `pnpm install`.                                                                                   |
| `NO_PATCH_ON_LINE`       | Escalate: the parent must move major or be replaced. Do not override across majors.                                                                |
| `NO_PATCH`               | Escalate: no fix exists. Remove/replace the dependency or record an accepted risk.                                                                 |
| `… (UNPROVEN)`           | The steps did not clear the scratch copy. Read the proof lines; do not apply blindly.                                                              |

Weigh severity and reach: `pkg` says whether the advisories are reachable at runtime or only through
devDependencies. A low-severity dev-only finding does not justify a major bump — say so and propose
waiting for the parent.

## Mode: `overrides` — is each override still needed?

For each entry: remove it in scratch, re-resolve, and compare what resolves against the entry's floor
(the minimum of its range) and against the advisories open in the current checkout.

| Result         | Meaning / action                                                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REMOVABLE`    | Nothing resolves below the floor and no advisory comes back. Delete the entry and its note.                                                                                                                    |
| `REVIEW`       | Something resolves below the floor but none of it has an open advisory: the floor is not needed for security. Removable unless the note gives a compatibility reason — often it also ends a cross-major force. |
| `NEEDED`       | An advisory comes back. Keep it; the parents listed (with "bumping it removes this blocker") are the way out.                                                                                                  |
| `NEEDED+SCOPE` | Needed, and it forces a consumer across majors: replace it with the printed per-line scoped entries.                                                                                                           |
| `PIN`          | Exact version pin (policy, e.g. `@types/react` kept in lockstep with Next.js). Skipped by default.                                                                                                             |

With more than one `REMOVABLE`, the script also removes them all together and re-audits, because two
overrides can depend on each other.

Apply cleanup in small steps: remove the entries (one commit per entry, or one per related group such as
the `picomatch` pair), run `pnpm install`, re-run `overrides` — the removed entries must be gone and
nothing new may be `NEEDED` — then run the checks below.

When to run it: whenever a PR's verdict has a `CLEANUP` line, after bumping a package named in any
override note, and once a month as a sweep.

## After applying any change

From `hub/`, in order; all must pass before you report done:

```bash
pnpm install                                   # lockfile + overrides block in sync
node scripts/review-dependency.mjs <same mode> # must now report NOT_AFFECTED / CLEAN / KEEP
pnpm audit --audit-level high                  # no new high/critical findings
pnpm lint && pnpm test --run
pnpm build                                     # when a runtime dependency or a major version moved
```

Commit only `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` (plus notes). Use a
`chore(deps):` or `fix(deps):` prefix and name the CVE/GHSA in the message.

## Report back

Keep it to the evidence the script printed:

1. The verdict, and in one sentence why (for example: "postcss declares `^3.3.12`, so a regenerate
   keeps nanoid 3.3.19 — no override needed").
2. The commands or edits you applied (or recommend), copied from the "Apply in hub/" section.
3. What you verified and the result, and anything escalated to a human (MAJOR, NO_PATCH, UNPROVEN, REVIEW).
4. The evidence: cite the rows behind each conclusion (for example "proof holds, evidence #6-#8"),
   and paste the Evidence log table when the answer goes into a PR comment or review.

## Limits

- Advisory data comes from `pnpm audit` (npm registry) and the GitHub advisory database; an advisory
  that neither knows about cannot be checked.
- The `pnpm why` chain shown is the shortest one; a version can have other paths — the parent list
  under it is complete.
- `pr` mode uses the local pnpm. Keep it on the Dockerfile pin so the frozen-install check means what CI means.
