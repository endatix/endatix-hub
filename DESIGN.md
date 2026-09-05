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

| Token                                                                              | Usage                                                               |
| :--------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `--success` / `--success-foreground` / `--success-background` / `--success-border` | Positive completion states                                          |
| `--warning` / `--warning-foreground`                                               | Cautionary states                                                   |
| `--info` / `--info-foreground` / `--info-background` / `--info-border`             | Informational callouts, external-user badges, non-blocking guidance |
| `--destructive` / `--destructive-foreground`                                       | Errors and destructive confirmations                                |

Light and dark values are defined under `:root` and `.dark`, and every one of them is registered in the `@theme inline` block so it exists as a Tailwind utility (`bg-success`, `text-warning`, `border-info-border`, …). If you add a `--token` to `:root`/`.dark`, you must also add `--color-token: var(--token)` to `@theme inline` in the same change — otherwise the utility silently does not compile and the class is dropped.

Components must consume these tokens (or Shadcn variants built on them), not fixed Tailwind palette steps such as `blue-200` or `text-blue-950`.

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

### The shared component index

Before building a control, check whether the vocabulary already exists. Every
entry below is deliberately shared rather than per-feature: the same idea shows
up in a table cell, a panel header and a review step, and three local copies
drift into three shapes.

| Component                                                                | Owns                                                              |
| :----------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `components/common/status-badge.tsx` — `StatusBadge`                     | The three-tone on / off / attention pill (below)                  |
| `components/common/file-kind-icon.tsx` — `FileKindIcon`, `FileKindLabel` | The file-type mark and its icon+label row (below)                 |
| `components/common/panel-section.tsx` — `PanelSection`                   | A titled concern inside an overlay, on a nested surface (§6)      |
| `components/common/summary-row.tsx` — `SummaryRow`                       | Label-left / value-right review rows (§6)                         |
| `components/common/truncated-id.tsx` — `TruncatedId`                     | A long id shortened to head…tail with a copy affordance           |
| `components/table` — `DataTableSurface` and friends                      | All list-table chrome (below)                                     |
| `components/ui/responsive-panel.tsx` — `ResponsivePanel`                 | Desktop Sheet / Dialog ↔ mobile Drawer swap (§5 Overlay rulebook) |
| `.grid-card-list` (`app/globals.css`)                                    | Peer-card grids without breakpoints (below)                       |

When you add a component to this list, add its row here in the same change.
Where a new shared component belongs — `components/common/`, a graduated
`components/<domain>/`, or a domain-local `lib/<domain>/<slice>/ui/` — is decided
by "Where UI for a shared concept lives" in `project-structure.md`.

### Cards & Layouts

- **Constraint:** Forbid divider lines within cards.
- **Strategy:** Use `spacing-5` (1.1rem) to separate internal card elements.
- **Style:** Cards use `rounded-lg` (0.5rem) and a background of `surface_container_lowest`.

### Card Grids — `.grid-card-list`

Any page laying out a set of peer cards uses the `.grid-card-list` component
class (`app/globals.css`), never hand-rolled viewport breakpoints:

```
grid-template-columns: repeat(auto-fill, minmax(min(var(--grid-card-min), 100%), 1fr));
--grid-card-min: 420px;  /* override per page: className="grid-card-list [--grid-card-min:360px]" */
```

**Why intrinsic sizing, not `md:grid-cols-2 xl:grid-cols-3`:**

1. **The sidebar makes viewport breakpoints lie.** Our content area is a
   collapsible-sidebar inset. At one fixed viewport width the content region has
   two very different widths depending on sidebar state, so a `lg:` breakpoint
   fires on a measurement that is not the one the cards live in. `auto-fill`
   derives the column count from the container, so collapsing the sidebar
   naturally gains a column instead of leaving a half-empty row.
2. **Large screens are free.** A 2-column cap wastes an ultrawide monitor and
   forces scrolling for content that would fit on one screen. `auto-fill` scales
   to 3, 4, 5 columns with no extra breakpoints to maintain.
