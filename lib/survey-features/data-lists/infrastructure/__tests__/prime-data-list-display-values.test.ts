import { Model, QuestionDropdownModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import {
  formatChoiceDisplay,
  resolveChoiceLabelForQuestion,
} from "@/features/pdf-export/submission/format-choice-display";

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

import { registerDataListGlobals } from "../registry";
import { primeDataListDisplayValues } from "../prime-data-list-display-values";

describe("primeDataListDisplayValues", () => {
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
      data: [{ value: "us", label: "United States" }],
    });
  });

  it("resolves labels via getChoiceDisplayValue for PDF choice rendering", async () => {
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "dropdown",
              name: "country",
              [DATA_LIST_PROPERTY_NAME]: "42",
            },
          ],
        },
      ],
    });
    model.data = { country: "us" };

    await primeDataListDisplayValues(model, "form-1");

    const question = model.getQuestionByName(
      "country",
    ) as QuestionDropdownModel;
    expect(mockCreateFormAccessToken).toHaveBeenCalledWith("form-1");
    expect(mockGetDisplayValues).toHaveBeenCalledWith({
      formId: "form-1",
      dataListId: "42",
      formAccessJwt: "form-jwt",
      values: ["us"],
    });
    expect(question.choicesLazyLoadEnabled).toBe(false);
    expect(resolveChoiceLabelForQuestion(question)).toBe("United States");
    expect(
      formatChoiceDisplay(
        question.value,
        resolveChoiceLabelForQuestion(question),
      ),
    ).toBe("United States (us)");
  });

  it("resolves lazy-load dropdown with numeric stored values", async () => {
    mockGetDisplayValues.mockResolvedValue({
      success: true,
      data: [{ value: "18", label: "Option Eighteen" }],
    });

    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "dropdown",
              name: "question4",
              choicesLazyLoadEnabled: true,
              [DATA_LIST_PROPERTY_NAME]: "1501536548095524864",
            },
          ],
        },
      ],
    });
    model.data = { question4: 18 };

    await primeDataListDisplayValues(model, "form-1");

    const question = model.getQuestionByName(
      "question4",
    ) as QuestionDropdownModel;
    expect(resolveChoiceLabelForQuestion(question)).toBe("Option Eighteen");
  });

  it("skips API calls when definition has no data lists", async () => {
    const model = new Model({
      pages: [{ elements: [{ type: "text", name: "q1" }] }],
    });

    await primeDataListDisplayValues(model, "form-1");

    expect(mockCreateFormAccessToken).not.toHaveBeenCalled();
    expect(mockGetDisplayValues).not.toHaveBeenCalled();
  });
});
