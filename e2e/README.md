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
Smoke tests are lightweight, fast tests that verify critical functionality is working in production. They run automatically every 30 minutes to detect issues early.

### Current Smoke Tests
- **Auth Smoke Test**: Validates authentication flow using individual page objects (sign-in → access protected resources → sign-out)

### Running Smoke Tests Locally

```bash
# Method 1: Using npm scripts (recommended)
cd hub
SMOKE_TEST_EMAIL="your-test-email@example.com" \
SMOKE_TEST_PASSWORD="your-test-password" \
SMOKE_TEST_BASE_URL="https://hub.endatix.com" \
pnpm test:e2e:smoke

# Method 2: Direct Playwright command
cd hub
SMOKE_TEST_EMAIL="your-test-email@example.com" \
SMOKE_TEST_PASSWORD="your-test-password" \
SMOKE_TEST_BASE_URL="https://hub.endatix.com" \
pnpm test:e2e --project=smoke-tests

# Method 3: Debug mode
cd hub
SMOKE_TEST_EMAIL="your-test-email@example.com" \
SMOKE_TEST_PASSWORD="your-test-password" \
SMOKE_TEST_BASE_URL="https://hub.endatix.com" \
pnpm test:e2e:smoke:debug
```

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

### Specific Test Suite
```bash
# Smoke tests only (excluded from main suite)
pnpm test:e2e:smoke

# Contact form tests
pnpm test:e2e tests/contact/
```

### Debug Mode
```bash
# Run with UI
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug
```

## GitHub Actions Integration : 
### TODO: REMOVE this section once we have a proper smoke test workflow

### Smoke Test Workflow
- **Schedule**: Every 30 minutes
- **Manual Trigger**: Available via GitHub Actions UI
- **Environment**: Production (for secret isolation)
- **Notifications**: Creates GitHub Issues on failure

### Required Secrets
Configure these secrets in your GitHub repository:

1. `SMOKE_TEST_EMAIL` - Test account email
2. `SMOKE_TEST_PASSWORD` - Test account password  
3. `SMOKE_TEST_BASE_URL` - Production URL (e.g., `https://hub.endatix.com`)

### Setting Up Secrets
1. Go to repository Settings → Secrets and variables → Actions
2. Create "Production" environment if it doesn't exist
3. Add the required secrets to the Production environment
4. Ensure the workflow has access to the Production environment

## Test Account Management

### Creating Test Account
1. Create a dedicated test account in production (e.g., `smoke-test@endatix.com`)
2. Use a strong, unique password
3. Ensure the account has necessary permissions to access protected resources
4. **Never use personal or admin accounts for testing**

### Updating Credentials
1. Update the test account password in production
2. Update the `SMOKE_TEST_PASSWORD` secret in GitHub
3. Test the workflow manually to ensure it works

## Interpreting Test Failures

### Common Failure Scenarios
1. **Authentication Failure**: Test account credentials may be invalid
2. **Network Issues**: Production may be down or slow
3. **UI Changes**: Selectors may need updating
4. **Permission Issues**: Test account may lack required permissions

### Debugging Steps
1. Check the [GitHub Actions logs](https://github.com/your-org/your-repo/actions)
2. Download test artifacts (screenshots, traces)
3. Run tests locally with the same credentials
4. Verify production is accessible manually

### Screenshots and Traces
- Screenshots are automatically captured on test failures
- Traces are available for debugging complex issues
- Artifacts are retained for 7 days

## Adding New Tests

### Page Object Pattern
Create page objects in `pages/` directory with flow methods:

```typescript
export class MyPage {
  constructor(private page: Page) {
    this.myElement = page.getByRole('button', { name: 'Submit' });
  }
  
  async doSomething() {
    await this.myElement.click();
  }

  // Complete flow with validation
  async performCompleteFlow(data: string) {
    await this.navigate();
    await this.fillForm(data);
    await this.submit();
    await this.expectSuccess();
  }
}
```

### Test Structure
Create test files in `tests/` directory:

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from '../../pages/my-page';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const myPage = new MyPage(page);
    // Test implementation
  });
});
```

## Best Practices

### Test Data
- Use environment variables for sensitive data
- Generate unique test data to avoid conflicts
- Clean up test data when possible

### Selectors
- Prefer data attributes over CSS classes
- Use semantic selectors when possible
- Avoid brittle selectors that change frequently

### Error Handling
- Use `takeDebugScreenshot` on test failures
- Include meaningful error messages
- Handle network timeouts gracefully

### Performance
- Keep tests fast and focused
- Avoid unnecessary waits
- Use appropriate timeouts for different environments

## Troubleshooting

### Common Issues

**Tests fail locally but pass in CI**
- Check environment variables
- Verify network connectivity
- Ensure all dependencies are installed

**Tests are flaky**
- Increase timeouts for slow operations
- Add proper waits for dynamic content
- Check for race conditions

**Selectors not found**
- Verify the page has loaded completely
- Check if selectors have changed
- Use browser dev tools to inspect elements

### Getting Help
- Check [Playwright documentation](https://playwright.dev/)
- Review existing test patterns in this codebase
- Create issues for test infrastructure problems
