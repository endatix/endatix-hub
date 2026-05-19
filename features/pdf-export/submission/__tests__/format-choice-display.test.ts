import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import {
  formatChoiceDisplay,
  resolveChoiceLabelForQuestion,
  resolveItemValueLabel,
} from "../format-choice-display";
import { ItemValue } from "survey-core";

const { mockAuth, mockCreateFormAccessToken } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreateFormAccessToken: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  class MockEndatixApi {
    forms = {
      createFormAccessToken: mockCreateFormAccessToken,
    };
    constructor(_accessToken?: string) {}
  }
  return {
    ...actual,
    EndatixApi: MockEndatixApi,
  };
});

const mockGetDisplayValues = vi.fn();
vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: vi.fn(() => ({
    dataLists: {
      getDisplayValues: mockGetDisplayValues,
      search: vi.fn(),
    },
  })),
}));

import { primeDataListDisplayValues } from "@/lib/survey-features/data-lists/infrastructure/prime-data-list-display-values";

describe("formatChoiceDisplay", () => {
  it("shows label and value when they differ", () => {
    expect(formatChoiceDisplay("us", "United States")).toBe(
      "United States (us)",
    );
  });

  it("shows value only when label matches value", () => {
    expect(formatChoiceDisplay("us", "us")).toBe("us");
  });

  it("shows value only when label is missing", () => {
    expect(formatChoiceDisplay("us", undefined)).toBe("us");
  });

  it("returns empty string for empty value", () => {
    expect(formatChoiceDisplay("", "Label")).toBe("");
  });
});

describe("resolveItemValueLabel", () => {
  it("prefers text over title", () => {
    const item = new ItemValue({ value: "1", text: "One" });
    expect(resolveItemValueLabel(item)).toBe("One");
  });
});

describe("resolveChoiceLabelForQuestion", () => {
  beforeEach(() => {
    registerDataListGlobals();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "hub-token" });
    mockCreateFormAccessToken.mockResolvedValue({
      success: true,
      data: { token: "form-jwt", expiresAtUtc: "2030-01-01T00:00:00.000Z" },
    });
    mockGetDisplayValues.mockResolvedValue({
      success: true,
      data: [{ value: "18", label: "Option Eighteen" }],
    });
  });

  it("uses display values after primeDataListDisplayValues", async () => {
    const model = new Model({
      elements: [
        {
          type: "dropdown",
          name: "question4",
          choicesLazyLoadEnabled: true,
          [DATA_LIST_PROPERTY_NAME]: "1501536548095524864",
        },
      ],
    });
    model.data = { question4: 18 };
    const question = model.getQuestionByName(
      "question4",
    ) as QuestionDropdownModel;

    await primeDataListDisplayValues(model, "form-1");

    expect(resolveChoiceLabelForQuestion(question)).toBe("Option Eighteen");
    expect(
      formatChoiceDisplay(
        question.value,
        resolveChoiceLabelForQuestion(question),
      ),
    ).toBe("Option Eighteen (18)");
  });
});
