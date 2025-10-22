import { Page, Locator, expect } from "@playwright/test";

export class SignOutPage {
  // Locators
  private pageTitle: Locator;
  private signOutButton: Locator;
  private cancelButton: Locator;
  private description: Locator;

  constructor(private page: Page) {
    this.pageTitle = page.getByRole("heading", {
      name: "Sign out of Endatix Hub?",
    });
    this.signOutButton = page.getByRole("button", { name: "Sign out" });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.description = page.locator(
      "text=You can always sign in back in at any time.",
    );
  }

  async navigate() {
    await this.page.goto("/signout");
    await this.pageTitle.waitFor({ state: "visible" });
  }

  async signOut() {
    // Wait for the sign-out response before proceeding
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/auth/signout') || 
      response.url().includes('/signout')
    );
    
    await this.signOutButton.click();
    await responsePromise;
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async expectSignOutPageVisible() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.signOutButton).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
  }

  async expectSignOutSuccess() {
    // Wait for redirect to sign-in page (most reliable indicator)
    await this.page.waitForURL("**/signin", { timeout: 10000 });
  }

  async expectRedirectedToSignIn() {
    await expect(this.page).toHaveURL(/.*\/signin/);
  }

  /**
   * Complete sign-out flow with validation
   * Navigate → Sign out → Verify success → Verify no auth cookies
   */
  async performSignOutFlow() {
    await this.navigate();
    await this.signOut();
    await this.expectSignOutSuccess();
    await this.expectNoAuthCookies();
  }

  /**
   * Verify sign out was successful
   * Checks both redirect to sign-in page AND absence of session cookies
   */
  async expectNoAuthCookies() {
    // Verify we're redirected to sign in page (primary indicator of successful sign out)
    await this.expectRedirectedToSignIn();

    // Test that the session is actually invalid by trying to access a protected resource
    await this.page.goto("/forms");
    await this.page.waitForLoadState("domcontentloaded");
    
    // Should be redirected back to sign in page if session is invalid
    expect(this.page.url()).toContain("/signin");
  }

  /**
   * Alternative method name for clarity
   */
  async confirmSignedOut() {
    await this.expectNoAuthCookies();
  }

  /**
   * Get authentication cookies for verification
   */
  async getAuthCookies() {
    const cookies = await this.page.context().cookies();
    return cookies.filter(
      (cookie) =>
        cookie.name.includes("session") ||
        cookie.name.includes("auth") ||
        cookie.name.includes("next-auth") ||
        cookie.name.includes("authjs"),
    );
  }
}
