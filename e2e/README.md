# End-to-End Testing

This directory contains Playwright-based end-to-end tests for the Endatix Hub application.

## Test Structure

```
e2e/
├── pages/           # Page Object Model classes
├── tests/           # Test specifications
│   ├── smoke/       # Smoke tests for production monitoring
│   ├── embed/       # Embed form tests
│   ├── lists/       # Paged list paging (issue #1011)
│   └── contact/     # Feature-specific tests
├── utils/           # Test helper functions
└── README.md        # This file
```

## Running Tests

### All Tests (Excludes Smoke Tests)

```bash
cd hub
pnpm test:e2e
```

### Embed Tests Only

```bash
cd hub
pnpm test:e2e --grep "Embed Form"
```

### Debug Mode

```bash
# Run with UI
pnpm test:e2e --ui
# or
pnpm test:e2e --debug
```

## Embed Tests

### Prerequisites

1. If you are running tests for the first time, install Playwright browsers: `pnpm exec playwright install`
2. Start the dev server: `pnpm dev` (runs on port 3000 by default)
3. Configure environment variables in `.env` file (see below)

### Environment Variables

Playwright loads environment variables from `.env` files. Create a `.env` file in the `hub/` directory with your test configuration:

```bash
# hub/.env (gitignored)
BASE_URL="http://localhost:3000"
E2E_EMBED_FORM_ID=1480919870399840256
# E2E_EMBED_HOST_URL=   # optional; see AGENTS.md → Embed SDK

# For smoke tests (production)
SMOKE_TEST_EMAIL="your-test-email@example.com"
SMOKE_TEST_PASSWORD="your-password"
SMOKE_TEST_BASE_URL="https://hub.endatix.com"
```

| Variable              | Description                                                           | Default                   |
| --------------------- | --------------------------------------------------------------------- | ------------------------- |
| `E2E_EMBED_FORM_ID`   | Form ID to use for embed tests                                        | `1480919870399840256`     |
| `E2E_EMBED_HOST_URL`  | Optional. Host-page contract: [`AGENTS.md`](../AGENTS.md) → Embed SDK | unset                     |
| `BASE_URL`            | Base URL for the app                                                  | `http://localhost:3000`   |
| `SMOKE_TEST_EMAIL`    | Test account email for smoke tests                                    | -                         |
| `SMOKE_TEST_PASSWORD` | Test account password for smoke tests                                 | -                         |
| `SMOKE_TEST_BASE_URL` | Production URL for smoke tests                                        | `https://hub.endatix.com` |

### What Embed Tests Verify

Host page vs iframe document, playground env, and fill-mode: [`AGENTS.md`](../AGENTS.md) → Embed SDK.

- Survey questions render
- Navigation between pages works
- Complete button appears on the final page

## Paged List Tests

