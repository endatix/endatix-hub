import { Page, Locator, expect } from "@playwright/test";

export class ContactFormPage {
  // Locators
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly messageInput: Locator;
  private readonly companyInput: Locator;
  private readonly industrySelect: Locator;
  private readonly sendButton: Locator;

  constructor(private page: Page) {
    this.nameInput = page.locator('div[data-name="name"] input');
    this.emailInput = page.locator('div[data-name="email"] input');
    this.messageInput = page.locator("div[data-name='message'] textarea");
    this.companyInput = page.locator('div[data-name="company"] input');
    this.industrySelect = page.locator(
      'div[data-name="industry"] div.sd-selectbase',
    );
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
    company,
    industry,
  }: {
    name?: string;
    email?: string;
    message?: string;
    company?: string;
    industry?: string;
    contactMethod?: string;
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
    if (company) {
      await this.companyInput.fill(company);
    }
    if (industry) {
      await this.industrySelect.click();
      const option = this.industrySelect.locator(`div[title="${industry}"]`).first();
      await option.waitFor({ state: "visible", timeout: 2000 });
      await option.click();
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
    await expect(this.companyInput).toBeHidden();
    await expect(this.industrySelect.locator("input")).toBeHidden();
    await expect(this.sendButton).toBeHidden();
    await expect(
      this.page.locator(
        `text=Thank you for your message. We will get back to you shortly.`,
      ),
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
    await expect(this.industrySelect.locator("input")).toHaveAttribute(
      "aria-invalid",
      "true",
      {
        timeout: 2000,
      },
    );

    // Alternative way to check - look for required fields that are empty
    await expect(this.nameInput).toBeEmpty();
    await expect(this.emailInput).toBeEmpty();
    await expect(this.messageInput).toBeEmpty();
    await expect(this.companyInput).toBeEmpty();
    await expect(this.industrySelect.locator("input")).toBeEmpty();
  }
}
