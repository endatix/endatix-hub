# Hub Design System

How the Hub looks and behaves, written as **reusable decisions**: principles, tokens, the shared
components that encode them, UX patterns, and recipes for recurring page shapes.

**How to use this file.** Read §1 and the §5 component index, then jump to the pattern or recipe
your task matches. Detail that only matters to one surface lives next to its code (§8) — follow
the link when you touch that code, not before.

**How to extend it.** When you settle a new question (§1 "Deciding"), write the answer back as a
_general_ rule in the pattern or recipe it belongs to, in the same change. Do not add a section
per feature; add a reference implementation to an existing recipe instead. Implementation
detail (pixel values, retry counts, vendor quirks) goes in code comments or a README beside the
component.

**This is an evolving document.** Every rule here records the current decision and the reason for
it, not a law. When a real case shows a rule no longer fits, change the rule in the same change
as the code, and keep the reason. Don't work around it locally, and don't leave the old wording
behind. The new rule must still be general and keep §1's principles. Absolute wording ("never",
"only") means "not without changing this file first".

---

## 1. Principles

**North star — "The Digital Curator".** Data is presented as curated editorial content:
calm, spacious, precise. Boundaries come from tonal surfaces and white space, not lines. Built on
**shadcn/ui** + **Tailwind CSS**.

1. **The page serves its reader's task.** A review page optimises for scanning and comparison
   (values aligned in one column, keys visible, exceptions summarised at the top). An action page
   makes the action unmistakable.
2. **One vocabulary per concept, encoded in one component.** Status, file type, table chrome,
   locale, copy affordance — the same idea appears in a table cell, a panel header and a review
   step. Three local copies drift into three shapes, so reach for the §5 component; if none
   exists and the idea recurs, create one and index it.
3. **Tokens, never palette steps.** Everything must work in light and dark from `app/globals.css`.
4. **Tone carries meaning; decoration does not.** Colour is reserved for status. Icons mark
   sections and kinds of things, not individual fields.
5. **Prefer removing over adding.** Most inconsistency is accumulated decoration — an icon on one
   badge, a tooltip on one label. Cutting it is almost always more on-brand than harmonising it.

**Deciding a question this file does not answer** — in this order, then write it back:

1. **Does a sibling page already solve it?** Match it. Cross-page consistency beats a locally
   nicer idea.
2. **Does a token or shared component cover it?** Use it. If a semantic token lacks a Tailwind
   utility, register it (§2) rather than hardcoding a palette step.
3. **What is the page for?** Principle 1.
4. **Can you remove something instead?** Principle 5.

---

## 2. Colour & Surfaces

- **Primary (`#0053db`)** is reserved for high-intent actions and active states. Never spend it on
  read-only information (status, labels). `primary_container` (`#dbe1ff`) for subtle highlights.
- **Canvas (`#f8f9ff`)** — a cool, bright blue-gray.
- **No-Line Rule.** No 1px solid borders for sectioning or between list items. Boundaries come
  from background shifts (sidebar on `surface_container_low` against a `surface` main area).
- **No fixed Tailwind scales** (`bg-blue-50`, `text-blue-950`, `red-*`) on any surface that must
  work in both themes. Use semantic tokens or component variants (`<Alert variant="info">`).

### Semantic tokens (`app/globals.css`)

| Token                                                                              | Usage                                                               |
| :--------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| `--success` / `--success-foreground` / `--success-background` / `--success-border` | Positive completion states                                          |
| `--warning` / `--warning-foreground`                                               | Cautionary states                                                   |
| `--info` / `--info-foreground` / `--info-background` / `--info-border`             | Informational callouts, external-user badges, non-blocking guidance |
| `--destructive` / `--destructive-foreground`                                       | Errors and destructive confirmations                                |

Values live under `:root` and `.dark`. **Every token must also be registered in `@theme inline`**
(`--color-token: var(--token)`) in the same change, or the Tailwind utility silently does not
compile and the class is dropped.

### Surface tiers

Treat the UI as physical layers; depth comes from the tier, not from borders:

| Level           | Token                                                   | Used for                   |
| :-------------- | :------------------------------------------------------ | :------------------------- |
| 0 — Base        | `surface`                                               | Page canvas                |
| 1 — Sectioning  | `surface_container_low` / `surface_container`           | Sidebar, nested row groups |
| 2 — Interaction | `surface_container_lowest` (high contrast) / `_highest` | Cards, inputs              |

A `surface_container_lowest` card on a `surface_container_low` background gives a "soft lift"
that is felt rather than seen. **Nested surface** = a group of rows on `bg-muted/40` or
`bg-surface-container-low` inside a card or panel — the standard way to group dense data.

---

## 3. Typography & Spacing

**Inter**, chosen for precision and legibility at small sizes.

| Level    | Size     | Token         | Usage                                                          |
| :------- | :------- | :------------ | :------------------------------------------------------------- |
| Display  | 3.5rem   | `display-lg`  | Hero metrics and large data visualisations                     |
| Headline | 1.75rem  | `headline-md` | Page titles and primary section headers                        |
| Title    | 1.125rem | `title-md`    | Card headers and modal titles                                  |
| Body     | 0.875rem | `body-md`     | Standard UI text and data values                               |
| Label    | 0.75rem  | `label-md`    | Form labels and metadata (`on_surface_variant`, medium weight) |

Spacing is a tight 0.2rem increment for data density, expanding for editorial breathing room:
**Tight (2)** 0.4rem icon→text · **Standard (4)** 0.9rem inside components · **Editorial (10)**
2.25rem between sections · **Hero (16)** 3.5rem page margins and headers. Pair a bold headline
with regular body and generous vertical padding (`8`–`10`).

---

## 4. Elevation & Depth

- **Tonal layering first** (§2). A raised element never sits inside another raised element to
  express one boundary — no `Card` in an overlay, no `Card` around a table.
- **Ambient shadow** for floating elements (command menu): `shadow-[0_8px_30px_rgb(0,52,94,0.06)]`,
  tinted with `on_surface`. Never `#000` shadows.
- **Ghost border** when containment is required for accessibility: `outline_variant` at 15%
  opacity. Never a 100% opaque border.
- **Glass** for floating chrome (nav bars, dropdowns, modals): `bg-surface/80 backdrop-blur-xl`
  (or `surface_container_lowest` at 80% + `backdrop-blur-md`).

---

## 5. Components

### Component index

Before building a control, check whether the vocabulary already exists here.

