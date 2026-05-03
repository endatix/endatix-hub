# Submission Grid Empty State Plan

## Goal

Improve the submissions page empty state so users see accurate, centered, useful messaging when a form has no submissions or when filters return no matches.

The current table-level `No results.` row is centered across the full table width. When the table has many columns, that center point can sit outside the visible viewport because the table scrolls horizontally.

## Product Decisions

- Keep the submissions toolbar visible for the true empty state, but disable controls that cannot do useful work yet.
- Disable export when there are no submissions. Empty exports are not needed.
- Keep filter controls visible but disabled when there are no submissions at all.
- Keep column view/reset controls visible but disabled when the grid is not rendered.
- Keep the page title and normal page structure.
- Do not show table headers, the table body, horizontal scrollbar, pagination, or row-selection footer for the true empty state.
- Keep `Clear filters` scoped to filters only. It should not reset client-side sorting unless the action text changes to something broader like `Reset view`.

## Empty State Types

### No submissions yet

Use this only when the form has zero submissions in total.

Render a centered page-level empty state below the disabled toolbar:

- Icon: low-contrast `Inbox` icon.
- Title: `No submissions yet`
- Body: `Responses will appear here as soon as someone submits this form.`
- Optional action: `Share form`.

Do not render:

- Table headers.
- Horizontal scrollbar.
- Pagination.
- `0 of 0 row(s) selected`.
- Enabled export.

### No matching submissions

Use this when the form has at least one submission, but the active filters return zero rows.

Render a smaller empty state in place of the table, centered relative to the visible content area rather than the full scrollable table width:

- Title: `No submissions match these filters`
- Body: `Try changing or clearing the current filters.`
- Action: `Clear filters`

Keep enabled:

- Filter toolbar.
- `Clear filters`.

Keep visible as appropriate:

- Export button, because the form has submissions. Product can choose whether it exports all submissions or only currently filtered submissions, but the button should not imply an empty export.
- Column controls may remain visible, though they are less relevant while the table is absent.

## API And Data Contract

Correct copy depends on knowing whether any submissions exist independently from the current filtered result.

Current hub behavior:

- `hub/lib/endatix-api/submissions/submissions.ts` returns `ApiResult<Submission[]>`.
- It hard-codes `pageSize=10000`.
- The submissions page receives only the filtered array, so `data.length === 0` is ambiguous.

### Preferred OSS/API Change

Change the submissions list endpoint and hub client wrapper to support pagination metadata.

Target client shape:

```ts
type ListSubmissionsResult = {
  items: Submission[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
```

Recommended client update:

- Replace or add a submissions client method that returns `ApiResult<ListSubmissionsResult>`.
- Accept request options including `page`, `pageSize`, `isComplete`, `status`, and `isTestSubmission`.
- Stop hard-coding `pageSize=10000` inside the client.

Recommended server/API behavior:

- Filtered list response returns `totalRecords` for the filtered query.
- A lightweight unfiltered request with `pageSize=1` returns whether the form has any submissions by checking `totalRecords > 0`.
- Until the generic paging work from `feature/h540-json-data-lists` is merged, the OSS branch carries throwaway copies of `Paged<T>`, `IPagedData`, and `PagedExtensions`. During rebase/merge, delete the local copies in favor of the upstream versions rather than keeping duplicate paging types.

### Fallback If API Contract Is Deferred

If pagination metadata is not ready, perform a bounded unfiltered existence check only when needed:

- If filtered request returns rows, `hasAnySubmissions = true`.
- If no filters are active and the unfiltered request returns `[]`, `hasAnySubmissions = false`.
- If filters are active and filtered request returns `[]`, issue an unfiltered request with the smallest supported page size.
- Do not request 10k rows just to compute a boolean.

If the current API does not support `pageSize=1` through the hub client, add that option first.

## Error Handling

Do not treat failed submission fetches as empty data.

Current page behavior falls back to `[]` when `submissionsResult.success` is false. That can incorrectly show `No submissions yet`.

Implementation should distinguish:

- successful response with zero submissions
- successful response with zero filtered matches
- failed response

For failed responses, show an error state or existing page-level error handling, not an empty state.

## Implementation Plan

### 1. Update submissions API/client contract

Likely location:

