import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { toTestInspectorView } from "../test-inspector-view";
import TestInspector from "../ui/test-inspector";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock(
  "@/features/public-form/application/actions/restart-test-submission.action",
  () => ({ restartTestSubmissionAction: vi.fn() }),
);

const personTest = {
  id: "21",
  formId: "form-1",
  isTestSubmission: true,
  submitterDisplayId: "Ada Lovelace",
  submitterProfile: { team: "Engines", email: "ada@example.com" },
  personalization: {
    identifier: "ada@example.com",
    capturedAt: "2026-10-19T08:00:00Z",
    variables: { tier: "gold", seats: 3 },
    source: PersonalizationSource.Test,
    memberId: "7",
  },
} as unknown as Submission;

function renderInspector(submission: Submission | undefined = personTest) {
  const view = toTestInspectorView({
    formId: "form-1",
    submission,
    canStartOver: false,
    canOpenParticipant: true,
  });
  render(<TestInspector model={null} view={view} />);
}

function trigger() {
  return screen.getByRole("button", {
    name: "Test inspector, test submission",
  });
}

function openPanel(row: RegExp) {
  fireEvent.keyDown(trigger(), { key: "Enter" });
  fireEvent.click(screen.getByRole("menuitem", { name: row }));
}

/** A panel field is a menu item named "name: value", so arrow keys and screen readers reach it. */
function fieldValue(name: string) {
  const prefix = `${name}: `;
  const field = screen
    .getAllByRole("menuitem")
    .find((item) => item.getAttribute("aria-label")?.startsWith(prefix));
  return field?.getAttribute("aria-label")?.slice(prefix.length);
}

function focusedLabel() {
  return document.activeElement?.textContent;
}

/** Presses a key on the focused element, then waits for focus to land on the matching item. */
async function pressAndWait(key: string, focusedText: RegExp) {
  fireEvent.keyDown(document.activeElement as Element, { key });
  await waitFor(() => expect(focusedLabel()).toMatch(focusedText));
}

const writeText = vi.fn<(text: string) => Promise<void>>();

