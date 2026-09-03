# Project Structure

Quick reference for organizing features using vertical slice architecture.

## lib/ vs features/ vs packages/

### Use `lib/` for:

- **Internal utilities** used across multiple features
- **Framework-specific adapters** (Next.js, React)
- **Cross-cutting concerns** that aren't ready for packages

### Use `features/` for:

- **Endatix-specific business logic**
- **App configuration** (features/config/)
- **Complete vertical slices** with use-cases, UI, and infrastructure

### Use `packages/` for:

- **Future npm packages** with their own package.json
- **Reusable libraries** that can be published independently
- **Workspace packages** that other projects can consume

## Feature Structure

Vertical Slice Architecture: organize by business feature, then by use-case slice.

```text
features/
├── {feature-name}/
│   ├── server.ts                             # Optional: curated server-safe exports
│   ├── index.ts                              # Optional: curated shared/client-safe exports
│   ├── types.ts                              # Feature-shared types across slices
│   ├── utils.ts                              # Feature-shared pure helpers
│   ├── ui/                                   # Cross-slice reusable UI only
│   ├── {verb-noun}/                          # Use-case slice (preferred)
│   │   ├── {verb-noun}.action.ts             # Server action for this slice
│   │   ├── {verb-noun}.server.ts             # Optional server-only loader/helper
│   │   ├── use-{noun}.hook.ts                # Optional slice-local hook
│   │   ├── ui/                               # Slice-local UI
│   │   ├── __tests__/                        # Slice-local tests
│   │   └── index.ts                          # Slice barrel exports
│   └── __tests__/                            # Optional cross-slice integration tests
```

### Reference Example: `features/folders`

Use `features/folders` as the canonical implementation of this pattern:

- slices like `create-folder`, `update-folder`, `delete-folder`, `move-form-to-folder`, `view-forms-header`
- shared root artifacts in `types.ts`, `utils.ts`, and root `ui/` for cross-slice components
- server-safe curated exports via `features/folders/server.ts`
- slice-local tests in `features/folders/create-folder/__tests__/`

### Public tenant auth (`features/tenants/public-tenant`)

Unauthenticated tenant sign-in / self-registration lives here, not under `platform-admin`: `platform-admin` is client-imported and must stay free of NextAuth. The slice owns the public-tenant action, the provider allow-list filter, and the `(auth)` failure states. Hub types use `shortUrl`; `POST /auth/register` still sends `tenantSlug`. See Hub `AGENTS.md` “Endatix IDs” and “Auth pages”.

### Reporting export slices (`features/export`)

Reporting export is a dedicated feature (not nested under `forms/` or `submissions/`). Slices map to API capabilities and UI surfaces:

