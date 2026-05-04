# Endatix Public API (Browser)

Browser-safe API clients for public/runtime integrations. Lives under `hub/lib/endatix-api/public/` so it can share the same `ApiResult`, `ApiErrorType`, problem-details parsing, and HTTP error mapping as the server-side `EndatixApi` while remaining isolated from Node-only code (sessions, server actions).

## Direction

- No dependency on Next.js server constructs (`auth`, `cookies`, server actions).
- No implicit session usage.
- Auth token can be supplied either:
  - once at client construction (`accessToken`), or
  - per request (`formAccessJwt`) for override/rotation scenarios.
- Shares the unified `ApiResult` / `ApiErrorType` from `endatix-api/shared/api-result` so callers handle errors identically across client/server.

## Folder layout

```
endatix-api/
├── shared/                          shared (browser-safe) primitives
│   ├── api-result.ts                ApiResult + ApiErrorType (single source of truth)
│   ├── error-codes.ts               canonical error codes + friendly messages
│   ├── problem-details.ts           Zod-based RFC7807 parser
│   └── http-error-mapper.ts         mapResponseToApiError (used by every client)
└── public/                          browser-safe public surface (this folder)
    ├── endatix-public-api.ts        EndatixPublicApi root
    ├── index.ts                     browser barrel
    ├── data-lists/                  public data list client
    └── forms/                       form-access JWT client (Hub BFF)
```

## Current modules

- Root client:
  - `createEndatixPublicApi({ baseUrl?, accessToken? })`
  - `api.dataLists.search(...)`
  - `api.dataLists.getDisplayValues(...)`
- `data-lists`:
  - `createPublicDataListsClient({ baseUrl?, accessToken? })`
  - `search(...)`
  - `getDisplayValues(...)`
- `forms`:
  - `createFormAccessToken(formId, body)` (calls Hub BFF `/api/public/v0/forms/{formId}/access-tokens`)
  - `buildFormAccessTokenBody(state)` (helper for legacy URL/session token mapping)

## Auth usage example

```ts
import { createEndatixPublicApi } from '@/lib/endatix-api/public';

const api = createEndatixPublicApi({
  baseUrl: 'https://api.example.com',
  accessToken: formAccessJwt,
});

const result = await api.dataLists.search({
  formId,
  dataListId,
  query: 'bul',
});

if (result.success) {
  // result.data is fully typed
} else {
  // result.error.type is ApiErrorType
}
```

Per-request `formAccessJwt` still works and takes precedence over the constructor-level `accessToken`.

## Why a `public/` folder instead of a separate package

- Same problem-details, status -> error mapping, and `ApiResult` shape across server and browser.
- The Node `EndatixApi` class is the only module that imports `SessionData` from `@/features/auth`; it sits at the `endatix-api` root, not inside `public/`. Browser bundles importing only `@/lib/endatix-api/public` (or its sub-paths) will not pull in the Node client.
- Future workspace extraction is still possible: `public/` is self-contained except for shared types in `endatix-api/shared/`, which can be moved alongside it when the contract stabilizes.

## Boundary rules

Files under `endatix-api/public/**` MUST NOT import from:

- `@/lib/endatix-api/endatix-api` (Node-only `EndatixApi` class)
- `@/lib/endatix-api/index` (Node-only barrel that re-exports `EndatixApi`)
- `@/features/auth` (server-only session helpers)

This keeps the Node/browser boundary explicit at the folder level, even before any tooling enforces it.
