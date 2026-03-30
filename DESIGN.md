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
- **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined through background color shifts. For example, a sidebar should use `surface_container_low` against a `surface` main content area.

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

### Additional Component: The Data Sheet

A custom side-panel for deep-dives. Use a `backdrop-blur` overlay and a `surface_container_lowest` panel that slides in from the right. This maintains the "Editorial" feel while allowing for "Data-Centric" density.

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

| App token (`globals.css`)                              | Survey Creator var (`lib/themes/endatix-creator-theme.ts`)   | Survey Model var (`lib/themes/endatix-survey-theme-*.ts`) |
| :----------------------------------------------------- | :------------------------------------------------------------ | :--------------------------------------------- |
| `--background` / `--surface-container-*`               | `--sjs-layer-*-background-*`, `--sjs-special-background`      | `--sjs-general-backcolor*`                     |
| `--foreground` / `--muted-foreground`                  | `--sjs-layer-*-foreground-*`, `--sjs-special-shadow`          | `--sjs-general-forecolor*`                     |
| `--primary` / `--primary-dim` / `--primary-foreground` | `--sjs-primary-*`, `--sjs-secondary-*`, `--sjs-code-blue-500` | `--sjs-primary-*`                              |
| `--border`                                             | `--sjs-border-*`                                              | `--sjs-border-*`                               |
| `--destructive` / `--destructive-foreground`           | `--sjs-semantic-red-*`, `--sjs-code-red-500`                  | `--sjs-special-red*`                           |
| `--chart-3`                                            | `--sjs-semantic-blue-*`                                       | `--sjs-special-blue*`                          |

### Update Checklist (When Palette Changes)

1. Update `:root` and/or `.dark` values in `app/globals.css` first.
2. Verify creator variables in `lib/themes/endatix-creator-theme.ts` still map to existing app tokens (no hardcoded old hex leftovers).
3. Verify submission survey variables in `lib/themes/endatix-survey-theme.ts` still map to the same token set.
4. Ensure light/dark resolution stays tied to `next-themes` (same as `ThemeProvider`):
   - Creator: `useEndatixCreatorTheme()` (or `pickCreatorTheme(resolvedTheme)` for non-React code)
   - Survey model: `useEndatixSurveyTheme()` (or `pickSurveyTheme(resolvedTheme)`)
5. Run lint checks and manually verify contrast for:
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