describe("TestInspector panels", () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("shows who the test submits as, tagged Frozen", () => {
    // Arrange
    renderInspector();

    // Act
    openPanel(/Submitting as/);

    // Assert
    expect(
      screen.getByRole("group", { name: "Submitting as, Frozen" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Submitter fields" }),
    ).toBeTruthy();
    expect(fieldValue("Identifier")).toBe("ada@example.com");
    expect(fieldValue("Label")).toBe("Ada Lovelace");
    expect(fieldValue("Snapshot source")).toBe("Test as this participant");
    expect(fieldValue("email")).toBe("ada@example.com");
    expect(fieldValue("team")).toBe("Engines");
  });

  it("shows a dash for each missing submitter value", () => {
    // Arrange
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);

    // Act
    openPanel(/Submitting as/);

    // Assert
    expect(fieldValue("Identifier")).toBe("—");
    expect(fieldValue("Label")).toBe("—");
    expect(fieldValue("Snapshot source")).toBe("—");
    expect(
      screen.getByRole("menuitem", { name: "No Submitter fields" }),
    ).toBeTruthy();
  });

  it("shows a Snapshot source this Hub does not know yet as sent", () => {
    // Arrange
    renderInspector({
      ...personTest,
      personalization: { ...personTest.personalization, source: "kiosk" },
    } as unknown as Submission);

    // Act
    openPanel(/Submitting as/);

    // Assert
    expect(fieldValue("Snapshot source")).toBe("kiosk");
  });

  it("lets the arrow keys reach each value", async () => {
    // Arrange
    renderInspector();
    openPanel(/Snapshot/);
    await waitFor(() => expect(focusedLabel()).toMatch(/Back$/));

    // Act
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });

    // Assert
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toMatch(
        /^Captured: /,
      ),
    );
  });

  it("shows a value frozen as blank text quoted, not as missing", () => {
    // Arrange
    renderInspector({
      ...personTest,
      personalization: {
        ...personTest.personalization,
        variables: { nickname: "" },
      },
    } as unknown as Submission);

    // Act
    openPanel(/Snapshot/);

    // Assert
    expect(fieldValue("nickname")).toBe('""');
  });

  it("shows the Snapshot's frozen values and when they were captured", () => {
    // Arrange
    renderInspector();

    // Act
    openPanel(/Snapshot/);

    // Assert
    expect(
      screen.getByRole("group", { name: "Snapshot, Frozen" }),
    ).toBeTruthy();
    expect(fieldValue("Captured")).toMatch(/^Oct 19, 2026, /);
    expect(fieldValue("seats")).toBe("3");
    expect(fieldValue("tier")).toBe("gold");
  });

  it("shows a dash when no Snapshot was captured", () => {
    // Arrange
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);

    // Act
    openPanel(/Snapshot/);

    // Assert
    expect(fieldValue("Captured")).toBe("—");
    expect(
      screen.getByRole("menuitem", { name: "No Snapshot values" }),
    ).toBeTruthy();
  });

  it("copies the Submitting as panel as JSON", async () => {
    // Arrange
    renderInspector();
    openPanel(/Submitting as/);

    // Act
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    // Assert
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      identifier: "ada@example.com",
      label: "Ada Lovelace",
      source: "test",
      fields: { email: "ada@example.com", team: "Engines" },
    });
    expect(
      await screen.findByRole("menuitem", { name: "Copied" }),
    ).toBeTruthy();
  });

  it("copies the Snapshot panel as JSON", async () => {
    // Arrange
    renderInspector();
    openPanel(/Snapshot/);

    // Act
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    // Assert
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      capturedAt: "2026-10-19T08:00:00Z",
      variables: { seats: 3, tier: "gold" },
    });
  });

  it("copies an empty Snapshot in the same shape", async () => {
    // Arrange
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);
    openPanel(/Snapshot/);

    // Act
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    // Assert
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      capturedAt: null,
      variables: {},
    });
  });

  it("says when a copy fails, then offers it again", async () => {
    // Arrange
    vi.useFakeTimers({ shouldAdvanceTime: true });
    writeText.mockRejectedValue(new Error("denied"));
    renderInspector();
    openPanel(/Snapshot/);

    // Act
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    // Assert
    expect(
      await screen.findByRole("menuitem", { name: "Copy failed" }),
    ).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByRole("menuitem", { name: "Copy as JSON" })).toBeTruthy();
  });

  it("goes back to the rows from Back, focusing the row it came from", async () => {
    // Arrange
    renderInspector();
    openPanel(/Submitting as/);

    // Act
    fireEvent.click(screen.getByRole("menuitem", { name: "Back" }));

    // Assert
    expect(
      screen.queryByRole("group", { name: "Submitting as, Frozen" }),
    ).toBeNull();
    await waitFor(() => expect(focusedLabel()).toMatch(/^Submitting as/));
  });

  it("drills in from the keyboard alone, focusing Back", async () => {
    // Arrange & Act: Enter opens the menu on the first row
    renderInspector();
    fireEvent.keyDown(trigger(), { key: "Enter" });

    // Assert
    await waitFor(() => expect(focusedLabel()).toMatch(/^Submitting as/));

    // Act: ArrowDown moves to Snapshot, Enter drills in
    await pressAndWait("ArrowDown", /^Snapshot/);
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });

    // Assert
    expect(
      screen.getByRole("group", { name: "Snapshot, Frozen" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Back" }),
      ),
    );
  });

  it("goes back with Esc, then closes and returns focus to the trigger", async () => {
    // Arrange
    renderInspector();
    fireEvent.keyDown(trigger(), { key: "Enter" });
    await pressAndWait("ArrowDown", /^Snapshot/);
    await pressAndWait("Enter", /Back$/);

    // Act: Esc goes back to the row
    await pressAndWait("Escape", /^Snapshot/);

    // Assert
    expect(
      screen.queryByRole("group", { name: "Snapshot, Frozen" }),
    ).toBeNull();
    expect(screen.getByRole("menu")).toBeTruthy();

    // Act: Esc closes the menu
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

    // Assert
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });
});
