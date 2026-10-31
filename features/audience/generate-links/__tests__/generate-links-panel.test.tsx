import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import * as filesDownload from "@/lib/utils/files-download";
import {
  generateAudienceLinksAction,
  previewAudienceLinksAction,
} from "../generate-audience-links.action";
import { FILTERED_LINKS_NEED_NEWER_API } from "../personal-links";
import { GenerateLinksPanel } from "../ui/generate-links-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("../generate-audience-links.action", () => ({
  generateAudienceLinksAction: vi.fn(),
  previewAudienceLinksAction: vi.fn(),
}));

const GENERATE = { name: "Generate and download" };

const panel = (totalPeople: number, search: string) => (
  <GenerateLinksPanel
    formId="42"
    identifierKind={AudienceIdentifierKind.Email}
    totalPeople={totalPeople}
    search={search}
  />
);

function openPanel(totalPeople = 2, search = "") {
  const view = render(panel(totalPeople, search));
  fireEvent.click(screen.getByRole("button", { name: "Personalized links" }));
  return view;
}

function previewReturns(matching: number, withoutLink: number, cap = 5000) {
  vi.mocked(previewAudienceLinksAction).mockResolvedValue(
    Result.success({ matching, withoutLink, cap }),
  );
}

const generateButton = () =>
  screen.getByRole("button", GENERATE) as HTMLButtonElement;

describe("GenerateLinksPanel", () => {
  const downloadText = vi.fn();

  beforeEach(() => {
    vi.mocked(generateAudienceLinksAction).mockReset();
    vi.mocked(previewAudienceLinksAction).mockReset();
    previewReturns(2, 2);
    downloadText.mockReset();
    refresh.mockReset();
    vi.spyOn(filesDownload, "downloadText").mockImplementation(downloadText);
  });

  it("writes nothing until Generate, and waits for people", async () => {
    // Arrange
    previewReturns(0, 0);

    // Act
    openPanel(0);

    // Assert
    expect(screen.getByText(/no participants yet/)).toBeTruthy();
    expect(
      await screen.findByText("0 of 0 participants get a new link"),
    ).toBeTruthy();
    expect(generateButton().disabled).toBe(true);
    expect(generateAudienceLinksAction).not.toHaveBeenCalled();
  });

  it("saves the file as soon as the links arrive, and again on request", async () => {
    // Arrange
    vi.mocked(generateAudienceLinksAction).mockResolvedValue(
      Result.success([
        { identifier: "ada@example.com", token: "abc" },
        { identifier: "grace@example.com", token: "def" },
      ]),
    );
    openPanel();
    await screen.findByText("2 of 2 participants get a new link");

    // Act
    fireEvent.click(generateButton());

    // Assert
    expect(await screen.findByText("2 links downloaded")).toBeTruthy();
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [csv, fileName] = downloadText.mock.calls[0];
    expect(csv).toContain("email,link");
    expect(csv).toContain("ada@example.com,");
    expect(fileName).toMatch(/^personalized-links-42-\d{4}-\d{2}-\d{2}\.csv$/);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(downloadText).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("says when everyone already has a link, and saves no empty file", async () => {
    // Arrange
    vi.mocked(generateAudienceLinksAction).mockResolvedValue(
      Result.success([]),
    );
    openPanel();
    await screen.findByText("2 of 2 participants get a new link");

    // Act
    fireEvent.click(generateButton());

    // Assert
    expect(await screen.findByText("Everyone already has a link")).toBeTruthy();
    expect(downloadText).not.toHaveBeenCalled();
  });

  it("counts who the search sends a link to, and the file holds only them", async () => {
    // Arrange
    previewReturns(12, 7);
    vi.mocked(generateAudienceLinksAction).mockResolvedValue(
      Result.success([{ identifier: "a@acme.test", token: "abc" }]),
    );
    openPanel(12, "acme");

    // Act
    expect(
      await screen.findByText("7 of 12 matching participants get a new link"),
    ).toBeTruthy();
    fireEvent.click(generateButton());

    // Assert
    expect(previewAudienceLinksAction).toHaveBeenCalledWith("42", "acme");
    expect(await screen.findByText("1 link downloaded")).toBeTruthy();
    expect(generateAudienceLinksAction).toHaveBeenCalledWith("42", "acme");
    const [csv] = downloadText.mock.calls[0];
    expect(csv.trim().split("\n")).toHaveLength(2);
  });

  it("counts every real participant when nothing is searched", async () => {
    // Arrange
    previewReturns(3, 1);

    // Act
    openPanel(3);

    // Assert
    expect(
      await screen.findByText("1 of 3 participants get a new link"),
    ).toBeTruthy();
    expect(screen.queryByText(/matching/)).toBeNull();
  });

  it("waits for a search that leaves no one without a link", async () => {
    // Arrange
    previewReturns(4, 0);

    // Act
    openPanel(4, "acme");

    // Assert
    expect(
      await screen.findByText("0 of 4 matching participants get a new link"),
    ).toBeTruthy();
    expect(screen.getByText(/Nothing new to send/)).toBeTruthy();
    expect(generateButton().disabled).toBe(true);
  });

  it("counts again when the search changes while the panel is open", async () => {
    // Arrange
    previewReturns(12, 7);
    const view = openPanel(12, "acme");
    await screen.findByText("7 of 12 matching participants get a new link");
    vi.mocked(previewAudienceLinksAction).mockReturnValue(
      new Promise(() => {}),
    );

    // Act
    view.rerender(panel(12, "ana"));

    // Assert
    expect(screen.queryByText(/7 of 12/)).toBeNull();
    expect(generateButton().disabled).toBe(true);
    expect(previewAudienceLinksAction).toHaveBeenLastCalledWith("42", "ana");
  });

  it("asks for a narrower search above the batch limit", async () => {
    // Arrange
    previewReturns(6200, 5001);

    // Act
    openPanel(6200);

    // Assert
    expect(
      await screen.findByText(/5,001 participants would get a link/),
    ).toBeTruthy();
    expect(generateButton().disabled).toBe(true);
  });

  it("says when the count failed, and waits rather than sending blind", async () => {
    // Arrange
    vi.mocked(previewAudienceLinksAction).mockResolvedValue(
      Result.error("Failed to count who gets a link."),
    );

    // Act
    openPanel(2, "acme");

    // Assert
    expect(
      await screen.findByText("Could not count who gets a link"),
    ).toBeTruthy();
    expect(generateButton().disabled).toBe(true);
    expect(screen.queryByText(FILTERED_LINKS_NEED_NEWER_API)).toBeNull();
  });

  it("keeps Generate for everyone on an older API, and says the search needs a newer one", async () => {
    // Arrange
    vi.mocked(previewAudienceLinksAction).mockResolvedValue(
      Result.success(null),
    );
    vi.mocked(generateAudienceLinksAction).mockResolvedValue(
      Result.success([]),
    );
    openPanel(2, "acme");

    // Act
    expect(
      await screen.findByText(
        "Sending links to a filtered set needs a newer Endatix API",
      ),
    ).toBeTruthy();
    fireEvent.click(generateButton());

    // Assert
    expect(await screen.findByText("Everyone already has a link")).toBeTruthy();
    expect(generateAudienceLinksAction).toHaveBeenCalledWith("42", "");
    expect(screen.queryByText("Participants on this form")).toBeNull();
  });
});
