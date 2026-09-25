import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import sharp from "sharp";
import { downscalePdfFileImages } from "../downscale-pdf-images";

describe("downscalePdfFileImages", () => {
  it("replaces a large image with a jpeg no wider than 1200px", async () => {
    // Arrange
    const source = await sharp({
      create: {
        width: 2400,
        height: 800,
        channels: 3,
        background: { r: 20, g: 80, b: 140 },
      },
    })
      .jpeg()
      .toBuffer();
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
        {
          name: "wide.jpg",
          type: "image/jpeg",
          content: `data:image/jpeg;base64,${source.toString("base64")}`,
        },
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
    expect(Buffer.from(payload, "base64").length).toBeLessThan(source.length);
    expect(files[0].pdfWidth! / files[0].pdfHeight!).toBeCloseTo(3, 1);
  });
});