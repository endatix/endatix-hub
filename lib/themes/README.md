# Hub ↔ SurveyJS theme sync (SurveyJS v3)

How Hub brand tokens reach Survey Creator, Hub-internal survey models and the analytics
dashboard. Summary and ownership rules: `DESIGN.md` §9. Read this file before touching
`lib/themes/`, Creator CSS overrides, or anything that renders a SurveyJS surface.

`app/globals.css` is the source of truth for Hub brand tokens. Survey Creator chrome and
Hub-internal Survey Model themes derive from these tokens.

SurveyJS v3 uses `--sjs2-*` design tokens. Override **source** tokens only
(`project-brand-600`, palettes, utility surfaces). Downstream ramps (`bg-brand-*`,
`lch(from …)`, `rgba(from …)`) derive automatically. Do not hand-edit `--sjs-layer-*` or other
v2 Creator layer names.

Legacy `--sjs-*` (single hyphen) is a compatibility map for **stored tenant theme JSON**. Leave
DB themes as-is. New Hub mappings use `--sjs2-*`.

Official guidance:

- [SurveyJS v3 theme adapters](https://surveyjs.io/stay-updated/blog/surveyjs-v3-theme-adapters) — shadcn adapter reads `--primary`, `--background`, `--card`, `--border`, `--ring`, `--radius`, `--spacing`
- Brand styling skill: source tokens + layer DefaultDark for dark; adapters are CSS on `.sjs-theme-overrides` and must not sit next to a competing `applyTheme`

Hub `components.json` style is **new-york**. Do **not** import
`survey-core/themes/adapters/shadcn-new-york.css` on public/share/embed until respondent
light/dark is decided (endatix-hub#725). Hub designer uses `applyCreatorTheme` overlays, not the
adapter stylesheet (adapter toolbox maps to `--background`; Hub chrome uses `--content-canvas`).

## Modules

| Module                  | Holds                                                                                                         |
| :---------------------- | :------------------------------------------------------------------------------------------------------------ |
| `endatix-themes.ts`     | Hub tokens + fallbacks, Creator chrome and survey themes (light/dark), `pickCreatorTheme` / `pickSurveyTheme` |
| `creator-theme.ts`      | `applyEndatixCreatorTheme` + the Hub-colour resolve pass                                                      |
| `survey-theme.ts`       | `registerThemes`, `sanitizeSurveyTheme`, `applyFormSurveyTheme`, `applyHubDashboardTheme`                     |
| `use-endatix-themes.ts` | `useEndatixCreatorTheme` / `useEndatixSurveyTheme` (`next-themes`)                                            |

## Token mapping (source `--sjs2-*`)

| App token (`globals.css`) | Creator + survey source (`endatix-themes.ts`)                                                              |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- |
| `--primary`               | `--sjs2-color-project-brand-600`                                                                           |
| `--primary-foreground`    | `--sjs2-color-fg-brand-on-primary`                                                                         |
| `--foreground`            | `--sjs2-color-fg-basic-primary`                                                                            |
| `--border`                | `--sjs2-color-border-basic-secondary`                                                                      |
| `--radius`                | `--sjs2-base-unit-radius`                                                                                  |
| `--ring`                  | `--sjs2-color-utility-a11y`                                                                                |
| `--destructive`           | `--sjs2-palette-red-600`                                                                                   |
| `--success`               | `--sjs2-palette-green-600`                                                                                 |
| `--warning`               | `--sjs2-palette-yellow-600`                                                                                |
| `--info`                  | `--sjs2-palette-blue-600`                                                                                  |
| `--background`            | Survey model: `--sjs2-color-utility-body`, `--sjs2-color-utility-surface-survey` (kills Default teal tint) |
| `--content-canvas`        | Creator **editing surfaces and input fills** — see the region table below                                  |
| `--card`                  | Creator **chrome** (top bar, toolbox, property grid, root). Survey model: `--sjs2-color-utility-sheet`     |

Do not pin `--sjs2-color-bg-brand-primary` or other derived tokens unless a shade is explicitly
off-brand.

## Public pages stay off `globals.css`

`/share` and `/embed` are their own root layouts (there is no `app/layout.tsx`) and they
deliberately do **not** import `app/globals.css` — that is the whole Tailwind + shadcn bundle,
~153 KB raw / 24 KB gzipped, for a page that renders one survey. Public status pages use a CSS
module for the same reason.

Hub tokens (`--primary`, `--card`, …) therefore do not exist on those pages, so every Hub value
in a theme object is written as `var(--token, <literal>)` via `hubToken()` in
`endatix-themes.ts`. Without the literal the whole `--sjs2-*` declaration is invalid at
computed-value time: surfaces render transparent and the submit button loses its background.
With it, `/share` renders pixel-identically whether or not `globals.css` is loaded.

The literals mirror `:root` in `app/globals.css`; `__tests__/endatix-themes.test.ts` parses that
file and fails if the two drift. **When the palette changes, change both.** Never fix a
missing-token symptom on a public page by importing `globals.css`.

## Hub CSS injected into the Creator

Anything the Hub injects into Creator DOM (the data-list rows in the Translations grid, custom
question icons) must name **`--sjs2-*` tokens only**, with no hard-coded colour fallback.

v3 dropped the `--ctr-*` and single-prefix `--sjs-*` variables entirely — they are not in
survey-creator-core 3.x CSS _or_ JS. Rules that still name them fall straight through to their
literal fallback, which is how a white help band appeared across the dark Translations grid, and
how the "Open data list" link kept rendering in SurveyJS teal. `var(--gone, #fff)` looks
defensive and is the opposite.

Match the surface you are sitting on: `.st-table__cell` uses `--sjs2-color-bg-basic-primary`,
header cells use `--sjs2-color-bg-basic-secondary`, muted captions use
`--sjs2-color-fg-basic-primary-muted`, and brand text/icons use `--sjs2-color-fg-brand-primary`
(toolbox icons use `--sjs2-color-bg-brand-primary`). Guarded by
`lib/survey-features/data-lists/infrastructure/__tests__/creator-translation-styles.test.ts`.

**Known gap:** `lib/questions/drag-categorize/drag-categorize.styles.css` still names v2
variables throughout. It is respondent-facing and light-only today (see #725), so the literal
fallbacks happen to be correct — but it needs the same pass before respondent dark mode ships.

## Creator surfaces (which token paints what)

Verified against `survey-creator-core` 3.0.2 CSS. **Two depths, the same rule in both palettes:**

| Depth    | Hub token          | Light     | Dark      | Paints                                                            |
| :------- | :----------------- | :-------- | :-------- | :---------------------------------------------------------------- |
| Recessed | `--content-canvas` | `#eff4fe` | `#001225` | the design surface, input fills, search boxes, unchecked controls |
| Raised   | `--card`           | `#fff`    | `#001a34` | chrome panels **and** question cards                              |

Three failure modes this prevents, all seen on the v3 upgrade:

1. Mapping every surface — **raised included** — to `--content-canvas` flattens the whole
   Creator into one block.
2. Leaving `--sjs2-color-bg-basic-primary` / `-secondary` to the base theme parks them on
   SurveyJS's **neutral** grey ramp. Invisible in light, but in dark it paints question cards,
   sidebar tabs, the collapsed icon rail and every input a warm grey against the Hub navy.
3. Recessing onto `--background` reads as three depths but is only two: `--background` and
   `--card` are the **same** `#fff` in light, so inputs had no fill against the panel behind
   them (endatix-hub#954). Compare the palette _values_, never the token names.

| `--sjs2-color-utility-*`  | Selector it paints                                | Hub value          |
| :------------------------ | :------------------------------------------------ | :----------------- |
| `tabs`                    | `.svc-top-bar`                                    | `--card`           |
| `toolbox`                 | `.svc-toolbox__panel`                             | `--card`           |
| `property-grid`           | `.svc-side-bar__container`, `.spg-panel__content` | `--card`           |
| `body`                    | `.svc-creator` root                               | `--card`           |
| `sheet`                   | popup / preset sheets                             | `--card`           |
| `surface-designer`        | `.svc-tab-designer`                               | `--content-canvas` |
| `surface-survey`          | `.sd-root-modern::before`                         | `--content-canvas` |
| `surface-json-editor`     | `.svc-json-editor-tab__content-area`              | `--content-canvas` |
| `surface-presets-manager` | `.svc-tab-designer--presets`                      | `--content-canvas` |
| `surface-translations`    | `.svc-translation-tab`                            | `--content-canvas` |

| `--sjs2-color-bg-basic-*` | Paints                                                      | Hub value          |
| :------------------------ | :---------------------------------------------------------- | :----------------- |
| `primary`                 | question cards, sidebar tabs, collapsed icon rail, buttons  | `--card`           |
| `secondary`               | `.sd-formbox` fills, search boxes, unchecked radio/checkbox | `--content-canvas` |

`primary` must stay **off** the canvas tint — tinting it turns the designer's white cards the
same colour as the canvas they float on. Pinned by `__tests__/endatix-themes.test.ts`, which
resolves both through `app/globals.css` and fails if they land on the same colour.

**Non-colour tokens do not survive the resolve pass by accident.** `applyEndatixCreatorTheme`
flattens `var()` references to computed colours so Creator's JS `parseColor` maths works. A
browser accepts `color: var(--radius, 0.5rem)` at parse time, drops it at computed-value time and
answers with the **inherited** colour — so a length came back as a colour and every corner in the
Creator went square (endatix-hub#954). The probe therefore inherits a sentinel colour; anything
computing to it is left verbatim.

## Survey analytics dashboard (not Creator chrome)

`features/form-analytics/ui/survey-dashboard.tsx` is a **survey-analytics** `Dashboard`, not a
Creator surface — do not add it to the utility table above. It uses `pickSurveyTheme` /
`surveyTokens` in `endatix-themes.ts`.

- Call `dashboard.render(container)` with the default `isRoot: true`. `false` is
  nested-visualizer mode: `clear()` then leaves chrome behind and a remount stacks a second
  toolbar/content/footer.
- Never call `dashboard.applyTheme` from page code. After render, call `applyHubDashboardTheme`.
  Re-apply after the dashboard is recreated (`surveyJson` / `results` change), after palette
  change, and after the sidebar width transition (200ms). Never `stringsSurvey.applyTheme`.
- Hard-coded SurveyJS CSS that tokens cannot reach is overridden next to the widget
  (`survey-dashboard.css`: `.sa-visualizer__footer-title` → `--sjs2-color-fg-basic-primary`).
- Do not drive theme from `ResizeObserver` (`applyTheme` / `refresh` rebuilds charts and loops).

## Dialogs are Hub UI, never SurveyJS popups

Every dialog the Hub opens is a shadcn `Dialog` / `AlertDialog`
(`features/themes/manage-theme-editor/ui/`, `features/forms/ui/editor/custom-question-dialog`).
Do not reintroduce `settings.showDialog`.

A SurveyJS popup is portaled to `document.body`, while survey-core 3.x scopes the `--sjs2-*`
token set to `:where(.sd-theme-root)`. A popup outside that root resolves **no** tokens:
transparent overlay and sheet, no radius/shadow/padding, unstyled buttons.

The theme-save dialog additionally blocks Escape and outside-click, because it is the only place
theme edits can be kept.

## Theme dirty state

One boolean, `isThemeDirty`, owned by `useThemeManagement`:

- set by `themeEditor.onThemePropertyChanged` (never `isModified` — v3 syncs `creator.theme`
  first, so it reads false or throws)
- cleared by `themeEditor.onThemeSelected` (switching themes discards edits) and after a
  successful save

`creator.theme = …` runs on every property change (v3's `syncTheme`) but does not fire
`onThemeSelected`, so it does not clear the flag.

**Importing a theme file is the exception.** v3 routes Import through `themeModel.setTheme`,
which raises only `onThemeSelected`. `useThemeManagement` wraps `themeEditor.importFromFile` and
marks the theme dirty in its callback. Do not add an `onOpenFileChooser` listener for this.
Pinned by `features/themes/manage-theme-editor/__tests__/use-theme-management.test.tsx`.

The header chip surfaces the state (`unsaved changes` / `unsaved json`); **Save** persists the
theme first (so a new theme id is in `creator.theme`) and then the form JSON.

## Update checklist (when the palette changes)

1. Update `:root` and/or `.dark` in `app/globals.css` first.
2. If adjusting page canvas tone, update `--content-canvas` and confirm
   `[data-slot="sidebar-inset"]` still uses it. Sparse admin pages use a foreground panel
   (`bg-card` + border) on the canvas.
3. Update the matching literal in `hubTokenFallbacks` (`endatix-themes.ts`).
4. Creator and survey token maps both live in `endatix-themes.ts`.
5. Light/dark stays on `next-themes`:
   - Creator: `useEndatixCreatorTheme()` / `pickCreatorTheme(resolvedTheme)`
   - Hub-internal survey model: `useEndatixSurveyTheme()` / `pickSurveyTheme(resolvedTheme)`
   - Analytics dashboard: `applyHubDashboardTheme()` after `render(container)`
   - Public share/embed: `applyFormSurveyTheme()` with GetActive JSON; no theme → SurveyJS
     `DefaultLight`. Never apply Hub survey tokens on public pages.
6. Check contrast: primary CTA, muted text on nested surfaces, error/warning chips.

## Visual validation

- Light: form + template editor — toolbox, top bar and property grid **white**, only the design
  canvas tinted, question cards white on it. Submission details: question cards vs page.
  Analytics: axis labels, footer titles and Reset Filter readable.
- Dark: toggle `.dark`; no Hub-foreground-as-background (a `--sjs2-*` var flattened to inherited
  `color`). Analytics footer must not stay `#404040`.
- Dialogs: form Save with a dirty theme, delete theme, "Create custom question" — scrim, rounded
  card with shadow, brand footer buttons, both palettes.
- Fix `globals.css` first; only then change the `--sjs2-*` map.
