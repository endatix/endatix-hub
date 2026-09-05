# Hub Agent Guidance

## Architecture

- Keep Hub features organized as vertical slices under `features/{feature}/{verb-noun}/`.
- Put reusable cross-feature utilities in `lib/`; keep feature-specific business logic inside the owning feature slice.
- Chrome shared by two or more slices of the same feature lives in `features/{feature}/ui/` (e.g. `platform-admin/ui/platform-admin-shell.tsx`, `tenant-access-fields.tsx` used by `create-tenant` and `update-tenant`). Do not park it in one slice and import across siblings, and do not invent a vague umbrella slice to hold it — a slice is one verb-noun action.
- Physical file kinds (`csv`, `xlsx`, `png`, …) live in [`lib/file-kinds/`](lib/file-kinds/) (server-safe catalog: extension, MIME, label, group). Render with `FileKindIcon` / `FileKindLabel` from [`components/common/file-kind-icon.tsx`](components/common/file-kind-icon.tsx). Feature code maps its vocabulary to `FileKindKey` and never returns a Lucide icon. Visual rules: DESIGN.md §5 File Type Marks. Placement: [`project-structure.md`](project-structure.md) “Where UI for a shared concept lives”.
- Keep `app/` routing-focused. Data mutations should flow through server actions.

## SurveyJS domain

Prefer vendor types from `survey-core` / `survey-creator-core`. Where they widen to `string` (Creator `activeTab`), the closed Hub union lives in [`lib/survey-js/`](lib/survey-js/) — built-in ids plus Hub plugin ids. Import it instead of re-spelling those strings in a slice (`FORM_DIAGNOSTICS_PLUGIN_NAME` is `ENDATIX_CREATOR_TAB.diagnostics`).

- Preview's id is `preview`; `test` is a legacy id Creator still emits — normalise with `canonicalizeCreatorTabId`, never compare raw.
- `?tab=` slugs are one map in `creator/tab-url.ts` (`design` → `designer`; Design omits the param).
- To ask whether a Creator can show a tab, read `creator.tabs`. Never `creator.getPlugin(id)`: it answers for tabs `showThemeTab` & friends removed, and instantiates the plugin as a side effect.
- Product allowlists (carry-forward question types, …) stay in the owning feature.

Placement: [`project-structure.md`](project-structure.md).

## Configuration: public values are request-time

The Hub promotes one image across environments, so nothing public may be baked at build. Next
inlines any `NEXT_PUBLIC_`-prefixed literal in a client-reachable module at bundle time — the
prefix, not `"use client"`, is what decides.

- **Never add a `NEXT_PUBLIC_*` value or reach for `--build-arg`.** Public runtime values use
  `ENDATIX_*` and reach the browser through the request-time projection. Replacing a licence key
  must be a config change, never a rebuild. `features/config/__tests__/no-build-time-client-config.test.ts`
  fails on any new `NEXT_PUBLIC_` read outside its allowlist.
- Read config with `await getClientEndatixConfig()` from `@/features/config/server` (Server
  Components), `getBrowserEndatixConfig()` (browser, non-React SurveyJS handlers), or
  `getIsomorphicEndatixConfig()` (either side; omits `apiBaseUrl` / `extensionsEnabled`). Keep
  `@/features/config` config-safe for `next.config.ts`; anything needing `next/server` goes in the
  server barrel.
- **Adding a public value:** field on `ClientEndatixConfig`, default in
  `EMPTY_CLIENT_ENDATIX_CONFIG` plus pass-through in `toClientEndatixConfig`, `ENDATIX_*` read in
  `readPublicEndatixEnv()`. It is then serialised into the HTML of every page mounting
  `AppProvider`, anonymous form layouts included — `AssertNoSecretsInClientConfig` only backstops a
  few known secret names.
- **A secret a client component needs is scoped to its routes**, not added to the projection:
  `getSurveyLicenseKey()` + `SurveyLicenseProvider`, mounted only on SurveyJS routes, never on
  `(main)`.
