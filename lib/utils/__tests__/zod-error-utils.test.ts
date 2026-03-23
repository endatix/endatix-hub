import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  flattenFieldErrors,
  parseZodError,
  ServerActionState,
} from "../zod-error-utils";

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

  describe("flattenFieldErrors", () => {
    it("should flatten already flat objects", () => {
      const out = flattenFieldErrors({
        email: ["Email required"],
        password: ["Password required"],
      });

      expect(out).toEqual({
        email: ["Email required"],
        password: ["Password required"],
      });
    });

    it("should flatten deeply nested objects with dot paths", () => {
      const out = flattenFieldErrors({
        user: {
          firstName: ["Too short"],
          lastName: ["Too short"],
        },
      });

      expect(out).toEqual({
        "user.firstName": ["Too short"],
        "user.lastName": ["Too short"],
      });
    });

    it("should flatten array-index shaped objects", () => {
      const out = flattenFieldErrors({
        tags: {
          0: ["Tag too short"],
          2: ["Tag too short"],
        },
      });

      expect(out).toEqual({
        "tags.0": ["Tag too short"],
        "tags.2": ["Tag too short"],
      });
    });

    it("should protect against prototype pollution", () => {
      const out = flattenFieldErrors({
        __proto__: { polluted: ["should not leak"] },
        normalField: ["ok"],
      });

      expect(out).toEqual({
        normalField: ["ok"],
      });
      expect(({} as any).polluted).toBeUndefined();
    });

    it("should handle deeply nested objects (3+ levels)", () => {
      const out = flattenFieldErrors({
        user: {
          profile: {
            address: {
              city: ["City required"],
              country: ["Country required"],
            },
          },
        },
      });

      expect(out).toEqual({
        "user.profile.address.city": ["City required"],
        "user.profile.address.country": ["Country required"],
      });
    });

    it("should handle leaf nodes with multiple errors", () => {
      const out = flattenFieldErrors({
        email: ["Email is required", "Invalid email format"],
        password: ["Password too short"],
      });

      expect(out).toEqual({
        email: ["Email is required", "Invalid email format"],
        password: ["Password too short"],
      });
    });

    it("should handle deeply nested leaf nodes with multiple errors", () => {
      const out = flattenFieldErrors({
        user: {
          profile: {
            bio: ["Too short", "Contains forbidden words"],
          },
        },
      });

      expect(out).toEqual({
        "user.profile.bio": ["Too short", "Contains forbidden words"],
      });
    });

    it("should handle mixed nested depths in the same object", () => {
      const out = flattenFieldErrors({
        a: {
          b: {
            c: ["Deep error"],
          },
        },
        d: ["Shallow error"],
        e: {
          f: ["Medium error"],
        },
      });

      expect(out).toEqual({
        "a.b.c": ["Deep error"],
        d: ["Shallow error"],
        "e.f": ["Medium error"],
      });
    });

    it("should handle arrays of objects with deep nesting", () => {
      const out = flattenFieldErrors({
        users: {
          0: {
            profile: {
              name: ["Name required"],
            },
          },
          1: {
            profile: {
              name: ["Name required"],
            },
          },
        },
      });

      expect(out).toEqual({
        "users.0.profile.name": ["Name required"],
        "users.1.profile.name": ["Name required"],
      });
    });

    it("should handle prefix parameter correctly", () => {
      const out = flattenFieldErrors(
        {
          name: ["Required"],
          email: ["Invalid"],
        },
        "form",
      );

      expect(out).toEqual({
        "form.name": ["Required"],
        "form.email": ["Invalid"],
      });
    });

    it("should handle prefix with nested objects", () => {
      const out = flattenFieldErrors(
        {
          user: {
            firstName: ["Required"],
          },
        },
        "data",
      );

      expect(out).toEqual({
        "data.user.firstName": ["Required"],
      });
    });

    it("should handle empty fieldErrors object", () => {
      const out = flattenFieldErrors({});

      expect(out).toEqual({});
    });

    it("should handle undefined fieldErrors", () => {
      const out = flattenFieldErrors(undefined);

      expect(out).toEqual({});
    });

    it("should handle nested objects with null values gracefully", () => {
      const out = flattenFieldErrors({
        user: null as any,
        name: ["Required"],
      });

      expect(out).toEqual({
        name: ["Required"],
      });
    });

    it("should handle deeply nested mixed with arrays and multiple errors", () => {
      const out = flattenFieldErrors({
        company: {
          departments: {
            0: {
              employees: {
                0: {
                  name: ["Required", "Too short"],
                  role: ["Invalid role"],
                },
              },
            },
          },
        },
      });

      expect(out).toEqual({
        "company.departments.0.employees.0.name": ["Required", "Too short"],
        "company.departments.0.employees.0.role": ["Invalid role"],
      });
    });

    it("should handle constructor and prototype keys in nested objects", () => {
      const out = flattenFieldErrors({
        user: {
          constructor: ["Should be filtered"],
          normal: ["Valid error"],
        },
      } as any);

      expect(out).toEqual({
        "user.normal": ["Valid error"],
      });
    });
  });
});