3. **One knob, not a breakpoint ladder.** The design decision becomes "how
   narrow may this card get before it stops being readable?" — a single number
   per page — rather than four coupled column counts.

**Rules:**

- Use `auto-fill`, **not** `auto-fit`. `auto-fit` collapses empty tracks, so two
  cards on a wide screen stretch to half the page each and look nothing like the
  same two cards when a third is added. Card width must not depend on card count.
- Always keep the `min(…, 100%)` guard. A bare `minmax(420px, 1fr)` overflows
  horizontally on any container narrower than the minimum.
- Set `--grid-card-min` from the card's **narrowest legible content**, not from
  taste. A card holding a label and a right-aligned URL needs more room than one
  holding a title and a chip. Default 420px; go below ~320px only for genuinely
  tiny tiles.
- Give cards `h-full` when their heights vary, so each row's cards share a
  bottom edge. The cost is whitespace inside short cards; ragged bottoms read as
  a bug, stretched cards read as a grid.

### List Tables — `components/table`

Every list of records — tenants, forms, submissions, data lists, export formats
— uses the shared table chrome. It is a set of primitives, not one component, so
a small static list and a paged sortable grid still look identical:

| Export                                                                                      | Use                                                                          |
| :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------- |
| `DataTableSurface`                                                                          | The rounded, softly-lifted container. Also dims rows during a URL transition |
| `DataTableGrid`                                                                             | Header + body for a TanStack table                                           |
| `DataTableEmpty`                                                                            | The empty state, **outside** the table element                               |
| `dataTableHeaderCellClassName` / `dataTableBodyRowClassName` / `dataTableBodyCellClassName` | Sticky header, zebra fill and cell padding for a hand-rolled `<table>`       |
| `dataTableColumnLabelClassName`                                                             | The uppercase muted column title                                             |
| `DATA_TABLE_SHRINK_WRAP_CLASS_NAME`                                                         | Shrink a column to its content                                               |
| `PagedTableFooter`, `DataTableToolbar`, `DataTableSkeleton`                                 | Pagination, filter bar, loading state                                        |

**Rules:**

- **A table is not card content.** `DataTableSurface` is already a raised
  surface with its own radius and shadow; wrapping it in a `Card` stacks two
  elevations to express one boundary, exactly as §6 forbids for panels. The
  section title, description and primary action sit **above** the surface as
  plain `h2` + `p` + `Button`, the way the tenants and data-lists pages do it.
  A `Card` is for controls and prose; a `DataTableSurface` is for rows.
- **Reach for the class-name helpers before reaching for TanStack.** A fixed
  list of a handful of rows with no sorting, filtering or paging does not need a
  table instance. Compose `DataTableSurface` + `Table` + the chrome helpers and
  you get the same pixels for a fraction of the machinery. Add TanStack when you
  actually need its behavior.
- **Zebra parity is `index % 2 === 1`.** `DataTableGrid` computes `isEvenRow`
  that way; a hand-rolled table that flips the parity will not match the grid on
  the next page over.
- **The empty state is not a full-width `<td>`.** Render `DataTableEmpty`
  instead of the table, so the empty message is not framed by a header row
  describing columns that have no data.
- Pass `isStatic: true` to `dataTableHeaderCellClassName` for a header that
  never scrolls under sticky positioning (short lists, skeletons).

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

### Status & State Vocabulary

Status is the single most-copied inconsistency in this codebase: the same idea
("this is on") ends up rendered as a filled primary pill on one screen, a grey
pill with a check icon on the next, and bare text on a third. Screens that show
state must use **one vocabulary**, and it is this one.

**Three tones. There is no fourth.**

| Tone        | Meaning                                                   | Badge variant | Example labels                         |
| :---------- | :-------------------------------------------------------- | :------------ | :------------------------------------- |
| `on`        | Present / active / healthy                                | `success`     | Configured, Set, On, Enabled, Active   |
| `off`       | Absent or inactive, **and that is a legitimate state**    | `secondary`   | Not set, Off, Disabled, Inactive       |
| `attention` | Required, and missing — the operator has something to fix | `warning`     | Not configured, Expired, Action needed |

