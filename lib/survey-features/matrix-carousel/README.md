# Matrix Carousel

Presents an existing SurveyJS `matrix` question one statement per screen instead of a grid table — swipeable on touch devices, always paired with Back/Next buttons, a progress indicator, and the same shared scale on every statement. It's a mode of the existing `matrix` type, not a separate question type: any `matrix` JSON becomes a carousel by adding `edxDisplayMode: "carousel"`, and reverts to a normal grid by removing it (or setting it to `"grid"`, the default). Both swipe and Back/Next are always active in carousel mode — neither is configurable. (Swipe can't enforce required-row validation the way Back/Next can — see `navigate-carousel.ts`'s `nextRow()`/`goToRow()` split — but since SurveyJS's matrix type has no per-row required flag either way, there was no scenario left where disabling swipe actually protected anything.)

## Properties

All new properties live on the `matrix` type. Everything matrix already had — `rows`, `columns`, `cellType`, `rowOrder`, `eachRowRequired`, `eachRowUnique`, `visibleIf`/`enableIf` on rows and columns, `rowsVisibleIf`/`columnsVisibleIf` — is unchanged and works the same in both display modes.

| Property | Type | Default | Notes |
|---|---|---|---|
| `edxDisplayMode` | `"grid"` \| `"carousel"` | `"grid"` | The only property required to turn a matrix into a carousel. Not the same as SurveyJS's own built-in `displayMode` (`"auto"`/`"table"`/`"list"`) — that property is untouched and keeps its own meaning. |
| `showProgressIndicator` | boolean | `true` | Carousel mode only. |
| `progressIndicatorType` | `"text"` \| `"bar"` | `"text"` | Carousel mode only, and only relevant while `showProgressIndicator` is `true`. |
| `edxCarryForwardEnabled` | boolean | `false` | Sources `rows` from one or more other questions' choices instead of the manually-authored list. **Overwrites `rows` when enabled** — not additive. Carousel mode only. Same property the platform's carry-forward feature uses on checkbox/radiogroup/dropdown/etc. — see [Sourcing rows from another question](#sourcing-rows-from-another-question). |
| `edxCarryForwardSources` | string[] | — | Names of the source questions. Only single/multi-select-type questions (checkbox, radiogroup, dropdown, tagbox, ranking, imagepicker, …) are valid sources. Requires `edxCarryForwardEnabled`. |
| `edxCarryForwardMode` | `"all"` \| `"selected"` \| `"unselected"` | `"all"` | Which of the source questions' choices become rows. Requires `edxCarryForwardEnabled`. |
| `edxCarryForwardPriorityItems` | string[] | — | Choice values pinned to the front of `rows`, in the order listed. Requires `edxCarryForwardEnabled`. Controls initial row order only — see the note below on `rowOrder: "random"`. |
| `edxCarryForwardMaxChoices` | number | `0` | Caps how many non-priority rows are included. `0` means unlimited; priority rows are always kept in full. Requires `edxCarryForwardEnabled`. |

### Row images

`imageUrl` (type `"file"`) is available on every matrix row (registered on the shared `itemvalue` base, visibleIf-scoped in the property grid to matrix rows only — it doesn't show up for other question types' choices). Shown above the statement text in carousel mode. Not rendered in grid mode.

### Per-row required/skip granularity

`eachRowRequired`/`eachRowUnique` apply to the **whole question**, not individual rows — there's no way to mark only some rows as required. If a row needs to be conditionally required, use `visibleIf` to hide it instead.

## Example

```json
{
  "type": "matrix",
  "name": "satisfaction",
  "title": "How much do you agree with each statement?",
  "edxDisplayMode": "carousel",
  "showProgressIndicator": true,
  "progressIndicatorType": "text",
  "columns": [
    { "value": 1, "text": "Strongly disagree" },
    { "value": 2, "text": "Disagree" },
    { "value": 3, "text": "Neutral" },
    { "value": 4, "text": "Agree" },
    { "value": 5, "text": "Strongly agree" }
  ],
  "rows": [
    { "value": "quality", "text": "The product quality met my expectations" },
    { "value": "value", "text": "The product was worth the price" },
    {
      "value": "support",
      "text": "Support was helpful when I needed it",
      "imageUrl": "https://cdn.example.com/support-icon.png"
    }
  ]
}
```

## Converting an existing grid matrix

Add `"edxDisplayMode": "carousel"` to the JSON (or flip "Presentation" to Carousel in the property grid) — no restructuring of `rows`/`columns` needed either direction. There's no automated Survey Creator "Convert type" action; this is a manual JSON/property-grid edit.

## Sourcing rows from another question

Set `edxCarryForwardEnabled: true` and `edxCarryForwardSources` to one or more select-type questions' names — the same properties, choices-picker UI, and settings (`edxCarryForwardMode`, `edxCarryForwardPriorityItems`, `edxCarryForwardMaxChoices`) the platform's carry-forward feature already exposes on checkbox/radiogroup/dropdown/tagbox/imagepicker/ranking/buttongroup, in the property grid's **Rows** section rather than a separate section. Rows resync automatically whenever a source question's value or choices change, or whenever the source/mode/priority/max-count configuration itself changes.

Matrix isn't a valid carry-forward *target* the platform's own choices-based sync engine can write to (it isn't a `QuestionSelectBase` — it has `rows`, not `choices`), so this doesn't literally opt matrix into `registerCarryForwardForQuestionType`. Instead it reuses the same underlying aggregation logic (multi-source dedup, mode filtering, priority ordering, max-count limiting — `carry-forward/use-cases/compute-carry-forward-items.ts`) and the same dependency-wiring primitives (`carry-forward/infrastructure/carry-forward-dependencies.ts`), writing the result to `rows` instead of `choices`. In practice this means identical settings and behavior to carry-forward everywhere it's the same concept — with one real platform gap: `edxCarryForwardPriorityItems` controls initial row order, but unlike Choices order, `rowOrder: "random"` on a `matrix` question shuffles the entire `rows` array unconditionally (`QuestionMatrixModel.sortVisibleRows()` has no group-aware exception the way choice randomization does) — priority rows do **not** stay pinned to the front if row order is later randomized.
