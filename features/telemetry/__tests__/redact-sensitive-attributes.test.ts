import { describe, expect, it } from "vitest";
import {
  REDACTED,
  redactSensitiveAttributes,
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
});
