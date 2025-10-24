import { Page, Locator, expect } from "@playwright/test";

export class FormsPage {
  // Locators
  private pageTitle: Locator;
  private createFormButton: Locator;
  private formsList: Locator;
  private navigation: Locator;

  constructor(private page: Page) {
    this.pageTitle = page.locator("h1");
    this.createFormButton = page.getByRole("button", { name: /create|new/i });
    this.formsList = page.locator(
      "[data-testid='forms-list'], .forms-list, table",
    );
    this.navigation = page.locator("nav");
  }

  async navigate() {
    await this.page.goto("/forms");
    await this.page.waitForLoadState("networkidle");
  }

  async expectPageAccessible() {
    await expect(this.page).toHaveURL(/.*\/forms/);
    await expect(this.pageTitle).toHaveText("Forms");
  }

  async expectCreateFormButtonVisible() {
    await expect(this.createFormButton).toBeVisible();
  }

  async expectFormsListVisible() {
    await expect(this.formsList).toBeVisible();
  }

  async clickCreateForm() {
    await this.createFormButton.click();
  }

  async expectNavigationVisible() {
    await expect(this.navigation).toBeVisible();
  }

  async getPageTitle() {
    return await this.pageTitle.textContent();
  }
}