`destructive` is reserved for a state that is actively failing or for confirming
a destructive action. Never use it for "empty".

**Rules:**

1. **Tone carries meaning, not iconography.** All three tones render as the same
   pill with a leading `size-1.5 rounded-full bg-current` dot. Do not give one
   state a check icon and its sibling no icon — differing shapes read as
   differing _kinds_ of information, which is exactly the inconsistency this
   section exists to kill. The one carve-out is a **file type mark**, which
   describes what a thing _is_ rather than how it is doing — see File Type Marks
   below.
2. **Status badges are soft-tinted** (`bg-success/12 text-success`), never solid
   fills. Solid `default` (primary) is reserved for high-intent actions, per the
   Tonal Hierarchy. A page full of solid blue "Enabled" pills spends the brand's
   action color on read-only information.
3. **One label per state per page.** Pick "Enabled/Disabled" _or_ "On/Off" for a
   given concept and use it everywhere that concept appears.
4. **Never mix a status badge and a literal value in the same visual slot
   inconsistently.** Within a section, either every row's value column holds a
   badge or every row holds a literal — mixing is fine only when the row _kinds_
   genuinely differ (a flag vs. a URL), and then the literal must be monospace
   so the two are obviously different types.
5. Encode the vocabulary in a component — `components/common/status-badge.tsx`
   (`StatusBadge`) — rather than re-deriving badge variants at each call site. If
   you find yourself writing `variant={x ? "default" : "secondary"}` inline, reach
   for the shared component instead. It is deliberately shared rather than
   per-feature: the same `On` / `Off` state appears in a table cell, a panel
   header and a review step, and three copies drift into three shapes.

### File Type Marks — `FileKindIcon`

A status tone answers "how is this doing?"; a file type mark answers "what will
I get?" They are different questions, so the file mark is allowed the icon that
the Status Vocabulary denies to status — but only under the same discipline that
keeps status consistent.

`lib/file-kinds/` is the single catalog of physical file kinds: extension, MIME
type, human label and group (`data`, `document`, `image`, `audio`, `video`,
`archive`). `components/common/file-kind-icon.tsx` turns a kind into the mark:
`FileKindIcon` for the glyph alone, `FileKindLabel` for the icon+label row that
a picker, a menu item or a table cell renders.

**Rules:**

1. **Every option in a list gets a mark, or none of them do.** A menu with a
   file icon on two rows and a generic `Download` on the rest reads as two kinds
   of action. If one export option earns an icon, they all do.
2. **The mark is muted and uniform** — `size-4 text-muted-foreground`, owned by
   the component. Do not tint it by format; the colour channel belongs to
   status, and a green CSV next to a blue JSON invents a meaning neither has.
3. **Never guess a kind.** `FileKindIcon` with no `kind` renders the generic
   file glyph. A format this build does not recognise must not borrow another
   kind's icon — showing a spreadsheet glyph for something that downloads as
   JSON is worse than showing nothing specific. Resolvers therefore return
   `FileKindKey | undefined`, not a defaulted icon.
4. **Resolve the kind, not the icon.** Feature code maps its own vocabulary to a
   `FileKindKey` (`features/export/utils.ts` maps reporting wire keys and the
   delivery enum); the component owns which Lucide glyph, at what size, in what
   tone. A feature that returns a `LucideIcon` has taken a design decision into
   a data layer, and the next feature will take a different one.
5. **Prefer the more specific source, fall back to the coarser one.** An export
   format carries both a wire key (`csv-shoji`) and a delivery enum (`Csv`); the
   wire key wins, and the enum keeps a server-side format newer than this Hub
   build on the right glyph instead of on the fallback.
6. **The catalog stays server-safe.** `lib/file-kinds/index.ts` deliberately
   does **not** re-export the icons: the catalog is imported by route handlers
   and other server code, and the icon map pulls in `lucide-react`. Import
   glyphs from `@/components/common/file-kind-icon`, and the icon map itself
   only from `lib/file-kinds/file-kind-icons`.

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