- Deprecated `NEXT_PUBLIC_*` names still work — `applyLegacyPublicEnv()` folds them into `ENDATIX_*`
  at boot. Never import `legacy-public-env.server.ts` from a client component.
- Only `basePath` stays build-time (`NEXT_PUBLIC_BASE_PATH` in `lib/hosting/base-path.ts`): no
  runtime equivalent, so the published image serves at `/` whatever the operator sets. Subfolder
  hosting needs per-origin hosting or a self-build.

## Server Actions

- Server action files must use `"use server"` and return `Result<T>` for operation outcomes (default). Use `ServerActionState` only for FormData / `useActionState` flows that need Zod field-level errors.
- Type `ServerActionState<T>` from the posted form shape (same keys as the Zod schema). Field errors live on `errors` (`DeepFieldErrors<T>`). Show them with `firstFieldError(errors, "name")`.
- Zod field failures: `ServerActionState.fromZodError` — no `message` when every issue has a path. Bind **every** schema path in the UI. Toast helpers that skip when `errors` is set are correct; silent UI means a field was not bound.
- API / catalog / flag failures in FormData actions: `toResult` then `ServerActionState.fromFailure(result, rawData)` (or a domain `string`). That sets `message` and does **not** set `errors`, so toasts fire.
- Do not hand-build `z.ZodIssue[]` / `new z.ZodError(issues)`. Put extra rules on the schema with `.superRefine` (`ctx.addIssue`). Do not `ApiResult.isSuccess` then `toResult` only on failure — always `toResult` first.
- Keep actions thin: authenticate, authorize, call the API or use case, revalidate paths when needed, and return a typed result.
- For Endatix API calls returning `ApiResult<T>`, **always** map with `toResult(...)` from `lib/result/map-api-result-to-result`. Do **not** hand-write `if (!apiResult.success) return Result.error(apiResult.error.message)`. Existing `mapToResult(...)` is equivalent; prefer `toResult(...)` for new/touched code.
- Pass `fallbackMessage`, `logMessage`, and `loggerName` so unexpected failures log via `TelemetryLogger` while expected 403/404/validation stay user-facing without noisy logs.
- When the action result type differs from the API payload (e.g. `Result<void>` after PATCH that returns settings), use `mapData` (e.g. `mapData: () => undefined`). Alternatively keep success local and map only the failure branch with `toResult`.
- Call `revalidatePath` / `revalidateTag` only after `Result.isSuccess(result)`.
- Some OSS payloads carry a `{ success, message }` envelope (`RegisterResponse`, `ActivateInviteResponse`, `UserOperationResponse`): a 200 does not mean the operation succeeded. `toResult` handles this for you — a body with `success: false` **and** a string `message` becomes a validation error carrying that message. Do not re-check the flag at the call site, and do not name an unrelated payload field `success` unless the envelope semantics apply.
- Actions behind a feature flag check it server-side, next to the authorization guard, and return `Result.error("<Feature> is not enabled for this environment.")` — a hidden UI is not a gate. When several actions share one guard + flag, put both in a slice-local `require*` helper that returns `Result<EndatixApi>` (`features/platform-admin/tenant-management.server.ts`); a single action can inline the check (`features/export/prepare-reporting-export/prepare-reporting-export.action.ts`).

## Endatix IDs

- Treat C# `long` IDs from Endatix entities as strings in Hub types and UI state. The API serializes these IDs as strings to avoid JavaScript number precision loss.
- Do not coerce Endatix IDs through `Number(...)`, `parseInt(...)`, or numeric Zod schemas. Keep values as strings from API DTOs through server actions and route/query params.
- Before using an Endatix ID in an API path, server action payload, or security-sensitive lookup, validate it with `validateEndatixId(...)` or `createEndatixIdSchema(...)` from `lib/utils/type-validators.ts` to reduce attack surface.
- A tenant's public id is `shortUrl` (opaque, API-generated, immutable). Never name it `slug` in Hub DTOs or state, and never send it on create — only Next route folders keep `[tenantSlug]`.
- Public GET JSON still uses `slug` (`PublicTenantModel.Slug` on the API). Map to `shortUrl` in `lib/endatix-api/public-tenants`. Register body keeps `tenantSlug` (OSS `RegisterCommand`). Worked example: `features/tenants/public-tenant/`.

