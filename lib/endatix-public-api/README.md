# Endatix Public API (Browser)

This library contains browser-safe API clients intended for public/runtime integrations.

## Direction

- No dependency on Next.js server constructs (`auth`, `cookies`, server actions).
- No implicit session/JWT usage.
- Explicit auth context is passed in request DTOs (`token`, `tokenType`).
- Stable endpoint-focused contracts to simplify future npm extraction.

## Current modules

- `data-lists`
  - `search(...)`
  - `getDisplayValues(...)`

## Intended evolution

1. Keep runtime/public calls here.
2. Keep authenticated admin/creator API in `hub/lib/endatix-api` (server-first).
3. Extract this folder to a workspace package (`packages/endatix-public-api`) when contract stabilizes.