## 6. Page Patterns

Component rules alone do not produce a consistent product; recurring _page
shapes_ do. When you build a page, find its shape here first.

### Read-only settings & configuration pages

Pages whose job is "let an operator review resolved configuration" — Admin →
Environment, Auth, Storage, Email. Reference implementation:
`features/platform-admin/view-environment-settings/ui/`.

**Anatomy, top to bottom:**

1. **`PlatformAdminShell`** — eyebrow, `headline` title, one-sentence purpose,
   `Separator`. Never hand-roll a page header in this area.
2. **Overview strip** — one full-width card answering _"is anything wrong?"_
   before the reader scrolls. Keep it to a single runtime fact plus one rollup
   badge (e.g. `3 of 4 configured`) and, when relevant, a plain-text list of
   what is missing. This is a summary bar, **not** a stat/KPI dashboard — do not
   grow it into a row of metric tiles on a page nobody visits for metrics.
3. **Section cards in a `.grid-card-list`** (see §5) — give cards `h-full` so a
   row's cards share a height. Multi-column is the default, not full width: a
   full-width card puts a two-word label and a small badge ~1000px apart and
   destroys the label→value association. The grid reflows from one column on a
   phone to four on an ultrawide with no breakpoints of its own. Only span a
   card full width when its content genuinely needs the measure (a table, a
   long-form form) — the overview strip in step 2 is the usual exception.
4. **Rows on a nested surface** — `dl` with `grid gap-4 rounded-lg bg-muted/40 p-4`
   inside `CardContent`. The tonal shift is the boundary; no dividers, per §4.

**Row anatomy** (`ConfigRow`):

- Label left as `dt`, value right as `dd` with `justify-end text-right`, so all
  values in a section align into one scannable column.
- **Show the source key, do not hide it in a tooltip.** On a page for reviewing
  environment configuration, the env var name is the operator's primary key —
  it renders as a `font-mono text-xs text-on-surface-variant` sub-label
  under the human label. A row of `CircleHelp` icons that each reveal one word
  is icon noise standing in for information design.
- Literal values are monospace and **wrap rather than truncate** (`break-all`).
  Never truncate a value the reader came to read.
- **Unset and empty are different answers.** A setting that was never configured
  renders `—` (with an `sr-only` "Not set"); one that resolved to an empty
  string renders `(none)`. Collapsing both to an em dash tells an operator their
  deliberately-empty prefix is missing, and sends them to fix a non-problem.
- **Show the key even for values you are hiding.** Env var sub-labels appear on
  every row, including secret rows — the operator still needs to know which
  variable to set.
- Copy affordance rule: any value an operator might paste into a config file
  gets a `CopyToClipboard layout="inline"`. Enum-ish values (`development`,
  `/api`) do not. Apply the rule consistently within a page — a copy button on
  one URL and not the next reads as a bug.
- Nested detail rows indent with `pl-4` and drop to `text-xs text-muted-foreground`.
  Do **not** use a left border rule to express nesting.

**Secrets:** never render a secret value, even masked. Render presence only,
through the same status vocabulary as everything else (`Set` / `Not set`), and
say so in the section description.

**But first decide what is actually secret — by where the value already goes,
not by how secret it sounds.** A key this app serialises into the HTML of every
public page is not a secret, and hiding it on an admin page costs the operator
the one thing the page is for — confirming _which_ key is live — while
concealing nothing that is not already in the page source. The test is
mechanical: **if the field is a member of `ClientEndatixConfig`, show its
value.** A reCAPTCHA _site_ key and a PostHog _project_ key are public by
design; the SurveyJS Creator licence never reaches a browser and is the genuine
secret. Reaching for `Set` / `Not set` on a public value is security theatre
that degrades the page.

### Create / edit overlays

Panels that _change_ something — the tenant wizard, the edit sheet. Reference
implementation: `features/platform-admin/create-tenant/ui/create-tenant-panel.tsx`
and `features/platform-admin/update-tenant/ui/edit-tenant-sheet.tsx`.

