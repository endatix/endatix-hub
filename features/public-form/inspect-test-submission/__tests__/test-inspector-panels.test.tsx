import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("shows who the test submits as, tagged Frozen", () => {
    renderInspector();

    openPanel(/Submitting as/);

    const panel = screen.getByRole("group", { name: "Submitting as" });
    expect(panel.textContent).toContain("Frozen");
    expect(fieldValue("Identifier")).toBe("ada@example.com");
    expect(fieldValue("Label")).toBe("Ada Lovelace");
    expect(fieldValue("Snapshot source")).toBe("Test as this participant");
    expect(fieldValue("email")).toBe("ada@example.com");
    expect(fieldValue("team")).toBe("Engines");
  });

  it("shows a dash for each missing submitter value", () => {
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);

    openPanel(/Submitting as/);

    expect(fieldValue("Identifier")).toBe("—");
    expect(fieldValue("Label")).toBe("—");
    expect(fieldValue("Snapshot source")).toBe("—");
    expect(screen.getByText("No Submitter fields")).toBeTruthy();
  });

  it("shows a Snapshot source this Hub does not know yet as sent", () => {
    renderInspector({
      ...personTest,
      personalization: { ...personTest.personalization, source: "kiosk" },
    } as unknown as Submission);

    openPanel(/Submitting as/);

    expect(fieldValue("Snapshot source")).toBe("kiosk");
  });

  it("lets the arrow keys reach each value", async () => {
    renderInspector();
    openPanel(/Snapshot/);
    await waitFor(() =>
      expect(document.activeElement?.textContent).toMatch(/Back$/),
    );

    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });

    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toMatch(
        /^Captured: /,
      ),
    );
  });

  it("shows the Snapshot's frozen values and when they were captured", () => {
    renderInspector();

    openPanel(/Snapshot/);

    const panel = screen.getByRole("group", { name: "Snapshot" });
    expect(panel.textContent).toContain("Frozen");
    expect(fieldValue("Captured")).not.toBe("—");
    expect(fieldValue("seats")).toBe("3");
    expect(fieldValue("tier")).toBe("gold");
  });

  it("shows a dash when no Snapshot was captured", () => {
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);

    openPanel(/Snapshot/);

    expect(fieldValue("Captured")).toBe("—");
    expect(screen.getByText("No Snapshot values")).toBeTruthy();
  });

  it("copies the Submitting as panel as JSON", async () => {
    renderInspector();
    openPanel(/Submitting as/);

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

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
    renderInspector();
    openPanel(/Snapshot/);

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      capturedAt: "2026-10-19T08:00:00Z",
      variables: { seats: 3, tier: "gold" },
    });
  });

  it("copies an empty Snapshot in the same shape", async () => {
    renderInspector({ id: "22", formId: "form-1" } as unknown as Submission);
    openPanel(/Snapshot/);

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy as JSON" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      capturedAt: null,
      variables: {},
    });
  });

  it("goes back to the rows from Back", () => {
    renderInspector();
    openPanel(/Snapshot/);

    fireEvent.click(screen.getByRole("menuitem", { name: "Back" }));

    expect(screen.queryByRole("group", { name: "Snapshot" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /Snapshot/ })).toBeTruthy();
  });

  it("works from the keyboard alone, returning focus to the trigger", async () => {
    renderInspector();

    fireEvent.keyDown(trigger(), { key: "Enter" });
    const menu = screen.getByRole("menu");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toMatch(/^Submitting as/),
    );

    fireEvent.keyDown(document.activeElement ?? menu, { key: "ArrowDown" });
    await waitFor(() =>
      expect(document.activeElement?.textContent).toMatch(/^Snapshot/),
    );

    fireEvent.keyDown(document.activeElement ?? menu, { key: "Enter" });
    expect(screen.getByRole("group", { name: "Snapshot" })).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Back" }),
      ),
    );

    fireEvent.keyDown(document.activeElement ?? menu, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Snapshot" })).toBeNull();
    expect(screen.getByRole("menu")).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement?.textContent).toMatch(/^Snapshot/),
    );

    fireEvent.keyDown(document.activeElement ?? menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });
});
