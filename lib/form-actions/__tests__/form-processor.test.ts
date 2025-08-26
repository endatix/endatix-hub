import { describe, it, expect } from "vitest";
import { createFormProcessor } from "../form-processor";
import { ResetPasswordRequestSchema } from "../../endatix-api/account/types";
import { ChangePasswordRequestSchema } from "../../endatix-api/my-account/types";

// Mock FormData for testing
class MockFormData {
  private data = new Map<string, string>();

  constructor(initialData?: Record<string, string>) {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        this.data.set(key, value);
      });
    }
  }

  get(key: string): string | null {
    return this.data.get(key) || null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  entries(): IterableIterator<[string, string]> {
    return this.data.entries();
  }
}

describe("FormProcessor", () => {
  describe("Key Extraction", () => {
    it("should extract keys from ResetPasswordRequestSchema", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      }) as unknown as FormData;

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data).toEqual({
          email: "test@example.com",
          resetCode: "123456",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        });
      }
    });

    it("should extract keys from ChangePasswordRequestSchema", () => {
      const formData = new MockFormData({
        currentPassword: "OldPass123!",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ChangePasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data).toEqual({
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        });
      }
    });

    it("should handle partial form data", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        // Missing other fields
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        expect(validationResult.error.issues).toHaveLength(3); // missing resetCode, newPassword, confirmPassword
      }
    });
  });

  describe("Zod Integration", () => {
    it("should validate ResetPasswordRequestSchema with matching passwords", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(true);
    });

    it("should fail ResetPasswordRequestSchema validation with mismatched passwords", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "DifferentPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        expect(fieldErrors.confirmPassword).toContain("Passwords do not match");
      }
    });

    it("should validate ChangePasswordRequestSchema with matching passwords", () => {
      const formData = new MockFormData({
        currentPassword: "OldPass123!",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ChangePasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(true);
    });

    it("should fail ChangePasswordRequestSchema validation with mismatched passwords", () => {
      const formData = new MockFormData({
        currentPassword: "OldPass123!",
        newPassword: "NewPass123!",
        confirmPassword: "DifferentPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ChangePasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        expect(fieldErrors.confirmPassword).toContain("Passwords do not match");
      }
    });

    it("should handle email validation in ResetPasswordRequestSchema", () => {
      const formData = new MockFormData({
        email: "invalid-email",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        expect(fieldErrors.email).toBeDefined();
      }
    });
  });

  describe("Form State Management", () => {
    it("should provide form state with extracted data", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );

      expect(processor.formState).toEqual({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });
    });

    it("should provide error state for validation failures", () => {
      const formData = new MockFormData({
        email: "invalid-email",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "DifferentPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const errorState = processor.toErrorState();

      expect(errorState.isSuccess).toBe(false);
      expect(errorState.formErrors).toBeDefined();
      expect(errorState.errors).toBeDefined();
      expect(errorState.formState).toEqual({
        email: "invalid-email",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "DifferentPass123!",
      });
    });

    it("should provide success state for valid data", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const errorState = processor.toErrorState();

      // When validation succeeds, toErrorState should still return the form state
      expect(errorState.formState).toEqual({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty form data", () => {
      const formData = new MockFormData({});

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      // When FormData is empty, all schema keys are extracted with null values
      expect(processor.formState).toEqual({
        email: null,
        resetCode: null,
        newPassword: null,
        confirmPassword: null,
      });
    });

    it("should handle form data with extra fields", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
        extraField: "should-be-ignored",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        // Extra fields should not be included in the validated data
        expect(validationResult.data).not.toHaveProperty("extraField");
      }
    });

    it("should handle null/undefined form data values", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      // Simulate FormData.get returning null for some fields
      const originalGet = formData.get.bind(formData);
      formData.get = (key: string) => {
        if (key === "resetCode") return null;
        return originalGet(key);
      };

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const validationResult = processor.validationResult();

      expect(validationResult.success).toBe(false);
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        expect(fieldErrors.resetCode).toBeDefined();
      }
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety with FormActionState", () => {
      const formData = new MockFormData({
        email: "test@example.com",
        resetCode: "123456",
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

      const processor = createFormProcessor(
        formData,
        ResetPasswordRequestSchema,
      );
      const errorState = processor.toErrorState();

      // This should compile without type errors
      expect(errorState.formState?.email).toBe("test@example.com");
      expect(errorState.errors).toBeDefined();
    });
  });
});
