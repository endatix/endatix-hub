import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { restartTestSubmissionAction } from "@/features/public-form/application/actions/restart-test-submission.action";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { Result } from "@/lib/result";
import { toTestInspectorView } from "../test-inspector-view";
import TestInspector from "../ui/test-inspector";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock(
  "@/features/public-form/application/actions/restart-test-submission.action",
  () => ({ restartTestSubmissionAction: vi.fn() }),
);

const personTest = {
  id: "21",
  formId: "form-1",
  isTestSubmission: true,
  personalization: {
    identifier: "ada@example.com",
    capturedAt: "2026-10-19T08:00:00Z",
    variables: { tier: "gold" },
    source: PersonalizationSource.Test,
  },
} as unknown as Submission;

function openMenu() {
  const trigger = screen.getByRole("button", {
    name: "Test inspector, test submission",
  });
  fireEvent.keyDown(trigger, { key: "Enter" });
  screen.getByRole("menu");
}

describe("TestInspector", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(restartTestSubmissionAction).mockReset();
  });

  it("shows the Clipper trigger with the TEST tag while the menu is closed", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
    });
    render(<TestInspector model={null} view={view} />);

    const trigger = screen.getByTestId("test-inspector-trigger");
    expect(trigger.textContent).toBe("TEST");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists the rows, with Submission and Audience opening in a new tab", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
    });
    render(<TestInspector model={null} view={view} />);

    openMenu();

    const rows = screen.getAllByRole("menuitem").map((row) => row.textContent);
    expect(rows).toEqual([
      "Submitting asada@example.com›",
      "Snapshot1 value›",
      "Submission↗",
      "Audience↗",
      "Start over",
      "PreferencesComing soon⚙",
    ]);
    const submission = screen.getByRole("menuitem", { name: /Submission/ });
    expect(submission.getAttribute("href")).toBe(
      "/forms/form-1/submissions/21",
    );
    expect(submission.getAttribute("target")).toBe("_blank");
    expect(
      screen.getByRole("menuitem", { name: /Audience/ }).getAttribute("href"),
    ).toBe("/forms/form-1/audience?test=test");
  });

  it("links to the submission the first save created", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: undefined,
      canStartOver: false,
    });
    render(
      <FormRuntimeProvider
        initialState={{ formId: "form-1", submissionId: "99" }}
      >
        <TestInspector model={null} view={view} />
      </FormRuntimeProvider>,
    );

    openMenu();

    expect(
      screen.getByRole("menuitem", { name: /Submission/ }).getAttribute("href"),
    ).toBe("/forms/form-1/submissions/99");
    expect(screen.queryByRole("menuitem", { name: "Start over" })).toBeNull();
  });

  it("starts over from the menu and reloads on the new test submission", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.success(undefined),
    );
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
    });
    render(<TestInspector model={null} view={view} />);
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Start over" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(restartTestSubmissionAction).toHaveBeenCalledWith("form-1", "21");
  });

  it("hides Start over and says why when the person was removed", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.error("Person not found on this form.", undefined, undefined, {
        statusCode: 404,
      }),
    );
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
    });
    render(<TestInspector model={null} view={view} />);
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Start over" }));

    expect(await screen.findByText(/no longer on this form/)).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Start over" })).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps Start over hidden after the menu closes once the person is removed", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.error("Person not found on this form.", undefined, undefined, {
        statusCode: 404,
      }),
    );
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
    });
    render(<TestInspector model={null} view={view} />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Start over" }));
    expect(await screen.findByText(/no longer on this form/)).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    openMenu();
    expect(screen.getByText(/no longer on this form/)).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Start over" })).toBeNull();
  });
});
