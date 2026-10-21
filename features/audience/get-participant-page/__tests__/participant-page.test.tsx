import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceParticipant,
  type AudienceProperty,
  type ParticipantSubmission,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { deleteAudiencePersonAction } from "../../delete-person/delete-audience-person.action";
import { openTestSubmissionAction } from "../../test-as-person/open-test-submission.action";
import { ParticipantPage } from "../ui/participant-page";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../delete-person/delete-audience-person.action", () => ({
  deleteAudiencePersonAction: vi.fn(),
}));
vi.mock("../../update-person/update-audience-person.action", () => ({
  updateAudiencePersonAction: vi.fn(),
}));
vi.mock("../../test-as-person/open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));

const TIER: AudienceProperty = {
  id: "11",
  formId: "1",
  variableName: "tier",
  name: "Tier",
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
};
const REGION: AudienceProperty = { ...TIER, id: "12", name: "Region" };

const submission = (
  id: string,
  overrides: Partial<ParticipantSubmission> = {},
): ParticipantSubmission => ({
  id,
  createdAt: "2026-10-21T09:00:00Z",
  completedAt: null,
  isComplete: false,
  status: "new",
  isTest: false,
  snapshotSource: "link",
  ...overrides,
});

const PARTICIPANT: AudienceParticipant = {
  membershipId: "981",
  audienceMemberId: "7",
  identifier: "tester@example.com",
  values: { "11": "Gold" },
  isTest: true,
  link: { status: "none" },
  submissions: [
    submission("5521", { isTest: true, snapshotSource: "test" }),
    submission("5520", { isComplete: true, snapshotSource: null }),
  ],
  submissionTotal: 37,
};

function renderPage(
  participant: Partial<AudienceParticipant> = {},
  canTest = true,
) {
  return render(
    <ParticipantPage
      formId="1"
      participant={{ ...PARTICIPANT, ...participant }}
      identifierKind={AudienceIdentifierKind.Email}
      properties={[TIER, REGION]}
      canTest={canTest}
    />,
  );
}

const submissionsTable = () =>
  within(screen.getByRole("region", { name: "Submissions" })).getByRole(
    "table",
  );

// Radix measures with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("ParticipantPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("names the participant, marks a test participant and lists their values", () => {
    renderPage();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("tester@example.com");
    expect(heading.parentElement?.textContent).toContain("Test");
    const values = screen.getByRole("region", { name: "Values" });
    within(values).getByText("Gold");
    within(values).getByText("Not set");
  });

  it("leaves the Link card out when the participant has no link", () => {
    renderPage();

    expect(screen.queryByRole("region", { name: "Link" })).toBeNull();
  });

  it("shows an opened link with a way to its response", () => {
    renderPage({
      isTest: false,
      link: {
        status: "opened",
        openedAt: "2026-10-20T08:00:00Z",
        submissionId: "5520",
      },
    });

    const link = screen.getByRole("region", { name: "Link" });
    within(link).getByText("Opened");
    const response = within(link).getByRole("link", { name: /View response/ });
    expect(response.getAttribute("href")).toBe("/forms/1/submissions/5520");
  });

  it("lists the newest submissions out of the total, each linking to its details", () => {
    renderPage();

    screen.getByText("Newest 2 of 37");
    const rows = within(submissionsTable()).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const details = within(rows[0]).getByRole("link");
    expect(details.getAttribute("href")).toBe("/forms/1/submissions/5521");
    // The Test badge, and Test as its Snapshot source.
    expect(within(rows[0]).getAllByText("Test")).toHaveLength(2);
    within(rows[1]).getByText("No Snapshot");
  });

  it("counts the submissions when every one of them is shown", () => {
    renderPage({ submissionTotal: 2 });

    screen.getByText("2 submissions");
    expect(screen.queryByText(/Newest/)).toBeNull();
  });

  it("says so when the participant has no submissions", () => {
    renderPage({ submissions: [], submissionTotal: 0 });

    screen.getByText("No submissions yet");
  });

  it("tests as this participant and reads the page again once it is open", async () => {
    const tab = { close: vi.fn(), opener: {}, location: { href: "" } };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.success({ url: "/share/1" }),
    );
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Test as this participant" }),
    );

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(openTestSubmissionAction).toHaveBeenCalledWith("1", "981");
  });

  it("offers Test as only to a reader who may test forms", () => {
    renderPage({}, false);

    expect(
      screen.queryByRole("button", { name: "Test as this participant" }),
    ).toBeNull();
  });

  it("opens the edit panel on Edit values", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Edit values" }));

    await screen.findByRole("dialog", { name: "Edit person" });
  });

  it("removes the participant and returns to Audience", async () => {
    vi.mocked(deleteAudiencePersonAction).mockResolvedValue(
      Result.success(undefined),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/forms/1/audience"),
    );
    expect(deleteAudiencePersonAction).toHaveBeenCalledWith("1", "981");
  });
});
