# Design System Specification: Editorial Enterprise

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Curator"

This design system moves beyond the rigid, "boxed-in" feel of traditional enterprise software. It treats data not as a series of rows in a database, but as curated content in a high-end editorial publication. By leveraging the precision of **Shadcn UI** and the utility of **Tailwind CSS**, we create an environment that is "Data-Centric yet Human-Centric."

We break the "template" look through **intentional asymmetry** and **tonal depth**. Rather than relying on heavy borders and harsh dividers, we use white space as a structural element and "surface nesting" to guide the user's eye. The result is a professional, highly functional interface that feels bespoke, premium, and calm.

---

## 2. Colors & Surface Logic

The palette is rooted in a sophisticated range of slates and atmospheric blues, designed to reduce cognitive load while highlighting key actions.

### Tonal Hierarchy

- **Primary (`#0053db`):** Reserved exclusively for high-intent actions and active states. Use `primary_container` (`#dbe1ff`) for subtle highlights.
- **Surface & Background (`#f8f9ff`):** Our canvas is a cool, bright blue-gray. It provides a crisp foundation for content.
- **Informational surfaces:** Use semantic `--info-*` tokens (mapped in `app/globals.css` to Tailwind `info`, `info-background`, `info-border`, `info-foreground`). Prefer `<Alert variant="info">` for guidance banners—not raw `blue-50` / `blue-950` utility classes, which break in dark mode.
- **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined through background color shifts. For example, a sidebar should use `surface_container_low` against a `surface` main content area.

### Semantic status tokens (`app/globals.css`)

| Token | Usage |
| :---- | :---- |
| `--success` / `--success-foreground` | Positive completion states |
| `--warning` / `--warning-foreground` | Cautionary states |
| `--info` / `--info-foreground` / `--info-background` / `--info-border` | Informational callouts, external-user badges, non-blocking guidance |
| `--destructive` / `--destructive-foreground` | Errors and destructive confirmations |

Light and dark values are defined under `:root` and `.dark`. Components must consume these tokens (or Shadcn variants built on them), not fixed Tailwind palette steps such as `blue-200` or `text-blue-950`.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers. Use the `surface-container` tiers to create depth:

1. **Level 0 (Base):** `surface`
2. **Level 1 (Sectioning):** `surface_container_low` or `surface_container`
3. **Level 2 (Cards/Interaction):** `surface_container_highest` or `surface_container_lowest` (for high contrast).

### Glass & Gradient Rule

To achieve a "signature" feel, floating elements (modals, dropdowns) should utilize **Glassmorphism**. Apply `surface_container_lowest` at 80% opacity with a `backdrop-blur-md` effect. For primary CTAs, use a subtle linear gradient from `primary` to `primary_dim` to add "soul" and depth.

---

## 3. Typography

We utilize **Inter** for its mathematical precision and exceptional legibility at small sizes.

| Level        | Size     | Token         | Usage                                       |
| :----------- | :------- | :------------ | :------------------------------------------ |
| **Display**  | 3.5rem   | `display-lg`  | Hero metrics and large data visualizations. |
| **Headline** | 1.75rem  | `headline-md` | Page titles and primary section headers.    |
| **Title**    | 1.125rem | `title-md`    | Card headers and modal titles.              |
| **Body**     | 0.875rem | `body-md`     | Standard UI text and data values.           |
| **Label**    | 0.75rem  | `label-md`    | Form labels and metadata.                   |

**Editorial Contrast:** Pair `headline-lg` (bold) with `body-md` (regular) with significant vertical padding (Spacing `8` or `10`) to create a sense of authority and breathing room.

---

## 4. Elevation & Depth

We eschew traditional "structural lines" in favor of **Tonal Layering**.

- **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "soft lift" that is felt rather than seen.
- **Ambient Shadows:** When a floating effect is required (e.g., a Command Menu), use a custom shadow: `shadow-[0_8px_30px_rgb(0,52,94,0.06)]`. The shadow is tinted with `on_surface` to look natural.
- **The "Ghost Border" Fallback:** If containment is required for accessibility, use a "Ghost Border": `outline_variant` at 15% opacity. Never use 100% opaque borders.
- **Glassmorphism:** Use `bg-surface/80 backdrop-blur-xl` for navigation bars to allow content to bleed through, making the interface feel integrated.

