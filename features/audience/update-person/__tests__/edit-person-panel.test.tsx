import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { updateAudiencePersonAction } from "../update-audience-person.action";
import { EditPersonPanel } from "../ui/edit-person-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
}));

const textProperty = (id: string, name: string): AudienceProperty => ({
  id,
  formId: "1",
  variableName: name.toLowerCase(),
  name,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const PERSON: AudiencePerson = {
  membershipId: "9",
  audienceMemberId: "7",
  identifier: "ada@example.com",
  values: { a: "Sofia", b: "Sales" },
};

describe("EditPersonPanel", () => {
  it("saves only the value that changed", async () => {
    // Arrange
    vi.mocked(updateAudiencePersonAction).mockResolvedValue(
      Result.success(PERSON),
    );
    const onClose = vi.fn();
    render(
      <EditPersonPanel
        open
        formId="1"
        person={PERSON}
        identifierKind={AudienceIdentifierKind.Email}
        properties={[textProperty("a", "City"), textProperty("b", "Team")]}
        onClose={onClose}
      />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Plovdiv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Assert
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateAudiencePersonAction).toHaveBeenCalledWith({
      formId: "1",
      membershipId: "9",
      values: { a: "Plovdiv" },
    });
  });

  it("keeps the panel open with the error when the save fails", async () => {
    // Arrange
    vi.mocked(updateAudiencePersonAction).mockResolvedValue(
      Result.validationError("'City' must be a number."),
    );
    const onClose = vi.fn();
    render(
      <EditPersonPanel
        open
        formId="1"
        person={PERSON}
        identifierKind={AudienceIdentifierKind.Email}
        properties={[textProperty("a", "City")]}
        onClose={onClose}
      />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Assert
    expect(await screen.findByText("'City' must be a number.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the panel open when the action rejects", async () => {
    vi.mocked(updateAudiencePersonAction).mockRejectedValue(new Error("boom"));
    const onClose = vi.fn();
    render(
      <EditPersonPanel
        open
        formId="1"
        person={PERSON}
        identifierKind={AudienceIdentifierKind.Email}
        properties={[textProperty("a", "City")]}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Plovdiv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Something went wrong. Try again."),
    ).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the match key above the properties and does not save it", async () => {
    vi.mocked(updateAudiencePersonAction).mockResolvedValue(
      Result.success(PERSON),
    );
    const person = { ...PERSON, identifier: "CG-000003-01", values: { a: "2" } };
    render(
      <EditPersonPanel
        open
        formId="1"
        person={person}
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={[
          textProperty("age", "age"),
          textProperty("id", "external_id"),
          textProperty("a", "household_size"),
        ]}
        onClose={vi.fn()}
      />,
    );

    const identifier = screen.getByRole("heading", { name: "Identifier" });
    const properties = screen.getByRole("heading", { name: "Properties" });
    expect(
      identifier.compareDocumentPosition(properties) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const id = screen.getByLabelText("External ID");
    expect(id).toHaveProperty("disabled", true);
    expect(id).toHaveProperty("value", "CG-000003-01");
    expect(screen.queryByLabelText("external_id")).toBeNull();
    fireEvent.change(screen.getByLabelText("household_size"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateAudiencePersonAction).toHaveBeenCalledWith({
        formId: "1",
        membershipId: "9",
        values: { a: "4" },
      }),
    );
  });
});
