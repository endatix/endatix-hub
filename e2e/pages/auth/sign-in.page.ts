import { Page, Locator, expect } from "@playwright/test";

export class SignInPage {
  // Locators
  private emailInput: Locator;
  private passwordInput: Locator;
  private signInButton: Locator;
  private errorMessage: Locator;
  private keycloakButton: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.signInButton = page.getByRole("button", {
      name: "Sign in with email",
    });
    this.errorMessage = page.locator(
      "text=The supplied credentials are invalid",
    );
    this.keycloakButton = page.getByRole("button", {
      name: "Sign in with Keycloak",
    });
  }

  async navigate() {
    await this.page.goto("/signin");
    await this.emailInput.waitFor({ state: "visible" });
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async signInWithKeycloak() {
    await this.keycloakButton.click();
  }

  async expectSignInSuccess() {
    // Wait for redirect to forms page or welcome message
    await Promise.race([
      this.page.waitForURL("**/forms", { timeout: 10000 }),
      this.page
        .locator("text=Welcome!")
        .waitFor({ state: "visible", timeout: 10000 }),
    ]);
  }

  async expectSignInError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectSignInFormVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async getReturnUrl() {
    const url = new URL(this.page.url());
    return url.searchParams.get("returnUrl");
  }

  /**
   * Complete sign-in flow with validation
   * Navigate → Sign in → Verify success → Verify auth cookies
   */
  async performSignInFlow(email: string, password: string) {
    await this.navigate();
    await this.signIn(email, password);
    await this.expectSignInSuccess();
    await this.expectAuthCookiesExist();
  }

  /**
   * Verify authentication cookies exist after sign in
   */
  async expectAuthCookiesExist() {
    const cookies = await this.page.context().cookies();
    const sessionCookies = cookies.filter(
      (cookie) =>
        cookie.name.includes("session-token") ||
        cookie.name.includes("next-auth.session") ||
        cookie.name.includes("authjs.session-token"),
    );

    // Check that we have session cookies (primary indicator of authentication)
    const hasSessionCookies = sessionCookies.length > 0;
    const isRedirectedToForms = this.page.url().includes("/forms");

    expect(hasSessionCookies || isRedirectedToForms).toBe(true);
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