A settings page answers "what is true?"; an overlay asks "what do you want to be
true?" The anatomy is the read-only one turned inside out — the same masthead and
the same status vocabulary, but the rows are controls.

**Anatomy, top to bottom:**

1. **Panel header** — title plus a one-sentence description of the _current step_,
   not of the whole flow.
2. **`PanelSteps`** (multi-step only) — the progress track, first thing in the body.
3. **`PanelSection`s** — one per concern, each with an icon, a title, an optional
   description, and an optional `aside` for status. This is the panel counterpart
   of `ConfigSection`: same masthead, but on a nested surface
   (`bg-surface-container-low`) instead of a `Card`. A panel is already a raised
   surface, so a Card inside one stacks two elevations to express one boundary.
4. **A closing `Alert`** when the step has a consequence worth stating once —
   never one per field.

**Rules:**

- **A section owns its own surface.** Components like `TenantAccessFields` render
  their own `PanelSection`; call sites do not wrap them in a tinted `div`. When the
  wrapper lives at the call site, two panels showing the same section drift apart —
  which is exactly how one of ours ended up with a titled block on one screen and
  an untitled tinted box on the other.
- **Icons mark sections, not fields.** One icon per `PanelSection` masthead. An
  icon on individual labels is the "row of `CircleHelp`" noise §6 already rejects.
- **State gets a badge, in the section header.** A section whose subject is on/off
  puts a `StatusBadge` in `aside`, so the state is legible before the reader parses
  the control. The switch sets it; the badge reports it.
- **A control that cannot take effect is disabled, and says why.** A default-role
  picker under a self-registration toggle that is off changes nothing when used.
  Disable it and add one line of `text-xs text-muted-foreground` saying when it
  applies. An enabled control that silently does nothing is worse than a disabled
  one, and hiding it makes the panel jump.
- **Warn about a risk only when the risk is reachable.** The "this role can sign in
  to Hub" warning is suppressed while self-registration is off, because no account
  can be granted that role. A warning that cannot come true teaches the reader to
  ignore warnings.
- **Immutability is a property of the field, not a footnote in the header.** Put it
  on the section it constrains — a `Locked` badge plus one line of explanation —
  rather than in the panel description where it is read once and forgotten.
- **Alert tone follows the Status Vocabulary.** `info` for a consequence,
  `warning` for a risk the operator is choosing, `success` for a completed write,
  `destructive` for a failure. Do not use `info` for a security-relevant choice.

**Multi-step flows (`PanelSteps`):**

- Show the track, do not narrate it. "Step 2 of 3 — Access" inside the description
  tells the reader where they are only after they read the prose, and never tells
  them what is ahead or what they already settled.
- Label steps with nouns (`Identity`, `Access`, `Confirm`), and keep the labels
  identical to the section titles they lead to.
- **The last step is a review, and it is built from `SummaryRow`.** Label left,
  value hard right, values aligned into one column — the `ConfigRow` anatomy from
  §6. Every value keeps the type it has elsewhere: a state renders as the same
  `StatusBadge` the list uses, not as the bare word `Off`.
- An unset optional value renders `—` with an `sr-only` "Not set", per §6.
- Omit a row that cannot apply rather than showing it as empty — a default role is
  not part of the summary when self-registration is off.
- **The terminal step is an outcome, not a fourth form step.** Drop the track,
  lead with a `success` Alert naming what was created, and give the reader the one
  artefact they came for (here, the sign-in URL).

### Tenant settings pages

Pages under `app/(main)/settings/…` where an operator both reviews _and_
changes tenant configuration. Reference implementation:
`features/export/manage-export-formats/ui/export-formats-settings.tsx`.

**Anatomy, top to bottom:**

1. **Page masthead** — `h1.text-3xl.font-semibold.tracking-tight` plus a muted
   one-sentence purpose, in the route's `page.tsx`. Every settings page repeats
   this shape; match it rather than inventing a heading scale. (It is a
   `SettingsPageHeader` waiting to be extracted — do that as its own change, not
   as a side effect of a feature.)
