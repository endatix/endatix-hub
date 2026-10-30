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

## Runtime Storage Check Script

### `check-runtime-storage.mjs`

Smoke check that the standalone build reads storage settings at runtime (endatix-hub#1134). It fails if `.next/required-server-files.json` has any storage key in `config.env`, since Next inlines those at build. It then starts `.next/standalone/server.js` with `STORAGE_PROVIDER=s3` set at runtime only, and fails if the server logs `Storage service is not enabled` or `Failed to prepare server`. CI runs it after `pnpm build`. Run it on a build made with no `STORAGE_*` env.

**Usage:**

```bash
pnpm build && pnpm check:runtime-storage
```

## Dereferenced Standalone Check Script

### `check-dereferenced-standalone.mjs`

Smoke check for Azure Static Web Apps, which dereferences symlinks when it uploads a hybrid Next.js app (endatix-hub#1269). It fails when an external that Turbopack links into `.next/node_modules` is a nested copy rather than a top-level package: with its link dereferenced, a nested copy (for example `sanitize-html`'s own `postcss`) resolves its dependencies from the top-level `node_modules` instead of the folder next to it. The fix is to add the package that depends on it to `serverExternalPackages` in `next.config.ts`, as `sanitize-html` is. It then copies `.next/standalone` to a temp folder with every symlink replaced by its target, starts that copy, and fails unless `/signin` answers 200 with no `Failed to load external module` or `Cannot find module` in the log. CI runs it after `pnpm build`.

**Usage:**

```bash
pnpm build && pnpm check:dereferenced-standalone
```

## Dev Server Script

### `dev.mjs`

`pnpm dev`, `pnpm dev:inspect` and `pnpm dev-https` run it. It builds the embed SDK, discovers custom questions, then starts `next dev` through `dev-cert.mjs` (`runWithDevCert`). Each step prints one status line, and its own output shows when it fails or warns (writes to stderr). Extra args go to `next dev` (`pnpm dev -p 3001`).

### `banner.mjs`

The `pnpm dev` banner. The icon from `public/assets/icons/icon.svg` is 16 × 16 Braille dots in brand blue, with `Endatix Hub` in bold beside it and the build muted on the next line: `v0.8.0` for a release, otherwise `branch @ commit`. The name comes from `lib/hosting/hub-build.mjs`, the same resolver the About dialog uses. In a 24-bit colour terminal a synthwave gradient sweeps across it once (about 600 ms, eased at both ends, while the setup steps run). 256 or 16 colours print it without the sweep, `NO_COLOR` prints it uncoloured, and CI or piped output gets no banner. The legacy Windows console prints the name and build only, because Braille there is the wrong width.

## Dev Certificate Script

### `with-dev-cert.mjs` and `dev-cert.mjs`

`with-dev-cert.mjs` is the CLI; the logic lives in `dev-cert.mjs`, which `dev.mjs` imports.

Runs a Node CLI (`next`, `playwright`, `node`) with the local .NET HTTPS dev certificate trusted through `NODE_EXTRA_CA_CERTS`, so the Hub reaches `https://localhost:5001` without turning certificate checks off. `dev`, `dev:inspect`, `dev-https`, `run:standalone` and all `test:e2e*` package scripts use it (`dev:embed` does not). Details: `e2e/README.md` → Screen-out.

```bash
pnpm setup:dev                                    # export the PEM again (first use exports it)
node scripts/with-dev-cert.mjs playwright test   # what pnpm test:e2e runs
```
