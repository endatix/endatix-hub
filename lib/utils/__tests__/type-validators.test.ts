import { describe, expect, it } from "vitest";
import {
  validateEndatixId,
  validateHexToken,
} from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

describe("validateEndatixId", () => {
  describe("valid inputs", () => {
    it("should accept valid numeric string IDs", () => {
      // Act
      const result = validateEndatixId("123", "formId");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("123");
      }
    });

    it("should accept large valid IDs within long range", () => {
      // Arrange
      const largeId = "9223372036854775807"; // C# long.MaxValue

      // Act
      const result = validateEndatixId(largeId, "formId");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(largeId);
      }
    });

    it("should accept minimum valid ID (1)", () => {
      // Act
      const result = validateEndatixId("1", "formId");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("1");
      }
    });
  });

  describe("invalid inputs - empty or null", () => {
    it("should reject empty string", () => {
      // Act
      const result = validateEndatixId("", "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });

    it("should reject null", () => {
      // Act
      const result = validateEndatixId(null as unknown as string, "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });

    it("should reject undefined", () => {
      // Act
      const result = validateEndatixId(
        undefined as unknown as string,
        "formId",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId is required");
      }
    });
  });

  describe("invalid inputs - wrong type", () => {
    it("should reject non-string types", () => {
      // Act
      const result = validateEndatixId(123 as unknown as string, "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("formId must be a string");
      }
    });
  });

  describe("SSRF prevention - path traversal", () => {
    it("should reject path traversal with forward slash", () => {
      // Act
      const result = validateEndatixId("123/../admin", "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject path traversal with backslash", () => {
      // Act
      const result = validateEndatixId(String.raw`123\..\admin`, "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject parent directory references", () => {
      // Act
      const result = validateEndatixId("../../../internal", "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject URLs with protocol", () => {
      // Act
      const result = validateEndatixId("http://evil.com", "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject non-numeric characters", () => {
      // Act
      const result = validateEndatixId("abc123", "formId");

      // Assert
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
      // Act
      const result = validateEndatixId("-123", "formId");

      // Assert (negative numbers are caught by the regex pattern first)
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must be a numeric string containing only digits",
        );
      }
    });

    it("should reject numbers exceeding long.MaxValue", () => {
      // Arrange
      const tooLarge = "9223372036854775808"; // long.MaxValue + 1

      // Act
      const result = validateEndatixId(tooLarge, "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be less than");
      }
    });

    it("should reject extremely large numbers", () => {
      // Arrange
      const huge = "999999999999999999999999999999";

      // Act
      const result = validateEndatixId(huge, "formId");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be less than");
      }
    });
  });

  describe("error messages", () => {
    it("should include parameter name in error messages", () => {
      // Act
      const result = validateEndatixId("", "customParam");

      // Assert
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
      // Arrange
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";

      // Act
      const result = validateHexToken(token, "token");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept lowercase hex strings", () => {
      // Arrange
      const token =
        "39abb6ca957e6df91c98d7d7975b2db082c13887dca6e03dfe1cdb0d61ab6a2e";

      // Act
      const result = validateHexToken(token, "token");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept mixed case hex strings", () => {
      // Arrange
      const token =
        "39AbB6Ca957E6Df91C98D7D7975B2Db082C13887DcA6E03DfE1CdB0D61Ab6A2E";

      // Act
      const result = validateHexToken(token, "token");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept valid hex token with exact length requirement", () => {
      // Arrange
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";

      // Act
      const result = validateHexToken(token, "token", 64);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });

    it("should accept short hex strings when length not specified", () => {
      // Arrange
      const token = "ABC123";

      // Act
      const result = validateHexToken(token, "token");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(token);
      }
    });
  });

  describe("invalid inputs - empty or null", () => {
    it("should reject empty string", () => {
      // Act
      const result = validateHexToken("", "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });

    it("should reject null", () => {
      // Act
      const result = validateHexToken(null as unknown as string, "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });

    it("should reject undefined", () => {
      // Act
      const result = validateHexToken(undefined as unknown as string, "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token is required");
      }
    });
  });

  describe("invalid inputs - wrong type", () => {
    it("should reject non-string types", () => {
      // Act
      const result = validateHexToken(123 as unknown as string, "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("token must be a string");
      }
    });
  });

  describe("SSRF prevention - path traversal", () => {
    it("should reject path traversal with forward slash", () => {
      // Act
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E/../admin",
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject path traversal with backslash", () => {
      // Act
      const result = validateHexToken(
        String.raw`39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E\..\admin`,
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject parent directory references", () => {
      // Act
      const result = validateHexToken("../../../internal", "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain path separators or parent directory references",
        );
      }
    });

    it("should reject URL-encoded forward slash", () => {
      // Act
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E%2Fadmin",
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain URL-encoded path traversal characters",
        );
      }
    });

    it("should reject URL-encoded backslash", () => {
      // Act
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E%5Cadmin",
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain(
          "must not contain URL-encoded path traversal characters",
        );
      }
    });

    it("should reject URL-encoded parent directory", () => {
      // Act
      const result = validateHexToken("39ABB6CA%2E%2Eadmin", "token");

      // Assert
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
      // Act
      const result = validateHexToken("39ABB6CA957E6DFG", "token");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });

    it("should reject strings with spaces", () => {
      // Act
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E ",
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });

    it("should reject strings with special characters", () => {
      // Act
      const result = validateHexToken(
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E!",
        "token",
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be a valid hexadecimal string");
      }
    });
  });

  describe("invalid inputs - length validation", () => {
    it("should reject token with incorrect length when length is specified", () => {
      // Arrange
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";

      // Act
      const result = validateHexToken(token, "token", 32);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 32 characters");
      }
    });

    it("should reject token that is too short when length is specified", () => {
      // Arrange
      const token = "ABC123";

      // Act
      const result = validateHexToken(token, "token", 64);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 64 characters");
      }
    });

    it("should reject token that is too long when length is specified", () => {
      // Arrange
      const token =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E00";

      // Act
      const result = validateHexToken(token, "token", 64);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("must be exactly 64 characters");
      }
    });
  });

  describe("error messages", () => {
    it("should include parameter name in error messages", () => {
      // Act
      const result = validateHexToken("", "customToken");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("customToken");
      }
    });
  });

  describe("real-world token validation", () => {
    it("should accept a real 64-character submission token", () => {
      // Arrange
      const realToken =
        "39ABB6CA957E6DF91C98D7D7975B2DB082C13887DCA6E03DFE1CDB0D61AB6A2E";

      // Act
      const result = validateHexToken(realToken, "token", 64);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(realToken);
        expect(result.value.length).toBe(64);
      }
    });
  });
});