2. **A `Card` per standalone control** — a single setting with a sentence of
   explanation, e.g. the tenant default export format. Constrain the control
   (`max-w-md`); a select stretched across an ultrawide reads as an error.
3. **A list section per collection** — `h2.text-lg` + muted description + the
   primary action on the right, then a `DataTableSurface` beneath. Not inside a
   `Card`; see List Tables in §5.
4. **Create / edit through `ResponsivePanel`**, delete through `AlertDialog`,
   per the Overlay Interaction Rulebook.

**Rules:**

- A row's identity column carries the name plus any state marks (`Default`) as
  a `StatusBadge`, wrapping inline — not a stack of a name over a pill.
- A row that names a deliverable carries its `FileKindLabel`, and so does every
  picker that selects one. The same format must look the same in the settings
  table, in the tenant-default picker and in the export dialog; these three
  drifting apart is how the vocabulary rots.

### Deciding on a new pattern

When this document does not already answer a question, resolve it in this order,
and then **write the answer back into this file** as part of the same change:

1. **Does a sibling page already solve it?** Match it. Cross-page consistency
   beats a locally nicer idea; a novel icon treatment on one admin page is a
   regression even if the page looks better in isolation.
2. **Does a token or shared component cover it?** Use it. If a semantic token
   exists but has no Tailwind utility, register it in `@theme inline` rather
   than hardcoding a palette step.
3. **What is the page for?** Optimize for the reader's actual task. On a review
   page that means scanning and comparison — align values into a column, surface
   the keys, summarize exceptions at the top. On an action page it means making
   the action unmistakable.
4. **Prefer removing over adding.** Most inconsistency here is accumulated
   decoration: an icon added to one badge, a tooltip added to one label. Cutting
   the extra is almost always more on-brand than harmonizing it.

---

## 7. Do's and Don'ts

### Do:

- **Do** use `surface_container` shifts to define the sidebar vs. the main stage.
- **Do** allow for generous white space around "Display" typography.
- **Do** use `primary` sparingly to ensure it maintains its "Action" intent.
- **Do** lean into `inter` medium weights for labels to improve legibility on tinted backgrounds.
- **Do** route every on/off, present/absent, healthy/broken state through the three-tone Status Vocabulary (§5).
- **Do** show the underlying key (env var, setting name) as visible text on configuration pages, not in a tooltip.
- **Do** register a new semantic token in `@theme inline` in the same change that adds it to `:root`/`.dark`.
- **Do** lay peer cards out with `.grid-card-list` so large screens gain columns instead of whitespace.
- **Do** let a shared section component own its own surface, so every panel that uses it looks the same.
- **Do** disable a control that cannot take effect yet, and say in one line when it will.
- **Do** reuse `StatusBadge` for a state wherever it appears — table cell, panel header, review step.
- **Do** build every list of records on `components/table` — the class-name helpers alone when the list is small and static.
- **Do** mark a file deliverable with `FileKindLabel` in every place it appears — picker, menu item, table cell.
- **Do** render the generic file glyph for a kind this build does not know, rather than defaulting to a plausible one.
- **Do** add a row to the shared component index (§5) in the same change that adds a shared component.

### Don't:

