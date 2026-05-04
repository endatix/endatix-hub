# Endatix Public API (Browser)

This library contains browser-safe API clients intended for public/runtime integrations.

## Direction

- No dependency on Next.js server constructs (`auth`, `cookies`, server actions).
- No implicit session usage.
- Auth token can be supplied either:
  - once at client construction (`accessToken`), or
  - per request (`formAccessJwt`) for override/rotation scenarios.
- Stable endpoint-focused contracts to simplify future npm extraction.

## Current modules

- Root client:
  - `createEndatixPublicApi({ baseUrl?, accessToken? })`
  - `api.dataLists.search(...)`
  - `api.dataLists.getDisplayValues(...)`
- `data-lists`
  - `createPublicDataListsClient({ baseUrl?, accessToken? })`
  - `search(...)`
  - `getDisplayValues(...)`

## Auth usage example

```ts
const api = createEndatixPublicApi({
  baseUrl: 'https://api.example.com',
  accessToken: formAccessJwt,
});

await api.dataLists.search({
  formId,
  dataListId,
  query: 'bul',
});
```

Per-request token still works and takes precedence over constructor `accessToken`.

## Intended evolution

1. Keep runtime/public calls here.
2. Keep authenticated admin/creator API in `hub/lib/endatix-api` (server-first).
3. Extract this folder to a workspace package (`packages/endatix-public-api`) when contract stabilizes.
