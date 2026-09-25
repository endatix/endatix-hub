import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import {
  attachPdfFileLinks,
  resolvePdfFileLink,
  type AttachPdfFileLinksOptions,
} from "../attach-pdf-file-links";

const blob =
  "https://testaccount.blob.core.windows.net/user-files/s/f1/s1/a1b2.mp4";
const signed = `${blob}?sv=2024&sig=abc`;

const hub: AttachPdfFileLinksOptions = {
  mode: "hub",
  hubOrigin: "https://hub.example.com/",
  storageConfig: clientStorageConfig({ isPrivate: true }),
};
const shareLink: AttachPdfFileLinksOptions = { ...hub, mode: "signed" };

describe("resolvePdfFileLink", () => {
  it("links a stored file to its Hub page when a Hub user exported", () => {
    expect(
      resolvePdfFileLink({ content: signed, name: "clip.mp4" }, hub),
    ).toEqual({
      pdfLink: "https://hub.example.com/forms/f1/submissions/s1/files/a1b2.mp4",
    });
  });

  it("keeps the signed URL for a share-link export and marks it temporary", () => {
    expect(
      resolvePdfFileLink({ content: signed, name: "clip.mp4" }, shareLink),
    ).toEqual({ pdfLink: signed, pdfLinkIsTemporary: true });
  });

  it("keeps an unsigned public storage URL as a permanent link", () => {
    expect(resolvePdfFileLink({ content: blob }, shareLink)).toEqual({
      pdfLink: blob,
    });
  });

  it("keeps an external URL as it is", () => {
    const external = "https://example.com/report.pdf?download=1";
    expect(resolvePdfFileLink({ content: external }, hub)).toEqual({
      pdfLink: external,
    });
  });

  it("does not link inline data", () => {
    expect(
      resolvePdfFileLink({ content: "data:image/png;base64,AAAA" }, hub),
    ).toEqual({});
  });
});

describe("attachPdfFileLinks", () => {
  it("stamps every file-question value and leaves other answers alone", () => {
    const model = new Model({
      pages: [
        {
          name: "page1",
          elements: [
            { type: "file", name: "clips", allowMultiple: true },
            { type: "text", name: "note" },
          ],
        },
      ],
    });
    model.data = {
      clips: [{ name: "clip.mp4", type: "video/mp4", content: signed }],
      note: "hello",
    };

    attachPdfFileLinks(model, hub);

    expect(model.getQuestionByName("clips").value).toEqual([
      {
        name: "clip.mp4",
        type: "video/mp4",
        content: signed,
        pdfLink:
          "https://hub.example.com/forms/f1/submissions/s1/files/a1b2.mp4",
      },
    ]);
    expect(model.getQuestionByName("note").value).toBe("hello");
  });

  it("stamps a file nested inside a paneldynamic", () => {
    const model = new Model({
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "paneldynamic",
              name: "entries",
              templateElements: [{ type: "file", name: "clip" }],
            },
          ],
        },
      ],
    });
    model.data = {
      entries: [
        { clip: [{ name: "clip.mp4", type: "video/mp4", content: signed }] },
      ],
    };

    attachPdfFileLinks(model, hub);

    expect(
      (model.data as { entries: { clip: { pdfLink?: string }[] }[] }).entries[0]
        .clip[0].pdfLink,
    ).toBe("https://hub.example.com/forms/f1/submissions/s1/files/a1b2.mp4");
  });
});
