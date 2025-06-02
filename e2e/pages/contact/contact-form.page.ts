import { Page, Locator, expect } from "@playwright/test";

export class ContactFormPage {
  // Locators
  private nameInput: Locator;
  private emailInput: Locator;
  private messageInput: Locator;
  private sendButton: Locator;

  constructor(private page: Page) {
    this.nameInput = page.locator('div[data-name="name"] input');
    this.emailInput = page.locator('div[data-name="email"] input');
    this.messageInput = page.locator("div[data-name='message'] textarea");

    this.sendButton = page.locator("input[type='button'][value='Send']");
  }

  async navigate() {
    await this.page.goto("/share/1266039221823471616");
    await this.sendButton.waitFor({ state: "visible" });
  }

  async fillContactForm({
    name,
    email,
    message,
  }: {
    name?: string;
    email?: string;
    message?: string;
  }) {
    if (name) {
      await this.nameInput.fill(name);
    }
    if (email) {
      await this.emailInput.fill(email);
    }
    if (message) {
      await this.messageInput.fill(message);
    }
  }

  async submitForm() {
    await this.sendButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectFormSubmitted(name: string) {
    await expect(this.nameInput).toBeHidden();
    await expect(this.emailInput).toBeHidden();
    await expect(this.messageInput).toBeHidden();
    await expect(this.sendButton).toBeHidden();
    await expect(
      this.page.locator(`text=Thank you, ${name}, for reaching out to us!`),
    ).toBeVisible();

    return true;
  }

  async expectValidationErrors() {
    await expect(this.nameInput).toHaveAttribute("aria-invalid", "true", {
      timeout: 2000,
    });
    await expect(this.emailInput).toHaveAttribute("aria-invalid", "true", {
      timeout: 2000,
    });
    await expect(this.messageInput).toHaveAttribute("aria-invalid", "true", {
      timeout: 2000,
    });

    // Alternative way to check - look for required fields that are empty
    await expect(this.nameInput).toBeEmpty();
    await expect(this.emailInput).toBeEmpty();
    await expect(this.messageInput).toBeEmpty();
  }
}
