import { test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { FormsPage } from "../../pages/forms/forms.page";
import { SignOutPage } from "../../pages/auth/sign-out.page";
import { takeDebugScreenshot } from "../../utils/test-helpers";

test.describe("Auth Smoke Test", () => {
  let signInPage: SignInPage;
  let formsPage: FormsPage;
  let signOutPage: SignOutPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    formsPage = new FormsPage(page);
    signOutPage = new SignOutPage(page);
  });

  test("should successfully authenticate and access protected resources", async ({
    page,
  }) => {
    // Arrange
    const email = process.env.SMOKE_TEST_EMAIL;
    const password = process.env.SMOKE_TEST_PASSWORD;

    if (!email || !password) {
      test.skip();
    }

    try {
      // Sign in : act and assert
      await signInPage.performSignInFlow(email!, password!);

      // Forms page : act and assert
      await formsPage.navigate();
      await formsPage.expectPageAccessible();

      // Sign out : act and assert
      await signOutPage.performSignOutFlow();
    } catch (error) {
      await takeDebugScreenshot(page, "auth-smoke-test-failed");
      throw error;
    }
  });
});