| Slice                      | Scope                  | Responsibility                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prepare-reporting-export` | Action-only            | Server action: compile `FormSchema` + backfill flattened submissions (`fullRecompile` → replace + force). No standalone form-details UI.                                                                                                                                               |
| `export-submissions`       | Submissions list       | Tenant-configured export download via `exportFormatId` (+ legacy `CustomExports` when flag off). Owns the Export dialog: readiness check, auto prepare when schema missing, optional **Rebuild reporting data…** (manual prepare + full recompile), format + capability-aware filters. |
| `manage-export-formats`    | Tenant settings (E10b) | CRUD UI for tenant export formats + tenant default mapping picker (alias, key separator, include-test)                                                                                                                                                                                 |

Shared feature root: `types.ts`, `export-url.ts`, `export-error-message.ts`. Export route `app/api/forms/[formId]/export/route.ts` stays thin and delegates parsing to `export-submissions/parse-export-query.ts`.

Import from `@/features/export` (client UI) or `@/features/export/server` (server actions). Slice barrels: `@/features/export/export-submissions`, `@/features/export/prepare-reporting-export`, `@/features/export/manage-export-formats`.

> **Note:** Codebook/Shoji downloads use the same tenant formats + submissions export dropdown (no separate `export-codebook` / `manage-export-mappings` slices). Locale stays request-time on the export API and is not edited on format definitions. Prepare/rebuild is only entered from the export dialog (auto when not ready, or via **Rebuild reporting data…**).

### Organization Management Slices

Organization identity surfaces follow the same vertical-slice rule:

- `features/organization/user-management/use-cases/create-tenant-user` owns tenant invites. Invite actions must not collect a password from the inviter.
- `features/organization/user-management/use-cases/delete-user` owns tenant access removal. It keeps typed confirmation in UI and must not delete the global user identity.
- `features/organization/user-management/use-cases/resend-verification` owns pending-user activation email resend.
- `features/organization/user-management/use-cases/cancel-invite` owns pending invite cancellation and token invalidation.
- `features/organization/user-management/use-cases/manage-user-roles` owns assigning and removing user roles.
- `features/organization/role-management` owns role CRUD and permission catalog UI.

New organization server actions should return `ServerActionState` and convert Zod failures through `ServerActionState.fromZodError`.

### Entry Point Pattern (Idiomatic Next.js)

To prevent server-side dependencies (like database clients or SDKs) from leaking into the client bundle, use explicit entry points:

1.  **Slice `index.ts`**: Primary import point for each vertical slice.
2.  **`server.ts`**: Optional feature-level curated exports for Server Components and Server Actions.
3.  **`index.ts`**: Optional feature-level curated shared/client-safe exports.

## Why Vertical Slice Architecture?

**Cohesion**: Related code lives together - business logic, actions, UI, and tests are co-located.

**Discoverability**: Find everything related to a feature without navigating multiple folders.

**Collaboration**: Teams work on different features simultaneously with minimal conflicts.

**Flexibility**: Features vary in complexity without artificial constraints.

## Testing Convention

Use `__tests__/` folders for test organization:

- **Slice level (default)**: `features/{name}/{verb-noun}/__tests__/` - Test slice behavior close to implementation
- **Feature level (optional)**: `features/{name}/__tests__/` - Cross-slice integration and shared feature helpers
- **Component level**: Place `.test.tsx` files alongside components when testing specific UI behavior
- **Focus on slices**: Test actions, loaders, hooks, and UI inside the slice where they live

## Layers

### Use-Case Layer (optional `.use-case.ts`)

```typescript
// Pure business logic, no Next.js dependencies (only when needed)
export const createFormUseCase = async (
  request: CreateFormRequest,
): Promise<Result<string>> => {
  // Business logic here
};
```

### Action Layer (.action.ts)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type DeleteItemResult = Result<string>;

export async function deleteItemAction(
  itemId: string,
): Promise<DeleteItemResult> {
  const session = await requireAccess(); // auth + authorization at the boundary
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.items.delete(itemId);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to delete item.",
    logMessage: "Failed to delete item.",
    loggerName: "feature.items",
    mapData: (data) => data.message,
  });

  if (Result.isSuccess(result)) {
    revalidatePath("/(main)/items");
  }

  return result;
}
```

Action rules:

- Return `Result<T>` by default — never swallow failures silently. Use `ServerActionState` only for FormData / `useActionState` flows that need Zod field-level errors (not for arbitrary Zod multi-field forms)
- Authenticate and authorize inside the action, or accept a session already validated by the caller
- Always map Endatix `ApiResult` with `toResult(...)` — do not hand-write `Result.error(apiResult.error.message)`. Pass `fallbackMessage`, `logMessage`, and `loggerName` so expected 403/404/validation stay user-facing and unexpected failures log through `TelemetryLogger`
- When the UI result type differs from the API body (e.g. `Result<void>`), use `mapData` (e.g. `mapData: () => undefined`)
- Revalidate paths only after `Result.isSuccess(result)`
- Surface success and failure in the UI with toast or inline feedback; pair actions with a client handler using `useTransition` when not using `useActionState`

#### List pages and tables

