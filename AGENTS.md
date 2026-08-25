# Hub Agent Guidance

## Architecture

- Keep Hub features organized as vertical slices under `features/{feature}/{verb-noun}/`.
- Put reusable cross-feature utilities in `lib/`; keep feature-specific business logic inside the owning feature slice.
- Keep `app/` routing-focused. Data mutations should flow through server actions.

## Server Actions

- Server action files must use `"use server"` and return `Result<T>` for operation outcomes (default). Use `ServerActionState` only for FormData / `useActionState` flows that need Zod field-level errors.
- Keep actions thin: authenticate, authorize, call the API or use case, revalidate paths when needed, and return a typed result.
- For Endatix API calls returning `ApiResult<T>`, **always** map with `toResult(...)` from `lib/result/map-api-result-to-result`. Do **not** hand-write `if (!apiResult.success) return Result.error(apiResult.error.message)`. Existing `mapToResult(...)` is equivalent; prefer `toResult(...)` for new/touched code.
- Pass `fallbackMessage`, `logMessage`, and `loggerName` so unexpected failures log via `TelemetryLogger` while expected 403/404/validation stay user-facing without noisy logs.
- When the action result type differs from the API payload (e.g. `Result<void>` after PATCH that returns settings), use `mapData` (e.g. `mapData: () => undefined`). Alternatively keep success local and map only the failure branch with `toResult`.
- Call `revalidatePath` / `revalidateTag` only after `Result.isSuccess(result)`.

## Endatix IDs

- Treat C# `long` IDs from Endatix entities as strings in Hub types and UI state. The API serializes these IDs as strings to avoid JavaScript number precision loss.
- Do not coerce Endatix IDs through `Number(...)`, `parseInt(...)`, or numeric Zod schemas. Keep values as strings from API DTOs through server actions and route/query params.
- Before using an Endatix ID in an API path, server action payload, or security-sensitive lookup, validate it with `validateEndatixId(...)` or `createEndatixIdSchema(...)` from `lib/utils/type-validators.ts` to reduce attack surface.

## Paged list sort and calendar From/To

- Compose list/export request DTOs from `lib/endatix-api/shared` types: `IPagedRequest`, `SortRequest<TFields>`, `DateRangeFilter<"created">` / `AuditDateFilters` (and other stems). Do **not** hand-copy `createdFrom`/`sortDir` fields onto every interface.
- Parse and append via `lib/endatix-api/shared/list-query.ts` (`parseCalendarDateYmd`, `parseSortBy`/`parseSortDir`, `pickDateRangeFilters`, `appendSortParams`, `appendDateRangeFilters`). Feature URL glue stays in `features/`; raw URL state may keep `string` until parse.
- Sort allowlists use property names (`createdAt`); date stems use bare verbs (`"created"` → `createdFrom`/`createdTo`). Keep those namespaces distinct.
- These helpers live in the `lib/endatix-api` package candidate (future `@endatix/api-client`); do not import `@/features` or Next into that folder.

## Server Pages

- Keep `app/` pages mostly orchestration-focused: parse route/search params, start independent data work early, and pass typed data into UI components.
- Prefer streaming slow, independent page sections with `Suspense` boundaries instead of blocking the whole route when partial rendering improves UX.
- For streamed sections, pass stable promises into the section and unwrap them with React `use()` in the receiving component when that keeps the route file thin.
- Use `Promise.all` for independent data dependencies. Await sequentially only when a later call depends on an earlier result.
- For server page calls to the Endatix API, convert `ApiResult<T>` with `toResult(...)` so unexpected operational failures are logged consistently and expected invalid/not-found states can map to page-specific fallback UI.

## Table filter state (client)

- One debounced field (a search box): `useListUrlState()` (`lib/list-page/use-list-url-state.ts`).
- **Two or more** debounced fields on the same table (search + a free-text filter, etc.): `useTableFiltersUrlState(keys)` (`components/table`), not one `useListUrlState` / `useUrlSearchParamsUpdater` call per field. Independent debounced writers race — each rebuilds the next URL from its own `searchParams` snapshot at the moment its timer fires, so whichever settles second can silently drop the other's just-committed change. `useTableFiltersUrlState` commits every field together in a single `updateUrl` call per settle window, so there is exactly one writer.
  - `keys` must be a module-level constant array (e.g. `const FILTER_KEYS = ["search", "hasLocale"] as const;`), not an inline literal — it drives the hook's effect dependencies.
  - Non-debounced filters (`Select`s, checkboxes) still call `updateUrl` directly; they don't need to be listed in `keys`.
  - Reference: `features/data-lists/view-lists/ui/data-lists-page.tsx` (`DATA_LISTS_FILTER_KEYS` in `utils.ts`).

## Detail → list back navigation

When a detail page has a "Back to `<list>`" control that should restore the list's last paging/filters, use `BackToTableButton` (`components/table/back-to-table-button.tsx`) backed by `lib/list-page/table-return-to`. Do **not** carry list state back via a URL param (e.g. `?from=...`) for this — session-scoped storage keeps detail URLs shareable/bookmarkable without embedding list state, and is naturally scoped per browser tab (a middle-click into a new tab correctly falls back to the bare list path instead of inheriting another tab's filters).

