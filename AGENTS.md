# Hub Agent Guidance

## Architecture

- Keep Hub features organized as vertical slices under `features/{feature}/{verb-noun}/`.
- Put reusable cross-feature utilities in `lib/`; keep feature-specific business logic inside the owning feature slice.
- Keep `app/` routing-focused. Data mutations should flow through server actions.

## Server Actions

- Server action files must use `"use server"` and return `Result<T>` for operation outcomes.
- Keep actions thin: authenticate, authorize, call the API or use case, revalidate paths when needed, and return a typed result.
- For Endatix API calls returning `ApiResult<T>`, use `mapApiResultToResult(...)` from `lib/result/map-api-result-to-result` instead of hand-writing `Result.error(...)` from API errors.
- When API success payload differs from the UI result payload, use `mapSuccess` or keep the success return local and delegate only the failure branch to the mapper.

## Error Handling

- Preserve API-provided user-facing messages, validation errors, and error codes through the shared result mappers.
- Use `parseZodError()` or `ServerActionState.fromZodError()` for Zod validation failures in form actions.
- Do not log expected user/action failures such as validation, authentication, or authorization failures as application errors.
- Use `TelemetryLogger` for unexpected operational failures. Only log safe scalar attributes; never log tokens, cookies, raw request bodies, field values, or raw API detail strings.

## UI Feedback

- Client UI should display messages returned by `Result<T>` or `ServerActionState`.
- Reserve error toasts for non-recoverable failures and prefer inline validation for recoverable form errors.