---

## 5. Components

### Cards & Layouts

- **Constraint:** Forbid divider lines within cards.
- **Strategy:** Use `spacing-5` (1.1rem) to separate internal card elements.
- **Style:** Cards use `rounded-lg` (0.5rem) and a background of `surface_container_lowest`.

### Buttons

- **Primary:** Background `primary`, text `on_primary`. High-contrast, no shadow.
- **Secondary:** Background `secondary_container`, text `on_secondary_container`.
- **Tertiary (Ghost):** No background, `primary` text. Use for low-emphasis actions.

### Input Fields

- **Logic:** Inputs should use `surface_container_low` backgrounds. On focus, transition the "Ghost Border" from 15% to 100% opacity using the `primary` color.
- **Labels:** Always use `label-md` in `on_surface_variant`.

### Chips & Tags

- **Data Status:** Use `tertiary_container` for neutral data tags. Use `error_container` for alerts.
- **Shape:** Use `rounded-full` to distinguish tags from interactive buttons.

### Overlay Interaction Rulebook

Use one consistent information architecture for overlays. Prefer the shared `ResponsivePanel` wrapper for create/edit flows so desktop and mobile behavior stay aligned.

- **Dialog:** Blocking, focused interactions only. Use for destructive confirmations, important warnings, and tiny forms with 1-2 fields. If it scrolls on desktop, it does not belong in a Dialog.
- **AlertDialog:** Destructive or critical confirmations such as deleting, removing access, or revoking invitations. Keep this centered on desktop and mobile unless a flow explicitly needs mobile Drawer ergonomics.
- **Sheet:** Desktop-only right slide-over for complex create/edit forms, record details, and dense configuration. Use when preserving page context is useful.
- **Drawer:** Mobile-only bottom overlay for touch ergonomics. Under Tailwind `md` (`<768px`), Dialog and Sheet flows should generally become Drawers.

| Operation Type                    | Desktop       | Mobile (`<768px`)                              |
| :-------------------------------- | :------------ | :--------------------------------------------- |
| Simple create/edit, 1-2 fields    | `Dialog`      | `Drawer`                                       |
| Complex create/edit, 3+ fields    | Right `Sheet` | `Drawer`                                       |
| Destructive/critical confirmation | `AlertDialog` | `AlertDialog`                                  |
| Deep linked detail view           | Right `Sheet` | Full page route, or `Drawer` for short details |

Implementation rules:

1. Use `ResponsivePanel` with `desktopType="simple"` for tiny forms and `desktopType="complex"` for multi-field forms.
2. Do not change a Sheet to `side="bottom"` on mobile; swap to Drawer to get Vaul's native touch behavior.
3. Keep one scrollable body inside the overlay and keep the footer outside that scroll area.
4. Every Dialog, Sheet, and Drawer must include an accessible title and description.
5. Do not use Drawers on desktop; bottom drawers are poor mouse ergonomics on wide screens.

---

## 6. Do's and Don'ts

### Do:

- **Do** use `surface_container` shifts to define the sidebar vs. the main stage.
- **Do** allow for generous white space around "Display" typography.
- **Do** use `primary` sparingly to ensure it maintains its "Action" intent.
- **Do** lean into `inter` medium weights for labels to improve legibility on tinted backgrounds.

### Don't:

- **Don't** use `#000000` for shadows. Always tint with the surface color.
- **Don't** use 1px solid borders to separate list items. Use spacing or tonal shifts.
- **Don't** use standard "Alert Red" for errors. Use the sophisticated `error` (`#9f403d`) and `error_container` (`#fe8983`) tokens.
- **Don't** use fixed Tailwind color scales (`bg-blue-50`, `text-blue-950`, etc.) on surfaces that must work in light and dark mode. Use semantic tokens (`info-background`, `muted-foreground`, `on-surface-variant`) or component variants (`Alert variant="info"`).
- **Don't** overcrowd the card. If data is dense, use a "Nested Surface" to group related points.

---

## 7. Spacing Scale

Our spacing is built on a tight 0.2rem increment for precision data-density, expanding for editorial breathing room.

