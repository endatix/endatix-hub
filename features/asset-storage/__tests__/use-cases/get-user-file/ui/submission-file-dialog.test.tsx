import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionFileDialog } from "@/features/asset-storage/use-cases/get-user-file/ui/submission-file-dialog";
import { clientStorageConfig } from "../../../test-storage-config";

const media = vi.hoisted(() => ({ isDesktop: true }));

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => media.isDesktop,
}));

vi.mock("@/features/asset-storage/ui/asset-storage.context", () => ({
  useAssetStorage: () => ({ config: clientStorageConfig() }),
}));

vi.mock("@/features/asset-storage/ui/use-resolved-private-storage-url", () => ({
  usePrivateStorageDisplayUrl: (url: string) => ({
    displayUrl: url,
    isResolving: false,
    refresh: () => {},
  }),
}));

vi.mock(
  "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button",
  () => ({
    DownloadSubmissionFileButton: () => <button type="button">Download</button>,
  }),
);

const storedFile = {
  name: "photo.jpg",
  type: "image/jpeg",
  content:
    "https://testaccount.blob.core.windows.net/user-files/s/f1/s1/photo.jpg",
};

function viewData(signature: string) {
  return {
    kind: "user",
    displayName: "photo.jpg",
    contentType: "image/jpeg",
    originalFileName: "IMG_0001.jpg",
    questionName: "uploads",
    sizeInBytes: 2048,
    uploadedBy: "respondent",
    url: `${storedFile.content}?sig=${signature}`,
  };
}

describe("SubmissionFileDialog", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    media.isDesktop = true;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches fresh view data and shows the stored metadata", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(viewData("fresh"))),
    );

    render(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/hub/v0/storage/submission-files/f1/s1/photo.jpg",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(await screen.findByText("IMG_0001.jpg")).toBeDefined();
    expect(screen.getByText("uploads")).toBeDefined();
    expect(screen.getByText("2.0 KB")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: /open in new tab/i })
        .getAttribute("href"),
    ).toBe(`${storedFile.content}?sig=fresh`);
  });

  it("titles the panel with the file name and type", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(viewData("t"))));

    render(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
    expect(screen.getByRole("heading", { name: "photo.jpg" })).toBeDefined();
    expect(screen.getByText("image/jpeg")).toBeDefined();
  });

  it("uses a bottom drawer on phones", async () => {
    media.isDesktop = false;
    fetchMock.mockResolvedValue(new Response(JSON.stringify(viewData("m"))));

    render(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );

    const panel = await screen.findByRole("dialog");
    expect(panel.getAttribute("data-slot")).toBe("drawer-content");
  });

  it("signs again every time the dialog reopens", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(viewData("first"))))
      .mockResolvedValueOnce(new Response(JSON.stringify(viewData("second"))));

    const { rerender } = render(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );
    await screen.findByText("IMG_0001.jpg");

    rerender(
      <SubmissionFileDialog
        file={storedFile}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    rerender(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );

    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: /open in new tab/i })
          .getAttribute("href"),
      ).toBe(`${storedFile.content}?sig=second`),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to a plain preview when the lookup fails", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SubmissionFileDialog file={storedFile} open onOpenChange={() => {}} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector(`img[src="${storedFile.content}"]`),
      ).not.toBeNull(),
    );
    expect(screen.queryByText("File details")).toBeNull();
  });

  it("previews inline data without calling the API", () => {
    render(
      <SubmissionFileDialog
        file={{
          name: "sig.png",
          type: "image/png",
          content: "data:image/png;base64,AAAA",
        }}
        open
        onOpenChange={() => {}}
      />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      document.querySelector('img[src="data:image/png;base64,AAAA"]'),
    ).not.toBeNull();
  });
});
