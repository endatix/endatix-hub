import { describe, it, expect, vi } from "vitest";
import { generateUniqueFileName } from "../utils";
import { Result, ErrorType } from "@/lib/result";

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid-123"),
}));

describe("generateUniqueFileName", () => {
  it("should generate unique filename with extension", () => {
    // Act
    const result = generateUniqueFileName("test.jpg");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.jpg");
    }
  });

  it("should generate unique filename with multiple dots in name", () => {
    // Act
    const result = generateUniqueFileName("my.file.name.pdf");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.pdf");
    }
  });

  it("should generate unique filename with complex extension", () => {
    // Act
    const result = generateUniqueFileName("document.tar.gz");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.gz");
    }
  });

  it("should return validation error when fileName is empty", () => {
    // Act
    const result = generateUniqueFileName("");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName is undefined", () => {
    // Act
    const result = generateUniqueFileName(undefined as unknown as string);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName is null", () => {
    // Act
    const result = generateUniqueFileName(null as unknown as string);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File name is required");
    }
  });

  it("should return validation error when fileName has no extension", () => {
    // Act
    const result = generateUniqueFileName("filename");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should handle filename starting with dot", () => {
    // Act
    const result = generateUniqueFileName(".hidden");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.hidden");
    }
  });

  it("should return validation error when fileName is just a dot", () => {
    // Act
    const result = generateUniqueFileName(".");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should return validation error when fileName is multiple dots", () => {
    // Act
    const result = generateUniqueFileName("...");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file.",
      );
    }
  });

  it("should handle filename with spaces", () => {
    // Act
    const result = generateUniqueFileName("my file name.txt");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });

  it("should handle filename with special characters", () => {
    // Act
    const result = generateUniqueFileName("file@#$%^&*().docx");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.docx");
    }
  });

  it("should handle very long filename", () => {
    const longFileName = "a".repeat(100) + ".txt";

    // Act
    const result = generateUniqueFileName(longFileName);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });

  it("should handle filename with unicode characters", () => {
    // Act
    const result = generateUniqueFileName("файл.txt");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("mock-uuid-123.txt");
    }
  });
});
