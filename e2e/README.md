# End-to-End Testing

This directory contains Playwright-based end-to-end tests for the Endatix Hub application.

## Test Structure

```
e2e/
├── pages/           # Page Object Model classes
├── tests/           # Test specifications
│   ├── smoke/       # Smoke tests for production monitoring
│   └── contact/     # Feature-specific tests
├── utils/           # Test helper functions
└── README.md        # This file
```

## Smoke Tests

### Purpose
Smoke tests are lightweight, fast tests that verify critical functionality is working in production. They run automatically on schedule or manually to detect issues early.

### Current Smoke Tests
- **Auth Smoke Test**: Validates authentication flow using individual page objects (sign-in → access protected resources → sign-out)

### Running Smoke Tests Locally

```bash
cd hub
SMOKE_TEST_EMAIL="your-test-email@example.com" \
SMOKE_TEST_PASSWORD="your-test-password" \
SMOKE_TEST_BASE_URL="https://hub.endatix.com" \
pnpm test:e2e:smoke

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SMOKE_TEST_EMAIL` | Test account email | Yes |
| `SMOKE_TEST_PASSWORD` | Test account password | Yes |
| `SMOKE_TEST_BASE_URL` | Production URL to test | Yes |

## Running Tests

### All Tests (Excludes Smoke Tests)
```bash
cd hub
pnpm test:e2e
```

### Debug Mode
Add the `--debug` flag to the command to run the tests in debug mode or use the `--ui` flag to run the tests in interactive mode. Example:
```bash
# Run with UI
pnpm test:e2e --ui 
# or
pnpm test:e2e --debug
```