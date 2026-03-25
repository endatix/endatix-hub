# End-to-End Testing

This directory contains Playwright-based end-to-end tests for the Endatix Hub application.

## Test Structure

```
e2e/
├── pages/           # Page Object Model classes
├── tests/           # Test specifications
│   ├── smoke/       # Smoke tests for production monitoring
│   ├── embed/       # Embed form tests
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

# For smoke tests (production)
SMOKE_TEST_EMAIL="your-test-email@example.com"
SMOKE_TEST_PASSWORD="your-password"
SMOKE_TEST_BASE_URL="https://hub.endatix.com"
```

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_EMBED_FORM_ID` | Form ID to use for embed tests | `1480919870399840256` |
| `BASE_URL` | Base URL for the app | `http://127.0.0.1:3000` |
| `SMOKE_TEST_EMAIL` | Test account email for smoke tests | - |
| `SMOKE_TEST_PASSWORD` | Test account password for smoke tests | - |
| `SMOKE_TEST_BASE_URL` | Production URL for smoke tests | `https://hub.endatix.com` |

### What Embed Tests Verify
- Form loads in embed mode at `/embed/{formId}`
- Survey questions are rendered correctly
- Navigation between pages works
- Complete button appears on final page

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