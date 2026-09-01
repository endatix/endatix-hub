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
- `survey-analytics`

## Usage

Run the upgrade script from the hub directory:

```bash
node scripts/upgrade-surveyjs.mjs
```

### Specify a Version

To upgrade to a specific version:

```bash
node scripts/upgrade-surveyjs.mjs 3.0.2
```

## Steps

1. Run the upgrade script from the hub directory
2. The script will upgrade all Survey.js packages using pnpm
3. After upgrade, test the application to ensure everything works
4. Check the Survey.js changelog for any breaking changes. The Urls are:
- For survey-library https://github.com/surveyjs/survey-library/releases/tag/v3.0.2 [change version tag to match]
- For survey-creator https://github.com/surveyjs/survey-creator/releases/tag/v3.0.2 [change version tag to match]
- Major release notes https://surveyjs.io/stay-updated/release-notes/v3.0.0

## Script Location

The script is located at: `hub/scripts/upgrade-surveyjs.mjs`

## Breaking-change checklist (v3+)

- Creator themes: import from `survey-core/themes` (not `survey-creator-core/themes`)
- Removed Form Library themes (e.g. Sharp*): map to Contrast/Soft equivalents
- Dashboard: use `Dashboard` instead of deprecated `VisualizationPanel`
- Ranking without `selectToRankEnabled` expands value to all choices
- Public/tenant `--sjs-*` CSS vars still work via SurveyJS compatibility map; prefer leaving stored themes alone
- New Hub mappings use `--sjs2-*` source tokens (`hub/DESIGN.md` §8). Do not revive `--sjs-layer-*` Creator vars
- Do not load a shadcn adapter CSS file next to Hub `applyCreatorTheme` / tenant `applyTheme` on public forms until #725
- Themes from `survey-core/themes` carry **no** `--sjs2-*` values; the base token set is injected by `ensureBaseThemeStyles()` under `:where(.sd-theme-root)`. Anything rendered outside a survey root (modals portaled to `document.body`) resolves none of them. Hub avoids this entirely by using shadcn dialogs — do not reintroduce `settings.showDialog`
- `survey-core` ships real typings for the `themes` subpath; do not re-add a local `declare module "survey-core/themes"` shim
- `--ctr-*` and single-prefix `--sjs-*` variables are gone from creator-core 3.x (CSS and JS). Grep Hub stylesheets for them after a bump: each one silently falls through to its hard-coded fallback, which reads as a light-mode block inside a dark Creator
- `applyCreatorTheme` only calls `designerPlugin.setTheme()`. The Translations grid snapshots surface CSS at create. Hub paints `--sjs2-*` onto that grid's existing root — do **not** call `stringsSurvey.applyTheme` (v3 themeChanged + style injection retriggers Next.js HMR/`_rsc` refresh on that tab in dev)

## Next Steps After Upgrade

1. Run tests `pnpm test` in the hub root folder
2. Run next build to ensure it all works `pnpm build`
3. Test your application to ensure everything works
4. Check for any breaking changes in the Survey.js changelog
5. Commit your changes if everything looks good