- Drive search, filters, and pagination from URL `searchParams` (parse in a server page or shared util, e.g. `parsePlatformAdminListParams`, `parseFormsListParams`). Coerce Next's repeated keys with `firstSearchParam` (`lib/utils/next-utils`); type optional `searchParams` members as `SearchParamValue`, not `SearchParam` — `?` plus `| undefined` is redundant.
- Use one paged API endpoint with scope/tenant filters rather than two parallel lists sharing the same `page` param.
- Client tables update the URL via `useListUrlState` (single debounced field) or `useTableFiltersUrlState` (2+ debounced fields, one coalesced commit — see below), plus `Select` filters calling `updateUrl` directly, `PagedTableFooter` / `PagedListFooter`, and receive unresolved promises from the server page wrapped in `Suspense`. Own `useListUrlState` once in a client shell; pass URL props to toolbar and table (see `features/platform-admin/list-tenants/ui/tenants-list.tsx`).
- Shared helpers live in `lib/list-page/` (`parse-paged-search-params`, `table-return-to`). URL writers for tables (`useListUrlState`, `useTableFiltersUrlState`) live in `components/table/`.
- List-table **chrome** (surface, empty state, header/row/cell class helpers, search input, **toolbar**, paged footer, **`BackToTableButton`**, **`useListUrlState`**, **`useTableFiltersUrlState`**) lives in `components/table/`. `DataTableToolbar` is one row: filters scroll, actions stay pinned. Keep the ShadCN primitive (`Table`, `TableRow`, …) in `components/ui/table.tsx`.
- Do not hand-roll the parts every list table shares — reach for `components/table` first:
  - **`DataTableGrid`** renders the TanStack header/body; **`DataTableSkeleton`** is its loading twin (pass `columns`, override a column's `cell` only where the placeholder shape differs).
  - **`useListTableState(urlState, updateUrl)`** derives `sorting`, `created`, `modified`, and `onSortingChange` from the URL.
  - **`auditDateColumns({ created, modified, updateUrl })`** is the `Created` / `Modified` pair; spread it into the column list rather than redefining the headers and date filters.
  - `ColumnMeta.cellClassName` / `headerClassName` are declared once in `components/table/data-table-column-meta.ts`. Import that module for the class-name fields; a feature `types.ts` augments `ColumnMeta` only with its own fields.
- **Two or more debounced filter fields on the same table** must share one `useTableFiltersUrlState(keys)` call (`components/table`), not one `useListUrlState`/`useUrlSearchParamsUpdater` per field — independent debounced writers race (each rebuilds the URL from its own stale `searchParams` snapshot) and can silently drop each other's change. `keys` must be a module-level constant array.
- **Detail → list back navigation** restores the list's paging/filters via session-scoped storage, not a URL param — see AGENTS.md "Detail → list back navigation" and `lib/list-page/table-return-to`.
- Hub list URL key is **`search`**; map it to the API query field (`query`, `filter`, etc.) inside the slice parser. Do not introduce a parallel `q` param.
- The **API-client** side of a paged list (request type, exported `buildList<Entity>Endpoint`, `list()` returning a normalized page, a separate bounded `listAll()` for pickers, which don't support lazy loading. Prefer list with paging where possible) has exactly one documented shape — see AGENTS.md "Paged list sort and calendar From/To → The one list-client shape" and its reference implementation `lib/endatix-api/themes/`.
- Reference: `settings/organization/users/page.tsx`, `admin/platform-admins/page.tsx`, `forms/page.tsx`, `features/forms/list-forms/`, and `features/data-lists/view-lists/`.
- **Submissions list** (`/forms/[formId]/submissions`): loader + page-load outcome live in `features/submissions/list-submissions/` (not in `app/`). URL parse helpers stay in `list-submission-query/`. See AGENTS.md "Page-load outcomes".

##### Forms list scope model (`/forms`)

Root `/forms` supports three URL-driven modes (shareable, bookmarkable):

| Mode                        | URL                                         | API scope        | Folder shortcuts | Info alert                   |
| --------------------------- | ------------------------------------------- | ---------------- | ---------------- | ---------------------------- |
| Unassigned browse (default) | `/forms`                                    | `unassignedOnly` | Show             | No                           |
| All forms browse            | `/forms?browse=all`                         | tenant-wide      | Show             | No                           |
| Global search/filter        | `?search=…` or `status=…` or `visibility=…` | tenant-wide      | Hide             | Yes (`Alert variant="info"`) |
| Folder browse               | `/forms/folders/[slug]`                     | `folderId`       | N/A              | No                           |

Parsing and helpers live in `features/forms/list-forms/utils.ts` (`parseFormsListParams`, `resolveRootFormsViewMode`, `shouldHideFolderShortcuts`, `isTenantWideFormsList`). Breadcrumb dropdown options (Unassigned / All forms / folders) are built in `features/folders/view-forms-header/build-forms-breadcrumb-model.server.ts` with `browse` from header `searchParams`.

**Follow-up PRs (not Phase 1):**

- **Phase 2 — Sorting:** OSS `sortBy` / `sortDir` on `GET /forms`; Hub toolbar `Select` + URL params.
- **Phase 3 — Layout toggle:** `layout=cards|table` with compact table view for large lists.
- **Phase 4 — Pinning:** Backend `UserFormPin` + pinned strip above list.
- **Phase 5 — Tasks:** Assigned/review sections when collaboration exists.

##### Data lists list + items (`/data-lists`)

Hub management grids follow the same URL + chrome pattern as forms/users. Parsing stays in the owning slice (not a new query slice).

| Surface        | Slice                                               | Hub URL                                                                         | API                                                                                |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| List           | `features/data-lists/view-lists/`                   | `search`, `hasLocale` (single BCP-47 code), `page`, `pageSize`, `action=create` | `GET /data-lists` (`search`, `hasLocale`)                                          |
| Creator picker | `features/data-lists/search-data-lists-for-picker/` | (property grid; no Hub URL)                                                     | Same `GET /data-lists` via `getDataListsPageResult`                                |
| Detail items   | `features/data-lists/view-list-details/`            | `search`, `page`, `pageSize`, `action=replace`                                  | `GET /data-lists/{id}/items` (`query`) + `GET /data-lists/{id}?includeItems=false` |

- List → detail "Back to Data Lists" restores filters/paging via `BackToTableButton` (`tableKey: "data-lists"`), not a URL param — see AGENTS.md "Detail → list back navigation".
- Replacing items resets the items grid's `page`/`search` (stale values from before the replace would otherwise point past the new item set).
- Items are **GET-only** in Hub. Authors edit via file replace (`replace-items`), not per-item CRUD.
- Stream the paged promise from the App Router page into the client table (`use()` + `Suspense`). Footer lives **inside** `DataTableSurface`.
- Creator Translations CSV wrap lives in `lib/survey-features/data-lists/` (compound keys + SurveyJS CSV merge). Hub actions stay in `features/data-lists/translations/` (`uploadTranslationsCsvAction`, `getDataListTranslationCatalogAction`).
- Creator catalog picker vs bound-question items: Hub session `GET /data-lists` (`search-data-lists-for-picker`) vs public item search (`survey-bindings.ts` + `searchDataListChoices`). Do not load the full catalog at Creator init.

### Layout and parallel-route slots (`*-slot.tsx`)

- A component mounted by `app/` layouts or `@slot` route pages lives in its feature slice as `{feature}-slot.tsx`, not inline in the `app/` file. `app/` stays orchestration: resolve session/params, render the slot. References: `features/folders/view-forms-header/forms-folder-header-slot.tsx`, `features/platform-admin/assume-tenant/ui/support-access-banner-slot.tsx`.
- A slot mounted by a **layout** must be synchronous and own its `Suspense` boundaries internally. `await` in the slot (or in the layout) blocks every route under that layout — decide _whether_ to render from data already in hand, and stream only the parts that need a fetch.
- Slots call `*.server.ts` loaders; they do not construct `EndatixApi` themselves.

### Server Helper Layer (`*.server.ts`)

- Server-only read-model loaders and helper orchestration
- Can live inside a slice (preferred) or feature root for shared server-only code
- Keep plain constants (logger names, revalidation paths) in a sibling `*.constants.ts`, not in the `server-only` module. Importing one string otherwise drags `@/auth` into every consumer — including client components and unit tests. Example: `features/platform-admin/tenant-management.constants.ts`.

### Data Fetching and State Management

#### Data Fetching (Server to Client)

For optimal performance and UX, prefer **streaming promises** from Server Components to Client Components. Use the React `use()` hook to unwrap these promises. This prevents blocking the initial render while data is being fetched.

**Recommended Pattern:**

1.  **Server Page/Component**: Initiate the fetch and pass the _promise_ (not the awaited result).
2.  **Context Provider (Client)**: Accept the promise as a prop and use `use(promise)` to resolve it.

```tsx
// features/my-feature/ui/my-feature.context.tsx (Client Component)
'use client';
import { createContext, use, useMemo } from 'react';

export function MyFeatureClientProvider({ children, dataPromise }) {
  const data = use(dataPromise); // Resolves via React Suspense
  const value = useMemo(() => ({ data }), [data]);
  return <MyContext value={value}>{children}</MyContext>;
}

// features/my-feature/ui/my-feature.provider.tsx (Server Component)
import { MyFeatureClientProvider } from './my-feature.context';

export function MyFeatureProvider({ children }) {
  const dataPromise = getMyData(); // Start fetching locally on server
  return (
    <MyFeatureClientProvider dataPromise={dataPromise}>
      {children}
    </MyFeatureClientProvider>
  );
}

// app/(main)/my-feature/page.tsx (Server Page)
export default async function Page() {
  return (
    <MyFeatureProvider>
      <MyFeatureComponent />
    </MyFeatureProvider>
  );
}
```

#### State Management & Interactions

Combine `use()` with `useReducer` and `useOptimistic` for features with complex interactions (like forms or AI assistants).

```tsx
// Example in FormAssistantProvider
export function FeatureProvider({ children, initialDataPromise }) {
  const initialData = initialDataPromise ? use(initialDataPromise) : defaultState;
  const [state, dispatch] = useReducer(reducer, initialData);
  const [optimisticState, setOptimisticState] = useOptimistic(state, (s, u) => ({ ...s, ...u }));

  const handleAction = async (payload) => {
    setOptimisticState({ isPending: true }); // Immediate UI feedback
    const result = await myServerAction(payload); // Next.js Server Action
    dispatch({ type: 'UPDATE', payload: result });
  };

  const value = useMemo(() => ({ state: optimisticState, handleAction }), [optimisticState]);
  return <MyContext value={value}>{children}</MyContext>;
}
```

#### Best Practices

- **Thin Providers**: Keep context providers focused on data sharing and state management.
- **Custom Hooks**: Expose context via hooks (e.g., `useAssetStorage`) to provide a clean API.
- **Server-Side Providers**: Use Server Component wrappers (like `AssetStorageProvider`) to orchestrate configuration and data fetching on the server.
- **Zero-Latency Orchestration**: By using Server Components for providers, we can pass _unresolved_ promises to the client. This allows the page to start streaming immediately while SAS tokens or other data are generated on the server, avoiding extra HTTP round-trips from the client.
- **Reference Implementations**:
  - `asset-storage.context.tsx`: Clean configuration streaming and client-side state.
  - `asset-storage.provider.tsx`: Server Component orchestration.
  - `form-assistant.context.tsx`: Complex state with optimistic updates and reducer.

More on this in the [Next.js Data Fetching Documentation](https://nextjs.org/docs/app/getting-started/fetching-data#streaming-data-with-the-use-hook).

## Naming Conventions

### Files & Folders

- **kebab-case**: `create-form.action.ts`, `view-forms-header/`
- **Functions**: `camelCase` → `createFormUseCase`
- **Classes/Types**: `PascalCase` → `CreateFormRequest`

### Files

- **Use-cases**: `{verb-noun}.use-case.ts` (optional)
- **Actions**: `{verb-noun}.action.ts`
- **Server-only helpers**: `{verb-noun}.server.ts`
- **Hooks**: `use-{noun}.hook.ts`
- **Components**: `{feature-name}-{purpose}.tsx`

## App Folder Structure

```
app/
├── (main)/                    # Main application routes
│   ├── dashboard/
│   ├── forms/
│   ├── settings/
│   └── ...
├── (public)/                  # Public routes
│   ├── share/
│   └── ...
├── api/                       # API routes
├── globals.css
└── layout.tsx
```

**Keep `/app` focused on Next.js routing only - no business logic.**

## Package Structure Guidelines

### When to Create a Package

- **Multiple consumers** - Used by multiple apps/projects
- **Independent versioning** - Can be versioned separately
- **Clear API boundaries** - Well-defined public interface
- **No framework coupling** - Not tied to Next.js/React

### Package.json Structure

```json
{
  "name": "@endatix/api-client",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.js"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### Workspace Configuration

```json
// package.json (root)
{
  "workspaces": ["apps/*", "packages/*"]
}
```

## Guidelines

1. **Start with a slice** - Create `{verb-noun}/` and co-locate action, UI, tests, and exports
2. **Keep actions thin** - Wrap API calls and orchestration, move complex logic to helpers/use-case files
3. **Co-locate related code** - Keep slice internals inside the slice folder
4. **Use slice exports first** - Import from `features/{name}/{verb-noun}` before feature-level barrels
5. **Move to lib/ when reusable** - Extract to lib/ when used across projects
6. **Move to packages/ when publishable** - Extract to packages/ when ready for npm
7. **Document Architecture Updates** - Any new architectural items, patterns, or cross-cutting features discovered during planning or development must be documented in a dedicated `ARCHITECTURE.md` file in the root of the project.

## Package Evolution Path

### Current Structure

```
hub/
├── lib/                    # Internal utilities
│   ├── endatix-api/       # API client (internal)
│   ├── localization/      # Multi-lingual domain (catalog, submission locale, future i18n)
│   └── utils/             # Shared utilities
├── features/              # App-specific features
│   ├── config/            # App configuration
│   ├── auth/              # Auth business logic
│   └── forms/             # Form management
└── packages/              # Future workspace packages
```

### `lib/localization` domain

Use `lib/localization` for **cross-feature multi-lingual infrastructure**, organized as slices:

| Slice                | Responsibility                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog/`           | SurveyJS ↔ owned catalog vocabulary (`default` ↔ `""` / runtime default code), culture-code normalize/validate, `toCatalogLocales`, display names |
| `submission-locale/` | Submission metadata language helpers shared by submissions UI and pdf-export                                                                      |
| `routing/` (future)  | Locale-prefixed Hub routes / middleware                                                                                                           |
| `messages/` (future) | Hub UI copy catalogs (e.g. next-intl)                                                                                                             |

Keep **selection policy** in the owning feature (e.g. public-form language picker priority: preselected → localStorage → survey model → browser). Do not move feature-specific preference storage or init order into `lib/`.

Import from `@/lib/localization` (root barrel) or a slice path such as `@/lib/localization/catalog`.

### Target Monorepo Structure

```
endatix-saas/
├── apps/
│   └── hub/               # Next.js application
└──packages/
    ├── @endatix/api-client/    # API client package
    ├── @endatix/ui/            # UI components package
    ├── @endatix/config/        # Configuration package
    └── @endatix/utils/         # Utilities package
```

### Migration Steps

1. **lib/endatix-api/** → **packages/@endatix/api-client/**
   - Includes shared list wire helpers (`SortRequest`, `DateRangeFilter`, `list-query.ts`, `query-params.ts`, `paged-response.ts`). Keep new sort/range contract code in `lib/endatix-api/shared` until that extract; do not place it under `features/` or `lib/date-utils` (formatters). `lib/endatix-api/themes/` is the reference module shape for the extract.
2. **lib/utils/** → **packages/@endatix/utils/**
3. **features/config/** → **packages/@endatix/config/**
4. **features/auth/** → Keep in apps/hub/features/auth/ (app-specific)
