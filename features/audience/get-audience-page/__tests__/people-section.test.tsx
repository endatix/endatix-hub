import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
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
        formId="1"
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={properties}
        people={[PERSON]}
        totalPeople={1}
        page={1}
        pageSize={50}
        totalPages={1}
        hasNextPage={false}
        canEdit
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
});
