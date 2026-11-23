import { randomUUID } from "node:crypto";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";
import { RequestCookiesAdapter } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { expect, it, vi } from "vitest";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import { recordCapture } from "@/test/stubs/posthog-capture";
import { FormTokenCookieStore } from "../../infrastructure/cookie-store";
import { submitFormOperation } from "../submit-form-operation";

vi.mock("@/features/auth", () => ({ getSession: async () => ({}) }));

it("reports a refused public-form save without creating a person or disclosing the link token", async () => {
  // Arrange
  const capture = await recordCapture();
  vi.stubEnv("ENDATIX_BASE_URL", "http://127.0.0.1:9");
  const refusal = ApiResult.validationError(
    "Refused",
    ERROR_CODE.TOKEN_EXPIRED,
  );
  vi.spyOn(EndatixApi.prototype, "patch").mockResolvedValueOnce(refusal);
  const cookies = RequestCookiesAdapter.seal(new RequestCookies(new Headers()));
  const signature = randomUUID();
  const linkToken = `submission-123.1893456000.s.${signature}`;

  // Act
  const result = await submitFormOperation(
    "123",
    { jsonData: "{}", isComplete: false },
    new FormTokenCookieStore(cookies),
    linkToken,
  );
  await capture.client.flush();

  // Assert
  expect(result).toMatchObject({
    error: { message: "This link has expired." },
  });
  expect(capture.onError).not.toHaveBeenCalled();
  const events = capture.events();
  expect(events).toMatchObject([
    {
      event: "$exception",
      properties: {
        formId: "123",
        $exception_list: [{ value: "This link has expired." }],
      },
      options: { process_person_profile: false },
    },
  ]);
  expect(JSON.stringify(events)).not.toContain(signature);
});
