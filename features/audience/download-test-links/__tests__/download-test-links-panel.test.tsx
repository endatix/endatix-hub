import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import * as filesDownload from "@/lib/utils/files-download";
import { downloadTestLinksAction } from "../download-test-links.action";
import { DownloadTestLinksPanel } from "../ui/download-test-links-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("../download-test-links.action", () => ({
  downloadTestLinksAction: vi.fn(),
}));

const SEVEN_DAYS = 60 * 24 * 7;
const LINKS = [
  {
    identifier: "a@acme.test",
    run: 1,
    token: "t1",
    expiresAt: "2026-11-06T10:00:00Z",
  },
  {
    identifier: "a@acme.test",
    run: 2,
    token: "t2",
    expiresAt: "2026-11-06T10:00:00Z",
  },
];

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver;

function openPanel(selectedIds: string[] = [], testParticipants = 3) {
  render(
    <DownloadTestLinksPanel
      formId="42"
      testParticipants={testParticipants}
      selectedIds={selectedIds}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Download test links" }));
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

describe("DownloadTestLinksPanel", () => {
  const downloadText = vi.fn();

  beforeEach(() => {
    vi.mocked(downloadTestLinksAction).mockReset();
    vi.mocked(downloadTestLinksAction).mockResolvedValue(Result.success(LINKS));
    downloadText.mockReset();
    vi.spyOn(filesDownload, "downloadText").mockImplementation(downloadText);
  });

  it("asks for one 7-day link for every test participant by default, and saves the file at once", async () => {
    openPanel();

    expect(screen.getByText(/3 links/)).toBeTruthy();
    submit();

    await waitFor(() => expect(downloadText).toHaveBeenCalledTimes(1));
    expect(downloadTestLinksAction).toHaveBeenCalledWith("42", {
      membershipIds: null,
      runsEach: 1,
      expiryMinutes: SEVEN_DAYS,
    });
    const [csv, fileName, mime] = downloadText.mock.calls[0];
    expect(csv).toMatch(/^\uFEFF?identifier,run,link\r?\n/);
    expect(fileName).toMatch(/^test-links-42-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mime).toBe("text/csv");
    expect(screen.getByText("2 test links downloaded")).toBeTruthy();
  });

  it("offers the selected participants once some are selected", async () => {
    openPanel(["7", "8"]);

    fireEvent.click(screen.getByRole("radio", { name: /Selected \(2\)/ }));
    submit();

    await waitFor(() =>
      expect(downloadTestLinksAction).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({ membershipIds: ["7", "8"] }),
      ),
    );
  });

  it("cannot pick the selected participants when none are selected", () => {
    openPanel();

    expect(
      (
        screen.getByRole("radio", {
          name: /Selected \(0\)/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("counts runs times participants", () => {
    openPanel();

    fireEvent.change(screen.getByLabelText("Runs per participant"), {
      target: { value: "10" },
    });

    expect(screen.getByText(/30 links/)).toBeTruthy();
  });

  it("asks for nothing above 500 links", () => {
    openPanel([], 60);

    fireEvent.change(screen.getByLabelText("Runs per participant"), {
      target: { value: "10" },
    });

    expect(screen.getByText(/600 links: too many at once/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Download" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows the API's refusal and saves nothing", async () => {
    vi.mocked(downloadTestLinksAction).mockResolvedValue(
      Result.error("Test links are only for Test participants."),
    );
    openPanel();

    submit();

    expect(
      await screen.findByText("Test links are only for Test participants."),
    ).toBeTruthy();
    expect(downloadText).not.toHaveBeenCalled();
  });
});