## Auth pages (`app/(auth)`)

- Compose every `(auth)` screen from `AuthLogo` + `AuthStatus` (`features/auth/ui/`). Never re-inline the light/dark `<Image>` wordmark pair, and never hand-roll a status heading with its own icon and colours.
- `AuthStatus` tones are `success` / `error` / `warning` / `pending` / `prompt` (`prompt` = a question, so no glyph). Use the semantic tokens it carries (`text-success`, `bg-warning/10`, `text-destructive`) — no raw `text-green-500` / `text-red-500`.
- Never branch on message text to pick a colour; carry the outcome as a tone (see `app/(auth)/account-verification/page.tsx`).
- Unauthenticated `/t/{shortUrl}/signin` and `/register` are auth routes (`isTenantPublicAuthPath` in `auth-constants.ts`) so the proxy does not bounce them to global `/signin`. Failure states come from `features/tenants/public-tenant/ui/`, not bare `<p>` text.
- `auth-constants.ts` stays free of NextAuth imports (the proxy and client components import it), which is why `ENDATIX_AUTH_PROVIDER_ID` lives there rather than beside the provider class.

## Assume tenant (support)

- Support session only: `POST /auth/assume-tenant` `{ tenantId }` then `POST /auth/exit-assume`. Both return new access+refresh tokens. Swap cookies with `replaceSessionTokens` (`server-only`; never `"use server"` — that would let the client set arbitrary tokens).
- JWT `act` + `tid` means assumed (`readAssumeSession`). Confirm before assume. Success lands on `/forms`; exit on `/admin/tenants`. Enter with `requireTenantManagement`; exit with the current session token (`readAssumeSession`) so a flag/role change cannot strand the operator. Worked example: `features/platform-admin/assume-tenant/`.
- The sticky banner is `SupportAccessBannerSlot`, mounted by `(main)/layout.tsx` and living in the slice (see project-structure.md "Layout and parallel-route slots"). It decides _whether_ to render synchronously from the JWT and streams only the tenant **name**, with the unnamed banner as the `Suspense` fallback: an `await` in the layout blocks every route under it, and a `null` fallback would make the sticky banner pop in and shift the page.
- A swap that already wrote the session cookie must report success. Invalidating the authorization cache is a best-effort follow-up — log it and continue, never fold it into the same `try` as `unstable_update`, or a cache error strands the operator in the old context with a false failure.
- Both actions return `Result` and only _return_ on failure (success `redirect()`s). Callers must consume that value — the assume dialog and the exit button both `useTransition` + toast.

## Paged list sort and calendar From/To

**Reference implementation: `lib/endatix-api/themes/` (+ `lib/endatix-api/__tests__/themes/themes.test.ts`).** Copy that shape for every new paged list client; there is exactly one right answer per bullet below.

- Compose list/export request DTOs from `lib/endatix-api/shared` types: `IPagedRequest`, `SortRequest<TFields>`, `DateRangeFilter<"created">` / `AuditDateFilters` (and other stems). Do **not** hand-copy `createdFrom`/`sortDir` fields onto every interface.
- Parse and append via `lib/endatix-api/shared/list-query.ts` (`parseCalendarDateYmd`, `parseSortBy`/`parseSortDir`, `pickDateRangeFilters`, `appendSortParams`, `appendDateRangeFilters`). Feature URL glue stays in `features/`; raw URL state may keep `string` until parse.
- Sort allowlists use property names (`createdAt`); date stems use bare verbs (`"created"` → `createdFrom`/`createdTo`). Keep those namespaces distinct.
- Wire stays flat (`createdFrom`/`createdTo`). OSS Core uses `UtcDateTimeRange` only after API parse — do not nest Hub query objects to mirror that struct.
- These helpers live in the `lib/endatix-api` package candidate (future `@endatix/api-client`); do not import `@/features` or Next into that folder.

