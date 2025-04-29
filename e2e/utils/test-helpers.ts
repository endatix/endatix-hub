import { Page } from '@playwright/test';

/**
 * Helper function to generate random test data
 */
export function generateTestData(traceToken?: string) {
  const traceText = traceToken || `${new Date().getTime()}`;
  return {
    name: `Test User ${traceText}`,
    email: `test-${traceText}@example.com`,
    message: `This is a test message generated. ${traceText}`,
  };
}

/**
 * Helper function to wait for network idle
 * Useful when waiting for form submissions to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Takes a screenshot with a meaningful name for debugging test failures
 */
export async function takeDebugScreenshot(page: Page, testName: string) {
  const timestamp = new Date().getTime();
  await page.screenshot({ 
    path: `./test-results/debug-${testName}-${timestamp}.png`,
    fullPage: true
  });
} 

/**
 * Helper function to get the FPSK cookie
 */
export async function getFpskCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find(cookie => cookie.name === 'FPSK');
}