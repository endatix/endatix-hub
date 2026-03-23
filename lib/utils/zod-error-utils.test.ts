import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseZodError, ServerActionState } from "./zod-error-utils";

describe("zod-error-utils", () => {
  describe("parseZodError", () => {
    it("should correctly parse and flatten a ZodError and return state", () => {
      // Arrange
      const schema = z.object({
        username: z.string().min(3, { error: "Too short" }),
        age: z.number().min(18, { error: "Must be adult" }),
      });
      const rawData = { username: "a", age: 10 };
      const result = schema.safeParse(rawData);

      // Act
      if (result.success) throw new Error("Expected parsing to fail");
      const parsed = ServerActionState.fromZodError(result.error, rawData);

      // Assert
      expect(parsed.isSuccess).toBe(false);
      expect(parsed.formErrors).toBeUndefined();
      expect(parsed.errors).toEqual({
        username: ["Too short"],
        age: ["Must be adult"],
      });
      expect(parsed.data).toEqual(rawData);
    });

    it("should correctly parse deep nested ZodErrors", () => {
      // Arrange
      const schema = z.object({
        user: z.object({
          firstName: z.string().min(2, { error: "Too short" }),
          lastName: z.string().min(2, { error: "Too short" }),
        }),
        tags: z.array(z.string().min(3, { error: "Tag too short" })),
      });
      const rawData = {
        user: { firstName: "A", lastName: "B" },
        tags: ["a", "valid"],
      };
      const result = schema.safeParse(rawData);

      // Act
      if (result.success) throw new Error("Expected parsing to fail");
      const parsed = parseZodError(result.error);

      // Assert
      expect(parsed.message).toBe("Validation failed");
      expect(parsed.formErrors).toEqual([]);
      expect(parsed.fields).toEqual({
        user: {
          firstName: ["Too short"],
          lastName: ["Too short"],
        },
        tags: {
          0: ["Tag too short"],
        },
      });
    });

    it("should handle custom root level form errors", () => {
      // Arrange
      const schema = z
        .object({
          password: z.string(),
          confirm: z.string(),
        })
        .refine((data) => data.password === data.confirm, {
          error: "Passwords don't match", // Root level error
        });
      const result = schema.safeParse({ password: "abc", confirm: "def" });

      // Act
      if (result.success) throw new Error("Expected parsing to fail");
      const parsed = parseZodError(result.error);

      // Assert
      expect(parsed.message).toBe("Passwords don't match");
      expect(parsed.formErrors).toEqual(["Passwords don't match"]);
      expect(parsed.fields).toBeDefined();
    });

    it("should handle unexpected empty or missing paths defensively", () => {
      // Arrange
      const mockError = new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Root error",
        },
        {
          code: "custom",
          path: ["field"],
          message: "Field error",
        },
        {
          code: "custom",
          path: undefined as any, // Simulating a malformed issue
          message: "Missing path error",
        },
      ]);

      // Act
      const parsed = parseZodError(mockError);

      // Assert
      expect(parsed.formErrors).toEqual(["Root error", "Missing path error"]);
      expect(parsed.fields).toEqual({ field: ["Field error"] });
    });

    it("should protect against prototype pollution", () => {
      // Arrange
      const mockError = new z.ZodError([
        {
          code: "custom",
          path: ["__proto__", "polluted"],
          message: "Pollution attempt",
        },
        {
          code: "custom",
          path: ["constructor", "prototype", "polluted"],
          message: "Pollution attempt 2",
        },
        {
          code: "custom",
          path: ["normalField"],
          message: "Normal error",
        },
      ]);

      // Act
      const parsed = parseZodError(mockError);

      // Assert
      expect(parsed.fields).toEqual({ normalField: ["Normal error"] });
      // Ensure the prototype was not polluted
      expect(({} as any).polluted).toBeUndefined();
    });

    it("should handle mixed array and object paths correctly", () => {
      // Arrange
      const mockError = new z.ZodError([
        {
          code: "custom",
          path: ["users", 0, "name"],
          message: "Name required",
        },
        {
          code: "custom",
          path: ["users", 0, "age"],
          message: "Age required",
        },
        {
          code: "custom",
          path: ["settings", "theme"],
          message: "Invalid theme",
        },
      ]);

      // Act
      const parsed = parseZodError(mockError);

      // Assert
      expect(parsed.fields).toEqual({
        users: {
          0: {
            name: ["Name required"],
            age: ["Age required"],
          },
        },
        settings: {
          theme: ["Invalid theme"],
        },
      });
    });
  });

  describe("ServerActionState", () => {
    describe("emptyState", () => {
      it("should create an empty state with undefined values", () => {
        // Act
        const state = ServerActionState.emptyState();

        // Assert
        expect(state.isSuccess).toBeUndefined();
        expect(state.message).toBeUndefined();
        expect(state.data).toBeUndefined();
        expect(state.formErrors).toBeUndefined();
        expect(state.errors).toBeUndefined();
      });

      it("should create an empty state with provided data", () => {
        // Arrange
        const data = { email: "test@example.com" };

        // Act
        const state = ServerActionState.emptyState(data);

        // Assert
        expect(state.isSuccess).toBeUndefined();
        expect(state.message).toBeUndefined();
        expect(state.data).toEqual(data);
        expect(state.formErrors).toBeUndefined();
        expect(state.errors).toBeUndefined();
      });
    });
  });
});
