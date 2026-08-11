# Matrix Carousel

Presents an existing SurveyJS `matrix` question one statement per screen instead of a grid table — swipeable on touch devices, with Back/Next buttons, a progress indicator, and the same shared scale on every statement. It's a mode of the existing `matrix` type, not a separate question type: any `matrix` JSON becomes a carousel by adding `edxDisplayMode: "carousel"`, and reverts to a normal grid by removing it (or setting it to `"grid"`, the default).

## Properties

All new properties live on the `matrix` type. Everything matrix already had — `rows`, `columns`, `cellType`, `rowOrder`, `eachRowRequired`, `eachRowUnique`, `visibleIf`/`enableIf` on rows and columns, `rowsVisibleIf`/`columnsVisibleIf` — is unchanged and works the same in both display modes.

| Property | Type | Default | Notes |
|---|---|---|---|
| `edxDisplayMode` | `"grid"` \| `"carousel"` | `"grid"` | The only property required to turn a matrix into a carousel. Not the same as SurveyJS's own built-in `displayMode` (`"auto"`/`"table"`/`"list"`) — that property is untouched and keeps its own meaning. |
| `showProgressIndicator` | boolean | `true` | Carousel mode only. |
| `progressIndicatorType` | `"text"` \| `"bar"` | `"text"` | Carousel mode only, and only relevant while `showProgressIndicator` is `true`. |
| `showNavigationButtons` | boolean | `true` | Back/Next buttons — the non-swipe alternative. Carousel mode only. |
| `allowSwipeNavigation` | boolean | `true` | Carousel mode only. |
| `edxRowsSourceEnabled` | boolean | `false` | Sources `rows` from another question's choices instead of the manually-authored list. **Overwrites `rows` when enabled** — not additive. Carousel mode only. |
| `edxRowsSourceQuestion` | string | — | Name of the source question. Only single/multi-select-type questions (checkbox, radiogroup, dropdown, tagbox, ranking, imagepicker, …) are valid sources. Requires `edxRowsSourceEnabled`. |
| `edxRowsSourceSelectionMode` | `"all"` \| `"selectedOnly"` \| `"unselectedOnly"` | `"all"` | Which of the source question's choices become rows. Requires `edxRowsSourceEnabled`. |

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

Set `edxRowsSourceEnabled: true` and `edxRowsSourceQuestion` to a select-type question's name. Rows resync automatically whenever the source question's value or choices change, or whenever the source/selection-mode configuration itself changes. This is deliberately simpler than the platform's carry-forward feature (single source only, no priority ordering, no max-count) — matrix isn't a valid carry-forward target (it isn't a `QuestionSelectBase`), so this uses its own sync path rather than the carry-forward opt-in.