- The list page remembers its own current query in a `useEffect` keyed on `searchParams`: `rememberTableReturnTo(tableKey, searchParams.toString(), parse, scopeId?)`.
- The detail page's back control is `<BackToTableButton tableKey="..." fallbackHref="..." parse={...} buildHref={...} />` (or call `getTableReturnHref(...)` directly outside a `Link`).
- `tableKey` scopes the storage key (e.g. `"data-lists"`, `"submissions"`); also pass `scopeId` when the list itself is per-parent-entity (e.g. a formId for `/forms/:formId/submissions`).
- **`parse` is mandatory and is the whitelist.** It must be the same `parse*ListParams` + `serialize*ListSearchParams` round-trip the list page's own URL parsing already uses (paging clamped to positive ints, enums/culture-codes validated, unknown keys dropped). `table-return-to` re-runs `parse` on read too — defense in depth, since a value written by an older app version (or edited via storage/devtools) must be re-validated before ever being reused for navigation — and falls back to `fallbackHref` if `parse` throws or empties the query. Never pass a function that returns raw/unvalidated input, and `buildHref` must build against a hardcoded list path, never treat the stored value itself as a redirect target.
- `parse` / `buildHref` should be stable references (module-level functions, not inline closures) — they're effect dependencies on `BackToTableButton`.
- Reference implementation: `features/data-lists/view-lists/utils.ts` (`parseDataListsReturnQuery`, `dataListsListHrefFromQuery`), wired into `data-lists-page.tsx` (remember) and `data-list-details-page.tsx` (`BackToTableButton`).
- `features/submissions/list-submission-query/submission-list-return-to.ts` + `back-to-submissions-button.tsx` predate this shared abstraction (bespoke sessionStorage, same shape, not yet migrated). Move it onto `table-return-to` / `BackToTableButton` next time that code is touched rather than adding a third bespoke copy.

## Error Handling

- Preserve API-provided user-facing messages, validation errors, and error codes through the shared result mappers.
- Use `parseZodError()` or `ServerActionState.fromZodError()` for Zod validation failures in form actions.
- For any `ApiResult<T>`, prefer `toResult(...)` — it maps to `Result` and owns unexpected-failure telemetry when `logMessage` / `loggerName` are set. Expected validation/auth/403/404/rate-limit are suppressed inside `toResult`; do not duplicate that classification with local filters or ad hoc `TelemetryLogger.error` on `!apiResult.success`.
- Do not log expected user/action failures such as validation, authentication, or authorization failures as application errors.
- Use `TelemetryLogger` for unexpected operational failures outside an `ApiResult` path (e.g. thrown errors, composing-action workflow failures). Only log safe scalar attributes (`errorCode`, ids already shown in UI, status/method/endpoint from `mapApiErrorToTelemetryAttributes`); never log tokens, cookies, raw request bodies, field values, or raw API detail/message strings.
- **Composing actions** (workflows that call other actions returning `Result<T>`): do **not** call `toResult` again. Check `Result.isError`, return/combine user-facing messages, and if you must log the workflow failure use safe scalars only. API telemetry belongs in the leaf that received `ApiResult` via `toResult`.

### Example: API leaf action (`toResult`)

```typescript
const result = toResult(await api.dataLists.delete(dataListId), {
  fallbackMessage: "Failed to delete data list",
  logMessage: "Failed to delete data list",
  loggerName: "data-lists",
});

if (Result.isSuccess(result)) {
  revalidatePath("/(main)/data-lists");
}

return result;
```

### Example: composing action (rollback / multi-step)

```typescript
const imported = await replaceDataListItemsAction(...);
if (Result.isError(imported)) {
  const rollback = await deleteDataListAction(dataListId);
  if (Result.isError(rollback)) {
    TelemetryLogger.error(
      "Failed to roll back data list creation after import failure",
      undefined,
      { dataListId, errorCode: rollback.errorCode },
      "data-lists.createWithImport",
    );
    return Result.error(
      `${imported.message} Cleanup failed (id: ${dataListId}).`,
      imported.details,
      imported.errorCode,
    );
  }
}
return imported;
```

## UI Feedback

- Client UI should display messages returned by `Result<T>` or `ServerActionState`.
- Reserve error toasts for non-recoverable failures and prefer inline validation for recoverable form errors.

## API-sourced catalogs (no Hub label duplication)

When the Endatix API exposes a catalog for options, labels, or descriptions (capabilities, naming conventions, feature flags metadata, etc.), Hub must treat that catalog as the source of truth.

- **Do** fetch the catalog (server page / action) and derive select options from it.
- **Do** keep TypeScript unions or Zod enums only for **wire contract** values (`"Submissions"`, `"Native"`, `"csv"`) — those are protocol discriminators, not UI copy.
- **Do not** hardcode parallel Hub catalogs such as `EXPORT_PROFILE_OPTIONS` / `HARDCODED_*` that duplicate API `label` / `description` / `example` fields.
- **Do not** invent fallback option lists when the catalog is empty; show an error or empty state and fix the data load instead.
- Prefer displaying `capability.label` / `format.label` / naming-convention `label` over concatenating Hub-authored strings.

**Status (reporting export):**

- Done: Hub derives create-form options + type labels from `GET /settings/export-capabilities` and column naming from `GET /settings/export-naming-conventions` (`lib/endatix-api/reporting/export-format-types.ts` projects only; no Hub label catalog).
- Not yet: target group headings still use raw wire enum names; no i18n for API-sourced copy; no codegen of wire unions/labels from .NET into TypeScript.

**Hints / follow-ups:** route remaining Hub-authored strings through i18n (or keep them only on the API); consider CI that generates TS wire unions (and optional label maps) from Reporting contracts/capabilities so Hub and .NET stay aligned. When a stronger pattern ships, update this section so agents keep following it.

## Analytics

- In client components, use `useTrackEvent()` from `features/analytics/posthog/client` and track success transitions from effects or event handlers. Guard effects with refs when a state transition should emit once.
- In server actions or server-only code, import tracking helpers from `features/analytics/posthog/server`.
- Do not include tokens, emails, raw form values, or other PII in analytics properties. Prefer safe booleans, ids that are already public in the UI, feature names, and action names.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
