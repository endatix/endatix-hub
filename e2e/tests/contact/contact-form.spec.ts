import { expect, test } from "@playwright/test";
import { ContactFormPage } from "../../pages/contact/contact-form.page";
import {
  generateTestData,
  takeDebugScreenshot,
  getFpskCookie,
} from "../../utils/test-helpers";

test.describe("Contact Form Submission", () => {
  let contactFormPage: ContactFormPage;

  test.beforeEach(async ({ page }) => {
    contactFormPage = new ContactFormPage(page);
    await contactFormPage.navigate();
  });

  test("should successfully submit a contact form with all required fields", async ({
    page,
  }) => {
    // Arrange
    const testData = generateTestData("valid_user");

    // Act & Assert
    await contactFormPage.fillContactForm(testData);

    // Assert that the FPSK cookie exists
    const fpskCookie = await getFpskCookie(page);
    expect(
      fpskCookie !== undefined,
      "FPSK for partial submission should exist",
    );

    await contactFormPage.submitForm();

    try {
      await contactFormPage.expectFormSubmitted(testData.name);
    } catch (error) {
      await takeDebugScreenshot(page, "contact-form-submission-failed");
      throw error;
    }
  });

  test("should display validation errors when submitting without required fields", async ({
    page,
  }) => {
    // Act
    await contactFormPage.fillContactForm({
      name: undefined,
      email: undefined,
      message: undefined,
    });
    await contactFormPage.submitForm();

    // Assert
    try {
      await contactFormPage.expectValidationErrors();
    } catch (error) {
      await takeDebugScreenshot(page, "contact-form-validation-failed");
      throw error;
    }
  });
});
