# Build Scripts

This directory contains build scripts for the Endatix Hub application.

> `echo-pnpm-comments.mjs` is gone. Override CVE notes now live as comments on each
> entry in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).

## Question Discovery Script

### `discover-questions.mjs`

This script automatically discovers all custom question modules in the `customizations/questions/` directory and generates a static import file to ensure all questions are included in the frontend build.

## Survey Package Upgrade Script

### `upgrade-surveyjs.mjs`

This script automates the upgrade of all Survey.js related packages to their latest versions. It upgrades:

- `survey-core`
- `survey-creator-core`
- `survey-creator-react`
- `survey-react-ui`

**Usage:**

```bash
node scripts/upgrade-surveyjs.mjs
```

The script will:

1. Change to the hub directory
2. Run `pnpm up` for all survey packages


## Dependency Review Script

### `review-dependency.mjs`

Validates a Dependabot/lockfile PR, picks and proves the smallest fix for a CVE/GHSA, inspects a
package, or tests each `pnpm-workspace.yaml` override for removal. Runs on a scratch copy — it never
modifies the checkout — and ends with a `VERDICT:` line. Procedure and verdict meanings:
[`.agents/skills/review-dependency/SKILL.md`](../.agents/skills/review-dependency/SKILL.md).

```bash
node scripts/review-dependency.mjs pr 1034
node scripts/review-dependency.mjs advisory GHSA-2v37-7h3g-55p8
node scripts/review-dependency.mjs pkg nanoid
node scripts/review-dependency.mjs overrides [name...] [--fresh] [--include-pins]
```

Each run ends with an evidence log: numbered commands with exit code, duration and the fact taken
from their output, cited by every conclusion. Add `--json` (report on stdout) or `--json=<file>` for a
machine-readable report.

## Standalone Asset Copy Script

### `copy-standalone.mjs`

Copies `.next/static` and `public` into `.next/standalone/`, which Next.js deliberately leaves out of the `output: "standalone"` bundle. Runs automatically as part of `pnpm build:standalone`.

Avoids `cp -r` shell commands, which fail on Windows because pnpm runs scripts through `cmd.exe`. Expects `pnpm build` to have run first and exits non-zero with an actionable message if the source directories are missing.

**Usage:**

```bash
node scripts/copy-standalone.mjs
```

## Dev Server Script

### `dev.mjs`

`pnpm dev`, `pnpm dev:inspect` and `pnpm dev-https` run it. It builds the embed SDK, discovers custom questions, then starts `next dev` through `with-dev-cert.mjs`. Each step prints one status line, and its own output shows when it fails or warns. Extra args go to `next dev` (`pnpm dev -p 3001`).

## Dev Certificate Script

### `with-dev-cert.mjs` and `dev-cert.mjs`

`with-dev-cert.mjs` is the CLI; the logic lives in `dev-cert.mjs`, which `dev.mjs` imports.


Runs a Node CLI (`next`, `playwright`, `node`) with the local .NET HTTPS dev certificate trusted through `NODE_EXTRA_CA_CERTS`, so the Hub reaches `https://localhost:5001` without turning certificate checks off. The `dev*`, `run:standalone` and `test:e2e*` package scripts use it. Details: `e2e/README.md` → Screen-out.

```bash
pnpm setup:dev                                    # export the PEM once (any OS)
node scripts/with-dev-cert.mjs playwright test   # what pnpm test:e2e runs
```