- **Tight (2):** 0.4rem (Icon to Text)
- **Standard (4):** 0.9rem (Inside components)
- **Editorial (10):** 2.25rem (Between sections)
- **Hero (16):** 3.5rem (Page margins and headers)

---

## 8. Survey Theme Sync Guide (SurveyJS v3)

`app/globals.css` is the source of truth for Hub brand tokens. Survey Creator chrome and Hub-internal Survey Model themes must derive from these tokens.

SurveyJS v3 uses `--sjs2-*` design tokens. Override **source** tokens only (`project-brand-600`, palettes, utility surfaces). Downstream ramps (`bg-brand-*`, `lch(from …)`, `rgba(from …)`) derive automatically. Do not hand-edit `--sjs-layer-*` or other v2 Creator layer names.

Legacy `--sjs-*` (single hyphen) is a compatibility map for **stored tenant theme JSON**. Leave DB themes as-is. New Hub mappings use `--sjs2-*`.

Official guidance:

- [SurveyJS v3 theme adapters](https://surveyjs.io/stay-updated/blog/surveyjs-v3-theme-adapters) — shadcn adapter reads `--primary`, `--background`, `--card`, `--border`, `--ring`, `--radius`, `--spacing`
- Brand styling skill: source tokens + layer DefaultDark for dark; adapters are CSS on `.sjs-theme-overrides` and must not sit next to a competing `applyTheme`

Hub `components.json` style is **new-york**. Do **not** import `survey-core/themes/adapters/shadcn-new-york.css` on public/share/embed until respondent light/dark is decided (endatix-hub#725). Hub designer uses `applyCreatorTheme` overlays, not the adapter stylesheet (adapter toolbox maps to `--background`; Hub chrome uses `--content-canvas`).

### Source of Truth Files

- App tokens: `app/globals.css` (`:root` and `.dark`)
`lib/themes/` is four modules — what the themes are, how each kind is applied, and the React hook:

| Module | Holds |
| :-- | :-- |
| `endatix-themes.ts` | Hub tokens + fallbacks, Creator chrome and survey themes (light/dark), `pickCreatorTheme` / `pickSurveyTheme` |
| `creator-theme.ts` | `applyEndatixCreatorTheme` + the Hub-colour resolve pass |
| `survey-theme.ts` | `registerThemes`, `sanitizeSurveyTheme`, `applyFormSurveyTheme` |
| `use-endatix-themes.ts` | `useEndatixCreatorTheme` / `useEndatixSurveyTheme` (`next-themes`) |

### Token Mapping (source `--sjs2-*`)

| App token (`globals.css`) | Creator + survey source (`endatix-themes.ts`) |
| :-- | :-- |
| `--primary` | `--sjs2-color-project-brand-600` |
| `--primary-foreground` | `--sjs2-color-fg-brand-on-primary` |
| `--foreground` | `--sjs2-color-fg-basic-primary` |
| `--border` | `--sjs2-color-border-basic-secondary` |
| `--radius` | `--sjs2-base-unit-radius` |
| `--ring` | `--sjs2-color-utility-a11y` |
| `--destructive` | `--sjs2-palette-red-600` |
| `--success` | `--sjs2-palette-green-600` |
| `--warning` | `--sjs2-palette-yellow-600` |
| `--info` | `--sjs2-palette-blue-600` |
| `--background` | Survey model: `--sjs2-color-utility-body`, `--sjs2-color-utility-surface-survey` (kills Default teal tint) |
| `--content-canvas` | Creator **editing surfaces only** — see the region table below |
| `--card` | Creator **chrome** (top bar, toolbox, property grid, root). Survey model: `--sjs2-color-utility-sheet` |

Do not pin `--sjs2-color-bg-brand-primary` or other derived tokens unless a shade is explicitly off-brand.

### Public pages stay off `globals.css`

`/share` and `/embed` are their own root layouts (there is no `app/layout.tsx`) and they
deliberately do **not** import `app/globals.css` — that is the whole Tailwind + shadcn
bundle, ~153 KB raw / 24 KB gzipped, for a page that renders one survey. The standalone
not-found stylesheet exists for the same reason.

That means Hub tokens (`--primary`, `--card`, …) do not exist on those pages, so every Hub
value in a theme object is written as `var(--token, <literal>)` via `hubToken()` in
`lib/themes/endatix-themes.ts`. Without the literal the whole `--sjs2-*` declaration is
invalid at computed-value time: surfaces render transparent and the submit button loses its
background. With it, `/share` renders pixel-identically whether or not `globals.css` is
loaded.

The literals mirror `:root` in `app/globals.css`; `lib/themes/__tests__/endatix-themes.test.ts`
parses that file and fails if the two drift. **When the palette changes, change both.**
Never fix a missing-token symptom on a public page by importing `globals.css`.

### Hub CSS injected into the Creator

Anything the Hub injects into Creator DOM (the data-list rows in the Translations
grid, custom question icons) must name **`--sjs2-*` tokens only**, and must not carry a
hard-coded colour fallback.

v3 dropped the `--ctr-*` and single-prefix `--sjs-*` variables entirely — they are not
in survey-creator-core 3.x CSS *or* JS. Rules that still name them fall straight through
to their literal fallback, which is how a white help band appeared across the dark
Translations grid, and how the "Open data list" link kept rendering in SurveyJS teal.
`var(--gone, #fff)` looks defensive and is the opposite.

Match the surface you are sitting on: `.st-table__cell` uses
`--sjs2-color-bg-basic-primary`, header cells use `--sjs2-color-bg-basic-secondary`,
muted captions use `--sjs2-color-fg-basic-primary-muted`, and brand text/icons use
`--sjs2-color-fg-brand-primary` (toolbox icons use `--sjs2-color-bg-brand-primary`).
Guarded by
`lib/survey-features/data-lists/infrastructure/__tests__/creator-translation-styles.test.ts`.

**Known gap:** `lib/questions/drag-categorize/drag-categorize.styles.css` still names v2
variables throughout. It is respondent-facing and light-only today (see #725), so the
literal fallbacks happen to be correct — but it needs the same pass before respondent
dark mode ships.

### Creator surfaces (which token paints what)

Verified against `survey-creator-core` 3.0.2 CSS.

**Three depths, the same rule in both palettes:**

| Depth | Hub token | Light | Dark | Paints |
| :-- | :-- | :-- | :-- | :-- |
| Recessed | `--background` | `#fff` | `#000f21` | input fills, search boxes, unchecked controls |
| Canvas | `--content-canvas` | `#eff4fe` | `#001225` | the design surface behind the survey |
| Raised | `--card` | `#fff` | `#001a34` | chrome panels **and** question cards |

Two failure modes this prevents, both seen on the v3 upgrade:

1. Mapping every surface to `--content-canvas` flattens the whole Creator into one block.
2. Leaving `--sjs2-color-bg-basic-primary` / `-secondary` to the base theme parks them on
   SurveyJS's **neutral** grey ramp. Invisible in light (near-white either way), but in
   dark it paints question cards, the sidebar tabs, the collapsed icon rail and every
   input a warm grey (`#1c1b20` / `#222126`) against the Hub navy.

| `--sjs2-color-utility-*` | Selector it paints | Hub value |
| :-- | :-- | :-- |
| `tabs` | `.svc-top-bar` | `--card` |
| `toolbox` | `.svc-toolbox__panel` | `--card` |
| `property-grid` | `.svc-side-bar__container`, `.spg-panel__content` | `--card` |
| `body` | `.svc-creator` root | `--card` |
| `sheet` | popup / preset sheets | `--card` |
| `surface-designer` | `.svc-tab-designer` | `--content-canvas` |
| `surface-survey` | `.sd-root-modern::before` | `--content-canvas` |
| `surface-json-editor` | `.svc-json-editor-tab__content-area` | `--content-canvas` |
| `surface-presets-manager` | `.svc-tab-designer--presets` | `--content-canvas` |

`--sjs2-color-bg-basic-primary` is deliberately **not** in the Creator overlay: it is the
generic panel surface behind question cards, the simulator and property-grid inputs, so
tinting it turns the designer's white cards the same colour as the canvas. Pinned by
`lib/themes/__tests__/endatix-themes.test.ts`.

### Dialogs are Hub UI, never SurveyJS popups

Every dialog the Hub opens is a shadcn `Dialog` / `AlertDialog` in
`features/forms/ui/editor/`: `theme-save-dialog`, `theme-delete-dialog`,
`custom-question-dialog`. None of them use `settings.showDialog`.

That is a deliberate boundary, not a style preference. A SurveyJS popup is portaled
to `settings.environment.popupMountContainer` (`document.body`), and survey-core 3.x
injects the whole `--sjs2-*` token set into a `<style>` scoped to
`:where(.sd-theme-root)` — a class that only lands on a survey root. A popup outside
that root resolves **no** tokens: transparent overlay, transparent sheet, no
radius/shadow/padding, unstyled footer buttons. Keeping Hub dialogs in the Hub's own
React tree removes that whole class of problem, along with the token bridging, the
`.creator-dialog` stylesheet and the survey-JSON-as-a-form templating that used to
build them.

Do not reintroduce `settings.showDialog` in Hub code. If a dialog is needed, add a
shadcn one next to the others.

The theme-save dialog additionally blocks Escape and outside-click
(`onEscapeKeyDown` / `onInteractOutside`), because it is the only place the theme
edits can be kept and dismissing it silently discarded them.

### Theme dirty state

One boolean, `isThemeDirty`, owned by `useThemeManagement`:

- set by `themeEditor.onThemePropertyChanged` (never `isModified` — v3 syncs `creator.theme`
  first, so it reads false or throws)
- cleared by `themeEditor.onThemeSelected`, because switching themes discards the edits
- cleared after a successful save

`creator.theme = …` runs on *every* property change (v3's `syncTheme`) but does not fire
`onThemeSelected`, so it does not clear the flag.

**Importing a theme file is the exception.** v3 routes Import through
`themeModel.setTheme`, which raises only `onThemeSelected` — indistinguishable from a
chooser switch by payload (neither carries an id). `useThemeManagement` therefore wraps
`themeEditor.importFromFile` and marks the theme dirty in its callback, which runs after
`setTheme`. Editing any property, background image included, already raises
`onThemePropertyChanged` and needs no special handling — do not add an
`onOpenFileChooser` listener for this.

Both rules are pinned by
`features/forms/ui/editor/__tests__/use-theme-management.test.tsx`.

The header chip surfaces the state (`unsaved changes` / `unsaved json`); **Save** persists the
theme first (so a newly created theme id is in `creator.theme`) and then the form JSON.

### Update Checklist (When Palette Changes)

1. Update `:root` and/or `.dark` in `app/globals.css` first.
2. If adjusting page canvas tone, update `--content-canvas` and confirm `[data-slot="sidebar-inset"]` still uses that token. Sparse admin pages should use a foreground panel (`bg-card` + border) on the canvas.
3. Update the matching literal in `hubTokenFallbacks` (`lib/themes/endatix-themes.ts`) — public pages render from those, and a test asserts they match `:root`.
4. Creator and survey token maps both live in `endatix-themes.ts`.
5. Light/dark stays on `next-themes`:
   - Creator: `useEndatixCreatorTheme()` / `pickCreatorTheme(resolvedTheme)`
   - Hub-internal survey model (submissions viewer): `useEndatixSurveyTheme()` / `pickSurveyTheme(resolvedTheme)`
   - Public share/embed: `applyFormSurveyTheme()` with GetActive JSON (no `useEndatixSurveyTheme`)
6. Check contrast: primary CTA, muted text on nested surfaces, error/warning chips.

### Visual Validation Steps

- Light mode: form editor + template editor — toolbox, top bar and property grid must be **white**, with only the design canvas tinted; question cards stay white on the canvas. Submission details: question cards vs page.
- Dark mode: toggle `.dark`; chrome and survey switch without Hub-foreground-as-background (that means a `--sjs2-*` var was flattened to inherited `color`).
- Dialogs: form Save with a dirty theme (Hub shadcn dialog), plus delete theme and "Create custom question" (SurveyJS popups). Each must show a scrim, a rounded card with a shadow, and brand-coloured footer buttons in both palettes.
- Cross-check: fix `globals.css` first; only then change the `--sjs2-*` map.