| Component                                                                | Owns                                                                                  |
| :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `components/common/status-badge.tsx` — `StatusBadge`, `StatusDot`        | The four-tone on / off / attention / idle pill, and its dot alone for a group label   |
| `components/table/faceted-filter.tsx` — `FacetedFilter`                  | A facet: toolbar pill or form `field`; flat or grouped options (Filters, below)       |
| `components/common/file-kind-icon.tsx` — `FileKindIcon`, `FileKindLabel` | The file-type mark and its icon+label row (File Type Marks, below)                    |
| `components/common/panel-section.tsx` — `PanelSection`                   | A titled concern inside an overlay, on a nested surface (§6 Create / edit overlay)    |
| `components/common/summary-row.tsx` — `SummaryRow`                       | Label-left / value-right rows (§6 Displaying values)                                  |
| `components/common/truncated-id.tsx` — `TruncatedId`                     | A long id shortened to head…tail with a copy affordance                               |
| `components/common/text-link.tsx` — `TextLink`                           | An inline link; `external` for one that leaves the Hub (Links, below)                 |
| `components/timeline` — `Timeline` and its parts                         | Any sequence of steps: history, activity, progress (Timeline, below)                  |
| `components/common/locale-label.tsx` — `LocaleLabel`                     | A survey language as name + short code (`Spanish es`), anywhere                       |
| `components/copy-to-clipboard.tsx` — `CopyToClipboard`                   | The copy affordance, `overlay` and `inline` layouts (below)                           |
| `components/table` — `DataTableSurface` and friends                      | All list-table chrome (List tables, below)                                            |
| `components/ui/responsive-panel.tsx` — `ResponsivePanel`                 | Desktop Sheet / Dialog ↔ mobile Drawer swap; `dismissible` lock (Overlays, below)     |
| `.grid-card-list` (`app/globals.css`)                                    | Peer-card grids without breakpoints (below)                                           |
| `asset-storage/…/get-user-file/ui` — `SubmissionFileDialog`              | A submission file's preview + details dialog (§6 File answers)                        |
| `components/public-status` — `PublicStatusPage`, `PublicStatusReference` | Every status page a non-Hub reader sees: respondents, link and export recipients (§6) |
| `components/error-handling/error-page` — `ErrorPage`                     | Every full-page error a Hub user sees (rules: `AGENTS.md` "Error page chrome")        |
| `features/about` — `ReleaseVersionLink`                                  | A Hub or API version, linked to its tracked GitHub release notes (Links, below)       |

Add a row here in the same change that adds a shared component. Where it lives
(`components/common/`, a graduated `components/<domain>/`, or `lib/<domain>/<slice>/ui/`) is
decided by "Where UI for a shared concept lives" in `project-structure.md`.

### Status vocabulary — `StatusBadge`

**Four tones.** Add a fifth only by changing this table, with a state none of the four can express.

| Tone        | Meaning                                                  | Badge variant | Example labels                       |
| :---------- | :------------------------------------------------------- | :------------ | :----------------------------------- |
| `on`        | Present / active / healthy / accepted                    | `success`     | Configured, Set, On, Enabled, Active |
| `off`       | Absent, inactive or declined — **a legitimate state**    | `secondary`   | Not set, Off, Disabled, Rejected     |
| `attention` | Required and missing, or waiting — the operator must act | `warning`     | Not configured, Expired, Pending     |
| `idle`      | Exists, but nothing has happened yet — nobody to chase   | `info`        | Not started, Viewed                  |

- `destructive` is only for something actively failing, or confirming a destructive action.
  Never for "empty", never for a declined request.
- All tones render as the same **soft-tinted** pill (`bg-success/12 text-success`) with a leading
  `size-1.5 rounded-full bg-current` dot. No solid fills (primary is for actions), no per-state
  icons — differing shapes read as differing _kinds_ of information.
- **One label per concept per page** ("Enabled/Disabled" _or_ "On/Off", everywhere).
- **A lifecycle with many codes is grouped first; the tone follows the group, never the code.**
  Collection status: not yet engaged (`Not started`, `Viewed` — the respondent has answered
  nothing) is `idle`, still collecting (`In progress`, `Expired`) is `attention`, `Complete` is
  `on`, ended without completing (`Screened out`, `Quota full`, `Abandoned`, `Cancelled`) is
  `off` — a legitimate outcome, not a failure. The group, not the code, also decides what else
  applies to the record. Reference: `features/submissions/ui/describe-collection-status.ts`.
- **A group has its own label, never a member's** (`Not engaged`, `Collecting`, `Complete`,
  `Ended`). A group called "In progress" that holds the code "In progress" makes a chip ambiguous:
  the reader cannot tell one code from the whole group. A one-code group may share its code's
  label, because it is shown as that code. The mapping file owns the groups, their order and
  labels (`COLLECTION_STATUS_GROUPS`), so the column, the filter and any prefill agree.
- **A record's lifecycle word must not collide with the form's.** "Closed" and "Open" already
  describe a form (accepting responses or not; a closed survey's public page), so a submission
  group never uses them. Name what happened to the response, not to the form.
- **`idle` is only the first step of a lifecycle** — the record exists and nothing has happened
  to it. It is quieter than `attention` (no one has to act) and must not read as `off` (nothing
  has ended). Never use it for "informational" or "optional"; a fact with no lifecycle has no
  badge tone (§5 Alerts for callouts).
- **An unknown code is never shown raw.** It joins the neutral group and is humanised
  (`panel_hold` → `Panel hold`), so a code added on the server reads like its siblings.
- **One record, several status axes: the lifecycle is "Status", every other axis names itself.**
  A submission's collection state is its Status; what a reviewer did afterwards is "Review"
  (column, detail cell and filter alike). Never two columns or filters both called Status.
- In a value column, either every row is a badge or every row is a literal. Mix only when the row
  kinds differ (a flag vs a URL), and then the literal is monospace.
- A state is a badge **everywhere** it appears — table cell, panel header, review step. Never a
  bare word in one of them. If you write `variant={x ? "default" : "secondary"}`, use `StatusBadge`.
- **Alerts use the same mapping:** `info` for a consequence or a view choice, `warning` for a risk
  the operator is choosing, `success` for a completed write, `destructive` for a failure. Never
  `info` for a security-relevant choice.
- **A batch that finished with some failures is `warning`, not `success`** — title says so
  ("Ready, with failed submissions"), description gives the counts the reader can act on and what
  the failures mean for them. Leave out bookkeeping (batch counts, internal step names).

### File Type Marks — `FileKindIcon`

A status tone answers "how is this doing?"; a file mark answers "what will I get?" — so it may
carry an icon, under the same discipline.

`lib/file-kinds/` is the server-safe catalog (extension, MIME, label, group);
`components/common/file-kind-icon.tsx` renders `FileKindIcon` (glyph) and `FileKindLabel`
(icon+label row for pickers, menu items, table cells).

1. **All or none.** Every option in a list gets a mark, or none do.
2. **Muted and uniform** — `size-4 text-muted-foreground`, owned by the component. Never tint by
   format; colour belongs to status. (A preview tile is the one place it renders larger.)
3. **Never guess.** An unknown kind renders the generic file glyph; resolvers return
   `FileKindKey | undefined`, never a defaulted icon.
4. **Resolve the kind, not the icon.** Feature code maps its vocabulary to a `FileKindKey`
   (`features/export/utils.ts`) and never returns a `LucideIcon`.
5. **Specific source first, coarser fallback** (wire key `csv-shoji` before delivery enum `Csv`).
6. **Catalog stays server-safe.** `lib/file-kinds/index.ts` does not re-export icons; import glyphs
   from `@/components/common/file-kind-icon`.
7. **Same format → same label** on every surface (`FILE_KINDS.xlsx.label` = `Excel (XLSX)`). When a
   `SelectItem`'s children are a `FileKindLabel`, set `textValue` to that label.

### Copy affordance — `CopyToClipboard`

- `overlay` (default) for a normal-width field with spare room; `inline` as a flex sibling of the
  value in table cells, tight rows, and next to any disabled input or textarea.
- Never mix both layouts on one page for the same kind of value.
- Give every value a reader might paste somewhere (URLs, keys, ids) a copy button — and then give
  it to **every** such value on the page. Enum-ish values (`development`, `/api`) get none.

### Links — `TextLink`

A link goes somewhere; a button does something. An inline destination (in prose, a
`SummaryRow` value, a section `aside`) is a `TextLink` — never a hand-styled `<a>` or a `Button`
dressed as text. The reverse holds too: a quiet action inside a panel ("Rebuild reporting data…")
is a `ghost` button, never `variant="link"`.

- **Internal links stay in the tab.** The reader keeps their place with Back (and
  `BackToTableButton` restores list state).
- **External links say they leave:** `TextLink external` opens a new tab
  (`rel="noopener noreferrer"`), adds a trailing `ExternalLink` mark and an `sr-only` "(opens in a
  new tab)". Never hand-roll `target="_blank"`.
