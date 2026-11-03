import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PeopleSection } from "../ui/people-section";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../../create-person/ui/add-person-panel", () => ({
  AddPersonPanel: () => null,
}));
vi.mock("../../generate-links/ui/generate-links-panel", () => ({
  GenerateLinksPanel: () => null,
}));
vi.mock("../../import-csv/ui/import-csv-panel", () => ({
  ImportCsvPanel: () => null,
}));
vi.mock("../../update-person/update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
}));
vi.mock("../../delete-person/ui/remove-person-dialog", () => ({
  RemovePersonDialog: () => null,
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));
vi.mock("../../copy-test-link/create-test-link.action", () => ({
  createTestLinkAction: vi.fn(),
}));
vi.mock("../../reissue-link/reissue-audience-link.action", () => ({
  reissueAudienceLinkAction: vi.fn(),
}));

const textProperty = (id: string, name: string): AudienceProperty => ({
  id,
  formId: "1",
  variableName: id,
  name,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const CITY = textProperty("11", "City");
const PLAN = textProperty("12", "Plan");

const PERSON: AudiencePerson = {
  membershipId: "9",
  audienceMemberId: "7",
  identifier: "ana@example.com",
  values: { "11": "Sofia", "12": "Gold" },
  isTest: false,
  link: { status: "issued" },
};

const LIST = {
  formId: "1",
  identifierKind: AudienceIdentifierKind.Email,
  properties: [CITY, PLAN],
  importLimits: { maxRows: 5_000, maxBytes: 1_000, runsInBackground: false },
  people: [PERSON],
  totalPeople: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  hasNextPage: false,
  testFilter: AudiencePeopleTestFilter.All,
  search: "",
  canEdit: true,
  canTest: false,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const headers = () =>
  screen.getAllByRole("columnheader").map((header) => header.textContent);

function openColumnsMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Columns" }), {
    button: 0,
    ctrlKey: false,
  });
}

function closeColumnsMenu() {
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
}

function toggleColumn(name: string) {
  openColumnsMenu();
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name }));
  closeColumnsMenu();
}

describe("Participants list Property columns", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers each Property in the Columns menu, and hides a column the reader unticks", () => {
    // Arrange
    render(<PeopleSection {...LIST} />);

    // Act
    openColumnsMenu();

    // Assert — only Properties are offered; identifier, Link and actions always show
    expect(
      screen.getAllByRole("menuitemcheckbox").map((item) => item.textContent),
    ).toEqual(["City", "Plan"]);

    // Act
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "City" }));

    // Assert — the menu stays open for the next tick
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "City" })
        .getAttribute("aria-checked"),
    ).toBe("false");

    // Act
    closeColumnsMenu();

    // Assert
    expect(headers()).toEqual(["Email", "Link", "Plan", "Actions"]);
  });

  it("remembers the choice per form", () => {
    // Arrange
    const { unmount } = render(<PeopleSection {...LIST} />);
    toggleColumn("Plan");
    unmount();

    // Act
    const { unmount: unmountAgain } = render(<PeopleSection {...LIST} />);

    // Assert
    expect(headers()).toEqual(["Email", "Link", "City", "Actions"]);

    // Act — another form keeps every column
    unmountAgain();
    render(<PeopleSection {...LIST} formId="2" />);

    // Assert
    expect(headers()).toEqual(["Email", "Link", "City", "Plan", "Actions"]);
  });

  it("shows a new Property by default", () => {
    // Arrange
    const { unmount } = render(<PeopleSection {...LIST} properties={[CITY]} />);
    toggleColumn("City");
    unmount();
    const added = textProperty("13", "Region");

    // Act
    render(<PeopleSection {...LIST} properties={[CITY, PLAN, added]} />);

    // Assert
    expect(headers()).toEqual(["Email", "Link", "Plan", "Region", "Actions"]);
  });

  it("applies a choice made in another tab of this browser", () => {
    // Arrange
    render(<PeopleSection {...LIST} />);
    const key = "ehx_participants_hidden_columns_1";
    localStorage.setItem(key, '["12"]');

    // Act
    act(() => {
      globalThis.dispatchEvent(new StorageEvent("storage", { key }));
    });

    // Assert
    expect(headers()).toEqual(["Email", "Link", "City", "Actions"]);
  });

  it("shows every column when storage is blocked, and still hides one for the visit", () => {
    // Arrange
    localStorage.setItem("ehx_participants_hidden_columns_1", '["11"]');
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<PeopleSection {...LIST} />);

    // Assert
    expect(headers()).toEqual(["Email", "Link", "City", "Plan", "Actions"]);

    // Act
    toggleColumn("Plan");

    // Assert
    expect(headers()).toEqual(["Email", "Link", "City", "Actions"]);
  });

  it("takes another tab's choice after a write this tab could not store", () => {
    // Arrange
    render(<PeopleSection {...LIST} />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    toggleColumn("Plan");
    expect(headers()).toEqual(["Email", "Link", "City", "Actions"]);
    vi.restoreAllMocks();
    const key = "ehx_participants_hidden_columns_1";
    localStorage.setItem(key, '["11"]');

    // Act
    act(() => {
      globalThis.dispatchEvent(new StorageEvent("storage", { key }));
    });

    // Assert — City (the other tab) is hidden; the failed local hide of Plan is dropped
    expect(headers()).toEqual(["Email", "Link", "Plan", "Actions"]);
  });
});