- **Don't** use `#000000` for shadows. Always tint with the surface color.
- **Don't** use 1px solid borders to separate list items. Use spacing or tonal shifts.
- **Don't** use standard "Alert Red" for errors. Use the sophisticated `error` (`#9f403d`) and `error_container` (`#fe8983`) tokens.
- **Don't** use fixed Tailwind color scales (`bg-blue-50`, `text-blue-950`, etc.) on surfaces that must work in light and dark mode. Use semantic tokens (`info-background`, `muted-foreground`, `on-surface-variant`) or component variants (`Alert variant="info"`).
- **Don't** overcrowd the card. If data is dense, use a "Nested Surface" to group related points.
- **Don't** render status with a solid `primary` badge. Primary is for actions; status is soft-tinted.
- **Don't** give one state an icon and its sibling none — differing shapes imply differing kinds of information.
- **Don't** stretch label/value rows across the full page width. Put the cards in a `.grid-card-list` so values stay near their labels.
- **Don't** hand-roll card grids with viewport breakpoints (`md:grid-cols-2 xl:grid-cols-3`). The sidebar changes the content width without changing the viewport; use `.grid-card-list`.
- **Don't** truncate a value on a page whose purpose is reading that value. Wrap it.
- **Don't** narrate wizard progress in prose ("Step 2 of 3 …"). Render `PanelSteps`.
- **Don't** nest a `Card` inside an overlay; a panel is already raised. Use `PanelSection` on a nested surface.
- **Don't** show a warning for a risk the current settings make unreachable.
- **Don't** render a state as a bare word in a review step when the same state is a badge everywhere else.
- **Don't** wrap a `DataTableSurface` in a `Card`. The surface is already raised; the section title and action go above it.
- **Don't** colour a file type mark by format. Colour carries status; type is muted and uniform.
- **Don't** default an unknown format to another kind's icon — the mark then lies about what downloads.
- **Don't** return a `LucideIcon` from feature code. Resolve to a `FileKindKey` and let the shared component pick the glyph.
- **Don't** re-export the file-kind icons from `lib/file-kinds/index.ts`; the catalog is imported by server code and must stay free of `lucide-react`.

---

## 8. Spacing Scale

Our spacing is built on a tight 0.2rem increment for precision data-density, expanding for editorial breathing room.

- **Tight (2):** 0.4rem (Icon to Text)
- **Standard (4):** 0.9rem (Inside components)
- **Editorial (10):** 2.25rem (Between sections)
- **Hero (16):** 3.5rem (Page margins and headers)

---

## 9. Survey Theme Sync Guide (SurveyJS v3)

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

| Module                  | Holds                                                                                                         |
| :---------------------- | :------------------------------------------------------------------------------------------------------------ |
| `endatix-themes.ts`     | Hub tokens + fallbacks, Creator chrome and survey themes (light/dark), `pickCreatorTheme` / `pickSurveyTheme` |
| `creator-theme.ts`      | `applyEndatixCreatorTheme` + the Hub-colour resolve pass                                                      |
| `survey-theme.ts`       | `registerThemes`, `sanitizeSurveyTheme`, `applyFormSurveyTheme`, `applyHubDashboardTheme`                     |
| `use-endatix-themes.ts` | `useEndatixCreatorTheme` / `useEndatixSurveyTheme` (`next-themes`)                                            |

### Token Mapping (source `--sjs2-*`)

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
| `--content-canvas`        | Creator **editing surfaces only** — see the region table below                                             |
| `--card`                  | Creator **chrome** (top bar, toolbox, property grid, root). Survey model: `--sjs2-color-utility-sheet`     |

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
in survey-creator-core 3.x CSS _or_ JS. Rules that still name them fall straight through
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

| Depth    | Hub token          | Light     | Dark      | Paints                                        |
| :------- | :----------------- | :-------- | :-------- | :-------------------------------------------- |
| Recessed | `--background`     | `#fff`    | `#000f21` | input fills, search boxes, unchecked controls |
| Canvas   | `--content-canvas` | `#eff4fe` | `#001225` | the design surface behind the survey          |
| Raised   | `--card`           | `#fff`    | `#001a34` | chrome panels **and** question cards          |

Two failure modes this prevents, both seen on the v3 upgrade:

1. Mapping every surface to `--content-canvas` flattens the whole Creator into one block.
2. Leaving `--sjs2-color-bg-basic-primary` / `-secondary` to the base theme parks them on
   SurveyJS's **neutral** grey ramp. Invisible in light (near-white either way), but in
   dark it paints question cards, the sidebar tabs, the collapsed icon rail and every
   input a warm grey (`#1c1b20` / `#222126`) against the Hub navy.

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