- `hub/lib/endatix-api/submissions/submissions.ts`
- `hub/lib/endatix-api/submissions/types.ts`
- OSS/backend submissions list endpoint, if it does not already return pagination metadata.

Tasks:

- Add a paginated submissions list method or update the existing one.
- Support caller-provided `pageSize`.
- Use `ListSubmissionsResult` or an equivalent typed response.
- Preserve existing callers or update them safely.

### 2. Compute explicit page state on the server page

Likely location:

- `hub/app/(main)/forms/[formId]/submissions/page.tsx`

Compute:

- `hasActiveFilters`
- `filteredSubmissions`
- `filteredTotalCount`
- `hasAnySubmissions`
- `submissionsLoadState`, such as `success` or `error`

Rules:

- Deep-linked filters on a never-submitted form must show `No submissions yet`, not `No matching submissions`.
- Filtered zero state requires proof that `hasAnySubmissions` is true.
- Failed fetch must not become either empty state.

Pass explicit booleans and load state into `SubmissionsWithFilters`.

### 3. Add empty state components

Likely location:

- `hub/features/submissions/ui/submissions-empty-state.tsx`

Components:

- `NoSubmissionsEmptyState`
- `NoMatchingSubmissionsEmptyState`

Responsibilities:

- Render icon, title, body, and optional action.
- Use existing UI primitives and icon patterns.
- Stay quiet and utilitarian, matching the submissions page.
- Avoid card-heavy or marketing-style composition.

### 4. Keep toolbar visible but disable unusable controls

Likely location:

- `hub/app/(main)/forms/[formId]/submissions/ui/submissions-with-filters.tsx`
- `hub/features/submissions/ui/filters/submissions-filter-toolbar.tsx`
- `hub/features/submissions/ui/export/export-submissions-button.tsx`
- table view/reset controls under `hub/features/submissions/ui/table`

Behavior for true empty state:

- Render toolbar row.
- Disable filter controls.
- Disable export.
- Disable column view/reset controls.
- Show `No submissions yet` below the toolbar.
- Do not mount `DataTable`, so pagination and row-selection footer are absent.

Behavior for filtered-zero state:

- Keep filters enabled.
- Keep `Clear filters` enabled.
- Render `No submissions match these filters` instead of the table.
- Do not show pagination or row-selection footer.

### 5. Remove or demote generic `No results.`

Likely location:

- `hub/features/submissions/ui/table/data-table.tsx`

Before changing it, verify `DataTable` call sites.

If `DataTable` is only used by this submissions wrapper:

- Remove the table-body `No results.` row and let the wrapper handle empty states.

If `DataTable` may be used elsewhere:

- Keep a defensive fallback, but avoid product-specific copy.
- Do not rely on it for the submissions page empty states.

### 6. Testing

Add or update focused component tests.

Test cases:

- no submissions and no filters renders `No submissions yet`
- no submissions and deep-linked filters still renders `No submissions yet`
- true empty state renders disabled toolbar controls
- true empty state does not render table, pagination, row-selection footer, or enabled export
- active filters with `hasAnySubmissions = true` and zero filtered rows renders `No submissions match these filters`
- `Clear filters` clears filters only, not sorting
- failed submissions fetch renders an error path, not an empty state
- rows still render normally when data exists

### 7. Visual verification

Manually verify:

- desktop viewport with many form fields
- narrow viewport
- horizontal table overflow
- deep-linked filter URL on a never-submitted form
- filtered-zero state on a form that has submissions
- light and dark themes if supported in this flow

The key acceptance check is that empty-state messaging remains visible and centered in the viewport regardless of column count.

## Acceptance Criteria

- A form with zero submissions shows a friendly page-level `No submissions yet` empty state.
- Filter controls, export, and column controls remain visible but disabled for true empty state.
- Export is disabled when there are no submissions.
- The table, horizontal scrollbar, pagination, and row-selection footer are not shown for true empty state.
- Deep-linked filters on a never-submitted form do not show `No matching submissions`.
- Filtered-zero results are shown only when the app knows the form has submissions.
- Filtered-zero state provides an obvious `Clear filters` action.
- Failed submission fetches do not render as empty states.
- Existing table behavior is unchanged when submissions exist.
