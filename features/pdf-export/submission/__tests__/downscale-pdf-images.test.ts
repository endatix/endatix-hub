import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import sharp from "sharp";
import { downscalePdfFileImages } from "../downscale-pdf-images";

async function jpegDataUri(width: number, height: number): Promise<string> {
  const source = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 80, b: 140 },
    },
  })
    .jpeg()
    .toBuffer();
  return `data:image/jpeg;base64,${source.toString("base64")}`;
}

describe("downscalePdfFileImages", () => {
  it("replaces a large image with a jpeg no wider than 1200px", async () => {
    // Arrange
    const content = await jpegDataUri(2400, 800);
    const model = new Model({
      pages: [
        {
          name: "page1",
          elements: [{ type: "file", name: "photos" }],
        },
      ],
    });
    model.data = {
      photos: [
        { name: "wide.jpg", type: "image/jpeg", content },
        {
          name: "notes.pdf",
          type: "application/pdf",
          content: "https://example.com/notes.pdf",
        },
      ],
    };

    // Act
    await downscalePdfFileImages(model);

    // Assert
    const files = model.getQuestionByName("photos").value as {
      name: string;
      type: string;
      content: string;
      pdfWidth?: number;
      pdfHeight?: number;
    }[];
    expect(files[1].content).toBe("https://example.com/notes.pdf");

    const payload = files[0].content.split(",")[1];
    const meta = await sharp(Buffer.from(payload, "base64")).metadata();
    expect(files[0].type).toBe("image/jpeg");
    expect(meta.width).toBeLessThanOrEqual(1200);
    expect(meta.height).toBeLessThanOrEqual(1200);
    expect(meta.width! / meta.height!).toBeCloseTo(3, 1);
    expect(files[0].pdfWidth! / files[0].pdfHeight!).toBeCloseTo(3, 1);
  });

  it("downscales images nested inside a paneldynamic", async () => {
    // Arrange
    const content = await jpegDataUri(1800, 600);
    const model = new Model({
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "paneldynamic",
              name: "entries",
              templateElements: [{ type: "file", name: "photo" }],
            },
          ],
        },
      ],
    });
    model.data = {
      entries: [{ photo: [{ name: "shot.jpg", type: "image/jpeg", content }] }],
    };

    // Act
    await downscalePdfFileImages(model);

    // Assert
    const files = (
      model.data as {
        entries: { photo: { content: string; pdfWidth?: number }[] }[];
      }
    ).entries[0].photo;
    expect(files[0].content.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(files[0].pdfWidth).toBeLessThanOrEqual(1200);
  });

  it("leaves an oversized data-URI image on its original content", async () => {
    // Arrange — payload larger than the 20MB source cap after base64 decode estimate
    const oversized =
      "data:image/jpeg;base64," +
      "A".repeat(Math.ceil((20 * 1024 * 1024 * 4) / 3) + 4);
    const model = new Model({
      pages: [
        {
          name: "page1",
          elements: [{ type: "file", name: "photos" }],
        },
      ],
    });
    model.data = {
      photos: [{ name: "huge.jpg", type: "image/jpeg", content: oversized }],
    };

    // Act
    await downscalePdfFileImages(model);

    // Assert
    const files = model.getQuestionByName("photos").value as {
      content: string;
    }[];
    expect(files[0].content).toBe(oversized);
  });
});