- **Name the destination, not the data type** — "Open in Tenants", "PostHog", not "Profile",
  "Details" or "Link". The reader decides whether to click from the text alone.
- **No configuration, no link.** A link to a third-party tool renders only when the server can
  build a working URL; otherwise omit the row — never a disabled link or `—`. Build such URLs on
  the server so project ids and keys stay there.
- **Links to Endatix's own sites are measured in the Hub.** Build the URL in one helper that adds
  `utm_source=endatix_hub`, `utm_medium=<where it was clicked>` and `utm_campaign=<purpose>`
  (`lib/hosting/release-notes-url.ts`), and send a PostHog event on click (`TextLink onClick`).
  The event is the measure: GitHub shows repo owners no UTM data, and `noreferrer` drops the
  referrer. Never link to a third party's site with our UTM tags.
- **Link only to what is known to exist.** An id is not proof: a session id is issued even when
  recording is off, so a replay link built from it opens an empty page. Link to a resource the API
  has returned, or check before linking.

### List tables — `components/table`

Every list of records uses the shared chrome — a set of primitives, so a small static list and a
paged sortable grid look identical:

| Export                                                                                      | Use                                                                     |
| :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- |
| `DataTableSurface`                                                                          | The rounded, softly-lifted container; dims rows during a URL transition |
| `DataTableGrid`                                                                             | Header + body for a TanStack table                                      |
| `DataTableEmpty`                                                                            | The empty state, **outside** the table element                          |
| `dataTableHeaderCellClassName` / `dataTableBodyRowClassName` / `dataTableBodyCellClassName` | Sticky header, zebra fill, cell padding for a hand-rolled `<table>`     |
| `dataTableColumnLabelClassName`                                                             | The uppercase muted column title                                        |
| `DATA_TABLE_SHRINK_WRAP_CLASS_NAME`                                                         | Shrink a column to its content                                          |
| `PagedTableFooter`, `DataTableToolbar`, `DataTableSkeleton`                                 | Pagination, filter bar, loading state                                   |

- **A table is not card content.** Title, description and primary action sit **above**
  `DataTableSurface` as plain `h2` + `p` + `Button`. A `Card` is for controls and prose.
- **Class-name helpers before TanStack.** A handful of static rows needs `DataTableSurface` +
  `Table` + the helpers, not a table instance. Pass `isStatic: true` to the header helper when the
  header never scrolls under sticky positioning.
- **Zebra parity is `index % 2 === 1`**, matching `DataTableGrid`.
- **Column labels name what the column holds for the reader** ("Requester", "Submitted"), not the
  entity field (`Email`, `Created`).
- **A badge column shrink-wraps** (`DATA_TABLE_SHRINK_WRAP_CLASS_NAME` + `whitespace-nowrap`),
  left-aligned with its header. Never a fixed narrow width: the header truncates to `C…` and the
  reader loses the one column they scan first. Icon-only columns stay `w-12`.
