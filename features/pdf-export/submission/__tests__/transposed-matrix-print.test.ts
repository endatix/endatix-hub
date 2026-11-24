import { createElement as el } from "react";
import { Document, Page, View, pdf } from "@react-pdf/renderer";
import { Model, QuestionMatrixDynamicModel } from "survey-core";
import { expect, it, vi } from "vitest";
import "../submission-details-pdf";
import { loadMatrixFonts } from "../answers/matrix-print-bands";
import PdfMatrixDropdownAnswer from "../answers/pdf-matrixdropdown-answer";
import { FullWidthNote } from "../answers/pdf-transposed-matrix";

type Node = { lines?: { string: string }[]; children?: Node[] };
function text(node: Node): string[] {
  return (
    node.lines?.map((line) => line.string) ??
    node.children?.flatMap((child) => text(child)) ??
    []
  );
}

it("keeps a wrapped note heading with its first two answer lines", async () => {
  // Arrange: 73 pt remain, enough for the old fixed reservation but not this note.
  await loadMatrixFonts();
  const heading = "[1] · Row 7 · " + "Observation field ".repeat(8);
  const source = Array.from({length: 100}, (_, i) => `Trial ${i}`).join("\n");
  const onRender = vi.fn();
  // Act
  await pdf(el(Document, {onRender}, el(Page, {size: "A4", style: {padding: 28}},
    el(View, {style: {height: 713}}), el(FullWidthNote, {heading, source})
  ))).toBlob();
  // Assert
  const pages: Node[] = onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children;
  const first = pages.map(text).find(lines => lines.some(line => line.includes("Note [1]")));
  expect(first).toEqual(expect.arrayContaining(["Trial 0", "Trial 1"]));
});

async function print(entries: { observation: string }[]) {
  const model = new Model({
    elements: [
      {
        type: "matrixdynamic",
        name: "Record",
        transposeData: true,
        columns: [
          { name: "observation", title: "Observation", cellType: "comment" },
        ],
      },
    ],
  });
  model.data = { Record: entries };
  const question = model.getQuestionByName("Record");
  if (!(question instanceof QuestionMatrixDynamicModel))
    throw new Error("Expected dynamic matrix");
  await loadMatrixFonts();
  const onRender = vi.fn();
  await pdf(
    el(
      Document,
      { onRender },
      el(
        Page,
        { size: "A4", style: { padding: 28 } },
        el(PdfMatrixDropdownAnswer, { question }),
      ),
    ),
  ).toBlob();
  return (
    onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children as Node[]
  ).map((page) => text(page));
}

it("keeps a full-width note with its identifiers on every page and its payload only once", async () => {
  // Arrange
  const markers = Array.from({ length: 140 }, (_, i) => `Observation-${i}`);
  const entries = Array.from({ length: 12 }, (_, i) => ({
    observation: i === 6 ? markers.join("\n") : `Short-${i}`,
  }));

  // Act
  const pages = await print(entries);

  // Assert
  const notePages = pages.filter((p) =>
    p.some((line) => markers.includes(line)),
  );
  expect(notePages.length).toBeGreaterThan(1);
  expect(notePages.flat().filter((line) => markers.includes(line))).toEqual(
    markers,
  );
  for (const page of notePages)
    expect(page).toContain("Note [1] · Row 7 · Observation");
  expect(pages.flat().filter((line) => line === "[1]")).toHaveLength(1);
  expect(
    pages.flat().filter((line) => line === "Observation").length,
  ).toBeGreaterThan(1);
});

it("fits three short observations together at print size", async () => {
  // Arrange
  const entries = ["First", "Second", "Third"].map((label) => ({
    observation: `${label} observer finished their task without a reminder.`,
  }));
  // Act
  const printed = (await print(entries)).flat();
  // Assert
  expect(printed.filter((line) => line === "Observation")).toHaveLength(1);
  expect(printed).toEqual(expect.arrayContaining(["Row 1", "Row 2", "Row 3"]));
});

it("wraps an unbroken identifier without inventing separator glyphs", async () => {
  // Arrange
  const identifier = "W".repeat(105);
  // Act
  const lines = (
    await print([{ observation: identifier }, { observation: "Short" }])
  )
    .flat()
    .filter((l) => l.includes("W"));
  // Assert
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.join("")).toBe(identifier);
});

it("keeps a short mixed-direction numeric observation in reading order in a wide panel", async () => {
  // Arrange
  const entries = Array.from({length: 6}, () => ({observation: "Short"}));
  entries[3].observation = "Mixed \u200f(12)-(34)\u200f finish";
  // Act
  const printed = (await print(entries)).flat().map(line => line.replaceAll("\u200f", ""));
  // Assert
  expect(printed).toContain("Mixed (34)-(12) finish");
});
