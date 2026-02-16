import { describe, it, expect, vi } from "vitest";
import { UploadFileEvent } from "survey-creator-core";
import { Question, SurveyModel } from "survey-core";
import { resolveQuestionName } from "@/features/asset-storage/use-cases/upload-content-files/use-content-upload.hook";

vi.mock("survey-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("survey-core")>();
  class MockBase extends actual.Base {
    getPropertyValue(name: string): unknown {
      return name === "name" ? "question1" : undefined;
    }
    override get uniqueId(): number {
      return 1;
    }
  }
  return { ...actual, Base: MockBase };
});

describe("resolveQuestionName", () => {
  it("should return propertyName when elementType is 'propertyName' (survey model)", async () => {
    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: new SurveyModel(),
      elementType: "propertyName",
      propertyName: "logo",
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("logo");
  });

  it("should return question name when element is a Question with name property", () => {
    const mockQuestion = {
      name: "myQuestion",
    } as unknown as Question;

    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: mockQuestion,
      elementType: "question",
      propertyName: "myQuestion",
      question: mockQuestion,
    };

    expect(resolveQuestionName(options)).toBe("myQuestion");
  });

  it("should use getPropertyValue when element is Base without direct name property", async () => {
    const { Base } = await import("survey-core");
    const baseElement = new Base();

    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: baseElement,
      elementType: "element",
      propertyName: "question1",
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("question1");
  });

  it("should return N/A when element is missing", () => {
    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: undefined as unknown as Question,
      elementType: "question",
      propertyName: "test",
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("N/A");
  });

  it("should return N/A when elementType is missing", () => {
    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: {} as Question,
      elementType: undefined as unknown as string,
      propertyName: "test",
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("N/A");
  });

  it("should return N/A when both element and elementType are missing", () => {
    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: undefined as unknown as Question,
      elementType: undefined as unknown as string,
      propertyName: undefined as unknown as string,
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("N/A");
  });

  it("should return uniqueId when element is Base without name property", async () => {
    const { Base } = await import("survey-core");
    const baseElement = new Base();
    Object.defineProperty(baseElement, "getPropertyValue", {
      value: () => null,
    });

    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: baseElement,
      elementType: "element",
      propertyName: undefined as unknown as string,
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("1");
  });

  it("should use element.name even when elementType is set but element has name", () => {
    const mockElement = {
      name: "directName",
      type: "mock",
    } as unknown as Question;

    const options: UploadFileEvent = {
      files: [],
      callback: vi.fn(),
      element: mockElement,
      elementType: "element",
      propertyName: "propertyName",
      question: undefined as unknown as Question,
    };

    expect(resolveQuestionName(options)).toBe("directName");
  });
});