- **A per-row control that cannot apply to this row yet is `—`** with an `sr-only` reason ("Not
  reviewable until complete"), not a control that acts on nothing. A value already recorded still
  shows, so nothing a user did disappears. The rule lives in the state mapping, so grid and detail
  agree (`isReviewApplicable`, `features/submissions/ui/table/cell-review-status.tsx`).
- Wiring (URL state, paging, loading skeletons): `project-structure.md` "List pages and tables".

**Filters — `FacetedFilter`.** A facet speaks the vocabulary of the column it filters.
Reference: the submissions Status facet,
`features/submissions/ui/filters/submissions-filter-toolbar.tsx`.

- **A facet over states shows each option as its `StatusBadge`** (`tone` on the option): the
  same pill, tone and label as the column, so the reader matches a row to a choice by sight.
  Plain options keep plain labels; never mix badges and plain labels in one facet.
- **A grouped lifecycle is filtered group first** (`groups`). Each group is one top-level row — a
  tri-state checkbox, the group's `StatusDot` and its label — that selects or clears every code
  in it. Its codes sit indented beneath as badges, so a reader can still narrow to one.
- **Every top-level row has the same anatomy.** A group with one code (Complete) is a top-level
  row like the others — checkbox, dot, label — with no child row. Shown as a lone badge it reads
  as a child that lost its parent.
- **The choice most readers want comes first; the rest follow the lifecycle.** The submissions
  facet leads with Complete (the outcome people filter for), then Not engaged → Collecting →
  Ended. A one-code group is the natural lead: it is the only row with no children, so it sits
  above the nested part of the menu instead of interrupting it.
- **The trigger summarises in the same terms.** A fully selected group is one chip with the
  group's label and tone; otherwise one chip per code, in menu order; more than two chips
  collapse to `n selected`.
- **Search finds a group by its name** as well as its codes ("ended" lists every ended code).
- **The URL and the API carry codes; a group is a shorthand for its codes.** When the API gains a
  category filter, the heading sends the category and the UI does not change. Until then a new
  code in a group must be added to the mapping, or the heading silently stops covering it.
- **A facet that replaces an older one keeps the old links working.** Read the old URL key into
  the new facet (`isComplete=true` → `collectionStatus=complete`) and let the canonical redirect
  rewrite the URL. A bookmark that silently drops its filter shows the reader the wrong rows.
- **The same facet in a form is `variant="field"`, not a second control.** A dialog that filters
  the same records (export) reuses the list's facet and its groups
  (`COLLECTION_STATUS_FACET_GROUPS`), so its menu, badges and search are the list's. As a field
  it sits under its own `Label htmlFor`, spans the width like the fields around it, names its
  whole selection at every width, says what an empty selection means (`emptyLabel`: "All
  statuses" — never a blank field that reads as "none"), and wires its help line through
  `describedBy`. Its clear item says "Clear selection".
- **Flows prefilled from the list take the list's values exactly.** Send the same codes, not a
  coarser mapping onto another control; a flow that cannot express a list filter names it
  (Configure and run, below).

**Empty states — `DataTableEmpty` with `icon` + `title`, description as children:**

```tsx
<DataTableEmpty
  icon={Inbox}
  title="No matching requests"
  onClearFilters={clearFilters}
>
  No request matches “acme”. Search looks at the email and company.
</DataTableEmpty>
```

| The list is empty because…       | Title says                             | Action                                                  |
| :------------------------------- | :------------------------------------- | :------------------------------------------------------ |
| nothing was ever created         | "No … yet"                             | the create button (`action`) if the list has one        |
| the default view is clear        | what is clear ("No requests waiting…") | optional ghost link to the wider view ("Show all …")    |
| a search or a non-default filter | "No matching …" / "No approved …"      | `onClearFilters` — the standard outline "Clear filters" |

- **One icon for both kinds of empty**: the list's entity icon, same as its sidebar item. A search
  or warning glyph reads as a different screen, or an error.
- The description names what was searched or filtered, and which fields search looks at.
- `onClearFilters` resets exactly what the toolbar's Reset resets — build it once in the list
  shell and hand it to both.
- Compact inside the surface (`py-10`, `text-base` title, `EmptyMedia variant="icon"` on
  `bg-muted`); the page-level `Empty` is for whole-page empties such as `/forms`. The one-liner
  `<DataTableEmpty>No rows.</DataTableEmpty>` is only for secondary lists (a settings card, a
  dialog). Reference: `SignupRequestsEmpty` in `features/platform-admin/list-signup-requests/`.

### Card grids — `.grid-card-list`

Any set of peer cards uses `.grid-card-list` (`app/globals.css`), never viewport breakpoints:

```
grid-template-columns: repeat(auto-fill, minmax(min(var(--grid-card-min), 100%), 1fr));
--grid-card-min: 420px;  /* per page: className="grid-card-list [--grid-card-min:360px]" */
```

- **Why:** the collapsible sidebar changes the content width without changing the viewport, so
  `md:`/`lg:` breakpoints measure the wrong thing; `auto-fill` also scales to ultrawide screens
  with one knob instead of a breakpoint ladder.
- `auto-fill`, **not** `auto-fit` — card width must not depend on card count.
- Keep the `min(…, 100%)` guard, or narrow containers overflow.
- Set `--grid-card-min` from the card's narrowest _legible_ content (default 420px; below ~320px
  only for tiny tiles).
- Give cards `h-full` so a row shares a bottom edge.

### Timeline — `components/timeline`

For **one subject, in order**: what already happened to it, or how far a process has got.

- **Use it for** the history or activity of one record or person (a visitor's steps up to a
  signup, an audit trail, a submission's life), and for the progress of a process the reader is
  not driving (provisioning, a job, a delivery).
- **Not for** a set of facts (`SummaryRow`s — order is not the point), a state (`StatusBadge` or
  `Alert`), the reader's place in a form (`PanelSteps` — those are sections still to fill, not
  events that happened), or many records (a table).
- Reach for it when the reader would otherwise scan a log to answer "what came first, and where
  did it end?".

Composition API adapted from ReUI's Timeline (MIT): `Timeline`
(`value`, `orientation`, `size`) → `TimelineItem step={n}` → `TimelineHeader` (`TimelineDate`,
`TimelineTitle`) + `TimelineIndicator` + `TimelineSeparator`, optional `TimelineContent`. Steps up
to `value` are `completed`; the `value` step itself is `active`. Reference:
`features/platform-admin/review-signup-request/ui/signup-visitor-section.tsx`.

- **One active step — the one the record is about** (the request in a visitor's history). Steps
  that led to it read as completed; later steps stay muted. With nothing to single out, the last
  step is active.
- **Oldest first.** A timeline reads as a story that ends at, or passes through, the event the
  reader is looking at.
- **Words, not event names** ("Viewed /signup", "Requested a workspace", not `$pageview`). Map
  known events, humanise the rest. Non-active titles are `font-normal`.
- **Leave out bookkeeping** (tool-internal events such as `$set`, `$web_vitals`) — filter at the
  source, not in the component.
- **Fold repeats** into one step with a muted `×n`; a refresh is not new information.
- **Cap it and link to the source** (~15 steps; the full history is one `TextLink external` away).
- **Semantics:** it is an ordered list — give it an `aria-label`. Titles are `<p>`, not headings,
  because a timeline sits under a section heading; opt into a heading (`asChild`) only when the
  timeline is the page. Dates are `<time dateTime>` in compact format.
- **Colour means progress, not health.** Rings and connectors are `primary` at low opacity until
  completed. Never tint a step by status — say a failure in its title. An indicator icon marks only
  the active step. `size="sm"` inside panels and cards; the default on a page.

### Overlays — `ResponsivePanel`

| Operation                         | Desktop                               | Mobile (`<768px`)        |
| :-------------------------------- | :------------------------------------ | :----------------------- |
| Simple create/edit, 1–2 fields    | `Dialog`                              | `Drawer`                 |
| Complex create/edit, 3+ fields    | Right `Sheet`                         | `Drawer`                 |
| Destructive/critical confirmation | `AlertDialog`                         | `AlertDialog`            |
| Record detail / preview           | Right `Sheet` (or `Dialog` for media) | Full route, or `Drawer`  |
| Short reference (About, versions) | `Dialog`                              | `Drawer`, content height |

1. Use `ResponsivePanel` — `desktopType="simple"` (Dialog) or `"complex"` (Sheet). If a Dialog
   scrolls on desktop, it should be a Sheet.
2. Never `side="bottom"` on a Sheet for mobile — swap to Drawer for Vaul's touch behaviour. Never
   a Drawer on desktop.
3. One scrollable body; the footer stays outside it.
4. Every overlay has an accessible title and description.
5. **Never stack overlays.** A follow-up form (approve, reject) is a step inside the same panel,
   not a Dialog over a Sheet: the record disappears behind a scrim and Escape closes the wrong one.
6. Widen a Dialog with an `sm:` prefix (`sm:max-w-4xl`) — `DialogContent` ships `sm:max-w-lg`
   and an unprefixed class loses to it.
7. Every Hub dialog is shadcn — never a SurveyJS popup (§9).
8. **Lock the panel while its own work runs:** `dismissible={false}` hides the close button and
   ignores Escape, outside clicks and drag-to-close on every mode. Also guard `onOpenChange`, and
   never leave a visible close control that silently does nothing.
9. **A short panel gets a short Drawer.** `ResponsivePanel` sizes the Drawer at `90vh` for forms;
   a few rows of reference pass `drawerContentClassName="h-auto"`.
10. **An overlay opened from a menu is rendered outside the menu.** Keep its `open` state in the
    component that owns the `DropdownMenu`, set it from the item's `onSelect`, and render the
    panel as the menu's sibling. Inside `DropdownMenuContent` it unmounts when the menu closes.
11. **A prefilled form opens on its primary action** (`onOpenAutoFocus` → focus the submit button)
    so Enter runs it with the suggested choices. Fall back to Radix's default when the button is
    absent or disabled.

### Buttons, inputs, chips

- **Buttons:** primary (`primary` / `on_primary`, no shadow) for the one high-intent action;
  secondary (`secondary_container`); ghost (`primary` text) for low emphasis; `destructive` only
  to commit something final. A trailing ellipsis (`Reject…`) means "asks for more before it acts".
  Spinners belong on action buttons, never list rows. A multi-stage action names the stage that
  is running (`Updating submissions…` → `Exporting…`), in a short verb phrase.
- **Inputs:** `surface_container_low` fill; on focus the ghost border goes from 15% to 100%
  `primary`. Labels `label-md` in `on_surface_variant`.
- **Chips / tags:** `rounded-full` to distinguish from buttons; `tertiary_container` for neutral
  data tags. Status tags are `StatusBadge`.

---

## 6. UX Patterns & Page Recipes

Cross-cutting patterns first; recipes after them only add what is specific to their shape.

### Displaying values

- **Align label → value.** Label left, value right-aligned into one scannable column
  (`SummaryRow`, or `dt`/`dd` with `justify-end text-right`). Put label/value rows in a
  `.grid-card-list` — a full-width card puts a two-word label ~1000px from its value.
- **Never truncate a value the reader came to read.** Wrap it (`break-all` for ids/URLs/emails,
  `break-words whitespace-normal` for prose). Truncate only secondary text, with the full value in
  `title`.
- **Unset ≠ empty.** Never configured → `—` with `sr-only` "Not set". Resolved to an empty string →
  `(none)`. An optional field left empty → `—`.
- **Show the source key as text, not in a tooltip.** On configuration pages the env var or setting
  name is a `font-mono text-xs text-on-surface-variant` sub-label under the human label — on
  every row, secrets included. A row of `CircleHelp` icons is noise standing in for design.
- **Help is visible text, not a tooltip.** What a field means goes in one
  `text-xs text-muted-foreground` line under its label or legend, wired with `aria-describedby`.
  Siblings get one each or none (three date ranges → three lines). An `Info` icon on one label is
  decoration.
- **Literal values are monospace.** Nested detail rows indent `pl-4` in `text-xs
text-muted-foreground` — no left-border rule.
- **A value keeps its type everywhere** — a state is a `StatusBadge`, a language a `LocaleLabel`,
  a format a `FileKindLabel`, an id a `TruncatedId`, a product version a `ReleaseVersionLink`.
- **Omit what cannot apply** rather than showing it empty.
- **Dense grids** (read-only matrix answers, `matrixdropdown-answer.tsx`): every column gets a
  minimum width, cells wrap (never a single-line `<Input>`), padding is tightened for the density
  instead of inherited from page tables, header rows are `h-auto`, and the grid scrolls in
  `overflow-x-auto` rather than compressing columns. The PDF equivalent (`PdfMatrixTable`) splits
  width evenly and falls back to stacked rows.
- **Secrets:** never render a secret value, even masked — show presence (`Set` / `Not set`) and say
  so in the section description. But decide what is secret **by where the value already goes**:
  if it is a `ClientEndatixConfig` field it is already in every page's HTML, so show it (reCAPTCHA
  site key, PostHog project key). Hiding a public value costs the operator the one fact they came
  for.

### Controls & consequences

- **A control that cannot take effect is disabled, with one `text-xs text-muted-foreground` line
  saying when it applies.** Not hidden (the panel jumps), not silently inert.
- **Warn only about a reachable risk.** A warning that cannot come true teaches readers to ignore
  warnings.
- **State the consequence once**, as one closing `Alert` — never a warning per field.
- **A consequence of one choice sits under that control**, shown only while the choice is made
  ("Incomplete submissions are updated first, so this export takes a little longer"). It is not
  an `Alert` above the form; that is for the whole step.
- **A section that cannot apply to the current choice keeps its masthead** and says why in its
  description, with no body ("A codebook describes the form's questions, so submission filters
  don't apply"). Disable single controls; drop a whole section's fields.
- **Immutability belongs on the field it constrains** (a `Locked` badge + one line), not in the
  panel description.
- **State lives in the section header.** An on/off section shows a `StatusBadge` in its `aside`;
  the switch sets it, the badge reports it.
- **Prefill what can be suggested, and say where it came from** ("Suggested from the company name").
- **A required free-text reason** has its API limit as `maxLength`, a visible `n / max` counter, and
  a description saying who will read it.
- **Errors land where they belong.** Field validation under the field (`aria-invalid`,
  `aria-describedby`); anything else a `destructive` Alert at the top, with the form keeping its
  values.
- **`Back`, not `Cancel`,** on a step whose record is still open behind it.
- **Show the outcome in place; don't toast and close** when the result is a record the user needs
  to see (a toast disappears; the updated record is the proof).

### Reference information on demand

Facts a reader needs now and then (the Hub and API versions while reporting an issue) are
**one menu item away, not in the navigation.** The sidebar holds places to go. A fact that
costs a request or needs the space of a row of its own does not belong in it. Reference:
`features/about/view-versions/` (account menu → **About Endatix**).

- **One entry point, where people look for it** — the account menu, after `Settings`, signed in
  only. Not a chevron, a footer line or a tooltip on another item.
- **A `simple` `ResponsivePanel`**: title names the thing ("About Endatix"), the description says
  when it is useful ("Include them when you report an issue"), the body is `SummaryRow`s on a
  nested surface.
- **Read on open, never on page load**, and nothing reaches public HTML or the client bundle.
  `next.config.ts` resolves the build and passes it through `env`, which inlines it where
  `process.env.HUB_*` is read: server code only (`lib/hosting/hub-version.ts`), so it lands in
  server chunks. Never assign `process.env` in `next.config.ts`: a standalone server does not
  run that file, so the values are gone in production. `scripts/release-prepare.sh` fails if
  the commit appears in `.next/static`. A complete read is
  kept for the page; a partial one is asked again on the next open. Load as in Loading inside a
  panel: skeleton the values, keep the labels.
- **A value that did not load is `—`** (`sr-only` "Not available"); the rest stays usable, and the
  copied text says `unavailable` for it.
- **A release shows its version; any other build shows branch and commit.** A release
  (`0.8.0`, `0.8.1-canary.3`) is a `ReleaseVersionLink` to its notes. A build that is not a release
  is for developers: `BuildRef` puts the branch and the commit on their own right-aligned lines,
  each after its git mark (`GitBranch`, `GitCommitHorizontal`), as `TruncatedId`s: a long branch
  keeps both ends (`feat/h134-show-p…the-about-dialog`), the commit its first 7 characters
  (`truncate="prefix"`), each with the full value in the tooltip and a copy on hover. Never
  linked: the commit may exist only in a fork. The section's copy gives `main @ <full sha>`.
- **Every Hub user sees branch and commit, not only admins.** They are what a user needs to file
  an issue, including on a fork's deployment, and the commit is no secret. A later field (the git
  remote) can follow the same rule.
- **One home per fact.** The versions are not repeated on Admin → Environment: platform admins
  have the same menu item, and a second copy is a second thing to keep in step.
- **Copy sits on the group it copies.** The rows are a `PanelSection` ("Versions") with one
  `CopyToClipboard` (`inline`) in its `aside` that copies every row as plain text. Not a footer
  button (the footer is for actions that change something) and not an icon floating beside the
  rows (it reads as belonging to neither).

### Loading inside a panel

A `ResponsivePanel` opens on the record the reader already has. Any further read — a third party,
a slow detail — loads **inside the section that shows it**, while the header, the other sections
and the footer stay usable (Sheet and Drawer alike). The list behind never waits on it, and it
never starts per row. Reference: `review-signup-request/ui/signup-visitor-section.tsx`.

- **Start the request after paint** — from an effect or an event, never during render (a server
  action called while rendering updates the router mid-render).
- **Skeleton the section, not the panel.** Keep the `PanelSection` masthead; replace only its body
  with `Skeleton` bars shaped like the rows to come, mark it `aria-busy`, and add an `sr-only` line
  naming the wait ("Loading visitor details"). On a tinted section (`bg-surface-container-low`),
  tint the bars (`bg-foreground/10`): the default `bg-accent` matches that surface, so the pulse
  does not show.
- **One request per opened record.** Cache the result on the client for a few minutes; changing
  step or reopening the same record must not ask again.
- **A check before a form** (is this form ready to export?) skeletons the sections the form will
  fill, mastheads kept, so the panel does not jump from a spinner line to a full form.
- **Quiet states, never an error tone** — the record is fine, and `destructive` belongs to an
  action the reader just took. Source answered with nothing: one muted line. Source did not
  answer: one muted line, plus a link out when a URL is known. Not configured: omit the section.
  A missing fact inside a successful read is `—`.

### Progress inside a panel

Work the reader starts from a panel (prepare, export, retry) has **one voice per place**:

- **Footer button** — spinner + the running stage's verb (Buttons, above).
- **Header description** — one sentence for the step ("Updating incomplete submissions, then
  generating your file…"), `aria-live="polite"` so the change is announced.
- **Body** — no spinner row and no second progress line. Controls stay mounted and **locked**,
  not hidden, so the reader can see what is being run and the panel does not jump. At most one
  status `Alert` (§6 Review and decide rule 2 applies to every panel).
- **Panel** — not dismissible until the work ends (Overlays rule 8).
- **Outcome** — a `success` `Alert` naming what was produced ("CSV file downloaded"), footer
  `Done`. Never a large centred icon plus a sentence that repeats the header.
- **A supporting step never blocks the action it supports** unless it failed outright. If the
  reader lacks the permission for it (refreshing incomplete submissions needs edit rights,
  exporting does not) or it could only partly finish, run the action anyway and say so in the
  outcome: one extra sentence, and `warning` when rows may be missing.

### View choices vs edits

A control that changes how a record is _read_ (label language on a submission) must never be
mistaken for an edit. Reference: `features/submissions/ui/details/label-language.tsx`.

- **One control, on the fact it re-reads** (the metadata card's Language cell, same badge dropdown
  shape as its neighbours so the row does not jump). Never repeated in toolbars or dialogs.
- **The menu says what it changes:** a `DropdownMenuLabel` ("Show labels in") and a
  `DropdownMenuRadioGroup`; mark the stored value (muted `Submitted` suffix).
- **No choice, no control** — a single option renders as plain, named text.
- **Diverging from the record is `info`, never `warning`:** one `Alert variant="info"` strip,
  `role="status"`, naming **both** values, with a one-click way back ("Show in Spanish"). Solid
  `warning` is for facts about the record itself (a test submission).
- **Say concretely what did not change** ("Answers are exactly as submitted in Spanish").
- **Downstream flows follow the view and confirm it** (Export PDF, share link show the choice via
  `LocaleLabel`) — they never offer a second picker.

### Counts, time and audit

- **A count that failed to load shows no number** — never `0`, which claims "empty".
- **The same destination has one title, one icon and one count source** across sidebar, dashboard
  card and page.
- **Record the time with the actor, and show that time.** An event that matters to an audit
  (a decision) stores who and when together, and the UI labels that time for the event
  (`Decided`), once. `modifiedAt` moves for unrelated reasons (a downstream process), so never
  show it as, or next to, the event time. Only records from before the time was stored fall back
  to `Last updated`, labelled as such. Never invent timeline events.
- **Who is a person, not an id.** Resolve actors to names best-effort; when unknown, show `Admin` +
  `TruncatedId` — the id never disappears.
- **Why is shown verbatim, in full** — a quoted block (`bg-surface-container-lowest`,
  `whitespace-pre-wrap`), never truncated.

### Time-limited links

- **Sign when the reader acts, not when the page loads.** Fetch a fresh signed URL on open or
  download (`cache: no-store`); a failed thumbnail re-signs once. Never put a presigned URL in an
  `href` that outlives the view that signed it.
- **Exports outlive tokens.** A Hub-authenticated PDF links to the Hub page that signs on open; a
  share-link export (reader may have no account) keeps the signed URL and says once, muted, that
  links expire shortly.

### Evidence from third-party tools

What another tool recorded about a record's subject (an analytics profile behind a signup, a
payment provider's risk check) is evidence for the reader's decision, not part of the record.
Reference: `features/platform-admin/review-signup-request/ui/signup-visitor-section.tsx`.

- **Its own `PanelSection`**, after the record it describes and before the decision, with the
  tool's `TextLink external` in `aside`, named for the tool.
- **Show what informs the decision, nothing more.** For a person's origin: city and country (with
  time zone), browser, OS and device, referrer or campaign, landing page, first seen, and a
  `Timeline` of recent steps with the record's own event active.
- **Data minimisation.** Never show IP addresses, coordinates, postal codes, raw user agents or
  accuracy fields: every operator would see them, and the decision does not need them. The tool's
  own page has them for the rare case that does.
- **Say which moment a value describes.** First-touch values are labelled as such ("First came
  from", "First page"); unlabelled values are the latest.
- **Never block the record on a third party** — load it as in Loading inside a panel, including
  its quiet states. "No data yet" says when to expect it ("can take a few minutes to arrive").
- **Credentials stay on the server.** Read keys (read-only scopes) never reach the client; the
  client receives finished URLs and ids that already appear in the tool's own URLs.

### Files & media

- **Never crop an upload** — `object-contain` on `bg-muted`, at every size. A crop can hide the
  signature or measurement the reviewer needs.
- **Fixed height, width follows ratio** (clamped), so mixed aspect ratios line up.
- **Wrap, don't scroll sideways** (`flex flex-wrap items-start`) — a horizontal scroller hides
  uploads with no cue; top alignment keeps captions on one line.
- **Caption:** name then MIME type, both truncated (name in `title`) — captions are secondary.
- **Reserve the space while loading** so lazy content does not shift the page.
- **The tile promises, the dialog delivers** — a video tile shows its first frame; playback and
  details happen in the dialog.
- **Print keeps the same promises:** never crop, keep a row of images together (`wrap={false}`),
  keep a title with its first row, embed downscaled copies, single-line captions.

### Recipe: list page

Title + description + primary action above a `DataTableSurface`; toolbar (search, filters, Reset)
in `DataTableToolbar`; titled empty state; `PagedTableFooter`. Reference:
`features/platform-admin/list-tenants/`.

**Review queue** — a list whose items each wait for a decision. Reference:
`features/platform-admin/list-signup-requests/`.

- **Open on the work.** The default filter is the undecided subset; it is the URL default, never a
  parameter and never counted as an active filter. The filter `Select` lists it first, closed
  states after, `All statuses` last.
- **Decision states use the status vocabulary:** waiting `attention`, accepted `on`, declined `off`.
- **One row badge, the most urgent fact** — the decision, unless the process behind it needs the
  reviewer (`Setup failed`, `attention`) or is still running (`Setting up`, `off`). The panel shows
  both.
- **Columns appear when they have data** ("Decided by" and "Decided" hidden on the pending view).
- **One entry point per row, never decision buttons in the row.** `Review` (secondary) when there
  is something to do, `View` (ghost) when closed; both open the Review-and-decide panel.
- **Say only what the page can do** — the description names shipped actions only.

### Recipe: review and decide

Any record awaiting a human decision with an audit trail (signup requests today; access requests,
approvals, refunds tomorrow): **review → decide → outcome** in one `ResponsivePanel`
(`desktopType="complex"`). Reference: `features/platform-admin/review-signup-request/`.

1. **Header** — the record's identity as title; what it is and when it arrived as description.
2. **At most one status strip** — the result of what the reviewer just did, otherwise a standing
   problem. Never two.
3. **`PanelSection`s in the order the record lived:** _Request_ (what was submitted; carries the
   state badge only while undecided) → _Evidence_ (optional; see Evidence from third-party tools)
   → _Decision_ (who, when, why, badge in `aside`) → _Downstream process_ (what the decision
   produced, its badge, a link to where it now lives).
4. **Footer** — only the next step the record allows (`Reject…` outline + `Approve…` default while
   undecided, `Retry …` after a failed process, `Check again` while running, nothing when closed).

- **Decide steps are steps in the same panel**, each with `Back`. The positive commit is
  `default`; a rejection commit is `destructive` because it is final. The form states its
  consequence once (what gets created, who is notified, that the decision is recorded under the
  reviewer's name and cannot be undone). A rejection reason is required and says who reads it.
- **Outcome:** return to the review step showing the updated record, the strip naming what
  happened (`success` / `destructive` if a process failed / `info` while running), and the
  reviewer's own name in the Decision section.
- **A retry is not a new decision** — it records no new decider and no new decision time.
- **The outcome keeps everything the review showed.** Decision actions return the same view model
  as the list loader, so fields the Hub adds (evidence references, links) never vanish when the
  panel shows the result (`project-structure.md` "Signup request slices").
- **One state mapping in one file** (`describe*`, e.g. `signup-request-state.ts`) owns decision →
  tone, process → tone, the row badge and the allowed next step. Grid and panel both read it, so a
  `Setup failed` row always opens on a panel offering `Retry`. Same for submissions:
  `describe-collection-status.ts` owns code → group → tone and whether Review applies.

### Recipe: read-only settings page

"Let an operator review resolved configuration" (Admin → Environment, Auth, Storage, Email).
Reference: `features/platform-admin/view-environment-settings/ui/`.

1. **`PlatformAdminShell`** — eyebrow, headline, one-sentence purpose, `Separator`. Never
   hand-rolled.
2. **Overview strip** — one full-width card answering "is anything wrong?": one runtime fact, one
   rollup badge (`3 of 4 configured`), a plain list of what is missing. Not a KPI dashboard.
3. **Section cards in `.grid-card-list`**, `h-full`. Full width only for content that needs the
   measure (a table, a long form).
4. **Rows on a nested surface** — `dl` with `grid gap-4 rounded-lg bg-muted/40 p-4`, following
   Displaying values.

### Recipe: tenant settings page (review and change)

Pages under `app/(main)/settings/…`. Reference:
`features/export/manage-export-formats/ui/export-formats-settings.tsx`.

1. **Masthead** — `h1.text-3xl.font-semibold.tracking-tight` + muted one-sentence purpose in
   `page.tsx` (a `SettingsPageHeader` waiting to be extracted — do that as its own change).
2. **A `Card` per standalone control**, the control constrained (`max-w-md`).
3. **A list section per collection** (list-page recipe, no `Card` around it).
4. **Create/edit via `ResponsivePanel`, delete via `AlertDialog`.**

A row's identity column carries the name plus inline state badges (`Default`), not a name stacked
over a pill.

### Recipe: create / edit overlay

A settings page asks "what is true?"; an overlay asks "what do you want to be true?" — same
masthead and vocabulary, rows become controls. References:
`features/platform-admin/create-tenant/ui/create-tenant-panel.tsx`,
`features/platform-admin/update-tenant/ui/edit-tenant-sheet.tsx`.

1. **Header** — title + one sentence describing the _current step_.
2. **`PanelSteps`** (multi-step only) — the progress track, first in the body.
3. **`PanelSection` per concern** — icon, title, optional description, optional `aside` for
   status, on `bg-surface-container-low`. One icon per section, none on fields.
4. **Closing `Alert`** when the step has a consequence worth stating.

- **A section owns its own surface.** Shared field groups (`TenantAccessFields`) render their own
  `PanelSection`; call sites never wrap them in a tinted `div`.
- **Multi-step:** show the track, don't narrate "Step 2 of 3". Step labels are nouns matching the
  section titles. The last input step is a **review built from `SummaryRow`**. The terminal step
  is an outcome, not a form: drop the track, lead with a `success` Alert naming what was created,
  and hand over the one artefact the user came for (e.g. the sign-in URL).

**Configure and run** (export today; import, bulk actions tomorrow) — an overlay whose commit is
an operation, not a saved record. Reference:
`features/export/export-submissions/ui/export-dialog.tsx`.

- `ResponsivePanel desktopType="complex"`: format + filters are 3+ fields.
- **A `PanelSection` per question the reader answers** — what file (`File`: format, language),
  which records (`Submissions`: status, test, date ranges). Say where prefills came from in
  the section description ("Prefilled from the filters on the submissions table").
- **Opened from a list, the records section starts on the list's filters and stays honest about
  them.** Reference: `SubmissionsSection` in
  `features/export/export-submissions/ui/export-dialog-filters-form.tsx`.
  - Same values, same controls: the list's Status facet is the dialog's Status field, its dates
    are the same date ranges.
  - A list filter the flow cannot apply is named in the description, by its toolbar name, only
    while it is active: "Its Review and Submitter filters don't apply to exports, so the file can
    include rows the table hides." The list computes the names (`tableOnlyFilters`); they are
    shown, never sent.
  - Once the reader changes a prefilled value, the description says "Changed from the filters on
    the submissions table." and the section `aside` offers **Use table filters** — a ghost
    button with `type="button"` (the dialog is a form) that restores every prefilled value and
    clears their errors. A value the dialog hid itself (Completed at, when no complete status is
    chosen) is not a change the reader made.
  - Opened without a list, the description says what to choose ("Choose which submissions to
    export."), never "Prefilled".
- Opens on the primary action (Overlays rule 9); runs as in Progress inside a panel.
- **Readiness problems replace the form** with one `Alert` and the one step that fixes them
  (`Prepare for export`); maintenance entry points (`Rebuild reporting data…`) are a ghost
  button after the sections.
- **Same noun as the list it came from** — the dialog exports _submissions_, so it never says
  "responses".

### Recipe: file answers

A SurveyJS `file` answer (`features/submissions/ui/answers/file-answer.tsx`) follows Files &
media: `FileViewer size="small"` tiles (`h-40`, `min-w-40`–`max-w-72`), per-kind preview (image;
video first frame + play badge; inline `AudioPlayer`; `FileKindIcon` + label for PDF/other).

- **The whole tile is one button** (`View details for <name>`) opening `SubmissionFileDialog` —
  never the raw storage URL. Audio's player stays interactive, so its caption is the button.
- **The dialog shares the files-list frame** (`FilePreviewDialog` + `SubmissionFileView`):
  `ResponsivePanel desktopType="simple"` widened to `sm:max-w-4xl`, title = file name,
  description = MIME type, preview capped at `max-h-[min(55vh,40rem)]` so **File details**
  (`PanelSection` of `SummaryRow`s: Stored as, Question, Size) and **Download** / **Open in new
  tab** stay in view.
- Files outside submission storage (`data:` values, external URLs) open the plain preview without
  the details panel; so does a failed lookup.
- PDF export: `features/pdf-export/submission/answers/pdf-file-answer.tsx` (image row packing,
  downscaling, link stamping in `attach-pdf-file-links.ts`).

### Recipe: public status pages

Every page a **non-Hub reader** sees instead of what they came for — a respondent on `/share` or
`/embed`, a `/view` / `/edit` link recipient, a failed PDF export. Rendered by `PublicStatusPage`;
inventory and wiring rules: `components/public-status/README.md`.

| Audience                               | Brand                                                    | Component          |
| :------------------------------------- | :------------------------------------------------------- | :----------------- |
| Hub users (signed-in operators)        | Endatix — sheep, primary eyebrow, watermark, diagnostics | `ErrorPage`        |
| Public readers (a customer's audience) | The customer's — Endatix only as "Powered by"            | `PublicStatusPage` |

**Anatomy — one centred column:** icon in a soft-tinted circle (same situation → same glyph on
every route) → one-sentence `h1` title → one or two muted sentences → **at most one** neutral
action, only when the reader can act (Sign in, Try again) → optional `PublicStatusReference`
support id → optional quieter note ("You can close this tab.") → "Powered by Endatix" footer.

- **No Endatix brand in the content** — no mascot, no Hub primary, no Hub navy.
- **No HTTP status, no raw error text.** The sentence is the whole answer; support gets a digest
  or trace id.
- **Three tones by what the reader should feel:** `success` (they are done), `neutral` (it cannot
  work and nothing is broken — closed, denied, expired, not found), `warning` (something failed;
  retry may help). A closed survey is never red.
- **Copy: what happened, then what to do,** using the link's own verb (an `/edit` link says
  _edit_).
- **Host copy is all-or-nothing** — show host `title` + `detail` verbatim only when both exist.
- **Light/dark follows the reader's OS, never the Hub's stored theme; embed is light and opaque.**

---

## 7. Review Checklist

Before finishing UI work, check:

- [ ] Only semantic tokens; any new token is registered in `@theme inline` (§2).
- [ ] No 1px sectioning borders, no `Card` inside an overlay or around a table (§2, §4).
- [ ] Every state is a `StatusBadge` in one of four tones, the same label everywhere; many codes
      are grouped and the group picks the tone; only the lifecycle is called "Status" (§5).
- [ ] File deliverables carry `FileKindLabel` on every surface; unknown kinds get the generic glyph (§5).
- [ ] Peer cards use `.grid-card-list`, not viewport breakpoints (§5).
- [ ] Lists use `components/table`; the empty state has the list icon, a title and a way out (§5).
- [ ] A facet over states shows the column's badges; a grouped lifecycle filters group first,
      with group labels distinct from code labels; old filter URLs still work; a form reuses the
      facet as a labelled `field` (§5 Filters).
- [ ] A flow prefilled from a list takes its values exactly, names list filters it cannot apply,
      and offers "Use table filters" once changed (§6 Configure and run).
- [ ] Overlays follow the table in §5, never stack, and have a title and description.
- [ ] Inline links are `TextLink`; external ones use `external`; nothing links to an unconfigured
      or unconfirmed target; links to our own sites carry UTM tags and a click event (§5).
- [ ] Occasional reference facts sit behind one menu item and load on open, not in the sidebar (§6).
- [ ] Sequences of steps use `Timeline` (one subject, oldest first, one active step, words not
      event names) — never for a bag of facts, a status, or a form's own steps (§5).
- [ ] A further read inside a panel skeletons only its section, starts after paint, and is asked
      once per opened record (§6).
- [ ] Values the reader came for wrap, never truncate; unset vs empty are distinct (§6).
- [ ] Third-party evidence loads on open, never blocks the record, shows no personal data beyond
      the decision's need, and disappears when unconfigured (§6).
- [ ] Disabled controls say why; warnings are reachable; consequences stated once, on the control
      they follow from when there is one (§6).
- [ ] Help text is a visible line under the label, for every sibling or none — no `Info`
      tooltips (§6).
- [ ] Running work: spinner + stage verb on the button, sentence in the header, nothing repeated
      in the body; the panel is not dismissible until it ends (§5 Overlays, §6).
- [ ] A batch with failures reports `warning` with counts, not `success` (§5).
- [ ] No presigned URL outlives the view that signed it (§6).
- [ ] Public pages use `PublicStatusPage` and have their own `error.tsx` (§6).
- [ ] A new shared component has a row in the §5 index; a new decision is written back here as a
      general rule.

---

## 8. Where the details live

| Topic                                                        | Document                                                     |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| SurveyJS / Creator theme sync, token maps, palette checklist | `lib/themes/README.md`                                       |
| Public status inventory, embed/theme wiring, "Powered by"    | `components/public-status/README.md`                         |
| Hub error pages (`ErrorPage`), auth screens (`AuthStatus`)   | `AGENTS.md` "Error page chrome", "Auth pages"                |
| List URL state, paging, loading skeletons                    | `project-structure.md` "List pages and tables"               |
| Where a shared UI component should live                      | `project-structure.md` "Where UI for a shared concept lives" |

---

## 9. SurveyJS Theming (summary)

Full guide: `lib/themes/README.md` — read it before touching `lib/themes/`, Creator CSS, or any
SurveyJS surface.

- `app/globals.css` is the source of truth; Creator and Hub-internal survey themes derive from it
  via `--sjs2-*` **source** tokens only (`lib/themes/endatix-themes.ts`).
- Public `/share` and `/embed` do **not** load `globals.css`; Hub values in theme objects are
  `var(--token, <literal>)` via `hubToken()`, and a test pins the literals to `:root`. When the
  palette changes, change both.
- Hub CSS injected into Creator DOM names `--sjs2-*` tokens only, with no literal fallback.
- Every Hub dialog is a shadcn `Dialog` / `AlertDialog`, never `settings.showDialog`.