### The one list-client shape

1. **Export a pure `buildList<Entity>Endpoint(request)`** next to the class. It builds a `URLSearchParams` with `appendPagingQueryParams(params, request, { page: 1, pageSize: N })` → `appendSortParams` → `appendDateRangeFilters(params, request, ["created", "modified"])` → `appendQueryParam` for entity-specific filters, and returns `buildEndpointWithQuery(BASE, params)`. Assert the query contract against this function in tests — no `EndatixApi` instance needed. Do **not** hand-build `new URLSearchParams()` + `params.set(...)` inside `list()`.
2. **`list()` returns one page**, not a flat array: `Promise<ApiResult<NormalizedPagedResponse<T>>>` via `normalizePagedResponse(response.data)` (`shared/paged-response.ts`). That preserves `page`/`totalRecords`/`totalPages` for `PagedTableFooter` and adds `hasNextPage`. Never drop the envelope on the floor — a `list()` that returns `T[]` cannot render paging.
3. **Draining every page is a separate, named method** (`listAll()`), used only where the UI genuinely has no paging affordance (a Creator dropdown, a template picker). It omits `page` from its request type, loops from page 1, stops on `!hasNextPage`, and is bounded by a `LIST_ALL_MAX_PAGES` constant so a server that misreports `totalPages` cannot loop forever. Do **not** bolt "start at `request.page` and drain to the end" onto `list()` — that reads as paging but returns `[]` for any `page > 1` before the first response arrives.
4. **Boolean filter sugar maps to the wire filter in the builder**, not at every call site (`unassignedOnly: true` → `filter=folderId:null`). Call sites pass the intent; the builder owns the encoding.
5. **Validate path ids with `validateEndatixId(...)` and return `ApiResult.validationError(...)`** before touching the network (see `Themes.partialUpdate` / `Themes.delete`).
6. **Server actions map with `toResult(...)`**, never a hand-written `if (ApiResult.isError(...)) return Result.error(...)` — see "Server Actions" above. `features/themes/*/*.action.ts` are the worked examples.

Known deviations, to be migrated when next touched (do not copy them): `Forms.list` / `Users.list` return the raw `PagedResponse<T>` without `normalizePagedResponse`; `FormTemplates.list` is a drain that has not yet been renamed to `listAll`; `listPlatformAdminUsers` still throws `DataLoadError` instead of returning `Result` (`listPlatformTenants` was migrated — follow that one).

## Server Pages

- Keep `app/` pages mostly orchestration-focused: parse route/search params, start independent data work early, and pass typed data into UI components.
- Prefer streaming slow, independent page sections with `Suspense` boundaries instead of blocking the whole route when partial rendering improves UX.
- For streamed sections, pass stable promises into the section and unwrap them with React `use()` in the receiving component when that keeps the route file thin. Key the `Suspense` boundary with the parsed list query so a new filter/search does not keep the previous `use(promise)` result.
- Use `Promise.all` for independent data dependencies. Await sequentially only when a later call depends on an earlier result.
- For server page calls to the Endatix API, convert `ApiResult<T>` with `toResult(...)` so unexpected operational failures are logged consistently and expected invalid/not-found states can map to page-specific fallback UI.

### Page-load outcomes (composed GET loaders)

**Single-Result lists** (one `toResult`, no post-fetch redirect): thin route + promise + client `use()`. Reference `app/(main)/data-lists/page.tsx` + `features/data-lists/view-lists/`, and `app/(main)/admin/tenants/page.tsx` + `features/platform-admin/list-tenants/`. Return `Result<T>` from the loader; unwrap with `HubPageLoadError` / `ResultLoadErrorView` — do not throw `DataLoadError` into `error.tsx`.

