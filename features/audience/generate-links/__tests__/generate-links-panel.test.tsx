import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import * as filesDownload from "@/lib/utils/files-download";
import { generateAudienceLinksAction } from "../generate-audience-links.action";
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
}));

function openPanel(totalPeople = 2) {
  render(
    <GenerateLinksPanel
      formId="42"
      identifierKind={AudienceIdentifierKind.Email}
      totalPeople={totalPeople}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Personalized links" }));
}

describe("GenerateLinksPanel", () => {
  const downloadText = vi.fn();

  beforeEach(() => {
    vi.mocked(generateAudienceLinksAction).mockReset();
    downloadText.mockReset();
    refresh.mockReset();
    vi.spyOn(filesDownload, "downloadText").mockImplementation(downloadText);
  });

  it("writes nothing until Generate, and waits for people", () => {
    // Act
    openPanel(0);

    // Assert
    expect(screen.getByText(/no people yet/)).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Generate and download",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
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

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "Generate and download" }),
    );

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

    // Act
    fireEvent.click(
      screen.getByRole("button", { name: "Generate and download" }),
    );

    // Assert
    expect(await screen.findByText("Everyone already has a link")).toBeTruthy();
    expect(downloadText).not.toHaveBeenCalled();
  });
});
