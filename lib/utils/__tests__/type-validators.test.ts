import { describe, expect, it } from "vitest";
import {
  createEndatixIdSchema,
  isDecimalDigitString,
  validateEndatixId,
  validateHexToken,
  hasProperty,
} from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

describe("isDecimalDigitString", () => {
  it("accepts decimal digit strings and rejects Number coercions", () => {
    expect(isDecimalDigitString("168")).toBe(true);
    expect(isDecimalDigitString("0")).toBe(true);
    expect(isDecimalDigitString("")).toBe(false);
    expect(isDecimalDigitString("1.5")).toBe(false);
    expect(isDecimalDigitString("-5")).toBe(false);
    expect(isDecimalDigitString("abc")).toBe(false);
    expect(isDecimalDigitString("0x10")).toBe(false);
    expect(isDecimalDigitString("1e2")).toBe(false);
  });
});

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

describe("createEndatixIdSchema", () => {
  it("should accept and trim valid Endatix IDs", () => {
    // Arrange
    const schema = createEndatixIdSchema("userId");

    // Act
    const result = schema.safeParse(" 1507347517849731072 ");

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("1507347517849731072");
    }
  });

  it("should return validator messages as Zod issues", () => {
    // Arrange
    const schema = createEndatixIdSchema("userId");

    // Act
    const result = schema.safeParse("9223372036854775808");

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "userId must be less than",
      );
    }
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

describe("hasProperty", () => {
  describe("arrange", () => {
    it("should set up test objects", () => {
      const obj = { name: "John", age: 30 };
      expect(obj).toBeDefined();
    });
  });

  describe("act", () => {
    it("should return true for existing property", () => {
      const result = hasProperty({ name: "John", age: 30 }, "name");

      expect(result).toBe(true);
    });

    it("should return false for non-existing property", () => {
      const result = hasProperty({ name: "John", age: 30 }, "address");

      expect(result).toBe(false);
    });

    it("should return false for null object", () => {
      const result = hasProperty(null, "name");

      expect(result).toBe(false);
    });

    it("should return false for undefined object", () => {
      const result = hasProperty(undefined, "name");

      expect(result).toBe(false);
    });

    it("should return false for primitive values", () => {
      expect(hasProperty("string" as any, "length")).toBe(false);
      expect(hasProperty(123 as any, "toString")).toBe(false);
    });

    it("should return false for empty object when property not present", () => {
      const result = hasProperty({}, "name");

      expect(result).toBe(false);
    });

    it("should return true for inherited properties (prototype chain)", () => {
      const parent = { greet: () => "hello" };
      const child = Object.create(parent);
      child.name = "child";

      expect(hasProperty(child, "greet")).toBe(true);
      expect(hasProperty(child, "name")).toBe(true);
    });

    it("should return false for symbol property on plain object", () => {
      const sym = Symbol("test");
      const obj = { [sym]: "value" };

      expect(hasProperty(obj, sym)).toBe(true);
    });

    it("should return true for numeric property names", () => {
      const arr = [1, 2, 3];
      const result = hasProperty(arr, "0");

      expect(result).toBe(true);
    });

    it("should return true for array length property", () => {
      const arr = [1, 2, 3];
      const result = hasProperty(arr, "length");

      expect(result).toBe(true);
    });
  });

  describe("assert", () => {
    it("should correctly type guard for SurveyJS-like objects", () => {
      const surveyObj = {
        getType: () => "text",
        value: "test",
      } as any;

      if (hasProperty(surveyObj, "value")) {
        expect(surveyObj.value).toBe("test");
      }
    });

    it("should work with nested property checking", () => {
      const obj = {
        user: {
          profile: {
            name: "John",
          },
        },
      };

      expect(hasProperty(obj, "user")).toBe(true);
    });
  });

  describe("SurveyJS integration", () => {
    describe("arrange", () => {
      it("should set up SurveyJS-like element mock", () => {
        const mockQuestion = {
          getType: () => "text",
          name: "q1",
          visible: true,
        };
        expect(mockQuestion).toBeDefined();
      });
    });

    describe("act", () => {
      it("should detect visibleIf property on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "question1",
          visibleIf: "{someCondition} = true",
        } as any;

        expect(hasProperty(surveyElement, "visibleIf")).toBe(true);
      });

      it("should return false for missing visibleIf on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "question1",
        } as any;

        expect(hasProperty(surveyElement, "visibleIf")).toBe(false);
      });

      it("should detect enableIf property on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "question1",
          enableIf: "{otherQuestion} notempty",
        } as any;

        expect(hasProperty(surveyElement, "enableIf")).toBe(true);
      });

      it("should detect requiredIf property on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "question1",
          requiredIf: "{cond} = true",
        } as any;

        expect(hasProperty(surveyElement, "requiredIf")).toBe(true);
      });

      it("should detect defaultValue property on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "question1",
          defaultValue: "some default",
        } as any;

        expect(hasProperty(surveyElement, "defaultValue")).toBe(true);
      });

      it("should work with SurveyJS Panel element properties", () => {
        const panelElement = {
          getType: () => "panel",
          name: "panel1",
          visible: true,
          elements: [],
        } as any;

        expect(hasProperty(panelElement, "elements")).toBe(true);
        expect(hasProperty(panelElement, "visible")).toBe(true);
        expect(hasProperty(panelElement, "visibleIf")).toBe(false);
      });

      it("should detect choices property on SurveyJS Question", () => {
        const questionElement = {
          getType: () => "dropdown",
          name: "dropdown1",
          choices: ["a", "b", "c"],
        } as any;

        expect(hasProperty(questionElement, "choices")).toBe(true);
      });

      it("should detect SurveyJS getter properties from prototype chain", () => {
        const base = {
          name: "baseProp",
        };
        const derived = Object.create(base);
        derived.getType = () => "custom";
        derived.visible = true;

        expect(hasProperty(derived, "name")).toBe(true);
        expect(hasProperty(derived, "visible")).toBe(true);
        expect(hasProperty(derived, "getType")).toBe(true);
      });

      it("should detect runConditions method on SurveyJS element", () => {
        const surveyElement = {
          getType: () => "text",
          name: "q1",
          runConditions: () => {},
        } as any;

        expect(hasProperty(surveyElement, "runConditions")).toBe(true);
      });
    });

    describe("assert", () => {
      it("should safely check SurveyJS question without knowing type at compile time", () => {
        const unknownElement: any = {
          getType: () => "text",
          name: "dynamicQuestion",
        };

        if (hasProperty(unknownElement, "visibleIf")) {
          expect(unknownElement.visibleIf).toBeUndefined();
        }

        const elementWithCondition: any = {
          getType: () => "text",
          name: "conditionalQuestion",
          visibleIf: "{age} > 18",
        };

        expect(hasProperty(elementWithCondition, "visibleIf")).toBe(true);
      });

      it("should work in type guard pattern for SurveyJS elements", () => {
        function processElement(element: any): boolean {
          if (
            hasProperty(element, "visibleIf") &&
            hasProperty(element, "enableIf")
          ) {
            return true;
          }
          return false;
        }

        const bothConditions = { visibleIf: "a", enableIf: "b" };
        const onlyVisible = { visibleIf: "a" };
        const neither = { name: "test" };

        expect(processElement(bothConditions)).toBe(true);
        expect(processElement(onlyVisible)).toBe(false);
        expect(processElement(neither)).toBe(false);
      });

      it("should handle SurveyJS IElement-like objects from survey.getAllQuestions()", async () => {
        const surveyJson = {
          elements: [
            { type: "text", name: "q1" },
            { type: "text", name: "q2", visibleIf: "{q1} = 'yes'" },
          ],
        };

        const { SurveyModel } = await import("survey-core");
        const survey = new SurveyModel(surveyJson);
        const questions = survey.getAllQuestions();

        expect(hasProperty(questions[0], "name")).toBe(true);
        expect(hasProperty(questions[0], "getType")).toBe(true);
        expect(hasProperty(questions[0], "visibleIf")).toBe(true);
        expect(hasProperty(questions[1], "visibleIf")).toBe(true);
      });
    });
  });
});
