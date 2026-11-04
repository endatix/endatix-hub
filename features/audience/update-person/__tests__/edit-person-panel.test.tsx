import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  isTest: false,
  link: { status: "none" },
};

const OPENED: AudiencePerson = {
  ...PERSON,
  link: {
    status: "opened",
    openedAt: "2026-10-20T09:30:00Z",
    submissionId: "55",
  },
};

const renderPanel = (person: AudiencePerson) =>
  render(
    <EditPersonPanel
      open
      formId="1"
      person={person}
      identifierKind={AudienceIdentifierKind.Email}
      properties={[textProperty("a", "City")]}
      onClose={vi.fn()}
    />,
  );

// Radix tooltips (the identifier's copy affordance) measure with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("EditPersonPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

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

  it("names the task and shows the match key as a locked row above the values", () => {
    // Arrange
    const person = { ...PERSON, identifier: "CG-000003-01" };

    // Act
    render(
      <EditPersonPanel
        open
        formId="1"
        person={person}
        identifierKind={AudienceIdentifierKind.ExternalId}
        properties={[textProperty("a", "household_size")]}
        onClose={vi.fn()}
      />,
    );

    // Assert
    expect(
      screen.getByRole("heading", { name: "Edit participant" }),
    ).toBeTruthy();
    const personSection = screen.getByRole("heading", { name: "Participant" });
    const values = screen.getByRole("heading", { name: "Properties" });
    expect(
      personSection.compareDocumentPosition(values) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("External ID").tagName).toBe("DT");
    expect(screen.getAllByText("CG-000003-01")).toHaveLength(1);
    expect(screen.getByText("Locked")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "External ID" })).toBeNull();
  });
  it("says an opened person's response keeps its values, links to it, and still saves", () => {
    renderPanel(OPENED);

    expect(
      screen.getByText(/keeps the values from when the link was opened/),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View response" }).getAttribute("href"),
    ).toBe("/forms/1/submissions/55");
    expect(
      screen
        .getByRole("button", { name: "Save changes" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("keeps the note but no response link once that submission was deleted", () => {
    renderPanel({
      ...PERSON,
      link: { status: "opened", openedAt: "2026-10-20T09:30:00Z" },
    });

    expect(
      screen.getByText(/keeps the values from when the link was opened/),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "View response" })).toBeNull();
  });

  it("says nothing about a response before the link is opened", () => {
    renderPanel({ ...PERSON, link: { status: "issued" } });

    expect(
      screen.queryByText(/keeps the values from when the link was opened/),
    ).toBeNull();
  });
});
