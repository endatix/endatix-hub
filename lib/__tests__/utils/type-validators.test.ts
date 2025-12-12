import { describe, expect, it } from "vitest";
import {
  validateEndatixId,
  validateHexToken,
} from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

describe("validateEndatixId", () => {
  describe("valid inputs", () => {
    it("should accept valid numeric string IDs", () => {
      const result = validateEndatixId("123", "formId");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("123");
      }
    });

    it("should accept large valid IDs within long range", () => {
      const largeId = "9223372036854775807"; // C# long.MaxValue
      const result = validateEndatixId(largeId, "formId");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(largeId);
      }
    });

    it("should accept minimum valid ID (1)", () => {
      const result = validateEndatixId("1", "formId");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("1");
      }
    });
  });

  describe("invalid inputs - empty or null", () => {
    it("should reject empty string", () => {
      const result = validateEndatixId("", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });

    it("should reject null", () => {
      const result = validateEndatixId(null as unknown as string, "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });

    it("should reject undefined", () => {
      const result = validateEndatixId(
        undefined as unknown as string,
        "formId",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });
  });

  describe("invalid inputs - wrong type", () => {
    it("should reject non-string types", () => {
      const result = validateEndatixId(123 as unknown as string, "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId must be a string");
      }
    });
  });

  describe("SSRF prevention - path traversal", () => {
    it("should reject path traversal with forward slash", () => {
      const result = validateEndatixId("123/../admin", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject path traversal with backslash", () => {
      const result = validateEndatixId(String.raw`123\..\admin`, "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject parent directory references", () => {
      const result = validateEndatixId("../../../internal", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject URLs with protocol", () => {
      const result = validateEndatixId("http://evil.com", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject non-numeric characters", () => {
      const result = validateEndatixId("abc123", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });
  });

  describe("invalid inputs - range validation", () => {
    it("should reject negative numbers (caught by regex pattern)", () => {
      const result = validateEndatixId("-123", "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        // Negative numbers are caught by the regex pattern first
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should accept zero (validator allows >= 0)", () => {
      // Note: The validator checks bigintId < 0, not bigintId <= 0
      // So zero is technically allowed. If this should be rejected,
      // the validator needs to be updated to check bigintId <= 0
      const result = validateEndatixId("0", "formId");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("0");
      }
    });

    it("should reject numbers exceeding long.MaxValue", () => {
      const tooLarge = "9223372036854775808"; // long.MaxValue + 1
      const result = validateEndatixId(tooLarge, "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be less than");
      }
    });

    it("should reject extremely large numbers", () => {
      const huge = "999999999999999999999999999999";
      const result = validateEndatixId(huge, "formId");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be less than");
      }
    });
  });

  describe("error messages", () => {
    it("should include parameter name in error messages", () => {
      const result = validateEndatixId("", "customParam");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("customParam");
      }
    });
  });
});

describe("validateHexToken", () => {
  describe("valid inputs", () => {
    it("should accept valid hex string tokens", () => {
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";
      const result = validateHexToken(token, "token");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept lowercase hex strings", () => {
      const token =
        "39abb6ca957e6df91c98d7d7975b2db082c13887dca6e03dfe1cdb0d61ab6a2e";
      const result = validateHexToken(token, "token");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept mixed case hex strings", () => {
      const token =
        "39AbB6Ca957E6Df91C98D7D7975B2Db082C13887DcA6E03DfE1CdB0D61Ab6A2E";
      const result = validateHexToken(token, "token");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept valid hex token with exact length requirement", () => {
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";
      const result = validateHexToken(token, "token", 64);
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept short hex strings when length not specified", () => {
      const token = "ABC123";
      const result = validateHexToken(token, "token");
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });
  });

  describe("invalid inputs - empty or null", () => {
    it("should reject empty string", () => {
      const result = validateHexToken("", "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });

    it("should reject null", () => {
      const result = validateHexToken(null as unknown as string, "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });

    it("should reject undefined", () => {
      const result = validateHexToken(undefined as unknown as string, "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });
  });

  describe("invalid inputs - wrong type", () => {
    it("should reject non-string types", () => {
      const result = validateHexToken(123 as unknown as string, "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token must be a string");
      }
    });
  });

  describe("SSRF prevention - path traversal", () => {
    it("should reject path traversal with forward slash", () => {
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E/../admin",
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject path traversal with backslash", () => {
      const result = validateHexToken(
        String.raw`39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E\..\admin`,
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject parent directory references", () => {
      const result = validateHexToken("../../../internal", "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject URL-encoded forward slash", () => {
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E%2Fadmin",
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain URL-encoded path traversal characters",
        );
      }
    });

    it("should reject URL-encoded backslash", () => {
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E%5Cadmin",
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain URL-encoded path traversal characters",
        );
      }
    });

    it("should reject URL-encoded parent directory", () => {
      const result = validateHexToken("39ABB6CA%2E%2Eadmin", "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain URL-encoded path traversal characters",
        );
      }
    });
  });

  describe("invalid inputs - non-hex characters", () => {
    it("should reject strings with non-hex characters", () => {
      const result = validateHexToken("39ABB6CA957E6DFG", "token");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });

    it("should reject strings with spaces", () => {
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E ",
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });

    it("should reject strings with special characters", () => {
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E!",
        "token",
      );
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });
  });

  describe("invalid inputs - length validation", () => {
    it("should reject token with incorrect length when length is specified", () => {
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";
      const result = validateHexToken(token, "token", 32);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 32 characters");
      }
    });

    it("should reject token that is too short when length is specified", () => {
      const token = "ABC123";
      const result = validateHexToken(token, "token", 64);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 64 characters");
      }
    });

    it("should reject token that is too long when length is specified", () => {
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E00";
      const result = validateHexToken(token, "token", 64);
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 64 characters");
      }
    });
  });

  describe("error messages", () => {
    it("should include parameter name in error messages", () => {
      const result = validateHexToken("", "customToken");
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("customToken");
      }
    });
  });

  describe("real-world token validation", () => {
    it("should accept a real 64-character submission token", () => {
      const realToken =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";
      const result = validateHexToken(realToken, "token", 64);
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(realToken);
        expect(result.value.length).toBe(64);
      }
    });
  });
});
