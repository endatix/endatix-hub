import { describe, expect, it } from "vitest";
import {
  REDACTED,
  redactSensitiveAttributes,
  redactSensitiveText,
} from "../infrastructure/redact-sensitive-attributes";

describe("redactSensitiveAttributes", () => {
  it.each([
    "authorization",
    "Cookie",
    "accessToken",
    "client_secret",
    "password",
    "api-key",
    "x_api_key",
    "connectionString",
    "connection_string",
  ])("redacts %s", (key) => {
    expect(redactSensitiveAttributes({ [key]: "value" })).toEqual({
      [key]: REDACTED,
    });
  });

  it("keeps ordinary attributes and does not mutate the input", () => {
    // Arrange
    const attributes = {
      formId: "form-1",
      "http.status_code": 500,
      token: "t",
    };

    // Act
    const redacted = redactSensitiveAttributes(attributes);

    // Assert
    expect(redacted).toEqual({
      formId: "form-1",
      "http.status_code": 500,
      token: REDACTED,
    });
    expect(attributes.token).toBe("t");
  });

  it.each([true, 0, 3])(
    "keeps the %j diagnostic under a token-like key",
    (value) => {
      // Act & Assert
      expect(redactSensitiveAttributes({ hasToken: value })).toEqual({
        hasToken: value,
      });
    },
  );
});

describe("redactSensitiveText", () => {
  it.each([
    [
      "Failed https://acct.blob.core.windows.net/c/a.png?sv=2024-01-01&se=2026&sig=abc123",
      "Failed https://acct.blob.core.windows.net/c/a.png?sv=2024-01-01&se=2026&sig=[REDACTED]",
    ],
    [
      "https://b.s3.amazonaws.com/a?X-Amz-Credential=AKIA&X-Amz-Signature=deadbeef",
      "https://b.s3.amazonaws.com/a?X-Amz-Credential=[REDACTED]&X-Amz-Signature=[REDACTED]",
    ],
    ["token=abc&tab=1", "token=[REDACTED]&tab=1"],
    ["/callback?code=xyz&state=s1", "/callback?code=[REDACTED]&state=s1"],
    ["/forms?search=token", "/forms?search=token"],
  ])("redacts %j", (input, expected) => {
    // Act & Assert
    expect(redactSensitiveText(input)).toBe(expected);
  });

  it("is safe to apply twice", () => {
    // Arrange
    const once = redactSensitiveText("/a?sig=abc");

    // Act & Assert
    expect(redactSensitiveText(once)).toBe(once);
  });
});