**Composed list loads** (two+ GET Results, identity 404 vs load chrome, and/or a redirect that needs the API response): do **not** pile fetch + mapping + chrome into `app/.../page.tsx`. Use a slice-local **page-load outcome**:

1. Pure `resolve*PageLoad(...)` returns a discriminated union (`ready` / `error` / `notFound` / `redirect`) — no React, no Next `redirect`.
2. Thin `*.server.ts` loader does `Promise.all` + `toResult`, then calls the resolver.
3. Server Component section matches on `kind` → `HubPageLoadError` / not-found chrome / `redirect(href)` / success UI.

Keep post-fetch `redirect()` in that Server Component — do not stream the outcome through a client `use()` wrapper. Pre-fetch URL canonicalization (parse-only) can stay in the route file.

**Compose, don’t explode:** success view models take `PagedResponse<T>` + existing URL state (+ a few scalars). Do **not** re-list `page` / `pageSize` / every `*From`/`*To` stem as constructor args — those already live on the envelope and URL state (same idea as `ListSubmissionsRequest` composing `IPagedRequest` + `AuditDateFilters`). Wire stays flat; nest only at a UI adapter (e.g. date-filter chrome).

**Pre-fetch canonical URL:** `isCanonical*(rawSearchParams, parsedState) → boolean`. Do not hand-build a raw/parsed date bag at the route.

**Reference (first of its kind):** `features/submissions/list-submissions/` (`types.ts` view model, resolver, server loader, section) + `isCanonicalSubmissionListUrl(raw, parsed)` in `list-submission-query/`. Do **not** extract a shared `lib/page-load` type until a second page copies this shape. Analyze all references to identify further opportunities for optimization like better patterns, utils and abstractions

## Table filter state (client)

- One debounced field (a search box): `useListUrlState()` (`components/table`).
- One list page → one `useListUrlState()` call in a **client shell** that keeps the toolbar mounted and keys `Suspense` around the table only. Toolbar and table take props from that shell — do not call the hook in both. Pass `listKey` (and the list promise) from the RSC so Suspense remounts with the matching payload. Reference: `features/platform-admin/list-tenants/ui/tenants-list.tsx`.
- **Two or more** debounced fields on the same table (search + a free-text filter, etc.): `useTableFiltersUrlState(keys)` (`components/table`), not one `useListUrlState` / `useUrlSearchParamsUpdater` call per field. Independent debounced writers race — each rebuilds the next URL from its own `searchParams` snapshot at the moment its timer fires, so whichever settles second can silently drop the other's just-committed change. `useTableFiltersUrlState` commits every field together in a single `updateUrl` call per settle window, so there is exactly one writer.
  - `keys` must be a module-level constant array (e.g. `const FILTER_KEYS = ["search", "hasLocale"] as const;`), not an inline literal — it drives the hook's effect dependencies.
  - Non-debounced filters (`Select`s, checkboxes) still call `updateUrl` directly; they don't need to be listed in `keys`.

## Detail → list back navigation

When a detail page has a "Back to `<list>`" control that should restore the list's last paging/filters, use `BackToTableButton` (`components/table/back-to-table-button.tsx`) backed by `lib/list-page/table-return-to`. Do **not** carry list state back via a URL param (e.g. `?from=...`) for this — session-scoped storage keeps detail URLs shareable/bookmarkable without embedding list state, and is naturally scoped per browser tab (a middle-click into a new tab correctly falls back to the bare list path instead of inheriting another tab's filters).