`--sjs2-color-bg-basic-primary` is deliberately **not** in the Creator overlay: it is the
generic panel surface behind question cards, the simulator and property-grid inputs, so
tinting it turns the designer's white cards the same colour as the canvas. Pinned by
`lib/themes/__tests__/endatix-themes.test.ts`.

### Survey analytics dashboard (not Creator chrome)

`features/form-analytics/ui/survey-dashboard.tsx` is a **survey-analytics** `Dashboard`
on the Hub analytics page. It is **not** a Creator surface — do not add it to the
`--sjs2-color-utility-*` table above. It uses `pickSurveyTheme` / `surveyTokens` in
`endatix-themes.ts` (chart axis labels, muted toolbar, disabled Reset Filter).

Call `dashboard.render(container)` with the default `isRoot: true`. Do **not** pass
`false`: that is nested-visualizer mode. Chrome is appended without
`sa-visualizer-wrapper`, and `clear()` only removes the wrapper / license banner, so
React remount (or a JSON rebuild) stacks a second toolbar/content/footer.

Do not call `dashboard.applyTheme` from page code. After render, call
`applyHubDashboardTheme` (that helper may call `applyTheme` internally so Chart.js
picks Hub ticks). Same HMR rule as Translations: never `stringsSurvey.applyTheme`.
Re-apply after the dashboard is recreated (`surveyJson` / `results` change), after
palette change, and after the sidebar width transition (200ms).

**Hard-coded SurveyJS CSS** that tokens cannot reach lives next to the widget:

- `.sa-visualizer__footer-title` is `#404040` in survey-analytics — override in
  `survey-dashboard.css` with `--sjs2-color-fg-basic-primary` (Hub `--foreground`).

Do not drive theme from `ResizeObserver` (`applyTheme` / `refresh` rebuilds
charts and loops).

### Dialogs are Hub UI, never SurveyJS popups

Every dialog the Hub opens is a shadcn `Dialog` / `AlertDialog`:
`features/themes/manage-theme-editor/ui/` (`theme-save-dialog`, `theme-delete-dialog`)
and `features/forms/ui/editor/custom-question-dialog`. None of them use `settings.showDialog`.

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

`creator.theme = …` runs on _every_ property change (v3's `syncTheme`) but does not fire
`onThemeSelected`, so it does not clear the flag.

**Importing a theme file is the exception.** v3 routes Import through
`themeModel.setTheme`, which raises only `onThemeSelected` — indistinguishable from a
chooser switch by payload (neither carries an id). `useThemeManagement` therefore wraps
`themeEditor.importFromFile` and marks the theme dirty in its callback, which runs after
`setTheme`. Editing any property, background image included, already raises
`onThemePropertyChanged` and needs no special handling — do not add an
`onOpenFileChooser` listener for this.

Both rules are pinned by
`features/themes/manage-theme-editor/__tests__/use-theme-management.test.tsx`.

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
   - Analytics dashboard: `applyHubDashboardTheme()` after `render(container)` (`isRoot` default) — never call `dashboard.applyTheme` from the page
   - Public share/embed: `applyFormSurveyTheme()` with GetActive JSON; no theme → SurveyJS `DefaultLight` (same as Creator Preview). Do not apply Hub survey tokens on public pages.
6. Check contrast: primary CTA, muted text on nested surfaces, error/warning chips.

### Visual Validation Steps

- Light mode: form editor + template editor — toolbox, top bar and property grid must be **white**, with only the design canvas tinted; question cards stay white on the canvas. Submission details: question cards vs page. Analytics: axis labels, footer titles and Reset Filter readable on the Hub canvas.
- Dark mode: toggle `.dark`; chrome and survey switch without Hub-foreground-as-background (that means a `--sjs2-*` var was flattened to inherited `color`). Analytics footer must not stay `#404040`.
- Dialogs: form Save with a dirty theme, delete theme, and "Create custom question" (all Hub shadcn dialogs, never SurveyJS popups). Each must show a scrim, a rounded card with a shadow, and brand-coloured footer buttons in both palettes.
- Cross-check: fix `globals.css` first; only then change the `--sjs2-*` map.
