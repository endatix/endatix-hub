import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PersonalizationSource,
  type Submission,
} from "@/lib/endatix-api/submissions/types";
import { SubmitterParticipant } from "../../../ui/details/submitter-participant";

type Personalization = Submission["personalization"];

const linkSnapshot: Personalization = {
  identifier: "ada@example.com",
  capturedAt: "2026-10-19T12:00:00Z",
  variables: { tier: "gold" },
  source: PersonalizationSource.Link,
  memberId: "7",
};

function renderSection(
  personalization: Personalization,
  canOpenParticipant = true,
) {
  return render(
    <SubmitterParticipant
      canOpenParticipant={canOpenParticipant}
      formId="form-1"
      personalization={personalization}
    />,
  );
}

describe("SubmitterParticipant", () => {
  it("shows who the Snapshot was taken for, how, and when, with Open participant for an editor", () => {
    renderSection(linkSnapshot);

    expect(screen.getByRole("heading", { name: "Participant" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Personalised link")).toBeTruthy();
    expect(screen.getByText(/Oct 19, 2026/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open participant" })
        .getAttribute("href"),
    ).toBe("/forms/form-1/audience/participants/7");
  });

  it("names each Snapshot source", () => {
    const { rerender } = renderSection({
      ...linkSnapshot,
      source: PersonalizationSource.OnBehalf,
    });
    expect(screen.getByText("On behalf")).toBeTruthy();

    rerender(
      <SubmitterParticipant
        canOpenParticipant
        formId="form-1"
        personalization={{
          ...linkSnapshot,
          source: PersonalizationSource.Test,
        }}
      />,
    );
    expect(screen.getByText("Test as this participant")).toBeTruthy();
  });

  it("shows a source this Hub does not know as sent, and a missing one as not recorded", () => {
    const { rerender } = renderSection({
      ...linkSnapshot,
      source: "lookup" as PersonalizationSource,
    });
    expect(screen.getByText("lookup")).toBeTruthy();

    rerender(
      <SubmitterParticipant
        canOpenParticipant
        formId="form-1"
        personalization={{ ...linkSnapshot, source: undefined }}
      />,
    );
    expect(screen.getByText("Not recorded")).toBeTruthy();
  });

  it("hides Open participant from a viewer who cannot edit the form", () => {
    renderSection(linkSnapshot, false);

    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open participant" })).toBeNull();
  });

  it("hides Open participant when the Snapshot names no member", () => {
    const { memberId: _, ...withoutMember } = linkSnapshot!;
    renderSection(withoutMember);

    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open participant" })).toBeNull();
  });

  it("shows no section when the submission has no Snapshot", () => {
    const { container } = renderSection(null);

    expect(container.innerHTML).toBe("");
  });
});