- The list page remembers its own current query in a `useEffect` keyed on `searchParams`: `rememberTableReturnTo(tableKey, searchParams.toString(), parse, scopeId?)`.
- The detail page's back control is `<BackToTableButton tableKey="..." fallbackHref="..." parse={...} buildHref={...} />` (or call `getTableReturnHref(...)` directly outside a `Link`).
- `tableKey` scopes the storage key (e.g. `"data-lists"`, `"submissions"`); also pass `scopeId` when the list itself is per-parent-entity (e.g. a formId for `/forms/:formId/submissions`).
- **`parse` is mandatory and is the whitelist.** It must be the same `parse*ListParams` + `serialize*ListSearchParams` round-trip the list page's own URL parsing already uses (paging clamped to positive ints, enums/culture-codes validated, unknown keys dropped). `table-return-to` re-runs `parse` on read too — defense in depth, since a value written by an older app version (or edited via storage/devtools) must be re-validated before ever being reused for navigation — and falls back to `fallbackHref` if `parse` throws or empties the query. Never pass a function that returns raw/unvalidated input, and `buildHref` must build against a hardcoded list path, never treat the stored value itself as a redirect target.
- `parse` / `buildHref` should be stable references (module-level functions, not inline closures) — they're effect dependencies on `BackToTableButton`.
- Reference implementation: `features/data-lists/view-lists/utils.ts` (`parseDataListsReturnQuery`, `dataListsListHrefFromQuery`), wired into `data-lists-page.tsx` (remember) and `data-list-details-page.tsx` (`BackToTableButton`).
- `features/submissions/list-submission-query/submission-list-return-to.ts` + `back-to-submissions-button.tsx` predate this shared abstraction (bespoke sessionStorage, same shape, not yet migrated). Move it onto `table-return-to` / `BackToTableButton` next time that code is touched rather than adding a third bespoke copy.

## Tests

Vitest. AAA regions in every `it` that has distinct phases:

```ts
it("renders the xlsx glyph", () => {
  // Arrange & Act
  const { container } = render(<FileKindIcon kind="xlsx" />);

  // Assert
  expect(container.querySelector("svg")?.className).toContain("file-spreadsheet");
});
```

- Setup then call then expect → `// Arrange` / `// Act` / `// Assert`.
- Render+assert or a table of `expect(fn())` with no setup → `// Act & Assert`.
- Skip labels only when the whole `it` is a one-liner (`expect(fn()).toBe(x)`). Folders: [`project-structure.md`](project-structure.md) Testing Convention.

## Mirrored OSS rules

Some Hub modules re-implement an OSS Core rule so the UI can validate before a round trip. Both copies must agree: a Hub-only rule rejects input the API accepts and strands rows already holding that value.

- `lib/url/url-slug.ts` mirrors `Endatix.Core.Common.UrlSlugNormalizer` (normalization + `ReservedSlugs`). Add a reserved name to OSS first, then here; `lib/url/__tests__/url-slug.test.ts` pins the list so drift fails a test rather than a user's save.
- Same rule for any future mirror: state the OSS type in a file header comment and pin the shared data in a test.

## Error Handling

- Preserve API-provided user-facing messages, validation errors, and error codes through the shared result mappers.
- Use `parseZodError()` or `ServerActionState.fromZodError()` for Zod validation failures in form actions. Use `ServerActionState.fromFailure()` for operational `Result` errors on those same FormData actions.
- For any `ApiResult<T>`, prefer `toResult(...)` — it maps to `Result` and owns unexpected-failure telemetry when `logMessage` / `loggerName` are set. Expected validation/auth/403/404/rate-limit are suppressed inside `toResult`; do not duplicate that classification with local filters or ad hoc `TelemetryLogger.error` on `!apiResult.success`.
- `toResult` / `mapApiErrorToResult` must preserve ProblemDetails support fields on `Result` errors: `traceId`, `statusCode`, and `errorCode`. Do not drop them when mapping.
- Do not log expected user/action failures such as validation, authentication, or authorization failures as application errors.
- Use `TelemetryLogger` for unexpected operational failures outside an `ApiResult` path (e.g. thrown errors, composing-action workflow failures). Only log safe scalar attributes (`errorCode`, ids already shown in UI, status/method/endpoint from `mapApiErrorToTelemetryAttributes`); never log tokens, cookies, raw request bodies, field values, or raw API detail/message strings.
- **Composing actions** (workflows that call other actions returning `Result<T>`): do **not** call `toResult` again. Check `Result.isError`, return/combine user-facing messages, and if you must log the workflow failure use safe scalars only. API telemetry belongs in the leaf that received `ApiResult` via `toResult`.

