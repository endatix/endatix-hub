import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import type {
  FoundParticipant,
  FoundParticipants,
  ParticipantFinder,
} from "@/lib/personalization/authoring";
import { Result } from "@/lib/result";
import { FindParticipantDialog } from "../find-participant-dialog";

afterEach(cleanup);

const TESTER: FoundParticipant = {
  audienceMemberId: "7",
  identifier: "tester@acme.test",
  isTest: true,
};
const ANA: FoundParticipant = {
  audienceMemberId: "45",
  identifier: "ana@acme.test",
  isTest: false,
};

function finderWith(
  ...pages: FoundParticipants[]
): ParticipantFinder & { find: ReturnType<typeof vi.fn> } {
  const find = vi.fn();
  for (const page of pages) find.mockResolvedValueOnce(Result.success(page));
  find.mockResolvedValue(Result.success({ participants: [], next: null }));
  return {
    find,
    preset: vi.fn((id: string) =>
      Promise.resolve(
        Result.success({ name: `member-${id}`, variables: { tier: "gold" } }),
      ),
    ),
  };
}

function open(finder: ParticipantFinder) {
  const previewAs = vi.fn();
  const onClose = vi.fn();
  render(
    <FindParticipantDialog
      finder={finder}
      request={{ previewAs }}
      onClose={onClose}
    />,
  );
  return { previewAs, onClose };
}

describe("FindParticipantDialog", () => {
  it("renders nothing until Find participant is clicked", () => {
    // Act
    const { container } = render(
      <FindParticipantDialog
        finder={finderWith()}
        request={null}
        onClose={vi.fn()}
      />,
    );

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("lists Test participants first, labelled", async () => {
    // Arrange
    const finder = finderWith({ participants: [TESTER, ANA], next: null });

    // Act
    open(finder);

    // Assert
    await screen.findByText(ANA.identifier);
    const list = screen.getByRole("list", { name: "Participants" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      "tester@acme.testTest participant",
      "ana@acme.test",
    ]);
    expect(finder.find).toHaveBeenCalledWith({ search: "" });
  });

  it("searches by identifier", async () => {
    // Arrange
    const finder = finderWith(
      { participants: [TESTER], next: null },
      { participants: [ANA], next: null },
    );
    open(finder);
    await screen.findByText(TESTER.identifier);

    // Act
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ana" },
    });

    // Assert
    expect(await screen.findByText(ANA.identifier)).toBeTruthy();
    expect(screen.queryByText(TESTER.identifier)).toBeNull();
    expect(finder.find).toHaveBeenLastCalledWith({ search: "ana" });
  });

  it("loads the next page as the author scrolls", async () => {
    // Arrange
    const next = { test: false, page: 2 };
    const finder = finderWith(
      { participants: [TESTER], next },
      { participants: [ANA], next: null },
    );
    open(finder);
    await screen.findByText(TESTER.identifier);
    const list = screen.getByRole("list", { name: "Participants" });
    Object.defineProperties(list, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 300 },
      scrollTop: { value: 690, writable: true },
    });

    // Act
    fireEvent.scroll(list);

    // Assert
    expect(await screen.findByText(ANA.identifier)).toBeTruthy();
    expect(screen.getByText(TESTER.identifier)).toBeTruthy();
    expect(finder.find).toHaveBeenLastCalledWith({ search: "", cursor: next });
  });

  it("previews as the picked participant with their values", async () => {
    // Arrange
    const finder = finderWith({ participants: [TESTER, ANA], next: null });
    const { previewAs, onClose } = open(finder);

    // Act
    fireEvent.click(await screen.findByText(ANA.identifier));

    // Assert
    await waitFor(() =>
      expect(previewAs).toHaveBeenCalledWith(
        { name: "member-45", variables: { tier: "gold" } },
        false,
      ),
    );
    expect(finder.preset).toHaveBeenCalledWith("45");
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open and says so when the participant's values cannot be read", async () => {
    // Arrange
    const finder = finderWith({ participants: [ANA], next: null });
    finder.preset = vi.fn(() =>
      Promise.resolve(
        Result.error<AudienceVariablePreset>("Participant not found."),
      ),
    );
    const { previewAs, onClose } = open(finder);
    const row = await screen.findByText(ANA.identifier);

    // Act
    await act(async () => fireEvent.click(row));

    // Assert
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Participant not found.",
    );
    expect(previewAs).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says when nobody matches", async () => {
    // Act
    open(finderWith({ participants: [], next: null }));

    // Assert
    expect(await screen.findByText("No participants found.")).toBeTruthy();
  });

  it("does not preview when the dialog closes while the values load", async () => {
    // Arrange
    const finder = finderWith({ participants: [ANA], next: null });
    let resolve!: (value: Result<AudienceVariablePreset>) => void;
    finder.preset = vi.fn(
      () => new Promise<Result<AudienceVariablePreset>>((r) => (resolve = r)),
    );
    const previewAs = vi.fn();
    const { rerender } = render(
      <FindParticipantDialog
        finder={finder}
        request={{ previewAs }}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByText(ANA.identifier));

    // Act
    rerender(
      <FindParticipantDialog
        finder={finder}
        request={null}
        onClose={vi.fn()}
      />,
    );
    await act(async () =>
      resolve(Result.success({ name: ANA.identifier, variables: {} })),
    );

    // Assert
    expect(previewAs).not.toHaveBeenCalled();
  });

  it("clears the last search's rows as soon as the author types", async () => {
    // Arrange
    const finder = finderWith(
      { participants: [TESTER], next: { test: false, page: 2 } },
      { participants: [ANA], next: null },
    );
    open(finder);
    await screen.findByText(TESTER.identifier);

    // Act
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ana" },
    });
    fireEvent.scroll(screen.getByRole("list", { name: "Participants" }));

    // Assert
    expect(screen.queryByText(TESTER.identifier)).toBeNull();
    expect(await screen.findByText(ANA.identifier)).toBeTruthy();
    expect(finder.find).toHaveBeenCalledTimes(2);
    expect(finder.find).toHaveBeenLastCalledWith({ search: "ana" });
  });

  it("lists a participant once when pages overlap", async () => {
    // Arrange
    const finder = finderWith(
      { participants: [TESTER], next: { test: false, page: 2 } },
      { participants: [TESTER, ANA], next: null },
    );
    open(finder);
    await screen.findByText(TESTER.identifier);
    const list = screen.getByRole("list", { name: "Participants" });
    Object.defineProperties(list, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 300 },
      scrollTop: { value: 690, writable: true },
    });

    // Act
    fireEvent.scroll(list);

    // Assert
    await screen.findByText(ANA.identifier);
    expect(screen.getAllByText(TESTER.identifier)).toHaveLength(1);
  });

  it("forgets a failed pick once the author tries again", async () => {
    // Arrange
    const finder = finderWith({ participants: [TESTER, ANA], next: null });
    finder.preset = vi
      .fn()
      .mockResolvedValueOnce(Result.error("Participant not found."))
      .mockReturnValue(new Promise(() => {}));
    open(finder);
    fireEvent.click(await screen.findByText(ANA.identifier));
    await screen.findByRole("alert");

    // Act
    fireEvent.click(screen.getByText(TESTER.identifier));

    // Assert
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
