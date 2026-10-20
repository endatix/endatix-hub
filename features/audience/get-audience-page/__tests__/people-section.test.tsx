import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { updateAudiencePersonAction } from "../../update-person/update-audience-person.action";
import { PeopleSection } from "../ui/people-section";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../../update-person/update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
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
vi.mock("../../delete-person/ui/remove-person-dialog", () => ({
  RemovePersonDialog: () => null,
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));

const textProperty = (
  id: string,
  variableName: string,
  name = variableName,
): AudienceProperty => ({
  id,
  formId: "1",
  variableName,
  name,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const PERSON: AudiencePerson = {
  membershipId: "9",
  audienceMemberId: "7",
  identifier: "CG-000003-01",
  values: { city: "Sofia", ext: "CG-000003-01" },
  isTest: false,
};

const TEST_PERSON: AudiencePerson = {
  membershipId: "10",
  audienceMemberId: "8",
  identifier: "tester@example.com",
  values: {},
  isTest: true,
};

const LIST = {
  formId: "1",
  identifierKind: AudienceIdentifierKind.Email,
  properties: [] as AudienceProperty[],
  totalPeople: 2,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  hasNextPage: false,
  testFilter: AudiencePeopleTestFilter.All,
};

// Radix tooltips (the identifier's copy affordance) measure with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("PeopleSection", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(updateAudiencePersonAction).mockReset();
  });

  it("filters the match-key property out of edit values and the save payload", async () => {
    // Arrange
    vi.mocked(updateAudiencePersonAction).mockResolvedValue(
      Result.success(PERSON),
    );
    const properties = [
      textProperty("ext", "external_id"),
      textProperty("city", "city", "City"),
    ];
    render(
      <PeopleSection
        {...LIST}
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={properties}
        people={[PERSON]}
        totalPeople={1}
        canEdit
        canTest={false}
      />,
    );

    // Assert — table: match key as the person column only, not a second value column
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["External ID", "City", "Actions"]);

    // Act — open edit with the matching identifier property still in the section props
    fireEvent.click(
      screen.getByRole("button", { name: "Edit values for CG-000003-01" }),
    );

    // Assert — identity locked; identifier property absent from editable values
    expect(await screen.findByRole("heading", { name: "Edit person" })).toBeTruthy();
    const lockedLabel = screen
      .getAllByText("External ID")
      .find((node) => node.tagName === "DT");
    expect(lockedLabel).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "External ID" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "external_id" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "City" })).toBeTruthy();

    // Act
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Plovdiv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Assert — save payload has only the changed value property
    await waitFor(() =>
      expect(updateAudiencePersonAction).toHaveBeenCalledWith({
        formId: "1",
        membershipId: "9",
        values: { city: "Plovdiv" },
      }),
    );
  });

  it("badges test people and offers Test as this person with forms.test alone", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[PERSON, TEST_PERSON]}
        canEdit={false}
        canTest
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].textContent).not.toContain("Test");
    expect(rows[1].textContent).toContain("Test");
    expect(
      screen.getByRole("button", {
        name: "Test as this person: tester@example.com",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  });

  it("leaves out Test as this person without forms.test", () => {
    render(
      <PeopleSection {...LIST} people={[PERSON]} canEdit canTest={false} />,
    );

    expect(screen.queryByRole("button", { name: /^Test as this person/ })).toBeNull();
  });

  it("says the filter found nobody, with a way back to everyone", () => {
    render(
      <PeopleSection
        {...LIST}
        people={[]}
        totalPeople={0}
        testFilter={AudiencePeopleTestFilter.Test}
        canEdit
        canTest
      />,
    );

    expect(screen.getByText("No test people")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Filter people by test or real" }),
    ).toBeTruthy();
  });
});