### Server loaders vs `error.tsx`

- When a server loader already has an `ApiResult` (list pages, detail fetches), **return `Result<T>`** and render fallback UI (`HubPageLoadError` / `ResultLoadErrorView`). Do **not** dump `ApiResult.error.message` as red text and do **not** `throw` into `error.tsx` — Next only forwards `message` + `digest`, so API `traceId` / `statusCode` are lost and the page may show a misleading 500.
- Sibling `Suspense` regions: each `ResultLoadErrorView` is independent. Two failing Result loaders show **two** branded error blocks in their slots; toolbar/layout stay. A **throw** in a sibling (e.g. folders `await` without Result) still hits `error.tsx` and replaces the **whole** route segment, including successful siblings. Isolate only the loaders you convert to Result; do not mix throw + Result if you need both regions to keep rendering.
- `error.tsx` / `global-error.tsx` are for **uncaught** exceptions only. Next.js forwards `error.message` (generic in production for Server Components) plus `error.digest` (hash to match server logs). Show digest on the support box; send it with PostHog `trackException`. Use stable `retry()` (not `reset()`). `global-error` must ship its own `<html>`/`<body>` + `globals.css`. Do **not** adopt `catchError` / graceful-degrading HTML snapshots for loaders — keep known `ApiResult` failures as `Result`.
- Drive chrome from `statusCode` / `Result.errorType` via `unexpectedErrorUiFromResult`, not by sniffing `error.message`.
- Reference — single Result list: `features/data-lists/view-lists/` and `features/platform-admin/list-tenants/`. Composed GET + post-fetch redirect: `features/submissions/list-submissions/` (page-load outcome). Other `(main)` pages may return `HubPageLoadError` directly when the loader is a single Result with no redirect.

### Error page chrome (`ErrorPage`)

- Every full-page error renders through `components/error-handling/error-page` — 404, 403, auth, unexpected, public share/embed. One centred layout, one sheep, one type scale. Do not hand-roll an error screen with its own icon treatment.
- `code` is the **watermark** and takes an HTTP status only (`404`, `500`, `403`). Anything longer than 4 characters is ignored by design: a phrase wraps across the copy it sits behind. Put the words in `eyebrow`.
- `eyebrow` is the short label (`Form not found`), `title` is the sentence (`We couldn't find that form.`). Never repeat one in the other — the watermark, eyebrow and title used to say "Form not found" three times.
- Rendering custom error data? Type the copy map as `ErrorPresentation` (`lib/errors/error-presentation.ts`) — its fields _are_ `ErrorPageProps`, so `<ErrorPage {...presentation} />` renders it and `<ErrorPage {...presentation} title="…" />` overrides a field; look it up with `resolveErrorPresentation(map, key, fallback)`, and if the surface also shows a support code call it `supportCode`, never `code`.
- The sheep scales through `--sheep-scale` and pauses under `prefers-reduced-motion`; both live in `not-found-sheep.css`. Don't add per-call-site sizing.
- Absent diagnostics render as a dash on the row, not as a sentence about what is missing.

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

### Example: FormData action (`fromZodError` / `fromFailure`)

```typescript
const validated = schema.safeParse(rawData);
if (!validated.success) {
  return ServerActionState.fromZodError(validated.error, rawData);
}

const result = toResult(await api.reporting.exportFormats.create(body), {
  fallbackMessage: "Failed to create export format.",
  logMessage: "Failed to create export format.",
  loggerName: "export.manage-export-formats",
});
if (Result.isSuccess(result)) {
  revalidatePath("/settings/organization/export-formats");
  return { isSuccess: true, message: "Export format created." };
}

return ServerActionState.fromFailure(result, rawData);
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
