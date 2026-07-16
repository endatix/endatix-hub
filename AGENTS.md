# Hub Agent Guidance

## Architecture

- Keep Hub features organized as vertical slices under `features/{feature}/{verb-noun}/`.
- Put reusable cross-feature utilities in `lib/`; keep feature-specific business logic inside the owning feature slice.
- Keep `app/` routing-focused. Data mutations should flow through server actions.

## Server Actions

- Server action files must use `"use server"` and return `Result<T>` for operation outcomes.
- Keep actions thin: authenticate, authorize, call the API or use case, revalidate paths when needed, and return a typed result.
- For Endatix API calls returning `ApiResult<T>`, use `toResult(...)` from `lib/result/map-api-result-to-result` instead of hand-writing `Result.error(...)` from API errors. Existing `mapToResult(...)` usage is equivalent, but prefer `toResult(...)` for new code.
- Pass `fallbackMessage`, `logMessage`, and `loggerName` when unexpected API failures should be logged. The mapper preserves expected user/action failures without noisy error logs.
- When API success payload differs from the UI result payload, use the mapper's `mapData` option or keep the success return local and delegate only the failure branch to the mapper.

## Endatix IDs

- Treat C# `long` IDs from Endatix entities as strings in Hub types and UI state. The API serializes these IDs as strings to avoid JavaScript number precision loss.
- Do not coerce Endatix IDs through `Number(...)`, `parseInt(...)`, or numeric Zod schemas. Keep values as strings from API DTOs through server actions and route/query params.
- Before using an Endatix ID in an API path, server action payload, or security-sensitive lookup, validate it with `validateEndatixId(...)` or `createEndatixIdSchema(...)` from `lib/utils/type-validators.ts` to reduce attack surface.

## Server Pages

- Keep `app/` pages mostly orchestration-focused: parse route/search params, start independent data work early, and pass typed data into UI components.
- Prefer streaming slow, independent page sections with `Suspense` boundaries instead of blocking the whole route when partial rendering improves UX.
- For streamed sections, pass stable promises into the section and unwrap them with React `use()` in the receiving component when that keeps the route file thin.
- Use `Promise.all` for independent data dependencies. Await sequentially only when a later call depends on an earlier result.
- For server page calls to the Endatix API, convert `ApiResult<T>` with `toResult(...)` so unexpected operational failures are logged consistently and expected invalid/not-found states can map to page-specific fallback UI.

## Error Handling

- Preserve API-provided user-facing messages, validation errors, and error codes through the shared result mappers.
- Use `parseZodError()` or `ServerActionState.fromZodError()` for Zod validation failures in form actions.
- Do not log expected user/action failures such as validation, authentication, or authorization failures as application errors.
- Use `TelemetryLogger` for unexpected operational failures. Only log safe scalar attributes; never log tokens, cookies, raw request bodies, field values, or raw API detail strings.

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
