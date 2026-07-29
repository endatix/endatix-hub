# Build Scripts

This directory contains build scripts for the Endatix Hub application.

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


## Standalone Asset Copy Script

### `copy-standalone.mjs`

Copies `.next/static` and `public` into `.next/standalone/`, which Next.js deliberately leaves out of the `output: "standalone"` bundle. Runs automatically as part of `pnpm build:standalone`.

Avoids `cp -r` shell commands, which fail on Windows because pnpm runs scripts through `cmd.exe`. Expects `pnpm build` to have run first and exits non-zero with an actionable message if the source directories are missing.

**Usage:**

```bash
node scripts/copy-standalone.mjs
```

## Echo pnpm comments

### `echo-pnpm-comments.mjs`

This script echoes the pnpm comments from the package.json file. Can be used manually or automatically via `pnpm:comments` script.

**Usage:**

```bash
node scripts/echo-pnpm-comments.mjs
```