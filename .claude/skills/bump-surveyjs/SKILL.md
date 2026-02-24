---
name: bump-surveyjs
description: Upgrades Survey.js packages to the latest version. Use when the user wants to update survey-core, survey-creator-core, survey-creator-react, or survey-react-ui packages, or when they mention upgrading Survey.js.
---

# Bump Survey.js Skill

This skill upgrades all Survey.js related packages in the hub application.

## Packages Upgraded

- `survey-core`
- `survey-creator-core`
- `survey-creator-react`
- `survey-react-ui`

## Usage

Run the upgrade script from the hub directory:

```bash
node scripts/upgrade-surveyjs.mjs
```

### Specify a Version

To upgrade to a specific version:

```bash
node scripts/upgrade-surveyjs.mjs 2.5.9
```

## Steps

1. Run the upgrade script from the hub directory
2. The script will upgrade all Survey.js packages using pnpm
3. After upgrade, test the application to ensure everything works
4. Check the Survey.js changelog for any breaking changes. The Urls are:
- For survey-library https://github.com/surveyjs/survey-library/releases/tag/v2.5.9 [change version tag to match]
- For survey-creator https://github.com/surveyjs/survey-creator/releases/tag/v2.5.9 [change version tag to match]

## Script Location

The script is located at: `hub/scripts/upgrade-surveyjs.mjs`

## Next Steps After Upgrade

1. Run tests "pnpm tests" in the hub root folder
2. Run next build to ensure it all works "pnpm build" 
3. Test your application to ensure everything works
4. Check for any breaking changes in the Survey.js changelog
5. Commit your changes if everything looks good
