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

## 8. Survey Theme Sync Guide

`app/globals.css` is the source of truth for brand tokens. Survey Creator and Survey Model themes must derive from these tokens so mixed pages remain visually consistent in light and dark mode.

### Source of Truth Files

- App tokens: `app/globals.css` (`:root` and `.dark`)
- Theme resolution (aligned with `ThemeProvider` / `next-themes`): `lib/themes/use-endatix-themes.ts`, `lib/themes/pick-endatix-theme.ts`
- Creator themes: `lib/themes/endatix-creator-theme.ts` (re-exported from `components/editors/endatix-theme.ts` for backward compatibility)
- Submission survey themes:
  - `lib/themes/endatix-survey-theme-light.ts`
  - `lib/themes/endatix-survey-theme-dark.ts`

### Token Mapping (Core)

| App token (`globals.css`)                              | Survey Creator var (`lib/themes/endatix-creator-theme.ts`)                                                                                                           | Survey Model var (`lib/themes/endatix-survey-theme-*.ts`) |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| `--background` / `--surface-container-lowest`          | `--sjs-layer-1-background-500`, other layer tokens (see `--content-canvas` row)                                                                                      | `--sjs-general-backcolor*`                                |
| `--content-canvas`                                     | `--sjs-special-background`, `--sjs-layer-1-background-400`, `--sjs-layer-2-background-*`, `--sjs-layer-3-background-*`, `--sjs-code-gray-700`, `--sjs-code-gray-500` | -                                                         |
| `--foreground` / `--muted-foreground`                  | `--sjs-layer-*-foreground-*`, `--sjs-special-shadow`                                                                                                                 | `--sjs-general-forecolor*`                                |
| `--primary` / `--primary-dim` / `--primary-foreground` | `--sjs-primary-*`, `--sjs-secondary-*`, `--sjs-code-blue-500`                                                                                                        | `--sjs-primary-*`                                         |
| `--border`                                             | `--sjs-border-*`                                                                                                                                                     | `--sjs-border-*`                                          |
| `--destructive` / `--destructive-foreground`           | `--sjs-semantic-red-*`, `--sjs-code-red-500`                                                                                                                         | `--sjs-special-red*`                                      |
| `--info` / `--info-background` / `--info-border`       | (app-only today; use `--sjs-semantic-blue-*` if a survey callout needs parity)                                                                                        | `--sjs-special-blue*` (informational only)                |
| `--chart-3`                                            | `--sjs-semantic-blue-*`                                                                                                                                              | `--sjs-special-blue*`                                     |

### Update Checklist (When Palette Changes)

1. Update `:root` and/or `.dark` values in `app/globals.css` first.
2. If adjusting page canvas tone, update `--content-canvas` and confirm `[data-slot="sidebar-inset"]` still uses that token. Sparse admin pages (e.g. Settings) should use a foreground panel (`bg-card` + border) on the canvas instead of opting the route out of the canvas.
3. Verify creator variables in `lib/themes/endatix-creator-theme.ts` still map to existing app tokens (no hardcoded old hex leftovers).
4. Verify submission survey variables in `lib/themes/endatix-survey-theme.ts` still map to the same token set.
5. Ensure light/dark resolution stays tied to `next-themes` (same as `ThemeProvider`):
   - Creator: `useEndatixCreatorTheme()` (or `pickCreatorTheme(resolvedTheme)` for non-React code)
   - Survey model: `useEndatixSurveyTheme()` (or `pickSurveyTheme(resolvedTheme)`)
6. Run lint checks and manually verify contrast for:
   - primary CTA text/background
   - muted metadata text on nested surfaces
   - error and warning banners/chips

### Visual Validation Steps

- Light mode:
  - Open form editor and template editor; confirm creator chrome, panels, and buttons match app surfaces.
  - Open submission details; confirm survey question cards blend with page surfaces.
- Dark mode:
  - Toggle app to `.dark`; confirm creator and survey both switch without color jumps.
  - Confirm text contrast on `surface-container-low` and `surface-container-high` remains readable.
- Cross-check:
  - If a value seems off, fix in `globals.css` first, then adjust only the mapping in survey files.
