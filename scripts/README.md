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
