import { expect, test } from "@playwright/test";

const createSubmissionPayload = {
  jsonData: JSON.stringify({ q1: "answer" }),
  isComplete: true,
  currentPage: 0,
};

test.describe("Single submission enforcement", () => {
  test("blocks duplicate submission for non-test user", async ({ request }) => {
    // Arrange
    const apiBaseUrl = process.env.ENDATIX_API_URL;
    const formId = process.env.E2E_PRIVATE_FORM_ID;
    const nonTestToken = process.env.E2E_NON_TEST_USER_TOKEN;

    test.skip(!apiBaseUrl || !formId || !nonTestToken);

    const endpoint = `${apiBaseUrl}/forms/${formId}/submissions`;

    // Act
    await request.post(endpoint, {
      headers: { Authorization: `Bearer ${nonTestToken}` },
      data: createSubmissionPayload,
    });
    const duplicateResponse = await request.post(endpoint, {
      headers: { Authorization: `Bearer ${nonTestToken}` },
      data: createSubmissionPayload,
    });

    // Assert
    expect(duplicateResponse.status()).toBe(409);
  });

  test("allows duplicate submission for user with test permission", async ({ request }) => {
    // Arrange
    const apiBaseUrl = process.env.ENDATIX_API_URL;
    const formId = process.env.E2E_PRIVATE_FORM_ID;
    const testUserToken = process.env.E2E_TEST_USER_TOKEN;

    test.skip(!apiBaseUrl || !formId || !testUserToken);

    const endpoint = `${apiBaseUrl}/forms/${formId}/submissions`;

    // Act
    const firstResponse = await request.post(endpoint, {
      headers: { Authorization: `Bearer ${testUserToken}` },
      data: createSubmissionPayload,
    });
    const secondResponse = await request.post(endpoint, {
      headers: { Authorization: `Bearer ${testUserToken}` },
      data: createSubmissionPayload,
    });

    // Assert
    expect(firstResponse.ok()).toBeTruthy();
    expect(secondResponse.ok()).toBeTruthy();
  });
});
