# Test utilities

- **test-utils.tsx** — `renderSurveyJsComponent()` for SurveyJS class components. Use for protected view components (e.g. asset-storage protected file preview). Prefer `vi.mock("survey-react-ui", async (importOriginal) => { const React = await import("react"); ... })` with `function`/`class` for constructor mocks (Vitest 4).

- **mock-next.ts** — Factories for Next.js mocks: `createNextNavigationMock()`, `createAuthMock()`, `createNextHeadersMock()`. Use the returned object inside your `vi.mock("next/navigation", () => ({ ... }))` (or copy the shape) for consistent next/auth and next/navigation mocks. Note: `vi.mock` is hoisted, so you cannot reference imported helpers inside the factory; use inline mocks or copy the shapes from these helpers.

- **mock-endatix-api.ts** — `createEndatixApiMock(instanceOverrides?)` returns `{ EndatixApi }` for `vi.mock("@/lib/endatix-api", ...)`. Use async factory so the helper can be dynamic-imported: `vi.mock("@/lib/endatix-api", async () => { const { createEndatixApiMock } = await import("@/__tests__/utils/mock-endatix-api"); return createEndatixApiMock(); })`. Default instance includes `users.list`, `auth`, `myAccount`, `submissions.public` stubs. For partial mock (keep ApiResult, types), spread over `importOriginal()` then add `...createEndatixApiMock()`.

- **mock-fetch.ts** — `setupFetchMock()` returns a `vi.fn()` and stubs `global.fetch`. Call in `beforeEach` when testing code that uses `fetch`, then use `vi.mocked(fetch)` for assertions.

## Azure / storage-style tests (vi.hoisted + dynamic SUT import)

When testing a module that reads `process.env` at load time or uses a singleton (e.g. Azure Blob client), use:

1. **`vi.hoisted()` for shared mock instances** — Define mock objects (e.g. `blockBlobClient`, `containerClient`, `blobServiceClient`) inside `vi.hoisted(() => ({ ... }))` so they exist before `vi.mock()` runs and are available both inside the mock factory and in test blocks. Wire default happy-path behaviour once (e.g. `uploadData: vi.fn().mockResolvedValue(undefined)`). In individual tests that need failures, use `.mockRejectedValueOnce()` or `.mockReturnValueOnce()` on the hoisted mock; `vi.clearAllMocks()` in `beforeEach` clears call history so the next test gets the default again.

2. **Single SUT import helper** — Use one helper that returns the dynamic import of the system under test, e.g. `const loadStorageService = () => import("../../infrastructure/storage-service");`. In tests, call `const { uploadToStorage, ... } = await loadStorageService();`. This avoids repeating `await import(...)` everywhere and makes it clear that the module is re-imported after env changes (e.g. after `vi.resetModules()` and setting `process.env` in `beforeEach`).

Reference: `hub/features/asset-storage/__tests__/infrastructure/storage-service.test.ts`.
