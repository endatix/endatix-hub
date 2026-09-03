import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, SurveyModel } from "survey-core";
import { Result } from "@/lib/result";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { registerDataListCatalogLazyChoiceProvider } from "../data-list-catalog-lazy-choice-provider";
import {
  clearPropertyGridLazyChoiceProvidersForTests,
  dispatchPropertyGridChoiceDisplayValues,
  dispatchPropertyGridChoicesLazyLoad,
} from "../property-grid-lazy-choice-registry";

const { mockSearch, mockGetById } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockGetById: vi.fn(),
}));

vi.mock("@/features/data-lists/search-data-lists-for-picker", () => ({
  searchDataListsForPickerAction: mockSearch,
}));
vi.mock(
  "@/features/data-lists/view-list-details/get-data-list-details.action",
  () => ({
    getDataListDetailsAction: mockGetById,
  }),
);

describe("data-list-catalog-lazy-choice-provider", () => {
  beforeEach(() => {
    clearPropertyGridLazyChoiceProvidersForTests();
    vi.clearAllMocks();
    registerDataListCatalogLazyChoiceProvider();
  });

  it("pages Hub catalog search into property-grid choices", async () => {
    mockSearch.mockResolvedValue(
      Result.success({
        page: 2,
        pageSize: 25,
        totalRecords: 40,
        totalPages: 2,
        hasNextPage: false,
        items: [{ id: "99", name: "Cities" }],
      }),
    );

    const ctx = {
      designerSurvey: new SurveyModel({ elements: [] }),
      propertyGridSurvey: new Model({ elements: [] }),
      editingObj: {},
    };

    const page = await dispatchPropertyGridChoicesLazyLoad(
      ctx,
      DATA_LIST_PROPERTY_NAME,
      { skip: 25, take: 25, filter: "cit" },
      { getRuntimeState: () => ({}) },
    );

    expect(mockSearch).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      search: "cit",
    });
    expect(page).toEqual({
      items: [{ value: "99", text: "Cities" }],
      total: 40,
    });
  });

  it("resolves selected list labels without listing the catalog", async () => {
    mockGetById.mockResolvedValue(
      Result.success({
        id: "99",
        name: "Cities",
        isActive: true,
        createdAt: new Date(),
        itemsCount: 0,
        items: [],
      }),
    );

    const ctx = {
      designerSurvey: new SurveyModel({ elements: [] }),
      propertyGridSurvey: new Model({ elements: [] }),
      editingObj: {},
    };

    const labels = await dispatchPropertyGridChoiceDisplayValues(
      ctx,
      DATA_LIST_PROPERTY_NAME,
      ["99"],
      { getRuntimeState: () => ({}) },
    );

    expect(mockGetById).toHaveBeenCalledWith("99");
    expect(labels).toEqual(["Cities"]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("returns an empty page when catalog search fails", async () => {
    mockSearch.mockResolvedValue(Result.error("Failed to search data lists."));

    const page = await dispatchPropertyGridChoicesLazyLoad(
      {
        designerSurvey: new SurveyModel({ elements: [] }),
        propertyGridSurvey: new Model({ elements: [] }),
        editingObj: {},
      },
      DATA_LIST_PROPERTY_NAME,
      { skip: 0, take: 25 },
      { getRuntimeState: () => ({}) },
    );

    expect(page).toEqual({ items: [], total: 0 });
  });
});