`tests/lists/list-paging.spec.ts` is the browser-level net for paging (endatix-hub#1011). For each
list it clicks **Go to next page**, checks the URL changed without a full reload, checks the pager did not move, then reloads
and checks the rows match a fresh server render of the same URL. That catches a grid stuck on page 1
and index-keyed rows whose cells keep page 1 values. A second test checks the users search box
keeps focus while the grid reloads.

```bash
# hub/.env (gitignored)
E2E_EMAIL="admin@example.com"       # falls back to SMOKE_TEST_EMAIL
E2E_PASSWORD="..."                  # falls back to SMOKE_TEST_PASSWORD
E2E_PAGING_FORM_ID=1480919870399840256   # a form with more than 10 submissions
```

Lists open with `pageSize=1`, so 2 rows per list are enough. A list with a single page is skipped
with a "seed at least 2 pages" note, not passed. Admin lists need a platform admin account.

Run: `pnpm test:e2e --grep "Paged lists"`.

## Screen-out

`tests/screen-out/screen-out.spec.ts` checks the customer age-gate path. `utils/screen-out-api.ts`
creates the form and the on-behalf submission. The browser only opens the share link or an iframe.

```bash
# hub/.env
E2E_EMAIL="admin@example.com"          # falls back to SMOKE_TEST_EMAIL
E2E_API_URL="https://localhost:5001/api"   # optional; falls back to ENDATIX_API_URL
# Trust the local .NET dev cert. Set before Playwright starts. Do not disable TLS checks.
# NODE_EXTRA_CA_CERTS=$HOME/.aspnet/https/aspnetapp.pem
# E2E_EMBED_HOST_URL=http://localhost:5000   # iframe path; HTTPS :5001 cannot load HTTP Hub embed.js
```

Keep the password out of `.env`. On macOS, store it in the login keychain. The helper reads the
service `endatix-hub-e2e` when `E2E_PASSWORD` is unset. Quote the value because `#` starts a comment
in `.env`.

```bash
security add-generic-password -U -a e2e -s endatix-hub-e2e -w
# type the password, then press Return
```

The iframe case opens WebHost `/dev/embed-host?view=bare` with `formId`, `hubBaseUrl`, and `token`
(see `AGENTS.md` → Embed SDK). The URL token is a share access token with `submit`, not the hex
on-behalf token. Do not load `/share` inside a hand-built iframe. Survey clicks stay inside
`.sd-root-modern` so they do not hit the Next.js dev toolbar.

### Names

Group by how the form is opened: `share` or `iframe`. The test name is the scenario, in this order:

`{visibility} {limit?} {respondent} {what changes}`

| Token      | Values                                                        | When to omit                                                                                            |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| visibility | `public`, `private`                                           | Never. It is always part of the name.                                                                   |
| limit      | `one-per-user`                                                | When the form allows many submissions per person. Omission means many. Do not write "one-per-user off". |
| respondent | `logged-in-respondent`, `anonymous-user`, `with-access-token` | Never. These tests open a share link, so they are `with-access-token`.                                  |

`public` and `one-per-user` do not combine. A public form cannot limit to one submission per user.

```bash
pnpm test:e2e --grep "Screen-out"
pnpm exec playwright show-report
```

A green run is the Playwright summary and the HTML report. Each test annotates its `formId`, then
deletes the form. A failure leaves that form in Hub and appends `{ formId, recordedAt }` to
gitignored `e2e/.screen-out-kept.json`. Set `E2E_KEEP_DATA=1` to keep forms even when the test passes.

### API client

1. Now: `utils/screen-out-api.ts` imports `EndatixApi` from `hub/lib/endatix-api` and passes `baseUrl`
   plus the login token. Playwright loads `hub/tsconfig.json`, so the client's `@/` imports resolve.
   Do not import `hub/services/api.ts`. That module calls `getSession()` and `redirect()`.
2. Next: publish that client as the `endatix-api` npm package. E2e and other runners depend on the
   package instead of `hub/lib`.
3. Then a CLI on that package. Verification, scripts, and people call the same commands (`login`,
   create a form, on-behalf create, read `collectionStatus`). A CLI is deterministic and runs in CI.
   It is the better phase 2 than growing a second HTTP client.
4. Rebuild [endatix-mcp](https://github.com/endatix/endatix-mcp) as a thin tool layer on the package,
   only when an agent needs those commands. The repo last moved in June 2025. Its tools are form
   create/update and submission generate/get. JWT auth is marked unfinished. It has no on-behalf
   create and no collection status. Do not evolve that server first. It would fork the client again.

## Smoke Tests

### Purpose

Smoke tests are lightweight, fast tests that verify critical functionality is working in production. They run automatically on schedule or manually to detect issues early.

### Current Smoke Tests

- **Auth Smoke Test**: Validates authentication flow using individual page objects (sign-in → access protected resources → sign-out)

### Running Smoke Tests Locally

```bash
cd hub
pnpm test:e2e:smoke
```

Note: Ensure `SMOKE_TEST_EMAIL`, `SMOKE_TEST_PASSWORD`, and `SMOKE_TEST_BASE_URL` are set in your `.env` file (see Environment Variables section above).
